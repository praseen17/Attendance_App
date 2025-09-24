import { databaseService } from './database';
import { mlWebSocketService, MLError } from './mlWebSocketService';
import { authService } from './authService';

/**
 * Comprehensive Error Handler for the Attendance System
 * Requirements: 2.4, 2.5, 3.4, 3.5, 6.5, 8.3
 */

export enum ErrorCategory {
    ML_MODEL = 'ML_MODEL',
    DATABASE = 'DATABASE',
    NETWORK = 'NETWORK',
    AUTHENTICATION = 'AUTHENTICATION',
    VALIDATION = 'VALIDATION',
    SECURITY = 'SECURITY',
    SYNC = 'SYNC',
    SYSTEM = 'SYSTEM'
}

export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface ComprehensiveError {
    id: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    code: string;
    message: string;
    userMessage: string;
    suggestedActions: string[];
    timestamp: Date;
    context?: Record<string, any>;
    stackTrace?: string;
    isRecoverable: boolean;
    requiresUserAction: boolean;
    securityEvent?: boolean;
}

export interface ErrorRecoveryAction {
    type: 'RETRY' | 'FALLBACK' | 'MANUAL_INTERVENTION' | 'RESTART' | 'LOGOUT';
    description: string;
    automated: boolean;
    priority: number;
}

export interface SecurityEvent {
    id: string;
    type: 'UNAUTHORIZED_ACCESS' | 'INVALID_TOKEN' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH_ATTEMPT';
    severity: ErrorSeverity;
    timestamp: Date;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details: Record<string, any>;
    blocked: boolean;
}

/**
 * Comprehensive Error Handler Class
 * Requirements: 2.4, 2.5, 3.4, 3.5, 6.5, 8.3
 */
export class ComprehensiveErrorHandler {
    private errorCallbacks: Map<ErrorCategory, ((error: ComprehensiveError) => void)[]> = new Map();
    private securityEventCallbacks: ((event: SecurityEvent) => void)[] = [];
    private errorHistory: ComprehensiveError[] = [];
    private securityEvents: SecurityEvent[] = [];
    private readonly MAX_ERROR_HISTORY = 100;
    private readonly MAX_SECURITY_EVENTS = 50;

    constructor() {
        this.initializeErrorCategories();
        this.setupMLErrorHandling();
    }

    /**
     * Initialize error category callback arrays
     */
    private initializeErrorCategories(): void {
        Object.values(ErrorCategory).forEach(category => {
            this.errorCallbacks.set(category, []);
        });
    }

    /**
     * Set up ML model error handling integration
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    private setupMLErrorHandling(): void {
        mlWebSocketService.onError((mlError: MLError) => {
            this.handleMLError(mlError);
        });
    }

    /**
     * Handle ML model errors with fallback options
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    async handleMLError(mlError: MLError): Promise<void> {
        const error = this.createComprehensiveError({
            category: ErrorCategory.ML_MODEL,
            severity: this.getMLErrorSeverity(mlError.type),
            code: `ML_${mlError.type}`,
            message: mlError.message,
            context: {
                mlErrorType: mlError.type,
                retryCount: mlError.retryCount || 0,
                timestamp: mlError.timestamp
            },
            isRecoverable: this.isMLErrorRecoverable(mlError.type),
            requiresUserAction: this.mlErrorRequiresUserAction(mlError.type)
        });

        // Log the error
        await this.logError(error);

        // Execute recovery actions
        await this.executeMLRecoveryActions(mlError, error);

        // Notify listeners
        this.notifyErrorListeners(error);
    }

    /**
     * Handle database operation errors with recovery
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    async handleDatabaseError(operation: string, originalError: any, context?: Record<string, any>): Promise<ComprehensiveError> {
        const error = this.createComprehensiveError({
            category: ErrorCategory.DATABASE,
            severity: this.getDatabaseErrorSeverity(originalError),
            code: `DB_${operation.toUpperCase()}_ERROR`,
            message: `Database ${operation} operation failed: ${originalError.message}`,
            context: {
                operation,
                originalError: originalError.message,
                ...context
            },
            stackTrace: originalError.stack,
            isRecoverable: this.isDatabaseErrorRecoverable(originalError),
            requiresUserAction: this.databaseErrorRequiresUserAction(originalError)
        });

        // Log the error
        await this.logError(error);

        // Attempt recovery
        await this.executeDatabaseRecoveryActions(operation, originalError, error);

        // Notify listeners
        this.notifyErrorListeners(error);

        return error;
    }

    /**
     * Handle security events and unauthorized access attempts
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    async handleSecurityEvent(
        type: SecurityEvent['type'],
        details: Record<string, any>,
        userId?: string,
        blocked: boolean = true
    ): Promise<void> {
        const securityEvent: SecurityEvent = {
            id: this.generateId(),
            type,
            severity: this.getSecurityEventSeverity(type),
            timestamp: new Date(),
            userId,
            details,
            blocked
        };

        // Log security event
        await this.logSecurityEvent(securityEvent);

        // Create corresponding error
        const error = this.createComprehensiveError({
            category: ErrorCategory.SECURITY,
            severity: securityEvent.severity,
            code: `SECURITY_${type}`,
            message: `Security event: ${type}`,
            context: {
                securityEventId: securityEvent.id,
                userId,
                blocked,
                ...details
            },
            isRecoverable: false,
            requiresUserAction: true,
            securityEvent: true
        });

        // Execute security response actions
        await this.executeSecurityResponseActions(securityEvent, error);

        // Notify listeners
        this.notifySecurityEventListeners(securityEvent);
        this.notifyErrorListeners(error);
    }

    /**
     * Create user-friendly error messages and suggested actions
     * Requirements: 8.3 - User-friendly error messages and suggested actions
     */
    private createComprehensiveError(params: {
        category: ErrorCategory;
        severity: ErrorSeverity;
        code: string;
        message: string;
        context?: Record<string, any>;
        stackTrace?: string;
        isRecoverable: boolean;
        requiresUserAction: boolean;
        securityEvent?: boolean;
    }): ComprehensiveError {
        const error: ComprehensiveError = {
            id: this.generateId(),
            timestamp: new Date(),
            userMessage: this.generateUserFriendlyMessage(params.category, params.code, params.message),
            suggestedActions: this.generateSuggestedActions(params.category, params.code, params.isRecoverable),
            ...params
        };

        // Add to error history
        this.errorHistory.push(error);
        if (this.errorHistory.length > this.MAX_ERROR_HISTORY) {
            this.errorHistory.shift();
        }

        return error;
    }

    /**
     * Generate user-friendly error messages
     * Requirements: 8.3 - User-friendly error messages
     */
    private generateUserFriendlyMessage(category: ErrorCategory, code: string, originalMessage: string): string {
        const messageMap: Record<string, string> = {
            // ML Model errors
            'ML_CONNECTION_LOST': 'Face recognition is temporarily unavailable. You can still mark attendance manually.',
            'ML_RECOGNITION_FAILED': 'Unable to recognize the student\'s face. Please try again or mark attendance manually.',
            'ML_LOW_CONFIDENCE': 'Face recognition is uncertain. Please verify the student identity manually.',
            'ML_TIMEOUT': 'Face recognition is taking too long. Please try again or mark attendance manually.',
            'ML_INVALID_DATA': 'Invalid image data for face recognition. Please capture the image again.',

            // Database errors
            'DB_INSERT_ERROR': 'Failed to save attendance record. Your data is safe and will be retried automatically.',
            'DB_UPDATE_ERROR': 'Failed to update attendance record. The system will retry automatically.',
            'DB_SELECT_ERROR': 'Failed to retrieve attendance data. Please try refreshing the screen.',
            'DB_DELETE_ERROR': 'Failed to remove old records. This won\'t affect your current data.',
            'DB_INIT_ERROR': 'Database initialization failed. Please restart the app.',

            // Security errors
            'SECURITY_UNAUTHORIZED_ACCESS': 'Unauthorized access detected. Please log in again.',
            'SECURITY_INVALID_TOKEN': 'Your session has expired. Please log in again.',
            'SECURITY_SUSPICIOUS_ACTIVITY': 'Suspicious activity detected. Your account has been temporarily secured.',
            'SECURITY_DATA_BREACH_ATTEMPT': 'Security threat detected. The system has been secured.',

            // Network errors
            'NETWORK_CONNECTION_ERROR': 'Network connection lost. The app will continue working offline.',
            'NETWORK_TIMEOUT': 'Network request timed out. The system will retry automatically.',
            'NETWORK_SERVER_ERROR': 'Server is temporarily unavailable. Your data will sync when connection is restored.'
        };

        return messageMap[code] || `An error occurred: ${originalMessage}. Please try again or contact support.`;
    }

    /**
     * Generate suggested actions for errors
     * Requirements: 8.3 - Suggested actions for error resolution
     */
    private generateSuggestedActions(category: ErrorCategory, code: string, isRecoverable: boolean): string[] {
        const actionMap: Record<string, string[]> = {
            // ML Model errors
            'ML_CONNECTION_LOST': [
                'Check your internet connection',
                'Use manual attendance marking',
                'Wait for automatic reconnection'
            ],
            'ML_RECOGNITION_FAILED': [
                'Ensure good lighting conditions',
                'Position the student\'s face clearly in view',
                'Use manual attendance marking as backup'
            ],
            'ML_LOW_CONFIDENCE': [
                'Verify the student\'s identity manually',
                'Confirm attendance marking',
                'Ensure the student is in the correct section'
            ],
            'ML_TIMEOUT': [
                'Try capturing the image again',
                'Check your internet connection',
                'Use manual attendance marking'
            ],

            // Database errors
            'DB_INSERT_ERROR': [
                'The system will retry automatically',
                'Continue marking attendance',
                'Restart the app if problem persists'
            ],
            'DB_SELECT_ERROR': [
                'Pull down to refresh the screen',
                'Restart the app if problem persists',
                'Check available storage space'
            ],
            'DB_INIT_ERROR': [
                'Restart the application',
                'Clear app cache if problem persists',
                'Contact support if issue continues'
            ],

            // Security errors
            'SECURITY_UNAUTHORIZED_ACCESS': [
                'Log out and log in again',
                'Check your credentials',
                'Contact administrator if problem persists'
            ],
            'SECURITY_INVALID_TOKEN': [
                'Log in again to refresh your session',
                'Check your internet connection'
            ],
            'SECURITY_SUSPICIOUS_ACTIVITY': [
                'Change your password immediately',
                'Contact administrator',
                'Review recent account activity'
            ]
        };

        const actions = actionMap[code] || [];

        if (isRecoverable && actions.length === 0) {
            actions.push('The system will retry automatically', 'Contact support if problem persists');
        } else if (!isRecoverable && actions.length === 0) {
            actions.push('Restart the application', 'Contact support for assistance');
        }

        return actions;
    }

    /**
     * Execute ML model recovery actions
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    private async executeMLRecoveryActions(mlError: MLError, error: ComprehensiveError): Promise<void> {
        switch (mlError.type) {
            case 'CONNECTION_LOST':
                // Attempt to reconnect WebSocket
                try {
                    await mlWebSocketService.reconnect();
                } catch (reconnectError) {
                    console.error('ML WebSocket reconnection failed:', reconnectError);
                }
                break;

            case 'RECOGNITION_FAILED':
                // Enable manual fallback mode
                await this.enableManualFallbackMode();
                break;

            case 'LOW_CONFIDENCE':
                // Request manual verification
                await this.requestManualVerification(error);
                break;

            case 'TIMEOUT':
                // Reduce timeout and retry
                await this.adjustMLTimeout();
                break;

            case 'INVALID_DATA':
                // Clear cached face data and request recapture
                await this.requestImageRecapture();
                break;
        }
    }

    /**
     * Execute database recovery actions
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private async executeDatabaseRecoveryActions(
        operation: string,
        originalError: any,
        error: ComprehensiveError
    ): Promise<void> {
        try {
            switch (operation) {
                case 'insert':
                case 'update':
                    // Retry the operation with exponential backoff
                    await this.retryDatabaseOperation(operation, originalError, error);
                    break;

                case 'select':
                    // Try to recover from backup or cache
                    await this.recoverFromCache(error);
                    break;

                case 'init':
                    // Attempt database repair or recreation
                    await this.repairDatabase();
                    break;

                default:
                    console.warn(`No recovery action defined for database operation: ${operation}`);
            }
        } catch (recoveryError) {
            console.error('Database recovery action failed:', recoveryError);

            // Create a new error for the failed recovery
            const recoveryFailedError = this.createComprehensiveError({
                category: ErrorCategory.DATABASE,
                severity: ErrorSeverity.HIGH,
                code: 'DB_RECOVERY_FAILED',
                message: `Database recovery failed for ${operation}: ${recoveryError.message}`,
                context: {
                    originalOperation: operation,
                    originalError: originalError.message,
                    recoveryError: recoveryError.message
                },
                isRecoverable: false,
                requiresUserAction: true
            });

            this.notifyErrorListeners(recoveryFailedError);
        }
    }

    /**
     * Execute security response actions
     * Requirements: 6.5 - Security event response actions
     */
    private async executeSecurityResponseActions(
        securityEvent: SecurityEvent,
        error: ComprehensiveError
    ): Promise<void> {
        switch (securityEvent.type) {
            case 'UNAUTHORIZED_ACCESS':
                // Force logout and clear tokens
                await this.forceLogout();
                break;

            case 'INVALID_TOKEN':
                // Clear invalid tokens and redirect to login
                await this.clearInvalidTokens();
                break;

            case 'SUSPICIOUS_ACTIVITY':
                // Lock account temporarily and notify admin
                await this.lockAccountTemporarily();
                break;

            case 'DATA_BREACH_ATTEMPT':
                // Immediate security lockdown
                await this.initiateSecurityLockdown();
                break;
        }
    }

    /**
     * Log error to persistent storage
     * Requirements: 3.4, 3.5 - Error logging for debugging and recovery
     */
    private async logError(error: ComprehensiveError): Promise<void> {
        try {
            const errorLogs = await this.getStoredErrorLogs();
            errorLogs.push({
                id: error.id,
                timestamp: error.timestamp,
                level: this.severityToLogLevel(error.severity),
                category: error.category.toLowerCase(),
                message: error.message,
                details: {
                    code: error.code,
                    userMessage: error.userMessage,
                    context: error.context,
                    isRecoverable: error.isRecoverable,
                    requiresUserAction: error.requiresUserAction,
                    securityEvent: error.securityEvent
                },
                stackTrace: error.stackTrace
            });

            // Keep only recent logs
            const recentLogs = errorLogs.slice(-this.MAX_ERROR_HISTORY);
            await databaseService.setSyncMetadata('comprehensiveErrorLogs', JSON.stringify(recentLogs));
        } catch (logError) {
            console.error('Failed to log comprehensive error:', logError);
        }
    }

    /**
     * Log security event to persistent storage
     * Requirements: 6.5 - Security event logging
     */
    private async logSecurityEvent(securityEvent: SecurityEvent): Promise<void> {
        try {
            const securityLogs = await this.getStoredSecurityEvents();
            securityLogs.push(securityEvent);

            // Keep only recent security events
            const recentEvents = securityLogs.slice(-this.MAX_SECURITY_EVENTS);
            await databaseService.setSyncMetadata('securityEvents', JSON.stringify(recentEvents));

            // Also log as regular error for comprehensive tracking
            console.warn('Security Event:', {
                id: securityEvent.id,
                type: securityEvent.type,
                severity: securityEvent.severity,
                userId: securityEvent.userId,
                blocked: securityEvent.blocked,
                timestamp: securityEvent.timestamp
            });
        } catch (logError) {
            console.error('Failed to log security event:', logError);
        }
    }

    // Helper methods for error classification and recovery
    private getMLErrorSeverity(errorType: MLError['type']): ErrorSeverity {
        const severityMap: Record<MLError['type'], ErrorSeverity> = {
            'CONNECTION_LOST': ErrorSeverity.MEDIUM,
            'RECOGNITION_FAILED': ErrorSeverity.LOW,
            'LOW_CONFIDENCE': ErrorSeverity.LOW,
            'TIMEOUT': ErrorSeverity.MEDIUM,
            'INVALID_DATA': ErrorSeverity.LOW
        };
        return severityMap[errorType] || ErrorSeverity.MEDIUM;
    }

    private isMLErrorRecoverable(errorType: MLError['type']): boolean {
        const recoverableErrors: MLError['type'][] = ['CONNECTION_LOST', 'TIMEOUT', 'INVALID_DATA'];
        return recoverableErrors.includes(errorType);
    }

    private mlErrorRequiresUserAction(errorType: MLError['type']): boolean {
        const userActionRequired: MLError['type'][] = ['RECOGNITION_FAILED', 'LOW_CONFIDENCE', 'INVALID_DATA'];
        return userActionRequired.includes(errorType);
    }

    private getDatabaseErrorSeverity(error: any): ErrorSeverity {
        if (error.message?.includes('SQLITE_CORRUPT')) return ErrorSeverity.CRITICAL;
        if (error.message?.includes('SQLITE_FULL')) return ErrorSeverity.HIGH;
        if (error.message?.includes('SQLITE_LOCKED')) return ErrorSeverity.MEDIUM;
        return ErrorSeverity.MEDIUM;
    }

    private isDatabaseErrorRecoverable(error: any): boolean {
        const nonRecoverableErrors = ['SQLITE_CORRUPT', 'SQLITE_NOTADB'];
        return !nonRecoverableErrors.some(err => error.message?.includes(err));
    }

    private databaseErrorRequiresUserAction(error: any): boolean {
        const userActionErrors = ['SQLITE_FULL', 'SQLITE_CORRUPT'];
        return userActionErrors.some(err => error.message?.includes(err));
    }

    private getSecurityEventSeverity(type: SecurityEvent['type']): ErrorSeverity {
        const severityMap: Record<SecurityEvent['type'], ErrorSeverity> = {
            'UNAUTHORIZED_ACCESS': ErrorSeverity.HIGH,
            'INVALID_TOKEN': ErrorSeverity.MEDIUM,
            'SUSPICIOUS_ACTIVITY': ErrorSeverity.HIGH,
            'DATA_BREACH_ATTEMPT': ErrorSeverity.CRITICAL
        };
        return severityMap[type] || ErrorSeverity.HIGH;
    }

    private severityToLogLevel(severity: ErrorSeverity): 'error' | 'warning' | 'info' {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 'error';
            case ErrorSeverity.MEDIUM:
                return 'warning';
            case ErrorSeverity.LOW:
                return 'info';
            default:
                return 'error';
        }
    }

    // Recovery action implementations
    private async enableManualFallbackMode(): Promise<void> {
        await databaseService.setSyncMetadata('mlFallbackMode', 'true');
        console.log('Manual fallback mode enabled');
    }

    private async requestManualVerification(error: ComprehensiveError): Promise<void> {
        await databaseService.setSyncMetadata('pendingManualVerification', JSON.stringify({
            errorId: error.id,
            timestamp: error.timestamp,
            context: error.context
        }));
    }

    private async adjustMLTimeout(): Promise<void> {
        const currentTimeout = await databaseService.getSyncMetadata('mlTimeout') || '10000';
        const newTimeout = Math.min(parseInt(currentTimeout) * 1.5, 30000);
        await databaseService.setSyncMetadata('mlTimeout', newTimeout.toString());
    }

    private async requestImageRecapture(): Promise<void> {
        await databaseService.setSyncMetadata('requestImageRecapture', 'true');
    }

    private async retryDatabaseOperation(operation: string, originalError: any, error: ComprehensiveError): Promise<void> {
        // Implementation would depend on the specific operation
        console.log(`Retrying database ${operation} operation for error ${error.id}`);
    }

    private async recoverFromCache(error: ComprehensiveError): Promise<void> {
        console.log(`Attempting cache recovery for error ${error.id}`);
    }

    private async repairDatabase(): Promise<void> {
        try {
            await databaseService.closeDatabase();
            await databaseService.initializeDatabase();
            console.log('Database repair completed');
        } catch (repairError) {
            console.error('Database repair failed:', repairError);
            throw repairError;
        }
    }

    private async forceLogout(): Promise<void> {
        await authService.logout();
        await databaseService.setSyncMetadata('forceLogout', 'true');
    }

    private async clearInvalidTokens(): Promise<void> {
        await authService.clearTokens();
    }

    private async lockAccountTemporarily(): Promise<void> {
        await databaseService.setSyncMetadata('accountLocked', new Date().toISOString());
    }

    private async initiateSecurityLockdown(): Promise<void> {
        await this.forceLogout();
        await databaseService.setSyncMetadata('securityLockdown', 'true');
    }

    // Utility methods
    private async getStoredErrorLogs(): Promise<any[]> {
        try {
            const logsJson = await databaseService.getSyncMetadata('comprehensiveErrorLogs');
            return logsJson ? JSON.parse(logsJson) : [];
        } catch (error) {
            return [];
        }
    }

    private async getStoredSecurityEvents(): Promise<SecurityEvent[]> {
        try {
            const eventsJson = await databaseService.getSyncMetadata('securityEvents');
            return eventsJson ? JSON.parse(eventsJson) : [];
        } catch (error) {
            return [];
        }
    }

    private generateId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Public API methods
    public onError(category: ErrorCategory, callback: (error: ComprehensiveError) => void): void {
        const callbacks = this.errorCallbacks.get(category) || [];
        callbacks.push(callback);
        this.errorCallbacks.set(category, callbacks);
    }

    public onSecurityEvent(callback: (event: SecurityEvent) => void): void {
        this.securityEventCallbacks.push(callback);
    }

    public getErrorHistory(): ComprehensiveError[] {
        return [...this.errorHistory];
    }

    public getSecurityEvents(): SecurityEvent[] {
        return [...this.securityEvents];
    }

    public async clearErrorHistory(): Promise<void> {
        this.errorHistory = [];
        await databaseService.setSyncMetadata('comprehensiveErrorLogs', '[]');
    }

    public async clearSecurityEvents(): Promise<void> {
        this.securityEvents = [];
        await databaseService.setSyncMetadata('securityEvents', '[]');
    }

    private notifyErrorListeners(error: ComprehensiveError): void {
        const callbacks = this.errorCallbacks.get(error.category) || [];
        callbacks.forEach(callback => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error('Error in error callback:', callbackError);
            }
        });
    }

    private notifySecurityEventListeners(event: SecurityEvent): void {
        this.securityEventCallbacks.forEach(callback => {
            try {
                callback(event);
            } catch (callbackError) {
                console.error('Error in security event callback:', callbackError);
            }
        });
    }
}

// Export singleton instance
export const comprehensiveErrorHandler = new ComprehensiveErrorHandler();