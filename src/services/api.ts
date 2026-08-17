import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
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
  logs?: any[];
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

  private getUserHistoryRef() {
    const uid = this.getUserId();
    if (!uid) return null;
    return collection(db, 'users', uid, 'history');
  }

  // ==================== AUTH ====================

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
    await AsyncStorage.removeItem('isAdmin');
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

  async updateProfile(fullName: string): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      await setDoc(doc(db, 'users', uid), { fullName }, { merge: true });

      const cached = JSON.parse(await AsyncStorage.getItem('scalai_user') || '{}');
      await AsyncStorage.setItem('scalai_user', JSON.stringify({ ...cached, fullName }));

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to update profile' };
    }
  }

  // ==================== HISTORY (FIRESTORE) ====================

  async addHistory(item: {
    calories: number;
    protein: number;
    fat: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    digestion: string;
  }): Promise<ApiResponse> {
    try {
      const historyRef = this.getUserHistoryRef();
      if (!historyRef) return { error: 'Not authenticated' };

      await addDoc(historyRef, {
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        digestion: item.digestion,
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to save history' };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { history: [] };

      const historyRef = collection(db, 'users', uid, 'history');
      const q = query(historyRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      let items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      const now = new Date();
      if (filter === 'today') {
        const today = now.toISOString().split('T')[0];
        items = items.filter((h: any) => h.createdAt?.split('T')[0] === today);
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        items = items.filter((h: any) => new Date(h.createdAt) >= weekAgo);
      } else if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        items = items.filter((h: any) => new Date(h.createdAt) >= monthAgo);
      }

      return { success: true, history: items };
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

      const historyRef = collection(db, 'users', uid, 'history');
      const snapshot = await getDocs(historyRef);
      const deletions = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletions);

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to clear history' };
    }
  }

  // ==================== STATS (FROM FIRESTORE) ====================

  async getStats(): Promise<ApiResponse> {
    try {
      const result = await this.getHistory('all');
      const items = result.history || [];

      const totalCalories = items.reduce((sum: number, item: any) => sum + (item.calories || 0), 0);
      const totalProtein = items.reduce((sum: number, item: any) => sum + (item.protein || 0), 0);
      const totalFat = items.reduce((sum: number, item: any) => sum + (item.fat || 0), 0);
      const totalCarbs = items.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0);
      const totalFiber = items.reduce((sum: number, item: any) => sum + (item.fiber || 0), 0);
      const totalSugar = items.reduce((sum: number, item: any) => sum + (item.sugar || 0), 0);
      const totalScans = items.length;

      const today = new Date().toISOString().split('T')[0];
      const todayScans = items.filter((h: any) => h.createdAt?.split('T')[0] === today).length;

      return {
        success: true,
        stats: {
          totalScans,
          totalCalories: Math.round(totalCalories),
          totalProtein: Math.round(totalProtein * 10) / 10,
          totalFat: Math.round(totalFat * 10) / 10,
          totalCarbs: Math.round(totalCarbs * 10) / 10,
          totalFiber: Math.round(totalFiber * 10) / 10,
          totalSugar: Math.round(totalSugar * 10) / 10,
          todayScans,
        },
      };
    } catch (error: any) {
      return { error: 'Failed to load stats' };
    }
  }

  async getTodayLog(): Promise<ApiResponse> {
    try {
      const result = await this.getHistory('today');
      const todayItems = result.history || [];

      const log = {
        totalCalories: todayItems.reduce((sum: number, item: any) => sum + (item.calories || 0), 0),
        totalProtein: todayItems.reduce((sum: number, item: any) => sum + (item.protein || 0), 0),
        totalFat: todayItems.reduce((sum: number, item: any) => sum + (item.fat || 0), 0),
        totalCarbs: todayItems.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0),
        totalFiber: todayItems.reduce((sum: number, item: any) => sum + (item.fiber || 0), 0),
        totalSugar: todayItems.reduce((sum: number, item: any) => sum + (item.sugar || 0), 0),
        mealCount: todayItems.length,
      };

      return { success: true, log };
    } catch (error: any) {
      return { log: { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0 } };
    }
  }

  async getDailyLogs(days: number = 7): Promise<ApiResponse> {
    try {
      const result = await this.getHistory('all');
      const items = result.history || [];
      const now = new Date();
      const logs: any[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayItems = items.filter((h: any) => h.createdAt?.split('T')[0] === dateStr);

        logs.push({
          date: dateStr,
          totalCalories: dayItems.reduce((sum: number, item: any) => sum + (item.calories || 0), 0),
          totalProtein: dayItems.reduce((sum: number, item: any) => sum + (item.protein || 0), 0),
          totalFat: dayItems.reduce((sum: number, item: any) => sum + (item.fat || 0), 0),
          totalCarbs: dayItems.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0),
          totalFiber: dayItems.reduce((sum: number, item: any) => sum + (item.fiber || 0), 0),
          totalSugar: dayItems.reduce((sum: number, item: any) => sum + (item.sugar || 0), 0),
          mealCount: dayItems.length,
        });
      }

      return { success: true, logs };
    } catch (error: any) {
      return { error: 'Failed to load daily logs' };
    }
  }

  // ==================== SUBSCRIPTION ====================

  async checkSubscription(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) {
        return { hasActiveSubscription: false };
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      const userData = userDoc.data();
      const authEmail = auth.currentUser?.email || '';
      const storedEmail = userData?.email || '';
      if (isAdmin(authEmail) || isAdmin(storedEmail)) {
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

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to activate subscription' };
    }
  }

  async subscribe(planId: string): Promise<ApiResponse> {
    return this.activateSubscription(planId);
  }

  // ==================== GOALS ====================

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

  // ==================== DELETE ACCOUNT ====================

  async deleteAccount(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid) return { error: 'Not authenticated' };

      const historyRef = collection(db, 'users', uid, 'history');
      const historySnapshot = await getDocs(historyRef);
      const historyDeletions = historySnapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(historyDeletions);

      await deleteDoc(doc(db, 'users', uid, 'subscription', 'current')).catch(() => {});
      await deleteDoc(doc(db, 'users', uid, 'settings', 'goals')).catch(() => {});
      await deleteDoc(doc(db, 'users', uid));

      const user = auth.currentUser;
      if (user) {
        await deleteUser(user);
      }

      await AsyncStorage.clear();

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to delete account' };
    }
  }

  // ==================== GENERIC REQUEST ====================

  async request(endpoint: string, options: { method?: string; body?: any } = {}): Promise<ApiResponse> {
    if (endpoint === '/api/goals') return this.getGoals();
    if (endpoint === '/api/daily-logs/today') return this.getTodayLog();
    if (endpoint === '/api/stats') return this.getStats();

    const dailyLogsMatch = endpoint.match(/^\/api\/daily-logs\?days=(\d+)$/);
    if (dailyLogsMatch) {
      return this.getDailyLogs(parseInt(dailyLogsMatch[1], 10));
    }

    return { error: 'Unknown endpoint' };
  }
}

export const api = new ApiService();
