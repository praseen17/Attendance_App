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
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: '#ffffff', fontSize: 28, fontWeight: '700' }]}>
          Students Management
        </Text>
        <Text style={styles.subtitle}>
          Total Students: {students.length} | Present Today: {students.filter(s => s.lastSeen.includes('2024-01-15')).length}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={[styles.statNumber, { color: '#3b82f6' }]}>{students.length}</Text>
          <Text style={styles.statLabel}>Total Students</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
          <Text style={[styles.statNumber, { color: '#10b981' }]}>
            {Math.round(students.reduce((sum, s) => sum + s.attendanceRate, 0) / students.length || 0)}%
          </Text>
          <Text style={styles.statLabel}>Avg Attendance</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>
            {students.filter(s => s.attendanceRate < 75).length}
          </Text>
          <Text style={styles.statLabel}>Low Attendance</Text>
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
                  ]}>
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
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.studentsList} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentDetail}>Roll No: {student.rollNo}</Text>
                  <Text style={styles.studentDetail}>Class: {student.class}</Text>
                  <Text style={styles.studentDetail}>Phone: {student.parentContact}</Text>
                </View>
                <View style={styles.attendanceInfo}>
                  <View style={[styles.attendanceBadge, { backgroundColor: getAttendanceColor(student.attendanceRate) }]}>
                    <Text style={styles.attendanceText}>
                      {student.attendanceRate}%
                    </Text>
                  </View>
                  <Text style={styles.attendanceSubtext}>
                    {student.presentDays}/{student.totalClasses} classes
                  </Text>
                </View>
              </View>
              
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
                    style={styles.actionButton}
                    onPress={() => {
                      setSelectedStudent(student);
                      setShowMediaModal(true);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Media</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => contactParent(student)}
                  >
                    <Text style={styles.actionButtonText}>Contact</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => {
                      setSelectedStudent(student);
                      setShowEditModal(true);
                    }}
                  >
                    <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteStudent(student)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  searchbar: {
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  exportButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  studentsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  studentCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    marginRight: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    marginBottom: 4,
    fontWeight: '600',
    color: '#1f2937',
  },
  studentDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  attendanceInfo: {
    alignItems: 'center',
  },
  attendanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    marginBottom: 4,
  },
  attendanceText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  attendanceSubtext: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  studentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSeenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  lastSeenIcon: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastSeenText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  editButton: {
    backgroundColor: '#dbeafe',
  },
  editButtonText: {
    color: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#10b981',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    marginHorizontal: 24,
    borderRadius: 20,
    maxHeight: height * 0.8,
    width: width - 48,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    maxHeight: height * 0.5,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Profile Photo Styles
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#10b981',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  // Add Student Photo Section
  photoSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  photoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  previewImage: {
    width: 116,
    height: 116,
    borderRadius: 10,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Media Modal Styles
  mediaModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mediaModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  mediaModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
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
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePhotoLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#e5e7eb',
  },
  profilePhotoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  profilePhotoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  videoButton: {
    backgroundColor: '#ef4444',
  },
  mediaActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mediaGallery: {
    flexDirection: 'row',
    gap: 12,
  },
  mediaItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMediaState: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMediaText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  mockImagePlaceholder: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
});