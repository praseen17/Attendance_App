import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * Authentication Guard Component
 * Requirements: 1.5 - Navigation guards for protected routes
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading, isInitialized } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        if (!isInitialized || isLoading) {
            return; // Still initializing or loading
        }

        const inAuthGroup = segments[0] === '(auth)';
        const inTabsGroup = segments[0] === '(tabs)';
        const isLoginScreen = segments.includes('login');

        if (!isAuthenticated) {
            // User is not authenticated
            if (!isLoginScreen && !inAuthGroup) {
                // Redirect to login if not already there
                router.replace('/login');
            }
        } else {
            // User is authenticated
            if (isLoginScreen || inAuthGroup) {
                // Redirect to main app if on login screen
                router.replace('/(tabs)');
            }
        }
    }, [isAuthenticated, isInitialized, isLoading, segments, router]);

    // Show loading screen while initializing
    if (!isInitialized || isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
    },
});