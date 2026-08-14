import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SecurityService {
  private static instance: SecurityService;
  private isJailbroken = false;

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  async checkDeviceIntegrity(): Promise<{ secure: boolean; reason?: string }> {
    try {
      if (__DEV__) {
        return { secure: true };
      }

      const jailbroken = await this.detectJailbreak();
      if (jailbroken) {
        return { secure: false, reason: 'Device is jailbroken or rooted' };
      }

      const emulator = await this.detectEmulator();
      if (emulator) {
        return { secure: false, reason: 'Running on emulator' };
      }

      const debugged = await this.detectDebugger();
      if (debugged) {
        return { secure: false, reason: 'Debugger detected' };
      }

      return { secure: true };
    } catch (error) {
      return { secure: true };
    }
  }

  private async detectJailbreak(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const paths = [
          '/Applications/Cydia.app',
          '/Library/MobileSubstrate/MobileSubstrate.dylib',
          '/bin/bash',
          '/usr/sbin/sshd',
          '/etc/apt',
          '/private/var/lib/apt/',
        ];
        for (const path of paths) {
          try {
            const { default: FileSystem } = await import('expo-file-system');
            const info = await FileSystem.getInfoAsync(path);
            if (info.exists) return true;
          } catch {}
        }
      } else if (Platform.OS === 'android') {
        const { default: FileSystem } = await import('expo-file-system');
        const paths = [
          '/system/app/Superuser.apk',
          '/system/xbin/su',
          '/system/bin/su',
          '/sbin/su',
          '/data/local/xbin/su',
          '/data/local/bin/su',
          '/system/sd/xbin/su',
          '/system/bin/failsafe/su',
          '/data/local/su',
        ];
        for (const path of paths) {
          try {
            const info = await FileSystem.getInfoAsync(path);
            if (info.exists) return true;
          } catch {}
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async detectEmulator(): Promise<boolean> {
    try {
      if (Device.isDevice) return false;

      if (Platform.OS === 'android') {
        const { default: FileSystem } = await import('expo-file-system');
        const files = [
          '/dev/socket/qemud',
          '/dev/qemu_pipe',
          '/system/lib/libc_malloc_debug_qemu.so',
          '/sys/qemu_trace',
          '/system/bin/qemu-props',
        ];
        for (const file of files) {
          try {
            const info = await FileSystem.getInfoAsync(file);
            if (info.exists) return true;
          } catch {}
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async detectDebugger(): Promise<boolean> {
    try {
      if (__DEV__) return false;
      return false;
    } catch {
      return false;
    }
  }

  async checkAppIntegrity(): Promise<boolean> {
    try {
      const buildTime = await AsyncStorage.getItem('buildTime');
      if (buildTime && buildTime !== '1.0.28') {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  }

  generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

export const security = SecurityService.getInstance();
