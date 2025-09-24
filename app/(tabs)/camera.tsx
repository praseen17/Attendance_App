import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Alert,
  Dimensions,
  Platform,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  isPresent: boolean;
  detectedAt?: Date;
  confidence?: number;
}

export default function CameraAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [selectedClass, setSelectedClass] = useState('CS Year 1');
  const [detectedStudents, setDetectedStudents] = useState<Student[]>([]);
  const cameraRef = useRef<CameraView>(null);

  // Mock student database for the selected class
  const [classStudents, setClassStudents] = useState<Student[]>([
    { id: '1', name: 'John Smith', rollNo: 'CS001', class: 'CS Year 1', isPresent: false },
    { id: '2', name: 'Emma Johnson', rollNo: 'CS002', class: 'CS Year 1', isPresent: false },
    { id: '3', name: 'Michael Brown', rollNo: 'CS003', class: 'CS Year 1', isPresent: false },
    { id: '4', name: 'Sarah Davis', rollNo: 'CS004', class: 'CS Year 1', isPresent: false },
    { id: '5', name: 'David Wilson', rollNo: 'CS005', class: 'CS Year 1', isPresent: false },
    { id: '6', name: 'Lisa Anderson', rollNo: 'CS006', class: 'CS Year 1', isPresent: false },
  ]);

  const classes = ['CS Year 1', 'CS Year 2', 'CS Year 3', 'IT Year 1', 'IT Year 2'];

  useEffect(() => {
    let interval: any;
    
    if (permission?.granted && isScanning) {
      // Simulate face detection every 2-4 seconds
      interval = setInterval(() => {
        simulateFaceDetection();
      }, Math.random() * 2000 + 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [permission, isScanning, classStudents]);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 24, color: '#6b7280' }}>
          Camera permission is required for face recognition attendance
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: '#3b82f6',
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const simulateFaceDetection = () => {
    // Find students who haven't been detected yet
    const undetectedStudents = classStudents.filter(s => !s.isPresent);
    
    if (undetectedStudents.length === 0) return;

    // Randomly detect a student
    const randomStudent = undetectedStudents[Math.floor(Math.random() * undetectedStudents.length)];
    const confidence = Math.random() * 0.2 + 0.8; // 80-100% confidence
    
    if (confidence > 0.85) {
      const detectedStudent = {
        ...randomStudent,
        isPresent: true,
        detectedAt: new Date(),
        confidence: confidence,
      };

      // Update the student list
      setClassStudents(prev => 
        prev.map(student => 
          student.id === randomStudent.id 
            ? detectedStudent
            : student
        )
      );

      // Add to detected list
      setDetectedStudents(prev => [detectedStudent, ...prev]);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const saveAttendance = () => {
    const presentCount = classStudents.filter(s => s.isPresent).length;
    const totalCount = classStudents.length;

    Alert.alert(
      'Save Attendance',
      `Save attendance for ${selectedClass}?\n\nPresent: ${presentCount}/${totalCount} students`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: () => {
            Alert.alert('Success', 'Attendance saved successfully!');
          }
        },
      ]
    );
  };

  const resetAttendance = () => {
    setClassStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
    setDetectedStudents([]);
  };

  const presentCount = classStudents.filter(s => s.isPresent).length;
  const totalCount = classStudents.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Camera Attendance</Text>
          <Text style={styles.headerSubtitle}>AI-powered face recognition</Text>
        </View>

        {/* Class Selection */}
        <View style={styles.classSection}>
          <Text style={styles.sectionTitle}>Select Class</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.classButtons}>
              {classes.map((className) => (
                <TouchableOpacity
                  key={className}
                  onPress={() => setSelectedClass(className)}
                  style={[
                    styles.classButton,
                    selectedClass === className && styles.classButtonActive
                  ]}
                >
                  <Text style={[
                    styles.classButtonText,
                    selectedClass === className && styles.classButtonTextActive
                  ]}>
                    {className}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Camera Section */}
        <View style={styles.cameraSection}>
          <View style={styles.cameraContainer}>
            <CameraView 
              ref={cameraRef}
              style={styles.camera} 
              facing={facing}
            >
              <View style={styles.cameraOverlay}>
                <View style={[
                  styles.faceFrame,
                  { borderColor: isScanning ? '#10b981' : '#6b7280' }
                ]} />
                
                {isScanning && (
                  <View style={styles.scanningIndicator}>
                    <Text style={styles.scanningText}>
                      Scanning... ({presentCount}/{totalCount})
                    </Text>
                  </View>
                )}
              </View>
            </CameraView>
          </View>

          {/* Camera Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              onPress={toggleCameraFacing}
              style={styles.controlButton}
            >
              <Text style={styles.controlButtonText}>Flip Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setIsScanning(!isScanning)}
              style={[
                styles.scanButton,
                { backgroundColor: isScanning ? '#ef4444' : '#10b981' }
              ]}
            >
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Stop Scan' : 'Start Capture'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
              {totalCount - presentCount}
            </Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>
              {totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : 0}%
            </Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>

        {/* Recent Detections */}
        <View style={styles.detectionsSection}>
          <Text style={styles.sectionTitle}>Recent Detections</Text>
          
          {detectedStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No students detected yet.{'\n'}Tap &ldquo;Start Capture&rdquo; to begin scanning.
              </Text>
            </View>
          ) : (
            <View style={styles.detectionsList}>
              {detectedStudents.slice(0, 5).map((student) => (
                <View key={`${student.id}-${student.detectedAt?.getTime()}`} style={styles.detectionItem}>
                  <View style={styles.detectionIcon}>
                    <Text style={styles.detectionIconText}>✓</Text>
                  </View>
                  <View style={styles.detectionInfo}>
                    <Text style={styles.detectionName}>{student.name}</Text>
                    <Text style={styles.detectionDetails}>
                      {student.rollNo} • {student.confidence ? `${(student.confidence * 100).toFixed(0)}%` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={resetAttendance} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={saveAttendance} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save Attendance</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for safe area */}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  classSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  classButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  classButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  classButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  classButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  classButtonTextActive: {
    color: '#ffffff',
  },
  cameraSection: {
    margin: 16,
    marginTop: 0,
  },
  cameraContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 16,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  faceFrame: {
    width: width * 0.6,
    height: width * 0.4,
    maxWidth: 240,
    maxHeight: 160,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanningIndicator: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  scanningText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  controlButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  scanButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  detectionsSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  detectionsList: {
    gap: 8,
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  detectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detectionIconText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  detectionInfo: {
    flex: 1,
  },
  detectionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  detectionDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 0,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});