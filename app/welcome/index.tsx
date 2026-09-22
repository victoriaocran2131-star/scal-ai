import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';

const motivationalQuotes = [
  { text: 'Take care of your body. It is the only place you have to live.', reference: 'Jim Rohn' },
  { text: 'The food you eat can be either the safest and most powerful form of medicine or the slowest form of poison.', reference: 'Ann Wigmore' },
  { text: 'Let food be thy medicine and medicine be thy food.', reference: 'Hippocrates' },
  { text: 'A healthy outside starts from the inside.', reference: 'Robert Urich' },
  { text: 'Your body hears everything your mind says.', reference: 'Naomi Judd' },
  { text: 'The first wealth is health.', reference: 'Ralph Waldo Emerson' },
  { text: 'Health is not valued till sickness comes.', reference: 'Thomas Fuller' },
  { text: 'To keep the body in good health is a duty, otherwise we shall not be able to keep the mind strong and clear.', reference: 'Buddha' },
  { text: 'He who has health has hope; and he who has hope has everything.', reference: 'Thomas Carlyle' },
  { text: 'Good health is not something we can buy. However, it can be an extremely valuable savings account.', reference: 'Anne Wilson Schaef' },
  { text: 'The greatest wealth is health.', reference: 'Virgil' },
  { text: 'A fit body, a calm mind, a house full of love. These things cannot be bought - they must be earned.', reference: 'Naval Ravikant' },
  { text: 'Health is a state of body. Wellness is a state of being.', reference: 'J. Stanford' },
  { text: 'Wellness is the complete integration of body, mind, and spirit.', reference: 'Greg Anderson' },
  { text: 'The human body is the best picture of the human soul.', reference: 'Ludwig Wittgenstein' },
  { text: 'When the body is weak, the mind is easily corrupted.', reference: 'Unknown' },
  { text: 'A healthy mind in a healthy body.', reference: 'Juvenal' },
  { text: 'Physical fitness is the first requisite of happiness.', reference: 'Joseph Pilates' },
  { text: 'Health and cheerfulness naturally beget each other.', reference: 'Joseph Addison' },
  { text: 'The secret of health for both mind and body is not to mourn for the past, worry about the future, or anticipate troubles, but to live in the present moment wisely and earnestly.', reference: 'Buddha' },
];

export default function WelcomeScreen() {
  const [verse, setVerse] = useState(motivationalQuotes[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setVerse(motivationalQuotes[randomIndex]);
  }, []);

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.background}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🍽️</Text>
            <Text style={styles.title}>SCAL AI</Text>
            <Text style={styles.subtitle}>Smart Food Scanner</Text>
          </View>

          <View style={styles.verseCard}>
            <Text style={styles.verseText}>"{verse.text}"</Text>
            <Text style={styles.verseReference}>— {verse.reference}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => router.push('/signup')}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => router.push('/signin')}
            >
              <Text style={styles.signInText}>Already have an account? Sign In</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.founder}>Founded by Samuel Amankwah Arhin</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.gold,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: FontSize.large,
    color: Colors.grayLight,
    marginTop: Spacing.sm,
  },
  verseCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.gold,
    maxWidth: 400,
  },
  verseText: {
    fontSize: FontSize.medium,
    color: Colors.white,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  verseReference: {
    fontSize: FontSize.small,
    color: Colors.gold,
    textAlign: 'right',
    marginTop: Spacing.md,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: Spacing.md,
  },
  getStartedButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  getStartedText: {
    color: Colors.black,
    fontSize: FontSize.large,
    fontWeight: 'bold',
  },
  signInButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  signInText: {
    color: Colors.grayLight,
    fontSize: FontSize.medium,
  },
  founder: {
    position: 'absolute',
    bottom: Spacing.xl,
    color: Colors.gray,
    fontSize: FontSize.small,
  },
});
