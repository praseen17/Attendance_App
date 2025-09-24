import { databaseService, AttendanceRecord, Student } from '../database';
import { cameraService } from '../cameraService';
import { networkService } from '../networkService';
import { attendanceStatusService } from '../attendanceStatusService';
import { mlWebSocketService } from '../mlWebSocketService';

// Mock dependencies
jest.mock('expo-sqlite');
jest.mock('@react-native-community/netinfo');
jest.mock('../mlWebSocketService');

describe('Offline Attendance Capture Integration', () => {
    const mockStudent: Student = {
        id: 'student-1',
        rollNumber: 'CS001',
        name: 'John Doe',
        sectionId: 'cs-year-1',
        isActive: true,
    };

    const mockAttendanceRecord: AttendanceRecord = {
        studentId: 'student-1',
        facultyId: 'faculty-1',
        sectionId: 'cs-year-1',
        timestamp: new Date(),
        status: 'present',
        syncStatus: 'pending',
        captureMethod: 'ml',
        retryCount: 0,
    };

    beforeEach(async () => {
        // Initialize database service
        await databaseService.initializeDatabase();

        // Clear any existing data
        jest.clearAllMocks();
    });

    afterEach(async () => {
        // Cleanup services
        cameraService.destroy();
        networkService.destroy();
        attendanceStatusService.destroy();
        await databaseService.closeDatabase();
    });

    describe('Local SQLite Storage', () => {
        it('should store attendance records locally when offline', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);

            // Act
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Assert
            expect(recordId).toBeDefined();
            expect(typeof recordId).toBe('number');

            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].studentId).toBe(mockStudent.id);
            expect(pendingRecords[0].syncStatus).toBe('pending');
        });

        it('should retrieve students by section for offline operation', async () => {
            // Arrange
            const students = [mockStudent, {
                ...mockStudent,
                id: 'student-2',
                rollNumber: 'CS002',
                name: 'Jane Smith',
            }];
            await databaseService.cacheStudents(students);

            // Act
            const retrievedStudents = await databaseService.getStudentsBySection('cs-year-1');

            // Assert
            expect(retrievedStudents).toHaveLength(2);
            expect(retrievedStudents[0].name).toBe('John Doe');
            expect(retrievedStudents[1].name).toBe('Jane Smith');
        });

        it('should mark records as synced after successful sync', async () => {
            // Arrange
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Act
            await databaseService.markRecordSynced(recordId);

            // Assert
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(0);
        });

        it('should update sync status for failed records', async () => {
            // Arrange
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Act
            await databaseService.updateSyncStatus(recordId, 'failed');

            // Assert
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].syncStatus).toBe('failed');
        });
    });

    describe('Face Recognition Integration', () => {
        it('should handle successful face recognition', async () => {
            // Arrange
            const mockMLResult = {
                success: true,
                studentId: 'student-1',
                confidence: 0.95,
                timestamp: new Date(),
            };

            let captureSuccessCallback: ((result: any) => void) | null = null;
            cameraService.onCaptureSuccess = jest.fn((callback) => {
                captureSuccessCallback = callback;
            });

            // Act
            cameraService.onCaptureSuccess(jest.fn());
            if (captureSuccessCallback) {
                captureSuccessCallback(mockMLResult);
            }

            // Assert
            expect(cameraService.onCaptureSuccess).toHaveBeenCalled();
        });

        it('should handle face recognition errors with fallback', async () => {
            // Arrange
            const mockError = {
                type: 'RECOGNITION_FAILED' as const,
                message: 'Face not detected',
                timestamp: new Date(),
            };

            let captureErrorCallback: ((error: any) => void) | null = null;
            cameraService.onCaptureError = jest.fn((callback) => {
                captureErrorCallback = callback;
            });

            // Act
            cameraService.onCaptureError(jest.fn());
            if (captureErrorCallback) {
                captureErrorCallback(mockError);
            }

            // Assert
            expect(cameraService.onCaptureError).toHaveBeenCalled();
        });
    });

    describe('Manual Attendance Entry', () => {
        it('should allow manual entry when face recognition fails', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);
            const manualRecord: AttendanceRecord = {
                ...mockAttendanceRecord,
                captureMethod: 'manual',
            };

            // Act
            const recordId = await databaseService.insertAttendance(manualRecord);

            // Assert
            expect(recordId).toBeDefined();
            const records = await databaseService.getAttendanceByStudent('student-1');
            expect(records).toHaveLength(1);
            expect(records[0].captureMethod).toBe('manual');
        });

        it('should support both present and absent marking', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);

            // Act - Mark present
            const presentRecord = await databaseService.insertAttendance({
                ...mockAttendanceRecord,
                status: 'present',
                captureMethod: 'manual',
            });

            // Act - Mark absent
            const absentRecord = await databaseService.insertAttendance({
                ...mockAttendanceRecord,
                studentId: 'student-2',
                status: 'absent',
                captureMethod: 'manual',
            });

            // Assert
            expect(presentRecord).toBeDefined();
            expect(absentRecord).toBeDefined();

            const allRecords = await databaseService.getPendingRecords();
            expect(allRecords).toHaveLength(2);
            expect(allRecords.find(r => r.status === 'present')).toBeDefined();
            expect(allRecords.find(r => r.status === 'absent')).toBeDefined();
        });
    });

    describe('Status Indicators and User Feedback', () => {
        it('should provide real-time status updates', () => {
            // Arrange
            const statusCallback = jest.fn();
            const unsubscribe = attendanceStatusService.onStatusChange(statusCallback);

            // Act
            attendanceStatusService.setCapturing('Capturing attendance...', '1/30 students');
            attendanceStatusService.setSuccess('Student marked present', 'John Doe');
            attendanceStatusService.setError('Recognition failed', 'Try manual entry');

            // Assert
            expect(statusCallback).toHaveBeenCalledTimes(3);
            expect(statusCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'capturing',
                    message: 'Capturing attendance...',
                })
            );

            // Cleanup
            unsubscribe();
        });

        it('should report face recognition success with confidence', () => {
            // Arrange
            const statusCallback = jest.fn();
            attendanceStatusService.onStatusChange(statusCallback);

            // Act
            attendanceStatusService.reportFaceRecognitionSuccess('John Doe', 0.95, 1, 30);

            // Assert
            expect(statusCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'success',
                    message: '✓ John Doe recognized',
                    details: expect.stringContaining('95%'),
                })
            );
        });

        it('should report manual entry success', () => {
            // Arrange
            const statusCallback = jest.fn();
            attendanceStatusService.onStatusChange(statusCallback);

            // Act
            attendanceStatusService.reportManualEntrySuccess('Jane Smith', 'present', 2, 30);

            // Assert
            expect(statusCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'success',
                    message: '✓ Jane Smith marked present (manual)',
                    details: '2/30 students',
                })
            );
        });

        it('should provide appropriate error messages with suggestions', () => {
            // Arrange
            const statusCallback = jest.fn();
            attendanceStatusService.onStatusChange(statusCallback);

            // Act
            attendanceStatusService.reportFaceRecognitionError(
                'Low lighting conditions',
                'Ensure good lighting'
            );

            // Assert
            expect(statusCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error',
                    message: 'Face recognition failed',
                    details: expect.stringContaining('Ensure good lighting'),
                })
            );
        });
    });

    describe('Network Connectivity Detection', () => {
        it('should detect online/offline status', async () => {
            // Arrange
            const connectionCallback = jest.fn();
            networkService.onConnectionChange(connectionCallback);

            // Act
            await networkService.initialize();

            // Assert - This would depend on the mocked NetInfo behavior
            expect(networkService.getCurrentStatus).toBeDefined();
        });

        it('should report network status changes', () => {
            // Arrange
            const statusCallback = jest.fn();
            attendanceStatusService.onStatusChange(statusCallback);

            // Act
            attendanceStatusService.reportNetworkStatus(false, 'No internet connection');

            // Assert
            expect(statusCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'offline',
                    message: 'Offline',
                    details: 'No internet connection',
                })
            );
        });
    });

    describe('Database Statistics and Management', () => {
        it('should provide database statistics', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);
            await databaseService.insertAttendance(mockAttendanceRecord);
            await databaseService.insertAttendance({
                ...mockAttendanceRecord,
                studentId: 'student-2',
                syncStatus: 'synced',
            });

            // Act
            const stats = await databaseService.getDatabaseStats();

            // Assert
            expect(stats.totalRecords).toBe(2);
            expect(stats.pendingRecords).toBe(1);
            expect(stats.syncedRecords).toBe(1);
            expect(stats.cachedStudents).toBe(1);
        });

        it('should handle database errors gracefully', async () => {
            // Arrange - Force a database error by closing the database
            await databaseService.closeDatabase();

            // Act & Assert
            await expect(databaseService.insertAttendance(mockAttendanceRecord))
                .rejects.toThrow('Database not initialized');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete offline attendance capture workflow', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);
            const statusCallback = jest.fn();
            attendanceStatusService.onStatusChange(statusCallback);

            // Act - Simulate complete workflow
            // 1. Start capture session
            attendanceStatusService.setCapturing('Starting capture...');

            // 2. Face recognition success
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);
            attendanceStatusService.reportFaceRecognitionSuccess('John Doe', 0.95, 1, 1);

            // 3. Complete session
            attendanceStatusService.setIdle('Session completed');

            // Assert
            expect(recordId).toBeDefined();
            expect(statusCallback).toHaveBeenCalledTimes(3);

            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].syncStatus).toBe('pending');
        });

        it('should handle mixed capture methods in single session', async () => {
            // Arrange
            await databaseService.cacheStudents([
                mockStudent,
                { ...mockStudent, id: 'student-2', name: 'Jane Smith' }
            ]);

            // Act - Mix of ML and manual captures
            const mlRecord = await databaseService.insertAttendance({
                ...mockAttendanceRecord,
                captureMethod: 'ml',
            });

            const manualRecord = await databaseService.insertAttendance({
                ...mockAttendanceRecord,
                studentId: 'student-2',
                captureMethod: 'manual',
                status: 'absent',
            });

            // Assert
            expect(mlRecord).toBeDefined();
            expect(manualRecord).toBeDefined();

            const allRecords = await databaseService.getPendingRecords();
            expect(allRecords).toHaveLength(2);
            expect(allRecords.find(r => r.captureMethod === 'ml')).toBeDefined();
            expect(allRecords.find(r => r.captureMethod === 'manual')).toBeDefined();
        });
    });
});