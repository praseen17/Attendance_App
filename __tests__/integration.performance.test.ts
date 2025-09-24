import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { databaseService } from '../services/database';
import { syncService } from '../services/syncService';
import { performanceOptimizer } from '../services/performanceOptimizer';
import { mlWebSocketService } from '../services/mlWebSocketService';

/**
 * Frontend performance integration tests
 * Tests database optimization, sync performance, and overall system performance
 */

describe('Frontend Performance Integration Tests', () => {
    beforeAll(async () => {
        // Initialize database
        await databaseService.initializeDatabase();

        // Start performance optimization
        performanceOptimizer.startOptimization(10000); // 10 second intervals for testing
    });

    afterAll(async () => {
        // Stop performance optimization
        performanceOptimizer.stopOptimization();

        // Close database
        await databaseService.closeDatabase();
    });

    beforeEach(async () => {
        // Clear any existing test data
        await databaseService.clearSyncedRecords(0); // Clear all records
    });

    describe('Database Performance Optimization', () => {
        it('should handle large batch inserts efficiently', async () => {
            const batchSize = 500;
            const testRecords = Array.from({ length: batchSize }, (_, i) => ({
                studentId: `perf-student-${i}`,
                facultyId: 'perf-faculty',
                sectionId: 'perf-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'manual' as const
            }));

            const startTime = Date.now();
            const insertedIds = await databaseService.batchInsertAttendance(testRecords);
            const executionTime = Date.now() - startTime;

            expect(insertedIds).toHaveLength(batchSize);
            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

            console.log(`Batch insert performance: ${batchSize} records in ${executionTime}ms`);

            // Verify data integrity
            const stats = await databaseService.getDatabaseStats();
            expect(stats.totalRecords).toBeGreaterThanOrEqual(batchSize);
        });

        it('should optimize database performance automatically', async () => {
            // Create some test data
            const testRecords = Array.from({ length: 100 }, (_, i) => ({
                studentId: `opt-student-${i}`,
                facultyId: 'opt-faculty',
                sectionId: 'opt-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'synced' as const,
                captureMethod: 'ml' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            // Get initial metrics
            const initialMetrics = await databaseService.getDatabasePerformanceMetrics();

            // Perform optimization
            await databaseService.optimizeDatabase();

            // Get metrics after optimization
            const optimizedMetrics = await databaseService.getDatabasePerformanceMetrics();

            // Database should be optimized (exact metrics depend on SQLite implementation)
            expect(optimizedMetrics.journalMode).toBe('wal');
            expect(optimizedMetrics.cacheSize).toBeGreaterThan(0);

            console.log('Database optimization completed:', {
                before: initialMetrics.databaseSize,
                after: optimizedMetrics.databaseSize,
                journalMode: optimizedMetrics.journalMode
            });
        });

        it('should provide accurate performance metrics', async () => {
            // Create test data with different sync statuses
            const testData = [
                { status: 'pending', count: 50 },
                { status: 'synced', count: 100 },
                { status: 'failed', count: 10 }
            ];

            for (const { status, count } of testData) {
                const records = Array.from({ length: count }, (_, i) => ({
                    studentId: `metrics-student-${status}-${i}`,
                    facultyId: 'metrics-faculty',
                    sectionId: 'metrics-section',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: status as any,
                    captureMethod: 'manual' as const
                }));

                await databaseService.batchInsertAttendance(records);
            }

            const stats = await databaseService.getDatabaseStats();
            const performanceMetrics = await databaseService.getDatabasePerformanceMetrics();

            expect(stats.pendingRecords).toBe(50);
            expect(stats.syncedRecords).toBe(100);
            expect(stats.failedRecords).toBe(10);
            expect(stats.totalRecords).toBe(160);

            expect(performanceMetrics.databaseSize).toBeGreaterThan(0);
            expect(performanceMetrics.pageCount).toBeGreaterThan(0);
        });

        it('should clean up old records efficiently', async () => {
            // Create old synced records
            const oldRecords = Array.from({ length: 50 }, (_, i) => ({
                studentId: `old-student-${i}`,
                facultyId: 'old-faculty',
                sectionId: 'old-section',
                timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                status: 'present' as const,
                syncStatus: 'synced' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(oldRecords);

            const initialStats = await databaseService.getDatabaseStats();
            const cleanedCount = await databaseService.clearSyncedRecords(7); // Keep 7 days
            const finalStats = await databaseService.getDatabaseStats();

            expect(cleanedCount).toBe(50);
            expect(finalStats.syncedRecords).toBeLessThan(initialStats.syncedRecords);

            console.log(`Cleanup performance: removed ${cleanedCount} old records`);
        });
    });

    describe('Sync Performance Optimization', () => {
        it('should handle large sync batches efficiently', async () => {
            // Create large number of pending records
            const recordCount = 200;
            const testRecords = Array.from({ length: recordCount }, (_, i) => ({
                studentId: `sync-student-${i}`,
                facultyId: 'sync-faculty',
                sectionId: 'sync-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            // Mock network service to be online
            const networkService = require('../services/networkService');
            jest.spyOn(networkService.networkService, 'isOnline').mockReturnValue(true);

            // Mock API client to simulate successful sync
            const apiClient = require('../services/apiClient');
            jest.spyOn(apiClient.apiClient, 'syncAttendance').mockResolvedValue({
                success: true,
                data: { syncedCount: recordCount }
            });

            const startTime = Date.now();
            const syncResult = await syncService.syncPendingRecords();
            const executionTime = Date.now() - startTime;

            expect(syncResult.totalRecords).toBe(recordCount);
            expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds

            console.log(`Sync performance: ${recordCount} records in ${executionTime}ms`);

            // Restore mocks
            jest.restoreAllMocks();
        });

        it('should optimize sync configuration based on performance', async () => {
            const initialConfig = syncService.getCurrentConfig();

            // Simulate performance optimization
            const optimizationResult = await performanceOptimizer.performOptimization();

            expect(optimizationResult.syncOptimized).toBe(true);
            expect(optimizationResult.errors).toHaveLength(0);

            const optimizedConfig = syncService.getCurrentConfig();

            // Configuration should be optimized (exact changes depend on current state)
            expect(optimizedConfig.batchSize).toBeGreaterThan(0);
            expect(optimizedConfig.maxRetries).toBeGreaterThan(0);

            console.log('Sync configuration optimization:', {
                before: initialConfig,
                after: optimizedConfig
            });
        });
    });

    describe('Overall System Performance', () => {
        it('should collect comprehensive performance metrics', async () => {
            // Generate some activity
            const testRecords = Array.from({ length: 20 }, (_, i) => ({
                studentId: `metrics-student-${i}`,
                facultyId: 'metrics-faculty',
                sectionId: 'metrics-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            const metrics = await performanceOptimizer.collectMetrics();

            expect(metrics.timestamp).toBeInstanceOf(Date);
            expect(metrics.database.totalRecords).toBeGreaterThan(0);
            expect(metrics.database.databaseSize).toBeGreaterThan(0);
            expect(metrics.sync).toBeDefined();
            expect(metrics.websocket).toBeDefined();
            expect(metrics.memory).toBeDefined();

            console.log('Performance metrics collected:', {
                databaseRecords: metrics.database.totalRecords,
                databaseSize: metrics.database.databaseSize,
                memoryUsage: metrics.memory.memoryUsagePercentage
            });
        });

        it('should provide performance summary with recommendations', async () => {
            // Create conditions that would trigger recommendations
            const manyFailedRecords = Array.from({ length: 60 }, (_, i) => ({
                studentId: `failed-student-${i}`,
                facultyId: 'failed-faculty',
                sectionId: 'failed-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'failed' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(manyFailedRecords);

            const summary = await performanceOptimizer.getPerformanceSummary();

            expect(summary.current).toBeDefined();
            expect(summary.trends).toBeDefined();
            expect(summary.recommendations).toBeInstanceOf(Array);
            expect(summary.lastOptimization).toBeDefined();

            // Should have recommendations for failed records
            const hasFailedRecordsRecommendation = summary.recommendations.some(
                rec => rec.includes('failed records')
            );
            expect(hasFailedRecordsRecommendation).toBe(true);

            console.log('Performance recommendations:', summary.recommendations);
        });

        it('should perform comprehensive system optimization', async () => {
            // Create test data that needs optimization
            const testRecords = Array.from({ length: 100 }, (_, i) => ({
                studentId: `opt-student-${i}`,
                facultyId: 'opt-faculty',
                sectionId: 'opt-section',
                timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                status: 'present' as const,
                syncStatus: 'synced' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            const optimizationResult = await performanceOptimizer.performOptimization();

            expect(optimizationResult.databaseOptimized).toBe(true);
            expect(optimizationResult.syncOptimized).toBe(true);
            expect(optimizationResult.memoryOptimized).toBe(true);

            if (optimizationResult.errors.length > 0) {
                console.warn('Optimization errors:', optimizationResult.errors);
            }

            console.log('System optimization completed:', optimizationResult);
        });

        it('should export performance data for analysis', async () => {
            // Collect some metrics first
            await performanceOptimizer.collectMetrics();
            await new Promise(resolve => setTimeout(resolve, 100));
            await performanceOptimizer.collectMetrics();

            const exportData = performanceOptimizer.exportPerformanceData();
            const parsedData = JSON.parse(exportData);

            expect(parsedData.exportTime).toBeDefined();
            expect(parsedData.metricsCount).toBeGreaterThan(0);
            expect(parsedData.metrics).toBeInstanceOf(Array);
            expect(parsedData.metrics.length).toBeGreaterThan(0);

            // Verify data structure
            const firstMetric = parsedData.metrics[0];
            expect(firstMetric.timestamp).toBeDefined();
            expect(firstMetric.database).toBeDefined();
            expect(firstMetric.sync).toBeDefined();
            expect(firstMetric.websocket).toBeDefined();
            expect(firstMetric.memory).toBeDefined();

            console.log(`Exported ${parsedData.metricsCount} performance metrics`);
        });
    });

    describe('Memory and Resource Management', () => {
        it('should manage memory usage efficiently', async () => {
            const initialMetrics = await performanceOptimizer.collectMetrics();
            const initialMemoryUsage = initialMetrics.memory.memoryUsagePercentage;

            // Create and process large amount of data
            for (let batch = 0; batch < 5; batch++) {
                const batchRecords = Array.from({ length: 100 }, (_, i) => ({
                    studentId: `memory-student-${batch}-${i}`,
                    facultyId: 'memory-faculty',
                    sectionId: 'memory-section',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'manual' as const
                }));

                await databaseService.batchInsertAttendance(batchRecords);
            }

            // Perform optimization to clean up
            await performanceOptimizer.performOptimization();

            const finalMetrics = await performanceOptimizer.collectMetrics();
            const finalMemoryUsage = finalMetrics.memory.memoryUsagePercentage;

            // Memory usage should be managed (not necessarily lower due to test environment)
            console.log('Memory usage:', {
                initial: initialMemoryUsage,
                final: finalMemoryUsage,
                difference: finalMemoryUsage - initialMemoryUsage
            });

            // Should not have excessive memory growth
            expect(finalMemoryUsage - initialMemoryUsage).toBeLessThan(50); // Less than 50% increase
        });

        it('should handle resource cleanup properly', async () => {
            // Create resources that need cleanup
            const testRecords = Array.from({ length: 50 }, (_, i) => ({
                studentId: `cleanup-student-${i}`,
                facultyId: 'cleanup-faculty',
                sectionId: 'cleanup-section',
                timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
                status: 'present' as const,
                syncStatus: 'synced' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            const initialStats = await databaseService.getDatabaseStats();

            // Perform cleanup
            const cleanedCount = await databaseService.clearSyncedRecords(7);

            const finalStats = await databaseService.getDatabaseStats();

            expect(cleanedCount).toBeGreaterThan(0);
            expect(finalStats.totalRecords).toBeLessThan(initialStats.totalRecords);

            console.log(`Resource cleanup: removed ${cleanedCount} old records`);
        });
    });
});