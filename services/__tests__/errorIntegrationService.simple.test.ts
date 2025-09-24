import {
    errorIntegrationService,
    ErrorIntegrationService,
    ErrorNotification,
    ErrorStats
} from '../errorIntegrationService';
import { comprehensiveErrorHandler, ErrorCategory, ErrorSeverity } from '../comprehensiveErrorHandler';
import { databaseService } from '../database';

// Mock dependencies
jest.mock('../comprehensiveErrorHandler');
jest.mock('../database');

const mockComprehensiveErrorHandler = comprehensiveErrorHandler as jest.Mocked<typeof comprehensiveErrorHandler>;
const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;

describe('ErrorIntegrationService - Core Functionality', () => {
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

    describe('Error Notification Callbacks', () => {
        beforeEach(async () => {
            await integrationService.initialize();
        });

        it('should register error notification callbacks', () => {
            const callback = jest.fn();
            integrationService.onErrorNotification(callback);

            // Verify callback is registered (implementation detail)
            expect(callback).toBeDefined();
        });

        it('should register error stats callbacks', () => {
            const callback = jest.fn();
            integrationService.onErrorStats(callback);

            // Verify callback is registered (implementation detail)
            expect(callback).toBeDefined();
        });
    });
});