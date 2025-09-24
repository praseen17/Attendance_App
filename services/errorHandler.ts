import { databaseService } from './database';

/**
 * Error types for sync operations
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5 - Comprehensive error handling
 */
export enum SyncErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    SERVER_ERROR = 'SERVER_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    CONFLICT_ERROR = 'CONFLICT_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface SyncError {
    id?: string;
    recordId: number;
    error: string;
    errorType: SyncErrorType;
    retryCount: number;
    timestamp: Date;
    lastRetryAt?: Date;
    nextRetryAt?: Date;
    isRetryable: boolean;
    metadata?: Record<string, any>;
}

export interface ErrorLogEntry {
    id?: string;
    timestamp: Date;
    level: 'error' | 'warning' | 'info';
    category: 'sync' | 'database' | 'network' | 'ml' | 'auth';
    message: string;
    details?: Record<string, any>;
    stackTrace?: string;
}

/**
 * Enhanced error handler for sync operations
 * Requirements: 5.1, 5.2, 5.4, 5.5 - Error handling with retry logic and logging
 */
export class SyncErrorHandler {
    private readonly MAX_RETRY_COUNT = 5;
    private readonly BASE_RETRY_DELAY = 1000; // 1 second
    private readonly MAX_RETRY_DELAY = 300000; // 5 minutes
    private readonly RETRY_MULTIPLIER = 2;

    /**
     * Classify error type based on error details
     * Requirements: 5.1 - Error classification for appropriate handling
     */
    classifyError(error: any): SyncErrorType {
        if (!error) return SyncErrorType.UNKNOWN_ERROR;

        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code || error.status;

        // Network-related errors
        if (errorMessage.includes('network') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('timeout') ||
            errorCode === 'NETWORK_ERROR' ||
            !navigator.onLine) {
            return SyncErrorType.NETWORK_ERROR;
        }

        // Authentication errors
        if (errorCode === 401 ||
            errorCode === 403 ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('authentication')) {
            return SyncErrorType.AUTHENTICATION_ERROR;
        }

        // Server errors
        if (errorCode >= 500 && errorCode < 600) {
            return SyncErrorType.SERVER_ERROR;
        }

        // Validation errors
        if (errorCode >= 400 && errorCode < 500 ||
            errorMessage.includes('validation') ||
            errorMessage.includes('invalid')) {
            return SyncErrorType.VALIDATION_ERROR;
        }

        // Conflict errors
        if (errorCode === 409 ||
            errorMessage.includes('conflict') ||
            errorMessage.includes('duplicate')) {
            return SyncErrorType.CONFLICT_ERROR;
        }

        // Database errors
        if (errorMessage.includes('database') ||
            errorMessage.includes('sqlite') ||
            errorMessage.includes('sql')) {
            return SyncErrorType.DATABASE_ERROR;
        }

        // Timeout errors
        if (errorMessage.includes('timeout') ||
            errorCode === 'TIMEOUT') {
            return SyncErrorType.TIMEOUT_ERROR;
        }

        return SyncErrorType.UNKNOWN_ERROR;
    }

    /**
     * Determine if error is retryable
     * Requirements: 5.1 - Retry logic for recoverable errors
     */
    isRetryableError(errorType: SyncErrorType): boolean {
        const retryableErrors = [
            SyncErrorType.NETWORK_ERROR,
            SyncErrorType.SERVER_ERROR,
            SyncErrorType.TIMEOUT_ERROR,
            SyncErrorType.UNKNOWN_ERROR
        ];

        return retryableErrors.includes(errorType);
    }

    /**
     * Calculate next retry delay using exponential backoff
     * Requirements: 5.1 - Exponential backoff retry logic
     */
    calculateRetryDelay(retryCount: number): number {
        const delay = this.BASE_RETRY_DELAY * Math.pow(this.RETRY_MULTIPLIER, retryCount);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        return Math.min(delay + jitter, this.MAX_RETRY_DELAY);
    }

    /**
     * Create sync error from exception
     * Requirements: 5.4 - Comprehensive error logging
     */
    createSyncError(recordId: number, error: any, retryCount: number = 0): SyncError {
        const errorType = this.classifyError(error);
        const isRetryable = this.isRetryableError(errorType);
        const timestamp = new Date();

        let nextRetryAt: Date | undefined;
        if (isRetryable && retryCount < this.MAX_RETRY_COUNT) {
            const retryDelay = this.calculateRetryDelay(retryCount);
            nextRetryAt = new Date(timestamp.getTime() + retryDelay);
        }

        return {
            id: this.generateErrorId(),
            recordId,
            error: error.message || 'Unknown error occurred',
            errorType,
            retryCount,
            timestamp,
            nextRetryAt,
            isRetryable,
            metadata: {
                originalError: error.name || 'Error',
                code: error.code || error.status,
                stack: error.stack
            }
        };
    }

    /**
     * Check if error should be retried
     * Requirements: 5.1 - Retry decision logic
     */
    shouldRetry(syncError: SyncError): boolean {
        return syncError.isRetryable &&
            syncError.retryCount < this.MAX_RETRY_COUNT &&
            (!syncError.nextRetryAt || new Date() >= syncError.nextRetryAt);
    }

    /**
     * Update error for next retry attempt
     * Requirements: 5.1 - Retry count and timing management
     */
    prepareForRetry(syncError: SyncError): SyncError {
        const newRetryCount = syncError.retryCount + 1;
        const retryDelay = this.calculateRetryDelay(newRetryCount);
        const now = new Date();

        return {
            ...syncError,
            retryCount: newRetryCount,
            lastRetryAt: now,
            nextRetryAt: new Date(now.getTime() + retryDelay)
        };
    }

    /**
     * Log error to database
     * Requirements: 5.4 - Comprehensive error logging
     */
    async logError(entry: Omit<ErrorLogEntry, 'id' | 'timestamp'>): Promise<void> {
        try {
            const logEntry: ErrorLogEntry = {
                id: this.generateErrorId(),
                timestamp: new Date(),
                ...entry
            };

            // Store error log in sync metadata as JSON
            const errorLogs = await this.getErrorLogs();
            errorLogs.push(logEntry);

            // Keep only last 100 error logs to prevent database bloat
            const recentLogs = errorLogs.slice(-100);

            await databaseService.setSyncMetadata('errorLogs', JSON.stringify(recentLogs));
        } catch (error) {
            console.error('Failed to log error to database:', error);
        }
    }

    /**
     * Get error logs from database
     * Requirements: 5.4 - Error log retrieval
     */
    async getErrorLogs(): Promise<ErrorLogEntry[]> {
        try {
            const logsJson = await databaseService.getSyncMetadata('errorLogs');
            return logsJson ? JSON.parse(logsJson) : [];
        } catch (error) {
            console.error('Failed to get error logs:', error);
            return [];
        }
    }

    /**
     * Clear old error logs
     * Requirements: 5.4 - Error log maintenance
     */
    async clearOldErrorLogs(daysToKeep: number = 7): Promise<void> {
        try {
            const errorLogs = await this.getErrorLogs();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const recentLogs = errorLogs.filter(log =>
                new Date(log.timestamp) > cutoffDate
            );

            await databaseService.setSyncMetadata('errorLogs', JSON.stringify(recentLogs));
        } catch (error) {
            console.error('Failed to clear old error logs:', error);
        }
    }

    /**
     * Get user-friendly error message
     * Requirements: 5.5 - User-friendly error messages
     */
    getUserFriendlyMessage(syncError: SyncError): string {
        switch (syncError.errorType) {
            case SyncErrorType.NETWORK_ERROR:
                return 'Network connection issue. Please check your internet connection and try again.';

            case SyncErrorType.SERVER_ERROR:
                return 'Server is temporarily unavailable. The system will retry automatically.';

            case SyncErrorType.AUTHENTICATION_ERROR:
                return 'Authentication failed. Please log in again.';

            case SyncErrorType.VALIDATION_ERROR:
                return 'Invalid data detected. Please check your attendance records.';

            case SyncErrorType.CONFLICT_ERROR:
                return 'Data conflict detected. The system will resolve this automatically.';

            case SyncErrorType.DATABASE_ERROR:
                return 'Local database error. Please restart the app if the problem persists.';

            case SyncErrorType.TIMEOUT_ERROR:
                return 'Request timed out. The system will retry automatically.';

            default:
                return 'An unexpected error occurred. The system will retry automatically.';
        }
    }

    /**
     * Get suggested user actions
     * Requirements: 5.5 - Suggested user actions for errors
     */
    getSuggestedActions(syncError: SyncError): string[] {
        const actions: string[] = [];

        switch (syncError.errorType) {
            case SyncErrorType.NETWORK_ERROR:
                actions.push('Check your internet connection');
                actions.push('Move to an area with better signal');
                actions.push('Try connecting to Wi-Fi');
                break;

            case SyncErrorType.AUTHENTICATION_ERROR:
                actions.push('Log out and log in again');
                actions.push('Check your credentials');
                break;

            case SyncErrorType.DATABASE_ERROR:
                actions.push('Restart the application');
                actions.push('Clear app cache if problem persists');
                break;

            case SyncErrorType.SERVER_ERROR:
            case SyncErrorType.TIMEOUT_ERROR:
                actions.push('Wait a few minutes and try again');
                actions.push('The system will retry automatically');
                break;

            default:
                actions.push('Wait for automatic retry');
                actions.push('Contact support if problem persists');
        }

        return actions;
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const syncErrorHandler = new SyncErrorHandler();