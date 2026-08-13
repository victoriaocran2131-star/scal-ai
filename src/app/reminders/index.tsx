import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Colors, FontSize, Spacing } from '../../constants/theme';

interface Reminder {
  time: string;
  enabled: boolean;
}

interface Settings {
  enabled: boolean;
  breakfast: Reminder;
  lunch: Reminder;
  dinner: Reminder;
  snack: Reminder;
}

const defaultSettings: Settings = {
  enabled: true,
  breakfast: { time: '08:00', enabled: true },
  lunch: { time: '12:00', enabled: true },
  dinner: { time: '19:00', enabled: true },
  snack: { time: '15:00', enabled: false },
};

const reminderConfig: Record<string, { title: string; body: string; icon: string }> = {
  breakfast: { title: '🌅 Breakfast Time!', body: "Don't forget to scan your breakfast and track your calories!", icon: '🌅' },
  lunch: { title: '☀️ Lunch Time!', body: 'Time to log your lunch. Keep your nutrition tracking on track!', icon: '☀️' },
  dinner: { title: '🌙 Dinner Time!', body: "Remember to scan your dinner to complete today's log.", icon: '🌙' },
  snack: { title: '🍎 Snack Check!', body: 'Had a snack? Log it to keep your tracking accurate!', icon: '🍎' },
};

export default function RemindersScreen() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('scalai_notifications');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Failed to load settings');
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    try {
      await AsyncStorage.setItem('scalai_notifications', JSON.stringify(newSettings));
    } catch (error) {
      console.log('Failed to save settings');
    }
  };

  const requestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  };

  const scheduleReminders = async (s: Settings) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!s.enabled) return;

    const types = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
    for (const type of types) {
      const reminder = s[type];
      if (!reminder.enabled) continue;

      const [hours, minutes] = reminder.time.split(':').map(Number);
      const config = reminderConfig[type];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hours,
          minute: minutes,
        },
      });
    }
  };

  const toggleMaster = async (value: boolean) => {
    const newSettings = { ...settings, enabled: value };
    if (value) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Denied', 'Please enable notifications in device settings.');
        return;
      }
      await scheduleReminders(newSettings);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
    saveSettings(newSettings);
  };

  const toggleReminder = async (type: keyof Omit<Settings, 'enabled'>) => {
    const newSettings = {
      ...settings,
      [type]: { ...settings[type], enabled: !settings[type].enabled },
    };
    if (newSettings.enabled) {
      await scheduleReminders(newSettings);
    }
    saveSettings(newSettings);
  };

  const setTime = async (type: keyof Omit<Settings, 'enabled'>, time: string) => {
    const newSettings = {
      ...settings,
      [type]: { ...settings[type], time },
    };
    if (newSettings.enabled) {
      await scheduleReminders(newSettings);
    }
    saveSettings(newSettings);
  };

  const testNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Scal AI Test',
        body: 'Notifications are working! You will receive meal reminders at your set times.',
      },
      trigger: null,
    });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔔 Reminders</Text>
        <TouchableOpacity onPress={testNotification}>
          <Text style={styles.testBtn}>Test</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.masterCard}>
          <View style={styles.masterInfo}>
            <Text style={styles.masterLabel}>Enable Reminders</Text>
            <Text style={styles.masterDesc}>Get daily meal reminders to log your food</Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={toggleMaster}
            trackColor={{ false: '#333', true: 'rgba(212,175,55,0.4)' }}
            thumbColor={settings.enabled ? Colors.gold : '#666'}
          />
        </View>

        {mealTypes.map((type) => {
          const reminder = settings[type];
          const config = reminderConfig[type];
          return (
            <View
              key={type}
              style={[styles.reminderCard, !settings.enabled && styles.reminderDisabled]}
            >
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderIcon}>{config.icon}</Text>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>{config.title.replace(/[^\w\s!]/g, '').trim()}</Text>
                  <Text style={styles.reminderBody}>{config.body}</Text>
                </View>
                <Switch
                  value={reminder.enabled}
                  onValueChange={() => toggleReminder(type)}
                  disabled={!settings.enabled}
                  trackColor={{ false: '#333', true: 'rgba(212,175,55,0.4)' }}
                  thumbColor={reminder.enabled ? Colors.gold : '#666'}
                />
              </View>
              {reminder.enabled && settings.enabled && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Time:</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={reminder.time}
                    onChangeText={(text) => setTime(type, text)}
                    placeholder="HH:MM"
                    placeholderTextColor="#666"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkBg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { color: Colors.gold, fontSize: FontSize.medium },
  title: { fontSize: FontSize.xlarge, color: Colors.gold, fontWeight: 'bold' },
  testBtn: { color: Colors.gold, fontSize: FontSize.medium },
  content: { flex: 1 },
  contentContainer: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  masterCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  masterInfo: { flex: 1, marginRight: Spacing.md },
  masterLabel: { fontSize: FontSize.large, color: Colors.white, fontWeight: 'bold' },
  masterDesc: { fontSize: FontSize.small, color: Colors.grayLight, marginTop: 4 },
  reminderCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  reminderDisabled: { opacity: 0.4 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center' },
  reminderIcon: { fontSize: 28, marginRight: Spacing.md },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: FontSize.medium, color: Colors.white, fontWeight: 'bold' },
  reminderBody: { fontSize: FontSize.small, color: Colors.grayLight, marginTop: 2 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  timeLabel: { color: Colors.grayLight, fontSize: FontSize.small, marginRight: Spacing.md },
  timeInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.white,
    fontSize: FontSize.medium,
    width: 80,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
});
