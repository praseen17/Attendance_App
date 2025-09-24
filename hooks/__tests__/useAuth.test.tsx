import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuthWithNavigation } from '../useAuth';
import { authService } from '@/services/authService';

// Mock expo-router
const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissTo: jest.fn(),
    dismissAll: jest.fn(),
    canDismiss: jest.fn(),
    setParams: jest.fn(),
};

jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    useSegments: () => [],
}));

// Mock the auth service
jest.mock('@/services/authService', () => ({
    authService: {
        initialize: jest.fn(),
        isAuthenticated: jest.fn(),
        getUserProfile: jest.fn(),
        login: jest.fn(),
        logout: jest.fn(),
        refreshToken: jest.fn(),
        getToken: jest.fn(),
    },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;

// Test component that uses the auth hook
function TestComponent() {
    const auth = useAuthWithNavigation();

    return (
        <View>
            <Text testID="isAuthenticated">{auth.isAuthenticated.toString()}</Text>
            <Text testID="isLoading">{auth.isLoading.toString()}</Text>
            <Text testID="isInitialized">{auth.isInitialized.toString()}</Text>
            <Text testID="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</Text>
        </View>
    );
}

describe('useAuthWithNavigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should provide auth state and navigation methods', async () => {
        mockAuthService.initialize.mockResolvedValue();
        mockAuthService.isAuthenticated.mockResolvedValue(false);
        mockAuthService.getUserProfile.mockResolvedValue(null);

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId('isInitialized').children[0]).toBe('true');
        });

        expect(getByTestId('isLoading').children[0]).toBe('false');
        expect(getByTestId('isAuthenticated').children[0]).toBe('false');
    });

    it('should navigate to main app after successful login', async () => {
        const mockUser = {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            sections: ['section1'],
        };

        const mockLoginResult = {
            success: true,
            token: 'mock-token',
            user: mockUser,
        };

        mockAuthService.initialize.mockResolvedValue();
        mockAuthService.isAuthenticated.mockResolvedValue(false);
        mockAuthService.getUserProfile.mockResolvedValue(null);
        mockAuthService.login.mockResolvedValue(mockLoginResult);

        let authHook: any;

        function TestComponentWithLogin() {
            authHook = useAuthWithNavigation();
            return <TestComponent />;
        }

        render(
            <AuthProvider>
                <TestComponentWithLogin />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(authHook.isInitialized).toBe(true);
        });

        await act(async () => {
            const result = await authHook.login({
                username: 'testuser',
                password: 'testpass',
            });
            expect(result).toEqual(mockLoginResult);
        });

        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });

    it('should navigate to login after logout', async () => {
        const mockUser = {
            id: '1',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            sections: ['section1'],
        };

        mockAuthService.initialize.mockResolvedValue();
        mockAuthService.isAuthenticated.mockResolvedValue(true);
        mockAuthService.getUserProfile.mockResolvedValue(mockUser);
        mockAuthService.logout.mockResolvedValue();

        let authHook: any;

        function TestComponentWithLogout() {
            authHook = useAuthWithNavigation();
            return <TestComponent />;
        }

        render(
            <AuthProvider>
                <TestComponentWithLogout />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(authHook.isInitialized).toBe(true);
        });

        await act(async () => {
            await authHook.logout();
        });

        expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });
});