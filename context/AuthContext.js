import React, { createContext, useContext, useState, useEffect } from 'react';

import { CARDS } from '../constants/string';
import authenticateUser from '../helper/authenticate';
import { decryptData } from '../helper/encryption';
import { getLocalStoreData } from '../helper/localStorage';
import getEncryptionKey from '../util/getEncryptionKey';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(false);

    const getCards = async () => {
        setLoading(true);
        try {
            const encryptionKey = await getEncryptionKey();
            const encryptedCards = await getLocalStoreData(CARDS);
            if (!encryptedCards) {
                setLoading(false);
                return;
            }
            const decryptedCards = encryptedCards.map((card, index) => {
                const decryptedCard = decryptData(card, encryptionKey);
                return { ...decryptedCard, index };
            });
            setCards(decryptedCards);
        } catch (error) {
            console.error('Error loading cards:', error);
            // Don't expose sensitive error details
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) getCards();
    }, [isAuthenticated]);

    const logout = () => {
        setIsAuthenticated(false);
        setCards([]);
    };

    const login = async () => {
        if (!isAuthenticated) {
            try {
                const result = await authenticateUser();
                
                // Only allow authentication if successful or if biometrics are not available
                // but user has explicitly chosen to proceed
                if (result.success) {
                    setIsAuthenticated(true);
                } else if (result.error === 'not_enrolled') {
                    // For users without biometrics, require explicit consent
                    // This could be enhanced with a PIN or password fallback
                    const shouldProceed = await new Promise((resolve) => {
                        // Show a dialog asking user to confirm they want to proceed without biometrics
                        // For now, we'll require biometrics to be set up
                        resolve(false);
                    });
                    
                    if (shouldProceed) {
                        setIsAuthenticated(true);
                    } else {
                        throw new Error('Biometric authentication required');
                    }
                } else {
                    throw new Error('Authentication failed');
                }
            } catch (error) {
                console.error('Authentication error:', error);
                // Don't expose sensitive error details to user
                throw new Error('Authentication failed. Please try again.');
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                logout,
                login,
                cards,
                setCards,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
