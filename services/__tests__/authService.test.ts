import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService, LoginCredentials } from '../authService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthService', () => {
    let authService: AuthService;
    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        authService = new AuthService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    describe('login', () => {
        const mockCredentials: LoginCredentials = {
            username: 'testuser',
            password: 'testpass',
        };

        const mockLoginResponse = {
            token: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            user: {
                id: '1',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                sections: ['section1'],
            },
            expiresIn: 3600,
        };

        it('should login successfully with valid credentials', async () => {
            // Mock successful API response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockLoginResponse,
            } as Response);

            const result = await authService.login(mockCredentials);

            expect(result.success).toBe(true);
            expect(result.token).toBe(mockLoginResponse.token);
            expect(result.user).toEqual(mockLoginResponse.user);

            // Verify tokens are stored
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
                '@auth/access_token',
                mockLoginResponse.token
            );
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
                '@auth/refresh_token',
                mockLoginResponse.refreshToken
            );
        });

        it('should handle login failure with invalid credentials', async () => {
            // Mock failed API response
            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Invalid credentials' }),
            } as Response);

            const result = await authService.login(mockCredentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
            expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
        });

        it('should handle network errors during login', async () => {
            // Mock network error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await authService.login(mockCredentials);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error. Please check your connection.');
        });
    });

    describe('logout', () => {
        it('should clear all stored authentication data', async () => {
            await authService.logout();

            expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/access_token');
            expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/refresh_token');
            expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/user_profile');
            expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/token_expiry');
        });

        it('should not throw error if storage operations fail', async () => {
            mockAsyncStorage.removeItem.mockRejectedValueOnce(new Error('Storage error'));

            await expect(authService.logout()).resolves.not.toThrow();
        });
    });

    describe('isAuthenticated', () => {
        it('should return true for valid non-expired token', async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('valid-token') // access token
                .mockResolvedValueOnce(futureDate.toISOString()); // expiry

            const result = await authService.isAuthenticated();

            expect(result).toBe(true);
        });

        it('should return false for missing token', async () => {
            mockAsyncStorage.getItem
                .mockResolvedValueOnce(null) // no access token
                .mockResolvedValueOnce(null); // no expiry

            const result = await authService.isAuthenticated();

            expect(result).toBe(false);
        });

        it('should attempt token refresh for expired token', async () => {
            const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('expired-token') // access token
                .mockResolvedValueOnce(pastDate.toISOString()) // expired
                .mockResolvedValueOnce('refresh-token'); // refresh token for refresh attempt

            // Mock successful refresh
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: 'new-access-token',
                    refreshToken: 'new-refresh-token',
                    expiresIn: 3600,
                }),
            } as Response);

            const result = await authService.isAuthenticated();

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/auth/refresh'),
                expect.any(Object)
            );
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            mockAsyncStorage.getItem.mockResolvedValueOnce('valid-refresh-token');

            const mockRefreshResponse = {
                token: 'new-access-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600,
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRefreshResponse,
            } as Response);

            const result = await authService.refreshToken();

            expect(result).toBe(mockRefreshResponse.token);
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
                '@auth/access_token',
                mockRefreshResponse.token
            );
        });

        it('should logout user if refresh fails', async () => {
            mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-refresh-token');

            mockFetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ message: 'Invalid refresh token' }),
            } as Response);

            const result = await authService.refreshToken();

            expect(result).toBeNull();
            expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(4); // logout called
        });

        it('should handle concurrent refresh requests', async () => {
            mockAsyncStorage.getItem.mockResolvedValue('valid-refresh-token');

            const mockRefreshResponse = {
                token: 'new-access-token',
                refreshToken: 'new-refresh-token',
                expiresIn: 3600,
            };

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockRefreshResponse,
            } as Response);

            // Start multiple refresh requests simultaneously
            const promises = [
                authService.refreshToken(),
                authService.refreshToken(),
                authService.refreshToken(),
            ];

            const results = await Promise.all(promises);

            // All should return the same token
            results.forEach(result => {
                expect(result).toBe(mockRefreshResponse.token);
            });

            // But API should only be called once
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('getToken', () => {
        it('should return valid non-expired token', async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('valid-token')
                .mockResolvedValueOnce(futureDate.toISOString());

            const result = await authService.getToken();

            expect(result).toBe('valid-token');
        });

        it('should refresh token if about to expire', async () => {
            const soonToExpire = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('expiring-token')
                .mockResolvedValueOnce(soonToExpire.toISOString())
                .mockResolvedValueOnce('refresh-token'); // for refresh call

            // Mock successful refresh
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: 'refreshed-token',
                    refreshToken: 'new-refresh-token',
                    expiresIn: 3600,
                }),
            } as Response);

            const result = await authService.getToken();

            expect(result).toBe('refreshed-token');
        });
    });

    describe('getUserProfile', () => {
        it('should return stored user profile', async () => {
            const mockUser = {
                id: '1',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com',
                sections: ['section1'],
            };

            mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockUser));

            const result = await authService.getUserProfile();

            expect(result).toEqual(mockUser);
        });

        it('should return null if no profile stored', async () => {
            mockAsyncStorage.getItem.mockResolvedValueOnce(null);

            const result = await authService.getUserProfile();

            expect(result).toBeNull();
        });

        it('should handle corrupted profile data', async () => {
            mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');

            const result = await authService.getUserProfile();

            expect(result).toBeNull();
        });
    });

    describe('authenticatedFetch', () => {
        it('should make request with authentication headers', async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000);

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('valid-token')
                .mockResolvedValueOnce(futureDate.toISOString());

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'success' }),
            } as Response);

            await authService.authenticatedFetch('/api/test');

            expect(mockFetch).toHaveBeenCalledWith('/api/test', {
                headers: {
                    'Authorization': 'Bearer valid-token',
                    'Content-Type': 'application/json',
                },
            });
        });

        it('should retry with refreshed token on 401 response', async () => {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000);

            mockAsyncStorage.getItem
                .mockResolvedValueOnce('expired-token')
                .mockResolvedValueOnce(futureDate.toISOString())
                .mockResolvedValueOnce('refresh-token') // for refresh
                .mockResolvedValueOnce('new-token') // after refresh
                .mockResolvedValueOnce(futureDate.toISOString()); // new expiry

            // First request fails with 401
            mockFetch
                .mockResolvedValueOnce({
                    status: 401,
                    ok: false,
                } as Response)
                // Refresh token request succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        token: 'new-token',
                        refreshToken: 'new-refresh-token',
                        expiresIn: 3600,
                    }),
                } as Response)
                // Retry request succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ data: 'success' }),
                } as Response);

            const result = await authService.authenticatedFetch('/api/test');

            expect(mockFetch).toHaveBeenCalledTimes(3); // original + refresh + retry
            expect(result.ok).toBe(true);
        });
    });
});