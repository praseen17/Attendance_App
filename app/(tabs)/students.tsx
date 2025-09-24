import { renderIcon } from '@/constants/icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  TextInput as RNTextInput,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { Colors } from '@/constants/theme';

interface Student {
  id: number;
  name: string;
  rollNo: string;
  class: string;
  parentContact: string;
  email: string;
  address: string;
  attendanceRate: number;
  lastSeen: string;
  totalClasses: number;
  presentDays: number;
  absentDays: number;
  profilePhoto?: string;
  videos?: string[];
  photos?: string[];
  dateAdded: string;
}

const { width, height } = Dimensions.get('window');

export default function StudentsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedClass, setSelectedClass] = useState('All Classes');
  const [sortBy, setSortBy] = useState('name');
  const [isLoading, setIsLoading] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    class: '',
    parentContact: '',
    email: '',
    address: '',
    profilePhoto: '',
  });
  const [newStudentVideo, setNewStudentVideo] = useState<string>('');

  const [students, setStudents] = useState([
    { 
      id: 1, 
      name: 'John Smith', 
      rollNo: 'CS001', 
      class: 'CS Year 1', 
      parentContact: '+1 234-567-8901',
      email: 'john.smith@student.edu',
      address: '123 Main St, City',
      attendanceRate: 92,
      lastSeen: '2024-01-15 09:15 AM',
      totalClasses: 45,
      presentDays: 41,
      absentDays: 4,
      profilePhoto: '',
      photos: [],
      videos: [],
      dateAdded: '2024-01-10'
    },
    { 
      id: 2, 
      name: 'Emma Johnson', 
      rollNo: 'CS002', 
      class: 'CS Year 1', 
      parentContact: '+1 234-567-8902',
      email: 'emma.johnson@student.edu',
      address: '456 Oak Ave, City',
      attendanceRate: 88,
      lastSeen: '2024-01-15 09:12 AM',
      totalClasses: 45,
      presentDays: 40,
      absentDays: 5,
      profilePhoto: '',
      photos: [],
      videos: [],
      dateAdded: '2024-01-11'
    },
    { 
      id: 3, 
      name: 'Michael Brown', 
      rollNo: 'CS003', 
      class: 'CS Year 2', 
      parentContact: '+1 234-567-8903',
      email: 'michael.brown@student.edu',
      address: '789 Pine St, City',
      attendanceRate: 95,
      lastSeen: '2024-01-15 09:10 AM',
      totalClasses: 42,
      presentDays: 40,
      absentDays: 2,
      profilePhoto: '',
      photos: [],
      videos: [],
      dateAdded: '2024-01-12'
    },
    { 
      id: 4, 
      name: 'Sarah Davis', 
      rollNo: 'IT001', 
      class: 'IT Year 1', 
      parentContact: '+1 234-567-8904',
      email: 'sarah.davis@student.edu',
      address: '321 Elm St, City',
      attendanceRate: 85,
      lastSeen: '2024-01-14 02:30 PM',
      totalClasses: 38,
      presentDays: 32,
      absentDays: 6,
      profilePhoto: '',
      photos: [],
      videos: [],
      dateAdded: '2024-01-13'
    },
  ]);

  const classes = ['All Classes', 'CS Year 1', 'CS Year 2', 'CS Year 3', 'IT Year 1', 'IT Year 2'];
  const sortOptions = ['name', 'rollNo', 'attendanceRate', 'lastSeen'];

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const savedStudents = await AsyncStorage.getItem('students');
      if (savedStudents) {
        setStudents(JSON.parse(savedStudents));
      }
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const saveStudents = async (updatedStudents: any[]) => {
    try {
      await AsyncStorage.setItem('students', JSON.stringify(updatedStudents));
    } catch (error) {
      console.error('Error saving students:', error);
    }
  };

  const filteredStudents = students
    .filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.class.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesClass = selectedClass === 'All Classes' || student.class === selectedClass;
      return matchesSearch && matchesClass;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rollNo':
          return a.rollNo.localeCompare(b.rollNo);
        case 'attendanceRate':
          return b.attendanceRate - a.attendanceRate;
        case 'lastSeen':
          return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
        default:
          return 0;
      }
    });

  // Camera and Media Functions (Mock Implementation)
  const requestCameraPermission = async () => {
    const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return cameraPerm.status === 'granted' && mediaPerm.status === 'granted';
  };

  const capturePhoto = async (isProfilePhoto = false): Promise<string | null> => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) {
      Alert.alert('Permission required', 'Please enable camera and media permissions in settings.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      // Editing UI can get stuck on some Android devices. Keep it iOS-only.
      allowsEditing: Platform.OS === 'ios',
      quality: 0.8,
      aspect: Platform.OS === 'ios' && isProfilePhoto ? [1, 1] : undefined,
    });
    if (result.canceled) return null;
    const uri = result.assets?.[0]?.uri || null;
    if (uri) Alert.alert('Success', 'Photo captured successfully!');
    return uri;
  };

  const captureVideo = async (): Promise<string | null> => {
    const hasPerm = await requestCameraPermission();
    if (!hasPerm) {
      Alert.alert('Permission required', 'Please enable camera and media permissions in settings.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled) return null;
    const uri = result.assets?.[0]?.uri || null;
    if (uri) Alert.alert('Success', 'Video recorded successfully!');
    return uri;
  };

  const addPhotoToStudent = (studentId: number) => {
    capturePhoto().then(photoUri => {
      if (photoUri) {
        const updatedStudents = students.map(student => {
          if (student.id === studentId) {
            return {
              ...student,
              photos: [...(student.photos || []), photoUri]
            };
          }
          return student;
        });
        setStudents(updatedStudents);
        saveStudents(updatedStudents);
        Alert.alert('Success', 'Photo added successfully!');
      }
    });
  };

  const addVideoToStudent = (studentId: number) => {
    captureVideo().then(videoUri => {
      if (videoUri) {
        const updatedStudents = students.map(student => {
          if (student.id === studentId) {
            return {
              ...student,
              videos: [...(student.videos || []), videoUri]
            };
          }
          return student;
        });
        setStudents(updatedStudents);
        saveStudents(updatedStudents);
        Alert.alert('Success', 'Video added successfully!');
      }
    });
  };

  const setProfilePhoto = (studentId: number) => {
    capturePhoto(true).then(photoUri => {
      if (photoUri) {
        const updatedStudents = students.map(student => {
          if (student.id === studentId) {
            return { ...student, profilePhoto: photoUri };
          }
          return student;
        });
        setStudents(updatedStudents);
        saveStudents(updatedStudents);
        Alert.alert('Success', 'Profile photo updated!');
      }
    });
  };

  const addStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.rollNo.trim() || !newStudent.class.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check for duplicate roll number
    if (students.some(s => s.rollNo.toLowerCase() === newStudent.rollNo.toLowerCase())) {
      Alert.alert('Error', 'A student with this roll number already exists');
      return;
    }

    setIsLoading(true);
    try {
      const student = {
        id: Date.now(),
        ...newStudent,
        name: newStudent.name.trim(),
        rollNo: newStudent.rollNo.trim().toUpperCase(),
        class: newStudent.class.trim(),
        attendanceRate: 0,
        lastSeen: 'Never',
        totalClasses: 0,
        presentDays: 0,
        absentDays: 0,
        photos: [],
        videos: newStudentVideo ? [newStudentVideo] : [],
        dateAdded: new Date().toISOString().split('T')[0]
      };
      
      const updatedStudents = [...students, student];
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
      
      setNewStudent({ name: '', rollNo: '', class: '', parentContact: '', email: '', address: '', profilePhoto: '' });
      setNewStudentVideo('');
      setShowAddModal(false);
      Alert.alert('Success', 'Student added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add student');
    } finally {
      setIsLoading(false);
    }
  };

  const editStudent = async () => {
    if (!selectedStudent) return;

    setIsLoading(true);
    try {
      const updatedStudents = students.map(s => 
        s.id === selectedStudent.id ? { ...selectedStudent } : s
      );
      setStudents(updatedStudents);
      await saveStudents(updatedStudents);
      
      setShowEditModal(false);
      setSelectedStudent(null);
      Alert.alert('Success', 'Student updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update student');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStudent = (student: Student) => {
    Alert.alert(
      'Delete Student',
      `Are you sure you want to delete ${student.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedStudents = students.filter(s => s.id !== student.id);
              setStudents(updatedStudents);
              await saveStudents(updatedStudents);
              Alert.alert('Success', 'Student deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete student');
            }
          }
        },
      ]
    );
  };

  const contactParent = (student: Student) => {
    Alert.alert(
      'Contact Parent',
      `Contact parent of ${student.name}`,
      [
        { 
          text: 'Call', 
          onPress: () => Linking.openURL(`tel:${student.parentContact}`)
        },
        { 
          text: 'SMS', 
          onPress: () => Linking.openURL(`sms:${student.parentContact}`)
        },
        { 
          text: 'Email', 
          onPress: () => Linking.openURL(`mailto:${student.email}`)
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const exportStudentData = async () => {
    try {
      const csvData = students.map(s => 
        `${s.name},${s.rollNo},${s.class},${s.attendanceRate}%,${s.parentContact},${s.email}`
      ).join('\n');
      
      const header = 'Name,Roll No,Class,Attendance Rate,Parent Contact,Email\n';
      const fullData = header + csvData;
      
      await Share.share({
        message: fullData,
        title: 'Student Data Export',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return '#4CAF50';
    if (rate >= 75) return '#FF9800';
    return '#F44336';
  };



  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Student Management
            </Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              Comprehensive student tracking and management system
            </Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatNumber}>{students.length}</Text>
              <Text style={styles.headerStatLabel} numberOfLines={1}>Total</Text>
            </View>
            <View style={styles.headerStatItem}>
              <Text style={styles.headerStatNumber}>
                {Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length || 0)}%
              </Text>
              <Text style={styles.headerStatLabel} numberOfLines={1}>Avg</Text>
            </View>
          </View>
        </View>
        
        {/* Quick Actions Bar */}
        <View style={styles.quickActionsBar}>
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionIcon}>
              {renderIcon('filter', 16, '#ffffff')}
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Filter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton}>
            <View style={styles.quickActionIcon}>
              {renderIcon('sort', 16, '#ffffff')}
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Sort</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={exportStudentData}>
            <View style={styles.quickActionIcon}>
              {renderIcon('download', 16, '#ffffff')}
            </View>
            <Text style={styles.quickActionText} numberOfLines={1}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{students.length}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>TOTAL</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>
              {Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length || 0)}%
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>AVG RATE</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
              {students.filter(s => s.attendanceRate < 75).length}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>LOW RATE</Text>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <RNTextInput
            placeholder="Search students..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          
          <View style={styles.filtersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {classes.map((className) => (
                  <TouchableOpacity
                    key={className}
                    onPress={() => setSelectedClass(className)}
                    style={[
                      styles.filterChip,
                      selectedClass === className && styles.filterChipActive
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      selectedClass === className && styles.filterChipTextActive
                    ]} numberOfLines={1}>
                      {className}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <TouchableOpacity
              onPress={exportStudentData}
              style={styles.exportButton}
            >
              <Text style={styles.exportButtonText} numberOfLines={1}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.studentsListContainer}>
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              {renderIcon('users', 48, '#6b7280')}
            </View>
            <Text style={styles.emptyStateTitle}>No students found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'Try adjusting your search criteria' : 'Add your first student to get started'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              {/* Enhanced Student Header */}
              <View style={styles.studentHeader}>
                <TouchableOpacity 
                  style={styles.avatarContainer}
                  onPress={() => setProfilePhoto(student.id)}
                >
                  {student.profilePhoto && !student.profilePhoto.startsWith('mock-') ? (
                    <Image source={{ uri: student.profilePhoto }} style={styles.profileImage} />
                  ) : student.profilePhoto ? (
                    <View style={[styles.profileImage, styles.mockImagePlaceholder]}>
                      {renderIcon('user', 24, '#ffffff')}
                    </View>
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </Text>
                      <View style={styles.cameraOverlay}>
                        {renderIcon('camera', 16, '#ffffff')}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.studentInfo}>
                  <View style={styles.studentNameRow}>
                    <Text style={styles.studentName} numberOfLines={1} ellipsizeMode="tail">{student.name}</Text>
                    <View style={[styles.classChip, { backgroundColor: getAttendanceColor(student.attendanceRate) + '20' }]}>
                      <Text style={[styles.classChipText, { color: getAttendanceColor(student.attendanceRate) }]} numberOfLines={1}>
                        {student.class}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.studentDetailsRow}>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        {renderIcon('hash', 12, '#6b7280')}
                      </View>
                      <Text style={styles.studentDetail}>{student.rollNo}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <View style={styles.detailIcon}>
                        {renderIcon('phone', 12, '#6b7280')}
                      </View>
                      <Text style={styles.studentDetail}>{student.parentContact}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.attendanceInfo}>
                  <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(student.attendanceRate) }]}>
                    <Text style={styles.attendanceText}>
                      {student.attendanceRate}%
                    </Text>
                  </View>
                  <View style={styles.attendanceStats}>
                    <Text style={styles.attendanceSubtext}>
                      {student.presentDays} present
                    </Text>
                    <Text style={styles.attendanceSubtext}>
                      {student.absentDays} absent
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Enhanced Footer with Professional Actions */}
              <View style={styles.studentFooter}>
                <View style={styles.lastSeenContainer}>
                  <View style={styles.lastSeenIcon}>
                    {renderIcon('clock', 14, '#6b7280')}
                  </View>
                  <Text style={styles.lastSeenText}>
                    Last seen: {student.lastSeen}
                  </Text>
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.mediaButton]}
                    onPress={() => {
                      setSelectedStudent(student);
                      setShowMediaModal(true);
                    }}
                  >
                    <View style={styles.actionButtonIcon}>
                      {renderIcon('camera', 12, '#ffffff')}
                    </View>
                    <Text style={styles.actionButtonText} numberOfLines={1}>Media</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.callButton]}
                    onPress={() => contactParent(student)}
                  >
                    <View style={styles.actionButtonIcon}>
                      {renderIcon('phone', 12, '#ffffff')}
                    </View>
                    <Text style={styles.actionButtonText} numberOfLines={1}>Call</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setSelectedStudent(student);
                      setShowEditModal(true);
                    }}
                  >
                    <View style={styles.actionButtonIcon}>
                      {renderIcon('edit', 12, '#ffffff')}
                    </View>
                    <Text style={styles.actionButtonText} numberOfLines={1}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteStudent(student)}
                  >
                    <View style={styles.actionButtonIcon}>
                      {renderIcon('trash', 12, '#ffffff')}
                    </View>
                    <Text style={styles.actionButtonText} numberOfLines={1}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
        </View>
      </ScrollView>

      {/* Add Student FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Student Modal */}
      {showAddModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <RNTextInput
                placeholder="Student Name *"
                value={newStudent.name}
                onChangeText={(text) => setNewStudent({...newStudent, name: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Roll Number *"
                value={newStudent.rollNo}
                onChangeText={(text) => setNewStudent({...newStudent, rollNo: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Class *"
                value={newStudent.class}
                onChangeText={(text) => setNewStudent({...newStudent, class: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Parent Contact"
                value={newStudent.parentContact}
                onChangeText={(text) => setNewStudent({...newStudent, parentContact: text})}
                style={styles.input}
                keyboardType="phone-pad"
              />
              
              <RNTextInput
                placeholder="Email Address"
                value={newStudent.email}
                onChangeText={(text) => setNewStudent({...newStudent, email: text})}
                style={styles.input}
                keyboardType="email-address"
              />
              
              <RNTextInput
                placeholder="Address"
                value={newStudent.address}
                onChangeText={(text) => setNewStudent({...newStudent, address: text})}
                style={styles.input}
                multiline
              />
              
              {/* Profile Photo Section */}
              <View style={styles.photoSection}>
                <Text style={styles.photoSectionTitle}>Profile Photo</Text>
                <TouchableOpacity 
                  style={styles.photoButton}
                  onPress={() => {
                    capturePhoto(true).then(photoUri => {
                      if (photoUri) {
                        setNewStudent({...newStudent, profilePhoto: photoUri});
                      }
                    });
                  }}
                >
                  {newStudent.profilePhoto && !newStudent.profilePhoto.startsWith('mock-') ? (
                    <Image source={{ uri: newStudent.profilePhoto }} style={styles.previewImage} />
                  ) : newStudent.profilePhoto ? (
                    <View style={[styles.previewImage, styles.mockImagePlaceholder]}>
                      {renderIcon('user', 32, '#ffffff')}
                    </View>
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      {renderIcon('camera', 24, '#6b7280')}
                      <Text style={styles.photoPlaceholderText}>Tap to capture photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {/* Add Student Video Section */}
                <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
                  <Text style={styles.photoSectionTitle}>Intro Video (optional)</Text>
                  <TouchableOpacity
                    style={[styles.photoButton, { alignSelf: 'flex-start' }]}
                    onPress={async () => {
                      const uri = await captureVideo();
                      if (uri) setNewStudentVideo(uri);
                    }}
                  >
                    {newStudentVideo ? (
                      <View style={[styles.previewImage, { justifyContent: 'center', alignItems: 'center' }] }>
                        {renderIcon('play', 24, '#6b7280')}
                      </View>
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        {renderIcon('video', 24, '#6b7280')}
                        <Text style={styles.photoPlaceholderText}>Tap to record video</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, isLoading && styles.modalSaveButtonDisabled]}
                onPress={addStudent}
                disabled={isLoading}
              >
                <Text style={styles.modalSaveText}>
                  {isLoading ? 'Adding...' : 'Add Student'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudent && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <RNTextInput
                placeholder="Student Name *"
                value={selectedStudent.name}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, name: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Roll Number *"
                value={selectedStudent.rollNo}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, rollNo: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Class *"
                value={selectedStudent.class}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, class: text})}
                style={styles.input}
              />
              
              <RNTextInput
                placeholder="Parent Contact"
                value={selectedStudent.parentContact}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, parentContact: text})}
                style={styles.input}
                keyboardType="phone-pad"
              />
              
              <RNTextInput
                placeholder="Email Address"
                value={selectedStudent.email || ''}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, email: text})}
                style={styles.input}
                keyboardType="email-address"
              />
              
              <RNTextInput
                placeholder="Address"
                value={selectedStudent.address || ''}
                onChangeText={(text) => setSelectedStudent({...selectedStudent, address: text})}
                style={styles.input}
                multiline
              />
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalSaveButton, isLoading && styles.modalSaveButtonDisabled]}
                onPress={editStudent}
                disabled={isLoading}
              >
                <Text style={styles.modalSaveText}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Media Management Modal */}
      {showMediaModal && selectedStudent && (
        <Modal visible={showMediaModal} animationType="slide" presentationStyle="pageSheet">
          <View style={styles.mediaModalContainer}>
            <View style={styles.mediaModalHeader}>
              <Text style={styles.mediaModalTitle}>
                Media - {selectedStudent.name}
              </Text>
              <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.mediaModalContent}>
              {/* Profile Photo Section */}
              <View style={styles.mediaSection}>
                <Text style={styles.mediaSectionTitle}>Profile Photo</Text>
                <TouchableOpacity 
                  style={styles.profilePhotoContainer}
                  onPress={() => setProfilePhoto(selectedStudent.id)}
                >
                  {selectedStudent.profilePhoto && !selectedStudent.profilePhoto.startsWith('mock-') ? (
                    <Image source={{ uri: selectedStudent.profilePhoto }} style={styles.profilePhotoLarge} />
                  ) : selectedStudent.profilePhoto ? (
                    <View style={[styles.profilePhotoLarge, styles.mockImagePlaceholder]}>
                      {renderIcon('user', 48, '#ffffff')}
                    </View>
                  ) : (
                    <View style={styles.profilePhotoPlaceholder}>
                      {renderIcon('camera', 32, '#6b7280')}
                      <Text style={styles.profilePhotoPlaceholderText}>Tap to set profile photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.mediaActions}>
                <TouchableOpacity 
                  style={styles.mediaActionButton}
                  onPress={() => addPhotoToStudent(selectedStudent.id)}
                >
                  {renderIcon('camera', 20, '#ffffff')}
                  <Text style={styles.mediaActionText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.mediaActionButton, styles.videoButton]}
                  onPress={() => addVideoToStudent(selectedStudent.id)}
                >
                  {renderIcon('video', 20, '#ffffff')}
                  <Text style={styles.mediaActionText}>Record Video</Text>
                </TouchableOpacity>
              </View>

              {/* Photos Gallery */}
              <View style={styles.mediaSection}>
                <Text style={styles.mediaSectionTitle}>
                  Photos ({selectedStudent.photos?.length || 0})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.mediaGallery}>
                    {selectedStudent.photos?.map((photo, index) => (
                      <TouchableOpacity key={index} style={styles.mediaItem}>
                        {photo.startsWith('mock-') ? (
                          <View style={[styles.mediaImage, styles.mockImagePlaceholder]}>
                            {renderIcon('image', 24, '#ffffff')}
                          </View>
                        ) : (
                          <Image source={{ uri: photo }} style={styles.mediaImage} />
                        )}
                      </TouchableOpacity>
                    ))}
                    {(!selectedStudent.photos || selectedStudent.photos.length === 0) && (
                      <View style={styles.emptyMediaState}>
                        <Text style={styles.emptyMediaText}>No photos yet</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>

              {/* Videos Gallery */}
              <View style={styles.mediaSection}>
                <Text style={styles.mediaSectionTitle}>
                  Videos ({selectedStudent.videos?.length || 0})
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.mediaGallery}>
                    {selectedStudent.videos?.map((video, index) => (
                      <TouchableOpacity key={index} style={styles.mediaItem}>
                        <View style={styles.videoThumbnail}>
                          {renderIcon('play', 24, '#ffffff')}
                        </View>
                      </TouchableOpacity>
                    ))}
                    {(!selectedStudent.videos || selectedStudent.videos.length === 0) && (
                      <View style={styles.emptyMediaState}>
                        <Text style={styles.emptyMediaText}>No videos yet</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    backgroundColor: Colors.light.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 6,
    minWidth: 0,
    maxWidth: '65%',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.textOnPrimary,
    marginBottom: 4,
    letterSpacing: -0.2,
    lineHeight: 20,
    flexShrink: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    maxWidth: '100%',
    flexShrink: 1,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: '35%',
  },
  headerStatItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  headerStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.textOnPrimary,
    marginBottom: 1,
    lineHeight: 18,
  },
  headerStatLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  quickActionsBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    justifyContent: 'flex-start',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  quickActionIcon: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    color: Colors.light.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
    flexShrink: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 7,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.1,
    lineHeight: 9,
    textAlign: 'center',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    padding: 18,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  searchbar: {
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
    color: Colors.light.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    transform: [{ scale: 1.02 }],
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    letterSpacing: 0.1,
    flexShrink: 0,
  },
  filterChipTextActive: {
    color: Colors.light.textOnPrimary,
  },
  exportButton: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: {
    color: Colors.light.textOnPrimary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
  mainScrollView: {
    flex: 1,
  },
  studentsListContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateIcon: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 32,
    width: 64,
    height: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: '85%',
  },
  studentCard: {
    marginBottom: 16,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  avatarContainer: {
    marginRight: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  avatarText: {
    color: Colors.light.textOnPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  studentInfo: {
    flex: 1,
    paddingTop: 2,
  },
  studentNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  studentName: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.text,
    flex: 1,
    letterSpacing: -0.1,
    lineHeight: 16,
    paddingRight: 4,
    flexShrink: 1,
    minWidth: 0,
  },
  classChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  classChipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.1,
    flexShrink: 0,
  },
  studentDetailsRow: {
    flexDirection: 'column',
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentDetail: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    lineHeight: 16,
  },
  attendanceInfo: {
    alignItems: 'center',
    marginLeft: 12,
  },
  attendanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  attendanceText: {
    color: Colors.light.textOnPrimary,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  attendanceSubtext: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 12,
  },
  attendanceStats: {
    alignItems: 'center',
    gap: 2,
  },
  studentFooter: {
    flexDirection: 'column',
    gap: 12,
  },
  lastSeenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
  },
  lastSeenIcon: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastSeenText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    flex: 1,
    justifyContent: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  actionButtonIcon: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.light.textOnPrimary,
    letterSpacing: 0.1,
    flexShrink: 0,
  },
  mediaButton: {
    backgroundColor: '#8b5cf6',
  },
  contactButton: {
    backgroundColor: Colors.light.success,
  },
  callButton: {
    backgroundColor: Colors.light.success,
  },
  editButton: {
    backgroundColor: Colors.light.primary,
  },
  deleteButton: {
    backgroundColor: Colors.light.error,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: Colors.light.surface,
  },
  fabText: {
    color: Colors.light.textOnPrimary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 24,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: Colors.light.surface,
    marginHorizontal: 20,
    borderRadius: 20,
    maxHeight: height * 0.85,
    width: width - 40,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.4,
  },
  modalClose: {
    fontSize: 22,
    color: Colors.light.textSecondary,
    fontWeight: '700',
    width: 32,
    height: 32,
    textAlign: 'center',
    lineHeight: 32,
  },
  modalContent: {
    padding: 20,
    maxHeight: height * 0.55,
  },
  input: {
    marginBottom: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  modalSaveButtonDisabled: {
    backgroundColor: Colors.light.textLight,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.textOnPrimary,
  },
  // Profile Photo Styles
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: Colors.light.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.surface,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  // Add Student Photo Section
  photoSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundSecondary,
  },
  previewImage: {
    width: 116,
    height: 116,
    borderRadius: 14,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },
  // Media Modal Styles
  mediaModalContainer: {
    flex: 1,
    backgroundColor: Colors.light.surface,
  },
  mediaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  mediaModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.4,
  },
  mediaModalContent: {
    flex: 1,
    padding: 20,
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: 14,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhotoLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  profilePhotoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.light.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  profilePhotoPlaceholderText: {
    marginTop: 8,
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 16,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mediaActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  videoButton: {
    backgroundColor: Colors.light.error,
  },
  mediaActionText: {
    color: Colors.light.textOnPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  mediaGallery: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMediaState: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emptyMediaText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  mockImagePlaceholder: {
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});