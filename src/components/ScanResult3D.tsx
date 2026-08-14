import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FoodItem } from '../data/foodDatabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function NutrientBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const barAnim = useRef(new Animated.Value(0)).current;
  const progress = Math.min(value / max, 1);

  useEffect(() => {
    Animated.timing(barAnim, { toValue: progress, duration: 1000, useNativeDriver: false }).start();
  }, []);

  return (
    <View style={styles.nutrientRow}>
      <Text style={styles.nutrientLabel}>{label}</Text>
      <View style={styles.nutrientBarBg}>
        <Animated.View
          style={[
            styles.nutrientBarFill,
            {
              width: barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.nutrientValue}>{value}{unit}</Text>
    </View>
  );
}

interface Props {
  food: FoodItem;
}

export default function ScanResult3D({ food }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] });
  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  const getImpactColor = () => {
    if (food.kidneyImpact === 'positive') return { primary: '#00C853', bg: '#E8F5E9' };
    if (food.kidneyImpact === 'negative') return { primary: '#FF1744', bg: '#FFEBEE' };
    return { primary: '#FF9100', bg: '#FFF3E0' };
  };

  const impactColor = getImpactColor();

  const getImpactEmoji = () => {
    if (food.kidneyImpact === 'positive') return '✅';
    if (food.kidneyImpact === 'negative') return '⚠️';
    return 'ℹ️';
  };

  const getImpactLabel = () => {
    if (food.kidneyImpact === 'positive') return 'Kidney Friendly';
    if (food.kidneyImpact === 'negative') return 'Kidney Risk';
    return 'Moderate';
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }, { rotateX: rotate }] }]}>
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.glowOverlay}>
          <Animated.View style={[styles.shimmer, { opacity: shimmerOpacity }]} />
        </View>

        <View style={styles.header}>
          <View style={styles.foodNameContainer}>
            <View style={[styles.impactBadge, { backgroundColor: impactColor.bg }]}>
              <Text style={[styles.impactText, { color: impactColor.primary }]}>
                {getImpactEmoji()} {getImpactLabel()}
              </Text>
            </View>
          </View>
          <View style={styles.caloriesContainer}>
            <Text style={styles.caloriesNumber}>{food.calories}</Text>
            <Text style={styles.caloriesLabel}>kcal</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.nutrientsSection}>
          <Text style={styles.sectionTitle}>Nutrition Facts</Text>
          <NutrientBar label="Protein" value={food.protein} max={50} unit="g" color="#FF6B6B" />
          <NutrientBar label="Carbs" value={food.carbs} max={100} unit="g" color="#4ECDC4" />
          <NutrientBar label="Fat" value={food.fat} max={50} unit="g" color="#FFD93D" />
          <NutrientBar label="Fiber" value={food.fiber} max={10} unit="g" color="#6BCB77" />
          <NutrientBar label="Sugar" value={food.sugar} max={30} unit="g" color="#C44569" />
        </View>

        <View style={styles.divider} />

        <View style={styles.digestSection}>
          <Text style={styles.sectionTitle}>Digestion Time</Text>
          <View style={styles.digestBadge}>
            <Text style={styles.digestTime}>{food.digestion}</Text>
          </View>
          <Text style={styles.digestDesc}>{food.digestionDesc}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.kidneySection}>
          <Text style={styles.sectionTitle}>Kidney Impact</Text>
          <Text style={[styles.kidneyImpact, { color: impactColor.primary }]}>{food.kidneyTip}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.factSection}>
          <Text style={styles.sectionTitle}>Did You Know?</Text>
          <Text style={styles.factText}>{food.fact}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 10 },
  card: { width: SCREEN_WIDTH - 40, borderRadius: 24, padding: 20, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },
  glowOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, overflow: 'hidden' },
  shimmer: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  foodNameContainer: { flex: 1 },
  foodName: { fontSize: 28, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5 },
  impactBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  impactText: { fontSize: 13, fontWeight: '700' },
  caloriesContainer: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 12, minWidth: 80 },
  caloriesNumber: { fontSize: 32, fontWeight: 'bold', color: '#FFD93D' },
  caloriesLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 10 },
  nutrientsSection: { marginBottom: 4 },
  nutrientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nutrientLabel: { width: 60, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  nutrientBarBg: { flex: 1, height: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden', marginHorizontal: 8 },
  nutrientBarFill: { height: '100%', borderRadius: 5 },
  nutrientValue: { width: 45, fontSize: 13, fontWeight: '600', color: '#fff', textAlign: 'right' },
  digestSection: { marginBottom: 4 },
  digestBadge: { backgroundColor: 'rgba(78, 205, 196, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 6 },
  digestTime: { fontSize: 16, fontWeight: '700', color: '#4ECDC4' },
  digestDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  kidneySection: { marginBottom: 4 },
  kidneyImpact: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  factSection: { marginBottom: 4 },
  factText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, fontStyle: 'italic' },
});
