import TextRecognition from 'react-native-text-recognition';

// Card type detection patterns
const CARD_PATTERNS = {
    visa: /^4/,
    mastercard: /^5[1-5]/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    jcb: /^(?:2131|1800|35\d{3})/,
    dinersclub: /^3(?:0[0-5]|[68])/,
    unionpay: /^62/,
    maestro: /^(5018|5020|5038|6304|6759|6761|6763)/,
};

// Extract card data from recognized text
export const extractCardData = (text) => {
    if (!text || typeof text !== 'string') {
        return null;
    }

    // Clean the text - remove extra spaces and normalize
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Find card number (16 digits, possibly with spaces/dashes)
    const cardNumberMatch = cleanText.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
    
    if (!cardNumberMatch) {
        return null;
    }

    const cardNumber = cardNumberMatch[0].replace(/[\s-]/g, '');
    
    // Validate card number using Luhn algorithm
    if (!isValidCardNumber(cardNumber)) {
        return null;
    }

    // Find expiry date (MM/YY or MM/YYYY format)
    const expiryMatch = cleanText.match(/\b(0[1-9]|1[0-2])\/([0-9]{2}|[0-9]{4})\b/);
    const expiry = expiryMatch ? expiryMatch[0] : '';

    // Find CVV (3-4 digits, usually after expiry)
    const cvvMatch = cleanText.match(/\b\d{3,4}\b/);
    const cvv = cvvMatch ? cvvMatch[0] : '';

    // Find cardholder name (look for patterns that might be names)
    // This is more complex and may need refinement
    const nameMatch = cleanText.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/);
    const nameOnCard = nameMatch ? nameMatch[0] : '';

    // Detect card type
    const cardType = detectCardType(cardNumber);

    return {
        card_number: cardNumber,
        expiry: expiry,
        cvv: cvv,
        name_on_card: nameOnCard,
        nickname: `Scanned ${cardType.charAt(0).toUpperCase() + cardType.slice(1)}`,
        type: cardType,
        color: getCardColor(cardType)
    };
};

// Validate card number using Luhn algorithm
export const isValidCardNumber = (cardNumber) => {
    if (!/^\d{13,19}$/.test(cardNumber)) {
        return false;
    }

    let sum = 0;
    let isEven = false;

    // Loop through values starting from the rightmost side
    for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

// Detect card type based on number pattern
export const detectCardType = (cardNumber) => {
    for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
        if (pattern.test(cardNumber)) {
            return type;
        }
    }
    return 'generic';
};

// Get card color based on type
const getCardColor = (cardType) => {
    const colors = {
        visa: '#1A1F71',
        mastercard: '#EB001B',
        amex: '#006FCF',
        discover: '#FF6000',
        jcb: '#0B4EA2',
        dinersclub: '#0079BE',
        unionpay: '#E21836',
        maestro: '#0099DE',
        generic: '#000000'
    };
    return colors[cardType] || colors.generic;
};

// Process image and extract card data
export const processCardImage = async (imageUri) => {
    try {
        // Use the text recognition library
        const result = await TextRecognition.recognize(imageUri);
        
        if (!result || result.length === 0) {
            throw new Error('No text found in image');
        }

        // Combine all recognized text
        const fullText = Array.isArray(result) ? result.join(' ') : result;
        
        // Extract card data from the text
        const cardData = extractCardData(fullText);
        
        if (!cardData) {
            throw new Error('No valid card data found in image');
        }

        return cardData;

    } catch (error) {
        console.error('Error processing card image:', error);
        throw error;
    }
};

// Enhanced card data extraction with multiple attempts
export const extractCardDataEnhanced = (text) => {
    // First attempt: standard extraction
    let cardData = extractCardData(text);
    
    if (cardData) {
        return cardData;
    }

    // Second attempt: look for partial matches
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    for (const line of lines) {
        // Look for card number patterns in each line
        const cardNumberMatch = line.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/);
        
        if (cardNumberMatch) {
            const cardNumber = cardNumberMatch[0].replace(/[\s-]/g, '');
            
            if (isValidCardNumber(cardNumber)) {
                // Try to find other data in surrounding lines
                const cardType = detectCardType(cardNumber);
                
                return {
                    card_number: cardNumber,
                    expiry: '',
                    cvv: '',
                    name_on_card: '',
                    nickname: `Scanned ${cardType.charAt(0).toUpperCase() + cardType.slice(1)}`,
                    type: cardType,
                    color: getCardColor(cardType)
                };
            }
        }
    }

    return null;
}; 