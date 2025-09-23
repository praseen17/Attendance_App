import { useEffect, useState, useCallback } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';

interface NetworkStatusHookOptions {
    onConnectionChange?: (isOnline: boolean) => void;
    onConnectionLost?: () => void;
    onConnectionRestored?: () => void;
    enableNotifications?: boolean;
}

interface NetworkStatusHookReturn {
    isOnline: boolean;
    isOffline: boolean;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
    networkType: string;
    checkConnectivity: () => Promise<boolean>;
    waitForConnection: (timeout?: number) => Promise<boolean>;
    showOfflineNotification: boolean;
    dismissOfflineNotification: () => void;
}

/**
 * Custom hook for network status management
 * Requirements: 1.5, 4.1, 8.5 - Network connectivity detection and status management
 */
export function useNetworkStatus(options: NetworkStatusHookOptions = {}): NetworkStatusHookReturn {
    const {
        onConnectionChange,
        onConnectionLost,
        onConnectionRestored,
        enableNotifications = true
    } = options;

    const {
        isOnline,
        isOffline,
        connectionQuality,
        networkType,
        checkConnectivity,
        waitForConnection
    } = useNetwork();

    const [previousOnlineState, setPreviousOnlineState] = useState(isOnline);
    const [showOfflineNotification, setShowOfflineNotification] = useState(false);

    /**
     * Handle connection state changes
     * Requirements: 1.5, 4.1 - Connection change handling
     */
    useEffect(() => {
        // Only trigger callbacks if the connection state actually changed
        if (previousOnlineState !== isOnline) {
            // Call general connection change callback
            onConnectionChange?.(isOnline);

            // Call specific callbacks based on state change
            if (isOnline && !previousOnlineState) {
                // Connection restored
                onConnectionRestored?.();
                setShowOfflineNotification(false);
                console.log('Network connection restored');
            } else if (!isOnline && previousOnlineState) {
                // Connection lost
                onConnectionLost?.();
                if (enableNotifications) {
                    setShowOfflineNotification(true);
                }
                console.log('Network connection lost');
            }

            setPreviousOnlineState(isOnline);
        }
    }, [isOnline, previousOnlineState, onConnectionChange, onConnectionLost, onConnectionRestored, enableNotifications]);

    /**
     * Dismiss offline notification
     * Requirements: 8.5 - User interaction with notifications
     */
    const dismissOfflineNotification = useCallback(() => {
        setShowOfflineNotification(false);
    }, []);

    /**
     * Enhanced connectivity check with retry logic
     * Requirements: 4.1 - Reliable connectivity checking
     */
    const enhancedCheckConnectivity = useCallback(async (): Promise<boolean> => {
        try {
            const isConnected = await checkConnectivity();

            // Update notification state based on result
            if (!isConnected && enableNotifications) {
                setShowOfflineNotification(true);
            } else if (isConnected) {
                setShowOfflineNotification(false);
            }

            return isConnected;
        } catch (error) {
            console.error('Enhanced connectivity check failed:', error);
            return false;
        }
    }, [checkConnectivity, enableNotifications]);

    return {
        isOnline,
        isOffline,
        connectionQuality,
        networkType,
        checkConnectivity: enhancedCheckConnectivity,
        waitForConnection,
        showOfflineNotification,
        dismissOfflineNotification,
    };
}

/**
 * Hook for sync operations that depend on network connectivity
 * Requirements: 4.1 - Network-dependent sync operations
 */
export function useNetworkSync() {
    const { isOnline, waitForConnection, checkConnectivity } = useNetwork();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);

    /**
     * Execute sync operation with network dependency
     * Requirements: 4.1 - Network-dependent operations
     */
    const executeWithNetwork = useCallback(async <T>(
        operation: () => Promise<T>,
        options: {
            waitForConnection?: boolean;
            timeout?: number;
            retryOnFailure?: boolean;
        } = {}
    ): Promise<T | null> => {
        const {
            waitForConnection: shouldWait = true,
            timeout = 30000,
            retryOnFailure = true
        } = options;

        try {
            setIsSyncing(true);
            setSyncError(null);

            // Check if we need to wait for connection
            if (!isOnline && shouldWait) {
                console.log('Waiting for network connection...');
                const connected = await waitForConnection(timeout);

                if (!connected) {
                    throw new Error('Network connection timeout');
                }
            } else if (!isOnline && !shouldWait) {
                throw new Error('Network connection required');
            }

            // Execute the operation
            const result = await operation();
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setSyncError(errorMessage);
            console.error('Network sync operation failed:', error);

            // Retry logic
            if (retryOnFailure && isOnline) {
                console.log('Retrying sync operation...');
                try {
                    const result = await operation();
                    setSyncError(null);
                    return result;
                } catch (retryError) {
                    const retryErrorMessage = retryError instanceof Error ? retryError.message : 'Retry failed';
                    setSyncError(retryErrorMessage);
                    console.error('Retry failed:', retryError);
                }
            }

            return null;
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, waitForConnection]);

    /**
     * Clear sync error
     * Requirements: 8.5 - Error state management
     */
    const clearSyncError = useCallback(() => {
        setSyncError(null);
    }, []);

    return {
        isSyncing,
        syncError,
        executeWithNetwork,
        clearSyncError,
    };
}

/**
 * Hook for monitoring network quality changes
 * Requirements: 8.5 - Network quality monitoring
 */
export function useNetworkQuality() {
    const { connectionQuality, networkType, isOnline } = useNetwork();
    const [qualityHistory, setQualityHistory] = useState<Array<{
        quality: string;
        timestamp: Date;
    }>>([]);

    /**
     * Track quality changes over time
     * Requirements: 8.5 - Quality monitoring and history
     */
    useEffect(() => {
        if (isOnline) {
            setQualityHistory(prev => [
                ...prev.slice(-9), // Keep last 10 entries
                {
                    quality: connectionQuality,
                    timestamp: new Date()
                }
            ]);
        }
    }, [connectionQuality, isOnline]);

    /**
     * Get quality trend
     * Requirements: 8.5 - Quality trend analysis
     */
    const getQualityTrend = useCallback((): 'improving' | 'degrading' | 'stable' => {
        if (qualityHistory.length < 2) return 'stable';

        const recent = qualityHistory.slice(-3);
        const qualityValues = {
            'excellent': 4,
            'good': 3,
            'fair': 2,
            'poor': 1,
            'none': 0
        };

        const values = recent.map(entry => qualityValues[entry.quality as keyof typeof qualityValues] || 0);

        if (values.length < 2) return 'stable';

        const trend = values[values.length - 1] - values[0];

        if (trend > 0) return 'improving';
        if (trend < 0) return 'degrading';
        return 'stable';
    }, [qualityHistory]);

    /**
     * Check if quality is suitable for sync operations
     * Requirements: 4.1 - Quality-based sync decisions
     */
    const isSuitableForSync = useCallback((): boolean => {
        return isOnline && ['excellent', 'good', 'fair'].includes(connectionQuality);
    }, [isOnline, connectionQuality]);

    return {
        connectionQuality,
        networkType,
        qualityHistory,
        qualityTrend: getQualityTrend(),
        isSuitableForSync: isSuitableForSync(),
    };
}