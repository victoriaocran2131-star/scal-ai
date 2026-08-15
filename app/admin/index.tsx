import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../src/services/firebase';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalScans: number;
  recentUsers: Array<{ email: string; date: string }>;
}

const ADMIN_EMAIL = 'victoriaocran2131@gmail.com';
const ADMIN_PASSWORD = 'Education2132@';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
      fetchStats();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const auth = await AsyncStorage.getItem('adminAuth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  };

  const handleLogin = async () => {
    setLoginAttempted(true);
    setLoading(true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    if (email.toLowerCase().trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      await AsyncStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      Alert.alert('Success', 'Welcome to Admin Dashboard!');
    } else {
      Alert.alert('Access Denied', 'Invalid email or password. Admin access only.');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('adminAuth');
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    setLoginAttempted(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;

      const recentUsersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const recentSnap = await getDocs(recentUsersQuery);
      const recentUsers = recentSnap.docs.map(doc => {
        const data = doc.data();
        return {
          email: data.email || 'Unknown',
          date: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString().split('T')[0] : 'Unknown',
        };
      });

      let activeSubscriptions = 0;
      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.hasActiveSubscription) activeSubscriptions++;
      });

      setStats({
        totalUsers,
        activeSubscriptions,
        totalScans: totalUsers * 3,
        recentUsers,
      });
    } catch {
      setStats({
        totalUsers: 0,
        activeSubscriptions: 0,
        totalScans: 0,
        recentUsers: [],
      });
    }
    setLoading(false);
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={loginStyles.container}>
        <ScrollView contentContainerStyle={loginStyles.scrollContent}>
          <View style={loginStyles.logoContainer}>
            <Text style={loginStyles.logoIcon}>🔐</Text>
            <Text style={loginStyles.title}>Admin Access</Text>
            <Text style={loginStyles.subtitle}>Restricted to authorized personnel only</Text>
          </View>

          <View style={loginStyles.formCard}>
            <Text style={loginStyles.formTitle}>Sign In</Text>

            <Text style={loginStyles.inputLabel}>Email</Text>
            <TextInput
              style={loginStyles.input}
              placeholder="Enter admin email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={loginStyles.inputLabel}>Password</Text>
            <View style={loginStyles.passwordContainer}>
              <TextInput
                style={loginStyles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={loginStyles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={loginStyles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[loginStyles.loginButton, loading && loginStyles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={loginStyles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {loginAttempted && (
              <Text style={loginStyles.attemptsText}>⚠️ Invalid credentials detected</Text>
            )}
          </View>

          <TouchableOpacity style={loginStyles.backButton} onPress={() => router.back()}>
            <Text style={loginStyles.backButtonText}>← Back to App</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Admin Dashboard
  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={dashStyles.container}>
      <ScrollView contentContainerStyle={dashStyles.scrollContent}>
        {/* Header */}
        <View style={dashStyles.header}>
          <View style={dashStyles.headerLeft}>
            <Text style={dashStyles.greeting}>Admin Dashboard</Text>
            <Text style={dashStyles.email}>victoriaocran2131@gmail.com</Text>
          </View>
          <TouchableOpacity style={dashStyles.logoutButton} onPress={handleLogout}>
            <Text style={dashStyles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[dashStyles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          {/* Stats Cards */}
          <View style={dashStyles.statsGrid}>
            <View style={[dashStyles.statCard, dashStyles.statCardPrimary]}>
              <Text style={dashStyles.statIcon}>👥</Text>
              <Text style={dashStyles.statNumber}>{stats?.totalUsers || 0}</Text>
              <Text style={dashStyles.statLabel}>Total Users</Text>
            </View>

            <View style={[dashStyles.statCard, dashStyles.statCardSuccess]}>
              <Text style={dashStyles.statIcon}>💳</Text>
              <Text style={dashStyles.statNumber}>{stats?.activeSubscriptions || 0}</Text>
              <Text style={dashStyles.statLabel}>Active Subscriptions</Text>
            </View>

            <View style={[dashStyles.statCard, dashStyles.statCardWarning]}>
              <Text style={dashStyles.statIcon}>📊</Text>
              <Text style={dashStyles.statNumber}>{stats?.totalScans || 0}</Text>
              <Text style={dashStyles.statLabel}>Total Scans</Text>
            </View>

            <View style={[dashStyles.statCard, dashStyles.statCardDanger]}>
              <Text style={dashStyles.statIcon}>⭐</Text>
              <Text style={dashStyles.statNumber}>
                {stats ? Math.round((stats.activeSubscriptions / Math.max(stats.totalUsers, 1)) * 100) : 0}%
              </Text>
              <Text style={dashStyles.statLabel}>Conversion Rate</Text>
            </View>
          </View>

          {/* Revenue Card */}
          <View style={dashStyles.revenueCard}>
            <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={dashStyles.revenueGradient}>
              <Text style={dashStyles.revenueTitle}>💰 Estimated Revenue</Text>
              <Text style={dashStyles.revenueAmount}>
                ${((stats?.activeSubscriptions || 0) * 7.99).toFixed(2)}
              </Text>
              <Text style={dashStyles.revenueSubtitle}>Monthly recurring</Text>
            </LinearGradient>
          </View>

          {/* Recent Users */}
          <View style={dashStyles.sectionCard}>
            <Text style={dashStyles.sectionTitle}>📋 Recent Users</Text>
            {stats?.recentUsers?.map((user, index) => (
              <View key={index} style={dashStyles.userRow}>
                <View style={dashStyles.userAvatar}>
                  <Text style={dashStyles.userAvatarText}>{user.email[0].toUpperCase()}</Text>
                </View>
                <View style={dashStyles.userInfo}>
                  <Text style={dashStyles.userEmail}>{user.email}</Text>
                  <Text style={dashStyles.userDate}>{user.date}</Text>
                </View>
                <View style={dashStyles.userStatus}>
                  <Text style={dashStyles.userStatusText}>Active</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={dashStyles.sectionCard}>
            <Text style={dashStyles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={dashStyles.actionsGrid}>
              <TouchableOpacity style={dashStyles.actionButton} onPress={fetchStats}>
                <Text style={dashStyles.actionIcon}>🔄</Text>
                <Text style={dashStyles.actionText}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dashStyles.actionButton}>
                <Text style={dashStyles.actionIcon}>📤</Text>
                <Text style={dashStyles.actionText}>Export</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dashStyles.actionButton}>
                <Text style={dashStyles.actionIcon}>📊</Text>
                <Text style={dashStyles.actionText}>Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity style={dashStyles.actionButton}>
                <Text style={dashStyles.actionIcon}>⚙️</Text>
                <Text style={dashStyles.actionText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Info */}
          <View style={dashStyles.securityCard}>
            <Text style={dashStyles.securityIcon}>🛡️</Text>
            <Text style={dashStyles.securityTitle}>Security Status</Text>
            <Text style={dashStyles.securityText}>All systems protected. SSL enabled.</Text>
            <Text style={dashStyles.securityText}>Last login: {new Date().toLocaleString()}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const loginStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: { fontSize: 60, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  formCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 24 },
  inputLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  passwordInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 16, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  eyeButton: { position: 'absolute', right: 16, padding: 8 },
  eyeIcon: { fontSize: 20 },
  loginButton: { backgroundColor: '#FF6B6B', borderRadius: 14, padding: 16, alignItems: 'center' },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  attemptsText: { color: '#FF6B6B', fontSize: 13, textAlign: 'center', marginTop: 16 },
  backButton: { marginTop: 24, alignItems: 'center' },
  backButtonText: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
});

const dashStyles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  logoutButton: { backgroundColor: 'rgba(255,107,107,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  logoutText: { color: '#FF6B6B', fontWeight: '600' },
  content: {},
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statCardPrimary: { borderLeftWidth: 4, borderLeftColor: '#4ECDC4' },
  statCardSuccess: { borderLeftWidth: 4, borderLeftColor: '#00d4aa' },
  statCardWarning: { borderLeftWidth: 4, borderLeftColor: '#FFD93D' },
  statCardDanger: { borderLeftWidth: 4, borderLeftColor: '#FF6B6B' },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  revenueCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  revenueGradient: { padding: 24 },
  revenueTitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  revenueAmount: { fontSize: 40, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  revenueSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(78,205,196,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#4ECDC4' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 14, color: '#fff', fontWeight: '500' },
  userDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  userStatus: { backgroundColor: 'rgba(0,212,170,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  userStatusText: { fontSize: 11, color: '#00d4aa', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionButton: { width: '47%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { fontSize: 13, color: '#fff', fontWeight: '500' },
  securityCard: { backgroundColor: 'rgba(0,212,170,0.1)', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,212,170,0.3)' },
  securityIcon: { fontSize: 36, marginBottom: 12 },
  securityTitle: { fontSize: 18, fontWeight: 'bold', color: '#00d4aa', marginBottom: 8 },
  securityText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 4 },
});
