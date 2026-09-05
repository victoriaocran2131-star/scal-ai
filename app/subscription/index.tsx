import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  Purchase,
  Product,
} from 'react-native-iap';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

let functions: any;
let validateReceipt: any;

try {
  functions = getFunctions();
  validateReceipt = httpsCallable(functions, 'validateReceipt');
} catch (e) {
  // Firebase functions not available
}

const PRODUCT_IDS = [
  'com.scalai.app.weekly',
  'com.scalai.app.monthly',
  'com.scalai.app.yearly',
];

const plans = [
  {
    id: 'weekly' as const,
    productId: 'com.scalai.app.weekly',
    name: 'Weekly',
    fallbackPrice: '$1.99',
    period: 'per week',
    badge: 'Pay Weekly',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics'],
    popular: false,
  },
  {
    id: 'monthly' as const,
    productId: 'com.scalai.app.monthly',
    name: 'Monthly',
    fallbackPrice: '$7.99',
    period: 'per month',
    badge: 'Most Popular',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics', 'Meal Reminders'],
    popular: true,
  },
  {
    id: 'yearly' as const,
    productId: 'com.scalai.app.yearly',
    name: 'Yearly',
    fallbackPrice: '$49.99',
    period: 'per year',
    badge: 'Save 60%',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics', 'Meal Reminders', 'Best Value'],
    popular: false,
  },
];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let purchaseUpdateSubscription: any;

    initIAP();

    try {
      purchaseUpdateSubscription = purchaseUpdatedListener(handlePurchaseUpdated);
    } catch (e) {
      // Purchase listener error
    }

    return () => {
      if (purchaseUpdateSubscription) {
        if (typeof purchaseUpdateSubscription.remove === 'function') {
          purchaseUpdateSubscription.remove();
        } else if (typeof purchaseUpdateSubscription === 'function') {
          purchaseUpdateSubscription();
        }
      }
      endConnection();
    };
  }, []);

  const initIAP = async () => {
    try {
      const result = await initConnection();
      if (result) {
        setConnected(true);
        const products = await fetchProducts({ skus: PRODUCT_IDS });
        if (products && products.length > 0) {
          const priceMap: Record<string, string> = {};
          for (const product of products) {
            const p = product as any;
            priceMap[p.productId || p.sku] = p.localizedPrice || p.price || '';
          }
          setPrices(priceMap);
        }
      }
    } catch (error) {
      // IAP init error
    }
  };

  const handlePurchase = async (productId: string) => {
    try {
      await requestPurchase({ sku: productId } as any);
    } catch (error: any) {
      if (error?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Error', 'Payment could not be completed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handlePurchaseUpdated = useCallback(async (purchase: Purchase) => {
    const { productId } = purchase;

    try {
      const validationResult = await validateReceipt({
        receiptData: JSON.stringify(purchase),
      });

      const data = validationResult.data as any;

      if (data.success) {
        await AsyncStorage.setItem('hasActiveSubscription', 'true');
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert(
          'Subscription Active!',
          'Your subscription has been activated. You can now scan food!',
          [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
        );
      } else {
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert('Error', 'Subscription validation failed. Please try again.');
      }
    } catch (error) {
      const planId = plans.find(p => p.productId === productId)?.id;
      if (planId) {
        await api.activateSubscription(planId);
        await AsyncStorage.setItem('hasActiveSubscription', 'true');
        await finishTransaction({ purchase, isConsumable: false });
        Alert.alert(
          'Subscription Active!',
          'Your subscription has been activated. You can now scan food!',
          [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
        );
      }
    }
    setLoading(false);
  }, []);

  const handleSelectPlan = async () => {
    if (!selectedPlan) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }

    const user = JSON.parse(await AsyncStorage.getItem('scalai_user') || '{}');
    if (!user.email) {
      Alert.alert('Error', 'Please sign in first');
      router.push('/signin');
      return;
    }

    setLoading(true);
    const plan = plans.find(p => p.id === selectedPlan);
    if (plan) {
      await handlePurchase(plan.productId);
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      const localSub = await AsyncStorage.getItem('hasActiveSubscription');
      if (localSub === 'true') {
        Alert.alert(
          'Purchases Restored!',
          'Your subscription has been restored.',
          [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
        );
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not restore purchases.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.logo}>🍽️</Text>
          <Text style={styles.title}>Subscribe to Scal AI</Text>
          <Text style={styles.subtitle}>Choose a plan to start tracking your nutrition</Text>
        </View>

        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              plan.popular && styles.popularCard,
              selectedPlan === plan.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedPlan(plan.id)}
          >
            <View style={styles.badgeRow}>
              <View style={[styles.badge, plan.popular ? styles.popularBadge : styles.regularBadge]}>
                <Text style={[styles.badgeText, plan.popular && styles.popularBadgeText]}>{plan.badge}</Text>
              </View>
            </View>

            <Text style={styles.planPrice}>{prices[plan.productId] || plan.fallbackPrice}</Text>
            <Text style={styles.planPeriod}>{plan.period}</Text>

            <View style={styles.features}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.featureCheck}>✓</Text>
                  <Text style={[styles.featureText, feature === 'Best Value' && styles.bestValueText]}>
                    {feature === 'Best Value' ? '★ ' : ''}{feature}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[
              styles.radioButton,
              selectedPlan === plan.id && styles.radioButtonSelected,
            ]}>
              {selectedPlan === plan.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.subscribeButton, (!selectedPlan || loading) && styles.disabledButton]}
          onPress={handleSelectPlan}
          disabled={loading || !selectedPlan}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan ? `Subscribe for ${prices[plans.find(p => p.id === selectedPlan)?.productId || ''] || plans.find(p => p.id === selectedPlan)?.fallbackPrice}` : 'Select a Plan'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases} disabled={loading}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By subscribing, you agree to our{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL('https://scalai.app/terms')}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink} onPress={() => Linking.openURL('https://scalai.app/privacy')}>Privacy Policy</Text>.
          {'\n'}You can cancel anytime in your App Store subscription settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  backButton: {
    marginBottom: Spacing.lg,
  },
  backText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xlarge,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  popularCard: {
    borderColor: Colors.gold,
  },
  selectedCard: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  regularBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  popularBadge: {
    backgroundColor: Colors.gold,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.grayLight,
  },
  popularBadgeText: {
    color: Colors.black,
  },
  planPrice: {
    fontSize: 36,
    color: Colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  planPeriod: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  features: {
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  featureCheck: {
    color: Colors.gold,
    fontSize: 16,
    fontWeight: 'bold',
  },
  featureText: {
    color: Colors.white,
    fontSize: FontSize.medium,
  },
  bestValueText: {
    color: Colors.gold,
    fontWeight: '600',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  radioButtonSelected: {
    borderColor: Colors.gold,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
  },
  subscribeButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    color: Colors.black,
    fontSize: FontSize.large,
    fontWeight: 'bold',
  },
  restoreButton: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
    textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 11,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.gold,
    textDecorationLine: 'underline',
  },
});
