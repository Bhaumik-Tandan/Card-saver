import { AntDesign } from '@expo/vector-icons';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Alert, View, TouchableOpacity, Text } from 'react-native';
import Modal from 'react-native-modal';

import { calcWidth, calcHeight } from '../helper/res';

const CardMenu = ({
    copyCardNumberToClipboard,
    setShowEditCard,
    visible,
    hideMenu,
    onCancel,
    onDelete,
    handleShare,
}) => {
    const deleteAlert = () => {
        Alert.alert(
            'Delete Card',
            'Are you sure you want to delete this card?',
            [
                {
                    text: 'Delete',
                    onPress: onDelete,
                    style: 'destructive',
                },
                {
                    text: 'Cancel',
                    onPress: onCancel,
                    style: 'cancel',
                },
            ],
            { cancelable: true },
        );
    };

    return (
        <Modal
            isVisible={visible}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            onBackdropPress={hideMenu}
            onBackButtonPress={hideMenu}
            propagateSwipe
            swipeDirection={['down']}
            onSwipeComplete={hideMenu}
            style={styles.modal}
        >
            <View style={styles.modalContent}>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={copyCardNumberToClipboard}
                >
                    <Ionicons
                        name="copy-outline"
                        size={calcWidth(8)}
                        color="blue"
                    />
                    <Text style={styles.menuText}>Copy Card Number</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={setShowEditCard}
                >
                    <Ionicons
                        name="create-outline"
                        size={calcWidth(8)}
                        color="blue"
                    />
                    <Text style={styles.menuText}>Edit Card</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={deleteAlert}>
                    <Ionicons
                        name="trash-outline"
                        size={calcWidth(8)}
                        color="red"
                    />
                    <Text style={styles.menuText}>Delete Card</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
                    <AntDesign
                        name="sharealt"
                        size={calcHeight(5)}
                        color="blue"
                    />
                    <Text style={styles.menuText}>Share Cards</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
};

const styles = {
    menuItem: {
        flexDirection: 'row',
        paddingVertical: calcHeight(1),
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuText: {
        fontSize: calcHeight(2),
        paddingHorizontal: calcHeight(1),
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 16,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
};

export default CardMenu;
