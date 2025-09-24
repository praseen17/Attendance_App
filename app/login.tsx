import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuthWithNavigation } from '@/hooks/useAuth';
import { renderIcon } from '@/constants/icons';
import { Colors } from '@/constants/theme';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, isAuthenticated, isLoading: authLoading, redirectToApp } = useAuthWithNavigation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('👤 Already authenticated, redirecting...');
      redirectToApp();
    }
  }, [isAuthenticated, redirectToApp]);

  const handleLogin = async () => {
    console.log('🔐 Login button pressed');

    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Starting login process...');

      const result = await login({
        username: username.trim(),
        password: password.trim(),
      });

      if (!result.success) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials. Please try again.');
      }
      // Success navigation is handled by the login function

    } catch (error) {
      console.error('🚨 Login screen error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  const isButtonDisabled = isLoading || authLoading;
  const isFormValid = username.trim() && password.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              {renderIcon('graduation', 36, Colors.light.textOnPrimary)}
            </View>
            <Text style={styles.appTitle}>Faculty ERP</Text>
            <Text style={styles.appSubtitle}>Attendance Management System</Text>
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.formSection}>
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.loginSubtext}>Sign in to your account</Text>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your username"
                placeholderTextColor="#9ca3af"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={true}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={true}
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (isButtonDisabled || !isFormValid) && styles.loginButtonDisabled
              ]}
              onPress={handleLogin}
              disabled={isButtonDisabled || !isFormValid}
              activeOpacity={0.8}
            >
              {isLoading || authLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.loginButtonText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Quick Login Options */}
            <View style={styles.quickLoginContainer}>
              <Text style={styles.quickLoginTitle}>Quick Login (Demo):</Text>

              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('john.smith', 'SecurePass123!')}
                disabled={isLoading || authLoading}
              >
                <Text style={styles.quickLoginText}>Dr. John Smith (CS)</Text>
                <Text style={styles.quickLoginSubtext}>john.smith / SecurePass123!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('sarah.johnson', 'SecurePass456!')}
                disabled={isLoading || authLoading}
              >
                <Text style={styles.quickLoginText}>Prof. Sarah Johnson (IT)</Text>
                <Text style={styles.quickLoginSubtext}>sarah.johnson / SecurePass456!</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLoginButton}
                onPress={() => handleQuickLogin('admin', 'AdminPass2024!')}
                disabled={isLoading || authLoading}
              >
                <Text style={styles.quickLoginText}>System Administrator</Text>
                <Text style={styles.quickLoginSubtext}>admin / AdminPass2024!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>
            © 2024 Faculty ERP. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: height,
  },
  headerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  loginButton: {
    height: 52,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickLoginContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  quickLoginTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickLoginButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  quickLoginText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 2,
  },
  quickLoginSubtext: {
    fontSize: 11,
    color: '#0284c7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footerSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});