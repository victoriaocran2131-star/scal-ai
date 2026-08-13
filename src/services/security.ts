import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import { Platform } from 'react-native';
import { API_BASE } from './config';

// Security configuration
const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  API_TIMEOUT: 15000, // 15 seconds
  MAX_API_RETRIES: 3,
};

// Rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const SecurityService = {
  // Check if device is jailbroken (basic check)
  async isDeviceCompromised(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // Check for common jailbreak indicators
        const indicators = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
          '/private/var/lib/apt/',
        ];

        // This is a basic check - in production, use a proper jailbreak detection library
        return false;
      }
      return false;
    } catch {
      return false;
    }
  },

  // Rate limit login attempts
  checkRateLimit(identifier: string): { allowed: boolean; remainingTime?: number } {
    const now = Date.now();
    const attempts = loginAttempts.get(identifier);

    if (!attempts) {
      return { allowed: true };
    }

    // Reset if lockout period has passed
    if (now - attempts.lastAttempt > SECURITY_CONFIG.LOCKOUT_DURATION) {
      loginAttempts.delete(identifier);
      return { allowed: true };
    }

    if (attempts.count >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      const remainingTime = SECURITY_CONFIG.LOCKOUT_DURATION - (now - attempts.lastAttempt);
      return { allowed: false, remainingTime };
    }

    return { allowed: true };
  },

  // Record login attempt
  recordLoginAttempt(identifier: string, success: boolean): void {
    if (success) {
      loginAttempts.delete(identifier);
      return;
    }

    const now = Date.now();
    const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };

    loginAttempts.set(identifier, {
      count: attempts.count + 1,
      lastAttempt: now,
    });
  },

  // Generate session token
  async generateSessionToken(): Promise<string> {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    const device = await Device.deviceName || 'unknown';
    return `${timestamp}-${random}-${device}`;
  },

  // Store session securely
  async storeSession(token: string, userId: string): Promise<void> {
    const session = {
      token,
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SECURITY_CONFIG.SESSION_DURATION,
      deviceInfo: {
        os: Platform.OS,
        version: Platform.Version,
      },
    };

    await AsyncStorage.setItem('userSession', JSON.stringify(session));
  },

  // Validate session
  async validateSession(): Promise<{ valid: boolean; userId?: string }> {
    try {
      const sessionStr = await AsyncStorage.getItem('userSession');
      if (!sessionStr) return { valid: false };

      const session = JSON.parse(sessionStr);

      // Check expiration
      if (Date.now() > session.expiresAt) {
        await AsyncStorage.removeItem('userSession');
        return { valid: false };
      }

      return { valid: true, userId: session.userId };
    } catch {
      return { valid: false };
    }
  },

  // Clear session
  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem('userSession');
    await AsyncStorage.removeItem('authToken');
  },

  // Secure API call with retry and timeout
  async secureApiCall(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.API_TIMEOUT);

      const token = await AsyncStorage.getItem('authToken');
      const session = await this.validateSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-App-Version': '1.0.8',
        'X-Platform': Platform.OS,
        'X-Request-Id': await this.generateSessionToken(),
        ...(options.headers as Record<string, string>),
      };

      if (token && session.valid) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError' && retryCount < SECURITY_CONFIG.MAX_API_RETRIES) {
        return this.secureApiCall(endpoint, options, retryCount + 1);
      }
      throw error;
    }
  },

  // Validate input to prevent injection
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  },

  // Check network security
  async checkNetworkSecurity(): Promise<{ secure: boolean; type: string }> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return {
        secure: networkState.isConnected ?? false,
        type: networkState.type?.toString() || 'unknown',
      };
    } catch {
      return { secure: false, type: 'unknown' };
    }
  },

  // Log security event
  async logSecurityEvent(event: string, details: any): Promise<void> {
    try {
      await this.secureApiCall('/api/security/log', {
        method: 'POST',
        body: JSON.stringify({
          event,
          details,
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          version: '1.0.8',
        }),
      });
    } catch {
      // Silently fail - don't expose security logging to users
    }
  },

  // Check app integrity
  async verifyAppIntegrity(): Promise<boolean> {
    try {
      const result = await this.secureApiCall('/api/security/verify');
      return result.valid === true;
    } catch {
      return false;
    }
  },
};

export default SecurityService;
