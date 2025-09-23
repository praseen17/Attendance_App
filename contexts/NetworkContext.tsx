import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { networkService, NetworkStatus } from '@/services/networkService';

// Network context interface
interface NetworkContextType {
    // Network state
    isOnline: boolean;
    isOffline: boolean;
    networkStatus: NetworkStatus;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
    networkType: string;

    // Network methods
    checkConnectivity: () => Promise<boolean>;
    waitForConnection: (timeout?: number) => Promise<boolean>;

    // Utility methods
    isInitialized: boolean;
}

// Create context
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

// Provider props interface
interface NetworkProviderProps {
    children: ReactNode;
}

/**
 * Network Provider Component
 * Requirements: 1.5, 4.1, 8.5 - Network connectivity detection and status indicators
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
    const [isOnline, setIsOnline] = useState(false);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isConnected: false,
        type: 'unknown' as any,
        isInternetReachable: null,
        timestamp: new Date(),
    });
    const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'none'>('none');
    const [networkType, setNetworkType] = useState('Unknown');
    const [isInitialized, setIsInitialized] = useState(false);

    /**
     * Initialize network monitoring on app startup
     * Requirements: 1.5 - Network connectivity detection
     */
    useEffect(() => {
        initializeNetwork();

        return () => {
            cleanup();
        };
    }, []);

    const initializeNetwork = async () => {
        try {
            // Initialize network service
            await networkService.initialize();

            // Get initial network status
            const initialStatus = networkService.getCurrentStatus();
            updateNetworkState(initialStatus);

            // Subscribe to network status changes
            const unsubscribeStatus = networkService.onNetworkStatusChange((status) => {
                updateNetworkState(status);
            });

            // Subscribe to connection changes
            const unsubscribeConnection = networkService.onConnectionChange((connected) => {
                setIsOnline(connected);
                console.log(`Network connection ${connected ? 'established' : 'lost'}`);
            });

            setIsInitialized(true);

            // Store unsubscribe functions for cleanup
            (window as any).__networkUnsubscribers = [unsubscribeStatus, unsubscribeConnection];

        } catch (error) {
            console.error('Network initialization error:', error);
            setIsInitialized(true); // Still mark as initialized to prevent blocking
        }
    };

    /**
     * Update network state from network status
     * Requirements: 8.5 - Network status processing and display
     */
    const updateNetworkState = (status: NetworkStatus) => {
        setNetworkStatus(status);
        setIsOnline(networkService.isOnline());
        setConnectionQuality(networkService.getConnectionQuality());
        setNetworkType(networkService.getNetworkTypeDescription());
    };

    /**
     * Check network connectivity manually
     * Requirements: 4.1 - Manual connectivity verification
     */
    const checkConnectivity = async (): Promise<boolean> => {
        try {
            const isConnected = await networkService.checkConnectivity();
            return isConnected;
        } catch (error) {
            console.error('Manual connectivity check failed:', error);
            return false;
        }
    };

    /**
     * Wait for network connection
     * Requirements: 4.1 - Wait for connectivity before sync operations
     */
    const waitForConnection = async (timeout: number = 30000): Promise<boolean> => {
        try {
            return await networkService.waitForConnection(timeout);
        } catch (error) {
            console.error('Wait for connection failed:', error);
            return false;
        }
    };

    /**
     * Cleanup network service
     */
    const cleanup = () => {
        // Clean up subscriptions
        const unsubscribers = (window as any).__networkUnsubscribers;
        if (unsubscribers && Array.isArray(unsubscribers)) {
            unsubscribers.forEach((unsubscribe: () => void) => {
                try {
                    unsubscribe();
                } catch (error) {
                    console.error('Error during network cleanup:', error);
                }
            });
        }

        // Destroy network service
        networkService.destroy();
    };

    // Context value
    const contextValue: NetworkContextType = {
        // State
        isOnline,
        isOffline: !isOnline,
        networkStatus,
        connectionQuality,
        networkType,
        isInitialized,

        // Methods
        checkConnectivity,
        waitForConnection,
    };

    return (
        <NetworkContext.Provider value={contextValue}>
            {children}
        </NetworkContext.Provider>
    );
}

/**
 * Hook to use network context
 * Requirements: 1.5, 8.5 - Network state management
 */
export function useNetwork(): NetworkContextType {
    const context = useContext(NetworkContext);

    if (context === undefined) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }

    return context;
}

/**
 * Higher-order component for network-dependent components
 * Requirements: 4.1 - Network-dependent functionality
 */
export function withNetwork<P extends object>(
    Component: React.ComponentType<P>
): React.ComponentType<P> {
    return function NetworkAwareComponent(props: P) {
        const { isInitialized } = useNetwork();

        if (!isInitialized) {
            // You can replace this with a proper loading component
            return null;
        }

        return <Component {...props} />;
    };
}