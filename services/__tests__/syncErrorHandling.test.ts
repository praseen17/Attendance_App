import { syncErrorHandler, SyncErrorType } from '../errorHandler';
import { syncStateManager } from '../syncStateManager';
import { conflictResolver, ConflictType } from '../conflictResolver';
import { notificationService, NotificationType } from '../notificationService';
import { AttendanceRecord } from '../database';

// Mock dependencies
jest.mock('../database');
jest.mock('../networkService');

describe('Sync Error Handling and Retry Mechanisms', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('SyncErrorHandler', () => {
        test('should classify network errors correctly', () => {
            const networkError = new Error('Network connection failed');
            const errorType = syncErrorHandler.classifyError(networkError);
            expect(errorType).toBe(SyncErrorType.NETWORK_ERROR);
        });

        test('should classify authentication errors correctly', () => {
            const authError = { status: 401, message: 'Unauthorized' };
            const errorType = syncErrorHandler.classifyError(authError);
            expect(errorType).toBe(SyncErrorType.AUTHENTICATION_ERROR);
        });

        test('should calculate exponential backoff delay', () => {
            const delay1 = syncErrorHandler.calculateRetryDelay(0);
            const delay2 = syncErrorHandler.calculateRetryDelay(1);
            const delay3 = syncErrorHandler.calculateRetryDelay(2);

            expect(delay2).toBeGreaterThan(delay1);
            expect(delay3).toBeGreaterThan(delay2);
            expect(delay3).toBeLessThanOrEqual(300000); // Max delay cap
        });

        test('should determine retryable errors correctly', () => {
            expect(syncErrorHandler.isRetryableError(SyncErrorType.NETWORK_ERROR)).toBe(true);
            expect(syncErrorHandler.isRetryableError(SyncErrorType.SERVER_ERROR)).toBe(true);
            expect(syncErrorHandler.isRetryableError(SyncErrorType.AUTHENTICATION_ERROR)).toBe(false);
            expect(syncErrorHandler.isRetryableError(SyncErrorType.VALIDATION_ERROR)).toBe(false);
        });

        test('should create sync error with proper metadata', () => {
            const error = new Error('Test error');
            const syncError = syncErrorHandler.createSyncError(123, error, 2);

            expect(syncError.recordId).toBe(123);
            expect(syncError.error).toBe('Test error');
            expect(syncError.retryCount).toBe(2);
            expect(syncError.isRetryable).toBe(true);
            expect(syncError.nextRetryAt).toBeDefined();
        });

        test('should provide user-friendly error messages', () => {
            const networkError = syncErrorHandler.createSyncError(1, new Error('Network failed'));
            const message = syncErrorHandler.getUserFriendlyMessage(networkError);

            expect(message).toContain('Network connection issue');
            expect(message).toContain('check your internet connection');
        });

        test('should provide suggested actions for errors', () => {
            const networkError = syncErrorHandler.createSyncError(1, new Error('Network failed'));
            const actions = syncErrorHandler.getSuggestedActions(networkError);

            expect(actions).toContain('Check your internet connection');
            expect(actions.length).toBeGreaterThan(0);
        });
    });

    describe('SyncStateManager', () => {
        const mockRecords: AttendanceRecord[] = [
            {
                id: 1,
                studentId: 'student1',
                facultyId: 'faculty1',
                sectionId: 'section1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'ml'
            },
            {
                id: 2,
                studentId: 'student2',
                facultyId: 'faculty1',
                sectionId: 'section1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            }
        ];

        test('should initialize sync state correctly', async () => {
            const syncState = await syncStateManager.initializeSyncState(mockRecords, 1);

            expect(syncState.totalRecords).toBe(2);
            expect(syncState.totalBatches).toBe(2);
            expect(syncState.batchSize).toBe(1);
            expect(syncState.isComplete).toBe(false);
            expect(syncState.isPaused).toBe(false);
        });

        test('should update sync progress correctly', async () => {
            const syncState = await syncStateManager.initializeSyncState(mockRecords, 2);

            await syncStateManager.updateSyncProgress(0, [1], [2], []);

            const currentState = syncStateManager.getCurrentSyncState();
            expect(currentState?.successfulRecords).toBe(1);
            expect(currentState?.failedRecords).toBe(1);
            expect(currentState?.processedRecords).toBe(2);
        });

        test('should pause and resume sync correctly', async () => {
            const syncState = await syncStateManager.initializeSyncState(mockRecords, 2);

            const resumeTime = new Date(Date.now() + 60000);
            await syncStateManager.pauseSync(resumeTime);

            const currentState = syncStateManager.getCurrentSyncState();
            expect(currentState?.isPaused).toBe(true);
            expect(currentState?.resumeAfter).toEqual(resumeTime);

            // Test resume - but first we need to mock the time to be past resumeAfter
            jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 70000);

            const resumedState = await syncStateManager.resumeSync();
            expect(resumedState?.isPaused).toBe(false);
            expect(resumedState?.resumeAfter).toBeUndefined();

            // Restore Date.now
            jest.restoreAllMocks();
        });

        test('should provide recovery information', async () => {
            await syncStateManager.initializeSyncState(mockRecords, 2);
            await syncStateManager.updateSyncProgress(0, [1], [], []);

            const recoveryInfo = await syncStateManager.getSyncRecoveryInfo();

            expect(recoveryInfo?.canRecover).toBe(true);
            expect(recoveryInfo?.totalRecords).toBe(2);
            expect(recoveryInfo?.processedRecords).toBe(1);
            expect(recoveryInfo?.remainingRecords).toBe(1);
        });
    });

    describe('ConflictResolver', () => {
        const createMockRecord = (id: number, studentId: string, status: 'present' | 'absent', timestamp: Date, captureMethod: 'ml' | 'manual' = 'manual'): AttendanceRecord => ({
            id,
            studentId,
            facultyId: 'faculty1',
            sectionId: 'section1',
            timestamp,
            status,
            syncStatus: 'pending',
            captureMethod
        });

        test('should detect duplicate records', () => {
            const now = new Date();
            const records = [
                createMockRecord(1, 'student1', 'present', now),
                createMockRecord(2, 'student1', 'present', now), // Duplicate
                createMockRecord(3, 'student2', 'present', now)
            ];

            const result = conflictResolver.detectConflicts(records);
            expect(result.hasConflicts).toBe(true);
            expect(result.conflicts.length).toBeGreaterThan(0);
        });

        test('should detect status conflicts', () => {
            const now = new Date();
            const records = [
                createMockRecord(1, 'student1', 'present', now),
                createMockRecord(2, 'student1', 'absent', new Date(now.getTime() + 1000)) // Different status
            ];

            const result = conflictResolver.detectConflicts(records);
            expect(result.hasConflicts).toBe(true);

            const statusConflict = result.conflicts.find(c => c.type === ConflictType.STATUS_CONFLICT);
            expect(statusConflict).toBeDefined();
        });

        test('should detect timestamp conflicts', () => {
            const now = new Date();
            const records = [
                createMockRecord(1, 'student1', 'present', now),
                createMockRecord(2, 'student1', 'present', new Date(now.getTime() + 1000)) // Very close timestamp
            ];

            const result = conflictResolver.detectConflicts(records);
            expect(result.hasConflicts).toBe(true);
        });

        test('should resolve conflicts with appropriate strategies', () => {
            const now = new Date();
            const records = [
                createMockRecord(1, 'student1', 'present', now, 'manual'),
                createMockRecord(2, 'student1', 'present', new Date(now.getTime() + 1000), 'ml')
            ];

            const conflictResult = conflictResolver.detectConflicts(records);
            const resolutions = conflictResolver.resolveConflicts(conflictResult.conflicts);

            expect(resolutions.length).toBeGreaterThan(0);

            // Should prefer ML capture
            const resolution = resolutions[0];
            expect(resolution.resolvedRecord.captureMethod).toBe('ml');
        });

        test('should prefer present status over absent', () => {
            const now = new Date();
            const records = [
                createMockRecord(1, 'student1', 'absent', now),
                createMockRecord(2, 'student1', 'present', new Date(now.getTime() + 1000))
            ];

            const conflictResult = conflictResolver.detectConflicts(records);
            const resolutions = conflictResolver.resolveConflicts(conflictResult.conflicts);

            const resolution = resolutions[0];
            expect(resolution.resolvedRecord.status).toBe('present');
        });
    });

    describe('NotificationService', () => {
        test('should create sync error notification with actions', () => {
            const syncError = syncErrorHandler.createSyncError(1, new Error('Network failed'));

            notificationService.showSyncError(syncError, 5);

            const notifications = notificationService.getAllNotifications();
            const errorNotification = notifications.find(n => n.type === NotificationType.ERROR);

            expect(errorNotification).toBeDefined();
            expect(errorNotification?.title).toContain('Sync Failed');
            expect(errorNotification?.actions?.length).toBeGreaterThan(0);
        });

        test('should create sync success notification', () => {
            const syncResult = {
                totalRecords: 10,
                syncedRecords: 8,
                failedRecords: 2,
                errors: []
            };

            notificationService.showSyncSuccess(syncResult);

            const notifications = notificationService.getAllNotifications();
            const successNotification = notifications.find(n => n.type === NotificationType.SUCCESS);

            expect(successNotification).toBeDefined();
            expect(successNotification?.title).toContain('Successfully');
        });

        test('should update sync progress notification', () => {
            const progress = {
                totalRecords: 100,
                processedRecords: 50,
                successfulRecords: 45,
                failedRecords: 5,
                percentage: 50,
                currentOperation: 'Processing batch 1',
                isComplete: false
            };

            notificationService.showSyncProgress(progress);

            const notifications = notificationService.getAllNotifications();
            const progressNotification = notifications.find(n => n.type === NotificationType.SYNC_PROGRESS);

            expect(progressNotification).toBeDefined();
            expect(progressNotification?.message).toContain('50%');
        });

        test('should show network status notifications', () => {
            notificationService.showNetworkStatus(false);

            const notifications = notificationService.getAllNotifications();
            const offlineNotification = notifications.find(n =>
                n.type === NotificationType.WARNING && n.metadata?.networkStatus === 'offline'
            );

            expect(offlineNotification).toBeDefined();
            expect(offlineNotification?.title).toContain('Offline');
        });

        test('should show conflict resolution notification', () => {
            notificationService.showConflictResolution(3, ['DUPLICATE_RECORD', 'STATUS_CONFLICT']);

            const notifications = notificationService.getAllNotifications();
            const conflictNotification = notifications.find(n =>
                n.metadata?.conflictResolution === true
            );

            expect(conflictNotification).toBeDefined();
            expect(conflictNotification?.title).toContain('Conflict');
        });

        test('should manage notification lifecycle', () => {
            const syncError = syncErrorHandler.createSyncError(1, new Error('Test error'));
            notificationService.showSyncError(syncError);

            let notifications = notificationService.getAllNotifications();
            expect(notifications.length).toBe(1);

            const notificationId = notifications[0].id;
            notificationService.markAsRead(notificationId);

            notifications = notificationService.getAllNotifications();
            expect(notifications[0].isRead).toBe(true);

            notificationService.dismissNotification(notificationId);
            notifications = notificationService.getAllNotifications();
            expect(notifications.length).toBe(0);
        });
    });

    describe('Integration Tests', () => {
        test('should handle complete error recovery flow', async () => {
            // Simulate network error during sync
            const networkError = new Error('Network connection lost');
            const syncError = syncErrorHandler.createSyncError(1, networkError);

            // Should be retryable
            expect(syncErrorHandler.shouldRetry(syncError)).toBe(true);

            // Should calculate appropriate retry delay
            const retryDelay = syncErrorHandler.calculateRetryDelay(syncError.retryCount);
            expect(retryDelay).toBeGreaterThan(0);

            // Should provide user-friendly message
            const userMessage = syncErrorHandler.getUserFriendlyMessage(syncError);
            expect(userMessage).toContain('Network connection issue');

            // Should log error
            await syncErrorHandler.logError({
                level: 'error',
                category: 'sync',
                message: 'Test error logging',
                details: { test: true }
            });

            const errorLogs = await syncErrorHandler.getErrorLogs();
            expect(errorLogs.length).toBeGreaterThan(0);
        });

        test('should handle sync state persistence during interruption', async () => {
            const mockRecords: AttendanceRecord[] = [
                {
                    id: 1,
                    studentId: 'student1',
                    facultyId: 'faculty1',
                    sectionId: 'section1',
                    timestamp: new Date(),
                    status: 'present',
                    syncStatus: 'pending',
                    captureMethod: 'ml'
                }
            ];

            // Initialize sync state
            const syncState = await syncStateManager.initializeSyncState(mockRecords, 1);
            expect(syncState.totalRecords).toBe(1);

            // Simulate interruption
            await syncStateManager.pauseSync();
            expect(syncStateManager.getCurrentSyncState()?.isPaused).toBe(true);

            // Simulate recovery
            const resumedState = await syncStateManager.resumeSync();
            expect(resumedState?.isPaused).toBe(false);
        });
    });
});