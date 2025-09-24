/**
 * Tests for useSync hook
 */

import { renderHook, act } from '@testing-library/react-native';
import { useSync } from '../useSync';
import { SyncService } from '@/services/syncService';
import { NetworkService } from '@/services/networkService';

// Mock services
jest.mock('@/services/syncService');
jest.mock('@/services/networkService');

const mockSyncService = SyncService as jest.MockedClass<typeof SyncService>;
const mockNetworkService = NetworkService as jest.MockedClass<typeof NetworkService>;

describe('useSync Hook', () => {
    let mockSyncServiceInstance: jest.Mocked<SyncService>;
    let mockNetworkServiceInstance: jest.Mocked<NetworkService>;

    beforeEach(() => {
        mockSyncServiceInstance = {
            syncPendingRecords: jest.fn(),
            checkNetworkConnectivity: jest.fn(),
            handleSyncError: jest.fn(),
            startAutoSync: jest.fn(),
            stopAutoSync: jest.fn(),
        } as any;

        mockNetworkServiceInstance = {
            isConnected: jest.fn(),
            onNetworkChange: jest.fn(),
            getNetworkState: jest.fn(),
        } as any;

        mockSyncService.mockImplementation(() => mockSyncServiceInstance);
        mockNetworkService.mockImplementation(() => mockNetworkServiceInstance);

        jest.clearAllMocks();
    });

    it('should initialize with default state', () => {
        const { result } = renderHook(() => useSync());

        expect(result.current.isSyncing).toBe(false);
        expect(result.current.syncProgress).toBe(0);
        expect(result.current.lastSyncTime).toBeNull();
        expect(result.current.syncError).toBeNull();
        expect(result.current.pendingRecords).toBe(0);
    });

    it('should start sync when triggerSync is called', async () => {
        mockSyncServiceInstance.syncPendingRecords.mockResolvedValue({
            syncedRecords: 5,
            failedRecords: 0,
            totalRecords: 5
        });

        const { result } = renderHook(() => useSync());

        await act(async () => {
            await result.current.triggerSync();
        });

        expect(mockSyncServiceInstance.syncPendingRecords).toHaveBeenCalled();
        expect(result.current.isSyncing).toBe(false); // Should be false after completion
        expect(result.current.lastSyncTime).not.toBeNull();
    });

    it('should handle sync errors', async () => {
        const syncError = new Error('Sync failed');
        mockSyncServiceInstance.syncPendingRecords.mockRejectedValue(syncError);

        const { result } = renderHook(() => useSync());

        await act(async () => {
            await result.current.triggerSync();
        });

        expect(result.current.syncError).toBe('Sync failed');
        expect(result.current.isSyncing).toBe(false);
    });

    it('should update sync progress during sync', async () => {
        let progressCallback: ((progress: number) => void) | undefined;

        mockSyncServiceInstance.syncPendingRecords.mockImplementation(
            (onProgress?: (progress: number) => void) => {
                progressCallback = onProgress;
                return new Promise(resolve => {
                    setTimeout(() => {
                        if (progressCallback) {
                            progressCallback(50);
                            setTimeout(() => {
                                if (progressCallback) progressCallback(100);
                                resolve({
                                    syncedRecords: 10,
                                    failedRecords: 0,
                                    totalRecords: 10
                                });
                            }, 100);
                        }
                    }, 100);
                });
            }
        );

        const { result } = renderHook(() => useSync());

        await act(async () => {
            const syncPromise = result.current.triggerSync();

            // Wait for progress updates
            await new Promise(resolve => setTimeout(resolve, 150));
            expect(result.current.syncProgress).toBe(50);

            await syncPromise;
        });

        expect(result.current.syncProgress).toBe(100);
    });

    it('should enable auto sync when network is available', async () => {
        mockNetworkServiceInstance.isConnected.mockResolvedValue(true);

        const { result } = renderHook(() => useSync({ autoSync: true }));

        await act(async () => {
            // Simulate network change
            const networkCallback = mockNetworkServiceInstance.onNetworkChange.mock.calls[0][0];
            networkCallback(true);
        });

        expect(mockSyncServiceInstance.startAutoSync).toHaveBeenCalled();
    });

    it('should disable auto sync when network is unavailable', async () => {
        mockNetworkServiceInstance.isConnected.mockResolvedValue(false);

        const { result } = renderHook(() => useSync({ autoSync: true }));

        await act(async () => {
            // Simulate network change
            const networkCallback = mockNetworkServiceInstance.onNetworkChange.mock.calls[0][0];
            networkCallback(false);
        });

        expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalled();
    });

    it('should clear sync error when clearError is called', async () => {
        const syncError = new Error('Sync failed');
        mockSyncServiceInstance.syncPendingRecords.mockRejectedValue(syncError);

        const { result } = renderHook(() => useSync());

        await act(async () => {
            await result.current.triggerSync();
        });

        expect(result.current.syncError).toBe('Sync failed');

        act(() => {
            result.current.clearError();
        });

        expect(result.current.syncError).toBeNull();
    });

    it('should cleanup on unmount', () => {
        const { unmount } = renderHook(() => useSync({ autoSync: true }));

        unmount();

        expect(mockSyncServiceInstance.stopAutoSync).toHaveBeenCalled();
    });
});