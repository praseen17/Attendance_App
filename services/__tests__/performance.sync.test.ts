import { DatabaseService } from '../database';
import { SyncService } from '../syncService';
import { NetworkService } from '../networkService';

// Mock dependencies
jest.mock('../networkService');
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Frontend Sync Performance Tests', () => {
    let databaseService: DatabaseService;
    let syncService: SyncService;
    let mockNetworkService: jest.Mocked<NetworkService>;

    const LARGE_DATASET_SIZE = 1000;
    const PERFORMANCE_THRESHOLD_MS = 10000; // 10 seconds for frontend operations

    beforeEach(async () => {
        jest.clearAllMocks();

        // Initialize services
        databaseService = new DatabaseService();
        syncService = new SyncService();
        mockNetworkService = new NetworkService() as jest.Mocked<NetworkService>;

        // Setup network service mock
        mockNetworkService.isConnected.mockResolvedValue(true);

        // Initialize in-memory database for testing
        await databaseService.initializeDatabase();
    });

    afterEach(async () => {
        // Clean up database
        if (databaseService) {
            await databaseService.clearAllData();
        }
    });

    describe('Large Dataset Local Storage Performance', () => {
        it('should handle bulk attendance record insertion efficiently', async () => {
            const startTime = Date.now();

            // Generate large dataset
            const attendanceRecords = [];
            const baseDate = new Date();

            for (let i = 0; i < LARGE_DATASET_SIZE; i++) {
                const date = new Date(baseDate);
                date.setDate(date.getDate() - (i % 30)); // Spread over 30 days

                attendanceRecords.push({
                    studentId: `student-${i % 100}`, // 100 unique students
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: date,
                    status: i % 10 === 0 ? 'absent' : 'present', // 10% absent
                    captureMethod: i % 5 === 0 ? 'manual' : 'ml', // 20% manual
                    syncStatus: 'pending'
                });
            }

            // Insert records in batches
            const batchSize = 100;
            for (let i = 0; i < attendanceRecords.length; i += batchSize) {
                const batch = attendanceRecords.slice(i, i + batchSize);
                await Promise.all(
                    batch.map(record => databaseService.insertAttendanceRecord(record))
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Bulk insertion of ${LARGE_DATASET_SIZE} records took ${duration}ms`);

            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

            // Verify all records were inserted
            const pendingRecords = await databaseService.getPendingAttendanceRecords();
            expect(pendingRecords.length).toBe(LARGE_DATASET_SIZE);
        });

        it('should efficiently query large attendance datasets', async () => {
            // Setup large dataset
            const recordCount = 500;
            const students = ['student-1', 'student-2', 'student-3'];

            for (let i = 0; i < recordCount; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);

                await databaseService.insertAttendanceRecord({
                    studentId: students[i % students.length],
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: date,
                    status: 'present',
                    captureMethod: 'ml',
                    syncStatus: 'synced'
                });
            }

            // Test query performance
            const startTime = Date.now();

            const studentAttendance = await databaseService.getAttendanceByStudent(
                'student-1',
                30 // last 30 days
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Query of student attendance took ${duration}ms`);

            expect(duration).toBeLessThan(1000); // Should be under 1 second
            expect(studentAttendance.length).toBeGreaterThan(0);
        });

        it('should handle concurrent database operations efficiently', async () => {
            const concurrentOperations = 20;
            const recordsPerOperation = 50;

            const startTime = Date.now();

            // Create concurrent insertion operations
            const operationPromises = Array.from({ length: concurrentOperations }, async (_, opIndex) => {
                const records = [];

                for (let i = 0; i < recordsPerOperation; i++) {
                    records.push({
                        studentId: `student-${opIndex}-${i}`,
                        facultyId: 'test-faculty',
                        sectionId: 'test-section',
                        timestamp: new Date(),
                        status: 'present' as const,
                        captureMethod: 'ml' as const,
                        syncStatus: 'pending' as const
                    });
                }

                // Insert records for this operation
                return Promise.all(
                    records.map(record => databaseService.insertAttendanceRecord(record))
                );
            });

            await Promise.all(operationPromises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`${concurrentOperations} concurrent operations took ${duration}ms`);

            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

            // Verify all records were inserted
            const totalRecords = await databaseService.getPendingAttendanceRecords();
            expect(totalRecords.length).toBe(concurrentOperations * recordsPerOperation);
        });
    });

    describe('Sync Performance Tests', () => {
        it('should handle large dataset sync within performance threshold', async () => {
            // Setup large pending dataset
            const pendingRecords = [];

            for (let i = 0; i < LARGE_DATASET_SIZE; i++) {
                const record = {
                    id: i + 1,
                    studentId: `student-${i % 100}`,
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: new Date(),
                    status: 'present' as const,
                    captureMethod: 'ml' as const,
                    syncStatus: 'pending' as const
                };

                await databaseService.insertAttendanceRecord(record);
                pendingRecords.push(record);
            }

            // Mock successful sync response
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: LARGE_DATASET_SIZE,
                        failedCount: 0,
                        errors: []
                    }
                })
            });

            // Measure sync performance
            const startTime = Date.now();

            const syncResult = await syncService.syncPendingRecords();

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Sync of ${LARGE_DATASET_SIZE} records took ${duration}ms`);

            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(LARGE_DATASET_SIZE);
        });

        it('should efficiently handle batch sync operations', async () => {
            const batchSize = 100;
            const numberOfBatches = 10;
            const totalRecords = batchSize * numberOfBatches;

            // Setup records
            for (let i = 0; i < totalRecords; i++) {
                await databaseService.insertAttendanceRecord({
                    studentId: `student-${i}`,
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: new Date(),
                    status: 'present',
                    captureMethod: 'ml',
                    syncStatus: 'pending'
                });
            }

            // Mock batch sync responses
            (global.fetch as jest.Mock).mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: async () => ({
                        success: true,
                        data: {
                            syncedCount: batchSize,
                            failedCount: 0,
                            errors: []
                        }
                    })
                })
            );

            const startTime = Date.now();

            // Perform batch sync
            const syncResult = await syncService.syncInBatches(batchSize);

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Batch sync of ${totalRecords} records in ${numberOfBatches} batches took ${duration}ms`);

            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
            expect(syncResult.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(numberOfBatches);
        });

        it('should handle sync retry operations efficiently', async () => {
            const recordCount = 200;
            const failureRate = 0.1; // 10% failure rate

            // Setup records
            for (let i = 0; i < recordCount; i++) {
                await databaseService.insertAttendanceRecord({
                    studentId: `student-${i}`,
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: new Date(),
                    status: 'present',
                    captureMethod: 'ml',
                    syncStatus: 'pending'
                });
            }

            // Mock sync with partial failures
            const expectedFailures = Math.floor(recordCount * failureRate);
            const expectedSuccesses = recordCount - expectedFailures;

            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: expectedSuccesses,
                        failedCount: expectedFailures,
                        errors: Array.from({ length: expectedFailures }, (_, i) => ({
                            recordIndex: i,
                            error: 'Temporary server error'
                        }))
                    }
                })
            });

            // Mock retry success
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    data: {
                        syncedCount: expectedFailures,
                        failedCount: 0,
                        errors: []
                    }
                })
            });

            const startTime = Date.now();

            // Initial sync
            const initialSync = await syncService.syncPendingRecords();

            // Retry failed records
            const retrySync = await syncService.retryFailedRecords();

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Sync with retry of ${recordCount} records took ${duration}ms`);

            expect(duration).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
            expect(initialSync.syncedCount).toBe(expectedSuccesses);
            expect(retrySync.syncedCount).toBe(expectedFailures);
        });
    });

    describe('Memory Usage Performance', () => {
        it('should handle large datasets without excessive memory usage', async () => {
            const initialMemory = process.memoryUsage();

            // Process large dataset in chunks to test memory efficiency
            const chunkSize = 100;
            const totalChunks = 10;

            for (let chunk = 0; chunk < totalChunks; chunk++) {
                const records = [];

                for (let i = 0; i < chunkSize; i++) {
                    records.push({
                        studentId: `student-${chunk}-${i}`,
                        facultyId: 'test-faculty',
                        sectionId: 'test-section',
                        timestamp: new Date(),
                        status: 'present' as const,
                        captureMethod: 'ml' as const,
                        syncStatus: 'pending' as const
                    });
                }

                // Insert chunk
                await Promise.all(
                    records.map(record => databaseService.insertAttendanceRecord(record))
                );

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseKB = memoryIncrease / 1024;

            console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)} KB`);

            // Memory increase should be reasonable (less than 50MB for this test)
            expect(memoryIncreaseKB).toBeLessThan(50 * 1024);

            // Verify all records were processed
            const totalRecords = await databaseService.getPendingAttendanceRecords();
            expect(totalRecords.length).toBe(totalChunks * chunkSize);
        });

        it('should efficiently clean up synced records to manage storage', async () => {
            const recordCount = 500;

            // Insert records
            for (let i = 0; i < recordCount; i++) {
                await databaseService.insertAttendanceRecord({
                    studentId: `student-${i}`,
                    facultyId: 'test-faculty',
                    sectionId: 'test-section',
                    timestamp: new Date(),
                    status: 'present',
                    captureMethod: 'ml',
                    syncStatus: 'pending'
                });
            }

            // Mark half as synced
            const syncedCount = Math.floor(recordCount / 2);
            for (let i = 1; i <= syncedCount; i++) {
                await databaseService.markRecordSynced(i);
            }

            const startTime = Date.now();

            // Clean up synced records
            await databaseService.cleanupSyncedRecords(7); // Keep last 7 days

            const endTime = Date.now();
            const duration = endTime - startTime;

            console.log(`Cleanup of ${syncedCount} synced records took ${duration}ms`);

            expect(duration).toBeLessThan(2000); // Should be under 2 seconds

            // Verify cleanup
            const remainingRecords = await databaseService.getPendingAttendanceRecords();
            expect(remainingRecords.length).toBe(recordCount - syncedCount);
        });
    });
});