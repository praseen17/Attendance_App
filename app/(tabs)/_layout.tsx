import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Dimensions, Animated } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { renderIcon } from '@/constants/icons';
import { Colors } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const Sidebar = ({ isVisible, sidebarTranslateX, insets, toggleNavigation }: { isVisible: boolean; sidebarTranslateX: any; insets: any; toggleNavigation: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', route: '/', icon: 'dashboard', color: Colors.light.primary },
    { name: 'Attendance Capture', route: '/attendance-capture', icon: 'attendance', color: Colors.light.success },
    { name: 'Attendance', route: '/attendance', icon: 'attendance', color: Colors.light.success },
    { name: 'Manual Entry', route: '/manual', icon: 'manual', color: Colors.light.warning },
    { name: 'Students', route: '/students', icon: 'students', color: Colors.light.primaryLight },
    { name: 'Classes', route: '/classes', icon: 'classes', color: Colors.light.accent },
    { name: 'Reports', route: '/reports', icon: 'reports', color: Colors.light.info },
    { name: 'Settings', route: '/settings', icon: 'settings', color: Colors.light.textSecondary },
  ];

  return (
    <Animated.View style={{
      width: 280,
      backgroundColor: Colors.light.surface,
      borderRightWidth: 1,
      borderRightColor: Colors.light.border,
      paddingTop: insets.top + 20,
      paddingHorizontal: 16,
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      transform: [{ translateX: sidebarTranslateX }],
    }}>
      {/* Header */}
      <View style={{
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '700',
          color: Colors.light.text,
          marginBottom: 4,
        }}>
          Faculty ERP
        </Text>
        <Text style={{
          fontSize: 14,
          color: Colors.light.textSecondary,
          fontWeight: '500',
        }}>
          Attendance Management System
        </Text>
      </View>

      {/* Menu Items */}
      {menuItems.map((item) => {
        const isActive = pathname === item.route ||
          (item.route === '/' && pathname === '/index') ||
          (item.route === '/attendance' && (pathname === '/attendance' || pathname === '/camera')) ||
          (item.route === '/attendance-capture' && pathname === '/attendance-capture');

        return (
          <TouchableOpacity
            key={item.name}
            onPress={() => {
              if (item.route === '/') {
                router.push('/');
              } else if (item.route === '/attendance') {
                router.push('/attendance');
              } else if (item.route === '/attendance-capture') {
                router.push('/attendance-capture');
              } else {
                router.push(item.route as any);
              }
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: 12,
              marginBottom: 6,
              borderRadius: 8,
              backgroundColor: isActive ? `${item.color}15` : 'transparent',
              borderLeftWidth: isActive ? 3 : 0,
              borderLeftColor: item.color,
              justifyContent: 'flex-start',
              minHeight: 44,
            }}
          >
            <View style={{
              marginRight: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {renderIcon(item.icon as any, 22, isActive ? item.color : Colors.light.textSecondary)}
            </View>
            <Text style={{
              fontSize: 16,
              fontWeight: isActive ? '600' : '500',
              color: isActive ? item.color : '#374151',
              flex: 1,
            }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};



export default function TabLayout() {
  const [isNavVisible, setIsNavVisible] = useState(false); // Start collapsed
  const [sidebarTranslateX] = useState(new Animated.Value(-280)); // Start off-screen
  const [toggleButtonTranslateX] = useState(new Animated.Value(0)); // Toggle button position
  const [backdropOpacity] = useState(new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', route: '/', icon: 'dashboard', color: Colors.light.primary },
    { name: 'Attendance Capture', route: '/attendance-capture', icon: 'attendance', color: Colors.light.success },
    { name: 'Attendance', route: '/attendance', icon: 'attendance', color: Colors.light.success },
    { name: 'Manual Entry', route: '/manual', icon: 'manual', color: Colors.light.warning },
    { name: 'Students', route: '/students', icon: 'students', color: Colors.light.primaryLight },
    { name: 'Classes', route: '/classes', icon: 'classes', color: Colors.light.accent },
    { name: 'Reports', route: '/reports', icon: 'reports', color: Colors.light.info },
    { name: 'Settings', route: '/settings', icon: 'settings', color: Colors.light.textSecondary },
  ];

  const toggleNavigation = () => {
    const sidebarTarget = isNavVisible ? -280 : 0; // Slide in/out
    const toggleButtonTarget = isNavVisible ? 0 : 260; // Move toggle button with sidebar
    const backdropTarget = isNavVisible ? 0 : 0.5; // Fade backdrop

    setIsNavVisible(!isNavVisible);

    // Animate sidebar slide
    Animated.timing(sidebarTranslateX, {
      toValue: sidebarTarget,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate toggle button movement
    Animated.timing(toggleButtonTranslateX, {
      toValue: toggleButtonTarget,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate backdrop fade
    Animated.timing(backdropOpacity, {
      toValue: backdropTarget,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      {/* Clean Header Bar */}
      <View style={{
        backgroundColor: Colors.light.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingBottom: 16,
        paddingHorizontal: 20,
        paddingTop: insets.top + 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{
          fontSize: 20,
          fontWeight: '700',
          color: Colors.light.text,
          flex: 1,
          textAlign: 'center',
        }}>
          Faculty ERP
        </Text>
      </View>

      {/* Main Content Area - Always Full Width */}
      <View style={{ flex: 1 }}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="attendance-capture" />
          <Stack.Screen name="attendance" />
          <Stack.Screen name="camera" />
          <Stack.Screen name="students" />
          <Stack.Screen name="records" />
          <Stack.Screen name="manual" />
          <Stack.Screen name="classes" />
          <Stack.Screen name="reports" />
          <Stack.Screen name="settings" />
        </Stack>
      </View>

      {/* Moving Toggle Button - Slides with Sidebar */}
      <Animated.View
        style={{
          position: 'absolute',
          top: insets.top + 20,
          left: 20,
          zIndex: 1001,
          transform: [{ translateX: toggleButtonTranslateX }],
        }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          onPress={toggleNavigation}
          style={{
            width: 60,
            height: 60,
            borderRadius: 12,
            backgroundColor: Colors.light.primary,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          activeOpacity={0.8}
        >
          <View style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              marginBottom: 4,
            }}>
              <View style={{
                width: 16,
                height: 2,
                backgroundColor: Colors.light.textOnPrimary,
                marginBottom: 2,
                borderRadius: 1,
              }} />
              <View style={{
                width: 16,
                height: 2,
                backgroundColor: Colors.light.textOnPrimary,
                marginBottom: 2,
                borderRadius: 1,
              }} />
              <View style={{
                width: 16,
                height: 2,
                backgroundColor: Colors.light.textOnPrimary,
                borderRadius: 1,
              }} />
            </View>
            <Text style={{
              color: Colors.light.textOnPrimary,
              fontSize: 10,
              fontWeight: '600',
              textAlign: 'center',
            }}>
              Menu
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Backdrop Overlay - Only visible when sidebar is open */}
      {isNavVisible && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            opacity: backdropOpacity,
            zIndex: 1000,
          }}
          pointerEvents="auto"
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={toggleNavigation}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Slide-out Sidebar */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 1000,
        pointerEvents: isNavVisible ? 'auto' : 'none',
      }}>
        <Sidebar
          isVisible={isNavVisible}
          sidebarTranslateX={sidebarTranslateX}
          insets={insets}
          toggleNavigation={toggleNavigation}
        />
      </View>
    </View>
  );
}
