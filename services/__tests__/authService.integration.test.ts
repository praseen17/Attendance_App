import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../authService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AuthService Integration', () => {
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

    it('should complete full authentication flow', async () => {
        const mockUser = {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            sections: ['section1'],
        };

        const mockLoginResponse = {
            token: 'access-token',
            refreshToken: 'refresh-token',
            user: mockUser,
            expiresIn: 3600,
        };

        // Mock successful login
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockLoginResponse,
        } as Response);

        // Test login
        const loginResult = await authService.login({
            username: 'testuser',
            password: 'testpass',
        });

        expect(loginResult.success).toBe(true);
        expect(loginResult.user).toEqual(mockUser);

        // Verify tokens are stored
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
            '@auth/access_token',
            'access-token'
        );
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
            '@auth/refresh_token',
            'refresh-token'
        );

        // Mock stored data for authentication check
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        mockAsyncStorage.getItem
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce(futureDate.toISOString());

        // Test authentication check
        const isAuth = await authService.isAuthenticated();
        expect(isAuth).toBe(true);

        // Test getting token
        mockAsyncStorage.getItem
            .mockResolvedValueOnce('access-token')
            .mockResolvedValueOnce(futureDate.toISOString());

        const token = await authService.getToken();
        expect(token).toBe('access-token');

        // Test logout
        await authService.logout();

        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/access_token');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/refresh_token');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/user_profile');
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@auth/token_expiry');
    });

    it('should handle authentication failure gracefully', async () => {
        // Mock failed login
        mockFetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Invalid credentials' }),
        } as Response);

        const loginResult = await authService.login({
            username: 'wronguser',
            password: 'wrongpass',
        });

        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');

        // Verify no tokens are stored
        expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();

        // Mock no stored tokens
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const isAuth = await authService.isAuthenticated();
        expect(isAuth).toBe(false);
    });

    it('should handle token refresh flow', async () => {
        // Mock expired token scenario
        const pastDate = new Date(Date.now() - 60 * 60 * 1000);
        mockAsyncStorage.getItem
            .mockResolvedValueOnce('expired-token')
            .mockResolvedValueOnce(pastDate.toISOString())
            .mockResolvedValueOnce('refresh-token');

        // Mock successful refresh
        const mockRefreshResponse = {
            token: 'new-access-token',
            refreshToken: 'new-refresh-token',
            expiresIn: 3600,
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockRefreshResponse,
        } as Response);

        const isAuth = await authService.isAuthenticated();
        expect(isAuth).toBe(true);

        // Verify refresh API was called
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/auth/refresh'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ refreshToken: 'refresh-token' }),
            })
        );

        // Verify new tokens are stored
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
            '@auth/access_token',
            'new-access-token'
        );
    });
});