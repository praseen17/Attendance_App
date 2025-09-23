import { useCallback } from 'react';
import { useSyncContext } from '../contexts/SyncContext';

/**
 * React hook for sync service integration
 * Requirements: 8.2, 8.3 - User feedback and sync status management
 */
export function useSync() {
    const {
        isSyncing,
        syncProgress,
        lastSyncResult,
        isAutoSyncActive,
        syncStats,
        triggerSync,
        setAutoSync,
        refreshSyncStats,
    } = useSyncContext();

    /**
     * Get formatted sync progress text
     */
    const getSyncProgressText = useCallback((): string => {
        if (!syncProgress) {
            return 'Preparing sync...';
        }

        if (syncProgress.totalRecords === 0) {
            return 'No records to sync';
        }

        return `Syncing ${syncProgress.processedRecords}/${syncProgress.totalRecords} records (${Math.round(syncProgress.percentage)}%)`;
    }, [syncProgress]);

    /**
     * Get sync status text
     */
    const getSyncStatusText = useCallback((): string => {
        if (isSyncing) {
            return 'Syncing...';
        }

        if (syncStats.pendingRecords === 0) {
            return 'All records synced';
        }

        return `${syncStats.pendingRecords} records pending sync`;
    }, [isSyncing, syncStats.pendingRecords]);

    /**
     * Get last sync time text
     */
    const getLastSyncText = useCallback((): string => {
        if (!syncStats.lastSyncTime) {
            return 'Never synced';
        }

        const now = new Date();
        const lastSync = syncStats.lastSyncTime;
        const diffMs = now.getTime() - lastSync.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
        } else {
            return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
        }
    }, [syncStats.lastSyncTime]);

    return {
        // State
        isSyncing,
        syncProgress,
        lastSyncResult,
        isAutoSyncActive,
        syncStats,

        // Actions
        triggerSync,
        setAutoSync,
        refreshSyncStats,

        // Computed values
        getSyncProgressText,
        getSyncStatusText,
        getLastSyncText,

        // Convenience getters
        hasPendingRecords: syncStats.pendingRecords > 0,
        syncPercentage: syncProgress?.percentage || 0,
        isInitialized: isAutoSyncActive !== null
    };
}