import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Modal,
    Dimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useDatabase } from '@/hooks/useDatabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { faceCaptureService, MLResult, MLError } from '@/services/faceCapture';
import { cameraService } from '@/services/cameraService';
import { attendanceStatusService } from '@/services/attendanceStatusService';
import { databaseService, AttendanceRecord, Student } from '@/services/database';

import { AttendanceStatusIndicator } from '@/components/AttendanceStatusIndicator';
import { StatusDashboard } from '@/components/StatusDashboard';
import { SuccessConfirmation, useSuccessConfirmation } from '@/components/SuccessConfirmation';
import { ProgressIndicator, useProgressIndicator } from '@/components/ProgressIndicator';
import { OfflineModeIndicator } from '@/components/OfflineModeIndicator';
import { useStatusIndicators } from '@/hooks/useStatusIndicators';

const { width } = Dimensions.get('window');

interface AttendanceStatus {
    type: 'idle' | 'connecting' | 'capturing' | 'processing' | 'success' | 'error';
    message: string;
    details?: string;
}

interface CaptureSession {
    sectionId: string;
    sectionName: string;
    totalStudents: number;
    presentCount: number;
    capturedStudents: Set<string>;
    startTime: Date;
}

export default function AttendanceCaptureScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { isInitialized } = useDatabase();
    const [permission, requestPermission] = useCameraPermissions();

    // Status indicators
    const statusIndicators = useStatusIndicators();
    const { confirmation, showSuccess, hideSuccess } = useSuccessConfirmation();
    const { progress } = useProgressIndicator();

    // Camera state
    const [facing, setFacing] = useState<CameraType>('front');
    const cameraRef = useRef<CameraView>(null);

    // Capture state
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState<AttendanceStatus>({
        type: 'idle',
        message: 'Ready to start attendance capture'
    });

    // Session state
    const [session, setSession] = useState<CaptureSession | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [recentCaptures, setRecentCaptures] = useState<AttendanceRecord[]>([]);

    // UI state
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [availableSections] = useState([
        { id: 'cs-year-1', name: 'Computer Science - Year 1' },
        { id: 'cs-year-2', name: 'Computer Science - Year 2' },
        { id: 'it-year-1', name: 'Information Technology - Year 1' },
    ]);

    // Network status
    const {
        showOfflineNotification,
        dismissOfflineNotification
    } = useNetworkStatus({
        onConnectionRestored: () => {
            console.log('Network connection restored - sync operations available');
            attendanceStatusService.reportNetworkStatus(true);
        },
        onConnectionLost: () => {
            console.log('Network connection lost - working offline');
            attendanceStatusService.reportNetworkStatus(false);
        }
    });

    useEffect(() => {
        initializeServices();
        return () => {
            cleanup();
        };
    }, []);



    useEffect(() => {
        if (selectedSection && isInitialized) {
            loadSectionStudents();
        }
    }, [selectedSection, isInitialized]);

    /**
     * Initialize face capture and ML services
     * Requirements: 2.1, 2.2 - WebSocket connection and face capture setup
     */
    const initializeServices = async () => {
        try {
            attendanceStatusService.setConnecting('Initializing services...');

            // Set up camera service callbacks
            cameraService.onCaptureSuccess(handleFaceCaptureSuccess);
            cameraService.onCaptureError(handleFaceCaptureError);

            // Set up face capture callbacks (for manual capture)
            faceCaptureService.onCaptureSuccess(handleFaceCaptureSuccess);
            faceCaptureService.onCaptureError(handleFaceCaptureError);
            faceCaptureService.onFallbackToManual(handleFallbackToManual);

            // No WebSocket callbacks needed when using HTTP ML API

            // Subscribe to status service updates
            attendanceStatusService.onStatusChange((newStatus) => {
                setStatus({
                    type: newStatus.type as any,
                    message: newStatus.message,
                    details: newStatus.details
                });
            });

            attendanceStatusService.setIdle('Services initialized. Select a section to begin.');

        } catch (error) {
            console.error('Service initialization error:', error);
            attendanceStatusService.setError(
                'Failed to initialize services',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    };

    /**
     * Load students for selected section
     * Requirements: 3.2 - Local SQLite storage access
     */
    const loadSectionStudents = async () => {
        try {
            const sectionStudents = await databaseService.getStudentsBySection(selectedSection);
            setStudents(sectionStudents);

            // Load recent attendance records for this section
            const recentRecords = await Promise.all(
                sectionStudents.slice(0, 5).map(student =>
                    databaseService.getAttendanceByStudent(student.id)
                )
            );

            setRecentCaptures(recentRecords.flat().slice(0, 10));

        } catch (error) {
            console.error('Failed to load section students:', error);
            setStatus({
                type: 'error',
                message: 'Failed to load student data',
                details: error instanceof Error ? error.message : 'Database error'
            });
        }
    };

    /**
     * Start attendance capture session
     * Requirements: 2.1, 3.1 - Face recognition and offline storage
     */
    const startCaptureSession = async () => {
        if (!selectedSection || !user) {
            Alert.alert('Error', 'Please select a section first');
            return;
        }

        try {
            attendanceStatusService.setConnecting('Starting capture session...');

            // Check camera permissions
            if (!permission?.granted) {
                const granted = await requestPermission();
                if (!granted) {
                    attendanceStatusService.setError(
                        'Camera permission required for face recognition',
                        'Please grant camera access to use face recognition'
                    );
                    return;
                }
            }

            // Initialize session
            const sectionName = availableSections.find(s => s.id === selectedSection)?.name || selectedSection;
            const newSession: CaptureSession = {
                sectionId: selectedSection,
                sectionName,
                totalStudents: students.length,
                presentCount: 0,
                capturedStudents: new Set(),
                startTime: new Date(),
            };

            setSession(newSession);
            setIsCapturing(true);

            // Set camera reference for camera service
            cameraService.setCameraRef(cameraRef.current);

            // Start camera service for auto capture
            await cameraService.startAutoCapture(selectedSection);

            attendanceStatusService.setCapturing(
                'Capturing attendance... Point camera at students',
                `0/${students.length} students captured`
            );

        } catch (error) {
            console.error('Failed to start capture session:', error);
            attendanceStatusService.setError(
                'Failed to start capture session',
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    };

    /**
     * Stop attendance capture session
     * Requirements: 2.1 - Stop face capture process
     */
    const stopCaptureSession = () => {
        setIsCapturing(false);
        cameraService.stopAutoCapture();
        faceCaptureService.stopAutoCapture();

        const message = session
            ? `Session completed. Captured ${session.presentCount}/${session.totalStudents} students`
            : 'Capture session stopped';

        attendanceStatusService.setIdle(message);
    };

    /**
     * Handle successful face capture and recognition
     * Requirements: 2.3, 3.1 - Student identification and local storage
     */
    const handleFaceCaptureSuccess = async (result: MLResult) => {
        if (!result.success || !result.studentId || !session || !user) return;

        try {
            // Check if student already captured
            if (session.capturedStudents.has(result.studentId)) {
                setStatus({
                    type: 'success',
                    message: 'Student already marked present',
                    details: `Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) : 'N/A'}%`
                });
                return;
            }

            // Create attendance record
            const attendanceRecord: AttendanceRecord = {
                studentId: result.studentId,
                facultyId: user.id,
                sectionId: session.sectionId,
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'ml',
                retryCount: 0,
            };

            // Save to local database
            const recordId = await databaseService.insertAttendance(attendanceRecord);

            // Update session state
            const updatedSession = {
                ...session,
                presentCount: session.presentCount + 1,
                capturedStudents: new Set([...session.capturedStudents, result.studentId])
            };
            setSession(updatedSession);

            // Add to recent captures
            setRecentCaptures(prev => [
                { ...attendanceRecord, id: recordId },
                ...prev.slice(0, 9)
            ]);

            // Find student name for display
            const student = students.find(s => s.id === result.studentId);
            const studentName = student?.name || 'Unknown Student';

            // Update status using status indicators
            statusIndicators.reportCaptureSuccess(
                studentName,
                result.confidence || 0,
                updatedSession.presentCount,
                updatedSession.totalStudents
            );

            // Show success confirmation
            showSuccess(
                `${studentName} marked present`,
                `Confidence: ${result.confidence ? (result.confidence * 100).toFixed(0) : 'N/A'}% | ${updatedSession.presentCount}/${updatedSession.totalStudents}`,
                'toast'
            );

        } catch (error) {
            console.error('Failed to save attendance record:', error);
            attendanceStatusService.setError(
                'Failed to save attendance record',
                error instanceof Error ? error.message : 'Database error'
            );
        }
    };

    /**
     * Handle face capture errors
     * Requirements: 2.4, 2.5 - Error handling and fallback options
     */
    const handleFaceCaptureError = (error: MLError) => {
        console.error('Face capture error:', error);
        attendanceStatusService.reportFaceRecognitionError(error.message);
    };

    /**
     * Handle ML model errors
     * Requirements: 2.4, 2.5 - ML error handling
     */
    const handleMLError = (error: MLError) => {
        console.error('ML WebSocket error:', error);

        if (error.type === 'LOW_CONFIDENCE') {
            attendanceStatusService.setError(
                'Low confidence recognition',
                'Please ensure good lighting and clear face visibility'
            );
        } else {
            attendanceStatusService.setError('ML service error', error.message);
        }
    };

    /**
     * Handle student identification from ML service
     * Requirements: 2.3 - Student identification handling
     */
    const handleStudentIdentified = (result: MLResult) => {
        // This is handled by handleFaceCaptureSuccess
        console.log('Student identified via ML service:', result);
    };

    /**
     * Handle WebSocket connection status changes
     * Requirements: 2.1 - Connection status monitoring
     */
    const handleConnectionStatus = (connected: boolean) => {
        if (!connected && isCapturing) {
            attendanceStatusService.setError(
                'ML service disconnected',
                'Attempting to reconnect... Use manual entry if needed'
            );
        }
    };

    /**
     * Handle fallback to manual entry
     * Requirements: 2.4, 2.5 - Fallback mechanism
     */
    const handleFallbackToManual = () => {
        setShowManualEntry(true);
        attendanceStatusService.setError(
            'Face recognition unavailable',
            'Use manual entry to mark attendance'
        );
    };

    /**
     * Manual attendance entry
     * Requirements: 3.1, 3.2 - Manual fallback with local storage
     */
    const markStudentManually = async (studentId: string, isPresent: boolean) => {
        if (!session || !user) return;

        try {
            const attendanceRecord: AttendanceRecord = {
                studentId,
                facultyId: user.id,
                sectionId: session.sectionId,
                timestamp: new Date(),
                status: isPresent ? 'present' : 'absent',
                syncStatus: 'pending',
                captureMethod: 'manual',
                retryCount: 0,
            };

            const recordId = await databaseService.insertAttendance(attendanceRecord);

            // Update session state
            if (isPresent) {
                const updatedSession = {
                    ...session,
                    presentCount: session.presentCount + 1,
                    capturedStudents: new Set([...session.capturedStudents, studentId])
                };
                setSession(updatedSession);
            }

            // Add to recent captures
            setRecentCaptures(prev => [
                { ...attendanceRecord, id: recordId },
                ...prev.slice(0, 9)
            ]);

            const student = students.find(s => s.id === studentId);
            const studentName = student?.name || 'Unknown Student';

            // Update status using status indicators
            statusIndicators.reportManualSuccess(
                studentName,
                isPresent ? 'present' : 'absent',
                session.presentCount,
                session.totalStudents
            );

            // Show success confirmation
            showSuccess(
                `${studentName} marked ${isPresent ? 'present' : 'absent'}`,
                `Manual entry | ${session.presentCount}/${session.totalStudents}`,
                'toast'
            );

        } catch (error) {
            console.error('Failed to save manual attendance:', error);
            Alert.alert('Error', 'Failed to save attendance record');
        }
    };

    /**
     * Toggle camera facing direction
     * Requirements: 2.1 - Camera control
     */
    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    /**
     * Cleanup services on unmount
     */
    const cleanup = () => {
        cameraService.stopAutoCapture();
        faceCaptureService.stopAutoCapture();
        // No WebSocket disconnect needed
        attendanceStatusService.destroy();
    };

    /**
     * Get status indicator color based on status type
     * Requirements: 8.1, 8.4 - Status indicators and user feedback
     */
    const getStatusColor = (type: AttendanceStatus['type']) => {
        switch (type) {
            case 'success': return '#10b981';
            case 'error': return '#ef4444';
            case 'capturing': return '#3b82f6';
            case 'connecting': return '#f59e0b';
            case 'processing': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    if (!isInitialized) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Initializing database...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Attendance Capture</Text>
                    <Text style={styles.headerSubtitle}>AI-powered offline attendance</Text>
                </View>

                {/* Enhanced Status Dashboard */}
                <StatusDashboard variant="compact" />

                {/* Offline Mode Indicator */}
                <OfflineModeIndicator variant="banner" showDetails={true} />

                {/* Attendance Status Indicator */}
                <View style={{ marginHorizontal: 16, marginVertical: 8 }}>
                    <AttendanceStatusIndicator variant="detailed" showProgress={true} />
                </View>

                {showOfflineNotification && (
                    <TouchableOpacity
                        onPress={dismissOfflineNotification}
                        style={styles.dismissibleBanner}
                    >
                        <Text style={styles.dismissibleBannerText}>
                            📴 You&apos;re now offline. Tap to dismiss.
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Status Indicator */}
                <View style={[styles.statusContainer, { backgroundColor: getStatusColor(status.type) }]}>
                    <View style={styles.statusContent}>
                        <Text style={styles.statusMessage}>{status.message}</Text>
                        {status.details && (
                            <Text style={styles.statusDetails}>{status.details}</Text>
                        )}
                    </View>
                    {(status.type === 'connecting' || status.type === 'processing') && (
                        <ActivityIndicator size="small" color="#ffffff" />
                    )}
                </View>

                {/* Section Selection */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Select Section</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.sectionButtons}>
                            {availableSections.map((section) => (
                                <TouchableOpacity
                                    key={section.id}
                                    onPress={() => setSelectedSection(section.id)}
                                    style={[
                                        styles.sectionButton,
                                        selectedSection === section.id && styles.sectionButtonActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.sectionButtonText,
                                        selectedSection === section.id && styles.sectionButtonTextActive
                                    ]}>
                                        {section.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Camera Section */}
                {selectedSection && (
                    <View style={styles.cameraSection}>
                        <View style={styles.cameraContainer}>
                            {permission?.granted ? (
                                <CameraView
                                    ref={cameraRef}
                                    style={styles.camera}
                                    facing={facing}
                                >
                                    <View style={styles.cameraOverlay}>
                                        <View style={[
                                            styles.faceFrame,
                                            { borderColor: isCapturing ? '#10b981' : '#6b7280' }
                                        ]} />

                                        {isCapturing && (
                                            <View style={styles.captureIndicator}>
                                                <Text style={styles.captureText}>
                                                    {session ? `${session.presentCount}/${session.totalStudents}` : 'Capturing...'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </CameraView>
                            ) : (
                                <View style={styles.permissionContainer}>
                                    <Text style={styles.permissionText}>Camera permission required</Text>
                                    <TouchableOpacity
                                        onPress={requestPermission}
                                        style={styles.permissionButton}
                                    >
                                        <Text style={styles.permissionButtonText}>Grant Permission</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Camera Controls */}
                        <View style={styles.cameraControls}>
                            <TouchableOpacity
                                onPress={toggleCameraFacing}
                                style={styles.controlButton}
                                disabled={!permission?.granted}
                            >
                                <Text style={styles.controlButtonText}>Flip Camera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={isCapturing ? stopCaptureSession : startCaptureSession}
                                style={[
                                    styles.captureButton,
                                    { backgroundColor: isCapturing ? '#ef4444' : '#10b981' }
                                ]}
                                disabled={!selectedSection || !permission?.granted}
                            >
                                <Text style={styles.captureButtonText}>
                                    {isCapturing ? 'Stop Capture' : 'Start Capture'}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowManualEntry(true)}
                                style={styles.controlButton}
                                disabled={!selectedSection}
                            >
                                <Text style={styles.controlButtonText}>Manual Entry</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Session Stats */}
                {session && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{session.presentCount}</Text>
                            <Text style={styles.statLabel}>Present</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: '#ef4444' }]}>
                                {session.totalStudents - session.presentCount}
                            </Text>
                            <Text style={styles.statLabel}>Remaining</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statNumber, { color: '#3b82f6' }]}>
                                {session.totalStudents > 0 ?
                                    ((session.presentCount / session.totalStudents) * 100).toFixed(0) : 0}%
                            </Text>
                            <Text style={styles.statLabel}>Complete</Text>
                        </View>
                    </View>
                )}

                {/* Recent Captures */}
                {recentCaptures.length > 0 && (
                    <View style={styles.recentContainer}>
                        <Text style={styles.recentTitle}>Recent Captures</Text>
                        <View style={styles.recentList}>
                            {recentCaptures.slice(0, 5).map((record, index) => {
                                const student = students.find(s => s.id === record.studentId);
                                return (
                                    <View key={`${record.id}-${index}`} style={styles.recentItem}>
                                        <View style={[
                                            styles.recentIcon,
                                            { backgroundColor: record.status === 'present' ? '#10b981' : '#ef4444' }
                                        ]}>
                                            <Text style={styles.recentIconText}>
                                                {record.status === 'present' ? '✓' : '✗'}
                                            </Text>
                                        </View>
                                        <View style={styles.recentInfo}>
                                            <Text style={styles.recentName}>
                                                {student?.name || 'Unknown Student'}
                                            </Text>
                                            <Text style={styles.recentDetails}>
                                                {record.captureMethod === 'ml' ? 'Face Recognition' : 'Manual'} •
                                                {record.timestamp.toLocaleTimeString()}
                                            </Text>
                                        </View>
                                        <View style={[
                                            styles.syncStatus,
                                            { backgroundColor: record.syncStatus === 'synced' ? '#10b981' : '#f59e0b' }
                                        ]}>
                                            <Text style={styles.syncStatusText}>
                                                {record.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Success Confirmation */}
                <SuccessConfirmation
                    visible={confirmation.visible}
                    message={confirmation.message}
                    details={confirmation.details}
                    variant={confirmation.variant}
                    onDismiss={hideSuccess}
                />

                {/* Progress Indicator */}
                <ProgressIndicator
                    visible={progress.visible}
                    progress={progress.progress}
                    message={progress.message}
                    details={progress.details}
                    variant="linear"
                    showPercentage={true}
                />

                {/* Manual Entry Modal */}
                <Modal
                    visible={showManualEntry}
                    animationType="slide"
                    presentationStyle="pageSheet"
                >
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Manual Attendance Entry</Text>
                            <TouchableOpacity
                                onPress={() => setShowManualEntry(false)}
                                style={styles.modalCloseButton}
                            >
                                <Text style={styles.modalCloseText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {students.map((student) => {
                                const isMarked = session?.capturedStudents.has(student.id) || false;
                                return (
                                    <View key={student.id} style={styles.studentItem}>
                                        <View style={styles.studentInfo}>
                                            <Text style={styles.studentName}>{student.name}</Text>
                                            <Text style={styles.studentRoll}>{student.rollNumber}</Text>
                                        </View>

                                        <View style={styles.studentActions}>
                                            <TouchableOpacity
                                                onPress={() => markStudentManually(student.id, true)}
                                                style={[
                                                    styles.actionButton,
                                                    styles.presentButton,
                                                    isMarked && styles.actionButtonDisabled
                                                ]}
                                                disabled={isMarked}
                                            >
                                                <Text style={styles.actionButtonText}>Present</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={() => markStudentManually(student.id, false)}
                                                style={[styles.actionButton, styles.absentButton]}
                                            >
                                                <Text style={styles.actionButtonText}>Absent</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>

                {/* Bottom spacing */}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6b7280',
    },
    header: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 20,
        alignItems: 'center',
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
    statusContainer: {
        margin: 16,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusContent: {
        flex: 1,
    },
    statusMessage: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 2,
    },
    statusDetails: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    sectionContainer: {
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    sectionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    sectionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    sectionButtonActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    sectionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#374151',
    },
    sectionButtonTextActive: {
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
    captureIndicator: {
        position: 'absolute',
        bottom: 40,
        backgroundColor: '#10b981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    captureText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    permissionText: {
        fontSize: 16,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 16,
    },
    permissionButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    permissionButtonText: {
        color: '#ffffff',
        fontSize: 14,
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
    captureButton: {
        flex: 2,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    captureButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    statsContainer: {
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
    recentContainer: {
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
    recentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },
    recentList: {
        gap: 8,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f9fafb',
    },
    recentIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    recentIconText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    recentInfo: {
        flex: 1,
    },
    recentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    recentDetails: {
        fontSize: 12,
        color: '#6b7280',
    },
    syncStatus: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    syncStatusText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#ffffff',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
    },
    modalCloseButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
    },
    modalCloseText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    studentRoll: {
        fontSize: 14,
        color: '#6b7280',
    },
    studentActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    actionButtonDisabled: {
        opacity: 0.5,
    },
    presentButton: {
        backgroundColor: '#10b981',
    },
    absentButton: {
        backgroundColor: '#ef4444',
    },
    actionButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    networkStatus: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    networkStatusText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    dismissibleBanner: {
        backgroundColor: '#f97316',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    dismissibleBannerText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
});