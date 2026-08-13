import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, Animated, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleLocalNotification } from '../../services/notifications';
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
import { searchFood, getRandomFood } from '../../data/foodDatabase';
import KidneyDiagram from '../../components/KidneyDiagram';
import ScanResult3D from '../../components/ScanResult3D';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [todayLog, setTodayLog] = useState({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 50, fat: 65, carbs: 300 });
  const cameraRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Keyboard.dismiss();
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
        Alert.alert('Subscription Required', 'You need an active subscription to scan food.', [
          { text: 'Subscribe', onPress: () => router.push('/subscription') },
        ]);
      }
    } catch (error) {
      const localSub = await AsyncStorage.getItem('hasActiveSubscription');
      if (localSub === 'true') {
        setHasSubscription(true);
      } else {
        setHasSubscription(false);
        router.push('/subscription');
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) { setSearchResults([]); setShowSuggestions(false); return; }
    const results = searchFood(query);
    setSearchResults(results);
    setShowSuggestions(results.length > 0);
  };

  const selectSearchResult = (food: any) => {
    setResult(food);
    setSearchQuery('');
    setSearchResults([]);
    setShowSuggestions(false);
    autoSaveToHistory(food);
    loadTodayLog();
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
      scheduleLocalNotification('Scan Complete!', `Found: ${food.name} - ${food.calories} kcal`, { foodName: food.name, calories: food.calories });
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

  if (!permission) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={Colors.gold} /><Text style={styles.loadingText}>Checking subscription...</Text></View>);
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

      <View style={styles.searchContainer}>
        <TextInput style={styles.searchInput} placeholder="🔍 Search food manually..." placeholderTextColor="#666" value={searchQuery} onChangeText={handleSearch} onFocus={() => searchResults.length > 0 && setShowSuggestions(true)} />
        {showSuggestions && searchResults.length > 0 && (
          <View style={styles.suggestionsDropdown}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {searchResults.map((food, i) => (
                <TouchableOpacity key={i} style={styles.suggestionItem} onPress={() => selectSearchResult(food)}>
                  <Text style={styles.suggestionName}>{food.name.charAt(0).toUpperCase() + food.name.slice(1)}</Text>
                  <Text style={styles.suggestionCal}>{food.calories} cal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
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
        <ScrollView style={styles.resultContainer} contentContainerStyle={styles.resultContent}>
          <ScanResult3D food={result} />
          <KidneyDiagram impact={result.kidneyImpact} tip={result.kidneyTip} />
          <TouchableOpacity style={styles.retakeButton} onPress={retake}><Text style={styles.retakeText}>Scan Again</Text></TouchableOpacity>
        </ScrollView>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    zIndex: 10,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.white,
    fontSize: FontSize.medium,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 44,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: '#222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    zIndex: 100,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  suggestionName: { color: Colors.white, fontSize: FontSize.medium },
  suggestionCal: { color: Colors.gold, fontSize: FontSize.small },
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
    flex: 1,
  },
  resultContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  retakeButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
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
});
