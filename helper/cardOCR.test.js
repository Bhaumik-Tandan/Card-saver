// Simple test file for card OCR functionality
import { extractCardData, detectCardType, isValidCardNumber } from './cardOCR';

// Test card data
const testCases = [
    {
        name: 'Visa Card',
        text: 'VISA 4111 1111 1111 1111 12/25 123 JOHN DOE',
        expected: {
            card_number: '4111111111111111',
            type: 'visa',
            valid: true
        }
    },
    {
        name: 'Mastercard',
        text: 'MASTERCARD 5555 5555 5555 4444 12/25 123 JANE SMITH',
        expected: {
            card_number: '5555555555554444',
            type: 'mastercard',
            valid: true
        }
    },
    {
        name: 'American Express',
        text: 'AMEX 3782 822463 10005 12/25 1234 JOHN DOE',
        expected: {
            card_number: '378282246310005',
            type: 'amex',
            valid: true
        }
    },
    {
        name: 'Invalid Card',
        text: 'INVALID 1234 5678 9012 3456 12/25 123 JOHN DOE',
        expected: {
            card_number: '1234567890123456',
            type: 'generic',
            valid: false
        }
    }
];

// Run tests
console.log('Testing Card OCR Functionality...\n');

testCases.forEach(testCase => {
    console.log(`Testing: ${testCase.name}`);
    
    try {
        const result = extractCardData(testCase.text);
        
        if (result) {
            console.log(`✓ Card number: ${result.card_number}`);
            console.log(`✓ Card type: ${result.type}`);
            console.log(`✓ Expiry: ${result.expiry}`);
            console.log(`✓ CVV: ${result.cvv}`);
            console.log(`✓ Name: ${result.name_on_card}`);
            console.log(`✓ Valid: ${isValidCardNumber(result.card_number)}`);
        } else {
            console.log('✗ No card data extracted');
        }
    } catch (error) {
        console.log(`✗ Error: ${error.message}`);
    }
    
    console.log('---\n');
});

console.log('Card OCR testing completed!'); 