import { databaseService, AttendanceRecord } from './database';
import { SyncError } from './errorHandler';

/**
 * Sync state for persistence during network interruptions
 * Requirements: 5.2 - Sync state persistence for network interruption recovery
 */
export interface SyncState {
    id: string;
    startedAt: Date;
    lastUpdatedAt: Date;
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    currentBatchIndex: number;
    totalBatches: number;
    batchSize: number;
    pendingRecordIds: number[];
    processedRecordIds: number[];
    failedRecordIds: number[];
    errors: SyncError[];
    isComplete: boolean;
    isPaused: boolean;
    resumeAfter?: Date;
}

export interface SyncBatch {
    batchIndex: number;
    recordIds: number[];
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
}

/**
 * Manages sync state persistence for recovery from network interruptions
 * Requirements: 5.2 - Network interruption recovery with state persistence
 */
export class SyncStateManager {
    private currentSyncState: SyncState | null = null;
    private readonly SYNC_STATE_KEY = 'currentSyncState';
    private readonly SYNC_BATCHES_KEY = 'syncBatches';

    /**
     * Initialize a new sync operation
     * Requirements: 5.2 - Sync state initialization
     */
    async initializeSyncState(
        records: AttendanceRecord[],
        batchSize: number = 50
    ): Promise<SyncState> {
        const recordIds = records.map(r => r.id!).filter(id => id !== undefined);
        const totalBatches = Math.ceil(recordIds.length / batchSize);

        const syncState: SyncState = {
            id: this.generateSyncId(),
            startedAt: new Date(),
            lastUpdatedAt: new Date(),
            totalRecords: recordIds.length,
            processedRecords: 0,
            successfulRecords: 0,
            failedRecords: 0,
            currentBatchIndex: 0,
            totalBatches,
            batchSize,
            pendingRecordIds: [...recordIds],
            processedRecordIds: [],
            failedRecordIds: [],
            errors: [],
            isComplete: false,
            isPaused: false
        };

        // Create batch tracking
        const batches: SyncBatch[] = [];
        for (let i = 0; i < totalBatches; i++) {
            const startIndex = i * batchSize;
            const endIndex = Math.min(startIndex + batchSize, recordIds.length);
            const batchRecordIds = recordIds.slice(startIndex, endIndex);

            batches.push({
                batchIndex: i,
                recordIds: batchRecordIds,
                status: 'pending'
            });
        }

        // Persist state
        await this.persistSyncState(syncState);
        await this.persistSyncBatches(batches);

        this.currentSyncState = syncState;
        return syncState;
    }

    /**
     * Update sync state progress
     * Requirements: 5.2 - State updates during sync operation
     */
    async updateSyncProgress(
        batchIndex: number,
        successfulRecords: number[],
        failedRecords: number[],
        errors: SyncError[] = []
    ): Promise<void> {
        if (!this.currentSyncState) {
            throw new Error('No active sync state to update');
        }

        // Update batch status
        const batches = await this.getSyncBatches();
        const batch = batches.find(b => b.batchIndex === batchIndex);
        if (batch) {
            batch.status = failedRecords.length > 0 ? 'failed' : 'completed';
            batch.completedAt = new Date();
            if (failedRecords.length > 0) {
                batch.error = `${failedRecords.length} records failed`;
            }
        }

        // Update sync state
        this.currentSyncState.currentBatchIndex = batchIndex + 1;
        this.currentSyncState.processedRecords += successfulRecords.length + failedRecords.length;
        this.currentSyncState.successfulRecords += successfulRecords.length;
        this.currentSyncState.failedRecords += failedRecords.length;
        this.currentSyncState.lastUpdatedAt = new Date();

        // Update record tracking
        this.currentSyncState.processedRecordIds.push(...successfulRecords, ...failedRecords);
        this.currentSyncState.failedRecordIds.push(...failedRecords);
        this.currentSyncState.pendingRecordIds = this.currentSyncState.pendingRecordIds
            .filter(id => !successfulRecords.includes(id) && !failedRecords.includes(id));

        // Add errors
        this.currentSyncState.errors.push(...errors);

        // Check if sync is complete
        this.currentSyncState.isComplete =
            this.currentSyncState.currentBatchIndex >= this.currentSyncState.totalBatches;

        // Persist updates
        await this.persistSyncState(this.currentSyncState);
        await this.persistSyncBatches(batches);
    }

    /**
     * Pause sync operation due to network interruption
     * Requirements: 5.2 - Pause sync on network interruption
     */
    async pauseSync(resumeAfter?: Date): Promise<void> {
        if (!this.currentSyncState) {
            return;
        }

        this.currentSyncState.isPaused = true;
        this.currentSyncState.resumeAfter = resumeAfter;
        this.currentSyncState.lastUpdatedAt = new Date();

        await this.persistSyncState(this.currentSyncState);
    }

    /**
     * Resume sync operation after network restoration
     * Requirements: 5.2 - Resume sync from saved state
     */
    async resumeSync(): Promise<SyncState | null> {
        const savedState = await this.loadSyncState();

        if (!savedState || savedState.isComplete) {
            return null;
        }

        // Check if enough time has passed for resume
        if (savedState.resumeAfter && new Date() < savedState.resumeAfter) {
            return null;
        }

        savedState.isPaused = false;
        savedState.resumeAfter = undefined;
        savedState.lastUpdatedAt = new Date();

        this.currentSyncState = savedState;
        await this.persistSyncState(savedState);

        return savedState;
    }

    /**
     * Get records for next batch to process
     * Requirements: 5.2 - Batch processing with state recovery
     */
    async getNextBatchRecords(): Promise<AttendanceRecord[]> {
        if (!this.currentSyncState || this.currentSyncState.isComplete) {
            return [];
        }

        const batches = await this.getSyncBatches();
        const nextBatch = batches.find(b =>
            b.batchIndex >= this.currentSyncState!.currentBatchIndex &&
            b.status === 'pending'
        );

        if (!nextBatch) {
            return [];
        }

        // Mark batch as processing
        nextBatch.status = 'processing';
        nextBatch.startedAt = new Date();
        await this.persistSyncBatches(batches);

        // Get actual records from database
        const records: AttendanceRecord[] = [];
        for (const recordId of nextBatch.recordIds) {
            try {
                // This is a simplified approach - in practice you might need a method to get record by ID
                const pendingRecords = await databaseService.getPendingRecords();
                const record = pendingRecords.find(r => r.id === recordId);
                if (record) {
                    records.push(record);
                }
            } catch (error) {
                console.error(`Failed to get record ${recordId}:`, error);
            }
        }

        return records;
    }

    /**
     * Get failed records for retry
     * Requirements: 5.2 - Failed record recovery for retry
     */
    async getFailedRecords(): Promise<AttendanceRecord[]> {
        const savedState = await this.loadSyncState();
        if (!savedState || savedState.failedRecordIds.length === 0) {
            return [];
        }

        const records: AttendanceRecord[] = [];
        const pendingRecords = await databaseService.getPendingRecords();

        for (const recordId of savedState.failedRecordIds) {
            const record = pendingRecords.find(r => r.id === recordId);
            if (record) {
                records.push(record);
            }
        }

        return records;
    }

    /**
     * Complete sync operation
     * Requirements: 5.2 - Sync completion and cleanup
     */
    async completeSyncState(): Promise<void> {
        if (!this.currentSyncState) {
            return;
        }

        this.currentSyncState.isComplete = true;
        this.currentSyncState.lastUpdatedAt = new Date();

        await this.persistSyncState(this.currentSyncState);

        // Clean up after successful completion
        setTimeout(async () => {
            await this.clearSyncState();
        }, 300000); // Keep state for 5 minutes after completion
    }

    /**
     * Clear sync state (cleanup)
     * Requirements: 5.2 - State cleanup
     */
    async clearSyncState(): Promise<void> {
        try {
            await databaseService.setSyncMetadata(this.SYNC_STATE_KEY, '');
            await databaseService.setSyncMetadata(this.SYNC_BATCHES_KEY, '');
            this.currentSyncState = null;
        } catch (error) {
            console.error('Failed to clear sync state:', error);
        }
    }

    /**
     * Get current sync state
     * Requirements: 5.2 - State retrieval
     */
    getCurrentSyncState(): SyncState | null {
        return this.currentSyncState;
    }

    /**
     * Check if there's an active sync operation
     * Requirements: 5.2 - Active sync detection
     */
    async hasActiveSyncState(): Promise<boolean> {
        const savedState = await this.loadSyncState();
        return savedState !== null && !savedState.isComplete;
    }

    /**
     * Get sync recovery information
     * Requirements: 5.2 - Recovery information for user display
     */
    async getSyncRecoveryInfo(): Promise<{
        canRecover: boolean;
        totalRecords: number;
        processedRecords: number;
        remainingRecords: number;
        lastUpdated: Date;
        errors: number;
    } | null> {
        const savedState = await this.loadSyncState();

        if (!savedState || savedState.isComplete) {
            return null;
        }

        return {
            canRecover: true,
            totalRecords: savedState.totalRecords,
            processedRecords: savedState.processedRecords,
            remainingRecords: savedState.totalRecords - savedState.processedRecords,
            lastUpdated: savedState.lastUpdatedAt,
            errors: savedState.errors.length
        };
    }

    /**
     * Persist sync state to database
     */
    private async persistSyncState(state: SyncState): Promise<void> {
        try {
            await databaseService.setSyncMetadata(
                this.SYNC_STATE_KEY,
                JSON.stringify(state)
            );
        } catch (error) {
            console.error('Failed to persist sync state:', error);
            throw error;
        }
    }

    /**
     * Load sync state from database
     */
    private async loadSyncState(): Promise<SyncState | null> {
        try {
            const stateJson = await databaseService.getSyncMetadata(this.SYNC_STATE_KEY);
            if (!stateJson) {
                return null;
            }

            const state = JSON.parse(stateJson) as SyncState;

            // Convert date strings back to Date objects
            state.startedAt = new Date(state.startedAt);
            state.lastUpdatedAt = new Date(state.lastUpdatedAt);
            if (state.resumeAfter) {
                state.resumeAfter = new Date(state.resumeAfter);
            }

            // Convert error timestamps
            state.errors = state.errors.map(error => ({
                ...error,
                timestamp: new Date(error.timestamp),
                lastRetryAt: error.lastRetryAt ? new Date(error.lastRetryAt) : undefined,
                nextRetryAt: error.nextRetryAt ? new Date(error.nextRetryAt) : undefined
            }));

            return state;
        } catch (error) {
            console.error('Failed to load sync state:', error);
            return null;
        }
    }

    /**
     * Persist sync batches to database
     */
    private async persistSyncBatches(batches: SyncBatch[]): Promise<void> {
        try {
            await databaseService.setSyncMetadata(
                this.SYNC_BATCHES_KEY,
                JSON.stringify(batches)
            );
        } catch (error) {
            console.error('Failed to persist sync batches:', error);
            throw error;
        }
    }

    /**
     * Get sync batches from database
     */
    private async getSyncBatches(): Promise<SyncBatch[]> {
        try {
            const batchesJson = await databaseService.getSyncMetadata(this.SYNC_BATCHES_KEY);
            if (!batchesJson) {
                return [];
            }

            const batches = JSON.parse(batchesJson) as SyncBatch[];

            // Convert date strings back to Date objects
            return batches.map(batch => ({
                ...batch,
                startedAt: batch.startedAt ? new Date(batch.startedAt) : undefined,
                completedAt: batch.completedAt ? new Date(batch.completedAt) : undefined
            }));
        } catch (error) {
            console.error('Failed to get sync batches:', error);
            return [];
        }
    }

    /**
     * Generate unique sync ID
     */
    private generateSyncId(): string {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const syncStateManager = new SyncStateManager();