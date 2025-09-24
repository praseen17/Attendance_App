import { EventEmitter } from 'events';
import { databaseService, AttendanceRecord, SyncStatus } from './database';
import { networkService, NetworkStatus } from './networkService';
import { apiClient } from './apiClient';
import { syncErrorHandler, SyncError, SyncErrorType } from './errorHandler';
import { syncStateManager, SyncState } from './syncStateManager';
import { conflictResolver, ConflictDetectionResult } from './conflictResolver';
import { notificationService } from './notificationService';

// Sync interfaces based on design document
export interface SyncResult {
    totalRecords: number;
    syncedRecords: number;
    failedRecords: number;
    errors: SyncError[];
}

// SyncError is now imported from errorHandler

export interface SyncProgress {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    percentage: number;
    currentBatch: number;
    totalBatches: number;
    isActive: boolean;
}

export interface SyncConfig {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    autoSyncEnabled: boolean;
    syncInterval: number;
}

/**
 * Automatic sync service for attendance records
 * Requirements: 4.1, 4.2, 4.3, 8.2, 8.3 - Automatic sync with progress tracking
 */
export class SyncService extends EventEmitter {
    private config: SyncConfig;
    private isAutoSyncActive: boolean = false;
    private isSyncInProgress: boolean = false;
    private syncTimer: ReturnType<typeof setInterval> | null = null;
    private networkUnsubscribe: (() => void) | null = null;
    private currentSyncProgress: SyncProgress;
    private lastKnownNetworkStatus: boolean = true;

    constructor(config?: Partial<SyncConfig>) {
        super();

        this.config = {
            batchSize: 50,
            maxRetries: 3,
            retryDelay: 5000,
            autoSyncEnabled: true,
            syncInterval: 60000, // 1 minute
            ...config,
        };

        this.currentSyncProgress = this.getInitialProgress();
    }

    /**
     * Initialize sync service with network monitoring
     * Requirements: 4.1 - Automatic sync initiation on network detection
     */
    async initialize(): Promise<void> {
        try {
            // Subscribe to network status changes
            this.networkUnsubscribe = networkService.onConnectionChange((isConnected) => {
                this.handleNetworkChange(isConnected);
            });

            // Start auto sync if enabled and network is available
            if (this.config.autoSyncEnabled && networkService.isOnline()) {
                await this.startAutoSync();
            }

            console.log('Sync service initialized');
        } catch (error) {
            console.error('Failed to initialize sync service:', error);
            throw error;
        }
    }

    /**
     * Start automatic sync service
     * Requirements: 4.1 - Automatic sync initiation
     */
    async startAutoSync(): Promise<void> {
        if (this.isAutoSyncActive) {
            console.log('Auto sync already active');
            return;
        }

        this.isAutoSyncActive = true;

        // Perform initial sync if network is available
        if (networkService.isOnline()) {
            await this.syncPendingRecords();
        }

        // Start periodic sync
        this.startPeriodicSync();

        this.emit('autoSyncStarted');
        console.log('Auto sync started');
    }

    /**
     * Stop automatic sync service
     * Requirements: 4.1 - Auto sync control
     */
    stopAutoSync(): void {
        this.isAutoSyncActive = false;

        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        this.emit('autoSyncStopped');
        console.log('Auto sync stopped');
    }

    /**
     * Sync pending records to backend with enhanced error handling and retry logic
     * Requirements: 4.2, 4.3, 5.1, 5.2, 5.3 - Enhanced sync with error handling, retry, and conflict resolution
     */
    async syncPendingRecords(): Promise<SyncResult> {
        if (this.isSyncInProgress) {
            console.log('Sync already in progress');
            return this.getEmptySyncResult();
        }

        if (!networkService.isOnline()) {
            console.log('Cannot sync: device is offline');
            notificationService.showNetworkStatus(false);
            return this.getEmptySyncResult();
        }

        this.isSyncInProgress = true;
        this.emit('syncStarted');

        try {
            // Check for resumable sync state
            const resumableState = await syncStateManager.resumeSync();
            if (resumableState) {
                console.log('Resuming interrupted sync operation');
                return await this.resumeSyncFromState(resumableState);
            }

            // Get pending records
            const pendingRecords = await databaseService.getPendingRecords();

            if (pendingRecords.length === 0) {
                console.log('No pending records to sync');
                this.isSyncInProgress = false;
                this.emit('syncCompleted', this.getEmptySyncResult());
                return this.getEmptySyncResult();
            }

            console.log(`Starting sync of ${pendingRecords.length} pending records`);

            // Detect and resolve conflicts before syncing
            const conflictResult = await this.handleConflicts(pendingRecords);
            const recordsToSync = conflictResult.cleanRecords;

            if (recordsToSync.length === 0) {
                console.log('No records to sync after conflict resolution');
                this.isSyncInProgress = false;
                return this.getEmptySyncResult();
            }

            // Initialize sync state for persistence
            const syncState = await syncStateManager.initializeSyncState(recordsToSync, this.config.batchSize);

            // Initialize progress tracking
            this.initializeSyncProgress(recordsToSync.length);

            // Process records in batches with enhanced error handling
            const syncResult = await this.processBatchesWithRetry(recordsToSync, syncState);

            // Complete sync state
            await syncStateManager.completeSyncState();

            // Update final progress
            this.updateSyncProgress(syncResult.syncedRecords, syncResult.failedRecords, true);

            this.isSyncInProgress = false;
            this.emit('syncCompleted', syncResult);

            // Show appropriate notifications
            if (syncResult.syncedRecords > 0) {
                notificationService.showSyncSuccess(syncResult);
            }

            if (syncResult.failedRecords > 0) {
                await this.scheduleRetryForFailedRecords(syncResult.errors);
            }

            console.log(`Sync completed: ${syncResult.syncedRecords}/${syncResult.totalRecords} records synced`);
            return syncResult;

        } catch (error) {
            console.error('Sync failed:', error);
            this.isSyncInProgress = false;

            // Create comprehensive error
            const syncError = syncErrorHandler.createSyncError(0, error);

            // Log error
            await syncErrorHandler.logError({
                level: 'error',
                category: 'sync',
                message: 'Sync operation failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' },
                stackTrace: error instanceof Error ? error.stack : undefined
            });

            const errorResult: SyncResult = {
                totalRecords: 0,
                syncedRecords: 0,
                failedRecords: 0,
                errors: [syncError]
            };

            // Show error notification
            notificationService.showSyncError(syncError);

            // Pause sync state if it exists
            await syncStateManager.pauseSync();

            this.emit('syncError', errorResult);
            return errorResult;
        }
    }

    /**
     * Get current sync progress
     * Requirements: 8.2 - Sync progress tracking
     */
    getCurrentProgress(): SyncProgress {
        return { ...this.currentSyncProgress };
    }

    /**
     * Check if sync is in progress
     * Requirements: 8.2 - Sync status management
     */
    isSyncing(): boolean {
        return this.isSyncInProgress;
    }

    /**
     * Enable or disable auto sync
     * Requirements: 4.1 - Auto sync configuration
     */
    setAutoSyncEnabled(enabled: boolean): void {
        this.config.autoSyncEnabled = enabled;

        if (enabled && !this.isAutoSyncActive && networkService.isOnline()) {
            this.startAutoSync();
        } else if (!enabled && this.isAutoSyncActive) {
            this.stopAutoSync();
        }
    }

    /**
     * Update sync configuration
     * Requirements: 4.1 - Sync configuration management
     */
    updateConfig(newConfig: Partial<SyncConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Restart auto sync if active to apply new configuration
        if (this.isAutoSyncActive) {
            this.stopAutoSync();
            if (this.config.autoSyncEnabled) {
                this.startAutoSync();
            }
        }
    }

    /**
     * Get current sync configuration
     * Requirements: 4.1 - Sync configuration access
     */
    getCurrentConfig(): SyncConfig {
        return { ...this.config };
    }

    /**
     * Force immediate sync
     * Requirements: 4.2 - Manual sync trigger
     */
    async forcSync(): Promise<SyncResult> {
        console.log('Force sync requested');
        return await this.syncPendingRecords();
    }

    /**
     * Get sync statistics
     * Requirements: 8.2 - Sync status information
     */
    async getSyncStatistics(): Promise<{
        totalRecords: number;
        pendingRecords: number;
        syncedRecords: number;
        failedRecords: number;
        syncProgress: number;
        lastSyncTime: Date | null;
    }> {
        try {
            const stats = await databaseService.getDatabaseStats();
            const lastSyncTime = await this.getLastSyncTime();

            const syncProgress = stats.totalRecords > 0
                ? (stats.syncedRecords / stats.totalRecords) * 100
                : 100;

            return {
                ...stats,
                syncProgress: Math.round(syncProgress * 100) / 100,
                lastSyncTime
            };
        } catch (error) {
            console.error('Failed to get sync statistics:', error);
            return {
                totalRecords: 0,
                pendingRecords: 0,
                syncedRecords: 0,
                failedRecords: 0,
                syncProgress: 0,
                lastSyncTime: null
            };
        }
    }

    /**
     * Handle network connectivity changes with enhanced notifications
     * Requirements: 4.1, 5.5 - Network detection for auto sync with user notifications
     */
    private async handleNetworkChange(isConnected: boolean): Promise<void> {
        console.log(`Network status changed: ${isConnected ? 'connected' : 'disconnected'}`);

        const wasOffline = !this.lastKnownNetworkStatus;
        this.lastKnownNetworkStatus = isConnected;

        if (isConnected && this.config.autoSyncEnabled) {
            // Show network restored notification
            notificationService.showNetworkStatus(true, wasOffline);

            // Check for resumable sync operations
            const canResume = await syncStateManager.hasActiveSyncState();
            if (canResume) {
                console.log('Resuming interrupted sync operation');
                setTimeout(() => {
                    this.syncPendingRecords();
                }, 1000);
            } else {
                // Network restored - start auto sync if not already active
                if (!this.isAutoSyncActive) {
                    await this.startAutoSync();
                } else {
                    // Trigger immediate sync for pending records
                    setTimeout(() => {
                        this.syncPendingRecords();
                    }, 2000); // Small delay to ensure network is stable
                }
            }
        } else if (!isConnected) {
            // Show offline notification
            notificationService.showNetworkStatus(false);

            // Network lost - pause current sync operation
            if (this.isSyncInProgress) {
                await syncStateManager.pauseSync();
            }

            // Stop auto sync but don't clear pending records
            if (this.isAutoSyncActive) {
                this.stopAutoSync();
            }
        }
    }

    /**
     * Process records in batches
     * Requirements: 4.2, 4.3 - Batch upload and record state updates
     */
    private async processBatches(records: AttendanceRecord[]): Promise<SyncResult> {
        const totalBatches = Math.ceil(records.length / this.config.batchSize);
        let syncedRecords = 0;
        let failedRecords = 0;
        const errors: SyncError[] = [];

        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * this.config.batchSize;
            const endIndex = Math.min(startIndex + this.config.batchSize, records.length);
            const batch = records.slice(startIndex, endIndex);

            console.log(`Processing batch ${i + 1}/${totalBatches} (${batch.length} records)`);

            // Update progress
            this.currentSyncProgress.currentBatch = i + 1;
            this.currentSyncProgress.totalBatches = totalBatches;
            this.emit('syncProgress', this.currentSyncProgress);

            try {
                // Mark records as syncing
                await this.updateBatchSyncStatus(batch, 'syncing');

                // Upload batch to backend
                const batchResult = await this.uploadBatch(batch);

                if (batchResult.success) {
                    // Mark successful records as synced
                    await this.updateBatchSyncStatus(batch, 'synced');
                    syncedRecords += batch.length;

                    console.log(`Batch ${i + 1} synced successfully (${batch.length} records)`);
                } else {
                    // Handle batch failure
                    await this.updateBatchSyncStatus(batch, 'failed');
                    failedRecords += batch.length;

                    // Add batch error
                    const batchError = syncErrorHandler.createSyncError(
                        batch[0].id || 0,
                        new Error(batchResult.error || 'Batch upload failed')
                    );
                    errors.push(batchError);

                    console.error(`Batch ${i + 1} failed:`, batchResult.error);
                }

                // Update progress
                this.updateSyncProgress(syncedRecords, failedRecords, false);

            } catch (error) {
                console.error(`Error processing batch ${i + 1}:`, error);

                // Mark batch as failed
                await this.updateBatchSyncStatus(batch, 'failed');
                failedRecords += batch.length;

                // Add error
                const batchError = syncErrorHandler.createSyncError(
                    batch[0].id || 0,
                    error
                );
                errors.push(batchError);

                // Update progress
                this.updateSyncProgress(syncedRecords, failedRecords, false);
            }

            // Small delay between batches to avoid overwhelming the server
            if (i < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Update last sync time
        await this.updateLastSyncTime();

        return {
            totalRecords: records.length,
            syncedRecords,
            failedRecords,
            errors
        };
    }

    /**
     * Upload a batch of records to backend
     * Requirements: 4.2 - Backend upload functionality
     */
    private async uploadBatch(batch: AttendanceRecord[]): Promise<{ success: boolean; error?: string }> {
        try {
            // Convert records to API format
            const apiRecords = batch.map(record => ({
                studentId: record.studentId,
                facultyId: record.facultyId,
                sectionId: record.sectionId,
                timestamp: record.timestamp.toISOString(),
                status: record.status,
                captureMethod: record.captureMethod
            }));

            const response = await apiClient.syncAttendance(apiRecords);

            if (response.success) {
                return { success: true };
            } else {
                return {
                    success: false,
                    error: response.error || 'API sync failed'
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error'
            };
        }
    }

    /**
     * Update sync status for a batch of records
     * Requirements: 4.3 - Record state updates
     */
    private async updateBatchSyncStatus(batch: AttendanceRecord[], status: SyncStatus): Promise<void> {
        try {
            for (const record of batch) {
                if (record.id) {
                    await databaseService.updateSyncStatus(record.id, status);
                }
            }
        } catch (error) {
            console.error('Failed to update batch sync status:', error);
        }
    }

    /**
     * Initialize sync progress tracking
     * Requirements: 8.2 - Progress initialization
     */
    private initializeSyncProgress(totalRecords: number): void {
        this.currentSyncProgress = {
            totalRecords,
            processedRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            percentage: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(totalRecords / this.config.batchSize),
            isActive: true
        };

        this.emit('syncProgress', this.currentSyncProgress);
    }

    /**
     * Update sync progress
     * Requirements: 8.2 - Progress tracking updates
     */
    private updateSyncProgress(syncedRecords: number, failedRecords: number, isComplete: boolean): void {
        this.currentSyncProgress.successfulRecords = syncedRecords;
        this.currentSyncProgress.failedRecords = failedRecords;
        this.currentSyncProgress.processedRecords = syncedRecords + failedRecords;
        this.currentSyncProgress.percentage = this.currentSyncProgress.totalRecords > 0
            ? (this.currentSyncProgress.processedRecords / this.currentSyncProgress.totalRecords) * 100
            : 0;
        this.currentSyncProgress.isActive = !isComplete;

        this.emit('syncProgress', this.currentSyncProgress);
    }

    /**
     * Get initial progress state
     */
    private getInitialProgress(): SyncProgress {
        return {
            totalRecords: 0,
            processedRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            percentage: 0,
            currentBatch: 0,
            totalBatches: 0,
            isActive: false
        };
    }

    /**
     * Get empty sync result
     */
    private getEmptySyncResult(): SyncResult {
        return {
            totalRecords: 0,
            syncedRecords: 0,
            failedRecords: 0,
            errors: []
        };
    }

    /**
     * Start periodic sync timer
     * Requirements: 4.1 - Periodic sync execution
     */
    private startPeriodicSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(async () => {
            if (networkService.isOnline() && !this.isSyncInProgress) {
                console.log('Performing periodic sync');
                await this.syncPendingRecords();
            }
        }, this.config.syncInterval);
    }

    /**
     * Get last sync time from metadata
     */
    private async getLastSyncTime(): Promise<Date | null> {
        try {
            const lastSyncStr = await databaseService.getSyncMetadata('lastSyncTime');
            return lastSyncStr ? new Date(lastSyncStr) : null;
        } catch (error) {
            console.error('Failed to get last sync time:', error);
            return null;
        }
    }

    /**
     * Update last sync time in metadata
     */
    private async updateLastSyncTime(): Promise<void> {
        try {
            await databaseService.setSyncMetadata('lastSyncTime', new Date().toISOString());
        } catch (error) {
            console.error('Failed to update last sync time:', error);
        }
    }

    /**
     * Subscribe to sync events
     * Requirements: 8.2, 8.3 - Event-based user feedback
     */
    onSyncStarted(callback: () => void): () => void {
        this.on('syncStarted', callback);
        return () => this.off('syncStarted', callback);
    }

    onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
        this.on('syncProgress', callback);
        return () => this.off('syncProgress', callback);
    }

    onSyncCompleted(callback: (result: SyncResult) => void): () => void {
        this.on('syncCompleted', callback);
        return () => this.off('syncCompleted', callback);
    }

    onSyncError(callback: (result: SyncResult) => void): () => void {
        this.on('syncError', callback);
        return () => this.off('syncError', callback);
    }

    onAutoSyncStarted(callback: () => void): () => void {
        this.on('autoSyncStarted', callback);
        return () => this.off('autoSyncStarted', callback);
    }

    onAutoSyncStopped(callback: () => void): () => void {
        this.on('autoSyncStopped', callback);
        return () => this.off('autoSyncStopped', callback);
    }

    /**
     * Handle conflicts in attendance records
     * Requirements: 5.3 - Conflict resolution for duplicate attendance records
     */
    private async handleConflicts(records: AttendanceRecord[]): Promise<ConflictDetectionResult> {
        try {
            const conflictResult = conflictResolver.detectConflicts(records);

            if (conflictResult.hasConflicts) {
                console.log(`Detected ${conflictResult.conflicts.length} conflicts in attendance records`);

                // Resolve conflicts automatically
                const resolutions = conflictResolver.resolveConflicts(conflictResult.conflicts);

                // Update database with resolved records
                for (const resolution of resolutions) {
                    // Remove discarded records from sync queue
                    for (const discardedRecord of resolution.discardedRecords) {
                        if (discardedRecord.id) {
                            await databaseService.updateSyncStatus(discardedRecord.id, 'synced');
                        }
                    }
                }

                // Add resolved records to clean records
                const resolvedRecords = resolutions.map(r => r.resolvedRecord);
                conflictResult.cleanRecords.push(...resolvedRecords);

                // Show conflict resolution notification
                const conflictTypes = resolutions.map(r => r.type);
                notificationService.showConflictResolution(resolutions.length, conflictTypes);

                // Log conflict resolution
                await syncErrorHandler.logError({
                    level: 'info',
                    category: 'sync',
                    message: 'Conflicts resolved automatically',
                    details: {
                        conflictCount: conflictResult.conflicts.length,
                        resolutionCount: resolutions.length,
                        conflictTypes
                    }
                });
            }

            return conflictResult;
        } catch (error) {
            console.error('Failed to handle conflicts:', error);

            // Log conflict handling error
            await syncErrorHandler.logError({
                level: 'error',
                category: 'sync',
                message: 'Conflict resolution failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            });

            // Return original records if conflict resolution fails
            return {
                hasConflicts: false,
                conflicts: [],
                cleanRecords: records
            };
        }
    }

    /**
     * Process batches with enhanced retry logic
     * Requirements: 5.1, 5.2 - Exponential backoff retry and state persistence
     */
    private async processBatchesWithRetry(records: AttendanceRecord[], syncState: SyncState): Promise<SyncResult> {
        let syncedRecords = 0;
        let failedRecords = 0;
        const errors: SyncError[] = [];

        while (syncState.currentBatchIndex < syncState.totalBatches) {
            try {
                // Check network connectivity before each batch
                if (!networkService.isOnline()) {
                    console.log('Network lost during sync, pausing operation');
                    await syncStateManager.pauseSync(new Date(Date.now() + 30000)); // Resume after 30 seconds

                    notificationService.showNetworkStatus(false, true);
                    break;
                }

                // Get next batch from state manager
                const batch = await syncStateManager.getNextBatchRecords();

                if (batch.length === 0) {
                    break;
                }

                console.log(`Processing batch ${syncState.currentBatchIndex + 1}/${syncState.totalBatches} (${batch.length} records)`);

                // Update progress notification
                notificationService.showSyncProgress({
                    totalRecords: syncState.totalRecords,
                    processedRecords: syncState.processedRecords,
                    successfulRecords: syncState.successfulRecords,
                    failedRecords: syncState.failedRecords,
                    percentage: (syncState.processedRecords / syncState.totalRecords) * 100,
                    currentOperation: `Processing batch ${syncState.currentBatchIndex + 1}`,
                    isComplete: false
                });

                // Mark records as syncing
                await this.updateBatchSyncStatus(batch, 'syncing');

                // Upload batch with retry logic
                const batchResult = await this.uploadBatchWithRetry(batch);

                const batchSuccessful: number[] = [];
                const batchFailed: number[] = [];
                const batchErrors: SyncError[] = [];

                if (batchResult.success) {
                    // Mark successful records as synced
                    await this.updateBatchSyncStatus(batch, 'synced');
                    batchSuccessful.push(...batch.map(r => r.id!).filter(id => id !== undefined));
                    syncedRecords += batch.length;

                    console.log(`Batch ${syncState.currentBatchIndex + 1} synced successfully (${batch.length} records)`);
                } else {
                    // Handle batch failure with individual record retry
                    const individualResults = await this.retryIndividualRecords(batch);

                    for (const result of individualResults) {
                        if (result.success) {
                            await databaseService.updateSyncStatus(result.recordId, 'synced');
                            batchSuccessful.push(result.recordId);
                            syncedRecords++;
                        } else {
                            await databaseService.updateSyncStatus(result.recordId, 'failed');
                            batchFailed.push(result.recordId);
                            failedRecords++;

                            if (result.error) {
                                batchErrors.push(result.error);
                            }
                        }
                    }

                    console.log(`Batch ${syncState.currentBatchIndex + 1} completed with ${batchSuccessful.length} successful, ${batchFailed.length} failed`);
                }

                // Update sync state
                await syncStateManager.updateSyncProgress(
                    syncState.currentBatchIndex,
                    batchSuccessful,
                    batchFailed,
                    batchErrors
                );

                errors.push(...batchErrors);

                // Update progress
                this.updateSyncProgress(syncedRecords, failedRecords, false);

                // Small delay between batches to avoid overwhelming the server
                if (syncState.currentBatchIndex < syncState.totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                console.error(`Error processing batch ${syncState.currentBatchIndex + 1}:`, error);

                // Create sync error
                const syncError = syncErrorHandler.createSyncError(0, error);
                errors.push(syncError);

                // Pause sync on critical error
                await syncStateManager.pauseSync();
                break;
            }
        }

        // Update last sync time
        await this.updateLastSyncTime();

        // Show final progress notification
        notificationService.showSyncProgress({
            totalRecords: syncState.totalRecords,
            processedRecords: syncedRecords + failedRecords,
            successfulRecords: syncedRecords,
            failedRecords: failedRecords,
            percentage: 100,
            currentOperation: 'Sync completed',
            isComplete: true
        });

        return {
            totalRecords: records.length,
            syncedRecords,
            failedRecords,
            errors
        };
    }

    /**
     * Resume sync from saved state
     * Requirements: 5.2 - Resume sync from network interruption recovery
     */
    private async resumeSyncFromState(syncState: SyncState): Promise<SyncResult> {
        console.log(`Resuming sync: ${syncState.processedRecords}/${syncState.totalRecords} records processed`);

        // Show resume notification
        notificationService.showSyncProgress({
            totalRecords: syncState.totalRecords,
            processedRecords: syncState.processedRecords,
            successfulRecords: syncState.successfulRecords,
            failedRecords: syncState.failedRecords,
            percentage: (syncState.processedRecords / syncState.totalRecords) * 100,
            currentOperation: 'Resuming sync operation',
            isComplete: false
        });

        // Continue processing from where we left off
        return await this.processBatchesWithRetry([], syncState);
    }

    /**
     * Upload batch with retry logic
     * Requirements: 5.1 - Exponential backoff retry logic
     */
    private async uploadBatchWithRetry(batch: AttendanceRecord[], maxRetries: number = 3): Promise<{ success: boolean; error?: string }> {
        let lastError: any;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const result = await this.uploadBatch(batch);

                if (result.success) {
                    return result;
                }

                lastError = new Error(result.error || 'Batch upload failed');

                // Don't retry on certain error types
                const errorType = syncErrorHandler.classifyError(lastError);
                if (errorType === SyncErrorType.AUTHENTICATION_ERROR ||
                    errorType === SyncErrorType.VALIDATION_ERROR) {
                    break;
                }

                // Calculate retry delay
                if (attempt < maxRetries) {
                    const retryDelay = syncErrorHandler.calculateRetryDelay(attempt);
                    console.log(`Batch upload failed, retrying in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetries})`);

                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }

            } catch (error) {
                lastError = error;

                const errorType = syncErrorHandler.classifyError(error);
                if (!syncErrorHandler.isRetryableError(errorType)) {
                    break;
                }

                if (attempt < maxRetries) {
                    const retryDelay = syncErrorHandler.calculateRetryDelay(attempt);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        return {
            success: false,
            error: lastError instanceof Error ? lastError.message : 'Batch upload failed after retries'
        };
    }

    /**
     * Retry individual records when batch fails
     * Requirements: 5.1 - Individual record retry logic
     */
    private async retryIndividualRecords(batch: AttendanceRecord[]): Promise<Array<{
        recordId: number;
        success: boolean;
        error?: SyncError;
    }>> {
        const results: Array<{ recordId: number; success: boolean; error?: SyncError }> = [];

        for (const record of batch) {
            if (!record.id) continue;

            try {
                const singleRecordBatch = [record];
                const result = await this.uploadBatch(singleRecordBatch);

                if (result.success) {
                    results.push({ recordId: record.id, success: true });
                } else {
                    const syncError = syncErrorHandler.createSyncError(
                        record.id,
                        new Error(result.error || 'Individual record upload failed')
                    );
                    results.push({ recordId: record.id, success: false, error: syncError });
                }
            } catch (error) {
                const syncError = syncErrorHandler.createSyncError(record.id, error);
                results.push({ recordId: record.id, success: false, error: syncError });
            }
        }

        return results;
    }

    /**
     * Schedule retry for failed records
     * Requirements: 5.1 - Retry scheduling for failed operations
     */
    private async scheduleRetryForFailedRecords(errors: SyncError[]): Promise<void> {
        const retryableErrors = errors.filter(error => syncErrorHandler.shouldRetry(error));

        if (retryableErrors.length === 0) {
            return;
        }

        // Group errors by next retry time
        const retryGroups = new Map<number, SyncError[]>();

        for (const error of retryableErrors) {
            const retryTime = error.nextRetryAt?.getTime() || Date.now() + 60000;

            if (!retryGroups.has(retryTime)) {
                retryGroups.set(retryTime, []);
            }
            retryGroups.get(retryTime)!.push(error);
        }

        // Schedule retries
        for (const [retryTime, groupErrors] of retryGroups.entries()) {
            const delay = Math.max(0, retryTime - Date.now());

            setTimeout(async () => {
                if (networkService.isOnline()) {
                    console.log(`Retrying ${groupErrors.length} failed records`);
                    await this.retryFailedRecords(groupErrors);
                }
            }, delay);

            // Show retry notification for the earliest retry
            if (delay > 0) {
                const earliestError = groupErrors.reduce((earliest, current) =>
                    (current.nextRetryAt?.getTime() || 0) < (earliest.nextRetryAt?.getTime() || 0) ? current : earliest
                );

                notificationService.showRetryNotification(earliestError.retryCount, delay);
            }
        }
    }

    /**
     * Retry failed records
     * Requirements: 5.1 - Failed record retry execution
     */
    private async retryFailedRecords(errors: SyncError[]): Promise<void> {
        try {
            // Get the actual records from database
            const recordsToRetry: AttendanceRecord[] = [];

            for (const error of errors) {
                const pendingRecords = await databaseService.getPendingRecords();
                const record = pendingRecords.find(r => r.id === error.recordId);

                if (record) {
                    recordsToRetry.push(record);
                }
            }

            if (recordsToRetry.length === 0) {
                return;
            }

            console.log(`Retrying ${recordsToRetry.length} failed records`);

            // Process retry batch
            const retryResults = await this.retryIndividualRecords(recordsToRetry);

            let successCount = 0;
            let failCount = 0;
            const newErrors: SyncError[] = [];

            for (const result of retryResults) {
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    if (result.error) {
                        // Update retry count for next attempt
                        const updatedError = syncErrorHandler.prepareForRetry(result.error);
                        newErrors.push(updatedError);
                    }
                }
            }

            console.log(`Retry completed: ${successCount} successful, ${failCount} failed`);

            // Schedule next retry for still-failing records
            if (newErrors.length > 0) {
                await this.scheduleRetryForFailedRecords(newErrors);
            }

            // Show success notification if any records were synced
            if (successCount > 0) {
                notificationService.showSyncSuccess({
                    totalRecords: recordsToRetry.length,
                    syncedRecords: successCount,
                    failedRecords: failCount,
                    errors: newErrors
                });
            }

        } catch (error) {
            console.error('Failed to retry records:', error);

            await syncErrorHandler.logError({
                level: 'error',
                category: 'sync',
                message: 'Retry operation failed',
                details: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Stop auto sync
        this.stopAutoSync();

        // Unsubscribe from network events
        if (this.networkUnsubscribe) {
            this.networkUnsubscribe();
            this.networkUnsubscribe = null;
        }

        // Remove all event listeners
        this.removeAllListeners();

        console.log('Sync service destroyed');
    }
}

// Export singleton instance
export const syncService = new SyncService();