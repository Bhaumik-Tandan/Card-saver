import React from 'react';
import { View, FlatList, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import AddCardBox from '../components/AddCardBox';
import BannerAd from '../components/BannerAd';
import CardBox from '../components/CardBox';
import Loader from '../components/Loader';
import PAGES from '../constants/pages';
import { useAuth } from '../context/AuthContext';
import { calcHeight, calcWidth } from '../helper/res';

function CardList({ navigation }) {
    const { cards } = useAuth();

    const showModal = () => {
        navigation.navigate(PAGES.ADD_CARD);
    };

    const showScanModal = () => {
        navigation.navigate(PAGES.CARD_SCAN);
    };

    return (
        <SafeAreaView style={styles.container}>
            {cards ? (
                cards.length === 0 ? (
                    <AddCardBox showModal={showModal} />
                ) : (
                    <>
                        <BannerAd />
                        <FlatList
                            data={cards}
                            renderItem={CardBox}
                            keyExtractor={(item) => item.card_number}
                        />
                    </>
                )
            ) : (
                <Loader />
            )}

            <View style={styles.fabContainer}>
                <FAB style={styles.fab} icon="plus" onPress={showModal} />
            </View>
            
            {/* Scan Button */}
            <View style={styles.scanFabContainer}>
                <TouchableOpacity style={styles.scanFab} onPress={showScanModal}>
                    <Ionicons name="camera" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fabContainer: {
        position: 'absolute',
        bottom: calcHeight(5), // 5% of the device height
        right: calcWidth(5), // 5% of the device width
    },
    fab: {
        backgroundColor: 'white',
    },
    scanFabContainer: {
        position: 'absolute',
        bottom: calcHeight(5), // 5% of the device height
        right: calcWidth(20), // 20% of the device width (to the left of the main FAB)
    },
    scanFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
});

export default CardList;
