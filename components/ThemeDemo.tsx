/**
 * Theme Demo Component
 * Showcases the professional blue theme and icon system
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { renderIcon, IconName } from '@/constants/icons';
import { Colors } from '@/constants/theme';

const iconList: IconName[] = [
  'dashboard', 'attendance', 'manual', 'students', 'classes', 'reports', 'settings',
  'camera', 'user', 'graduation', 'present', 'absent', 'completed'
];

export const ThemeDemo: React.FC = () => {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}>
      <View style={{ padding: 20 }}>
        {/* Header */}
        <View style={{
          backgroundColor: Colors.light.surface,
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
          shadowColor: Colors.light.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 24,
            fontWeight: '700',
            color: Colors.light.text,
            marginBottom: 8,
          }}>
            Professional Blue Theme
          </Text>
          <Text style={{
            fontSize: 16,
            color: Colors.light.textSecondary,
          }}>
            Clean, professional interface with consistent blue color palette
          </Text>
        </View>

        {/* Color Palette */}
        <View style={{
          backgroundColor: Colors.light.surface,
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: Colors.light.text,
            marginBottom: 16,
          }}>
            Color Palette
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 50,
                height: 50,
                backgroundColor: Colors.light.primary,
                borderRadius: 8,
                marginBottom: 4,
              }} />
              <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>Primary</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 50,
                height: 50,
                backgroundColor: Colors.light.primaryLight,
                borderRadius: 8,
                marginBottom: 4,
              }} />
              <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>Light</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 50,
                height: 50,
                backgroundColor: Colors.light.accent,
                borderRadius: 8,
                marginBottom: 4,
              }} />
              <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>Accent</Text>
            </View>
            
            <View style={{ alignItems: 'center' }}>
              <View style={{
                width: 50,
                height: 50,
                backgroundColor: Colors.light.success,
                borderRadius: 8,
                marginBottom: 4,
              }} />
              <Text style={{ fontSize: 12, color: Colors.light.textSecondary }}>Success</Text>
            </View>
          </View>
        </View>

        {/* Professional Icons */}
        <View style={{
          backgroundColor: Colors.light.surface,
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: Colors.light.text,
            marginBottom: 16,
          }}>
            Professional Icons
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {iconList.map((iconName) => (
              <View key={iconName} style={{ alignItems: 'center', width: 60 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  backgroundColor: Colors.light.backgroundSecondary,
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 4,
                }}>
                  {renderIcon(iconName, 20, Colors.light.primary)}
                </View>
                <Text style={{
                  fontSize: 10,
                  color: Colors.light.textSecondary,
                  textAlign: 'center',
                }}>
                  {iconName}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Button Examples */}
        <View style={{
          backgroundColor: Colors.light.surface,
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: Colors.light.text,
            marginBottom: 16,
          }}>
            Button Styles
          </Text>
          
          <TouchableOpacity style={{
            backgroundColor: Colors.light.primary,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <View style={{ marginRight: 8 }}>
              {renderIcon('camera', 18, Colors.light.textOnPrimary)}
            </View>
            <Text style={{
              color: Colors.light.textOnPrimary,
              fontWeight: '600',
            }}>
              Primary Action
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{
            backgroundColor: Colors.light.success,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}>
            <View style={{ marginRight: 8 }}>
              {renderIcon('present', 18, Colors.light.textOnPrimary)}
            </View>
            <Text style={{
              color: Colors.light.textOnPrimary,
              fontWeight: '600',
            }}>
              Success Action
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};