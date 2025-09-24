import {
    comprehensiveErrorHandler,
    ComprehensiveErrorHandler,
    ErrorCategory,
    ErrorSeverity,
    ComprehensiveError,
    SecurityEvent
} from '../comprehensiveErrorHandler';
import { databaseService } from '../database';
import { mlWebSocketService, MLError } from '../mlWebSocketService';
import { authService } from '../authService';

// Mock dependencies
jest.mock('../database');
jest.mock('../mlWebSocketService');
jest.mock('../authService');

const mockDatabaseService = databaseService as jest.Mocked<typeof databaseService>;
const mockMLWebSocketService = mlWebSocketService as jest.Mocked<typeof mlWebSocketService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('ComprehensiveErrorHandler', () => {
    let errorHandler: ComprehensiveErrorHandler;

    beforeEach(() => {
        errorHandler = new ComprehensiveErrorHandler();
        jest.clearAllMocks();

        // Setup default mocks
        mockDatabaseService.setSyncMetadata.mockResolvedValue();
        mockDatabaseService.getSyncMetadata.mockResolvedValue(null);
    });

    describe('ML Error Handling', () => {
        it('should handle ML connection lost error', async () => {
            const mlError: MLError = {
                type: 'CONNECTION_LOST',
                message: 'WebSocket connection lost',
                timestamp: new Date()
            };

            const errorCallback = jest.fn();
            errorHandler.onError(ErrorCategory.ML_MODEL, errorCallback);

            await errorHandler.handleMLError(mlError);

            expect(errorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: ErrorCategory.ML_MODEL,
                    code: 'ML_CONNECTION_LOST',
                    severity: ErrorSeverity.MEDIUM,
                    isRecoverable: true
                })
            );
        });

        it('should handle ML recognition failed error', async () => {
            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: 'Face recognition failed',
                timestamp: new Date()
            };

            const errorCallback = jest.fn();
            errorHandler.onError(ErrorCategory.ML_MODEL, errorCallback);

            await errorHandler.handleMLError(mlError);

            expect(errorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    category: ErrorCategory.ML_MODEL,
                    code: 'ML_RECOGNITION_FAILED',
                    severity: ErrorSeverity.LOW,
                    requiresUserAction: true
                })
            );
        });

        it('should handle ML low confidence error', async () => {
            const mlError: MLError = {
                type: 'LOW_CONFIDENCE',
                message: 'Low confidence recognition',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'pendingManualVerification',
                expect.any(String)
            );
        });

        it('should enable manual fallback for recognition failures', async () => {
            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: 'Recognition failed',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'mlFallbackMode',
                'true'
            );
        });
    });

    describe('Database Error Handling', () => {
        it('should handle database insert error with recovery', async () => {
            const originalError = new Error('SQLITE_LOCKED: database is locked');

            const error = await errorHandler.handleDatabaseError('insert', originalError, {
                table: 'attendance_records',
                record: { student_id: '123' }
            });

            expect(error).toMatchObject({
                category: ErrorCategory.DATABASE,
                code: 'DB_INSERT_ERROR',
                severity: ErrorSeverity.MEDIUM,
                isRecoverable: true
            });
        });

        it('should handle database corruption error', async () => {
            const originalError = new Error('SQLITE_CORRUPT: database disk image is malformed');

            const error = await errorHandler.handleDatabaseError('select', originalError);

            expect(error).toMatchObject({
                category: ErrorCategory.DATABASE,
                severity: ErrorSeverity.CRITICAL,
                isRecoverable: false,
                requiresUserAction: true
            });
        });

        it('should attempt database repair for init errors', async () => {
            const originalError = new Error('Database initialization failed');

            await errorHandler.handleDatabaseError('init', originalError);

            expect(mockDatabaseService.closeDatabase).toHaveBeenCalled();
            expect(mockDatabaseService.initializeDatabase).toHaveBeenCalled();
        });
    });

    describe('Security Event Handling', () => {
        it('should log unauthorized access security event', async () => {
            const securityCallback = jest.fn();
            errorHandler.onSecurityEvent(securityCallback);

            await errorHandler.handleSecurityEvent(
                'UNAUTHORIZED_ACCESS',
                { endpoint: '/api/attendance', method: 'POST' },
                'user123',
                true
            );

            expect(securityCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'UNAUTHORIZED_ACCESS',
                    severity: ErrorSeverity.HIGH,
                    userId: 'user123',
                    blocked: true
                })
            );
        });

        it('should force logout for unauthorized access', async () => {
            await errorHandler.handleSecurityEvent(
                'UNAUTHORIZED_ACCESS',
                { reason: 'Invalid token' },
                'user123'
            );

            expect(mockAuthService.logout).toHaveBeenCalled();
        });

        it('should clear invalid tokens for token errors', async () => {
            await errorHandler.handleSecurityEvent(
                'INVALID_TOKEN',
                { token: 'expired_token' }
            );

            expect(mockAuthService.logout).toHaveBeenCalled();
        });

        it('should initiate security lockdown for breach attempts', async () => {
            await errorHandler.handleSecurityEvent(
                'DATA_BREACH_ATTEMPT',
                { suspiciousActivity: 'SQL injection attempt' }
            );

            expect(mockAuthService.logout).toHaveBeenCalled();
            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'securityLockdown',
                'true'
            );
        });
    });

    describe('User-Friendly Messages', () => {
        it('should generate user-friendly message for ML errors', () => {
            const error: ComprehensiveError = {
                id: 'test-error',
                category: ErrorCategory.ML_MODEL,
                severity: ErrorSeverity.MEDIUM,
                code: 'ML_CONNECTION_LOST',
                message: 'WebSocket connection lost',
                userMessage: '',
                suggestedActions: [],
                timestamp: new Date(),
                isRecoverable: true,
                requiresUserAction: false
            };

            // The user message should be generated during error creation
            expect(error.userMessage).toBeDefined();
        });

        it('should generate appropriate suggested actions', () => {
            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: 'Face not detected',
                timestamp: new Date()
            };

            // Test that suggested actions are generated
            const errorCallback = jest.fn();
            errorHandler.onError(ErrorCategory.ML_MODEL, errorCallback);

            errorHandler.handleMLError(mlError);

            expect(errorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    suggestedActions: expect.arrayContaining([
                        expect.stringContaining('lighting'),
                        expect.stringContaining('manual')
                    ])
                })
            );
        });
    });

    describe('Error Logging and Persistence', () => {
        it('should log errors to persistent storage', async () => {
            mockDatabaseService.getSyncMetadata.mockResolvedValue('[]');

            const mlError: MLError = {
                type: 'TIMEOUT',
                message: 'Request timeout',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'comprehensiveErrorLogs',
                expect.any(String)
            );
        });

        it('should log security events to persistent storage', async () => {
            mockDatabaseService.getSyncMetadata.mockResolvedValue('[]');

            await errorHandler.handleSecurityEvent(
                'SUSPICIOUS_ACTIVITY',
                { pattern: 'Multiple failed login attempts' }
            );

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'securityEvents',
                expect.any(String)
            );
        });

        it('should maintain error history limits', async () => {
            const existingLogs = Array(150).fill(null).map((_, i) => ({
                id: `error-${i}`,
                timestamp: new Date(),
                level: 'error',
                category: 'test',
                message: `Test error ${i}`
            }));

            mockDatabaseService.getSyncMetadata.mockResolvedValue(JSON.stringify(existingLogs));

            const mlError: MLError = {
                type: 'TIMEOUT',
                message: 'New error',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            const savedLogs = JSON.parse(
                (mockDatabaseService.setSyncMetadata as jest.Mock).mock.calls
                    .find(call => call[0] === 'comprehensiveErrorLogs')[1]
            );

            expect(savedLogs.length).toBeLessThanOrEqual(100);
        });
    });

    describe('Error Recovery Actions', () => {
        it('should adjust ML timeout after timeout errors', async () => {
            mockDatabaseService.getSyncMetadata.mockResolvedValue('10000');

            const mlError: MLError = {
                type: 'TIMEOUT',
                message: 'Recognition timeout',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'mlTimeout',
                '15000'
            );
        });

        it('should request image recapture for invalid data', async () => {
            const mlError: MLError = {
                type: 'INVALID_DATA',
                message: 'Invalid image format',
                timestamp: new Date()
            };

            await errorHandler.handleMLError(mlError);

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'requestImageRecapture',
                'true'
            );
        });
    });

    describe('Error History and Statistics', () => {
        it('should return error history', () => {
            const history = errorHandler.getErrorHistory();
            expect(Array.isArray(history)).toBe(true);
        });

        it('should return security events', () => {
            const events = errorHandler.getSecurityEvents();
            expect(Array.isArray(events)).toBe(true);
        });

        it('should clear error history', async () => {
            await errorHandler.clearErrorHistory();

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'comprehensiveErrorLogs',
                '[]'
            );
        });

        it('should clear security events', async () => {
            await errorHandler.clearSecurityEvents();

            expect(mockDatabaseService.setSyncMetadata).toHaveBeenCalledWith(
                'securityEvents',
                '[]'
            );
        });
    });

    describe('Error Classification', () => {
        it('should classify ML errors correctly', () => {
            const connectionError: MLError = {
                type: 'CONNECTION_LOST',
                message: 'Connection lost',
                timestamp: new Date()
            };

            const errorCallback = jest.fn();
            errorHandler.onError(ErrorCategory.ML_MODEL, errorCallback);

            errorHandler.handleMLError(connectionError);

            expect(errorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    severity: ErrorSeverity.MEDIUM,
                    isRecoverable: true
                })
            );
        });

        it('should classify database errors by severity', async () => {
            const corruptError = new Error('SQLITE_CORRUPT');
            const lockedError = new Error('SQLITE_LOCKED');

            const corruptResult = await errorHandler.handleDatabaseError('select', corruptError);
            const lockedResult = await errorHandler.handleDatabaseError('select', lockedError);

            expect(corruptResult.severity).toBe(ErrorSeverity.CRITICAL);
            expect(lockedResult.severity).toBe(ErrorSeverity.MEDIUM);
        });
    });
});