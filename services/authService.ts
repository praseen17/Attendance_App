import AsyncStorage from '@react-native-async-storage/async-storage';

// Authentication interfaces
export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResult {
    success: boolean;
    token?: string;
    user?: UserProfile;
    error?: string;
}

export interface UserProfile {
    id: string;
    username: string;
    name: string;
    email: string;
}

// Storage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: '@auth/access_token',
    REFRESH_TOKEN: '@auth/refresh_token',
    USER_PROFILE: '@auth/user_profile',
} as const;

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.40.91:3001';

export class AuthService {
    /**
     * Login with credentials
     */
    async login(credentials: LoginCredentials): Promise<AuthResult> {
        try {
            console.log('🔐 Attempting login for:', credentials.username);

            // Create timeout controller for React Native compatibility
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 15000); // 15 seconds

            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            console.log('📡 Login response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.log('❌ Login failed:', errorData);
                return {
                    success: false,
                    error: errorData.error || `Server error: ${response.status}`,
                };
            }

            const data = await response.json();
            console.log('✅ Login successful for:', data.data?.user?.name);

            // Store authentication data
            if (data.data?.accessToken) {
                await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.accessToken);
            }
            if (data.data?.refreshToken) {
                await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
            }
            if (data.data?.user) {
                await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data.data.user));
            }

            return {
                success: true,
                token: data.data?.accessToken,
                user: data.data?.user,
            };

        } catch (error) {
            console.error('🚨 Login error:', error);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        error: 'Request timeout. Please check your connection and try again.',
                    };
                }
                if (error.message.includes('Network request failed')) {
                    return {
                        success: false,
                        error: 'Network error. Please check your connection.',
                    };
                }
            }

            return {
                success: false,
                error: 'Login failed. Please try again.',
            };
        }
    }

    /**
     * Logout and clear stored data
     */
    async logout(): Promise<void> {
        try {
            console.log('🚪 Logging out...');
            await AsyncStorage.multiRemove([
                STORAGE_KEYS.ACCESS_TOKEN,
                STORAGE_KEYS.REFRESH_TOKEN,
                STORAGE_KEYS.USER_PROFILE,
            ]);
            console.log('✅ Logout completed');
        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }

    /**
     * Get stored token
     */
    async getToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        } catch (error) {
            console.error('❌ Get token error:', error);
            return null;
        }
    }

    /**
     * Get stored user profile
     */
    async getUserProfile(): Promise<UserProfile | null> {
        try {
            const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            console.error('❌ Get user profile error:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        try {
            const token = await this.getToken();
            const user = await this.getUserProfile();
            return !!(token && user);
        } catch (error) {
            console.error('❌ Auth check error:', error);
            return false;
        }
    }

    /**
     * Initialize auth service
     */
    async initialize(): Promise<void> {
        try {
            console.log('🔧 Initializing auth service...');
            // Just check if we have stored credentials
            const isAuth = await this.isAuthenticated();
            console.log('🔍 Auth status:', isAuth ? 'authenticated' : 'not authenticated');
        } catch (error) {
            console.error('❌ Auth initialization error:', error);
        }
    }

    /**
     * Make authenticated request
     */
    async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
        const token = await this.getToken();

        return fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        });
    }
}

// Export singleton instance
export const authService = new AuthService();