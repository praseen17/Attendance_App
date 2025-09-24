/**
 * Comprehensive Performance Tests for Frontend Services
 * Tests performance under various load conditions and memory usage
 */

import { DatabaseService } from '../database';
import { SyncService } from '../syncService';
import { AuthService } from '../authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-sqlite');
jest.mock('@react-native-community/netinfo');

// Mock fetch
global.fetch = jest.fn();

describe('Frontend Performance Tests', () => {
    let databaseService: DatabaseService;
    let syncService: SyncService;
    let authService: AuthService;

    const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        databaseService = new DatabaseService();
        syncService = new SyncService();
        authService = new AuthService();
        jest.clearAllMocks();
    });

    describe('Database Performance', () => {
        it('should handle large dataset insertions efficiently', async () => {
            await databaseService.initializeDatabase();

            const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
                studentId: `student-${i}`,
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: (i % 2 === 0 ? 'present' : 'absent') as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            }));

            const startTime = performance.now();

            // Insert records in batches for better performance
            const batchSize = 100;
            for (let i = 0; i < largeDataset.length; i += batchSize) {
                const batch = largeDataset.slice(i, i + batchSize);
                const insertPromises = batch.map(record =>
                    databaseService.insertAttendance(record)
                );
                await Promise.all(insertPromises);
            }

            const endTime = performance.now();
            const insertTime = endTime - startTime;

            console.log(`Large Dataset Insert Performance:
                Records: ${largeDataset.length}
                Time: ${insertTime.toFixed(2)}ms
                Rate: ${(largeDataset.length / insertTime * 1000).toFixed(2)} records/second
            `);

            // Verify all records were inserted
            const pendingRecords = await databaseService.getPendingRecords();
            expect(pendingRecords.length).toBe(largeDataset.length);

            // Should complete within reasonable time (10 seconds for 5000 records)
            expect(insertTime).toBeLessThan(10000);
        });

        it('should handle large dataset queries efficiently', async () => {
            await databaseService.initializeDatabase();

            // Insert test data
            const testData = Array.from({ length: 2000 }, (_, i) => ({
                studentId: `student-${i % 100}`, // 100 different students
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(Date.now() - i * 60000), // Different timestamps
                status: (i % 3 === 0 ? 'absent' : 'present') as const,
                syncStatus: 'pending' as const,
                captureMethod: (i % 2 === 0 ? 'ml' : 'manual') as const
            }));

            for (const record of testData) {
                await databaseService.insertAttendance(record);
            }

            // Test query performance
            const queryIterations = 50;
            const queryTimes: number[] = [];

            for (let i = 0; i < queryIterations; i++) {
                const startTime = performance.now();
                const records = await databaseService.getPendingRecords();
                const endTime = performance.now();

                queryTimes.push(endTime - startTime);
                expect(records.length).toBe(testData.length);
            }

            const avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length;
            const maxQueryTime = Math.max(...queryTimes);
            const minQueryTime = Math.min(...queryTimes);

            console.log(`Large Dataset Query Performance:
                Records: ${testData.length}
                Iterations: ${queryIterations}
                Average: ${avgQueryTime.toFixed(2)}ms
                Min: ${minQueryTime.toFixed(2)}ms
                Max: ${maxQueryTime.toFixed(2)}ms
            `);

            expect(avgQueryTime).toBeLessThan(100); // Average should be under 100ms
            expect(maxQueryTime).toBeLessThan(500); // Max should be under 500ms
        });

        it('should handle concurrent database operations efficiently', async () => {
            await databaseService.initializeDatabase();

            const concurrentOperations = 100;
            const operationsPerType = concurrentOperations / 3;

            // Mix of different operations
            const insertOperations = Array.from({ length: operationsPerType }, (_, i) =>
                databaseService.insertAttendance({
                    studentId: `concurrent-student-${i}`,
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present',
                    syncStatus: 'pending',
                    captureMethod: 'ml'
                })
            );

            const queryOperations = Array.from({ length: operationsPerType }, () =>
                databaseService.getPendingRecords()
            );

            const statsOperations = Array.from({ length: operationsPerType }, () =>
                databaseService.getDatabaseStats()
            );

            const startTime = performance.now();

            const results = await Promise.all([
                ...insertOperations,
                ...queryOperations,
                ...statsOperations
            ]);

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            console.log(`Concurrent Operations Performance:
                Total operations: ${concurrentOperations}
                Time: ${totalTime.toFixed(2)}ms
                Rate: ${(concurrentOperations / totalTime * 1000).toFixed(2)} ops/second
            `);

            // All operations should complete successfully
            expect(results.length).toBe(concurrentOperations);
            expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });

    describe('Sync Performance', () => {
        it('should handle small batch sync efficiently', async () => {
            await databaseService.initializeDatabase();

            const batchSize = 50;
            const records = Array.from({ length: batchSize }, (_, i) => ({
                studentId: `student-${i}`,
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            }));

            // Insert records
            for (const record of records) {
                await databaseService.insertAttendance(record);
            }

            // Mock successful sync
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: batchSize,
                    failedCount: 0
                })
            } as Response);

            const startTime = performance.now();
            const result = await syncService.syncPendingRecords();
            const endTime = performance.now();
            const syncTime = endTime - startTime;

            console.log(`Small Batch Sync Performance:
                Records: ${batchSize}
                Time: ${syncTime.toFixed(2)}ms
                Rate: ${(batchSize / syncTime * 1000).toFixed(2)} records/second
            `);

            expect(result.syncedRecords).toBe(batchSize);
            expect(syncTime).toBeLessThan(2000); // Should complete within 2 seconds
        });

        it('should handle large batch sync efficiently', async () => {
            await databaseService.initializeDatabase();

            const batchSize = 1000;
            const records = Array.from({ length: batchSize }, (_, i) => ({
                studentId: `student-${i}`,
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: (i % 4 === 0 ? 'absent' : 'present') as const,
                syncStatus: 'pending' as const,
                captureMethod: (i % 2 === 0 ? 'ml' : 'manual') as const
            }));

            // Insert records in batches
            const insertBatchSize = 50;
            for (let i = 0; i < records.length; i += insertBatchSize) {
                const batch = records.slice(i, i + insertBatchSize);
                const insertPromises = batch.map(record =>
                    databaseService.insertAttendance(record)
                );
                await Promise.all(insertPromises);
            }

            // Mock successful sync
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: batchSize,
                    failedCount: 0
                })
            } as Response);

            const startTime = performance.now();
            const result = await syncService.syncPendingRecords();
            const endTime = performance.now();
            const syncTime = endTime - startTime;

            console.log(`Large Batch Sync Performance:
                Records: ${batchSize}
                Time: ${syncTime.toFixed(2)}ms
                Rate: ${(batchSize / syncTime * 1000).toFixed(2)} records/second
            `);

            expect(result.syncedRecords).toBe(batchSize);
            expect(syncTime).toBeLessThan(10000); // Should complete within 10 seconds
        });

        it('should handle multiple concurrent sync operations', async () => {
            await databaseService.initializeDatabase();

            const concurrentSyncs = 5;
            const recordsPerSync = 100;

            // Create separate datasets for each sync
            for (let syncIndex = 0; syncIndex < concurrentSyncs; syncIndex++) {
                const records = Array.from({ length: recordsPerSync }, (_, i) => ({
                    studentId: `sync-${syncIndex}-student-${i}`,
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                }));

                for (const record of records) {
                    await databaseService.insertAttendance(record);
                }
            }

            // Mock successful syncs
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    syncedCount: recordsPerSync,
                    failedCount: 0
                })
            } as Response);

            const startTime = performance.now();

            // Start concurrent syncs
            const syncPromises = Array.from({ length: concurrentSyncs }, () =>
                syncService.syncPendingRecords()
            );

            const results = await Promise.all(syncPromises);
            const endTime = performance.now();
            const totalTime = endTime - startTime;

            const totalRecords = concurrentSyncs * recordsPerSync;

            console.log(`Concurrent Sync Performance:
                Concurrent syncs: ${concurrentSyncs}
                Records per sync: ${recordsPerSync}
                Total records: ${totalRecords}
                Time: ${totalTime.toFixed(2)}ms
                Rate: ${(totalRecords / totalTime * 1000).toFixed(2)} records/second
            `);

            // All syncs should succeed
            results.forEach(result => {
                expect(result.syncedRecords).toBeGreaterThan(0);
            });

            expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds
        });
    });

    describe('Memory Usage Performance', () => {
        it('should maintain stable memory usage during continuous operations', async () => {
            await databaseService.initializeDatabase();

            const initialMemory = process.memoryUsage();

            // Simulate continuous operation
            for (let cycle = 0; cycle < 10; cycle++) {
                // Insert batch of records
                const batchRecords = Array.from({ length: 200 }, (_, i) => ({
                    studentId: `cycle-${cycle}-student-${i}`,
                    facultyId: 'faculty-1',
                    sectionId: 'section-1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const
                }));

                for (const record of batchRecords) {
                    await databaseService.insertAttendance(record);
                }

                // Query records
                await databaseService.getPendingRecords();
                await databaseService.getDatabaseStats();

                // Mock sync
                mockFetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        syncedCount: 200,
                        failedCount: 0
                    })
                } as Response);

                await syncService.syncPendingRecords();

                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }

            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

            console.log(`Memory Usage Performance:
                Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
                Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB
                Increase: ${memoryIncreaseMB.toFixed(2)} MB
                Cycles: 10
                Records per cycle: 200
            `);

            // Memory increase should be reasonable (less than 50MB for continuous operation)
            expect(memoryIncreaseMB).toBeLessThan(50);
        });

        it('should handle large student cache efficiently', async () => {
            await databaseService.initializeDatabase();

            const largeStudentSet = Array.from({ length: 10000 }, (_, i) => ({
                id: `student-${i}`,
                rollNumber: `ROLL${i.toString().padStart(5, '0')}`,
                name: `Student ${i}`,
                sectionId: `section-${Math.floor(i / 1000)}`,
                isActive: true
            }));

            const startTime = performance.now();
            await databaseService.cacheStudents(largeStudentSet);
            const cacheTime = performance.now() - startTime;

            console.log(`Large Student Cache Performance:
                Students: ${largeStudentSet.length}
                Cache time: ${cacheTime.toFixed(2)}ms
                Rate: ${(largeStudentSet.length / cacheTime * 1000).toFixed(2)} students/second
            `);

            // Test retrieval performance
            const retrievalTimes: number[] = [];
            const iterations = 20;

            for (let i = 0; i < iterations; i++) {
                const sectionId = `section-${Math.floor(Math.random() * 10)}`;
                const startTime = performance.now();
                const students = await databaseService.getCachedStudents(sectionId);
                const endTime = performance.now();

                retrievalTimes.push(endTime - startTime);
                expect(students.length).toBe(1000); // 1000 students per section
            }

            const avgRetrievalTime = retrievalTimes.reduce((a, b) => a + b, 0) / retrievalTimes.length;

            console.log(`Student Cache Retrieval Performance:
                Average retrieval time: ${avgRetrievalTime.toFixed(2)}ms
                Students per retrieval: 1000
                Iterations: ${iterations}
            `);

            expect(cacheTime).toBeLessThan(5000); // Caching should complete within 5 seconds
            expect(avgRetrievalTime).toBeLessThan(50); // Retrieval should be under 50ms
        });
    });

    describe('Authentication Performance', () => {
        it('should handle rapid authentication requests efficiently', async () => {
            const iterations = 100;
            const responseTimes: number[] = [];

            // Mock successful login responses
            mockFetch.mockResolvedValue({
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

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();

                const result = await authService.login({
                    username: 'testuser',
                    password: 'password'
                });

                const endTime = performance.now();
                responseTimes.push(endTime - startTime);

                expect(result.success).toBe(true);
            }

            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const maxResponseTime = Math.max(...responseTimes);
            const minResponseTime = Math.min(...responseTimes);

            console.log(`Authentication Performance:
                Iterations: ${iterations}
                Average: ${avgResponseTime.toFixed(2)}ms
                Min: ${minResponseTime.toFixed(2)}ms
                Max: ${maxResponseTime.toFixed(2)}ms
            `);

            expect(avgResponseTime).toBeLessThan(50); // Average should be under 50ms
            expect(maxResponseTime).toBeLessThan(200); // Max should be under 200ms
        });

        it('should handle token refresh efficiently', async () => {
            const iterations = 50;
            const refreshTimes: number[] = [];

            // Mock token storage
            mockAsyncStorage.getItem.mockResolvedValue('refresh-token');

            // Mock successful refresh responses
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    token: 'new-token',
                    refreshToken: 'new-refresh-token',
                    expiresIn: 3600
                })
            } as Response);

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();

                const newToken = await authService.refreshToken();

                const endTime = performance.now();
                refreshTimes.push(endTime - startTime);

                expect(newToken).toBe('new-token');
            }

            const avgRefreshTime = refreshTimes.reduce((a, b) => a + b, 0) / refreshTimes.length;
            const maxRefreshTime = Math.max(...refreshTimes);

            console.log(`Token Refresh Performance:
                Iterations: ${iterations}
                Average: ${avgRefreshTime.toFixed(2)}ms
                Max: ${maxRefreshTime.toFixed(2)}ms
            `);

            expect(avgRefreshTime).toBeLessThan(100); // Average should be under 100ms
            expect(maxRefreshTime).toBeLessThan(300); // Max should be under 300ms
        });
    });

    describe('Stress Testing', () => {
        it('should handle sustained high-frequency operations', async () => {
            await databaseService.initializeDatabase();

            const duration = 10000; // 10 seconds
            const operationInterval = 10; // Operation every 10ms
            const startTime = Date.now();

            let operationCount = 0;
            let successCount = 0;
            let errorCount = 0;

            const performOperation = async () => {
                try {
                    operationCount++;

                    // Alternate between different operations
                    if (operationCount % 3 === 0) {
                        await databaseService.insertAttendance({
                            studentId: `stress-student-${operationCount}`,
                            facultyId: 'faculty-1',
                            sectionId: 'section-1',
                            timestamp: new Date(),
                            status: 'present',
                            syncStatus: 'pending',
                            captureMethod: 'ml'
                        });
                    } else if (operationCount % 3 === 1) {
                        await databaseService.getPendingRecords();
                    } else {
                        await databaseService.getDatabaseStats();
                    }

                    successCount++;
                } catch (error) {
                    errorCount++;
                }
            };

            // Start high-frequency operations
            const intervalId = setInterval(performOperation, operationInterval);

            // Wait for test duration
            await new Promise(resolve => setTimeout(resolve, duration));

            // Stop operations
            clearInterval(intervalId);

            const actualDuration = Date.now() - startTime;
            const successRate = (successCount / operationCount) * 100;

            console.log(`Stress Test Results:
                Duration: ${actualDuration}ms
                Total operations: ${operationCount}
                Successful: ${successCount}
                Errors: ${errorCount}
                Success rate: ${successRate.toFixed(2)}%
                Operations per second: ${(operationCount / actualDuration * 1000).toFixed(2)}
            `);

            expect(successRate).toBeGreaterThan(95); // At least 95% success rate
            expect(operationCount).toBeGreaterThan(500); // Should handle at least 500 operations
        });
    });
});