import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService, LoginCredentials, AuthResult, UserProfile } from '@/services/authService';

// Authentication context interface
interface AuthContextType {
    // State
    isAuthenticated: boolean;
    isLoading: boolean;
    user: UserProfile | null;
    isInitialized: boolean;

    // Methods
    login: (credentials: LoginCredentials) => Promise<AuthResult>;
    logout: () => Promise<void>;
    getToken: () => Promise<string | null>;
}

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props interface
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Simple Authentication Provider
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    /**
     * Initialize authentication state
     */
    useEffect(() => {
        initializeAuth();
    }, []);

    const initializeAuth = async () => {
        try {
            console.log('🔧 Initializing AuthContext...');
            setIsLoading(true);

            // Initialize auth service
            await authService.initialize();

            // Check authentication status
            const authenticated = await authService.isAuthenticated();
            setIsAuthenticated(authenticated);

            if (authenticated) {
                const userProfile = await authService.getUserProfile();
                setUser(userProfile);
                console.log('👤 User loaded:', userProfile?.name);
            }

        } catch (error) {
            console.error('❌ Auth initialization error:', error);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
            setIsInitialized(true);
            console.log('✅ AuthContext initialized');
        }
    };

    /**
     * Login user
     */
    const login = async (credentials: LoginCredentials): Promise<AuthResult> => {
        try {
            console.log('🔐 AuthContext: Login attempt for:', credentials.username);
            setIsLoading(true);

            const result = await authService.login(credentials);

            if (result.success) {
                setIsAuthenticated(true);
                setUser(result.user || null);
                console.log('✅ AuthContext: Login successful');
            } else {
                console.log('❌ AuthContext: Login failed:', result.error);
            }

            return result;
        } catch (error) {
            console.error('🚨 AuthContext: Login error:', error);
            return {
                success: false,
                error: 'Login failed. Please try again.',
            };
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Logout user
     */
    const logout = async (): Promise<void> => {
        try {
            console.log('🚪 AuthContext: Logging out...');
            setIsLoading(true);

            await authService.logout();
            setIsAuthenticated(false);
            setUser(null);

            console.log('✅ AuthContext: Logout completed');
        } catch (error) {
            console.error('❌ AuthContext: Logout error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Get authentication token
     */
    const getToken = async (): Promise<string | null> => {
        return await authService.getToken();
    };

    const contextValue: AuthContextType = {
        // State
        isAuthenticated,
        isLoading,
        user,
        isInitialized,

        // Methods
        login,
        logout,
        getToken,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}