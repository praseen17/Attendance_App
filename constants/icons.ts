/**
 * Professional Icon Mapping
 * Maps emoji icons to professional React Native Vector Icons
 */

import { MaterialIcons, Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';

export const IconMap = {
  // Navigation Icons
  dashboard: { component: MaterialIcons, name: 'dashboard' },
  attendance: { component: MaterialIcons, name: 'check-circle' },
  manual: { component: Feather, name: 'edit-3' },
  students: { component: Ionicons, name: 'people' },
  classes: { component: MaterialIcons, name: 'school' },
  reports: { component: Ionicons, name: 'bar-chart' },
  settings: { component: Ionicons, name: 'settings' },
  
  // Action Icons
  camera: { component: Ionicons, name: 'camera' },
  add: { component: Ionicons, name: 'add' },
  edit: { component: Feather, name: 'edit-2' },
  delete: { component: MaterialIcons, name: 'delete' },
  save: { component: Ionicons, name: 'save' },
  search: { component: Ionicons, name: 'search' },
  filter: { component: Ionicons, name: 'filter' },
  
  // Status Icons
  present: { component: MaterialIcons, name: 'check-circle' },
  absent: { component: MaterialIcons, name: 'cancel' },
  completed: { component: MaterialIcons, name: 'check-circle' },
  ongoing: { component: MaterialIcons, name: 'schedule' },
  upcoming: { component: MaterialIcons, name: 'access-time' },
  
  // User Icons
  user: { component: Ionicons, name: 'person' },
  users: { component: Ionicons, name: 'people' },
  profile: { component: Ionicons, name: 'person-circle' },
  
  // General Icons
  home: { component: Ionicons, name: 'home' },
  back: { component: Ionicons, name: 'arrow-back' },
  forward: { component: Ionicons, name: 'arrow-forward' },
  close: { component: Ionicons, name: 'close' },
  menu: { component: Ionicons, name: 'menu' },
  more: { component: Ionicons, name: 'ellipsis-horizontal' },
  
  // Academic Icons
  graduation: { component: FontAwesome5, name: 'graduation-cap' },
  book: { component: Ionicons, name: 'book' },
  calendar: { component: Ionicons, name: 'calendar' },
  time: { component: Ionicons, name: 'time' },
  assignment: { component: MaterialIcons, name: 'assignment' },
  schedule: { component: MaterialIcons, name: 'schedule' },
  
  // Communication Icons
  notification: { component: Ionicons, name: 'notifications' },
  email: { component: Ionicons, name: 'mail' },
  phone: { component: Ionicons, name: 'call' },
  
  // File Icons
  document: { component: Ionicons, name: 'document' },
  download: { component: Ionicons, name: 'download' },
  upload: { component: Ionicons, name: 'cloud-upload' },
  
  // Security Icons
  lock: { component: Ionicons, name: 'lock-closed' },
  unlock: { component: Ionicons, name: 'lock-open' },
  eye: { component: Ionicons, name: 'eye' },
  eyeOff: { component: Ionicons, name: 'eye-off' },
};

export type IconName = keyof typeof IconMap;

// Helper component for rendering icons
import React from 'react';

export const renderIcon = (iconName: IconName, size: number = 24, color: string = '#6b7280') => {
  const iconConfig = IconMap[iconName];
  if (!iconConfig) return null;
  
  const IconComponent = iconConfig.component;
  return React.createElement(IconComponent, {
    name: iconConfig.name as any,
    size,
    color
  });
};