import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleLocalNotification } from '../../services/notifications';
import { security } from '../../services/security';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../constants/theme';
import { api } from '../../services/api';
import { getRandomFood } from '../../data/foodDatabase';
import KidneyDiagram from '../../components/KidneyDiagram';
import ScanResult3D from '../../components/ScanResult3D';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [todayLog, setTodayLog] = useState({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 50, fat: 65, carbs: 300 });
  const cameraRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Keyboard.dismiss();
    checkSecurity();
    checkSubscription();
    loadGoals();
    loadTodayLog();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [permission]);

  const checkSecurity = async () => {
    if (__DEV__) return;
    const result = await security.checkDeviceIntegrity();
    if (!result.secure) {
      Alert.alert(
        'Security Warning',
        result.reason || 'This device cannot run this app.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  const checkSubscription = async () => {
    try {
      const result = await api.checkSubscription();
      const res = result as any;
      if (res.hasActiveSubscription) {
        setHasSubscription(true);
        await AsyncStorage.setItem('hasActiveSubscription', 'true');
        if (res.subscription?.daysRemaining <= 2) {
          Alert.alert(
            'Subscription Expiring',
            `Your ${res.subscription.plan} plan expires in ${res.subscription.daysRemaining} day(s). Renew to keep scanning.`,
            [
              { text: 'Renew Now', onPress: () => router.push('/subscription') },
              { text: 'Later' },
            ]
          );
        }
      } else {
        setHasSubscription(false);
        await AsyncStorage.removeItem('hasActiveSubscription');
      }
    } catch (error) {
      const localSub = await AsyncStorage.getItem('hasActiveSubscription');
      if (localSub === 'true') {
        setHasSubscription(true);
      } else {
        setHasSubscription(false);
      }
    }
  };

  const loadGoals = async () => {
    try {
      const data = await api.request('/api/goals');
      if (data && data.success && (data as any).goals) setGoals((data as any).goals);
    } catch (error) {}
  };

  const loadTodayLog = async () => {
    try {
      const data = await api.request('/api/daily-logs/today');
      if (data && data.success && (data as any).log) setTodayLog((data as any).log);
    } catch (error) {}
  };

  const simulateScan = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      const food = getRandomFood();
      setResult(food);
      setScanning(false);
      autoSaveToHistory(food);
      loadTodayLog();
      scheduleLocalNotification('Scan Complete!', `${food.calories} kcal detected`, { foodName: food.name, calories: food.calories });
    }, 2000);
  };

  const autoSaveToHistory = async (food: any) => {
    await api.addHistory({ foodName: food.name, calories: food.calories, protein: food.protein, fat: food.fat, carbs: food.carbs, fiber: food.fiber, sugar: food.sugar, digestion: food.digestion });
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: false });
        setCapturedImage(photo.uri);
        simulateScan();
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    const pickResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!pickResult.canceled) { setCapturedImage(pickResult.assets[0].uri); simulateScan(); }
  };

  const retake = () => { setCapturedImage(null); setResult(null); };

  const getProgress = (current: number, target: number) => Math.min(current / target, 1);
  const getProgressColor = (p: number) => { if (p < 0.5) return '#4CAF50'; if (p < 0.8) return Colors.gold; return '#f44336'; };

  // SUBSCRIPTION WALL - no subscription = locked screen
  if (hasSubscription === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.wallContainer}>
          <Text style={styles.wallIcon}>🔒</Text>
          <Text style={styles.wallTitle}>Subscription Required</Text>
          <Text style={styles.wallText}>
            You need an active subscription to use Scal AI. Subscribe now to access food scanning, nutrition tracking, and more.
          </Text>
          <TouchableOpacity style={styles.wallButton} onPress={() => router.push('/subscription')}>
            <Text style={styles.wallButtonText}>View Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.wallSignIn} onPress={() => router.push('/signin')}>
            <Text style={styles.wallSignInText}>Sign In to Your Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={Colors.gold} /><Text style={styles.loadingText}>Loading...</Text></View>);
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>Scal AI needs camera access to scan food</Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}><Text style={styles.buttonText}>Grant Permission</Text></TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}><Text style={styles.uploadText}>Or upload an image</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ SCAL AI</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.push('/charts')} style={styles.headerBtn}><Text style={styles.headerBtnText}>📈</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/reminders')} style={styles.headerBtn}><Text style={styles.headerBtnText}>🔔</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/subscription')} style={styles.headerBtn}><Text style={styles.headerBtnText}>⭐</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/history')} style={styles.headerBtn}><Text style={styles.headerBtnText}>📊</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.headerBtn}><Text style={styles.headerBtnText}>👤</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/about')} style={styles.headerBtn}><Text style={styles.headerBtnText}>ℹ️</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.goalsBar}>
        {[
          { label: 'Cal', current: todayLog.totalCalories, target: goals.calories, unit: '' },
          { label: 'Prot', current: todayLog.totalProtein, target: goals.protein, unit: 'g' },
          { label: 'Fat', current: todayLog.totalFat, target: goals.fat, unit: 'g' },
          { label: 'Carbs', current: todayLog.totalCarbs, target: goals.carbs, unit: 'g' },
        ].map((item) => {
          const progress = getProgress(item.current, item.target);
          return (
            <View key={item.label} style={styles.goalItem}>
              <Text style={styles.goalLabel}>{item.label}</Text>
              <View style={styles.goalBarBg}>
                <View style={[styles.goalBarFill, { width: `${progress * 100}%`, backgroundColor: getProgressColor(progress) }]} />
              </View>
              <Text style={styles.goalValue}>{Math.round(item.current)}{item.unit}/{item.target}{item.unit}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity activeOpacity={1} style={styles.cameraContainer} onPress={() => Keyboard.dismiss()}>
        {capturedImage ? (
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
        ) : (
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.scanOverlay}>
              <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.scanText}>Point at food to scan</Text>
            </View>
          </CameraView>
        )}
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultContainer}>
          <ScanResult3D food={result} />
          <KidneyDiagram impact={result.kidneyImpact} tip={result.kidneyTip} />
          <TouchableOpacity style={styles.retakeButton} onPress={retake}><Text style={styles.retakeText}>Scan Again</Text></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.controls} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
          {scanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={styles.scanningText}>Analyzing food...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}><View style={styles.captureButtonInner} /></TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}><Text style={styles.uploadText}>📁 Upload Image</Text></TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.darkBg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkBg,
  },
  loadingText: {
    color: Colors.grayLight,
    fontSize: FontSize.medium,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize.xlarge,
    color: Colors.gold,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  headerBtnText: {
    fontSize: 20,
  },
  goalsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  goalItem: { flex: 1, alignItems: 'center' },
  goalLabel: { color: Colors.grayLight, fontSize: 10, marginBottom: 2 },
  goalBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 2 },
  goalValue: { color: Colors.grayLight, fontSize: 8, marginTop: 2 },
  cameraContainer: {
    flex: 1,
    margin: Spacing.md,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: Colors.gold,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: Colors.white,
    fontSize: FontSize.medium,
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  capturedImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  controls: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.white,
  },
  scanningContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  scanningText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
  uploadButton: {
    padding: Spacing.md,
  },
  uploadText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
  resultContainer: {
    maxHeight: '50%',
  },
  retakeButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginHorizontal: Spacing.xl,
  },
  retakeText: {
    color: Colors.black,
    fontSize: FontSize.large,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  permissionTitle: {
    fontSize: FontSize.xlarge,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  permissionText: {
    color: Colors.grayLight,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  button: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.black,
    fontSize: FontSize.large,
    fontWeight: 'bold',
  },
  wallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  wallIcon: {
    fontSize: 80,
    marginBottom: Spacing.xl,
  },
  wallTitle: {
    fontSize: FontSize.xxlarge,
    color: Colors.white,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  wallText: {
    fontSize: FontSize.medium,
    color: Colors.grayLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  wallButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  wallButtonText: {
    color: Colors.black,
    fontSize: FontSize.large,
    fontWeight: 'bold',
  },
  wallSignIn: {
    padding: Spacing.md,
  },
  wallSignInText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
});
