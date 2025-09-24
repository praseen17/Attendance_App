# Authentication Service Implementation

This directory contains the authentication service implementation for the offline attendance system.

## Overview

The authentication service provides JWT-based authentication with secure token storage, automatic token refresh, and comprehensive state management for the React Native attendance app.

## Architecture

### Core Components

1. **AuthService** (`authService.ts`) - Main authentication service class
2. **AuthProvider** (`../contexts/AuthContext.tsx`) - React context for authentication state
3. **useAuth** (`../hooks/useAuth.ts`) - React hooks for authentication operations
4. **AuthGuard** (`../components/AuthGuard.tsx`) - Navigation guard component
5. **ApiClient** (`apiClient.ts`) - Authenticated API client

## Features

### ✅ Implemented Features

- **JWT Authentication**: Secure login with JWT tokens
- **Secure Token Storage**: AsyncStorage integration for token persistence
- **Automatic Token Refresh**: Background token refresh before expiration
- **Authentication State Management**: React context for global auth state
- **Navigation Guards**: Automatic redirection based on auth status
- **Authenticated API Client**: HTTP client with automatic token handling
- **Offline Support**: Works with network connectivity detection
- **Error Handling**: Comprehensive error handling and recovery
- **Testing**: Complete test suite with mocks and integration tests

### 🔐 Security Features

- **Secure Storage**: Tokens stored securely using AsyncStorage
- **Token Expiration**: Automatic handling of token expiration
- **Refresh Token Rotation**: Secure token refresh mechanism
- **Concurrent Request Handling**: Prevents multiple simultaneous refresh requests
- **Automatic Logout**: Logout on failed token refresh

### 🚀 Performance Features

- **Background Refresh**: Tokens refreshed before expiration
- **Request Retry**: Automatic retry with refreshed tokens on 401 errors
- **State Persistence**: Authentication state persists across app restarts
- **Efficient Storage**: Minimal storage footprint

## Usage

### Basic Setup

```typescript
import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';

// Wrap your app with AuthProvider and AuthGuard
function App() {
  return (
    <AuthProvider>
      <AuthGuard>
        <YourAppComponents />
      </AuthGuard>
    </AuthProvider>
  );
}
```

### Using Authentication in Components

```typescript
import { useAuth } from '@/hooks/useAuth';

function LoginComponent() {
  const { login, isLoading, isAuthenticated } = useAuth();
  
  const handleLogin = async () => {
    const result = await login({
      username: 'faculty1',
      password: 'password123',
    });
    
    if (!result.success) {
      console.error('Login failed:', result.error);
    }
  };
  
  if (isAuthenticated) {
    return <Text>Welcome!</Text>;
  }
  
  return (
    <Button onPress={handleLogin} disabled={isLoading}>
      {isLoading ? 'Signing In...' : 'Sign In'}
    </Button>
  );
}
```

### Using Navigation with Authentication

```typescript
import { useAuthWithNavigation } from '@/hooks/useAuth';

function ProfileComponent() {
  const { logout, user, requireAuth } = useAuthWithNavigation();
  
  // Ensure user is authenticated
  if (!requireAuth()) {
    return null; // Will redirect to login
  }
  
  const handleLogout = async () => {
    await logout(); // Will redirect to login
  };
  
  return (
    <View>
      <Text>Welcome, {user?.name}!</Text>
      <Button onPress={handleLogout}>Logout</Button>
    </View>
  );
}
```

### Making Authenticated API Calls

```typescript
import { apiClient } from '@/services/apiClient';

// Using the API client (handles authentication automatically)
const response = await apiClient.get('/api/students/section/123');

if (response.success) {
  console.log('Students:', response.data);
} else {
  console.error('API Error:', response.error);
}

// Direct service usage
import { authService } from '@/services/authService';

const response = await authService.authenticatedFetch('/api/custom-endpoint', {
  method: 'POST',
  body: JSON.stringify({ data: 'example' }),
});
```

## API Reference

### AuthService Methods

```typescript
// Login with credentials
const result = await authService.login({
  username: 'faculty1',
  password: 'password123',
});

// Check authentication status
const isAuth = await authService.isAuthenticated();

// Get current token (refreshes if needed)
const token = await authService.getToken();

// Refresh token manually
const newToken = await authService.refreshToken();

// Get user profile
const user = await authService.getUserProfile();

// Logout
await authService.logout();

// Make authenticated request
const response = await authService.authenticatedFetch('/api/endpoint');
```

### Auth Context Interface

```typescript
interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  isInitialized: boolean;
  
  // Methods
  login: (credentials: LoginCredentials) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  getToken: () => Promise<string | null>;
}
```

### Navigation Hook Interface

```typescript
interface AuthWithNavigationHook extends AuthContextType {
  // Navigation helpers
  requireAuth: () => boolean;
  redirectToLogin: () => void;
  redirectToApp: () => void;
}
```

## Configuration

### Environment Variables

```bash
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000
```

### Storage Keys

The service uses the following AsyncStorage keys:

- `@auth/access_token` - JWT access token
- `@auth/refresh_token` - JWT refresh token
- `@auth/user_profile` - User profile data
- `@auth/token_expiry` - Token expiration timestamp

## Testing

The implementation includes comprehensive tests:

```bash
# Run authentication tests
npm test -- --testPathPattern="auth"

# Run specific test files
npm test services/__tests__/authService.test.ts
npm test services/__tests__/authService.integration.test.ts
npm test contexts/__tests__/AuthContext.test.tsx
npm test hooks/__tests__/useAuth.test.tsx
```

### Test Coverage

- ✅ Login/logout flows
- ✅ Token refresh mechanisms
- ✅ Authentication state management
- ✅ Navigation guards
- ✅ Error handling
- ✅ Concurrent request handling
- ✅ Storage operations
- ✅ API client integration

## Error Handling

### Common Error Scenarios

```typescript
// Network errors
try {
  const result = await authService.login(credentials);
} catch (error) {
  // Handle network connectivity issues
}

// Authentication failures
const result = await authService.login(credentials);
if (!result.success) {
  switch (result.error) {
    case 'Invalid credentials':
      // Show login error
      break;
    case 'Network error. Please check your connection.':
      // Show network error
      break;
  }
}

// Token refresh failures
authService.refreshToken().then(token => {
  if (!token) {
    // User was logged out due to refresh failure
    // Redirect to login handled automatically
  }
});
```

### Automatic Error Recovery

- **Token Expiration**: Automatically refreshes tokens before expiration
- **Network Errors**: Retries requests with exponential backoff
- **Invalid Tokens**: Automatically logs out user and redirects to login
- **Storage Errors**: Graceful degradation with error logging

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **1.1**: ✅ JWT authentication with credential validation
- **1.2**: ✅ Secure token storage using AsyncStorage
- **1.3**: ✅ Automatic token refresh mechanism
- **1.4**: ✅ Authentication state management
- **1.5**: ✅ Navigation guards and offline mode support

## Dependencies

- `@react-native-async-storage/async-storage`: Secure token storage
- `expo-router`: Navigation and routing
- `react`: React context and hooks

## File Structure

```
services/
├── authService.ts                    # Main authentication service
├── apiClient.ts                      # Authenticated API client
├── __tests__/                        # Test files
│   ├── authService.test.ts
│   ├── authService.integration.test.ts
│   └── ...
└── README-auth.md                    # This file

contexts/
├── AuthContext.tsx                   # Authentication context provider
└── __tests__/
    └── AuthContext.test.tsx

hooks/
├── useAuth.ts                        # Authentication hooks
└── __tests__/
    └── useAuth.test.tsx

components/
└── AuthGuard.tsx                     # Navigation guard component
```

## Next Steps

This authentication service is ready for integration with:

1. **Sync Service** (Task 14) - Will use authenticated API calls for sync
2. **WebSocket Client** (Task 11) - Will use auth tokens for WebSocket connections
3. **Attendance Capture** (Task 12) - Will use auth context for user identification
4. **Network Detection** (Task 13) - Will integrate with offline mode handling

The authentication foundation is complete and tested, ready for the next implementation tasks.