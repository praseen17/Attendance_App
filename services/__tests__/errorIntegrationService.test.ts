import {
    errorIntegrationService,
    ErrorIntegrationService,
    ErrorNotification,
    ErrorStats
} from '../errorIntegrationService';
import { comprehensiveErrorHandler, ErrorCategory, ErrorSeverity } from '../comprehensiveErrorHandler';
import { databaseService } from '../database';
import { mlWebSocketService } from '../mlWebSocketService';
import { authService } from '../authService';
import { syncService } from '../syncService';

// Mock dependencies
jest.mock('../comprehensiveErrorHandler');
jest.mock('../database');
jest.mock('../mlWebSocketService');
jest.mock('../authService');
jest.mock('../syncService');

const mockComprehensiveErrorHandler = comprehensiveErrorHandler as jest.Mocked<typeof comprehensiveErrorHandler>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockMLWebSocketService = mlWebSocketService as jest.Mocked<typeof mlWebSocketService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockSyncService = syncService as jest.Mocked<typeof syncService>;

describe('ErrorIntegrationService', () => {
    let integrationService: ErrorIntegrationService;

    beforeEach(() => {
        integrationService = new ErrorIntegrationService();
        jest.clearAllMocks();

        // Setup default mocks
        mockDatabaseService.setSyncMetadata.mockResolvedValue();
        mockDatabaseService.getSyncMetadata.mockResolvedValue(null);
        mockComprehensiveErrorHandler.getErrorHistory.mockReturnValue([]);
        mockComprehensiveErrorHandler.getSecurityEvents.mockReturnValue([]);
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            await integrationService.initialize();

            expect(mockComprehensiveErrorHandler.onError).toHaveBeenCalledWith(
                ErrorCategory.ML_MODEL,
                expect.any(Function)
            );
            expect(mockComprehensiveErrorHandler.onError).toHaveBeenCalledWith(
                ErrorCategory.DATABASE,
                expect.any(Function)
            );
            expect(mockComprehensiveErrorHandler.onError).toHaveBeenCalledWith(
                ErrorCategory.AUTHENTICATION,
                expect.any(Function)
            );
            expect(mockComprehensiveErrorHandler.onError).toHaveBeenCalledWith(
                ErrorCategory.SYNC,
                expect.any(Function)
            );
        });

        it('should not initialize twice', async () => {
            await integrationService.initialize();
            await integrationService.initialize();

            // Should only be called once per category
            expect(mockComprehensiveErrorHandler.onError).toHaveBeenCalledTimes(4);
        });

        it('should handle initialization errors gracefully', async () => {
            mockDatabaseService.getSyncMetadata.mockRejectedValue(new Error('Database error'));

            await expect(integrationService.initialize()).rejects.toThrow('Database error');
        });
    });

    describe('Database Service Method Wrapping', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should wrap insertAttendance with error handling', async () => {
            const originalError = new Error('Insert failed');

            // Mock the original method to throw an error
            (databaseService.insertAttendance as jest.Mock).mockRejectedValue(originalError);

            const record = { student_id: '123', status: 'present' };

            await expect(databaseService.insertAttendance(record)).rejects.toThrow();

            expect(mockComprehensiveErrorHandler.handleDatabaseError).toHaveBeenCalledWith(
                'insert',
                originalError,
                expect.objectContaining({
                    operation: 'insertAttendance',
                    record
                })
            );
        });

        it('should wrap updateAttendance with error handling', async () => {
            const originalError = new Error('Update failed');

            (databaseService.updateAttendance as jest.Mock).mockRejectedValue(originalError);

            const updates = { status: 'absent' };

            await expect(databaseService.updateAttendance(1, updates)).rejects.toThrow();

            expect(mockComprehensiveErrorHandler.handleDatabaseError).toHaveBeenCalledWith(
                'update',
                originalError,
                expect.objectContaining({
                    operation: 'updateAttendance',
                    id: 1,
                    updates
                })
            );
        });

        it('should wrap getAttendanceRecords with error handling', async () => {
            const originalError = new Error('Select failed');

            (databaseService.getAttendanceRecords as jest.Mock).mockRejectedValue(originalError);

            const filters = { date: '2023-01-01' };

            await expect(databaseService.getAttendanceRecords(filters)).rejects.toThrow();

            expect(mockComprehensiveErrorHandler.handleDatabaseError).toHaveBeenCalledWith(
                'select',
                originalError,
                expect.objectContaining({
                    operation: 'getAttendanceRecords',
                    filters
                })
            );
        });
    });

    describe('Error Notification Handling', () => {
        let notificationCallback: jest.Mock;

        beforeEach(async () => {
            await integrationService.initialize();
            notificationCallback = jest.fn();
            integrationService.onErrorNotification(notificationCallback);
        });

        it('should handle ML errors with appropriate notifications', () => {
            const mlError = {
                id: 'ml-error-1',
                category: ErrorCategory.ML_MODEL,
                severity: ErrorSeverity.MEDIUM,
                code: 'ML_CONNECTION_LOST',
                message: 'WebSocket connection lost',
                userMessage: 'Face recognition is temporarily unavailable. You can still mark attendance manually.',
                suggestedActions: ['Check your internet connection', 'Use manual attendance marking'],
                timestamp: new Date(),
                isRecoverable: true,
                requiresUserAction: false
            };

            // Simulate ML error callback
            const mlErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.ML_MODEL)[1];
            mlErrorCallback(mlError);

            expect(notificationCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'ml-error-1',
                    title: 'Face Recognition Issue',
                    type: 'warning',
                    duration: 5000,
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Retry Connection',
                            primary: true
                        }),
                        expect.objectContaining({
                            label: 'Use Manual Entry'
                        })
                    ])
                })
            );
        });

        it('should handle database errors with appropriate notifications', () => {
            const dbError = {
                id: 'db-error-1',
                category: ErrorCategory.DATABASE,
                severity: ErrorSeverity.HIGH,
                code: 'DB_INSERT_ERROR',
                message: 'Failed to insert attendance record',
                userMessage: 'Failed to save attendance record. Your data is safe and will be retried automatically.',
                suggestedActions: ['The system will retry automatically', 'Contact support if problem persists'],
                timestamp: new Date(),
                isRecoverable: true,
                requiresUserAction: false
            };

            const dbErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.DATABASE)[1];
            dbErrorCallback(dbError);

            expect(notificationCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'db-error-1',
                    title: 'Data Storage Issue',
                    type: 'warning',
                    duration: 3000
                })
            );
        });

        it('should handle authentication errors with persistent notifications', () => {
            const authError = {
                id: 'auth-error-1',
                category: ErrorCategory.AUTHENTICATION,
                severity: ErrorSeverity.HIGH,
                code: 'AUTH_TOKEN_EXPIRED',
                message: 'Authentication token expired',
                userMessage: 'Your session has expired. Please log in again.',
                suggestedActions: ['Log out and log in again', 'Check your credentials'],
                timestamp: new Date(),
                isRecoverable: true,
                requiresUserAction: true
            };

            const authErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.AUTHENTICATION)[1];
            authErrorCallback(authError);

            expect(notificationCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'auth-error-1',
                    title: 'Authentication Issue',
                    type: 'error',
                    persistent: true,
                    actions: expect.arrayContaining([
                        expect.objectContaining({
                            label: 'Login Again',
                            primary: true
                        })
                    ])
                })
            );
        });

        it('should handle security events with critical notifications', () => {
            const securityEvent = {
                id: 'security-1',
                type: 'UNAUTHORIZED_ACCESS' as const,
                severity: ErrorSeverity.HIGH,
                timestamp: new Date(),
                userId: 'user123',
                details: { endpoint: '/api/attendance' },
                blocked: true
            };

            const securityCallback = mockComprehensiveErrorHandler.onSecurityEvent.mock.calls[0][0];
            securityCallback(securityEvent);

            expect(notificationCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'security-1',
                    title: 'Security Alert',
                    type: 'error',
                    persistent: true,
                    message: 'Unauthorized access attempt detected. Your account has been secured.'
                })
            );
        });
    });

    describe('Error Action Handling', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should handle ML reconnection action', async () => {
            const mlError = {
                id: 'ml-error-1',
                category: ErrorCategory.ML_MODEL,
                code: 'ML_CONNECTION_LOST',
                severity: ErrorSeverity.MEDIUM,
                message: 'Connection lost',
                userMessage: 'Connection lost',
                suggestedActions: [],
                timestamp: new Date(),
                isRecoverable: true,
                requiresUserAction: false
            };

            const notificationCallback = jest.fn();
            integrationService.onErrorNotification(notificationCallback);

            const mlErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.ML_MODEL)[1];
            mlErrorCallback(mlError);

            const notification = notificationCallback.mock.calls[0][0] as ErrorNotification;
            const retryAction = notification.actions?.find(action => action.label === 'Retry Connection');

            expect(retryAction).toBeDefined();

            // Execute the action
            retryAction!.action();

            expect(mockMLWebSocketService.reconnect).toHaveBeenCalled();
        });

        it('should handle manual fallback action', async () => {
            const mlError = {
                id: 'ml-error-1',
                category: ErrorCategory.ML_MODEL,
                code: 'ML_RECOGNITION_FAILED',
                severity: ErrorSeverity.LOW,
                message: 'Recognition failed',
                userMessage: 'Recognition failed',
                suggestedActions: [],
                timestamp: new Date(),
                isRecoverable: false,
                requiresUserAction: true
            };

            const notificationCallback = jest.fn();
            integrationService.onErrorNotification(notificationCallback);

            const mlErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.ML_MODEL)[1];
            mlErrorCallback(mlError);

            const notification = notificationCallback.mock.calls[0][0] as ErrorNotification;
            const manualAction = notification.actions?.find(action => action.label === 'Manual Entry');

            expect(manualAction).toBeDefined();

            // Execute the action
            manualAction!.action();

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'mlFallbackMode',
                'true'
            );
        });

        it('should handle authentication logout action', async () => {
            const authError = {
                id: 'auth-error-1',
                category: ErrorCategory.AUTHENTICATION,
                code: 'AUTH_UNAUTHORIZED',
                severity: ErrorSeverity.HIGH,
                message: 'Unauthorized',
                userMessage: 'Unauthorized',
                suggestedActions: [],
                timestamp: new Date(),
                isRecoverable: false,
                requiresUserAction: true
            };

            const notificationCallback = jest.fn();
            integrationService.onErrorNotification(notificationCallback);

            const authErrorCallback = mockComprehensiveErrorHandler.onError.mock.calls
                .find(call => call[0] === ErrorCategory.AUTHENTICATION)[1];
            authErrorCallback(authError);

            const notification = notificationCallback.mock.calls[0][0] as ErrorNotification;
            const loginAction = notification.actions?.find(action => action.label === 'Login Again');

            expect(loginAction).toBeDefined();

            // Execute the action
            loginAction!.action();

            expect(mockAuthService.logout).toHaveBeenCalled();
        });
    });

    describe('Error Statistics', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should calculate error statistics correctly', async () => {
            const mockErrors = [
                {
                    id: '1',
                    category: ErrorCategory.ML_MODEL,
                    severity: ErrorSeverity.MEDIUM,
                    code: 'ML_ERROR',
                    message: 'ML error',
                    userMessage: 'ML error',
                    suggestedActions: [],
                    timestamp: new Date(),
                    isRecoverable: true,
                    requiresUserAction: false
                },
                {
                    id: '2',
                    category: ErrorCategory.DATABASE,
                    severity: ErrorSeverity.HIGH,
                    code: 'DB_ERROR',
                    message: 'DB error',
                    userMessage: 'DB error',
                    suggestedActions: [],
                    timestamp: new Date(),
                    isRecoverable: false,
                    requiresUserAction: true
                }
            ];

            const mockSecurityEvents = [
                {
                    id: 'sec-1',
                    type: 'UNAUTHORIZED_ACCESS' as const,
                    severity: ErrorSeverity.HIGH,
                    timestamp: new Date(),
                    details: {},
                    blocked: true
                }
            ];

            mockComprehensiveErrorHandler.getErrorHistory.mockReturnValue(mockErrors);
            mockComprehensiveErrorHandler.getSecurityEvents.mockReturnValue(mockSecurityEvents);

            const stats = await integrationService.getErrorStats();

            expect(stats).toMatchObject({
                totalErrors: 2,
                errorsByCategory: {
                    [ErrorCategory.ML_MODEL]: 1,
                    [ErrorCategory.DATABASE]: 1,
                    [ErrorCategory.NETWORK]: 0,
                    [ErrorCategory.AUTHENTICATION]: 0,
                    [ErrorCategory.VALIDATION]: 0,
                    [ErrorCategory.SECURITY]: 0,
                    [ErrorCategory.SYNC]: 0,
                    [ErrorCategory.SYSTEM]: 0
                },
                errorsBySeverity: {
                    [ErrorSeverity.MEDIUM]: 1,
                    [ErrorSeverity.HIGH]: 1
                },
                recentErrors: mockErrors,
                securityEvents: mockSecurityEvents,
                recoverySuccessRate: expect.any(Number)
            });
        });

        it('should calculate recovery success rate', async () => {
            const recoverableErrors = [
                {
                    id: '1',
                    category: ErrorCategory.ML_MODEL,
                    severity: ErrorSeverity.MEDIUM,
                    code: 'ML_ERROR',
                    message: 'ML error',
                    userMessage: 'ML error',
                    suggestedActions: [],
                    timestamp: new Date(),
                    isRecoverable: true,
                    requiresUserAction: false // Successful recovery
                },
                {
                    id: '2',
                    category: ErrorCategory.DATABASE,
                    severity: ErrorSeverity.HIGH,
                    code: 'DB_ERROR',
                    message: 'DB error',
                    userMessage: 'DB error',
                    suggestedActions: [],
                    timestamp: new Date(),
                    isRecoverable: true,
                    requiresUserAction: true // Failed recovery
                }
            ];

            mockComprehensiveErrorHandler.getErrorHistory.mockReturnValue(recoverableErrors);
            mockComprehensiveErrorHandler.getSecurityEvents.mockReturnValue([]);

            const stats = await integrationService.getErrorStats();

            expect(stats.recoverySuccessRate).toBe(50); // 1 out of 2 successful
        });
    });

    describe('Database Health Monitoring', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should check database health successfully', async () => {
            mockDatabaseService.getSyncMetadata.mockResolvedValue('test');

            // The health check is called during initialization
            expect(mockDatabaseService.getSyncMetadata).toHaveBeenCalledWith('health_check');
        });

        it('should attempt database recovery on health check failure', async () => {
            mockDatabaseService.getSyncMetadata.mockRejectedValue(new Error('Database error'));

            // Create a new service instance to trigger initialization
            const newService = new ErrorIntegrationService();
            await newService.initialize();

            expect(mockDatabaseService.closeDatabase).toHaveBeenCalled();
            expect(mockDatabaseService.initializeDatabase).toHaveBeenCalled();
        });
    });

    describe('Cleanup Operations', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should clear all errors', async () => {
            await integrationService.clearAllErrors();

            expect(mockComprehensiveErrorHandler.clearErrorHistory).toHaveBeenCalled();
            expect(mockComprehensiveErrorHandler.clearSecurityEvents).toHaveBeenCalled();
        });
    });
});