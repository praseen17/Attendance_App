import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { syncService, SyncResult, SyncProgress } from '../services/syncService';
import { useDatabaseContext } from './DatabaseContext';

interface SyncContextType {
    isSyncing: boolean;
    syncProgress: SyncProgress | null;
    lastSyncResult: SyncResult | null;
    isAutoSyncActive: boolean;
    syncStats: {
        totalRecords: number;
        pendingRecords: number;
        syncedRecords: number;
        failedRecords: number;
        syncProgress: number;
        lastSyncTime: Date | null;
    };
    triggerSync: () => Promise<SyncResult>;
    setAutoSync: (enabled: boolean) => void;
    refreshSyncStats: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
    children: ReactNode;
}

/**
 * Sync context provider for managing sync service state
 * Requirements: 4.1, 8.2, 8.3 - Sync service integration and state management
 */
export function SyncProvider({ children }: SyncProviderProps) {
    const { isInitialized: isDatabaseInitialized, isHealthy: isDatabaseHealthy } = useDatabaseContext();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
    const [isAutoSyncActive, setIsAutoSyncActive] = useState(false);
    const [syncStats, setSyncStats] = useState({
        totalRecords: 0,
        pendingRecords: 0,
        syncedRecords: 0,
        failedRecords: 0,
        syncProgress: 0,
        lastSyncTime: null as Date | null
    });

    /**
     * Initialize sync service and event listeners
     */
    useEffect(() => {
        // Only initialize sync service after database is ready
        if (!isDatabaseInitialized || !isDatabaseHealthy) {
            return;
        }

        let mounted = true;

        const initializeSync = async () => {
            try {
                console.log('Initializing sync service...');
                await syncService.initialize();

                if (mounted) {
                    setIsAutoSyncActive(true);
                    await refreshSyncStats();
                    console.log('Sync service initialized successfully');
                }
            } catch (error) {
                console.error('Failed to initialize sync service:', error);
            }
        };

        initializeSync();

        // Subscribe to sync events
        const unsubscribeSyncStarted = syncService.onSyncStarted(() => {
            if (mounted) {
                console.log('Sync started');
                setIsSyncing(true);
                setSyncProgress(null);
            }
        });

        const unsubscribeSyncProgress = syncService.onSyncProgress((progress) => {
            if (mounted) {
                setSyncProgress(progress);
            }
        });

        const unsubscribeSyncCompleted = syncService.onSyncCompleted((result) => {
            if (mounted) {
                console.log('Sync completed:', result);
                setIsSyncing(false);
                setSyncProgress(null);
                setLastSyncResult(result);
                refreshSyncStats();
            }
        });

        const unsubscribeSyncError = syncService.onSyncError((result) => {
            if (mounted) {
                console.error('Sync error:', result);
                setIsSyncing(false);
                setSyncProgress(null);
                setLastSyncResult(result);
                refreshSyncStats();
            }
        });

        const unsubscribeAutoSyncStarted = syncService.onAutoSyncStarted(() => {
            if (mounted) {
                console.log('Auto sync started');
                setIsAutoSyncActive(true);
            }
        });

        const unsubscribeAutoSyncStopped = syncService.onAutoSyncStopped(() => {
            if (mounted) {
                console.log('Auto sync stopped');
                setIsAutoSyncActive(false);
            }
        });

        // Cleanup function
        return () => {
            mounted = false;
            unsubscribeSyncStarted();
            unsubscribeSyncProgress();
            unsubscribeSyncCompleted();
            unsubscribeSyncError();
            unsubscribeAutoSyncStarted();
            unsubscribeAutoSyncStopped();
        };
    }, [isDatabaseInitialized, isDatabaseHealthy]);

    /**
     * Refresh sync statistics
     */
    const refreshSyncStats = async () => {
        try {
            const stats = await syncService.getSyncStatistics();
            setSyncStats(stats);
        } catch (error) {
            console.error('Failed to refresh sync stats:', error);
        }
    };

    /**
     * Trigger manual sync
     */
    const triggerSync = async (): Promise<SyncResult> => {
        try {
            console.log('Manual sync triggered');
            const result = await syncService.forcSync();
            return result;
        } catch (error) {
            console.error('Manual sync failed:', error);
            throw error;
        }
    };

    /**
     * Enable or disable auto sync
     */
    const setAutoSync = (enabled: boolean) => {
        console.log(`Auto sync ${enabled ? 'enabled' : 'disabled'}`);
        syncService.setAutoSyncEnabled(enabled);
    };

    const contextValue: SyncContextType = {
        isSyncing,
        syncProgress,
        lastSyncResult,
        isAutoSyncActive,
        syncStats,
        triggerSync,
        setAutoSync,
        refreshSyncStats,
    };

    return (
        <SyncContext.Provider value={contextValue}>
            {children}
        </SyncContext.Provider>
    );
}

/**
 * Hook to use sync context
 */
export function useSyncContext(): SyncContextType {
    const context = useContext(SyncContext);
    if (context === undefined) {
        throw new Error('useSyncContext must be used within a SyncProvider');
    }
    return context;
}