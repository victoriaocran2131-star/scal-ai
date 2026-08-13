import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../constants/theme';

const bibleVerses = [
  { text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.', reference: 'Jeremiah 29:11' },
  { text: 'Trust in the Lord with all your heart and lean not on your own understanding.', reference: 'Proverbs 3:5' },
  { text: 'I can do all things through Christ who strengthens me.', reference: 'Philippians 4:13' },
  { text: 'The Lord is my shepherd; I shall not want.', reference: 'Psalm 23:1' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged.', reference: 'Joshua 1:9' },
  { text: 'And we know that in all things God works for the good of those who love him.', reference: 'Romans 8:28' },
  { text: 'Commit your works to the Lord, and your thoughts will be established.', reference: 'Proverbs 16:3' },
  { text: 'But those who hope in the Lord will renew their strength.', reference: 'Isaiah 40:31' },
  { text: 'The Lord will fight for you; you need only to be still.', reference: 'Exodus 14:14' },
  { text: 'And my God will meet all your needs according to the riches of his glory.', reference: 'Philippians 4:19' },
  { text: 'Give thanks to the Lord, for he is good; his love endures forever.', reference: 'Psalm 107:1' },
  { text: 'The joy of the Lord is your strength.', reference: 'Nehemiah 8:10' },
  { text: 'He gives strength to the weary and increases the power of the weak.', reference: 'Isaiah 40:29' },
  { text: 'Come to me, all you who are weary and burdened, and I will give you rest.', reference: 'Matthew 11:28' },
  { text: 'For God gave us a spirit not of fear but of power and love and self-control.', reference: '2 Timothy 1:7' },
  { text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.', reference: 'Psalm 34:18' },
  { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.', reference: 'Philippians 4:6' },
  { text: 'I have loved you with an everlasting love; I have drawn you with unfailing kindness.', reference: 'Jeremiah 31:3' },
  { text: 'The Lord is my light and my salvation—whom shall I fear?', reference: 'Psalm 27:1' },
  { text: 'No weapon forged against you will prevail.', reference: 'Isaiah 54:17' },
];

export default function WelcomeScreen() {
  const [verse, setVerse] = useState(bibleVerses[0]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * bibleVerses.length);
    setVerse(bibleVerses[randomIndex]);
  }, []);

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200' }}
      style={styles.background}
      blurRadius={5}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
