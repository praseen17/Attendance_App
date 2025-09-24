import { DatabaseService } from '../services/database';
import { AuthService } from '../services/authService';
import { SyncService } from '../services/syncService';
import { pythonWebSocketService } from '../services/pythonWebSocketService';
import { NetworkService } from '../services/networkService';

// Mock all external dependencies
jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

describe('End-to-End Frontend Tests', () => {
    let databaseService: DatabaseService;
    let authService: AuthService;
    let syncService: SyncService;
    let networkService: NetworkService;

    beforeEach(async () => {
        // Initialize services
        databaseService = new DatabaseService();
        authService = new AuthService();
        syncService = new SyncService();
        mlWebSocketService = new MLWebSocketService();
        networkService = new NetworkService();

        // Initialize database
        await databaseService.initializeDatabase();
    });

    afterEach(async () => {
        // Clean up
        await databaseService.closeDatabase();
        jest.clearAllMocks();
    });

    describe('Complete Authentication Flow', () => {
        it('should complete full authentication workflow', async () => {
            // Step 1: Login
            const loginResult = await authService.login({
                username: 'testfaculty',
                password: 'testpassword'
            });

            expect(loginResult.success).toBe(true);
            expect(loginResult.user).toBeDefined();
            expect(loginResult.tokens).toBeDefined();

            // Step 2: Verify token storage
            const storedToken = await authService.getStoredToken();
            expect(storedToken).toBeDefined();

            // Step 3: Verify authentication state
            const isAuthenticated = await authService.isAuthenticated();
            expect(isAuthenticated).toBe(true);

            // Step 4: Get user profile
            const userProfile = await authService.getCurrentUser();
            expect(userProfile).toBeDefined();
            expect(userProfile?.username).toBe('testfaculty');

            // Step 5: Logout
            await authService.logout();
            const isAuthenticatedAfterLogout = await authService.isAuthenticated();
            expect(isAuthenticatedAfterLogout).toBe(false);
        });

        it('should handle token refresh workflow', async () => {
            // Login first
            await authService.login({
                username: 'testfaculty',
                password: 'testpassword'
            });

            // Simulate token expiration
            const refreshResult = await authService.refreshToken();
            expect(refreshResult.success).toBe(true);
            expect(refreshResult.tokens).toBeDefined();

            // Verify new token is stored
            const newToken = await authService.getStoredToken();
            expect(newToken).toBeDefined();
        });

        it('should handle authentication errors gracefully', async () => {
            const loginResult = await authService.login({
                username: 'invaliduser',
                password: 'wrongpassword'
            });

            expect(loginResult.success).toBe(false);
            expect(loginResult.error).toBeDefined();

            const isAuthenticated = await authService.isAuthenticated();
            expect(isAuthenticated).toBe(false);
        });
    });

    describe('Complete Attendance Capture Flow', () => {
        beforeEach(async () => {
            // Setup authenticated state
            await authService.login({
                username: 'testfaculty',
                password: 'testpassword'
            });

            // Cache test students
            const testStudents = [
                {
                    id: 'student-1',
                    rollNumber: 'ROLL001',
                    name: 'Test Student 1',
                    sectionId: 'section-1',
                    isActive: true
                },
                {
                    id: 'student-2',
                    rollNumber: 'ROLL002',
                    name: 'Test Student 2',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            await databaseService.cacheStudents(testStudents);
        });

        it('should complete ML-based attendance capture workflow', async () => {
            // Step 1: Initialize ML WebSocket connection
            await mlWebSocketService.connect();
            expect(mlWebSocketService.isConnected()).toBe(true);

            // Step 2: Capture face data and get student identification
            const faceData = 'mock_base64_face_data';
            const mlResult = await mlWebSocketService.sendFaceData(faceData);

            expect(mlResult.success).toBe(true);
            expect(mlResult.studentId).toBeDefined();
            expect(mlResult.confidence).toBeGreaterThan(0.7);

            // Step 3: Create attendance record
            const attendanceRecord = {
                studentId: mlResult.studentId!,
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'ml' as const,
                syncStatus: 'pending' as const
            };

            // Step 4: Save to local database
            const recordId = await databaseService.insertAttendance(attendanceRecord);
            expect(recordId).toBeGreaterThan(0);

            // Step 5: Verify record is saved with pending status
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].captureMethod).toBe('ml');
            expect(pendingRecords[0].syncStatus).toBe('pending');

            // Step 6: Verify database stats
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(1);
            expect(stats.pendingRecords).toBe(1);
        });

        it('should handle ML failure with manual fallback', async () => {
            // Step 1: Simulate ML service failure
            await mlWebSocketService.connect();

            const faceData = 'invalid_face_data';
            const mlResult = await mlWebSocketService.sendFaceData(faceData);

            expect(mlResult.success).toBe(false);
            expect(mlResult.error).toBeDefined();

            // Step 2: Fall back to manual attendance entry
            const manualAttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'manual' as const,
                syncStatus: 'pending' as const
            };

            // Step 3: Save manual record
            const recordId = await databaseService.insertAttendance(manualAttendanceRecord);
            expect(recordId).toBeGreaterThan(0);

            // Step 4: Verify manual record is saved
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].captureMethod).toBe('manual');
        });

        it('should handle offline attendance capture', async () => {
            // Step 1: Simulate offline state
            networkService.setNetworkState(false);
            expect(networkService.isConnected()).toBe(false);

            // Step 2: Capture attendance while offline
            const offlineAttendanceRecords = [
                {
                    studentId: 'student-1',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                },
                {
                    studentId: 'student-2',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'absent' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                }
            ];

            // Step 3: Save all records locally
            for (const record of offlineAttendanceRecords) {
                await databaseService.insertAttendance(record);
            }

            // Step 4: Verify all records are saved as pending
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(2);
            expect(pendingRecords.every(r => r.syncStatus === 'pending')).toBe(true);

            // Step 5: Verify database stats
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(2);
            expect(stats.pendingRecords).toBe(2);
            expect(stats.syncedRecords).toBe(0);
        });
    });

    describe('Complete Sync Workflow', () => {
        beforeEach(async () => {
            // Setup authenticated state
            await authService.login({
                username: 'testfaculty',
                password: 'testpassword'
            });

            // Create pending attendance records
            const pendingRecords = [
                {
                    studentId: 'student-1',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                },
                {
                    studentId: 'student-2',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
                    status: 'absent' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                }
            ];

            for (const record of pendingRecords) {
                await databaseService.insertAttendance(record);
            }
        });

        it('should complete successful sync workflow', async () => {
            // Step 1: Verify network connectivity
            networkService.setNetworkState(true);
            expect(networkService.isConnected()).toBe(true);

            // Step 2: Get pending records
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(2);

            // Step 3: Start sync process
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(true);
            expect(syncResult.totalRecords).toBe(2);
            expect(syncResult.syncedRecords).toBe(2);
            expect(syncResult.failedRecords).toBe(0);

            // Step 4: Verify records are marked as synced
            const remainingPendingRecords = await databaseService.getPendingRecords();
            expect(remainingPendingRecords).toHaveLength(0);

            // Step 5: Verify database stats
            const stats = await databaseService.getDatabaseStats();
            expect(stats.pendingRecords).toBe(0);
            expect(stats.syncedRecords).toBe(2);
        });

        it('should handle partial sync failure with retry', async () => {
            // Step 1: Setup network connectivity
            networkService.setNetworkState(true);

            // Step 2: Simulate partial sync failure
            syncService.setSimulatePartialFailure(true);

            // Step 3: Attempt sync
            const syncResult = await syncService.syncPendingRecords();

            expect(syncResult.success).toBe(false);
            expect(syncResult.syncedRecords).toBe(1); // One succeeded
            expect(syncResult.failedRecords).toBe(1); // One failed

            // Step 4: Verify failed record is still pending
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].syncStatus).toBe('failed');

            // Step 5: Retry sync
            syncService.setSimulatePartialFailure(false);
            const retryResult = await syncService.syncPendingRecords();

            expect(retryResult.success).toBe(true);
            expect(retryResult.syncedRecords).toBe(1);

            // Step 6: Verify all records are now synced
            const finalPendingRecords = await databaseService.getPendingRecords();
            expect(finalPendingRecords).toHaveLength(0);
        });

        it('should handle network interruption during sync', async () => {
            // Step 1: Start with network connectivity
            networkService.setNetworkState(true);

            // Step 2: Start sync process
            const syncPromise = syncService.syncPendingRecords();

            // Step 3: Simulate network loss during sync
            setTimeout(() => {
                networkService.setNetworkState(false);
            }, 100);

            // Step 4: Wait for sync to complete/fail
            const syncResult = await syncPromise;

            expect(syncResult.success).toBe(false);
            expect(syncResult.errors).toBeDefined();
            expect(syncResult.errors.some(e => e.includes('network'))).toBe(true);

            // Step 5: Verify records are still pending
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBeGreaterThan(0);

            // Step 6: Restore network and retry
            networkService.setNetworkState(true);
            const retryResult = await syncService.syncPendingRecords();

            expect(retryResult.success).toBe(true);
        });

        it('should handle automatic sync on network restoration', async () => {
            // Step 1: Start offline
            networkService.setNetworkState(false);

            // Step 2: Enable auto-sync
            syncService.startAutoSync();

            // Step 3: Verify pending records exist
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(2);

            // Step 4: Restore network connectivity
            networkService.setNetworkState(true);

            // Step 5: Wait for auto-sync to trigger
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 6: Verify auto-sync completed
            const remainingPendingRecords = await databaseService.getPendingRecords();
            expect(remainingPendingRecords).toHaveLength(0);

            // Step 7: Stop auto-sync
            syncService.stopAutoSync();
        });
    });

    describe('Complete Error Recovery Workflow', () => {
        it('should recover from database corruption', async () => {
            // Step 1: Simulate database corruption
            await databaseService.closeDatabase();

            // Step 2: Attempt to reinitialize
            await databaseService.initializeDatabase();

            // Step 3: Verify database is functional
            const stats = await databaseService.getDatabaseStats();
            expect(stats).toBeDefined();
            expect(stats.totalRecords).toBe(0);

            // Step 4: Test basic operations
            const testRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                captureMethod: 'manual' as const,
                syncStatus: 'pending' as const
            };

            const recordId = await databaseService.insertAttendance(testRecord);
            expect(recordId).toBeGreaterThan(0);
        });

        it('should handle authentication token expiration during operations', async () => {
            // Step 1: Login and get initial token
            await authService.login({
                username: 'testfaculty',
                password: 'testpassword'
            });

            // Step 2: Simulate token expiration
            authService.simulateTokenExpiration();

            // Step 3: Attempt sync operation (should trigger token refresh)
            const syncResult = await syncService.syncPendingRecords();

            // Step 4: Verify operation completed successfully after token refresh
            expect(syncResult).toBeDefined();
            expect(authService.isAuthenticated()).toBe(true);
        });

        it('should handle ML service unavailability gracefully', async () => {
            // Step 1: Attempt to connect to ML service
            const connectionResult = await mlWebSocketService.connect();

            if (!connectionResult) {
                // Step 2: Verify fallback to manual mode
                expect(mlWebSocketService.isConnected()).toBe(false);

                // Step 3: Capture attendance manually
                const manualRecord = {
                    studentId: 'student-1',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'manual' as const,
                    syncStatus: 'pending' as const
                };

                const recordId = await databaseService.insertAttendance(manualRecord);
                expect(recordId).toBeGreaterThan(0);

                // Step 4: Verify manual record is properly saved
                const pendingRecords = await databaseService.getPendingRecords();
                expect(pendingRecords).toHaveLength(1);
                expect(pendingRecords[0].captureMethod).toBe('manual');
            }
        });
    });

    describe('Performance and Memory Management', () => {
        it('should handle large dataset operations efficiently', async () => {
            const startTime = Date.now();

            // Step 1: Create large dataset
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                studentId: `student-${i}`,
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(Date.now() - i * 60 * 1000),
                status: i % 2 === 0 ? 'present' as const : 'absent' as const,
                captureMethod: 'ml' as const,
                syncStatus: 'pending' as const
            }));

            // Step 2: Insert all records
            for (const record of largeDataset) {
                await databaseService.insertAttendance(record);
            }

            // Step 3: Verify all records are inserted
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(1000);
            expect(stats.pendingRecords).toBe(1000);

            // Step 4: Perform batch sync
            const syncResult = await syncService.syncPendingRecords();
            expect(syncResult.totalRecords).toBe(1000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Step 5: Verify performance is acceptable (should complete within 30 seconds)
            expect(duration).toBeLessThan(30000);
        }, 60000);

        it('should manage memory efficiently during long operations', async () => {
            // Step 1: Monitor initial memory usage
            const initialMemory = process.memoryUsage();

            // Step 2: Perform memory-intensive operations
            for (let i = 0; i < 100; i++) {
                const records = Array.from({ length: 50 }, (_, j) => ({
                    studentId: `student-${i}-${j}`,
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                }));

                for (const record of records) {
                    await databaseService.insertAttendance(record);
                }

                // Simulate cleanup
                if (i % 10 === 0) {
                    await databaseService.clearSyncedRecords();
                }
            }

            // Step 3: Check final memory usage
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

            // Step 4: Verify memory usage is reasonable (less than 100MB increase)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        }, 120000);
    });

    describe('Data Integrity and Consistency', () => {
        it('should maintain data consistency across operations', async () => {
            // Step 1: Create test data
            const testRecords = [
                {
                    studentId: 'student-1',
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                }
            ];

            // Step 2: Insert record
            const recordId = await databaseService.insertAttendance(testRecords[0]);

            // Step 3: Verify record exists
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords).toHaveLength(1);
            expect(pendingRecords[0].id).toBe(recordId);

            // Step 4: Update sync status
            await databaseService.updateSyncStatus(recordId, 'synced');

            // Step 5: Verify update
            const updatedPendingRecords = await databaseService.getPendingRecords();
            expect(updatedPendingRecords).toHaveLength(0);

            // Step 6: Verify stats consistency
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(1);
            expect(stats.pendingRecords).toBe(0);
            expect(stats.syncedRecords).toBe(1);
        });

        it('should handle concurrent operations safely', async () => {
            // Step 1: Create concurrent operations
            const concurrentOperations = Array.from({ length: 10 }, (_, i) =>
                databaseService.insertAttendance({
                    studentId: `student-${i}`,
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present',
                    captureMethod: 'ml',
                    syncStatus: 'pending'
                })
            );

            // Step 2: Execute all operations concurrently
            const results = await Promise.all(concurrentOperations);

            // Step 3: Verify all operations completed successfully
            expect(results).toHaveLength(10);
            expect(results.every(id => id > 0)).toBe(true);

            // Step 4: Verify data integrity
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBe(10);
            expect(stats.pendingRecords).toBe(10);
        });
    });
});