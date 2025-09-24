import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { databaseService } from '../services/database';
import { performanceOptimizer } from '../services/performanceOptimizer';

/**
 * Simple performance tests to verify optimizations work
 */

describe('Performance Optimizations', () => {
    beforeAll(async () => {
        await databaseService.initializeDatabase();
    });

    afterAll(async () => {
        await databaseService.closeDatabase();
    });

    describe('Database Performance', () => {
        it('should handle batch inserts efficiently', async () => {
            const batchSize = 100;
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
            expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds

            console.log(`Batch insert performance: ${batchSize} records in ${executionTime}ms`);
        });

        it('should provide database performance metrics', async () => {
            const metrics = await databaseService.getDatabasePerformanceMetrics();

            expect(metrics.databaseSize).toBeGreaterThan(0);
            expect(metrics.pageCount).toBeGreaterThan(0);
            expect(metrics.pageSize).toBeGreaterThan(0);
            expect(metrics.journalMode).toBe('wal');

            console.log('Database performance metrics:', {
                size: metrics.databaseSize,
                pages: metrics.pageCount,
                journalMode: metrics.journalMode
            });
        });

        it('should optimize database efficiently', async () => {
            const startTime = Date.now();
            await databaseService.optimizeDatabase();
            const executionTime = Date.now() - startTime;

            expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds

            console.log(`Database optimization completed in ${executionTime}ms`);
        });
    });

    describe('Performance Optimizer', () => {
        it('should collect performance metrics', async () => {
            const metrics = await performanceOptimizer.collectMetrics();

            expect(metrics.timestamp).toBeInstanceOf(Date);
            expect(metrics.database).toBeDefined();
            expect(metrics.sync).toBeDefined();
            expect(metrics.websocket).toBeDefined();
            expect(metrics.memory).toBeDefined();

            console.log('Performance metrics collected:', {
                databaseRecords: metrics.database.totalRecords,
                databaseSize: metrics.database.databaseSize,
                memoryUsage: metrics.memory.memoryUsagePercentage
            });
        });

        it('should perform system optimization', async () => {
            const startTime = Date.now();
            const result = await performanceOptimizer.performOptimization();
            const executionTime = Date.now() - startTime;

            expect(result.databaseOptimized).toBe(true);
            expect(result.syncOptimized).toBe(true);
            expect(result.memoryOptimized).toBe(true);
            expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

            console.log(`System optimization completed in ${executionTime}ms`, result);
        });

        it('should provide performance summary', async () => {
            const summary = await performanceOptimizer.getPerformanceSummary();

            expect(summary.current).toBeDefined();
            expect(summary.trends).toBeDefined();
            expect(summary.recommendations).toBeInstanceOf(Array);
            expect(summary.lastOptimization).toBeDefined();

            console.log('Performance summary:', {
                recommendations: summary.recommendations.length,
                memoryTrend: summary.trends.memoryTrend,
                lastOptimization: summary.lastOptimization
            });
        });
    });

    describe('Memory Management', () => {
        it('should manage memory usage efficiently', async () => {
            const initialMetrics = await performanceOptimizer.collectMetrics();
            const initialMemoryUsage = initialMetrics.memory.memoryUsagePercentage;

            // Create some data
            const testRecords = Array.from({ length: 50 }, (_, i) => ({
                studentId: `memory-student-${i}`,
                facultyId: 'memory-faculty',
                sectionId: 'memory-section',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'manual' as const
            }));

            await databaseService.batchInsertAttendance(testRecords);

            // Perform optimization
            await performanceOptimizer.performOptimization();

            const finalMetrics = await performanceOptimizer.collectMetrics();
            const finalMemoryUsage = finalMetrics.memory.memoryUsagePercentage;

            console.log('Memory usage:', {
                initial: initialMemoryUsage,
                final: finalMemoryUsage,
                difference: finalMemoryUsage - initialMemoryUsage
            });

            // Memory should be managed (not necessarily lower due to test environment)
            expect(finalMemoryUsage - initialMemoryUsage).toBeLessThan(50); // Less than 50% increase
        });
    });
});