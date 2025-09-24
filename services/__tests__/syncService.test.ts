import { syncService, SyncService } from '../syncService';
import { databaseService } from '../database';
import { networkService } from '../networkService';
import { apiClient } from '../apiClient';

// Mock dependencies
jest.mock('../database');
jest.mock('../networkService');
jest.mock('../apiClient');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockNetworkService = networkService as jest.Mocked<typeof networkService>;
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('SyncService', () => {
    let testSyncService: SyncService;

    beforeEach(() => {
        jest.clearAllMocks();
        testSyncService = new SyncService({
            batchSize: 2,
            maxRetries: 2,
            retryDelay: 100,
            autoSyncEnabled: true,
            syncInterval: 1000,
        });
    });

    afterEach(() => {
        testSyncService.destroy();
    });

    describe('initialization', () => {
        it('should initialize sync service successfully', async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);

            await testSyncService.initialize();

            expect(mockNetworkService.onConnectionChange).toHaveBeenCalled();
        });

        it('should start auto sync when network is available', async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            mockDatabaseService.getPendingRecords.mockResolvedValue([]);

            await testSyncService.initialize();

            // Should attempt to sync pending records
            expect(mockDatabaseService.getPendingRecords).toHaveBeenCalled();
        });
    });

    describe('sync operations', () => {
        beforeEach(async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            await testSyncService.initialize();
        });

        it('should sync pending records successfully', async () => {
            const mockRecords = [
                {
                    id: 1,
                    studentId: 'student1',
                    facultyId: 'faculty1',
                    sectionId: 'section1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const,
                },
                {
                    id: 2,
                    studentId: 'student2',
                    facultyId: 'faculty1',
                    sectionId: 'section1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'manual' as const,
                },
            ];

            mockDatabaseService.getPendingRecords.mockResolvedValue(mockRecords);
            mockApiClient.syncAttendance.mockResolvedValue({ success: true });
            mockDatabaseService.updateSyncStatus.mockResolvedValue();
            mockDatabaseService.setSyncMetadata.mockResolvedValue();

            const result = await testSyncService.syncPendingRecords();

            expect(result.totalRecords).toBe(2);
            expect(result.syncedRecords).toBe(2);
            expect(result.failedRecords).toBe(0);
            expect(mockApiClient.syncAttendance).toHaveBeenCalledTimes(1); // One batch
            expect(mockDatabaseService.updateSyncStatus).toHaveBeenCalledTimes(4); // 2 records x 2 calls (syncing + synced)
        });

        it('should handle sync errors gracefully', async () => {
            const mockRecords = [
                {
                    id: 1,
                    studentId: 'student1',
                    facultyId: 'faculty1',
                    sectionId: 'section1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const,
                },
            ];

            mockDatabaseService.getPendingRecords.mockResolvedValue(mockRecords);
            mockApiClient.syncAttendance.mockResolvedValue({
                success: false,
                error: 'Network error'
            });
            mockDatabaseService.updateSyncStatus.mockResolvedValue();

            const result = await testSyncService.syncPendingRecords();

            expect(result.totalRecords).toBe(1);
            expect(result.syncedRecords).toBe(0);
            expect(result.failedRecords).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0].error).toBe('Network error');
        });

        it('should not sync when offline', async () => {
            mockNetworkService.isOnline.mockReturnValue(false);

            const result = await testSyncService.syncPendingRecords();

            expect(result.totalRecords).toBe(0);
            expect(mockDatabaseService.getPendingRecords).not.toHaveBeenCalled();
        });

        it('should not sync when already syncing', async () => {
            mockDatabaseService.getPendingRecords.mockResolvedValue([]);

            // Start first sync
            const firstSync = testSyncService.syncPendingRecords();

            // Try to start second sync while first is running
            const secondSync = testSyncService.syncPendingRecords();

            await Promise.all([firstSync, secondSync]);

            // Should only call getPendingRecords once
            expect(mockDatabaseService.getPendingRecords).toHaveBeenCalledTimes(1);
        });
    });

    describe('batch processing', () => {
        beforeEach(async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            await testSyncService.initialize();
        });

        it('should process records in batches', async () => {
            const mockRecords = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                studentId: `student${i + 1}`,
                facultyId: 'faculty1',
                sectionId: 'section1',
                timestamp: new Date(),
                status: 'present' as const,
                syncStatus: 'pending' as const,
                captureMethod: 'ml' as const,
            }));

            mockDatabaseService.getPendingRecords.mockResolvedValue(mockRecords);
            mockApiClient.syncAttendance.mockResolvedValue({ success: true });
            mockDatabaseService.updateSyncStatus.mockResolvedValue();
            mockDatabaseService.setSyncMetadata.mockResolvedValue();

            const result = await testSyncService.syncPendingRecords();

            expect(result.totalRecords).toBe(5);
            expect(result.syncedRecords).toBe(5);
            // With batch size 2, should make 3 API calls (2+2+1)
            expect(mockApiClient.syncAttendance).toHaveBeenCalledTimes(3);
        });
    });

    describe('progress tracking', () => {
        beforeEach(async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            await testSyncService.initialize();
        });

        it('should emit progress events during sync', async () => {
            const mockRecords = [
                {
                    id: 1,
                    studentId: 'student1',
                    facultyId: 'faculty1',
                    sectionId: 'section1',
                    timestamp: new Date(),
                    status: 'present' as const,
                    syncStatus: 'pending' as const,
                    captureMethod: 'ml' as const,
                },
            ];

            mockDatabaseService.getPendingRecords.mockResolvedValue(mockRecords);
            mockApiClient.syncAttendance.mockResolvedValue({ success: true });
            mockDatabaseService.updateSyncStatus.mockResolvedValue();
            mockDatabaseService.setSyncMetadata.mockResolvedValue();

            const progressEvents: any[] = [];
            testSyncService.onSyncProgress((progress) => {
                progressEvents.push(progress);
            });

            await testSyncService.syncPendingRecords();

            expect(progressEvents.length).toBeGreaterThan(0);
            expect(progressEvents[0].totalRecords).toBe(1);
            expect(progressEvents[0].isActive).toBe(true);
        });

        it('should track current progress correctly', async () => {
            const initialProgress = testSyncService.getCurrentProgress();
            expect(initialProgress.isActive).toBe(false);
            expect(initialProgress.totalRecords).toBe(0);
        });
    });

    describe('auto sync', () => {
        it('should start auto sync when enabled', async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            mockDatabaseService.getPendingRecords.mockResolvedValue([]);

            await testSyncService.startAutoSync();

            expect(testSyncService.isSyncing()).toBe(false); // No records to sync
        });

        it('should stop auto sync when disabled', async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            await testSyncService.startAutoSync();

            testSyncService.stopAutoSync();

            // Auto sync should be stopped
            expect(testSyncService.isSyncing()).toBe(false);
        });
    });

    describe('statistics', () => {
        beforeEach(async () => {
            mockNetworkService.onConnectionChange.mockReturnValue(() => { });
            mockNetworkService.isOnline.mockReturnValue(true);
            await testSyncService.initialize();
        });

        it('should return sync statistics', async () => {
            const mockStats = {
                totalRecords: 10,
                pendingRecords: 3,
                syncedRecords: 7,
                failedRecords: 0,
                cachedStudents: 25,
            };

            mockDatabaseService.getDatabaseStats.mockResolvedValue(mockStats);
            mockDatabaseService.getSyncMetadata.mockResolvedValue(new Date().toISOString());

            const stats = await testSyncService.getSyncStatistics();

            expect(stats.totalRecords).toBe(10);
            expect(stats.pendingRecords).toBe(3);
            expect(stats.syncedRecords).toBe(7);
            expect(stats.syncProgress).toBe(70); // 7/10 * 100
            expect(stats.lastSyncTime).toBeInstanceOf(Date);
        });
    });
});