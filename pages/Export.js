import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Text, View, TouchableOpacity, FlatList, Platform } from 'react-native';
import { TextInput } from 'react-native-paper';

import { useAuth } from '../context/AuthContext';
import { encryptData } from '../helper/encryption';
import { getFontSizeByWindowWidth, calcHeight } from '../helper/res';

function Export({ navigation }) {
    const { cards } = useAuth();
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [password, setPassword] = useState('');
    const toggleCardSelection = (index) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter((i) => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };
    const exportCards = async () => {
        if (selectedIndices.length === 0) {
            alert('No cards selected');
            return;
        }

        if (password === '') {
            alert('Please enter a password');
            return;
        }

        const selectedCards = selectedIndices.map((index) => cards[index]);
        const encryptedCards = encryptData(selectedCards, password);
        const fileUri = FileSystem.documentDirectory + 'cardVault_export.pdf';
        await FileSystem.writeAsStringAsync(fileUri, encryptedCards);

        await saveFile(fileUri, 'cardVault_export.pdf', 'application/pdf');
        navigation.goBack();
    };

    const saveFile = async (uri, filename, mimetype) => {
        if (Platform.OS === 'android') {
            const permissions =
                await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                await FileSystem.StorageAccessFramework.createFileAsync(
                    permissions.directoryUri,
                    filename,
                    mimetype,
                )
                    .then(async (uri) => {
                        await FileSystem.writeAsStringAsync(uri, base64, {
                            encoding: FileSystem.EncodingType.Base64,
                        });
                    })
                    .catch((e) => console.log(e));
            } else {
                Sharing.shareAsync(uri);
            }
        } else {
            Sharing.shareAsync(uri);
        }
    };
    return (
        <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Cards to Export</Text>
                <FlatList
                    data={cards}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity
                            style={[
                                styles.cardItem,
                                {
                                    backgroundColor: selectedIndices.includes(
                                        index,
                                    )
                                        ? 'lightgreen'
                                        : 'white',
                                },
                            ]}
                            onPress={() => toggleCardSelection(index)}
                        >
                            <MaterialIcons
                                name={
                                    selectedIndices.includes(index)
                                        ? 'check-box'
                                        : 'check-box-outline-blank'
                                }
                                size={30}
                                color={
                                    selectedIndices.includes(index)
                                        ? 'green'
                                        : 'lightgray'
                                }
                            />
                            <Text>{item.nickname}</Text>
                        </TouchableOpacity>
                    )}
                />
                <TextInput
                    label="Password"
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => setPassword(text)}
                />
                <View style={styles.modalOptions}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={exportCards}
                    >
                        <Text>Export</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = {
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    cardItem: {
        flexDirection: 'row',
        fontSize: getFontSizeByWindowWidth(20),
        margin: calcHeight(3),
        textAlign: 'center',
    },
    closeButton: {
        alignItems: 'center',
        marginTop: 10,
    },
    modalOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: calcHeight(1),
    },
};
export default Export;
