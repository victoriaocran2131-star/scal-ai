import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://scal-ai-pbu8.onrender.com';

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  history?: any[];
  stats?: any;
  log?: any;
  user?: any;
  token?: string;
}

class ApiService {
  private token: string | null = null;

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('authToken', token);
  }

  async getToken(): Promise<string | null> {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('authToken');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('authToken');
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async signup(fullName: string, email: string, password: string): Promise<ApiResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.token) {
        await this.setToken(data.token);
      }
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { error: 'Server is waking up. Please try again in 30 seconds.' };
      }
      return { error: 'Network error. Please try again.' };
    }
  }

  async signin(email: string, password: string): Promise<ApiResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.token) {
        await this.setToken(data.token);
      }
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { error: 'Server is waking up. Please try again in 30 seconds.' };
      }
      return { error: 'Network error. Please try again.' };
    }
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/auth/profile`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out. Please try again.' };
      return { error: 'Network error' };
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
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/history?filter=${filter}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async deleteHistory(id: string): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async clearHistory(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/history`, {
        method: 'DELETE',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async getStats(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/stats`, { headers, signal: controller.signal });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async getTodayLog(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/daily-logs/today`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async subscribe(planId: string): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${API_URL}/api/subscription/activate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Server is waking up. Please try again.' };
      return { error: 'Network error' };
    }
  }

  async activateSubscription(planId: string, paystackReference: string): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${API_URL}/api/subscription/activate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId, paystackReference }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Server is waking up. Please try again.' };
      return { error: 'Network error' };
    }
  }

  async checkSubscription(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}/api/subscription/check`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      
      // Store subscription info locally for offline checks
      if (data.hasActiveSubscription && data.subscription) {
        await AsyncStorage.setItem('subscriptionInfo', JSON.stringify(data.subscription));
      } else {
        await AsyncStorage.removeItem('subscriptionInfo');
        await AsyncStorage.removeItem('hasActiveSubscription');
      }
      
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }

  async request(endpoint: string, options: { method?: string; body?: any } = {}): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') return { error: 'Request timed out.' };
      return { error: 'Network error' };
    }
  }
}

export const api = new ApiService();
