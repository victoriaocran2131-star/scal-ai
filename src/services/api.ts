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
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { isAdmin } from '../constants/admin';

const HISTORY_KEY = 'scalai_history';

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

  private async getHistoryLocal(): Promise<any[]> {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveHistoryLocal(items: any[]): Promise<void> {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
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

  // ==================== HISTORY (LOCAL) ====================

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
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const entry = {
        id,
        ...item,
        carbs: item.carbs || 0,
        fiber: item.fiber || 0,
        sugar: item.sugar || 0,
        createdAt: new Date().toISOString(),
      };

      const items = await this.getHistoryLocal();
      items.unshift(entry);
      await this.saveHistoryLocal(items);

      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to save history' };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      let items = await this.getHistoryLocal();

      const now = new Date();
      if (filter === 'today') {
        const today = now.toISOString().split('T')[0];
        items = items.filter((h) => h.createdAt.split('T')[0] === today);
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        items = items.filter((h) => new Date(h.createdAt) >= weekAgo);
      } else if (filter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        items = items.filter((h) => new Date(h.createdAt) >= monthAgo);
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { success: true, history: items };
    } catch (error: any) {
      return { error: 'Failed to load history' };
    }
  }

  async deleteHistory(id: string): Promise<ApiResponse> {
    try {
      const items = await this.getHistoryLocal();
      const filtered = items.filter((h) => h.id !== id);
      await this.saveHistoryLocal(filtered);
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to delete history' };
    }
  }

  async clearHistory(): Promise<ApiResponse> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
      return { success: true };
    } catch (error: any) {
      return { error: 'Failed to clear history' };
    }
  }

  // ==================== STATS (COMPUTED FROM LOCAL) ====================

  async getStats(): Promise<ApiResponse> {
    try {
      const items = await this.getHistoryLocal();

      const totalCalories = items.reduce((sum, item) => sum + (item.calories || 0), 0);
      const totalProtein = items.reduce((sum, item) => sum + (item.protein || 0), 0);
      const totalFat = items.reduce((sum, item) => sum + (item.fat || 0), 0);
      const totalCarbs = items.reduce((sum, item) => sum + (item.carbs || 0), 0);
      const totalFiber = items.reduce((sum, item) => sum + (item.fiber || 0), 0);
      const totalSugar = items.reduce((sum, item) => sum + (item.sugar || 0), 0);
      const totalScans = items.length;

      const today = new Date().toISOString().split('T')[0];
      const todayScans = items.filter((h) => h.createdAt.split('T')[0] === today).length;

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
      const items = await this.getHistoryLocal();
      const today = new Date().toISOString().split('T')[0];
      const todayItems = items.filter((h) => h.createdAt.split('T')[0] === today);

      const log = {
        totalCalories: todayItems.reduce((sum, item) => sum + (item.calories || 0), 0),
        totalProtein: todayItems.reduce((sum, item) => sum + (item.protein || 0), 0),
        totalFat: todayItems.reduce((sum, item) => sum + (item.fat || 0), 0),
        totalCarbs: todayItems.reduce((sum, item) => sum + (item.carbs || 0), 0),
        totalFiber: todayItems.reduce((sum, item) => sum + (item.fiber || 0), 0),
        totalSugar: todayItems.reduce((sum, item) => sum + (item.sugar || 0), 0),
        mealCount: todayItems.length,
      };

      return { success: true, log };
    } catch (error: any) {
      return { log: { totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, mealCount: 0 } };
    }
  }

  async getDailyLogs(days: number = 7): Promise<ApiResponse> {
    try {
      const items = await this.getHistoryLocal();
      const now = new Date();
      const logs: any[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayItems = items.filter((h) => h.createdAt.split('T')[0] === dateStr);

        logs.push({
          date: dateStr,
          totalCalories: dayItems.reduce((sum, item) => sum + (item.calories || 0), 0),
          totalProtein: dayItems.reduce((sum, item) => sum + (item.protein || 0), 0),
          totalFat: dayItems.reduce((sum, item) => sum + (item.fat || 0), 0),
          totalCarbs: dayItems.reduce((sum, item) => sum + (item.carbs || 0), 0),
          totalFiber: dayItems.reduce((sum, item) => sum + (item.fiber || 0), 0),
          totalSugar: dayItems.reduce((sum, item) => sum + (item.sugar || 0), 0),
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
