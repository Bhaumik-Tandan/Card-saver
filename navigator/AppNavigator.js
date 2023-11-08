import { EvilIcons,Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

import CardNavigator from './CardNavigator';
import SettingsNavigator from './SettingsNavigator';
import BannerAd from '../components/BannerAd';
import PAGES from '../constants/pages';
import CardScan from '../pages/CardScan';

const Tab = createBottomTabNavigator();
const AppNavigator = (
    <Tab.Navigator>
        <Tab.Group>
            <Tab.Screen
                name={PAGES.CARD_NAVIGATOR}
                options={{
                    headerShown: false,
                    tabBarLabel: PAGES.CARD_LIST,
                    tabBarIcon: ({ color, size }) => (
                        <EvilIcons
                            name="credit-card"
                            size={size}
                            color={color}
                        />
                    ),
                }}
                component={CardNavigator}
            />
            <Tab.Screen
                name={"Card Scan"}
                component={CardScan}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="scan" size={size} color={color} />
                    ),
                    tabBarLabel: PAGES.CARD_SCAN,
                    header: () => <BannerAd />,
                }}
            />
            <Tab.Screen
                name={PAGES.SETTINGS_NAVIGATOR}
                component={SettingsNavigator}
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <EvilIcons name="gear" size={size} color={color} />
                    ),
                    tabBarLabel: PAGES.SETTINGS,
                    header: () => <BannerAd />,
                }}
            />
        </Tab.Group>
    </Tab.Navigator>
);

export default AppNavigator;
