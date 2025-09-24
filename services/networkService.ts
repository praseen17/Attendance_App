import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';

// Network connectivity interfaces
export interface NetworkStatus {
    isConnected: boolean;
    type: NetInfoStateType;
    isInternetReachable: boolean | null;
    details?: {
        strength?: number;
        ssid?: string;
        bssid?: string;
        frequency?: number;
        ipAddress?: string;
        subnet?: string;
    };
    timestamp: Date;
}

export interface NetworkConfig {
    checkInterval: number;
    timeoutDuration: number;
    retryAttempts: number;
}

/**
 * Network connectivity service for offline/online detection
 * Requirements: 1.5, 4.1, 8.5 - Network connectivity detection and status indicators
 */
export class NetworkService extends EventEmitter {
    private currentStatus: NetworkStatus;
    private config: NetworkConfig;
    private unsubscribeNetInfo: (() => void) | null = null;
    private checkTimer: ReturnType<typeof setInterval> | null = null;

    constructor(config?: Partial<NetworkConfig>) {
        super();

        this.config = {
            checkInterval: 30000, // 30 seconds
            timeoutDuration: 5000, // 5 seconds
            retryAttempts: 3,
            ...config,
        };

        this.currentStatus = {
            isConnected: false,
            type: NetInfoStateType.unknown,
            isInternetReachable: null,
            timestamp: new Date(),
        };
    }

    /**
     * Initialize network monitoring
     * Requirements: 1.5 - Network connectivity detection
     */
    async initialize(): Promise<void> {
        try {
            // Get initial network state
            const initialState = await NetInfo.fetch();
            this.updateNetworkStatus(initialState);

            // Subscribe to network state changes
            this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
                this.updateNetworkStatus(state);
            });

            // Start periodic connectivity checks
            this.startPeriodicChecks();

            console.log('Network service initialized');
        } catch (error) {
            console.error('Failed to initialize network service:', error);
            throw error;
        }
    }

    /**
     * Get current network status
     * Requirements: 1.5 - Network status retrieval
     */
    getCurrentStatus(): NetworkStatus {
        return { ...this.currentStatus };
    }

    /**
     * Check if device is online
     * Requirements: 4.1 - Network connectivity checking for sync operations
     */
    isOnline(): boolean {
        return this.currentStatus.isConnected &&
            (this.currentStatus.isInternetReachable === true ||
                this.currentStatus.isInternetReachable === null);
    }

    /**
     * Check if device is offline
     * Requirements: 4.1 - Offline mode detection
     */
    isOffline(): boolean {
        return !this.isOnline();
    }

    /**
     * Perform manual connectivity check
     * Requirements: 4.1 - Manual connectivity verification
     */
    async checkConnectivity(): Promise<boolean> {
        try {
            const state = await NetInfo.fetch();
            this.updateNetworkStatus(state);
            return this.isOnline();
        } catch (error) {
            console.error('Manual connectivity check failed:', error);
            return false;
        }
    }

    /**
     * Wait for network connection
     * Requirements: 4.1 - Wait for connectivity before sync
     */
    async waitForConnection(timeout: number = 30000): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.isOnline()) {
                resolve(true);
                return;
            }

            const timeoutId = setTimeout(() => {
                this.off('networkStatusChanged', onStatusChange);
                resolve(false);
            }, timeout);

            const onStatusChange = (status: NetworkStatus) => {
                if (status.isConnected && status.isInternetReachable !== false) {
                    clearTimeout(timeoutId);
                    this.off('networkStatusChanged', onStatusChange);
                    resolve(true);
                }
            };

            this.on('networkStatusChanged', onStatusChange);
        });
    }

    /**
     * Get network type description
     * Requirements: 8.5 - Network status display
     */
    getNetworkTypeDescription(): string {
        switch (this.currentStatus.type) {
            case NetInfoStateType.wifi:
                return 'Wi-Fi';
            case NetInfoStateType.cellular:
                return 'Mobile Data';
            case NetInfoStateType.ethernet:
                return 'Ethernet';
            case NetInfoStateType.bluetooth:
                return 'Bluetooth';
            case NetInfoStateType.wimax:
                return 'WiMAX';
            case NetInfoStateType.vpn:
                return 'VPN';
            case NetInfoStateType.other:
                return 'Other';
            case NetInfoStateType.none:
                return 'No Connection';
            case NetInfoStateType.unknown:
            default:
                return 'Unknown';
        }
    }

    /**
     * Get connection quality indicator
     * Requirements: 8.5 - Connection quality display
     */
    getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'none' {
        if (!this.currentStatus.isConnected) {
            return 'none';
        }

        // For Wi-Fi, use signal strength if available
        if (this.currentStatus.type === NetInfoStateType.wifi &&
            this.currentStatus.details?.strength !== undefined) {
            const strength = this.currentStatus.details.strength;
            if (strength >= -50) return 'excellent';
            if (strength >= -60) return 'good';
            if (strength >= -70) return 'fair';
            return 'poor';
        }

        // For other connection types, use internet reachability
        if (this.currentStatus.isInternetReachable === true) {
            return 'good';
        } else if (this.currentStatus.isInternetReachable === false) {
            return 'poor';
        }

        return 'fair'; // Connected but internet reachability unknown
    }

    /**
     * Subscribe to network status changes
     * Requirements: 1.5, 8.5 - Network status change notifications
     */
    onNetworkStatusChange(callback: (status: NetworkStatus) => void): () => void {
        this.on('networkStatusChanged', callback);

        // Return unsubscribe function
        return () => {
            this.off('networkStatusChanged', callback);
        };
    }

    /**
     * Subscribe to connection state changes
     * Requirements: 4.1 - Connection state monitoring for sync
     */
    onConnectionChange(callback: (isConnected: boolean) => void): () => void {
        this.on('connectionChanged', callback);

        // Return unsubscribe function
        return () => {
            this.off('connectionChanged', callback);
        };
    }

    /**
     * Update network status from NetInfo state
     * Requirements: 1.5, 8.5 - Network status processing
     */
    private updateNetworkStatus(state: NetInfoState): void {
        const previouslyConnected = this.currentStatus.isConnected;

        const newStatus: NetworkStatus = {
            isConnected: state.isConnected ?? false,
            type: state.type,
            isInternetReachable: state.isInternetReachable,
            details: this.extractNetworkDetails(state),
            timestamp: new Date(),
        };

        this.currentStatus = newStatus;

        // Emit status change event
        this.emit('networkStatusChanged', newStatus);

        // Emit connection change event if connection state changed
        if (previouslyConnected !== newStatus.isConnected) {
            this.emit('connectionChanged', newStatus.isConnected);

            console.log(`Network connection ${newStatus.isConnected ? 'established' : 'lost'}: ${this.getNetworkTypeDescription()}`);
        }

        // Log detailed status for debugging
        console.log('Network status updated:', {
            connected: newStatus.isConnected,
            type: this.getNetworkTypeDescription(),
            internetReachable: newStatus.isInternetReachable,
            quality: this.getConnectionQuality(),
        });
    }

    /**
     * Extract network details from NetInfo state
     * Requirements: 8.5 - Detailed network information
     */
    private extractNetworkDetails(state: NetInfoState): NetworkStatus['details'] {
        const details: NetworkStatus['details'] = {};

        // Wi-Fi specific details
        if (state.type === NetInfoStateType.wifi && state.details) {
            const wifiDetails = state.details as any;
            details.strength = wifiDetails.strength;
            details.ssid = wifiDetails.ssid;
            details.bssid = wifiDetails.bssid;
            details.frequency = wifiDetails.frequency;
            details.ipAddress = wifiDetails.ipAddress;
            details.subnet = wifiDetails.subnet;
        }

        // Cellular specific details
        if (state.type === NetInfoStateType.cellular && state.details) {
            const cellularDetails = state.details as any;
            // Add cellular-specific details if needed
        }

        return Object.keys(details).length > 0 ? details : undefined;
    }

    /**
     * Start periodic connectivity checks
     * Requirements: 4.1 - Periodic connectivity verification
     */
    private startPeriodicChecks(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }

        this.checkTimer = setInterval(async () => {
            try {
                await this.checkConnectivity();
            } catch (error) {
                console.error('Periodic connectivity check failed:', error);
            }
        }, this.config.checkInterval);
    }

    /**
     * Stop periodic connectivity checks
     */
    private stopPeriodicChecks(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Unsubscribe from NetInfo
        if (this.unsubscribeNetInfo) {
            this.unsubscribeNetInfo();
            this.unsubscribeNetInfo = null;
        }

        // Stop periodic checks
        this.stopPeriodicChecks();

        // Remove all event listeners
        this.removeAllListeners();

        console.log('Network service destroyed');
    }
}

// Export singleton instance
export const networkService = new NetworkService();