import * as CardValidator from 'card-validator';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-root-toast';

import Card from '../components/card';
import PAGES from '../constants/pages';
import { CARDS } from '../constants/string';
import { useAuth } from '../context/AuthContext';
import { encryptData } from '../helper/encryption';
import { getLocalStoreData, setLocalStoreData } from '../helper/localStorage';
import { inputValidation, securityAudit, secureErrorHandler } from '../helper/securityUtils';
import getEncryptionKey from '../util/getEncryptionKey';

function AddCardModal({ navigation, route }) {
    const item = route?.params?.item;
    useEffect(() => {
        if (item) {
            setCard(item);
            // Log card editing if it's a scanned card
            if (item.nickname && item.nickname.includes('Scanned')) {
                securityAudit.logCardOperation('edit_scanned', true, item.type);
            }
        }
    }, [item]);

    const [card, setCard] = useState({
        nickname: '',
        card_number: '',
        expiry: '',
        cvv: '',
        color: 'black',
        type: '',
        name_on_card: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});

    const { cards, setCards } = useAuth();
    
    const hideModal = () => {
        navigation.navigate(PAGES.CARD_LIST);
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate nickname
        if (!card.nickname.trim()) {
            newErrors.nickname = 'Card nickname is required';
        } else if (card.nickname.length < 2) {
            newErrors.nickname = 'Nickname must be at least 2 characters';
        }

        // Validate card number
        const cardNumberValidation = inputValidation.validateCardNumber(card.card_number);
        if (!cardNumberValidation.isValid) {
            newErrors.card_number = cardNumberValidation.error;
        }

        // Validate expiry date
        const expiryValidation = inputValidation.validateExpiryDate(card.expiry);
        if (!expiryValidation.isValid) {
            newErrors.expiry = expiryValidation.error;
        }

        // Validate CVV
        const cvvValidation = inputValidation.validateCVV(card.cvv, card.type);
        if (!cvvValidation.isValid) {
            newErrors.cvv = cvvValidation.error;
        }

        // Validate cardholder name
        if (!card.name_on_card.trim()) {
            newErrors.name_on_card = 'Cardholder name is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleEditCard = async () => {
        if (!validateForm()) {
            Toast.show('Please fix the errors before saving', {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
            });
            return;
        }

        setIsSubmitting(true);
        const editedCard = card;
        const index = item.index;
        
        try {
            // Check if the card already exists
            if (!cards || index < 0 || index >= cards.length) {
                throw new Error('Invalid index or card does not exist');
            }

            const encryptionKey = await getEncryptionKey();
            const encryptedCard = encryptCard(editedCard, encryptionKey);
            const encryptCards = await getLocalStoreData(CARDS);

            encryptCards[index] = encryptedCard;
            await updateCardStorage(encryptCards);

            const updatedCards = [...cards];
            updatedCards[index] = { ...editedCard };

            setCards(updatedCards);
            
            // Log successful edit
            securityAudit.logCardOperation('edit', true, editedCard.type);
            
            Toast.show('Card updated successfully', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });
            
            navigation.navigate(PAGES.CARD_LIST);
        } catch (error) {
            const userMessage = secureErrorHandler.handleError(error, 'edit_card');
            Toast.show(userMessage, {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
            });
            
            // Log failed edit
            securityAudit.logCardOperation('edit', false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const cardExists = (newCard) => {
        return cards.some((card) => card.card_number === newCard.card_number);
    };

    const encryptCard = (newCard, encryptionKey) => {
        return encryptData(JSON.stringify(newCard), encryptionKey);
    };

    const initializeCardStorage = async (newCards) => {
        await setLocalStoreData(CARDS, newCards);
    };

    const updateCardStorage = async (newCards) => {
        await setLocalStoreData(CARDS, newCards);
    };

    const updateCards = (newCard) => {
        setCards((prev) => [{ index: prev.length, ...newCard }, ...prev]);
    };

    const onAddCard = async (newCard) => {
        try {
            // Check if the card already exists
            if (cardExists(newCard)) {
                Toast.show('Card already exists', {
                    duration: Toast.durations.LONG,
                    position: Toast.positions.BOTTOM,
                });
                return false;
            }

            const encryptionKey = await getEncryptionKey();
            const encryptedCard = encryptCard(newCard, encryptionKey);
            const savedCards = await getLocalStoreData(CARDS);

            if (!savedCards || savedCards.length === 0) {
                await initializeCardStorage([encryptedCard]);
            } else {
                await updateCardStorage([...savedCards, encryptedCard]);
            }

            updateCards(newCard);
            
            // Log successful addition
            securityAudit.logCardOperation('add', true, newCard.type);
            
            Toast.show('Card added successfully', {
                duration: Toast.durations.SHORT,
                position: Toast.positions.BOTTOM,
            });
            
            return true;
        } catch (error) {
            const userMessage = secureErrorHandler.handleError(error, 'add_card');
            Toast.show(userMessage, {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
            });
            
            // Log failed addition
            securityAudit.logCardOperation('add', false);
            return false;
        }
    };

    const formatCardNumber = (input) => {
        const formattedInput = input
            .replace(/\s/g, '')
            .replace(/(\d{4})/g, '$1 ')
            .trim();

        // Validate the card number in real-time
        const cardNumberValidation = CardValidator.number(formattedInput);
        setValidationErrors(prev => ({
            ...prev,
            card_number: cardNumberValidation.isValid ? null : 'Invalid card number'
        }));

        // Update card type based on the validation result
        let cardType = cardNumberValidation.card
            ? cardNumberValidation.card.type
            : '';

        // Manually check for Discover card based on BIN range
        const discoverBINPattern = /^6(?:011|5[0-9]{2})/;
        if (discoverBINPattern.test(formattedInput)) {
            cardType = 'discover';
        }

        // Manually check for Rupay card based on BIN range
        const rupayBINPattern = /^65/;
        if (rupayBINPattern.test(formattedInput)) {
            cardType = 'rupay';
        }

        // Set the card type in the card state
        setCard((prevCard) => ({
            ...prevCard,
            card_number: formattedInput,
            type: cardType,
        }));
    };

    const formatAndValidateExpiry = (text) => {
        // Remove any non-numeric characters
        const formattedText = text.replace(/[^0-9]/g, '');

        // Insert a slash ("/") between the month and year
        let formattedExpiry = '';
        if (formattedText.length > 2) {
            formattedExpiry =
                formattedText.slice(0, 2) + '/' + formattedText.slice(2);
        } else {
            formattedExpiry = formattedText;
        }

        // Validate expiry date
        const expiryValidation = inputValidation.validateExpiryDate(formattedExpiry);
        setValidationErrors(prev => ({
            ...prev,
            expiry: expiryValidation.isValid ? null : expiryValidation.error
        }));

        setCard({ ...card, expiry: formattedExpiry });
    };

    const validateCVV = (cvv) => {
        const cvvValidation = inputValidation.validateCVV(cvv, card.type);
        setValidationErrors(prev => ({
            ...prev,
            cvv: cvvValidation.isValid ? null : cvvValidation.error
        }));

        setCard({ ...card, cvv });
    };

    const handleAddCard = async () => {
        if (!validateForm()) {
            Toast.show('Please fix the errors before saving', {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
            });
            return;
        }

        setIsSubmitting(true);
        
        try {
            // Sanitize cardholder name
            const sanitizedCard = {
                ...card,
                name_on_card: inputValidation.sanitizeCardholderName(card.name_on_card),
                nickname: card.nickname.trim()
            };

            const success = await onAddCard(sanitizedCard);
            if (success) {
                hideModal();
            }
        } catch (error) {
            const userMessage = secureErrorHandler.handleError(error, 'handle_add_card');
            Toast.show(userMessage, {
                duration: Toast.durations.LONG,
                position: Toast.positions.BOTTOM,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const validateExpiry = (text) => {
        const expiryValidation = inputValidation.validateExpiryDate(text);
        return expiryValidation.isValid;
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={hideModal} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {item ? 'Edit Card' : 'Add New Card'}
                </Text>
                <View style={styles.placeholder} />
            </View>

            <View style={styles.cardPreview}>
                <Card item={card} />
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Card Nickname</Text>
                    <TextInput
                        style={[styles.input, errors.nickname && styles.inputError]}
                        value={card.nickname}
                        onChangeText={(text) => setCard({ ...card, nickname: text })}
                        placeholder="e.g., Personal Visa, Work Card"
                        placeholderTextColor="#999"
                    />
                    {errors.nickname && (
                        <Text style={styles.errorText}>{errors.nickname}</Text>
                    )}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Card Number</Text>
                    <TextInput
                        style={[styles.input, errors.card_number && styles.inputError]}
                        value={card.card_number}
                        onChangeText={formatCardNumber}
                        placeholder="1234 5678 9012 3456"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        maxLength={19}
                    />
                    {errors.card_number && (
                        <Text style={styles.errorText}>{errors.card_number}</Text>
                    )}
                    {validationErrors.card_number && (
                        <Text style={styles.errorText}>{validationErrors.card_number}</Text>
                    )}
                </View>

                <View style={styles.row}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Expiry Date</Text>
                        <TextInput
                            style={[styles.input, errors.expiry && styles.inputError]}
                            value={card.expiry}
                            onChangeText={formatAndValidateExpiry}
                            placeholder="MM/YY"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            maxLength={5}
                        />
                        {errors.expiry && (
                            <Text style={styles.errorText}>{errors.expiry}</Text>
                        )}
                    </View>

                    <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>CVV</Text>
                        <TextInput
                            style={[styles.input, errors.cvv && styles.inputError]}
                            value={card.cvv}
                            onChangeText={validateCVV}
                            placeholder="123"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            maxLength={4}
                            secureTextEntry
                        />
                        {errors.cvv && (
                            <Text style={styles.errorText}>{errors.cvv}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Cardholder Name</Text>
                    <TextInput
                        style={[styles.input, errors.name_on_card && styles.inputError]}
                        value={card.name_on_card}
                        onChangeText={(text) => setCard({ ...card, name_on_card: text })}
                        placeholder="JOHN DOE"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                    />
                    {errors.name_on_card && (
                        <Text style={styles.errorText}>{errors.name_on_card}</Text>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={item ? handleEditCard : handleAddCard}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitButtonText}>
                            {item ? 'Update Card' : 'Add Card'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    placeholder: {
        width: 30,
    },
    cardPreview: {
        padding: 20,
        alignItems: 'center',
    },
    form: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: 'white',
    },
    inputError: {
        borderColor: '#FF3B30',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    halfWidth: {
        width: '48%',
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default AddCardModal;
