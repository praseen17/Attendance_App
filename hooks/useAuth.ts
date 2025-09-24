import { useRouter } from 'expo-router';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { LoginCredentials, AuthResult } from '@/services/authService';

/**
 * Enhanced auth hook with navigation
 */
export function useAuthWithNavigation() {
    const authContext = useAuthContext();
    const router = useRouter();

    const {
        isAuthenticated,
        isLoading,
        user,
        isInitialized,
        login: contextLogin,
        logout: contextLogout,
        getToken,
    } = authContext;

    /**
     * Login with automatic navigation
     */
    const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
        console.log('🔐 useAuthWithNavigation: Login attempt');

        const result = await contextLogin(credentials);

        if (result.success) {
            console.log('✅ Login successful, navigating to app...');
            // Small delay to ensure state is updated
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 100);
        }

        return result;
    };

    /**
     * Logout with automatic navigation
     */
    const logout = async (): Promise<void> => {
        console.log('🚪 useAuthWithNavigation: Logout');

        await contextLogout();

        // Navigate to login screen
        setTimeout(() => {
            router.replace('/login');
        }, 100);
    };

    /**
     * Redirect to app if authenticated
     */
    const redirectToApp = (): void => {
        if (isAuthenticated) {
            console.log('🔄 Redirecting to app...');
            router.replace('/(tabs)');
        }
    };

    /**
     * Redirect to login if not authenticated
     */
    const redirectToLogin = (): void => {
        if (!isAuthenticated) {
            console.log('🔄 Redirecting to login...');
            router.replace('/login');
        }
    };

    return {
        // State
        isAuthenticated,
        isLoading,
        user,
        isInitialized,

        // Methods
        login,
        logout,
        getToken,

        // Navigation helpers
        redirectToApp,
        redirectToLogin,
    };
}

// Re-export the basic useAuth hook
export { useAuth } from '@/contexts/AuthContext';