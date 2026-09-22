import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, Animated } from 'react-native';
import { scheduleLocalNotification } from '../../src/services/notifications';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSize, Spacing } from '../../src/constants/theme';
import { api } from '../../src/services/api';
import { searchFood } from '../../src/data/foodDatabase';
import { recognizeFood, setApiKey, isApiConfigured } from '../../src/services/foodRecognition';
import { searchUsdaFood, setUsdaApiKey } from '../../src/services/usda';
import ScanResult3D from '../../src/components/ScanResult3D';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [todayLog, setTodayLog] = useState({ totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0, totalFiber: 0, totalSugar: 0 });
  const [goals, setGoals] = useState({ calories: 2000, protein: 50, fat: 65, carbs: 300 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  const cameraRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Keyboard.dismiss();
    loadGoals();
    loadTodayLog();
    loadApiKey();

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  useEffect(() => {
    if (result && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  }, [result]);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      if (data && data.success && (data as any).goals) setGoals((data as any).goals);
    } catch (error) {
      // Goals will use defaults
    }
  };

  const loadTodayLog = async () => {
    try {
      const data = await api.getTodayLog();
      if (data && data.success && (data as any).log) setTodayLog((data as any).log);
    } catch (error) {
      // Today log will stay at zeros
    }
  };

  const loadApiKey = async () => {
    try {
      const key = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';
      if (key && key.length >= 20) {
        setApiKey(key);
        setApiConfigured(true);
      } else if (key) {
        Alert.alert('Invalid API Key', 'The Google Vision API key appears to be invalid. AI scanning may not work.');
      }
      const usdaKey = process.env.EXPO_PUBLIC_USDA_API_KEY || '';
      if (usdaKey) {
        setUsdaApiKey(usdaKey);
      }
    } catch (error) {
      // API keys will remain unconfigured
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = searchFood(query);
      if (results.length > 0) {
        setSearchResults(results);
      } else {
        const usdaResult = await searchUsdaFood(query);
        if (usdaResult) {
          setSearchResults([usdaResult]);
        } else {
          setSearchResults([]);
        }
      }
    } else {
      setSearchResults([]);
    }
  };

  const selectSearchResult = async (food: any) => {
    setResult(food);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    await autoSaveToHistory(food);
    await loadTodayLog();
    scheduleLocalNotification('Food Logged!', `${food.calories} kcal - ${food.name}`, { calories: food.calories });
  };

  const simulateScan = async (imageBase64?: string) => {
    setScanning(true);
    setResult(null);

    if (imageBase64 && isApiConfigured()) {
      const apiResult = await recognizeFood(imageBase64);

      if (apiResult.success && apiResult.food) {
        let food = apiResult.food;
        const usdaData = await searchUsdaFood(food.name);
        if (usdaData && usdaData.calories > 0) {
          food = usdaData;
        }
        setResult(food);
        setScanning(false);
        await autoSaveToHistory(food);
        await loadTodayLog();
        scheduleLocalNotification('Scan Complete!', `${food.calories} kcal detected`, { calories: food.calories });
        return;
      }

      Alert.alert(
        'Could not identify food',
        apiResult.error || 'Please try a clearer photo or search manually.',
        [
          { text: 'Search Manually', onPress: () => setShowSearch(true) },
          { text: 'Try Again', onPress: () => setScanning(false) },
        ]
      );
      setScanning(false);
      return;
    }

    if (imageBase64 && !isApiConfigured()) {
      Alert.alert(
        'AI Scanning Not Available',
        'Google Vision API key not configured. Please search manually or set up an API key in Settings.',
        [
          { text: 'Search Manually', onPress: () => setShowSearch(true) },
          { text: 'Cancel', onPress: () => setScanning(false) },
        ]
      );
      setScanning(false);
      return;
    }

    Alert.alert(
      'No Image',
      'Please take a photo or upload an image to scan.',
      [{ text: 'OK', onPress: () => setScanning(false) }]
    );
    setScanning(false);
  };

  const autoSaveToHistory = async (food: any) => {
    try {
      await api.addHistory({ 
        name: food.name || 'Unknown Food',
        calories: food.calories || 0, 
        protein: food.protein || 0, 
        fat: food.fat || 0, 
        carbs: food.carbs || 0, 
        fiber: food.fiber || 0, 
        sugar: food.sugar || 0, 
        digestion: food.digestion || '' 
      });
    } catch (e) {
      // History save failed silently - food was still scanned
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
        if (photo && photo.base64) {
          simulateScan(photo.base64);
        } else {
          Alert.alert('Error', 'Failed to capture image');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    const pickResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
    if (!pickResult.canceled) {
      simulateScan(pickResult.assets[0].base64 || undefined);
    }
  };

  const retake = () => {
    setResult(null);
  };

  const getProgress = (current: number, target: number) => Math.min(current / target, 1);
  const getProgressColor = (p: number) => { if (p < 0.5) return '#4CAF50'; if (p < 0.8) return Colors.gold; return '#f44336'; };

  if (!permission) {
    return (<View style={styles.centered}><ActivityIndicator size="large" color={Colors.gold} /><Text style={styles.loadingText}>Loading camera...</Text></View>);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ SCAL AI</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.push('/charts')} style={styles.headerBtn}><Text style={styles.headerBtnText}>📈</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/reminders')} style={styles.headerBtn}><Text style={styles.headerBtnText}>🔔</Text></TouchableOpacity>
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

      {!result && !scanning && (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.scanOverlay}>
              <Animated.View style={[styles.scanFrame, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.scanText}>Point at food to scan</Text>
            </View>
          </CameraView>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {scanning && (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
            <Text style={styles.scanningText}>Analyzing food...</Text>
          </View>
        )}

        {!result && !scanning && !showSearch && (
          <View style={styles.controls}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}><View style={styles.captureButtonInner} /></TouchableOpacity>
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}><Text style={styles.uploadText}>Upload Image</Text></TouchableOpacity>
            <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(true)}>
              <Text style={styles.searchButtonText}>Search Food Manually</Text>
            </TouchableOpacity>
            {!apiConfigured && (
              <Text style={styles.apiWarning}>AI scanning requires a Google Vision API key</Text>
            )}
          </View>
        )}

        {showSearch && !result && (
          <View style={styles.searchContainer}>
            <Text style={styles.searchTitle}>Search Food</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Type food name (e.g., apple, chicken, rice)"
              placeholderTextColor={Colors.grayLight}
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((food, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => selectSearchResult(food)}
                  >
                    <Text style={styles.searchResultName}>{food.name}</Text>
                    <Text style={styles.searchResultCalories}>{food.calories} kcal</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.cancelSearchButton} onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={styles.cancelSearchText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <ScanResult3D food={result} />
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Text style={styles.retakeText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: Spacing.sm,
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
    paddingBottom: Spacing.xs,
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
    height: 250,
    marginHorizontal: Spacing.md,
    borderRadius: 16,
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
    width: 140,
    height: 140,
    borderWidth: 3,
    borderColor: Colors.gold,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: Colors.white,
    fontSize: FontSize.small,
    marginTop: Spacing.sm,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  capturedImage: {
    flex: 1,
    resizeMode: 'contain',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  scanningContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  scanningText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
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
  uploadButton: {
    padding: Spacing.md,
  },
  uploadText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
  searchButton: {
    padding: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: FontSize.medium,
  },
  apiWarning: {
    color: '#ff9800',
    fontSize: FontSize.small,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  searchContainer: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  searchTitle: {
    color: Colors.white,
    fontSize: FontSize.large,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    color: Colors.white,
    fontSize: FontSize.medium,
  },
  searchResults: {
    maxHeight: 300,
    gap: Spacing.xs,
  },
  searchResultItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultName: {
    color: Colors.white,
    fontSize: FontSize.medium,
    textTransform: 'capitalize',
  },
  searchResultCalories: {
    color: Colors.gold,
    fontSize: FontSize.small,
  },
  cancelSearchButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  cancelSearchText: {
    color: Colors.grayLight,
    fontSize: FontSize.medium,
  },
  resultContainer: {
    paddingHorizontal: Spacing.xl,
  },
  retakeButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xxl,
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
  uploadButtonText: {
    color: Colors.gold,
    fontSize: FontSize.medium,
  },
});
