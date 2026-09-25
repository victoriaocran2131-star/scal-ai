import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  GoogleAuthProvider,
  signInWithCredential,
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
} from 'firebase/firestore';


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
  goals?: any;
  isNewUser?: boolean;
}

class ApiService {
  private currentUser: any = null;

  constructor() {
    if (auth) {
      onAuthStateChanged(auth, (user) => {
        this.currentUser = user;
      });
    }
  }

  private isConfigured(): boolean {
    return auth !== null && db !== null;
  }

  private getUserId(): string | null {
    if (!auth) return null;
    return auth.currentUser?.uid || this.currentUser?.uid || null;
  }

  private getUserHistoryRef() {
    const uid = this.getUserId();
    if (!uid || !db) return null;
    return collection(db, 'users', uid, 'history');
  }

  // ==================== AUTH ====================

  async signup(fullName: string, email: string, password: string): Promise<ApiResponse> {
    if (!this.isConfigured()) return { error: 'Service is not available. Please contact support.' };
    try {
      const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
      const user = userCredential.user;

      await setDoc(doc(db!, 'users', user.uid), {
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
        : error.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : error.code === 'auth/invalid-email'
        ? 'Please enter a valid email address.'
        : 'Failed to create account. Please try again.';
      return { error: message };
    }
  }

  async signin(email: string, password: string): Promise<ApiResponse> {
    if (!this.isConfigured()) return { error: 'Service is not available. Please contact support.' };
    try {
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db!, 'users', user.uid));
      const userData = userDoc.data();

      await AsyncStorage.setItem('scalai_user', JSON.stringify({
        uid: user.uid,
        fullName: userData?.fullName || '',
        email,
      }));

      return { success: true, user: { uid: user.uid, fullName: userData?.fullName, email } };
    } catch (error: any) {
      const message = error.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
        ? 'Incorrect email or password.'
        : error.code === 'auth/too-many-requests'
        ? 'Too many failed attempts. Please try again later.'
        : 'Failed to sign in. Please try again.';
      return { error: message };
    }
  }

  async googleSignIn(idToken: string): Promise<ApiResponse> {
    if (!this.isConfigured()) return { error: 'Service is not available. Please contact support.' };
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth!, credential);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db!, 'users', user.uid));
      const isNewUser = !userDoc.exists();

      if (isNewUser) {
        await setDoc(doc(db!, 'users', user.uid), {
          fullName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || null,
          createdAt: serverTimestamp(),
        });
      }

      await AsyncStorage.setItem('scalai_user', JSON.stringify({
        uid: user.uid,
        fullName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || null,
      }));

      return { success: true, user: { uid: user.uid, fullName: user.displayName, email: user.email }, isNewUser };
    } catch (error: any) {
      return { error: 'Failed to sign in with Google. Please try again.' };
    }
  }

  async signOut(): Promise<void> {
    if (auth) await signOut(auth);
    await AsyncStorage.removeItem('scalai_user');
    await AsyncStorage.removeItem('subscriptionInfo');
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid || !db) return { error: 'Not authenticated' };

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
      if (!uid || !db) return { error: 'Not authenticated' };

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
    name: string;
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
      if (!historyRef) {
        return { error: 'Not authenticated' };
      }
      await addDoc(historyRef, {
        name: item.name || 'Unknown Food',
        calories: item.calories || 0,
        protein: item.protein || 0,
        fat: item.fat || 0,
        carbs: item.carbs || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        digestion: item.digestion || '',
        createdAt: new Date().toISOString(),
      });
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to save history: ' + (error.message || 'Unknown error') };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid || !db) return { success: true, history: [] };

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
        items = items.filter((h: any) => {
          try {
            return new Date(h.createdAt) >= weekAgo;
          } catch {
            return false;
          }
        });
      } else if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        items = items.filter((h: any) => {
          try {
            return new Date(h.createdAt) >= monthAgo;
          } catch {
            return false;
          }
        });
      }

      return { success: true, history: items };
    } catch (error: any) {
      return { error: 'Failed to load history: ' + (error.message || 'Unknown error') };
    }
  }

  async deleteHistory(id: string): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid || !db) return { error: 'Not authenticated' };

      await deleteDoc(doc(db, 'users', uid, 'history', id));
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to delete history' };
    }
  }

  async clearHistory(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid || !db) return { error: 'Not authenticated' };

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
      return { success: false, log: { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0, totalSugar: 0, mealCount: 0 } };
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
        const dayItems = items.filter((h: any) => {
          try {
            return h.createdAt?.split('T')[0] === dateStr;
          } catch {
            return false;
          }
        });

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
      return { error: 'Failed to load daily logs: ' + (error.message || 'Unknown error') };
    }
  }

  // ==================== GOALS ====================

  async getGoals(): Promise<ApiResponse> {
    try {
      const uid = this.getUserId();
      if (!uid || !db) return { goals: { calories: 2000, protein: 50, fat: 65, carbs: 300 } };

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
      if (!uid || !db) return { error: 'Not authenticated' };

      // Step 1: Delete all Firestore data while still authenticated
      try {
        const historyRef = collection(db, 'users', uid, 'history');
        const historySnapshot = await getDocs(historyRef);
        const historyDeletions = historySnapshot.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(historyDeletions);

        await deleteDoc(doc(db, 'users', uid, 'subscription', 'current')).catch(() => {});
        await deleteDoc(doc(db, 'users', uid, 'settings', 'goals')).catch(() => {});
        await deleteDoc(doc(db, 'users', uid)).catch(() => {});
      } catch (firestoreError) {
        // Firestore deletion failed — still proceed to clear auth and local data
      }

      // Step 2: Delete auth account
      const user = auth?.currentUser;
      if (user) {
        try {
          await deleteUser(user);
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            // Data already deleted — sign out and clear local state
            await AsyncStorage.clear();
            await signOut(auth!).catch(() => {});
            return { success: true };
          }
          // Auth deletion failed for other reasons — data already deleted
        }
      }

      // Step 3: Clear local storage
      await AsyncStorage.clear();

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to delete account. Please try again.' };
    }
  }

}

export const api = new ApiService();
