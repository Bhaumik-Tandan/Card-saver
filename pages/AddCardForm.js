import * as CardValidator from 'card-validator';
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
} from 'react-native';
import Toast from 'react-native-root-toast';

import Card from '../components/card';
import PAGES from '../constants/pages';
import { CARDS } from '../constants/string';
import { useAuth } from '../context/AuthContext';
import { encryptData } from '../helper/encryption';
import { getLocalStoreData, setLocalStoreData } from '../helper/localStorage';
import getEncryptionKey from '../util/getEncryptionKey';

function AddCardModal({ navigation, route }) {
    const item = route?.params?.item;
    const ocrResult = route?.params?.ocrResult;
    useEffect(() => {
        if (item) setCard(item);
    }, [item]);

    useEffect(() => {
        if (ocrResult) {
            const extractCardholderName = (ocrResult) => {
                return ocrResult.find((text) => text.match(/^[A-Z][A-Z\s]+$/i)) || '';
            };
    
            const extractCardNumber = (ocrResult) => {
                return ocrResult.find((text) => text.match(/^\d{13,19}$/)) || '';
            };
    
            const extractExpiryDate = (ocrResult) => {
                // Regular expression to match MM/YY format (e.g., 05/23)
                const expiryRegex = /\b\d{2}\/\d{2}\b/;
                const match = ocrResult.find((text) => text.match(expiryRegex));
                return match ? match.match(expiryRegex)[0] : '';
            };
    
            const cardholderName = extractCardholderName(ocrResult);
            const cardNumber = extractCardNumber(ocrResult);
            const expiryDate = extractExpiryDate(ocrResult);
    
            // Use the extracted information to set the card state
            setCard({
                nickname: '', // Set your default values here
                card_number: cardNumber,
                expiry: expiryDate,
                cvv: '',
                color: 'black',
                type: '',
                name_on_card: cardholderName,
            });
        }
    }, [ocrResult]);
    

    const [card, setCard] = useState({
        nickname: '',
        card_number: '',
        expiry: '', // Set the default value with the slash
        cvv: '',
        color: 'black',
        type: '',
        name_on_card: '',
    });

    const { cards, setCards } = useAuth();
    const hideModal = () => {
        navigation.navigate(PAGES.CARD_LIST);
    };

    const handleEditCard = async () => {
        const editedCard = card;
        const index = item.index;
        try {
            // Check if the card already exists
            if (!cards || index < 0 || index >= cards.length) {
                alert('Invalid index or card does not exist');
                return;
            }

            const encryptionKey = await getEncryptionKey();
            const encryptedCard = encryptCard(editedCard, encryptionKey);
            const encryptCards = await getLocalStoreData(CARDS);

            encryptCards[index] = encryptedCard;

            await updateCardStorage(encryptCards);

            const updatedCards = [...cards];
            updatedCards[index] = { ...editedCard };

            setCards(updatedCards);
            navigation.navigate(PAGES.CARD_LIST);
        } catch (error) {
            console.error('An error occurred:', error);
        }
    };

    const [isCardNumberValid, setIsCardNumberValid] = useState(true);
    const [isCVVValid, setIsCVVValid] = useState(true);

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
                alert('Card already exists');
                return;
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
            hideModal();
            return true;
        } catch (error) {
            console.error('An error occurred:', error);
        }
    };

    const formatCardNumber = (input) => {
        const formattedInput = input
            .replace(/\s/g, '')
            .replace(/(\d{4})/g, '$1 ')
            .trim();

        // Validate the card number in real-time
        const cardNumberValidation = CardValidator.number(formattedInput);
        setIsCardNumberValid(cardNumberValidation.isValid);

        // Update card type based on the validation result
        let cardType = cardNumberValidation.card
            ? cardNumberValidation.card.type
            : '';

        // Manually check for Discover card based on BIN range
        const discoverBINPattern = /^6(?:011|5[0-9]{2})/; // Discover cards typically start with '6011' or '65'
        if (discoverBINPattern.test(formattedInput)) {
            cardType = 'Discover';
        }

        // Manually check for Rupay card based on BIN range
        const rupayBINPattern = /^65/; // Rupay cards start with '65'
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

    // Function to format and validate the expiry date
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

        // Always set the state with the formatted expiry
        setCard({ ...card, expiry: formattedExpiry });
    };

    const validateCVV = (cvv) => {
        // Check if the card type is Amex and adjust the CVV validation accordingly
        const isAmex = card.type.toLowerCase() === 'american-express';

        // Define the CVV length based on the card type (Amex: 4 digits, others: 3 digits)
        const expectedCVVLength = isAmex ? 4 : 3;

        // Validate the CVV length and whether it's numeric
        const isValidCVV =
            cvv.length === expectedCVVLength && /^\d+$/.test(cvv);

        setIsCVVValid(isValidCVV);
    };

    const handleAddCard = async () => {
        if (!isCardNumberValid || !card.card_number) {
            Toast.show('Invalid Card Number', {
                duration: Toast.durations.LONG,
            });
            return;
        }
        if (!validateExpiry(card.expiry)) {
            Toast.show('Invalid Expiry Date', {
                duration: Toast.durations.LONG,
            });
            return;
        }
        if (!isCVVValid || !card.cvv) {
            Toast.show('Invalid CVV', {
                duration: Toast.durations.LONG,
            });
            return;
        }

        if (!card.name_on_card) {
            Toast.show('Please enter a name on card', {
                duration: Toast.durations.LONG,
            });
            return;
        }

        if (!card.nickname) {
            Toast.show('Please enter a nickname', {
                duration: Toast.durations.LONG,
            });
            return;
        }
        // Validate and process the card data

        // Call the onAddCard function with the card data
        const cardAdded = await onAddCard(card);
        if (!cardAdded) return;
        // Clear the form
        setCard({
            nickname: '',
            card_number: '',
            expiry: '', // Set the default value with the slash
            cvv: '',
            color: 'black',
            type: '',
            name_on_card: '',
        });
        setIsCardNumberValid(true);
        setIsCVVValid(true);
    };

    const validateExpiry = (text) => {
        // Use a regular expression to match the MM/YY format (e.g., 12/23)
        const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
        return regex.test(text);
    };

    return (
        <View style={styles.modalContent}>
            <ScrollView>
                <Card item={card} showCard />
                <TextInput
                    style={styles.input}
                    placeholder="Card Nickname (e.g. My Visa Card)"
                    value={card.nickname}
                    onChangeText={(text) =>
                        setCard({ ...card, nickname: text })
                    }
                />
                <TextInput
                    style={[
                        styles.input,
                        !isCardNumberValid && styles.invalidInput,
                    ]}
                    placeholder="Card Number"
                    keyboardType="numeric"
                    value={card.card_number}
                    onChangeText={formatCardNumber}
                    maxLength={19}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Name on the Card"
                    value={card.name_on_card}
                    onChangeText={(text) =>
                        setCard({ ...card, name_on_card: text })
                    }
                />
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}
                >
                    <TextInput
                        style={[
                            styles.input,
                            !validateExpiry(card.expiry) && styles.invalidInput,
                        ]}
                        placeholder="Expiry Date (MM/YY)"
                        value={card.expiry}
                        onChangeText={formatAndValidateExpiry}
                        maxLength={5}
                        keyboardType="numeric"
                    />
                    <TextInput
                        style={[
                            styles.input,
                            !isCVVValid && styles.invalidInput,
                        ]}
                        placeholder="CVV"
                        keyboardType="numeric"
                        value={card.cvv}
                        onChangeText={(text) => {
                            setCard({ ...card, cvv: text });
                            // Validate the CVV in real-time
                            validateCVV(text);
                        }}
                        maxLength={4}
                    />
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={item ? handleEditCard : handleAddCard}
                >
                    <Text style={styles.addButtonText}>
                        {item ? 'Edit Card' : 'Add Card'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    input: {
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'gray',
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    invalidInput: {
        borderColor: 'red', // Change border color for invalid input
    },
    addButton: {
        backgroundColor: 'blue',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 16,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
});

export default AddCardModal;
