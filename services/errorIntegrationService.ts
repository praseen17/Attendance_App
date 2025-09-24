import {
    comprehensiveErrorHandler,
    ComprehensiveError,
    ErrorCategory,
    SecurityEvent
} from './comprehensiveErrorHandler';
import { databaseService } from './database';
import { mlWebSocketService } from './mlWebSocketService';
import { authService } from './authService';
import { syncService } from './syncService';

/**
 * Error Integration Service - Integrates comprehensive error handling across all services
 * Requirements: 2.4, 2.5, 3.4, 3.5, 6.5, 8.3
 */

export interface ErrorNotification {
    id: string;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
    actions?: Array<{
        label: string;
        action: () => void;
        primary?: boolean;
    }>;
    duration?: number;
    persistent?: boolean;
}

export interface ErrorStats {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ComprehensiveError[];
    securityEvents: SecurityEvent[];
    recoverySuccessRate: number;
}

export class ErrorIntegrationService {
    private errorNotificationCallbacks: ((notification: ErrorNotification) => void)[] = [];
    private errorStatsCallbacks: ((stats: ErrorStats) => void)[] = [];
    private isInitialized = false;

    /**
     * Initialize error integration across all services
     * Requirements: 2.4, 2.5, 3.4, 3.5, 6.5, 8.3
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Set up error handlers for each category
            this.setupMLErrorHandling();
            this.setupDatabaseErrorHandling();
            this.setupAuthErrorHandling();
            this.setupSyncErrorHandling();
            this.setupSecurityEventHandling();

            // Initialize database error recovery
            await this.initializeDatabaseErrorRecovery();

            this.isInitialized = true;
            console.log('Error integration service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize error integration service:', error);
            throw error;
        }
    }

    /**
     * Set up ML model error handling integration
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    private setupMLErrorHandling(): void {
        comprehensiveErrorHandler.onError(ErrorCategory.ML_MODEL, (error: ComprehensiveError) => {
            this.handleMLError(error);
        });
    }

    /**
     * Set up database error handling integration
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private setupDatabaseErrorHandling(): void {
        comprehensiveErrorHandler.onError(ErrorCategory.DATABASE, (error: ComprehensiveError) => {
            this.handleDatabaseError(error);
        });

        // Wrap database service methods with error handling
        this.wrapDatabaseServiceMethods();
    }

    /**
     * Set up authentication error handling
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private setupAuthErrorHandling(): void {
        comprehensiveErrorHandler.onError(ErrorCategory.AUTHENTICATION, (error: ComprehensiveError) => {
            this.handleAuthError(error);
        });
    }

    /**
     * Set up sync error handling integration
     * Requirements: 3.4, 3.5 - Sync operation error handling
     */
    private setupSyncErrorHandling(): void {
        comprehensiveErrorHandler.onError(ErrorCategory.SYNC, (error: ComprehensiveError) => {
            this.handleSyncError(error);
        });
    }

    /**
     * Set up security event handling
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private setupSecurityEventHandling(): void {
        comprehensiveErrorHandler.onSecurityEvent((event: SecurityEvent) => {
            this.handleSecurityEvent(event);
        });
    }

    /**
     * Initialize database error recovery mechanisms
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private async initializeDatabaseErrorRecovery(): Promise<void> {
        try {
            // Check database health on startup
            const isHealthy = await this.checkDatabaseHealth();
            if (!isHealthy) {
                console.warn('Database health check failed, attempting recovery...');
                await this.recoverDatabase();
            }
        } catch (error) {
            console.error('Database error recovery initialization failed:', error);
            // Don't throw here, allow app to continue with degraded functionality
        }
    }

    /**
     * Wrap database service methods with comprehensive error handling
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private wrapDatabaseServiceMethods(): void {
        const originalMethods = {
            insertAttendance: databaseService.insertAttendance.bind(databaseService),
            updateAttendance: databaseService.updateAttendance.bind(databaseService),
            getAttendanceRecords: databaseService.getAttendanceRecords.bind(databaseService),
            deleteAttendance: databaseService.deleteAttendance.bind(databaseService)
        };

        // Wrap insertAttendance
        databaseService.insertAttendance = async (record: any) => {
            try {
                return await originalMethods.insertAttendance(record);
            } catch (error) {
                const comprehensiveError = await comprehensiveErrorHandler.handleDatabaseError(
                    'insert',
                    error,
                    { operation: 'insertAttendance', record }
                );
                throw comprehensiveError;
            }
        };

        // Wrap updateAttendance
        databaseService.updateAttendance = async (id: number, updates: any) => {
            try {
                return await originalMethods.updateAttendance(id, updates);
            } catch (error) {
                const comprehensiveError = await comprehensiveErrorHandler.handleDatabaseError(
                    'update',
                    error,
                    { operation: 'updateAttendance', id, updates }
                );
                throw comprehensiveError;
            }
        };

        // Wrap getAttendanceRecords
        databaseService.getAttendanceRecords = async (filters?: any) => {
            try {
                return await originalMethods.getAttendanceRecords(filters);
            } catch (error) {
                const comprehensiveError = await comprehensiveErrorHandler.handleDatabaseError(
                    'select',
                    error,
                    { operation: 'getAttendanceRecords', filters }
                );
                throw comprehensiveError;
            }
        };

        // Wrap deleteAttendance
        databaseService.deleteAttendance = async (id: number) => {
            try {
                return await originalMethods.deleteAttendance(id);
            } catch (error) {
                const comprehensiveError = await comprehensiveErrorHandler.handleDatabaseError(
                    'delete',
                    error,
                    { operation: 'deleteAttendance', id }
                );
                throw comprehensiveError;
            }
        };
    }

    /**
     * Handle ML model errors with user notifications
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    private handleMLError(error: ComprehensiveError): void {
        const notification: ErrorNotification = {
            id: error.id,
            title: 'Face Recognition Issue',
            message: error.userMessage,
            type: error.severity === 'CRITICAL' || error.severity === 'HIGH' ? 'error' : 'warning',
            actions: this.getMLErrorActions(error),
            duration: error.requiresUserAction ? undefined : 5000,
            persistent: error.requiresUserAction
        };

        this.notifyError(notification);
    }

    /**
     * Handle database errors with user notifications
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private handleDatabaseError(error: ComprehensiveError): void {
        const notification: ErrorNotification = {
            id: error.id,
            title: 'Data Storage Issue',
            message: error.userMessage,
            type: error.severity === 'CRITICAL' ? 'error' : 'warning',
            actions: this.getDatabaseErrorActions(error),
            duration: error.isRecoverable ? 3000 : undefined,
            persistent: !error.isRecoverable
        };

        this.notifyError(notification);
    }

    /**
     * Handle authentication errors with user notifications
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private handleAuthError(error: ComprehensiveError): void {
        const notification: ErrorNotification = {
            id: error.id,
            title: 'Authentication Issue',
            message: error.userMessage,
            type: 'error',
            actions: this.getAuthErrorActions(error),
            persistent: true
        };

        this.notifyError(notification);
    }

    /**
     * Handle sync errors with user notifications
     * Requirements: 3.4, 3.5 - Sync operation error handling
     */
    private handleSyncError(error: ComprehensiveError): void {
        const notification: ErrorNotification = {
            id: error.id,
            title: 'Sync Issue',
            message: error.userMessage,
            type: error.severity === 'HIGH' || error.severity === 'CRITICAL' ? 'error' : 'warning',
            actions: this.getSyncErrorActions(error),
            duration: error.isRecoverable ? 5000 : undefined,
            persistent: !error.isRecoverable
        };

        this.notifyError(notification);
    }

    /**
     * Handle security events with immediate user notifications
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private handleSecurityEvent(event: SecurityEvent): void {
        const notification: ErrorNotification = {
            id: event.id,
            title: 'Security Alert',
            message: this.getSecurityEventMessage(event),
            type: 'error',
            actions: this.getSecurityEventActions(event),
            persistent: true
        };

        this.notifyError(notification);
    }

    /**
     * Get ML error action buttons
     * Requirements: 2.4, 2.5 - ML model error handling with fallback options
     */
    private getMLErrorActions(error: ComprehensiveError): ErrorNotification['actions'] {
        const actions: ErrorNotification['actions'] = [];

        if (error.code === 'ML_CONNECTION_LOST') {
            actions.push({
                label: 'Retry Connection',
                action: () => mlWebSocketService.reconnect(),
                primary: true
            });
            actions.push({
                label: 'Use Manual Entry',
                action: () => this.enableManualFallback()
            });
        } else if (error.code === 'ML_RECOGNITION_FAILED') {
            actions.push({
                label: 'Try Again',
                action: () => this.retryFaceRecognition(),
                primary: true
            });
            actions.push({
                label: 'Manual Entry',
                action: () => this.enableManualFallback()
            });
        } else if (error.code === 'ML_LOW_CONFIDENCE') {
            actions.push({
                label: 'Verify Manually',
                action: () => this.showManualVerification(),
                primary: true
            });
            actions.push({
                label: 'Try Again',
                action: () => this.retryFaceRecognition()
            });
        }

        return actions;
    }

    /**
     * Get database error action buttons
     * Requirements: 3.4, 3.5 - Database operation error handling and recovery
     */
    private getDatabaseErrorActions(error: ComprehensiveError): ErrorNotification['actions'] {
        const actions: ErrorNotification['actions'] = [];

        if (error.isRecoverable) {
            actions.push({
                label: 'Retry',
                action: () => this.retryDatabaseOperation(error),
                primary: true
            });
        }

        if (error.code === 'DB_INIT_ERROR') {
            actions.push({
                label: 'Restart App',
                action: () => this.restartApp(),
                primary: true
            });
        }

        actions.push({
            label: 'Contact Support',
            action: () => this.contactSupport(error)
        });

        return actions;
    }

    /**
     * Get authentication error action buttons
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private getAuthErrorActions(error: ComprehensiveError): ErrorNotification['actions'] {
        return [
            {
                label: 'Login Again',
                action: () => authService.logout(),
                primary: true
            },
            {
                label: 'Contact Admin',
                action: () => this.contactSupport(error)
            }
        ];
    }

    /**
     * Get sync error action buttons
     * Requirements: 3.4, 3.5 - Sync operation error handling
     */
    private getSyncErrorActions(error: ComprehensiveError): ErrorNotification['actions'] {
        const actions: ErrorNotification['actions'] = [];

        if (error.isRecoverable) {
            actions.push({
                label: 'Retry Sync',
                action: () => syncService.syncPendingRecords(),
                primary: true
            });
        }

        actions.push({
            label: 'View Details',
            action: () => this.showErrorDetails(error)
        });

        return actions;
    }

    /**
     * Get security event action buttons
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private getSecurityEventActions(event: SecurityEvent): ErrorNotification['actions'] {
        const actions: ErrorNotification['actions'] = [
            {
                label: 'Secure Account',
                action: () => this.secureAccount(),
                primary: true
            }
        ];

        if (event.type === 'UNAUTHORIZED_ACCESS' || event.type === 'INVALID_TOKEN') {
            actions.push({
                label: 'Login Again',
                action: () => authService.logout()
            });
        }

        return actions;
    }

    /**
     * Get security event user message
     * Requirements: 6.5 - Security event logging for unauthorized access attempts
     */
    private getSecurityEventMessage(event: SecurityEvent): string {
        const messageMap: Record<SecurityEvent['type'], string> = {
            'UNAUTHORIZED_ACCESS': 'Unauthorized access attempt detected. Your account has been secured.',
            'INVALID_TOKEN': 'Your session has expired for security reasons. Please log in again.',
            'SUSPICIOUS_ACTIVITY': 'Suspicious activity detected on your account. Please verify your identity.',
            'DATA_BREACH_ATTEMPT': 'Security threat detected. Your account has been temporarily locked.'
        };

        return messageMap[event.type] || 'Security event detected. Please take immediate action.';
    }

    /**
     * Check database health
     * Requirements: 3.4, 3.5 - Database health monitoring
     */
    private async checkDatabaseHealth(): Promise<boolean> {
        try {
            // Try a simple database operation
            await databaseService.getSyncMetadata('health_check');
            return true;
        } catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Recover database from errors
     * Requirements: 3.4, 3.5 - Database recovery mechanisms
     */
    private async recoverDatabase(): Promise<void> {
        try {
            console.log('Attempting database recovery...');

            // Close and reinitialize database
            await databaseService.closeDatabase();
            await databaseService.initializeDatabase();

            console.log('Database recovery completed successfully');
        } catch (error) {
            console.error('Database recovery failed:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive error statistics
     * Requirements: 8.3 - Error statistics and monitoring
     */
    async getErrorStats(): Promise<ErrorStats> {
        const errorHistory = comprehensiveErrorHandler.getErrorHistory();
        const securityEvents = comprehensiveErrorHandler.getSecurityEvents();

        const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
            acc[category] = errorHistory.filter(error => error.category === category).length;
            return acc;
        }, {} as Record<ErrorCategory, number>);

        const errorsBySeverity = errorHistory.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const recoverySuccessRate = this.calculateRecoverySuccessRate(errorHistory);

        return {
            totalErrors: errorHistory.length,
            errorsByCategory,
            errorsBySeverity,
            recentErrors: errorHistory.slice(-10),
            securityEvents: securityEvents.slice(-5),
            recoverySuccessRate
        };
    }

    /**
     * Calculate recovery success rate
     */
    private calculateRecoverySuccessRate(errors: ComprehensiveError[]): number {
        const recoverableErrors = errors.filter(error => error.isRecoverable);
        if (recoverableErrors.length === 0) return 100;

        // This is a simplified calculation - in a real implementation,
        // you would track actual recovery outcomes
        const successfulRecoveries = recoverableErrors.filter(error =>
            !error.requiresUserAction
        ).length;

        return Math.round((successfulRecoveries / recoverableErrors.length) * 100);
    }

    // Action implementations
    private async enableManualFallback(): Promise<void> {
        await databaseService.setSyncMetadata('mlFallbackMode', 'true');
        console.log('Manual fallback mode enabled');
    }

    private async retryFaceRecognition(): Promise<void> {
        // This would trigger a new face recognition attempt
        console.log('Retrying face recognition...');
    }

    private async showManualVerification(): Promise<void> {
        await databaseService.setSyncMetadata('showManualVerification', 'true');
        console.log('Manual verification requested');
    }

    private async retryDatabaseOperation(error: ComprehensiveError): Promise<void> {
        console.log('Retrying database operation for error:', error.id);
        // Implementation would depend on the specific operation
    }

    private async restartApp(): Promise<void> {
        console.log('App restart requested');
        // In React Native, this would typically reload the app
    }

    private async contactSupport(error: ComprehensiveError): Promise<void> {
        console.log('Contact support requested for error:', error.id);
        // This would open support contact interface
    }

    private async showErrorDetails(error: ComprehensiveError): Promise<void> {
        console.log('Show error details for:', error.id);
        // This would open error details modal
    }

    private async secureAccount(): Promise<void> {
        console.log('Securing account...');
        await authService.logout();
        await databaseService.setSyncMetadata('accountSecured', 'true');
    }

    // Public API methods
    public onErrorNotification(callback: (notification: ErrorNotification) => void): void {
        this.errorNotificationCallbacks.push(callback);
    }

    public onErrorStats(callback: (stats: ErrorStats) => void): void {
        this.errorStatsCallbacks.push(callback);
    }

    public async clearAllErrors(): Promise<void> {
        await comprehensiveErrorHandler.clearErrorHistory();
        await comprehensiveErrorHandler.clearSecurityEvents();
    }

    private notifyError(notification: ErrorNotification): void {
        this.errorNotificationCallbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                console.error('Error in error notification callback:', error);
            }
        });
    }

    private notifyStats(stats: ErrorStats): void {
        this.errorStatsCallbacks.forEach(callback => {
            try {
                callback(stats);
            } catch (error) {
                console.error('Error in error stats callback:', error);
            }
        });
    }
}

// Export singleton instance
export const errorIntegrationService = new ErrorIntegrationService();