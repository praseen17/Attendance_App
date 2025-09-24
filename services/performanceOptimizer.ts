import { databaseService } from './database';
import { syncService } from './syncService';
import { mlWebSocketService } from './mlWebSocketService';

/**
 * Frontend performance optimization service
 * Handles database cleanup, sync optimization, and performance monitoring
 */

export interface PerformanceMetrics {
    timestamp: Date;
    database: {
        totalRecords: number;
        pendingRecords: number;
        syncedRecords: number;
        failedRecords: number;
        databaseSize: number;
        cacheHitRate: number;
    };
    sync: {
        isActive: boolean;
        totalSynced: number;
        totalFailed: number;
        averageSyncTime: number;
        lastSyncTime: Date | null;
    };
    websocket: {
        isConnected: boolean;
        reconnectCount: number;
        messagesSent: number;
        messagesReceived: number;
    };
    memory: {
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
        usedJSHeapSize: number;
        memoryUsagePercentage: number;
    };
}

export class PerformanceOptimizer {
    private static instance: PerformanceOptimizer;
    private metricsHistory: PerformanceMetrics[] = [];
    private readonly MAX_HISTORY_SIZE = 100;
    private optimizationTimer: ReturnType<typeof setInterval> | null = null;
    private lastOptimizationTime: Date | null = null;

    private constructor() { }

    public static getInstance(): PerformanceOptimizer {
        if (!PerformanceOptimizer.instance) {
            PerformanceOptimizer.instance = new PerformanceOptimizer();
        }
        return PerformanceOptimizer.instance;
    }

    /**
     * Start automatic performance optimization
     */
    public startOptimization(intervalMs: number = 300000): void { // Default 5 minutes
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
        }

        this.optimizationTimer = setInterval(async () => {
            await this.performOptimization();
        }, intervalMs);

        console.log(`Performance optimization started with ${intervalMs}ms interval`);
    }

    /**
     * Stop automatic performance optimization
     */
    public stopOptimization(): void {
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = null;
        }
        console.log('Performance optimization stopped');
    }

    /**
     * Perform comprehensive performance optimization
     */
    public async performOptimization(): Promise<{
        databaseOptimized: boolean;
        syncOptimized: boolean;
        memoryOptimized: boolean;
        errors: string[];
    }> {
        console.log('Starting performance optimization...');
        const startTime = Date.now();
        const errors: string[] = [];

        let databaseOptimized = false;
        let syncOptimized = false;
        let memoryOptimized = false;

        try {
            // Database optimization
            try {
                await this.optimizeDatabase();
                databaseOptimized = true;
            } catch (error) {
                errors.push(`Database optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Sync optimization
            try {
                await this.optimizeSync();
                syncOptimized = true;
            } catch (error) {
                errors.push(`Sync optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            // Memory optimization
            try {
                await this.optimizeMemory();
                memoryOptimized = true;
            } catch (error) {
                errors.push(`Memory optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }

            this.lastOptimizationTime = new Date();
            const duration = Date.now() - startTime;

            console.log(`Performance optimization completed in ${duration}ms`);

            return {
                databaseOptimized,
                syncOptimized,
                memoryOptimized,
                errors
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Performance optimization failed: ${errorMessage}`);

            return {
                databaseOptimized,
                syncOptimized,
                memoryOptimized,
                errors
            };
        }
    }

    /**
     * Optimize database performance
     */
    private async optimizeDatabase(): Promise<void> {
        console.log('Optimizing database...');

        // Get database statistics
        const stats = await databaseService.getDatabaseStats();

        // Clean up old synced records if there are too many
        if (stats.syncedRecords > 1000) {
            const cleanedCount = await databaseService.clearSyncedRecords(7); // Keep 7 days
            console.log(`Cleaned up ${cleanedCount} old synced records`);
        }

        // Optimize database if it's getting large
        const performanceMetrics = await databaseService.getDatabasePerformanceMetrics();
        if (performanceMetrics.databaseSize > 50 * 1024 * 1024) { // 50MB
            await databaseService.optimizeDatabase();
            console.log('Database optimization completed');
        }

        console.log('Database optimization completed');
    }

    /**
     * Optimize sync performance
     */
    private async optimizeSync(): Promise<void> {
        console.log('Optimizing sync performance...');

        // Get sync statistics
        const syncStats = await syncService.getSyncStatistics();

        // If there are many failed records, attempt to retry them
        if (syncStats.failedRecords > 10) {
            console.log(`Attempting to retry ${syncStats.failedRecords} failed records`);
            // Force sync to retry failed records
            await syncService.forcSync();
        }

        // Optimize sync configuration based on performance
        const currentConfig = syncService.getCurrentConfig();

        // Adjust batch size based on performance
        if (syncStats.pendingRecords > 500) {
            // Increase batch size for large datasets
            syncService.updateConfig({ batchSize: Math.min(100, currentConfig.batchSize * 1.5) });
        } else if (syncStats.pendingRecords < 50) {
            // Decrease batch size for smaller datasets
            syncService.updateConfig({ batchSize: Math.max(10, currentConfig.batchSize * 0.8) });
        }

        console.log('Sync optimization completed');
    }

    /**
     * Optimize memory usage
     */
    private async optimizeMemory(): Promise<void> {
        console.log('Optimizing memory usage...');

        // Clear old metrics history
        if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
            this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY_SIZE);
        }

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
            console.log('Garbage collection triggered');
        }

        // Clear any cached data that's no longer needed
        // This would depend on your specific caching implementation

        console.log('Memory optimization completed');
    }

    /**
     * Collect current performance metrics
     */
    public async collectMetrics(): Promise<PerformanceMetrics> {
        const timestamp = new Date();

        // Database metrics
        const dbStats = await databaseService.getDatabaseStats();
        const dbPerformance = await databaseService.getDatabasePerformanceMetrics();

        // Sync metrics
        const syncStats = await syncService.getSyncStatistics();
        const syncProgress = syncService.getCurrentProgress();

        // WebSocket metrics
        const wsConnected = mlWebSocketService.isWebSocketConnected();

        // Memory metrics (if available)
        const memoryMetrics = this.getMemoryMetrics();

        const metrics: PerformanceMetrics = {
            timestamp,
            database: {
                totalRecords: dbStats.totalRecords,
                pendingRecords: dbStats.pendingRecords,
                syncedRecords: dbStats.syncedRecords,
                failedRecords: dbStats.failedRecords,
                databaseSize: dbPerformance.databaseSize,
                cacheHitRate: 0 // Would need to implement cache hit tracking
            },
            sync: {
                isActive: syncProgress.isActive,
                totalSynced: syncStats.syncedRecords,
                totalFailed: syncStats.failedRecords,
                averageSyncTime: 0, // Would need to track sync times
                lastSyncTime: syncStats.lastSyncTime
            },
            websocket: {
                isConnected: wsConnected,
                reconnectCount: 0, // Would need to track reconnections
                messagesSent: 0, // Would need to track messages
                messagesReceived: 0
            },
            memory: memoryMetrics
        };

        // Add to history
        this.metricsHistory.push(metrics);

        // Limit history size
        if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
            this.metricsHistory.shift();
        }

        return metrics;
    }

    /**
     * Get memory usage metrics
     */
    private getMemoryMetrics(): PerformanceMetrics['memory'] {
        // Use performance.memory if available (Chrome/Edge)
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            return {
                jsHeapSizeLimit: memory.jsHeapSizeLimit || 0,
                totalJSHeapSize: memory.totalJSHeapSize || 0,
                usedJSHeapSize: memory.usedJSHeapSize || 0,
                memoryUsagePercentage: memory.jsHeapSizeLimit > 0
                    ? (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
                    : 0
            };
        }

        // Fallback for environments without performance.memory
        return {
            jsHeapSizeLimit: 0,
            totalJSHeapSize: 0,
            usedJSHeapSize: 0,
            memoryUsagePercentage: 0
        };
    }

    /**
     * Get performance metrics history
     */
    public getMetricsHistory(limit?: number): PerformanceMetrics[] {
        if (limit) {
            return this.metricsHistory.slice(-limit);
        }
        return [...this.metricsHistory];
    }

    /**
     * Get performance summary
     */
    public async getPerformanceSummary(): Promise<{
        current: PerformanceMetrics;
        trends: {
            databaseGrowthRate: number;
            syncSuccessRate: number;
            memoryTrend: 'increasing' | 'decreasing' | 'stable';
        };
        recommendations: string[];
        lastOptimization: Date | null;
    }> {
        const current = await this.collectMetrics();
        const recommendations: string[] = [];

        // Calculate trends from recent history
        const recentMetrics = this.metricsHistory.slice(-10);
        let databaseGrowthRate = 0;
        let syncSuccessRate = 100;
        let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';

        if (recentMetrics.length > 1) {
            // Database growth rate
            const oldestMetric = recentMetrics[0];
            const newestMetric = recentMetrics[recentMetrics.length - 1];
            const timeDiff = newestMetric.timestamp.getTime() - oldestMetric.timestamp.getTime();
            const sizeDiff = newestMetric.database.databaseSize - oldestMetric.database.databaseSize;
            databaseGrowthRate = timeDiff > 0 ? (sizeDiff / timeDiff) * 1000 * 60 * 60 * 24 : 0; // bytes per day

            // Sync success rate
            const totalSynced = newestMetric.sync.totalSynced - oldestMetric.sync.totalSynced;
            const totalFailed = newestMetric.sync.totalFailed - oldestMetric.sync.totalFailed;
            const totalAttempts = totalSynced + totalFailed;
            syncSuccessRate = totalAttempts > 0 ? (totalSynced / totalAttempts) * 100 : 100;

            // Memory trend
            const memoryDiff = newestMetric.memory.memoryUsagePercentage - oldestMetric.memory.memoryUsagePercentage;
            if (memoryDiff > 5) {
                memoryTrend = 'increasing';
            } else if (memoryDiff < -5) {
                memoryTrend = 'decreasing';
            }
        }

        // Generate recommendations
        if (current.database.pendingRecords > 100) {
            recommendations.push('High number of pending records - consider optimizing sync frequency');
        }

        if (current.database.failedRecords > 50) {
            recommendations.push('Many failed records detected - check network connectivity and server status');
        }

        if (current.database.databaseSize > 100 * 1024 * 1024) { // 100MB
            recommendations.push('Database size is large - consider cleaning up old records');
        }

        if (syncSuccessRate < 90) {
            recommendations.push('Low sync success rate - investigate sync errors');
        }

        if (current.memory.memoryUsagePercentage > 80) {
            recommendations.push('High memory usage detected - consider restarting the app');
        }

        if (!current.websocket.isConnected) {
            recommendations.push('WebSocket disconnected - ML face recognition may not work');
        }

        return {
            current,
            trends: {
                databaseGrowthRate,
                syncSuccessRate,
                memoryTrend
            },
            recommendations,
            lastOptimization: this.lastOptimizationTime
        };
    }

    /**
     * Export performance data for analysis
     */
    public exportPerformanceData(): string {
        return JSON.stringify({
            exportTime: new Date().toISOString(),
            metricsCount: this.metricsHistory.length,
            lastOptimization: this.lastOptimizationTime,
            metrics: this.metricsHistory
        }, null, 2);
    }

    /**
     * Clear performance history
     */
    public clearHistory(): void {
        this.metricsHistory = [];
        console.log('Performance metrics history cleared');
    }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();