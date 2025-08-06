import React, { useState, useEffect } from 'react';
import { 
    Alert, 
    Text, 
    View, 
    StyleSheet, 
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Linking,
    Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import PAGES from '../constants/pages';
import { processCardImage } from '../helper/cardOCR';
import { securityAudit } from '../helper/securityUtils';

function CardScan() {
    const navigation = useNavigation();
    
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const [error, setError] = useState(null);
    const [hasGalleryPermission, setHasGalleryPermission] = useState(null);

    // Check permissions on component mount
    useEffect(() => {
        checkGalleryPermission();
    }, []);

    const checkGalleryPermission = async () => {
        try {
            const permissionResult = await ImagePicker.getMediaLibraryPermissionsAsync();
            setHasGalleryPermission(permissionResult.granted);
            
            if (permissionResult.granted) {
                securityAudit.logSecurityEvent('gallery_permission_granted');
            } else {
                securityAudit.logSecurityEvent('gallery_permission_denied');
            }
        } catch (error) {
            console.error('Error checking gallery permission:', error);
            setHasGalleryPermission(false);
        }
    };

    const requestGalleryPermission = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            setHasGalleryPermission(permissionResult.granted);
            
            if (permissionResult.granted) {
                securityAudit.logSecurityEvent('gallery_permission_granted');
                return true;
            } else {
                securityAudit.logSecurityEvent('gallery_permission_denied');
                showPermissionDeniedAlert();
                return false;
            }
        } catch (error) {
            console.error('Error requesting gallery permission:', error);
            setHasGalleryPermission(false);
            showPermissionDeniedAlert();
            return false;
        }
    };

    const showPermissionDeniedAlert = () => {
        Alert.alert(
            'Permission Required',
            'To import card images from your gallery, we need access to your photo library. Please enable this permission in your device settings.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Open Settings',
                    onPress: openSettings,
                },
            ]
        );
    };

    const openSettings = () => {
        if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
        } else {
            Linking.openSettings();
        }
    };

    const pickImage = async () => {
        try {
            // Check if we have permission first
            if (hasGalleryPermission === false) {
                const granted = await requestGalleryPermission();
                if (!granted) {
                    return;
                }
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!pickerResult.canceled && pickerResult.assets[0]) {
                const selectedImageUri = pickerResult.assets[0].uri;
                
                setIsProcessing(true);
                setProcessingStatus('Processing image...');
                setError(null);
                
                try {
                    const cardData = await processCardImage(selectedImageUri);
                    
                    if (cardData) {
                        setProcessingStatus('Card detected! Navigating to form...');
                        
                        // Log successful import
                        securityAudit.logCardOperation('import', true, cardData.type);
                        
                        setTimeout(() => {
                            navigation.navigate(PAGES.ADD_CARD, { item: cardData });
                        }, 1000);
                    } else {
                        throw new Error('No valid card data found');
                    }
                    
                } catch (error) {
                    console.error('Error processing image:', error);
                    setProcessingStatus('');
                    setError('Unable to detect card information from the selected image. Please try a different image or add the card manually.');
                    
                    // Log failed import
                    securityAudit.logCardOperation('import', false);
                    
                    Alert.alert(
                        'Processing Failed', 
                        'Unable to detect card information from the selected image. Please try a different image or add the card manually.',
                        [
                            { text: 'Try Again', onPress: () => setIsProcessing(false) },
                            { text: 'Add Manually', onPress: () => {
                                setIsProcessing(false);
                                navigation.navigate(PAGES.ADD_CARD);
                            }}
                        ]
                    );
                } finally {
                    setIsProcessing(false);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            setError('Failed to access image gallery');
            setIsProcessing(false);
        }
    };

    const handleManualAdd = () => {
        navigation.navigate(PAGES.ADD_CARD);
    };

    const handleBack = () => {
        navigation.goBack();
    };

    const handleSettings = () => {
        navigation.navigate(PAGES.SETTINGS_NAVIGATOR);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Card</Text>
                <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="card" size={80} color="#007AFF" />
                </View>
                
                <Text style={styles.title}>Add Your Card</Text>
                <Text style={styles.subtitle}>
                    Choose how you'd like to add your card information
                </Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    <TouchableOpacity 
                        style={[styles.optionButton, isProcessing && styles.optionButtonDisabled]} 
                        onPress={pickImage}
                        disabled={isProcessing}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="images" size={32} color="#007AFF" />
                        </View>
                        <Text style={styles.optionTitle}>Import from Gallery</Text>
                        <Text style={styles.optionSubtitle}>
                            Select a photo of your card to automatically extract information
                        </Text>
                        {hasGalleryPermission === false && (
                            <View style={styles.permissionWarning}>
                                <Ionicons name="warning" size={16} color="#FF9500" />
                                <Text style={styles.permissionWarningText}>
                                    Permission required
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.optionButton, isProcessing && styles.optionButtonDisabled]} 
                        onPress={handleManualAdd}
                        disabled={isProcessing}
                    >
                        <View style={styles.optionIcon}>
                            <Ionicons name="create" size={32} color="#007AFF" />
                        </View>
                        <Text style={styles.optionTitle}>Enter Manually</Text>
                        <Text style={styles.optionSubtitle}>
                            Type in your card details manually
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Permission Status */}
                {hasGalleryPermission === false && (
                    <View style={styles.permissionContainer}>
                        <Ionicons name="information-circle" size={20} color="#007AFF" />
                        <Text style={styles.permissionText}>
                            Gallery access is required to import card images. Tap "Import from Gallery" to grant permission.
                        </Text>
                    </View>
                )}

                {/* Processing Status */}
                {isProcessing && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.processingText}>{processingStatus}</Text>
                    </View>
                )}

                {/* Error Display */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="warning" size={20} color="#FF9500" />
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#8E8E93',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    optionsContainer: {
        gap: 20,
    },
    optionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    optionButtonDisabled: {
        opacity: 0.5,
    },
    optionIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'white',
        marginBottom: 8,
    },
    optionSubtitle: {
        fontSize: 14,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 20,
    },
    permissionWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    permissionWarningText: {
        color: '#FF9500',
        fontSize: 12,
        marginLeft: 6,
        fontWeight: '500',
    },
    permissionContainer: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 122, 255, 0.3)',
    },
    permissionText: {
        color: '#007AFF',
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    processingContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    processingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 12,
        textAlign: 'center',
    },
    errorContainer: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 149, 0, 0.3)',
    },
    errorText: {
        color: '#FF9500',
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
    },
});

export default CardScan;

