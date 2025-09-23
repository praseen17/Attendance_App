import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  Platform,
  Share,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, colors } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [faceRecognition, setFaceRecognition] = useState(false);
  const [facultyName, setFacultyName] = useState('Dr. John Smith');
  const [department, setDepartment] = useState('Computer Science');
  const [email, setEmail] = useState('john.smith@university.edu');
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState('Never');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setNotifications(settings.notifications ?? true);
        setAutoBackup(settings.autoBackup ?? true);
        setFaceRecognition(settings.faceRecognition ?? false);
        setFacultyName(settings.facultyName ?? 'Dr. John Smith');
        setDepartment(settings.department ?? 'Computer Science');
        setEmail(settings.email ?? 'john.smith@university.edu');
        setLastBackup(settings.lastBackup ?? 'Never');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleSaveProfile = async () => {
    if (!facultyName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }
    if (!department.trim()) {
      Alert.alert('Error', 'Please enter your department');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const newSettings = {
        notifications,
        autoBackup,
        faceRecognition,
        facultyName,
        department,
        email,
        lastBackup,
        darkMode: isDarkMode,
      };
      
      await saveSettings(newSettings);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const data = {
        settings: { notifications, autoBackup, faceRecognition, facultyName, department, email },
        exportDate: new Date().toISOString(),
      };
      
      await Share.share({
        message: JSON.stringify(data, null, 2),
        title: 'Faculty ERP - Settings Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const newSettings = {
        notifications,
        autoBackup,
        faceRecognition,
        facultyName,
        department,
        email,
        lastBackup: new Date().toLocaleDateString(),
        darkMode: isDarkMode,
      };
      
      await saveSettings(newSettings);
      setLastBackup(new Date().toLocaleDateString());
      
      Alert.alert(
        'Backup Complete',
        'Your data has been successfully backed up.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Backup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={colors.textSecondary}
              value={facultyName}
              onChangeText={setFacultyName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Department"
              placeholderTextColor={colors.textSecondary}
              value={department}
              onChangeText={setDepartment}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>App Settings</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Auto Backup</Text>
            <Switch
              value={autoBackup}
              onValueChange={setAutoBackup}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={autoBackup ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          
          <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Face Recognition</Text>
            <Switch
              value={faceRecognition}
              onValueChange={setFaceRecognition}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={faceRecognition ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.primary }]} 
            onPress={handleExportData}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Export Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10b981' }]} 
            onPress={handleBackup}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Creating Backup...' : 'Backup Data'}
            </Text>
          </TouchableOpacity>
          
          <Text style={[styles.lastBackupText, { color: colors.textSecondary }]}>
            Last backup: {lastBackup}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as 'bold',
    marginBottom: 30,
    textAlign: 'center' as 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as '600',
    marginBottom: 15,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center' as 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as '600',
  },
  settingItem: {
    flexDirection: 'row' as 'row',
    justifyContent: 'space-between' as 'space-between',
    alignItems: 'center' as 'center',
    borderRadius: 12,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500' as '500',
  },
  actionButton: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center' as 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as '600',
  },
  lastBackupText: {
    fontSize: 14,
    textAlign: 'center' as 'center',
    marginTop: 10,
  },
});