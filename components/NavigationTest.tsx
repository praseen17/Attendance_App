import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export const NavigationTest = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation Test</Text>
      <Text style={styles.description}>
        The navigation bar should be visible on the left side.
        {'\n\n'}
        • In collapsed mode: Shows only icons (70px width)
        {'\n'}
        • In expanded mode: Shows icons + labels (280px width)
        {'\n'}
        • Click the menu button to toggle between states
        {'\n'}
        • Content area maintains full width and gets overlapped
      </Text>
      
      <View style={styles.testBox}>
        <Text style={styles.testText}>
          This content area should be overlapped by the navigation bar,
          not pushed to the right when the nav expands.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  testBox: {
    backgroundColor: Colors.light.surface,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderStyle: 'dashed',
  },
  testText: {
    fontSize: 14,
    color: Colors.light.text,
    fontStyle: 'italic',
  },
});