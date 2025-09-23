/**
 * Professional Blue Theme for Faculty ERP
 * Consistent blue color palette for a professional appearance
 */

import { Platform } from 'react-native';

// Professional Blue Color Palette
const primaryBlue = '#1e40af';      // Primary blue
const lightBlue = '#3b82f6';        // Light blue
const darkBlue = '#1e3a8a';         // Dark blue
const accentBlue = '#60a5fa';       // Accent blue
const backgroundBlue = '#f0f9ff';   // Very light blue background

export const Colors = {
  light: {
    // Primary colors
    primary: primaryBlue,
    primaryLight: lightBlue,
    primaryDark: darkBlue,
    accent: accentBlue,
    
    // Background colors
    background: '#ffffff',
    backgroundSecondary: backgroundBlue,
    surface: '#ffffff',
    
    // Text colors
    text: '#1f2937',
    textSecondary: '#6b7280',
    textLight: '#9ca3af',
    textOnPrimary: '#ffffff',
    
    // UI elements
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    shadow: '#000000',
    
    // Status colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: lightBlue,
    
    // Legacy support
    tint: primaryBlue,
    icon: '#6b7280',
    tabIconDefault: '#9ca3af',
    tabIconSelected: primaryBlue,
  },
  dark: {
    // Primary colors
    primary: accentBlue,
    primaryLight: '#93c5fd',
    primaryDark: primaryBlue,
    accent: '#bfdbfe',
    
    // Background colors
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    surface: '#1e293b',
    
    // Text colors
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textLight: '#94a3b8',
    textOnPrimary: '#0f172a',
    
    // UI elements
    border: '#334155',
    borderLight: '#475569',
    shadow: '#000000',
    
    // Status colors
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    info: accentBlue,
    
    // Legacy support
    tint: accentBlue,
    icon: '#cbd5e1',
    tabIconDefault: '#94a3b8',
    tabIconSelected: accentBlue,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
