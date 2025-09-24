import { NetworkService } from '../networkService';
import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
    fetch: jest.fn(),
    addEventListener: jest.fn(),
    NetInfoStateType: {
        unknown: 'unknown',
        none: 'none',
        wifi: 'wifi',
        cellular: 'cellular',
        ethernet: 'ethernet',
        bluetooth: 'bluetooth',
        wimax: 'wimax',
        vpn: 'vpn',
        other: 'other',
    },
}));

describe('NetworkService', () => {
    let networkService: NetworkService;
    const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

    beforeEach(() => {
        networkService = new NetworkService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        networkService.destroy();
    });

    describe('initialization', () => {
        it('should initialize network monitoring', async () => {
            // Mock initial network state
            const mockState = {
                isConnected: true,
                type: NetInfoStateType.wifi,
                isInternetReachable: true,
                details: {
                    ssid: 'TestNetwork',
                    strength: -45,
                }
            };

            mockNetInfo.fetch.mockResolvedValue(mockState as any);
            mockNetInfo.addEventListener.mockReturnValue(() => { });

            await networkService.initialize();

            expect(mockNetInfo.fetch).toHaveBeenCalled();
            expect(mockNetInfo.addEventListener).toHaveBeenCalled();
            expect(networkService.isOnline()).toBe(true);
        });

        it('should handle initialization errors gracefully', async () => {
            mockNetInfo.fetch.mockRejectedValue(new Error('Network error'));

            await expect(networkService.initialize()).rejects.toThrow('Network error');
        });
    });

    describe('connectivity status', () => {
        beforeEach(async () => {
            const mockState = {
                isConnected: true,
                type: NetInfoStateType.wifi,
                isInternetReachable: true,
            };

            mockNetInfo.fetch.mockResolvedValue(mockState as any);
            mockNetInfo.addEventListener.mockReturnValue(() => { });

            await networkService.initialize();
        });

        it('should return correct online status', () => {
            expect(networkService.isOnline()).toBe(true);
            expect(networkService.isOffline()).toBe(false);
        });

        it('should return current network status', () => {
            const status = networkService.getCurrentStatus();

            expect(status.isConnected).toBe(true);
            expect(status.type).toBe(NetInfoStateType.wifi);
            expect(status.isInternetReachable).toBe(true);
            expect(status.timestamp).toBeInstanceOf(Date);
        });

        it('should get network type description', () => {
            expect(networkService.getNetworkTypeDescription()).toBe('Wi-Fi');
        });

        it('should get connection quality', () => {
            const quality = networkService.getConnectionQuality();
            expect(['excellent', 'good', 'fair', 'poor', 'none']).toContain(quality);
        });
    });

    describe('manual connectivity check', () => {
        it('should perform manual connectivity check', async () => {
            const mockState = {
                isConnected: true,
                type: NetInfoStateType.cellular,
                isInternetReachable: true,
            };

            mockNetInfo.fetch.mockResolvedValue(mockState as any);

            const isConnected = await networkService.checkConnectivity();

            expect(mockNetInfo.fetch).toHaveBeenCalled();
            expect(isConnected).toBe(true);
        });

        it('should handle connectivity check errors', async () => {
            mockNetInfo.fetch.mockRejectedValue(new Error('Check failed'));

            const isConnected = await networkService.checkConnectivity();

            expect(isConnected).toBe(false);
        });
    });

    describe('wait for connection', () => {
        it('should resolve immediately if already online', async () => {
            // Initialize as online
            const mockState = {
                isConnected: true,
                type: NetInfoStateType.wifi,
                isInternetReachable: true,
            };

            mockNetInfo.fetch.mockResolvedValue(mockState as any);
            mockNetInfo.addEventListener.mockReturnValue(() => { });

            await networkService.initialize();

            const result = await networkService.waitForConnection(1000);
            expect(result).toBe(true);
        });

        it('should timeout if connection is not established', async () => {
            // Initialize as offline
            const mockState = {
                isConnected: false,
                type: NetInfoStateType.none,
                isInternetReachable: false,
            };

            mockNetInfo.fetch.mockResolvedValue(mockState as any);
            mockNetInfo.addEventListener.mockReturnValue(() => { });

            await networkService.initialize();

            const result = await networkService.waitForConnection(100);
            expect(result).toBe(false);
        });
    });

    describe('event handling', () => {
        it('should emit network status change events', async () => {
            const mockState = {
                isConnected: true,
                type: NetInfoStateType.wifi,
                isInternetReachable: true,
            };

            let eventListener: (state: any) => void;
            mockNetInfo.fetch.mockResolvedValue(mockState as any);
            mockNetInfo.addEventListener.mockImplementation((callback) => {
                eventListener = callback;
                return () => { };
            });

            await networkService.initialize();

            const statusChangeSpy = jest.fn();
            const connectionChangeSpy = jest.fn();

            networkService.onNetworkStatusChange(statusChangeSpy);
            networkService.onConnectionChange(connectionChangeSpy);

            // Simulate network change
            const newState = {
                isConnected: false,
                type: NetInfoStateType.none,
                isInternetReachable: false,
            };

            eventListener!(newState);

            expect(statusChangeSpy).toHaveBeenCalled();
            expect(connectionChangeSpy).toHaveBeenCalledWith(false);
        });
    });

    describe('cleanup', () => {
        it('should cleanup resources on destroy', async () => {
            const unsubscribeMock = jest.fn();
            mockNetInfo.addEventListener.mockReturnValue(unsubscribeMock);
            mockNetInfo.fetch.mockResolvedValue({
                isConnected: true,
                type: NetInfoStateType.wifi,
                isInternetReachable: true,
            } as any);

            await networkService.initialize();
            networkService.destroy();

            expect(unsubscribeMock).toHaveBeenCalled();
        });
    });
});