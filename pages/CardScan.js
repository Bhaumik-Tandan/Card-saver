import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Alert, Pressable, Text, View, StyleSheet, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import TextRecognition from 'react-native-text-recognition';
import { Camera } from 'expo-camera';
import PAGES from '../constants/pages';

function CardScan() {
  const camera = useRef(null);

  const [isCameraActive, setIsCameraActive] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to use the camera.');
      return;
    }
    setIsCameraActive(true);
  };

  useEffect(() => {
    requestCameraPermission(); // Request camera permission when the component loads
  }, []);

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Access to media library is required for image selection.');
    }
  };


  const recognizeText = async (imageUri) => {
    try {
      const result = await TextRecognition.recognize(imageUri);
      navigator.navigate(PAGES.ADD_CARD, { ocrResult: result });
    } catch (error) {
      console.error('Text recognition error:', error);
      Alert.alert('Text Recognition Error', 'An error occurred during text recognition.');
    }
  };

  const captureAndRecognize = useCallback(async () => {
    try {
      if (camera.current) {
        const { uri } = await camera.current.takePictureAsync({
          quality: 1, // Adjust quality as needed
        });
        recognizeText(uri);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      Alert.alert('Capture Error', 'An error occurred while capturing the photo.');
    }
  }, []);

  const pickImage = async () => {
    requestMediaLibraryPermission();

    const pickerResult = await ImagePicker.launchImageLibraryAsync();

    if (pickerResult.cancelled === true) {
      return;
    }

    const selectedImageUri = pickerResult.assets[0].uri;

    recognizeText(selectedImageUri);
  };

  return (
    <View style={styles.container}>

      <Pressable style={styles.imagePickerButton} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick from Gallery</Text>
      </Pressable>

      {isCameraActive && (
        <Camera
          photo
          enableHighQualityPhotos
          ref={camera}
          style={styles.camera}
        />
      )}

<Pressable style={styles.captureButton} onPress={captureAndRecognize} disabled={isCameraActive}>
        <Text style={styles.buttonText}>Take Picture</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  imagePickerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  captureButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 100, // Make it round
    width: 100, // Adjust the width as needed
    height: 100, // Adjust the height as needed
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
  camera: {
    width: 360,
    height: 240,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 12,
  },
  resultContainer: {
    marginTop: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
  },
  resultLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

export default CardScan;
