import { Stack, useRouter, usePathname } from 'expo-router';
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { renderIcon } from '@/constants/icons';
import { Colors } from '@/constants/theme';

const COLLAPSED_WIDTH = 70;
const EXPANDED_WIDTH = 280;

const Sidebar = ({ 
  isExpanded, 
  sidebarWidth, 
  insets, 
  toggleNavigation 
}: { 
  isExpanded: boolean; 
  sidebarWidth: any; 
  insets: any; 
  toggleNavigation: () => void 
}) => {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', route: '/', icon: 'dashboard', color: Colors.light.primary },
    { name: 'Attendance Capture', route: '/attendance-capture', icon: 'camera', color: Colors.light.success },
    { name: 'Attendance', route: '/attendance', icon: 'attendance', color: Colors.light.success },
    { name: 'Manual Entry', route: '/manual', icon: 'manual', color: Colors.light.warning },
    { name: 'Students', route: '/students', icon: 'students', color: Colors.light.primaryLight },
    { name: 'Classes', route: '/classes', icon: 'classes', color: Colors.light.accent },
    { name: 'Reports', route: '/reports', icon: 'reports', color: Colors.light.info },
    { name: 'Settings', route: '/settings', icon: 'settings', color: Colors.light.textSecondary },
  ];

  return (
    <Animated.View style={{
      width: sidebarWidth,
      backgroundColor: Colors.light.surface,
      borderRightWidth: 1,
      borderRightColor: Colors.light.border,
      paddingTop: insets.top + 20,
      paddingHorizontal: isExpanded ? 16 : 8,
      shadowColor: '#000',
      shadowOffset: { width: 6, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 12,
      height: '100%',
    }}>
      {/* Header */}
      <View style={{
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.borderLight,
        alignItems: isExpanded ? 'flex-start' : 'center',
      }}>
        {isExpanded ? (
          <>
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
          </>
        ) : (
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.light.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '700',
              color: Colors.light.textOnPrimary,
            }}>
              FE
            </Text>
          </View>
        )}
      </View>

      {/* Toggle Button */}
      <TouchableOpacity
        onPress={toggleNavigation}
        style={{
          alignSelf: isExpanded ? 'flex-end' : 'center',
          marginBottom: 20,
          padding: 8,
          borderRadius: 6,
          backgroundColor: Colors.light.backgroundSecondary,
        }}
      >
        {renderIcon('menu', 20, Colors.light.textSecondary)}
      </TouchableOpacity>

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
              flexDirection: isExpanded ? 'row' : 'column',
              alignItems: 'center',
              paddingVertical: 12,
              paddingHorizontal: isExpanded ? 12 : 8,
              marginBottom: 6,
              borderRadius: 8,
              backgroundColor: isActive ? `${item.color}15` : 'transparent',
              borderLeftWidth: isActive && isExpanded ? 3 : 0,
              borderLeftColor: item.color,
              justifyContent: isExpanded ? 'flex-start' : 'center',
              minHeight: 44,
            }}
          >
            <View style={{
              marginRight: isExpanded ? 12 : 0,
              marginBottom: isExpanded ? 0 : 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {renderIcon(item.icon as any, 22, isActive ? item.color : Colors.light.textSecondary)}
            </View>
            {isExpanded ? (
              <Text style={{
                fontSize: 16,
                fontWeight: isActive ? '600' : '500',
                color: isActive ? item.color : '#374151',
                flex: 1,
              }}>
                {item.name}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};



export default function TabLayout() {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const toggleNavigation = () => {
    const targetOpacity = isExpanded ? 0 : 0.6;
    setIsExpanded(!isExpanded);

    // Animate backdrop opacity
    Animated.timing(backdropOpacity, {
      toValue: targetOpacity,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      {/* Always Visible Collapsed Sidebar - 15% width */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: COLLAPSED_WIDTH,
        zIndex: 1001, // Above content but below popup
      }}>
        <Sidebar
          isExpanded={false} // Always collapsed for the permanent sidebar
          sidebarWidth={COLLAPSED_WIDTH}
          insets={insets}
          toggleNavigation={toggleNavigation}
        />
      </View>

      {/* Main Content Area - Adjusted for permanent sidebar */}
      <View style={{ 
        flex: 1, 
        backgroundColor: Colors.light.backgroundSecondary,
        marginLeft: COLLAPSED_WIDTH, // Always account for sidebar
      }}>
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

        {/* Content Area */}
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
      </View>

      {/* Backdrop Overlay - Only when expanded */}
      {isExpanded && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            opacity: backdropOpacity,
            zIndex: 999,
          }}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={toggleNavigation}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Popup Expanded Sidebar - Only when menu is tapped */}
      {isExpanded && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: EXPANDED_WIDTH,
          zIndex: 1002, // Above everything
        }}>
          <Sidebar
            isExpanded={true} // Always expanded for the popup
            sidebarWidth={EXPANDED_WIDTH}
            insets={insets}
            toggleNavigation={toggleNavigation}
          />
        </View>
      )}
    </View>
  );
}
