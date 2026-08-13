import { router } from 'expo-router';
import { Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>About</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.founderCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>SA</Text>
          </View>
          <Text style={styles.founderName}>Samuel Amankwah Arhin</Text>
          <Text style={styles.founderTitle}>Founder & CEO</Text>
          <Text style={styles.founderBio}>
            Visionary entrepreneur passionate about leveraging technology to help people
            make healthier food choices. Created Scal AI to make nutrition tracking
            accessible to everyone.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            To empower individuals worldwide to make informed dietary decisions through
            AI-powered food analysis, promoting healthier lifestyles and better well-being.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Vision</Text>
          <Text style={styles.sectionText}>
            To become the world's most trusted food scanning platform, revolutionizing
            how people understand and track their nutrition.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureList}>
            <Text style={styles.feature}>📷 AI-Powered Food Scanning</Text>
            <Text style={styles.feature}>🔥 Calorie Tracking</Text>
            <Text style={styles.feature}>💪 Protein & Fat Analysis</Text>
            <Text style={styles.feature}>⏱️ Digestion Time Info</Text>
            <Text style={styles.feature}>📊 History & Statistics</Text>
            <Text style={styles.feature}>🔒 Secure Authentication</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => Linking.openURL('mailto:support@scalai.app')}
          >
            <Text style={styles.contactText}>📧 support@scalai.app</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Version 1.0.8</Text>
        <Text style={styles.copyright}>© 2026 Scal AI. All rights reserved.</Text>

        {/* Hidden admin access - tap version number 5 times */}
        <TouchableOpacity
          style={styles.adminAccess}
          onPress={() => {
            // @ts-ignore
            global.adminTapCount = ((global.adminTapCount || 0) + 1);
            // @ts-ignore
            if (global.adminTapCount >= 5) {
              // @ts-ignore
              global.adminTapCount = 0;
              router.push('/admin');
            }
          }}
        >
          <Text style={styles.adminAccessText}>v1.0.8</Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  founderCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.black,
  },
  founderName: {
    fontSize: FontSize.xlarge,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
  },
  founderTitle: {
    fontSize: FontSize.medium,
    color: Colors.gold,
    marginBottom: Spacing.md,
  },
  founderBio: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.large,
    color: Colors.gold,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  sectionText: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    lineHeight: 24,
  },
  featureList: {
    gap: Spacing.sm,
  },
  feature: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    paddingVertical: Spacing.xs,
  },
  contactButton: {
    backgroundColor: Colors.cardBg,
    padding: Spacing.md,
    borderRadius: 12,
  },
  contactText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
  version: {
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  copyright: {
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  adminAccess: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    padding: Spacing.md,
  },
  adminAccessText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
  },
});
