import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://scal-ai-production.up.railway.app';

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
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await response.json();
      if (data.token) {
        await this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return { error: 'Network error. Please try again.' };
    }
  }

  async signin(email: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${API_URL}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.token) {
        await this.setToken(data.token);
      }
      return data;
    } catch (error) {
      return { error: 'Network error. Please try again.' };
    }
  }

  async getProfile(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/auth/profile`, { headers });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async addHistory(item: {
    foodName: string;
    calories: number;
    protein: number;
    fat: number;
    digestion: string;
    image?: string;
  }): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/history`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item),
      });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async getHistory(filter: string = 'all'): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/history?filter=${filter}`, {
        headers,
      });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async deleteHistory(id: string): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers,
      });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async clearHistory(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/history`, {
        method: 'DELETE',
        headers,
      });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async getStats(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/stats`, { headers });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }

  async getTodayLog(): Promise<ApiResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_URL}/api/daily-logs/today`, {
        headers,
      });
      return await response.json();
    } catch (error) {
      return { error: 'Network error' };
    }
  }
}

export const api = new ApiService();
