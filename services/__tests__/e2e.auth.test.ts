import { AuthService } from '../authService';
import { DatabaseService } from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock database service
jest.mock('../database');

describe('End-to-End Authentication Flow Tests', () => {
    let authService: AuthService;
    let mockDatabaseService: jest.Mocked<DatabaseService>;

    beforeEach(() => {
        jest.clearAllMocks();
        authService = new AuthService();
        mockDatabaseService = new DatabaseService() as jest.Mocked<DatabaseService>;

        // Reset AsyncStorage mock
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    });

    describe('Complete Authentication Flow', () => {
        it('should complete full login flow with token storage', async () => {
            const mockLoginResponse = {
                success: true,
                data: {
                    user: {
                        id: 'test-user-id',
                        username: 'testuser',
                        name: 'Test User',
                        email: 'test@example.com'
                    },
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token'
                }
            };

            // Mock successful API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockLoginResponse
            });

            // Perform login
            const result = await authService.login('testuser', 'password123');

            // Verify login result
            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user?.username).toBe('testuser');

            // Verify tokens were stored
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'accessToken',
                'mock-access-token'
            );
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'refreshToken',
                'mock-refresh-token'
            );
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'user',
                JSON.stringify(mockLoginResponse.data.user)
            );

            // Verify authentication state
            expect(authService.isAuthenticated()).toBe(true);
            expect(authService.getCurrentUser()).toEqual(mockLoginResponse.data.user);
        });

        it('should handle login failure and maintain unauthenticated state', async () => {
            const mockErrorResponse = {
                success: false,
                error: 'Invalid credentials',
                code: 'LOGIN_FAILED'
            };

            // Mock failed API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => mockErrorResponse
            });

            // Perform login
            const result = await authService.login('testuser', 'wrongpassword');

            // Verify login failure
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');

            // Verify no tokens were stored
            expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('accessToken', expect.any(String));
            expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('refreshToken', expect.any(String));

            // Verify authentication state
            expect(authService.isAuthenticated()).toBe(false);
            expect(authService.getCurrentUser()).toBeNull();
        });

        it('should complete logout flow with token cleanup', async () => {
            // Setup authenticated state
            const mockUser = {
                id: 'test-user-id',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com'
            };

            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('mock-access-token') // accessToken
                .mockResolvedValueOnce('mock-refresh-token') // refreshToken
                .mockResolvedValueOnce(JSON.stringify(mockUser)); // user

            // Initialize auth service with stored tokens
            await authService.initializeFromStorage();

            // Verify initial authenticated state
            expect(authService.isAuthenticated()).toBe(true);

            // Mock logout API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            // Perform logout
            await authService.logout();

            // Verify tokens were removed
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('accessToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');

            // Verify authentication state
            expect(authService.isAuthenticated()).toBe(false);
            expect(authService.getCurrentUser()).toBeNull();
        });

        it('should handle automatic token refresh flow', async () => {
            // Setup with expired access token but valid refresh token
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('expired-access-token')
                .mockResolvedValueOnce('valid-refresh-token')
                .mockResolvedValueOnce(JSON.stringify({
                    id: 'test-user-id',
                    username: 'testuser'
                }));

            await authService.initializeFromStorage();

            const mockRefreshResponse = {
                success: true,
                data: {
                    accessToken: 'new-access-token',
                    refreshToken: 'new-refresh-token'
                }
            };

            // Mock refresh token API call
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockRefreshResponse
            });

            // Trigger token refresh
            const newToken = await authService.refreshToken();

            // Verify new tokens were stored
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'accessToken',
                'new-access-token'
            );
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                'refreshToken',
                'new-refresh-token'
            );

            expect(newToken).toBe('new-access-token');
            expect(authService.isAuthenticated()).toBe(true);
        });

        it('should handle refresh token expiration and force re-login', async () => {
            // Setup with expired tokens
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('expired-access-token')
                .mockResolvedValueOnce('expired-refresh-token')
                .mockResolvedValueOnce(JSON.stringify({
                    id: 'test-user-id',
                    username: 'testuser'
                }));

            await authService.initializeFromStorage();

            const mockRefreshErrorResponse = {
                success: false,
                error: 'Refresh token expired',
                code: 'TOKEN_EXPIRED'
            };

            // Mock failed refresh token API call
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => mockRefreshErrorResponse
            });

            // Attempt token refresh
            try {
                await authService.refreshToken();
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }

            // Verify tokens were cleared
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('accessToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refreshToken');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');

            // Verify authentication state
            expect(authService.isAuthenticated()).toBe(false);
        });

        it('should handle network errors during authentication gracefully', async () => {
            // Mock network error
            (global.fetch as jest.Mock).mockRejectedValueOnce(
                new Error('Network request failed')
            );

            // Attempt login
            const result = await authService.login('testuser', 'password123');

            // Verify error handling
            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');

            // Verify no tokens were stored
            expect(AsyncStorage.setItem).not.toHaveBeenCalledWith('accessToken', expect.any(String));

            // Verify authentication state
            expect(authService.isAuthenticated()).toBe(false);
        });

        it('should persist authentication state across app restarts', async () => {
            const mockUser = {
                id: 'test-user-id',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com'
            };

            // Mock stored tokens and user data
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('stored-access-token')
                .mockResolvedValueOnce('stored-refresh-token')
                .mockResolvedValueOnce(JSON.stringify(mockUser));

            // Initialize auth service (simulating app restart)
            await authService.initializeFromStorage();

            // Verify authentication state was restored
            expect(authService.isAuthenticated()).toBe(true);
            expect(authService.getCurrentUser()).toEqual(mockUser);
            expect(authService.getAccessToken()).toBe('stored-access-token');
        });

        it('should handle corrupted stored data gracefully', async () => {
            // Mock corrupted user data
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('valid-access-token')
                .mockResolvedValueOnce('valid-refresh-token')
                .mockResolvedValueOnce('invalid-json-data'); // Corrupted user data

            // Initialize auth service
            await authService.initializeFromStorage();

            // Verify corrupted data was handled
            expect(authService.isAuthenticated()).toBe(false);
            expect(authService.getCurrentUser()).toBeNull();

            // Verify corrupted data was cleared
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
        });
    });

    describe('Authentication Integration with Other Services', () => {
        it('should integrate authentication with database initialization', async () => {
            const mockUser = {
                id: 'test-user-id',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com'
            };

            // Mock successful login
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        user: mockUser,
                        accessToken: 'mock-access-token',
                        refreshToken: 'mock-refresh-token'
                    }
                })
            });

            // Mock database initialization
            mockDatabaseService.initializeDatabase.mockResolvedValueOnce(undefined);
            mockDatabaseService.cacheUserData.mockResolvedValueOnce(undefined);

            // Perform login
            const result = await authService.login('testuser', 'password123');

            expect(result.success).toBe(true);

            // Verify database was initialized with user data
            expect(mockDatabaseService.initializeDatabase).toHaveBeenCalled();
            expect(mockDatabaseService.cacheUserData).toHaveBeenCalledWith(mockUser);
        });

        it('should handle authentication errors during database operations', async () => {
            const mockUser = {
                id: 'test-user-id',
                username: 'testuser',
                name: 'Test User',
                email: 'test@example.com'
            };

            // Mock successful login
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        user: mockUser,
                        accessToken: 'mock-access-token',
                        refreshToken: 'mock-refresh-token'
                    }
                })
            });

            // Mock database error
            mockDatabaseService.initializeDatabase.mockRejectedValueOnce(
                new Error('Database initialization failed')
            );

            // Perform login
            const result = await authService.login('testuser', 'password123');

            // Login should still succeed even if database initialization fails
            expect(result.success).toBe(true);
            expect(authService.isAuthenticated()).toBe(true);

            // But database error should be logged/handled
            expect(mockDatabaseService.initializeDatabase).toHaveBeenCalled();
        });
    });
});