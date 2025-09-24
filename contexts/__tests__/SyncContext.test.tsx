/**
 * Tests for SyncContext
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SyncProvider, useSyncContext } from '../SyncContext';
import { SyncService } from '@/services/syncService';

// Mock SyncService
jest.mock('@/services/syncService');

const mockSyncService = SyncService as jest.MockedClass<typeof SyncService>;

// Test component that uses the context
const TestComponent: React.FC = () => {
    const {
        isSyncing,
        syncProgress,
        lastSyncTime,
        syncError,
        pendingRecords,
        triggerSync,
        clearError
    } = useSyncContext();

    return (
        <>
            <Text testID="is-syncing">{isSyncing ? 'syncing' : 'not-syncing'}</Text>
            <Text testID="sync-progress">{syncProgress}</Text>
            <Text testID="sync-error">{syncError || 'no-error'}</Text>
            <Text testID="pending-records">{pendingRecords}</Text>
        </>
    );
};

describe('SyncContext', () => {
    let mockSyncServiceInstance: jest.Mocked<SyncService>;

    beforeEach(() => {
        mockSyncServiceInstance = {
            syncPendingRecords: jest.fn(),
            checkNetworkConnectivity: jest.fn(),
            handleSyncError: jest.fn(),
            startAutoSync: jest.fn(),
            stopAutoSync: jest.fn(),
            getPendingRecordsCount: jest.fn(),
        } as any;

        mockSyncService.mockImplementation(() => mockSyncServiceInstance);
        jest.clearAllMocks();
    });

    it('should provide initial sync state', () => {
        mockSyncServiceInstance.getPendingRecordsCount.mockResolvedValue(0);

        const { getByTestId } = render(
            <SyncProvider>
                <TestComponent />
            </SyncProvider>
        );

        expect(getByTestId('is-syncing').children[0]).toBe('not-syncing');
        expect(getByTestId('sync-progress').children[0]).toBe('0');
        expect(getByTestId('sync-error').children[0]).toBe('no-error');
    });

    it('should update state during sync operation', async () => {
        mockSyncServiceInstance.getPendingRecordsCount.mockResolvedValue(5);
        mockSyncServiceInstance.syncPendingRecords.mockResolvedValue({
            syncedRecords: 5,
            failedRecords: 0,
            totalRecords: 5
        });

        const { getByTestId } = render(
            <SyncProvider>
                <TestComponent />
            </SyncProvider>
        );

        // Initially should show pending records
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(getByTestId('pending-records').children[0]).toBe('5');
    });

    it('should handle sync errors in context', async () => {
        const syncError = new Error('Network error');
        mockSyncServiceInstance.syncPendingRecords.mockRejectedValue(syncError);
        mockSyncServiceInstance.getPendingRecordsCount.mockResolvedValue(3);

        const TestComponentWithSync: React.FC = () => {
            const { triggerSync, syncError } = useSyncContext();

            React.useEffect(() => {
                triggerSync();
            }, []);

            return <Text testID="sync-error">{syncError || 'no-error'}</Text>;
        };

        const { getByTestId } = render(
            <SyncProvider>
                <TestComponentWithSync />
            </SyncProvider>
        );

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(getByTestId('sync-error').children[0]).toBe('Network error');
    });

    it('should clear errors when clearError is called', async () => {
        const syncError = new Error('Test error');
        mockSyncServiceInstance.syncPendingRecords.mockRejectedValue(syncError);
        mockSyncServiceInstance.getPendingRecordsCount.mockResolvedValue(0);

        const TestComponentWithClear: React.FC = () => {
            const { triggerSync, clearError, syncError } = useSyncContext();
            const [hasTriggered, setHasTriggered] = React.useState(false);

            React.useEffect(() => {
                if (!hasTriggered) {
                    triggerSync();
                    setHasTriggered(true);
                }
            }, [hasTriggered]);

            React.useEffect(() => {
                if (syncError) {
                    setTimeout(() => clearError(), 100);
                }
            }, [syncError]);

            return <Text testID="sync-error">{syncError || 'no-error'}</Text>;
        };

        const { getByTestId } = render(
            <SyncProvider>
                <TestComponentWithClear />
            </SyncProvider>
        );

        // Wait for error to appear
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        // Wait for error to be cleared
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 150));
        });

        expect(getByTestId('sync-error').children[0]).toBe('no-error');
    });

    it('should throw error when used outside provider', () => {
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = jest.fn();

        expect(() => {
            render(<TestComponent />);
        }).toThrow('useSyncContext must be used within a SyncProvider');

        console.error = originalError;
    });

    it('should update pending records count periodically', async () => {
        mockSyncServiceInstance.getPendingRecordsCount
            .mockResolvedValueOnce(0)
            .mockResolvedValueOnce(3)
            .mockResolvedValueOnce(5);

        const { getByTestId } = render(
            <SyncProvider>
                <TestComponent />
            </SyncProvider>
        );

        // Initial count
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        expect(getByTestId('pending-records').children[0]).toBe('0');

        // Simulate pending records being added
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for next update
        });

        expect(mockSyncServiceInstance.getPendingRecordsCount).toHaveBeenCalledTimes(2);
    });
});