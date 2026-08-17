import { router, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { api } from '../../src/services/api';

interface HistoryItem {
  id: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  digestion: string;
  createdAt: string;
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const navigation = useNavigation();

  const loadHistory = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const result = await api.getHistory(filter);
      if (result.success) {
        setHistory(result.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, [filter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadHistory(false);
    });
    return unsubscribe;
  }, [navigation, filter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory(false);
    setRefreshing(false);
  }, [filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.itemStats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.calories}</Text>
          <Text style={styles.statLabel}>kcal</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.protein}g</Text>
          <Text style={styles.statLabel}>protein</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.fat}g</Text>
          <Text style={styles.statLabel}>fat</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{item.carbs}g</Text>
          <Text style={styles.statLabel}>carbs</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.filterContainer}>
        {['all', 'today', 'week', 'month'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.gold} style={styles.loader} />
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} colors={[Colors.gold]} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No scans yet</Text>
              <TouchableOpacity onPress={() => router.push('/scanner')}>
                <Text style={styles.scanLink}>Start scanning</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    color: Colors.gold,
    fontSize: FontSize.medium,
    width: 60,
  },
  title: {
    fontSize: FontSize.xlarge,
    color: Colors.white,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    backgroundColor: Colors.cardBg,
  },
  filterActive: {
    backgroundColor: Colors.gold,
  },
  filterText: {
    color: Colors.gray,
    fontSize: FontSize.small,
  },
  filterTextActive: {
    color: Colors.black,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: Spacing.lg,
  },
  historyItem: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  itemHeader: {
    marginBottom: Spacing.sm,
  },
  itemDate: {
    color: Colors.gray,
    fontSize: FontSize.small,
  },
  itemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    color: Colors.gold,
    fontSize: FontSize.medium,
    fontWeight: 'bold',
  },
  statLabel: {
    color: Colors.gray,
    fontSize: FontSize.small - 2,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
  },
  emptyText: {
    color: Colors.gray,
    fontSize: FontSize.large,
    marginBottom: Spacing.md,
  },
  scanLink: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
});
