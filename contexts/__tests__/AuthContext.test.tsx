import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '@/services/authService';

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

// Test component that uses the auth context
function TestComponent() {
    const {
        isAuthenticated,
        isLoading,
        user,
        isInitialized,
    } = useAuth();

    return (
        <View>
            <Text testID="isAuthenticated">{isAuthenticated.toString()}</Text>
            <Text testID="isLoading">{isLoading.toString()}</Text>
            <Text testID="isInitialized">{isInitialized.toString()}</Text>
            <Text testID="user">{user ? JSON.stringify(user) : 'null'}</Text>
        </View>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with loading state', () => {
        mockAuthService.initialize.mockResolvedValue();
        mockAuthService.isAuthenticated.mockResolvedValue(false);
        mockAuthService.getUserProfile.mockResolvedValue(null);

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(getByTestId('isLoading').children[0]).toBe('true');
        expect(getByTestId('isInitialized').children[0]).toBe('false');
        expect(getByTestId('isAuthenticated').children[0]).toBe('false');
    });

    it('should initialize with authenticated user', async () => {
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

        const { getByTestId } = render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(getByTestId('isInitialized').children[0]).toBe('true');
        });

        expect(getByTestId('isLoading').children[0]).toBe('false');
        expect(getByTestId('isAuthenticated').children[0]).toBe('true');
        expect(getByTestId('user').children[0]).toBe(JSON.stringify(mockUser));
    });

    it('should handle login successfully', async () => {
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

        let authContext: any;

        function TestComponentWithLogin() {
            authContext = useAuth();
            return <TestComponent />;
        }

        render(
            <AuthProvider>
                <TestComponentWithLogin />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(authContext.isInitialized).toBe(true);
        });

        await act(async () => {
            const result = await authContext.login({
                username: 'testuser',
                password: 'testpass',
            });
            expect(result).toEqual(mockLoginResult);
        });

        expect(authContext.isAuthenticated).toBe(true);
        expect(authContext.user).toEqual(mockUser);
    });

    it('should throw error when used outside provider', () => {
        expect(() => {
            render(<TestComponent />);
        }).toThrow('useAuth must be used within an AuthProvider');
    });
});