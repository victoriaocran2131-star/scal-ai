import { router } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_LINKS = {
  weekly: 'https://paystack.shop/pay/4i-jmyzb7y',
  monthly: 'https://paystack.shop/pay/iacumhzgpu',
  yearly: 'https://paystack.shop/pay/wwfe5di8p3',
};

const plans = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: 1.99,
    priceLabel: '$1.99',
    period: 'per week',
    badge: 'Pay Weekly',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics'],
    popular: false,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: 7.99,
    priceLabel: '$7.99',
    period: 'per month',
    badge: 'Most Popular',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics', 'Meal Reminders'],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 49.99,
    priceLabel: '$49.99',
    period: 'per year',
    badge: 'Save 60%',
    features: ['Food Scanning', 'Nutrition Tracking', 'Scan History', 'Daily Goals', 'Charts & Analytics', 'Meal Reminders', 'Best Value'],
    popular: false,
  },
];

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [waitingForPayment, setWaitingForPayment] = useState(false);
  const [dots, setDots] = useState('');
  const pollingRef = useRef<any>(null);
  const dotsRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
    };
  }, []);

  const startPolling = () => {
    setWaitingForPayment(true);

    // Animate dots
    dotsRef.current = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // Poll subscription status every 3 seconds
    pollingRef.current = setInterval(async () => {
      try {
        const result = await api.checkSubscription();
        if (result.hasActiveSubscription) {
          // Subscription activated by webhook!
          stopPolling();
          await AsyncStorage.setItem('hasActiveSubscription', 'true');
          Alert.alert(
            'Subscription Active!',
            'Your subscription has been activated. You can now scan food!',
            [{ text: 'Start Scanning', onPress: () => router.push('/scanner') }]
          );
        }
      } catch (error) {
        // Keep polling
      }
    }, 3000);

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (pollingRef.current) {
        stopPolling();
        Alert.alert(
          'Payment Not Detected',
          'If you completed payment, please wait a few minutes and try again. The webhook may take time to process.',
          [{ text: 'OK' }]
        );
      }
    }, 300000);
  };

  const stopPolling = () => {
    setWaitingForPayment(false);
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (dotsRef.current) clearInterval(dotsRef.current);
    pollingRef.current = null;
    dotsRef.current = null;
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

    const paymentUrl = PAYMENT_LINKS[selectedPlan.id as keyof typeof PAYMENT_LINKS];

    Alert.alert(
      'Subscribe',
      `You will be charged ${selectedPlan.priceLabel} for the ${selectedPlan.name} plan.\n\nUse the SAME email you signed up with (${user.email}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              await Linking.openURL(paymentUrl);
              // Start polling for webhook activation
              startPolling();
            } catch (error) {
              Alert.alert('Error', 'Could not open payment page');
            }
          }
        },
      ]
    );
  };

  // Waiting for payment screen
  if (waitingForPayment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.waitingContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.waitingTitle}>Waiting for payment{dots}</Text>
          <Text style={styles.waitingText}>
            Complete your payment in the browser.
          </Text>
          <Text style={styles.waitingText}>
            Your subscription will activate automatically once payment is confirmed.
          </Text>
          <Text style={styles.waitingSubtext}>
            Use the same email you signed up with.
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={stopPolling}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
              selectedPlan?.id === plan.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedPlan(plan)}
          >
            <View style={styles.badgeRow}>
              <View style={[styles.badge, plan.popular ? styles.popularBadge : styles.regularBadge]}>
                <Text style={[styles.badgeText, plan.popular && styles.popularBadgeText]}>{plan.badge}</Text>
              </View>
            </View>

            <Text style={styles.planPrice}>{plan.priceLabel}</Text>
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
              selectedPlan?.id === plan.id && styles.radioButtonSelected,
            ]}>
              {selectedPlan?.id === plan.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.subscribeButton, !selectedPlan && styles.disabledButton]}
          onPress={handleSelectPlan}
          disabled={loading || !selectedPlan}
        >
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.subscribeButtonText}>
              {selectedPlan ? `Subscribe for ${selectedPlan.priceLabel}` : 'Select a Plan'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. You can cancel anytime.
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
  terms: {
    fontSize: 11,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  waitingTitle: {
    fontSize: FontSize.xlarge,
    color: Colors.white,
    fontWeight: 'bold',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  waitingText: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  waitingSubtext: {
    fontSize: 12,
    color: Colors.gold,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  cancelButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  cancelButtonText: {
    color: Colors.gray,
    fontSize: FontSize.medium,
  },
});
