import { useCallback, useEffect, useState } from 'react';
import { attendanceStatusService, AttendanceStatus } from '@/services/attendanceStatusService';
import { useNetworkStatus } from './useNetworkStatus';
import { useSync } from './useSync';

export interface StatusIndicatorState {
    attendance: AttendanceStatus;
    network: {
        isOnline: boolean;
        isOffline: boolean;
        connectionQuality: string;
        networkType: string;
    };
    sync: {
        isSyncing: boolean;
        syncProgress: any;
        hasPendingRecords: boolean;
        syncStats: any;
    };
    system: {
        status: 'ready' | 'busy' | 'offline' | 'error';
        message: string;
        requiresAttention: boolean;
    };
}

/**
 * Hook for managing all status indicators
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Comprehensive status management
 */
export function useStatusIndicators() {
    const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>(
        attendanceStatusService.getCurrentStatus()
    );

    const networkStatus = useNetworkStatus();
    const syncStatus = useSync();

    // Subscribe to attendance status changes
    useEffect(() => {
        const unsubscribe = attendanceStatusService.onStatusChange((newStatus) => {
            setAttendanceStatus(newStatus);
        });

        return unsubscribe;
    }, []);

    /**
     * Get overall system status
     * Requirements: 8.1 - System status overview
     */
    const getSystemStatus = useCallback(() => {
        // Priority order: offline > error > syncing > capturing > ready
        if (networkStatus.isOffline) {
            return {
                status: 'offline' as const,
                message: 'System Offline',
                requiresAttention: syncStatus.hasPendingRecords,
            };
        }

        if (attendanceStatus.type === 'error') {
            return {
                status: 'error' as const,
                message: 'System Error',
                requiresAttention: true,
            };
        }

        if (syncStatus.isSyncing || attendanceStatus.type === 'syncing') {
            return {
                status: 'busy' as const,
                message: 'Syncing Data',
                requiresAttention: false,
            };
        }

        if (attendanceStatus.type === 'capturing' || attendanceStatus.type === 'processing') {
            return {
                status: 'busy' as const,
                message: 'Capturing Attendance',
                requiresAttention: false,
            };
        }

        return {
            status: 'ready' as const,
            message: 'System Ready',
            requiresAttention: syncStatus.hasPendingRecords,
        };
    }, [attendanceStatus, networkStatus.isOffline, syncStatus.isSyncing, syncStatus.hasPendingRecords]);

    /**
     * Get status indicator state
     * Requirements: 8.1 - Consolidated status state
     */
    const getStatusState = useCallback((): StatusIndicatorState => {
        return {
            attendance: attendanceStatus,
            network: {
                isOnline: networkStatus.isOnline,
                isOffline: networkStatus.isOffline,
                connectionQuality: networkStatus.connectionQuality,
                networkType: networkStatus.networkType,
            },
            sync: {
                isSyncing: syncStatus.isSyncing,
                syncProgress: syncStatus.syncProgress,
                hasPendingRecords: syncStatus.hasPendingRecords,
                syncStats: syncStatus.syncStats,
            },
            system: getSystemStatus(),
        };
    }, [attendanceStatus, networkStatus, syncStatus, getSystemStatus]);

    /**
     * Report attendance capture success
     * Requirements: 8.1, 8.4 - Success feedback
     */
    const reportCaptureSuccess = useCallback((
        studentName: string,
        confidence?: number,
        presentCount?: number,
        totalCount?: number
    ) => {
        if (confidence !== undefined && presentCount !== undefined && totalCount !== undefined) {
            attendanceStatusService.reportFaceRecognitionSuccess(
                studentName,
                confidence,
                presentCount,
                totalCount
            );
        } else {
            attendanceStatusService.setSuccess(
                `✓ ${studentName} marked present`,
                'Attendance recorded successfully'
            );
        }
    }, []);

    /**
     * Report attendance capture error
     * Requirements: 8.3 - Error feedback
     */
    const reportCaptureError = useCallback((
        error: string,
        suggestedAction?: string
    ) => {
        attendanceStatusService.reportFaceRecognitionError(error, suggestedAction);
    }, []);

    /**
     * Report manual entry success
     * Requirements: 8.1, 8.4 - Manual entry feedback
     */
    const reportManualSuccess = useCallback((
        studentName: string,
        status: 'present' | 'absent',
        presentCount?: number,
        totalCount?: number
    ) => {
        if (presentCount !== undefined && totalCount !== undefined) {
            attendanceStatusService.reportManualEntrySuccess(
                studentName,
                status,
                presentCount,
                totalCount
            );
        } else {
            attendanceStatusService.setSuccess(
                `✓ ${studentName} marked ${status} (manual)`,
                'Attendance recorded successfully'
            );
        }
    }, []);

    /**
     * Update capture progress
     * Requirements: 8.1 - Real-time progress updates
     */
    const updateCaptureProgress = useCallback((
        presentCount: number,
        totalCount: number,
        studentName?: string
    ) => {
        attendanceStatusService.updateCaptureProgress(presentCount, totalCount, studentName);
    }, []);

    /**
     * Update sync progress
     * Requirements: 8.2 - Sync progress updates
     */
    const updateSyncProgress = useCallback((
        syncedCount: number,
        totalCount: number,
        currentRecord?: string
    ) => {
        attendanceStatusService.updateSyncProgress(syncedCount, totalCount, currentRecord);
    }, []);

    /**
     * Set system to idle state
     * Requirements: 8.1 - Status management
     */
    const setIdle = useCallback((message?: string) => {
        attendanceStatusService.setIdle(message);
    }, []);

    /**
     * Set system to capturing state
     * Requirements: 8.1 - Capture status
     */
    const setCapturing = useCallback((message?: string, details?: string) => {
        attendanceStatusService.setCapturing(message, details);
    }, []);

    /**
     * Set system to processing state
     * Requirements: 8.1 - Processing status
     */
    const setProcessing = useCallback((message?: string, details?: string) => {
        attendanceStatusService.setProcessing(message, details);
    }, []);

    /**
     * Set system to error state
     * Requirements: 8.3 - Error status
     */
    const setError = useCallback((message: string, details?: string) => {
        attendanceStatusService.setError(message, details);
    }, []);

    /**
     * Clear status history
     * Requirements: 8.1 - Status management
     */
    const clearHistory = useCallback(() => {
        attendanceStatusService.clearHistory();
    }, []);

    /**
     * Get status history
     * Requirements: 8.1 - Status history
     */
    const getStatusHistory = useCallback((limit?: number) => {
        return attendanceStatusService.getStatusHistory(limit);
    }, []);

    /**
     * Check if system requires attention
     * Requirements: 8.3 - Attention management
     */
    const requiresAttention = useCallback(() => {
        const systemStatus = getSystemStatus();
        return systemStatus.requiresAttention || attendanceStatusService.requiresAttention();
    }, [getSystemStatus]);

    return {
        // Current state
        statusState: getStatusState(),
        attendanceStatus,
        networkStatus,
        syncStatus,
        systemStatus: getSystemStatus(),

        // Status reporting methods
        reportCaptureSuccess,
        reportCaptureError,
        reportManualSuccess,
        updateCaptureProgress,
        updateSyncProgress,

        // Status control methods
        setIdle,
        setCapturing,
        setProcessing,
        setError,

        // Utility methods
        clearHistory,
        getStatusHistory,
        requiresAttention,

        // Convenience getters
        isOnline: networkStatus.isOnline,
        isOffline: networkStatus.isOffline,
        isSyncing: syncStatus.isSyncing,
        hasPendingRecords: syncStatus.hasPendingRecords,
        isCapturing: attendanceStatus.type === 'capturing',
        isProcessing: attendanceStatus.type === 'processing',
        hasError: attendanceStatus.type === 'error',
        isIdle: attendanceStatus.type === 'idle',
    };
}