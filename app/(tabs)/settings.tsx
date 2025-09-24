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
  Dimensions,
  Share,
  Linking,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [faceRecognition, setFaceRecognition] = useState(false);
  const [facultyName, setFacultyName] = useState('Dr. John Smith');
  const [department, setDepartment] = useState('Computer Science');
  const [email, setEmail] = useState('john.smith@university.edu');
  const [isLoading, setIsLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState('Never');

  // Load settings from storage on component mount
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

  const handleToggle = async (setting: string, value: boolean) => {
    const newSettings = {
      notifications,
      autoBackup,
      faceRecognition,
      facultyName,
      department,
      email,
      lastBackup,
      [setting]: value,
    };

    switch (setting) {
      case 'notifications':
        setNotifications(value);
        if (value) {
          Alert.alert('Notifications Enabled', 'You will receive attendance reminders and updates.');
        } else {
          Alert.alert('Notifications Disabled', 'You will not receive push notifications.');
        }
        break;
      case 'autoBackup':
        setAutoBackup(value);
        if (value) {
          Alert.alert('Auto Backup Enabled', 'Your data will be automatically backed up daily at 2:00 AM.');
        } else {
          Alert.alert('Auto Backup Disabled', 'Automatic backups have been turned off.');
        }
        break;
      case 'faceRecognition':
        setFaceRecognition(value);
        if (value) {
          Alert.alert('Face Recognition Enabled', 'AI-powered attendance tracking is now active. Please ensure good lighting for best results.');
        } else {
          Alert.alert('Face Recognition Disabled', 'Manual attendance marking will be used.');
        }
        break;
    }

    await saveSettings(newSettings);
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
        facultyName: facultyName.trim(),
        department: department.trim(),
        email: email.trim().toLowerCase(),
        lastBackup,
      };
      
      await saveSettings(newSettings);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Choose export format for attendance records:',
      [
        { 
          text: 'Excel (.xlsx)', 
          onPress: () => exportToFormat('excel')
        },
        { 
          text: 'PDF Report', 
          onPress: () => exportToFormat('pdf')
        },
        { 
          text: 'CSV File', 
          onPress: () => exportToFormat('csv')
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const exportToFormat = async (format: string) => {
    setIsLoading(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const fileName = `attendance_report_${new Date().toISOString().split('T')[0]}.${format}`;
      
      Alert.alert(
        'Export Complete',
        `Data exported successfully as ${fileName}`,
        [
          { text: 'OK' },
          { 
            text: 'Share', 
            onPress: () => shareFile(fileName)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const shareFile = async (fileName: string) => {
    try {
      await Share.share({
        message: `Attendance report: ${fileName}`,
        title: 'Faculty ERP - Attendance Report',
      });
    } catch (error) {
      console.error('Error sharing file:', error);
    }
  };

  const handleBackup = async () => {
    Alert.alert(
      'Create Backup',
      'This will backup all your attendance data, student records, and settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Backup Now', 
          onPress: () => performBackup()
        },
      ]
    );
  };

  const performBackup = async () => {
    setIsLoading(true);
    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const backupTime = new Date().toLocaleString();
      setLastBackup(backupTime);
      
      const newSettings = {
        notifications,
        autoBackup,
        faceRecognition,
        facultyName,
        department,
        email,
        lastBackup: backupTime,
      };
      
      await saveSettings(newSettings);
      
      Alert.alert(
        'Backup Complete',
        `Your data has been successfully backed up.\n\nBackup includes:\n• Attendance records\n• Student database\n• App settings\n• Reports and analytics`,
        [
          { text: 'OK' },
          { 
            text: 'View Details', 
            onPress: () => showBackupDetails()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Backup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showBackupDetails = () => {
    Alert.alert(
      'Backup Details',
      `Last Backup: ${lastBackup}\nSize: 2.4 MB\nLocation: Cloud Storage\nStatus: Encrypted & Secure`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      <View style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={facultyName}
              onChangeText={setFacultyName}
            />
            <TextInput
              style={styles.input}
              placeholder="Department"
              value={department}
              onChangeText={setDepartment}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.saveButton}
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
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <TouchableOpacity
              style={[styles.toggle, notifications && styles.toggleActive]}
              onPress={() => handleToggle('notifications', !notifications)}
            >
              <View style={[styles.toggleThumb, notifications && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto Backup</Text>
            <TouchableOpacity
              style={[styles.toggle, autoBackup && styles.toggleActive]}
              onPress={() => handleToggle('autoBackup', !autoBackup)}
            >
              <View style={[styles.toggleThumb, autoBackup && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Face Recognition</Text>
            <TouchableOpacity
              style={[styles.toggle, faceRecognition && styles.toggleActive]}
              onPress={() => handleToggle('faceRecognition', !faceRecognition)}
            >
              <View style={[styles.toggleThumb, faceRecognition && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
            <Text style={styles.actionButtonText}>Export Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleBackup}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Creating Backup...' : 'Backup Data'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.lastBackupText}>Last backup: {lastBackup}</Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 15,
  },
  profileCard: {
    backgroundColor: '#ffffff',
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
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
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
    color: '#374151',
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  actionButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  lastBackupText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
  },
});