import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
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

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const simulateScan = () => {
    setScanning(true);
    setResult(null);

    setTimeout(() => {
      const food = getRandomFood();
      setResult(food);
      setScanning(false);
      autoSaveToHistory(food);
    }, 2000);
  };

  const autoSaveToHistory = async (food: any) => {
    await api.addHistory({
      foodName: food.name,
      calories: food.calories,
      protein: food.protein,
      fat: food.fat,
      digestion: food.digestion,
    });
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          base64: false,
        });
        setCapturedImage(photo.uri);
        simulateScan();
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      simulateScan();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setResult(null);
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Scal AI needs camera access to scan food
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadText}>Or upload an image</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ SCAL AI</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => router.push('/history')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/about')} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        {capturedImage ? (
          <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
        ) : (
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>Point at food to scan</Text>
            </View>
          </CameraView>
        )}
      </View>

      {result ? (
        <View style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Scan Result</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Calories</Text>
              <Text style={styles.resultValue}>{result.calories} kcal</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Protein</Text>
              <Text style={styles.resultValue}>{result.protein}g</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Fat</Text>
              <Text style={styles.resultValue}>{result.fat}g</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Digestion</Text>
              <Text style={styles.resultValue}>{result.digestion}</Text>
            </View>
            <Text style={styles.addedText}>✓ Added to your log</Text>
          </View>
          <TouchableOpacity style={styles.retakeButton} onPress={retake}>
            <Text style={styles.retakeText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.controls}>
          {scanning ? (
            <View style={styles.scanningContainer}>
              <ActivityIndicator size="large" color={Colors.gold} />
              <Text style={styles.scanningText}>Analyzing food...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <Text style={styles.uploadText}>📁 Upload Image</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    gap: Spacing.md,
  },
  headerBtn: {
    padding: Spacing.sm,
  },
  headerBtnText: {
    fontSize: 24,
  },
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
    padding: Spacing.xl,
  },
  resultCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: FontSize.xlarge,
    color: Colors.gold,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  resultLabel: {
    color: Colors.grayLight,
    fontSize: FontSize.medium,
  },
  resultValue: {
    color: Colors.white,
    fontSize: FontSize.medium,
    fontWeight: 'bold',
  },
  addedText: {
    color: Colors.success,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: FontSize.medium,
  },
  retakeButton: {
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
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
