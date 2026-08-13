import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { api } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = 7 | 14 | 30;

interface DayLog {
  date: string;
  label: string;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  mealCount: number;
}

export default function ChartsScreen() {
  const [period, setPeriod] = useState<Period>(7);
  const [dailyLogs, setDailyLogs] = useState<DayLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const logsData = await api.request(`/api/daily-logs?days=${period}`);
      if (logsData && logsData.success && (logsData as any).logs) {
        setDailyLogs(fillMissingDays((logsData as any).logs));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const fillMissingDays = (logs: any[]): DayLog[] => {
    const filled: DayLog[] = [];
    const now = new Date();
    for (let i = period - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const existing = logs.find((l: any) => l.date === dateStr);
      filled.push({
        date: dateStr,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalCalories: existing ? existing.totalCalories : 0,
        totalProtein: existing ? existing.totalProtein : 0,
        totalFat: existing ? existing.totalFat : 0,
        totalCarbs: existing ? existing.totalCarbs : 0,
        mealCount: existing ? existing.mealCount : 0,
      });
    }
    return filled;
  };

  const getAverage = (key: keyof DayLog) => {
    if (dailyLogs.length === 0) return 0;
    const sum = dailyLogs.reduce((s, d) => s + (d[key] as number), 0);
    return sum / dailyLogs.length;
  };

  const getTotal = (key: keyof DayLog) => {
    return dailyLogs.reduce((s, d) => s + (d[key] as number), 0);
  };

  const getBarHeight = (value: number, max: number) => {
    if (max === 0) return 0;
    return Math.max((value / max) * 120, 2);
  };

  const renderBarChart = (data: number[], color: string, label: string, maxOverride?: number) => {
    const max = maxOverride ?? Math.max(...data, 1);
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartLabel}>{label}</Text>
        <View style={styles.barChart}>
          {data.map((val, i) => (
            <View key={i} style={styles.barColumn}>
              <Text style={styles.barValue}>{Math.round(val)}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: getBarHeight(val, max),
                    backgroundColor: color,
                  },
                ]}
              />
              <Text style={styles.barLabel}>{dailyLogs[i]?.label || ''}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>📊 Charts</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.periodSelector}>
        {([7, 14, 30] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>
              {p}D
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Loading data...</Text>
        ) : dailyLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No Data Yet</Text>
            <Text style={styles.emptyText}>Start scanning food to see your nutrition charts!</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{Math.round(getAverage('totalCalories'))}</Text>
                <Text style={styles.summaryLabel}>Avg Cal/Day</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{getAverage('totalProtein').toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>Avg Protein</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{Math.round(getTotal('mealCount'))}</Text>
                <Text style={styles.summaryLabel}>Total Meals</Text>
              </View>
            </View>

            {renderBarChart(
              dailyLogs.map((d) => d.totalCalories),
              Colors.gold,
              '🔥 Calories'
            )}

            {renderBarChart(
              dailyLogs.map((d) => d.totalProtein),
              '#e8a838',
              '🥩 Protein (g)'
            )}

            {renderBarChart(
              dailyLogs.map((d) => d.totalCarbs),
              '#5dade2',
              '🌾 Carbs (g)'
            )}

            {renderBarChart(
              dailyLogs.map((d) => d.totalFat),
              '#d4af37',
              '🫒 Fat (g)'
            )}

            {renderBarChart(
              dailyLogs.map((d) => d.mealCount),
              '#c9a227',
              '🍽️ Meals',
              Math.max(...dailyLogs.map((d) => d.mealCount), 1)
            )}
          </>
        )}
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
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  periodBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  periodBtnActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  periodBtnText: { color: Colors.grayLight, fontSize: FontSize.small },
  periodBtnTextActive: { color: Colors.black, fontWeight: 'bold' },
  content: { flex: 1 },
  contentContainer: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingText: { color: Colors.grayLight, textAlign: 'center', marginTop: 40 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xlarge, color: Colors.white, fontWeight: 'bold' },
  emptyText: { color: Colors.grayLight, marginTop: Spacing.sm, textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(212,175,55,0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.2)',
  },
  summaryValue: { fontSize: FontSize.large, color: Colors.gold, fontWeight: 'bold' },
  summaryLabel: { fontSize: FontSize.small, color: Colors.grayLight, marginTop: 4 },
  chartCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.15)',
  },
  chartLabel: { fontSize: FontSize.medium, color: Colors.white, fontWeight: 'bold', marginBottom: Spacing.md },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingTop: 20,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    minHeight: 2,
  },
  barValue: {
    fontSize: 9,
    color: Colors.grayLight,
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 8,
    color: Colors.gray,
    marginTop: 4,
    textAlign: 'center',
  },
});
