import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeProvider as CustomThemeProvider } from '@/contexts/ThemeContext';
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { SyncProvider } from '@/contexts/SyncContext';
import { AuthGuard } from '@/components/AuthGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <DatabaseProvider>
          <NetworkProvider>
            <AuthProvider>
              <CustomThemeProvider>
                <PaperProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <SyncProvider>
                      <AuthGuard>
                        <Stack initialRouteName="login">
                          <Stack.Screen name="login" options={{ headerShown: false }} />
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                        </Stack>
                      </AuthGuard>
                    </SyncProvider>
                    <StatusBar style="auto" />
                  </ThemeProvider>
                </PaperProvider>
              </CustomThemeProvider>
            </AuthProvider>
          </NetworkProvider>
        </DatabaseProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
