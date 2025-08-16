import React from 'react';
import { Platform, StyleSheet, SafeAreaView, StatusBar, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// --- TabBarIcon Component ---
// A helper component to render icons in the tab bar consistently.
const TabBarIcon = ({ name, color }: { name: React.ComponentProps<typeof Ionicons>['name']; color: string }) => {
    return <Ionicons size={26} name={name} color={color} style={styles.tabIcon} />;
};

// --- Main App Layout Component ---
// This component sets up the main tab navigation for the application.
export default function TabLayout() {
    // By placing the SafeAreaView here, we ensure the entire app respects the device's safe areas.
    // The content of each screen will be rendered within these safe boundaries.
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <Tabs
                screenOptions={{
                    headerShown: false, // Hides the default header
                    tabBarShowLabel: false, // Hides the text label below the icon
                    tabBarActiveTintColor: '#A19ECA',      // Active icon color from design system (Secondary Highlight)
                    tabBarInactiveTintColor: '#868E96',    // Inactive icon color from design system (Muted Grey)
                    tabBarStyle: styles.tabBarStyle,        // Applies the main style for the tab bar
                }}>
                <Tabs.Screen
                    name="index" // Corresponds to app/index.tsx
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "home" : "home-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="time" // Corresponds to app/time.tsx
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "time" : "time-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="calendar" // Corresponds to app/calendar.tsx
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "calendar" : "calendar-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="map" // Corresponds to app/map.tsx
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "map" : "map-outline"} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="settings" // Corresponds to app/settings.tsx
                    options={{
                        tabBarIcon: ({ color, focused }) => (
                            <TabBarIcon name={focused ? "settings" : "settings-outline"} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </SafeAreaView>
    );
}

// --- Styles based on Design System Prompt ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#181A1E', // Deep Charcoal background
    },
    tabIcon: {
        marginBottom: -3,
    },
    tabBarStyle: {
        // Removed 'position: absolute' to make the tab bar part of the layout flow.
        // This prevents content from rendering underneath it.
        height: 60,
        paddingBottom: 5,
        paddingTop: 5,
        backgroundColor: '#212529', // Dark Grey card background
        borderTopWidth: 1, // Use a top border instead of a full border for a standard tab bar
        borderTopColor: '#1e2021', // Border color from design system
    },
});
