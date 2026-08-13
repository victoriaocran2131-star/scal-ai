import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface KidneyDiagramProps {
  impact: 'positive' | 'neutral' | 'negative';
  tip: string;
}

export default function KidneyDiagram({ impact, tip }: KidneyDiagramProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (impact === 'positive') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, { toValue: 5, duration: 3000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: -5, duration: 3000, useNativeDriver: true }),
        Animated.timing(rotateAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, [impact]);

  const getColor = () => {
    switch (impact) {
      case 'positive': return { main: '#00d4aa', glow: 'rgba(0,212,170,0.5)', badge: '#00d4aa', bg: 'rgba(0,212,170,0.15)', gradient: ['#00d4aa', '#00b894'] };
      case 'negative': return { main: '#ff4757', glow: 'rgba(255,71,87,0.5)', badge: '#ff4757', bg: 'rgba(255,71,87,0.15)', gradient: ['#ff4757', '#ff6b81'] };
      default: return { main: '#ffc107', glow: 'rgba(255,193,7,0.5)', badge: '#ffc107', bg: 'rgba(255,193,7,0.15)', gradient: ['#ffc107', '#ffca28'] };
    }
  };

  const getStatusText = () => {
    switch (impact) {
      case 'positive': return 'Kidneys Love This!';
      case 'negative': return 'Kidneys Stressed';
      default: return 'Moderate Impact';
    }
  };

  const getBadgeText = () => {
    switch (impact) {
      case 'positive': return '✓ Kidney Friendly';
      case 'negative': return '✗ Strain on Kidneys';
      default: return '~ Neutral';
    }
  };

  const getIcon = () => {
    switch (impact) {
      case 'positive': return '💚';
      case 'negative': return '⚠️';
      default: return '🫘';
    }
  };

  const colors = getColor();

  const Kidney3D = ({ side }: { side: 'left' | 'right' }) => (
    <View style={styles.kidney3dWrapper}>
      {/* Shadow */}
      <View style={[styles.kidneyShadow, { backgroundColor: colors.glow }]} />

      {/* Outer glow */}
      <Animated.View style={[styles.kidneyGlow, { backgroundColor: colors.glow, opacity: glowAnim }]} />

      {/* Main kidney body */}
      <Animated.View
        style={[
          styles.kidneyBody,
          {
            transform: [
              { rotateY: side === 'left' ? '15deg' : '-15deg' },
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        <LinearGradient colors={colors.gradient} style={styles.kidneyGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>

          {/* 3D depth layers */}
          <View style={styles.kidneyDepth1} />
          <View style={styles.kidneyDepth2} />

          {/* Inner cavity */}
          <View style={styles.kidneyCavity}>
            <View style={styles.kidneyCavityInner} />
          </View>

          {/* Highlight shine */}
          <View style={styles.kidneyShine1} />
          <View style={styles.kidneyShine2} />
          <View style={styles.kidneyShine3} />

          {/* Texture dots */}
          <View style={[styles.kidneyDot, { top: '20%', left: '15%' }]} />
          <View style={[styles.kidneyDot, { top: '35%', left: '70%' }]} />
          <View style={[styles.kidneyDot, { top: '65%', left: '25%' }]} />
          <View style={[styles.kidneyDot, { top: '80%', left: '60%' }]} />
          <View style={[styles.kidneyDot, { top: '50%', left: '45%' }]} />

          {/* Border highlight */}
          <View style={styles.kidneyBorder} />
        </LinearGradient>
      </Animated.View>

      {/* Label */}
      <Text style={styles.kidneyLabel}>{side === 'left' ? 'Left Kidney' : 'Right Kidney'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🫘 Kidney Health Impact</Text>

      <Animated.View style={[styles.scene, { transform: [{ translateY: floatAnim }, { rotateZ: rotateAnim }] }]}>
        <View style={styles.kidneysRow}>
          <Kidney3D side="left" />

          <View style={styles.centerCol}>
            {/* Blood vessels */}
            <View style={styles.veinsContainer}>
              <View style={[styles.vein, styles.veinMain]} />
              <View style={[styles.vein, styles.veinLeft]} />
              <View style={[styles.vein, styles.veinRight]} />
              <View style={styles.veinJunction} />
            </View>

            {/* Center status */}
            <Animated.View style={[styles.centerStatus, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.centerIcon}>{getIcon()}</Text>
            </Animated.View>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          <Kidney3D side="right" />
        </View>
      </Animated.View>

      {/* Tip card */}
      <View style={[styles.tipCard, { borderLeftColor: colors.main }]}>
        <View style={[styles.tipIconBg, { backgroundColor: colors.bg }]}>
          <Text style={styles.tipIcon}>💡</Text>
        </View>
        <Text style={styles.tipText}>{tip}</Text>
      </View>

      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.main }]}>
        <Text style={[styles.badgeText, { color: colors.badge }]}>{getBadgeText()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    padding: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  title: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  scene: {
    alignItems: 'center',
    marginBottom: 16,
  },
  kidneysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  kidney3dWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  kidneyShadow: {
    position: 'absolute',
    bottom: -8,
    width: 60,
    height: 15,
    borderRadius: 50,
    blurRadius: 10,
    opacity: 0.5,
  },
  kidneyGlow: {
    position: 'absolute',
    width: 90,
    height: 120,
    borderRadius: 45,
    top: -5,
    opacity: 0.3,
  },
  kidneyBody: {
    width: 75,
    height: 100,
    borderRadius: 38,
    overflow: 'hidden',
  },
  kidneyGradient: {
    flex: 1,
    borderRadius: 38,
    position: 'relative',
  },
  kidneyDepth1: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 33,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  kidneyDepth2: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  kidneyCavity: {
    position: 'absolute',
    top: '30%',
    left: '30%',
    width: '40%',
    height: '40%',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kidneyCavityInner: {
    width: '60%',
    height: '60%',
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  kidneyShine1: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: '35%',
    height: '15%',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '-20deg' }],
  },
  kidneyShine2: {
    position: 'absolute',
    top: '22%',
    left: '20%',
    width: '20%',
    height: '8%',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  kidneyShine3: {
    position: 'absolute',
    bottom: '20%',
    right: '15%',
    width: '15%',
    height: '6%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  kidneyDot: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  kidneyBorder: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  kidneyLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerCol: {
    alignItems: 'center',
    flex: 0.7,
  },
  veinsContainer: {
    width: 50,
    height: 80,
    position: 'relative',
    marginBottom: 8,
  },
  vein: {
    position: 'absolute',
    backgroundColor: '#c0392b',
    borderRadius: 2,
  },
  veinMain: { width: 4, height: 70, left: '50%', top: 5, marginLeft: -2, backgroundColor: '#e74c3c' },
  veinLeft: { width: 3, height: 35, left: '25%', top: 25, transform: [{ rotate: '-20deg' }], backgroundColor: '#e74c3c' },
  veinRight: { width: 3, height: 35, right: '25%', top: 25, transform: [{ rotate: '20deg' }], backgroundColor: '#e74c3c' },
  veinJunction: { position: 'absolute', top: 22, left: '50%', width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: '#c0392b' },
  centerStatus: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  centerIcon: { fontSize: 24 },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  tipIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipIcon: { fontSize: 14 },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
