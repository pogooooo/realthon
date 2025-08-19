import React, { useEffect } from 'react';
import { Platform, StyleSheet, SafeAreaView, StatusBar, View, Text, TouchableOpacity } from 'react-native';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
// ✅ useSafeAreaInsets 훅을 임포트합니다.
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- TabBarIcon Component ---
const TabBarIcon = ({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) => {
    return <Ionicons size={26} name={name} color={color} style={styles.tabIcon} />;
};

// --- Main App Layout Component ---
export default function TabLayout() {
    // ✅ useAuth 훅을 사용하여 사용자 및 로딩 상태를 가져옵니다.
    const { user, isLoading } = useAuth();
    const router = useRouter();
    // ✅ useSafeAreaInsets 훅을 사용하여 하단 인셋 값을 가져옵니다.
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!user && !isLoading) {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    return (
        <View style={styles.fullScreenContainer}>
            <StatusBar barStyle="light-content" />
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarShowLabel: false,
                    tabBarActiveTintColor: '#A19ECA',
                    tabBarInactiveTintColor: '#868E96',
                    // ✅ 동적 패딩을 적용하기 위해 tabBarStyle을 함수로 변경합니다.
                    tabBarStyle: [
                        styles.tabBarStyle,
                        // ✅ 하단 인셋 값을 패딩에 직접 더합니다.
                        { paddingBottom: insets.bottom },
                    ],
                }}>
                <Tabs.Screen
                    name="index"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "time" : "time-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="calendar"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "calendar" : "calendar-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="map"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "map" : "map-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "settings" : "settings-outline"} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </View>
    );
}

// --- Styles based on Design System Prompt ---
const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#181A1E',
    },
    tabIcon: {
        marginBottom: -3,
    },
    tabBarStyle: {
        height: 60,
        paddingTop: 5,
        backgroundColor: '#212529',
        borderTopWidth: 1,
        borderTopColor: '#1e2021',
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
});
