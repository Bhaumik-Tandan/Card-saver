import { Alert } from 'react-native';

// Secure memory management utilities
export const secureMemoryUtils = {
    // Clear sensitive data from memory
    clearSensitiveData: (data) => {
        if (typeof data === 'string') {
            // Overwrite string with zeros
            return '0'.repeat(data.length);
        } else if (typeof data === 'object') {
            // Recursively clear object properties
            Object.keys(data).forEach(key => {
                if (typeof data[key] === 'string') {
                    data[key] = '0'.repeat(data[key].length);
                } else if (typeof data[key] === 'object') {
                    secureMemoryUtils.clearSensitiveData(data[key]);
                }
            });
        }
    },

    // Secure string comparison (prevents timing attacks)
    secureStringCompare: (a, b) => {
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
};

// Input validation utilities
export const inputValidation = {
    // Validate card number format and Luhn algorithm
    validateCardNumber: (cardNumber) => {
        // Remove spaces and dashes
        const cleanNumber = cardNumber.replace(/[\s-]/g, '');
        
        // Check if it's all digits and proper length
        if (!/^\d{13,19}$/.test(cleanNumber)) {
            return { isValid: false, error: 'Invalid card number format' };
        }

        // Luhn algorithm validation
        let sum = 0;
        let isEven = false;

        for (let i = cleanNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cleanNumber.charAt(i));

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        return {
            isValid: sum % 10 === 0,
            error: sum % 10 === 0 ? null : 'Invalid card number'
        };
    },

    // Validate expiry date
    validateExpiryDate: (expiry) => {
        const match = expiry.match(/^(\d{2})\/(\d{2})$/);
        if (!match) {
            return { isValid: false, error: 'Invalid expiry format (MM/YY)' };
        }

        const month = parseInt(match[1]);
        const year = parseInt(match[2]);
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;

        if (month < 1 || month > 12) {
            return { isValid: false, error: 'Invalid month' };
        }

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            return { isValid: false, error: 'Card has expired' };
        }

        return { isValid: true, error: null };
    },

    // Validate CVV
    validateCVV: (cvv, cardType = 'generic') => {
        const isAmex = cardType.toLowerCase() === 'amex' || cardType.toLowerCase() === 'american-express';
        const expectedLength = isAmex ? 4 : 3;

        if (!/^\d+$/.test(cvv)) {
            return { isValid: false, error: 'CVV must contain only numbers' };
        }

        if (cvv.length !== expectedLength) {
            return { 
                isValid: false, 
                error: `CVV must be ${expectedLength} digits for ${isAmex ? 'American Express' : 'this card type'}`
            };
        }

        return { isValid: true, error: null };
    },

    // Sanitize cardholder name
    sanitizeCardholderName: (name) => {
        // Remove special characters and extra spaces
        return name.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim();
    }
};

// Security audit logging (without sensitive data)
export const securityAudit = {
    logAuthenticationAttempt: (success, method, error = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event: 'authentication_attempt',
            success,
            method,
            error: error ? error.message : null
        };
        
        // In production, this would be sent to a secure logging service
        console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    },

    logCardOperation: (operation, success, cardType = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event: 'card_operation',
            operation,
            success,
            cardType
        };
        
        console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    },

    logSecurityEvent: (event, details = {}) => {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event,
            details
        };
        
        console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
    }
};

// Rate limiting for authentication attempts
export const rateLimiter = {
    attempts: new Map(),
    
    checkRateLimit: (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
        const now = Date.now();
        const userAttempts = rateLimiter.attempts.get(identifier) || [];
        
        // Remove old attempts outside the time window
        const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
        
        if (recentAttempts.length >= maxAttempts) {
            return { allowed: false, remainingTime: windowMs - (now - recentAttempts[0]) };
        }
        
        // Add current attempt
        recentAttempts.push(now);
        rateLimiter.attempts.set(identifier, recentAttempts);
        
        return { allowed: true, remainingAttempts: maxAttempts - recentAttempts.length };
    },
    
    clearAttempts: (identifier) => {
        rateLimiter.attempts.delete(identifier);
    }
};

// Secure error handling
export const secureErrorHandler = {
    handleError: (error, context = 'unknown') => {
        // Log error for debugging (without sensitive data)
        console.error(`Error in ${context}:`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        // Don't expose sensitive information to users
        const userMessage = 'An error occurred. Please try again.';
        
        // Log security event
        securityAudit.logSecurityEvent('error_occurred', {
            context,
            errorType: error.name,
            hasSensitiveData: false
        });
        
        return userMessage;
    }
};

// Security configuration
export const securityConfig = {
    // Minimum password/PIN length
    MIN_PIN_LENGTH: 6,
    
    // Maximum authentication attempts
    MAX_AUTH_ATTEMPTS: 5,
    
    // Lockout duration (15 minutes)
    LOCKOUT_DURATION: 15 * 60 * 1000,
    
    // Session timeout (30 minutes of inactivity)
    SESSION_TIMEOUT: 30 * 60 * 1000,
    
    // Required biometric authentication
    REQUIRE_BIOMETRICS: true,
    
    // Auto-lock on app background
    AUTO_LOCK_ON_BACKGROUND: true
}; 