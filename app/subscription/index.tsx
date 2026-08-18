import { router } from 'expo-router';
import { useState, useEffect } from 'react';
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
import * as InAppPurchases from 'expo-in-app-purchases';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCT_IDS = {
  weekly: 'com.scalai.app.weekly',
  monthly: 'com.scalai.app.monthly',
  yearly: 'com.scalai.app.yearly',
};

const plans = [
  {
    id: 'weekly' as const,
    name: 'Weekly',
    fallbackPrice: '$1.99',
    period: 'per week',
    badge: 'Pay Weekly',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics'],
    popular: false,
  },
  {
    id: 'monthly' as const,
    name: 'Monthly',
    fallbackPrice: '$7.99',
    period: 'per month',
    badge: 'Most Popular',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics', 'Meal Reminders'],
    popular: true,
  },
  {
    id: 'yearly' as const,
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

  useEffect(() => {
    initIAP();
    return () => {
      InAppPurchases.disconnectAsync();
    };
  }, []);

  const initIAP = async () => {
    try {
      await InAppPurchases.connectAsync();

      InAppPurchases.setPurchaseListener(({ responseCode, results }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
          results.forEach(async (purchase) => {
            if (!purchase.acknowledged) {
              const planId = Object.entries(PRODUCT_IDS).find(([, pid]) => pid === purchase.productId)?.[0];
              if (planId) {
                await api.activateSubscription(planId);
                await AsyncStorage.setItem('hasActiveSubscription', 'true');
                await InAppPurchases.finishTransactionAsync(purchase, true);
                Alert.alert(
                  'Subscription Active!',
                  'Your subscription has been activated. You can now scan food!',
                  [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
                );
              }
            }
          });
        } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          // User cancelled
        } else {
          Alert.alert('Error', 'Payment could not be completed. Please try again.');
        }
        setLoading(false);
      });

      const { responseCode, results } = await InAppPurchases.getProductsAsync(
        Object.values(PRODUCT_IDS)
      );
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        const priceMap: Record<string, string> = {};
        for (const product of results) {
          const planId = Object.entries(PRODUCT_IDS).find(([, pid]) => pid === product.productId)?.[0];
          if (planId) {
            priceMap[planId] = product.price;
          }
        }
        setPrices(priceMap);
      }
    } catch (error) {
      // IAP init error
    }
  };

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
    try {
      const productId = PRODUCT_IDS[selectedPlan as keyof typeof PRODUCT_IDS];
      await InAppPurchases.purchaseItemAsync(productId);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Payment could not be completed. Please try again.');
    }
  };

  const handleRestorePurchases = async () => {
    setLoading(true);
    try {
      await InAppPurchases.connectAsync();
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
        const validPurchase = results.find(
          (p) => Object.values(PRODUCT_IDS).includes(p.productId)
        );
        if (validPurchase) {
          const planId = Object.entries(PRODUCT_IDS).find(
            ([, pid]) => pid === validPurchase.productId
          )?.[0];
          if (planId) {
            await api.activateSubscription(planId);
            await AsyncStorage.setItem('hasActiveSubscription', 'true');
            Alert.alert(
              'Purchases Restored!',
              'Your subscription has been restored.',
              [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
            );
          }
        } else {
          Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
        }
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

            <Text style={styles.planPrice}>{prices[plan.id] || plan.fallbackPrice}</Text>
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
              {selectedPlan ? `Subscribe for ${prices[selectedPlan] || plans.find(p => p.id === selectedPlan)?.fallbackPrice}` : 'Select a Plan'}
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
