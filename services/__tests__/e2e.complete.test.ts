/**
 * End-to-End Tests for Frontend Services
 * Tests complete user workflows and service integration
 */

import { AuthService } from '../authService';
import { DatabaseService } from '../database';
import { SyncService } from '../syncService';
import { MLWebSocketService } from '../mlWebSocketService';
import { NetworkService } from '../networkService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-sqlite');
jest.mock('@react-native-community/netinfo');

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
}));

// Mock fetch
global.fetch = jest.fn();

describe('Frontend E2E Tests', () => {
    let authService: AuthService;
    let databaseService: DatabaseService;
    let syncService: SyncService;
    let mlService: MLWebSocketService;
    let networkService: NetworkService;

    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        authService = new AuthService();
        databaseService = new DatabaseService();
        syncService = new SyncService();
        mlService = new MLWebSocketService();
        networkService = new NetworkService();

        jest.clearAllMocks();
    });

    describe('Complete Authentication and Data Flow', () => {
        it('should complete full login to data sync workflow', async () => {
            // Step 1: Login
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: 'test-token',
                    refreshToken: 'refresh-token',
                    user: {
                        id: 'user-1',
                        username: 'testuser',
                        name: 'Test User',
                        email: 'test@example.com',
                        sections: ['section-1']
                    },
                    expiresIn: 3600
                })
            } as Response);

            const loginResult = await authService.login({
                username: 'testuser',
                password: 'password'
            });

            expect(loginResult.success).toBe(true);
            expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@auth/access_token', 'test-token');

            // Step 2: Initialize database
            await databaseService.initializeDatabase();

            // Step 3: Cache students data
            const students = [
                {
                    id: 'student-1',
                    rollNumber: '001',
                    name: 'John Doe',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            await databaseService.cacheStudents(students);

            // Step 4: Capture attendance offline
            const attendanceRecord = {
                studentId: 'student-1',
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            };

            const recordId = await databaseService.insertAttendance(attendanceRecord);
            expect(recordId).toBe(1);

            // Step 5: Sync when online
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 1,
                    failedCount: 0
                })
            } as Response);

            const syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(1);
        });

        it('should handle offline-to-online transition', async () => {
            // Start offline
            jest.spyOn(networkService, 'isConnected').mockResolvedValue(false);

            // Initialize services
            await databaseService.initializeDatabase();

            // Capture attendance while offline
            const offlineRecords = [
                {
                    studentId: 'student-1',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                },
                {
                    studentId: 'student-2',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'absent' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'manual' as const
                }
            ];

            for (const record of offlineRecords) {
                await databaseService.insertAttendance(record);
            }

            // Verify records are stored locally
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBe(2);

            // Go online
            jest.spyOn(networkService, 'isConnected').mockResolvedValue(true);

            // Mock successful sync
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 2,
                    failedCount: 0
                })
            } as Response);

            // Sync should now work
            const syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(2);
        });
    });

    describe('ML Integration Workflow', () => {
        it('should complete face recognition to attendance capture', async () => {
            // Initialize ML service
            await mlService.connect();

            // Mock WebSocket connection
            const mockWs = {
                send: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                close: jest.fn(),
                readyState: 1
            };

            (mlService as any).ws = mockWs;

            // Simulate face recognition
            const faceData = 'base64-image-data';
            const recognitionPromise = mlService.sendFaceData(faceData);

            // Simulate ML service response
            const mockEvent = {
                data: JSON.stringify({
                    success: true,
                    studentId: 'student-1',
                    confidence: 0.95
                })
            };

            // Trigger the message handler
            const messageHandler = mockWs.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];

            if (messageHandler) {
                messageHandler(mockEvent);
            }

            const result = await recognitionPromise;
            expect(result.success).toBe(true);
            expect(result.studentId).toBe('student-1');
            expect(result.confidence).toBe(0.95);

            // Now capture attendance based on ML result
            await databaseService.initializeDatabase();

            const attendanceRecord = {
                studentId: result.studentId!,
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            };

            const recordId = await databaseService.insertAttendance(attendanceRecord);
            expect(recordId).toBe(1);
        });

        it('should fallback to manual entry when ML fails', async () => {
            await mlService.connect();

            const mockWs = {
                send: jest.fn(),
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                close: jest.fn(),
                readyState: 1
            };

            (mlService as any).ws = mockWs;

            // Simulate ML failure
            const faceData = 'base64-image-data';
            const recognitionPromise = mlService.sendFaceData(faceData);

            // Simulate ML service failure response
            const mockEvent = {
                data: JSON.stringify({
                    success: false,
                    error: 'Face not recognized'
                })
            };

            const messageHandler = mockWs.addEventListener.mock.calls
                .find(call => call[0] === 'message')?.[1];

            if (messageHandler) {
                messageHandler(mockEvent);
            }

            const result = await recognitionPromise;
            expect(result.success).toBe(false);
            expect(result.error).toBe('Face not recognized');

            // Fallback to manual entry
            await databaseService.initializeDatabase();

            const manualRecord = {
                studentId: 'student-1', // Manually selected
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'manual' as const
            };

            const recordId = await databaseService.insertAttendance(manualRecord);
            expect(recordId).toBe(1);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should recover from sync failures', async () => {
            await databaseService.initializeDatabase();

            // Create test records
            const records = [
                {
                    studentId: 'student-1',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                },
                {
                    studentId: 'student-2',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'absent' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'manual' as const
                }
            ];

            for (const record of records) {
                await databaseService.insertAttendance(record);
            }

            // First sync attempt fails
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            let syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(0);

            // Records should still be pending
            const stillPending = await databaseService.getPendingRecords();
            expect(stillPending.length).toBe(2);

            // Second sync attempt succeeds
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 2,
                    failedCount: 0
                })
            } as Response);

            syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(2);
        });

        it('should handle partial sync failures', async () => {
            await databaseService.initializeDatabase();

            // Create test records
            const records = [
                {
                    studentId: 'student-1',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                },
                {
                    studentId: 'invalid-student',
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                }
            ];

            for (const record of records) {
                await databaseService.insertAttendance(record);
            }

            // Partial sync success
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 1,
                    failedCount: 1,
                    errors: [
                        {
                            recordId: 2,
                            error: 'Invalid student ID'
                        }
                    ]
                })
            } as Response);

            const syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(1);
            expect(syncResult.failedRecords).toBe(1);

            // One record should still be pending
            const stillPending = await databaseService.getPendingRecords();
            expect(stillPending.length).toBe(1);
        });

        it('should handle authentication token expiry during operations', async () => {
            // Set up expired token
            mockAsyncStorage.getItem
                .mockResolvedValueOnce('expired-token')
                .mockResolvedValueOnce(new Date(Date.now() - 60000).toISOString()) // 1 minute ago
                .mockResolvedValueOnce('refresh-token');

            // Mock token refresh
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    token: 'new-token',
                    refreshToken: 'new-refresh-token',
                    expiresIn: 3600
                })
            } as Response);

            // Mock successful sync with new token
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 1,
                    failedCount: 0
                })
            } as Response);

            await databaseService.initializeDatabase();

            const record = {
                studentId: 'student-1',
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            };

            await databaseService.insertAttendance(record);

            // Sync should automatically refresh token and succeed
            const syncResult = await syncService.syncPendingRecords();
            expect(syncResult.syncedRecords).toBe(1);

            // Verify token was refreshed
            expect(mockFetch).toHaveBeenCalledTimes(2); // refresh + sync
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle large datasets efficiently', async () => {
            await databaseService.initializeDatabase();

            // Create large number of records
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                studentId: `student-${i}`,
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: (i % 2 === 0 ? 'present' : 'absent') as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            }));

            const startTime = Date.now();

            // Insert all records
            for (const record of largeDataset) {
                await databaseService.insertAttendance(record);
            }

            const insertTime = Date.now() - startTime;
            expect(insertTime).toBeLessThan(10000); // Should complete within 10 seconds

            // Verify all records are stored
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBe(1000);

            // Mock successful batch sync
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: 1000,
                    failedCount: 0
                })
            } as Response);

            const syncStartTime = Date.now();
            const syncResult = await syncService.syncPendingRecords();
            const syncTime = Date.now() - syncStartTime;

            expect(syncResult.syncedRecords).toBe(1000);
            expect(syncTime).toBeLessThan(15000); // Should sync within 15 seconds
        });

        it('should manage memory efficiently during continuous operation', async () => {
            await databaseService.initializeDatabase();

            // Simulate continuous operation with periodic cleanup
            for (let batch = 0; batch < 10; batch++) {
                // Add records
                const batchRecords = Array.from({ length: 100 }, (_, i) => ({
                    studentId: `student-${batch}-${i}`,
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                }));

                for (const record of batchRecords) {
                    await databaseService.insertAttendance(record);
                }

                // Mock sync
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        syncedCount: 100,
                        failedCount: 0
                    })
                } as Response);

                await syncService.syncPendingRecords();

                // Verify memory doesn't grow indefinitely
                const stats = await databaseService.getDatabaseStats();
                expect(stats.pendingRecords).toBeLessThan(50); // Should clean up synced records
            }
        });
    });

    describe('Data Consistency and Integrity', () => {
        it('should maintain data consistency across service operations', async () => {
            await databaseService.initializeDatabase();

            // Cache students
            const students = [
                {
                    id: 'student-1',
                    rollNumber: '001',
                    name: 'John Doe',
                    sectionId: 'section-1',
                    isActive: true
                },
                {
                    id: 'student-2',
                    rollNumber: '002',
                    name: 'Jane Smith',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            await databaseService.cacheStudents(students);

            // Capture attendance for both students
            const records = students.map(student => ({
                studentId: student.id,
                facultyId: 'user-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            }));

            for (const record of records) {
                await databaseService.insertAttendance(record);
            }

            // Verify data consistency
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBe(2);

            const cachedStudents = await databaseService.getCachedStudents('section-1');
            expect(cachedStudents.length).toBe(2);

            // All attendance records should reference valid cached students
            for (const attendance of pendingRecords) {
                const student = cachedStudents.find(s => s.id === attendance.studentId);
                expect(student).toBeDefined();
            }
        });

        it('should handle concurrent operations safely', async () => {
            await databaseService.initializeDatabase();

            // Simulate concurrent attendance capture
            const concurrentOperations = Array.from({ length: 20 }, (_, i) =>
                databaseService.insertAttendance({
                    studentId: `student-${i % 5}`, // 5 different students
                    facultyId: 'user-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present',
                    syncStatus: 'pending',
                    captureMethod: 'ml'
                })
            );

            const results = await Promise.all(concurrentOperations);

            // All operations should succeed
            results.forEach(result => {
                expect(result).toBeGreaterThan(0);
            });

            // Verify all records are stored
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBe(20);

            // Verify data integrity
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(20);
            expect(stats.pendingRecords).toBe(20);
        });
    });
});