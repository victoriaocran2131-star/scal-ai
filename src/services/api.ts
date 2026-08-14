import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { isAdmin } from '../constants/admin';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  history?: any[];
  stats?: any;
  log?: any;
  user?: any;
  token?: string;
  hasActiveSubscription?: boolean;
  subscription?: any;
  goals?: any;
}

class ApiService {
  private currentUser: any = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
    });
  }

  private getUserId(): string | null {
    return this.currentUser?.uid || auth.currentUser?.uid || null;
  }

  async signup(fullName: string, email: string, password: string): Promise<ApiResponse> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        fullName,
        email,
        createdAt: serverTimestamp(),
      });

      await AsyncStorage.setItem('scalai_user', JSON.stringify({
        uid: user.uid,
        fullName,
        email,
      }));

      return { success: true, user: { uid: user.uid, fullName, email } };
    } catch (error: any) {
      const message = error.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists.'
        : error.message || 'Failed to create account';
      return { error: message };
    }
  }

  async signin(email: string, password: string): Promise<ApiResponse> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      await AsyncStorage.setItem('scalai_user', JSON.stringify({
        uid: user.uid,
        fullName: userData?.fullName || '',
        email,
      }));

      if (isAdmin(email)) {
        await AsyncStorage.setItem('isAdmin', 'true');
      }

      return { success: true, user: { uid: user.uid, fullName: userData?.fullName, email } };
    } catch (error: any) {
      const message = error.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : error.code === 'auth/wrong-password'
        ? 'Incorrect password.'
        : error.message || 'Failed to sign in';
      return { error: message };
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
    await AsyncStorage.removeItem('scalai_user');
    await AsyncStorage.removeItem('hasActiveSubscription');
    await AsyncStorage.removeItem('subscriptionInfo');
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { success: true, user: userDoc.data() };
      }
      return { error: 'User not found' };
    } catch (error: any) {
      return { error: 'Failed to load profile' };
    }
  }

  async addHistory(item: {
    foodName: string;
    calories: number;
    protein: number;
    fat: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    digestion: string;
    image?: string;
  }): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      await addDoc(collection(db, 'users', uid, 'history'), {
        ...item,
        createdAt: serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to save history' };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const historyRef = collection(db, 'users', uid, 'history');
      let q = query(historyRef, orderBy('createdAt', 'desc'));

      if (filter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        q = query(historyRef, where('createdAt', '>=', Timestamp.fromDate(today)), orderBy('createdAt', 'desc'));
      } else if (filter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        q = query(historyRef, where('createdAt', '>=', Timestamp.fromDate(weekAgo)), orderBy('createdAt', 'desc'));
      } else if (filter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        q = query(historyRef, where('createdAt', '>=', Timestamp.fromDate(monthAgo)), orderBy('createdAt', 'desc'));
      }

      const snapshot = await getDocs(q);
      const history = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }));

      return { success: true, history };
    } catch (error: any) {
      return { error: 'Failed to load history' };
    }
  }

  async deleteHistory(id: string): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      await deleteDoc(doc(db, 'users', uid, 'history', id));
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to delete history' };
    }
  }

  async clearHistory(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const snapshot = await getDocs(collection(db, 'users', uid, 'history'));
      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to clear history' };
    }
  }

  async getStats(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const snapshot = await getDocs(collection(db, 'users', uid, 'history'));
      const items = snapshot.docs.map((doc) => doc.data());

      const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
      const totalProtein = items.reduce((sum, item) => sum + (item.protein || 0), 0);
      const totalFat = items.reduce((sum, item) => sum + (item.fat || 0), 0);
      const totalScans = items.length;

      return {
        success: true,
        stats: { totalCalories, totalProtein, totalFat, totalScans },
      };
    } catch (error: any) {
      return { error: 'Failed to load stats' };
    }
  }

  async getTodayLog(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { log: { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 } };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(
        collection(db, 'users', uid, 'history'),
        where('createdAt', '>=', Timestamp.fromDate(today))
      );

      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => doc.data());

      const log = {
        totalCalories: items.reduce((sum, item) => sum + (item.calories || 0), 0),
        totalProtein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
        totalFat: items.reduce((sum, item) => sum + (item.fat || 0), 0),
        totalCarbs: items.reduce((sum, item) => sum + (item.carbs || 0), 0),
      };

      return { success: true, log };
    } catch (error: any) {
      return { log: { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 } };
    }
  }

  async checkSubscription(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { hasActiveSubscription: false };

      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      if (userData?.email && isAdmin(userData.email)) {
        return {
          success: true,
          hasActiveSubscription: true,
          subscription: { plan: 'admin', daysRemaining: 36500 },
        };
      }

      const subDoc = await getDoc(doc(db, 'users', uid, 'subscription', 'current'));
      if (subDoc.exists()) {
        const sub = subDoc.data();
        const endDate = sub.endDate?.toDate?.();
        if (endDate && endDate > new Date()) {
          const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return {
            success: true,
            hasActiveSubscription: true,
            subscription: {
              plan: sub.plan,
              daysRemaining,
              endDate: endDate.toISOString(),
            },
          };
        }
      }

      return { hasActiveSubscription: false };
    } catch (error: any) {
      const localSub = await AsyncStorage.getItem('hasActiveSubscription');
      const adminFlag = await AsyncStorage.getItem('isAdmin');
      if (adminFlag === 'true') {
        return { hasActiveSubscription: true, subscription: { plan: 'admin', daysRemaining: 36500 } };
      }
      if (localSub === 'true') {
        return { hasActiveSubscription: true };
      }
      return { hasActiveSubscription: false };
    }
  }

  async activateSubscription(planId: string, paystackReference?: string): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const now = new Date();
      let endDate = new Date(now);

      switch (planId) {
        case 'weekly':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 1);
      }

      await setDoc(doc(db, 'users', uid, 'subscription', 'current'), {
        plan: planId,
        startDate: Timestamp.fromDate(now),
        endDate: Timestamp.fromDate(endDate),
        paystackReference: paystackReference || null,
        activatedAt: serverTimestamp(),
      });

      await AsyncStorage.setItem('hasActiveSubscription', 'true');
      await AsyncStorage.setItem('subscriptionInfo', JSON.stringify({
        plan: planId,
        daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      }));

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to activate subscription' };
    }
  }

  async subscribe(planId: string): Promise<ApiResponse> {
    return this.activateSubscription(planId);
  }

  async getGoals(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { goals: { calories: 2000, protein: 50, fat: 65, carbs: 300 } };

      const goalsDoc = await getDoc(doc(db, 'users', uid, 'settings', 'goals'));
      if (goalsDoc.exists()) {
        return { success: true, goals: goalsDoc.data() };
      }
      return { goals: { calories: 2000, protein: 50, fat: 65, carbs: 300 } };
    } catch (error: any) {
      return { goals: { calories: 2000, protein: 50, fat: 65, carbs: 300 } };
    }
  }

  async request(endpoint: string, options: { method?: string; body?: any } = {}): Promise<ApiResponse> {
    if (endpoint === '/api/goals') return this.getGoals();
    if (endpoint === '/api/daily-logs/today') return this.getTodayLog();
    if (endpoint === '/api/stats') return this.getStats();
    return { error: 'Unknown endpoint' };
  }
}

export const api = new ApiService();
