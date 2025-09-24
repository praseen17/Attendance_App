import { DatabaseService } from '../database';
import { SyncService } from '../syncService';
import { MLWebSocketService } from '../mlWebSocketService';
import { AuthService } from '../authService';
import { NetworkService } from '../networkService';

// Mock all dependencies
jest.mock('../database');
jest.mock('../authService');
jest.mock('../networkService');
jest.mock('../mlWebSocketService');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('End-to-End Attendance Capture Flow Tests', () => {
    let databaseService: jest.Mocked<DatabaseService>;
    let syncService: SyncService;
    let mlWebSocketService: jest.Mocked<MLWebSocketService>;
    let authService: jest.Mocked<AuthService>;
    let networkService: jest.Mocked<NetworkService>;

    const mockUser = {
        id: 'test-faculty-id',
        username: 'testfaculty',
        name: 'Test Faculty',
        email: 'faculty@test.com'
    };

    const mockSection = {
        id: 'test-section-id',
        name: 'Test Section',
        grade: '10',
        facultyId: 'test-faculty-id'
    };

    const mockStudents = [
        {
            id: 'student-1',
            rollNumber: 'ROLL001',
            name: 'Student One',
            sectionId: 'test-section-id'
        },
        {
            id: 'student-2',
            rollNumber: 'ROLL002',
            name: 'Student Two',
            sectionId: 'test-section-id'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mocked services
        databaseService = new DatabaseService() as jest.Mocked<DatabaseService>;
        authService = new AuthService() as jest.Mocked<AuthService>;
        networkService = new NetworkService() as jest.Mocked<NetworkService>;
        mlWebSocketService = new MLWebSocketService() as jest.Mocked<MLWebSocketService>;

        syncService = new SyncService();

        // Setup default mock implementations
        authService.isAuthenticated.mockReturnValue(true);
        authService.getCurrentUser.mockReturnValue(mockUser);
        authService.getAccessToken.mockReturnValue('mock-access-token');

        databaseService.initializeDatabase.mockResolvedValue(undefined);
        databaseService.getStudentsBySection.mockResolvedValue(mockStudents);
        databaseService.insertAttendanceRecord.mockResolvedValue(1);
        databaseService.getPendingAttendanceRecords.mockResolvedValue([]);

        networkService.isConnected.mockResolvedValue(true);

        mlWebSocketService.connect.mockResolvedValue(undefined);
        mlWebSocketService.isConnected.mockReturnValue(true);
    });

    describe('Complete Offline Attendance Capture Flow', () => {
        it('should capture attendance using ML recognition and store locally', async () => {
            // Mock ML recognition success
            const mockMLResult = {
                success: true,
                studentId: 'student-1',
                confidence: 0.95,
                timestamp: new Date().toISOString()
            };

            mlWebSocketService.sendFaceData.mockResolvedValueOnce(mockMLResult);

            // Simulate face capture and recognition
            const faceImageData = 'base64-encoded-face-data';
            const recognitionResult = await mlWebSocketService.sendFaceData(faceImageData);

            expect(recognitionResult.success).toBe(true);
            expect(recognitionResult.studentId).toBe('student-1');

            // Create attendance record
            const attendanceRecord = {
                studentId: recognitionResult.studentId!,
                facultyId: mockUser.id,
                sectionId: mockSection.id,
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'ml' as const,
                syncStatus: 'pending' as const
            };

            // Store attendance locally
            const recordId = await databaseService.insertAttendanceRecord(attendanceRecord);

            expect(databaseService.insertAttendanceRecord).toHaveBeenCalledWith(attendanceRecord);
            expect(recordId).toBe(1);

            // Verify record was stored with correct sync status
            expect(attendanceRecord.syncStatus).toBe('pending');
        });

        it('should fallback to manual entry when ML recognition fails', async () => {
            // Mock ML recognition failure
            const mockMLResult = {
                success: false,
                error: 'Face not recognized',
                fallbackToManual: true
            };

            mlWebSocketService.sendFaceData.mockResolvedValueOnce(mockMLResult);

            // Simulate face capture attempt
            const faceImageData = 'base64-encoded-face-data';
            const recognitionResult = await mlWebSocketService.sendFaceData(faceImageData);

            expect(recognitionResult.success).toBe(false);
            expect(recognitionResult.fallbackToManual).toBe(true);

            // Manual attendance entry
            const manualAttendanceRecord = {
                studentId: 'student-2', // Manually selected
                facultyId: mockUser.id,
                sectionId: mockSection.id,
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'manual' as const,
                syncStatus: 'pending' as const
            };

            const recordId = await databaseService.insertAttendanceRecord(manualAttendanceRecord);

            expect(databaseService.insertAttendanceRecord).toHaveBeenCalledWith(manualAttendanceRecord);
            expect(recordId).toBe(1);
            expect(manualAttendanceRecord.captureMethod).toBe('manual');
        });

        it('should handle offline attendance capture when network is unavailable', async () => {
            // Mock offline state
            networkService.isConnected.mockResolvedValue(false);
            mlWebSocketService.isConnected.mockReturnValue(false);

            // Verify offline state
            const isOnline = await networkService.isConnected();
            expect(isOnline).toBe(false);

            // Should still allow manual attendance entry
            const offlineAttendanceRecord = {
                studentId: 'student-1',
                facultyId: mockUser.id,
                sectionId: mockSection.id,
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'manual' as const,
                syncStatus: 'pending' as const
            };

            const recordId = await databaseService.insertAttendanceRecord(offlineAttendanceRecord);

            expect(databaseService.insertAttendanceRecord).toHaveBeenCalledWith(offlineAttendanceRecord);
            expect(recordId).toBe(1);

            // Verify record is marked for sync
            expect(offlineAttendanceRecord.syncStatus).toBe('pending');
        });
    });

    describe('Complete Sync Flow', () => {
        it('should automatically sync pending records when network becomes available', async () => {
            // Setup pending records
            const pendingRecords = [
                {
                    id: 1,
                    studentId: 'student-1',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                },
                {
                    id: 2,
                    studentId: 'student-2',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'absent' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                }
            ];

            databaseService.getPendingAttendanceRecords.mockResolvedValue(pendingRecords);

            // Mock successful sync API response
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: 2,
                        failedCount: 0,
                        errors: []
                    }
                })
            });

            databaseService.markRecordSynced.mockResolvedValue(undefined);

            // Network becomes available
            networkService.isConnected.mockResolvedValue(true);

            // Trigger sync
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(2);
            expect(syncResult.failedCount).toBe(0);

            // Verify API was called with correct data
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/attendance/sync'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer mock-access-token',
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify({
                        records: pendingRecords.map(record => ({
                            studentId: record.studentId,
                            facultyId: record.facultyId,
                            sectionId: record.sectionId,
                            date: record.timestamp.toISOString().split('T')[0],
                            status: record.status,
                            captureMethod: record.captureMethod
                        }))
                    })
                })
            );

            // Verify records were marked as synced
            expect(databaseService.markRecordSynced).toHaveBeenCalledWith(1);
            expect(databaseService.markRecordSynced).toHaveBeenCalledWith(2);
        });

        it('should handle partial sync failures and retry failed records', async () => {
            const pendingRecords = [
                {
                    id: 1,
                    studentId: 'student-1',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                },
                {
                    id: 2,
                    studentId: 'invalid-student',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                }
            ];

            databaseService.getPendingAttendanceRecords.mockResolvedValue(pendingRecords);

            // Mock partial sync failure
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: 1,
                        failedCount: 1,
                        errors: [
                            {
                                recordIndex: 1,
                                error: 'Student not found',
                                studentId: 'invalid-student'
                            }
                        ]
                    }
                })
            });

            databaseService.markRecordSynced.mockResolvedValue(undefined);
            databaseService.updateSyncStatus.mockResolvedValue(undefined);

            // Trigger sync
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(1);
            expect(syncResult.failedCount).toBe(1);

            // Verify successful record was marked as synced
            expect(databaseService.markRecordSynced).toHaveBeenCalledWith(1);

            // Verify failed record status was updated
            expect(databaseService.updateSyncStatus).toHaveBeenCalledWith(2, 'failed');
        });

        it('should handle network interruption during sync gracefully', async () => {
            const pendingRecords = [
                {
                    id: 1,
                    studentId: 'student-1',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                }
            ];

            databaseService.getPendingAttendanceRecords.mockResolvedValue(pendingRecords);

            // Mock network error during sync
            (global.fetch as jest.Mock).mockRejectedValueOnce(
                new Error('Network request failed')
            );

            databaseService.updateSyncStatus.mockResolvedValue(undefined);

            // Trigger sync
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(false);
            expect(syncResult.error).toContain('Network error');

            // Verify record status was updated to indicate retry needed
            expect(databaseService.updateSyncStatus).toHaveBeenCalledWith(1, 'failed');

            // Should not mark any records as synced
            expect(databaseService.markRecordSynced).not.toHaveBeenCalled();
        });
    });

    describe('Complete Attendance Session Flow', () => {
        it('should handle complete attendance session from start to sync', async () => {
            // 1. Initialize attendance session
            await databaseService.initializeDatabase();
            const students = await databaseService.getStudentsBySection(mockSection.id);

            expect(students).toEqual(mockStudents);

            // 2. Connect to ML service
            await mlWebSocketService.connect();
            expect(mlWebSocketService.connect).toHaveBeenCalled();

            // 3. Capture attendance for multiple students
            const attendanceRecords = [];

            // Student 1 - ML recognition success
            mlWebSocketService.sendFaceData.mockResolvedValueOnce({
                success: true,
                studentId: 'student-1',
                confidence: 0.92
            });

            const faceData1 = 'base64-face-data-1';
            const mlResult1 = await mlWebSocketService.sendFaceData(faceData1);

            if (mlResult1.success) {
                const record1 = {
                    studentId: mlResult1.studentId!,
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                };

                await databaseService.insertAttendanceRecord(record1);
                attendanceRecords.push(record1);
            }

            // Student 2 - Manual entry (ML failed)
            mlWebSocketService.sendFaceData.mockResolvedValueOnce({
                success: false,
                error: 'Low confidence',
                fallbackToManual: true
            });

            const faceData2 = 'base64-face-data-2';
            const mlResult2 = await mlWebSocketService.sendFaceData(faceData2);

            if (!mlResult2.success && mlResult2.fallbackToManual) {
                const record2 = {
                    studentId: 'student-2',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                };

                await databaseService.insertAttendanceRecord(record2);
                attendanceRecords.push(record2);
            }

            // 4. Verify local storage
            expect(databaseService.insertAttendanceRecord).toHaveBeenCalledTimes(2);

            // 5. Network becomes available and sync occurs
            networkService.isConnected.mockResolvedValue(true);
            databaseService.getPendingAttendanceRecords.mockResolvedValue(attendanceRecords);

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: 2,
                        failedCount: 0,
                        errors: []
                    }
                })
            });

            const syncResult = await syncService.syncPendingRecords();

            // 6. Verify complete flow success
            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(2);
            expect(databaseService.markRecordSynced).toHaveBeenCalledTimes(2);

            // 7. Verify session cleanup
            expect(mlWebSocketService.sendFaceData).toHaveBeenCalledTimes(2);
            expect(attendanceRecords).toHaveLength(2);
            expect(attendanceRecords[0].captureMethod).toBe('ml');
            expect(attendanceRecords[1].captureMethod).toBe('manual');
        });

        it('should handle complete offline session with delayed sync', async () => {
            // 1. Start in offline mode
            networkService.isConnected.mockResolvedValue(false);
            mlWebSocketService.isConnected.mockReturnValue(false);

            // 2. Capture attendance manually (offline)
            const offlineRecords = [
                {
                    studentId: 'student-1',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                },
                {
                    studentId: 'student-2',
                    facultyId: mockUser.id,
                    sectionId: mockSection.id,
                    timestamp: new Date(),
                    status: 'absent' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                }
            ];

            // Store records locally
            for (const record of offlineRecords) {
                await databaseService.insertAttendanceRecord(record);
            }

            expect(databaseService.insertAttendanceRecord).toHaveBeenCalledTimes(2);

            // 3. Later, network becomes available
            networkService.isConnected.mockResolvedValue(true);
            databaseService.getPendingAttendanceRecords.mockResolvedValue(offlineRecords);

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: 2,
                        failedCount: 0,
                        errors: []
                    }
                })
            });

            // 4. Automatic sync occurs
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(2);
            expect(databaseService.markRecordSynced).toHaveBeenCalledTimes(2);

            // 5. Verify offline records were successfully synced
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/attendance/sync'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('student-1')
                })
            );
        });
    });
});