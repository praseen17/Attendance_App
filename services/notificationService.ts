import { EventEmitter } from 'events';
import { SyncError, syncErrorHandler } from './errorHandler';
import { SyncResult } from './syncService';

/**
 * Notification types for user feedback
 * Requirements: 5.5 - User notifications for sync operations
 */
export enum NotificationType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    SYNC_PROGRESS = 'sync_progress',
    NETWORK_STATUS = 'network_status'
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: Date;
    duration?: number; // Auto-dismiss after milliseconds
    actions?: NotificationAction[];
    metadata?: Record<string, any>;
    isRead: boolean;
    isPersistent: boolean;
}

export interface NotificationAction {
    id: string;
    label: string;
    action: () => void;
    style?: 'primary' | 'secondary' | 'danger';
}

export interface SyncProgressNotification {
    totalRecords: number;
    processedRecords: number;
    successfulRecords: number;
    failedRecords: number;
    percentage: number;
    currentOperation: string;
    isComplete: boolean;
}

/**
 * Enhanced notification service for comprehensive user feedback
 * Requirements: 5.5 - Comprehensive error logging and user notifications
 */
export class NotificationService extends EventEmitter {
    private notifications: Map<string, Notification> = new Map();
    private readonly MAX_NOTIFICATIONS = 50;

    /**
     * Show sync error notification with user-friendly message and actions
     * Requirements: 5.5 - User-friendly error messages with suggested actions
     */
    showSyncError(syncError: SyncError, recordCount: number = 1): void {
        const userMessage = syncErrorHandler.getUserFriendlyMessage(syncError);
        const suggestedActions = syncErrorHandler.getSuggestedActions(syncError);

        const actions: NotificationAction[] = [];

        // Add retry action for retryable errors
        if (syncError.isRetryable && syncError.retryCount < 5) {
            actions.push({
                id: 'retry',
                label: 'Retry Now',
                action: () => this.emit('retrySync', syncError),
                style: 'primary'
            });
        }

        // Add view details action
        actions.push({
            id: 'details',
            label: 'View Details',
            action: () => this.emit('showErrorDetails', syncError),
            style: 'secondary'
        });

        const notification: Notification = {
            id: this.generateNotificationId(),
            type: NotificationType.ERROR,
            title: `Sync Failed (${recordCount} record${recordCount > 1 ? 's' : ''})`,
            message: userMessage,
            timestamp: new Date(),
            duration: syncError.isRetryable ? undefined : 10000, // Persistent for retryable errors
            actions,
            metadata: {
                syncError,
                suggestedActions,
                recordCount
            },
            isRead: false,
            isPersistent: syncError.isRetryable
        };

        this.addNotification(notification);

        // Log error for debugging
        syncErrorHandler.logError({
            level: 'error',
            category: 'sync',
            message: `Sync error notification shown: ${syncError.errorType}`,
            details: {
                recordId: syncError.recordId,
                retryCount: syncError.retryCount,
                userMessage
            }
        });
    }

    /**
     * Show sync success notification
     * Requirements: 5.5 - Success confirmations for completed operations
     */
    showSyncSuccess(result: SyncResult): void {
        const title = result.totalRecords === 1
            ? 'Attendance Synced Successfully'
            : `${result.syncedRecords} Records Synced Successfully`;

        let message = `Successfully synced ${result.syncedRecords} attendance record${result.syncedRecords > 1 ? 's' : ''}.`;

        if (result.failedRecords > 0) {
            message += ` ${result.failedRecords} record${result.failedRecords > 1 ? 's' : ''} failed and will be retried automatically.`;
        }

        const notification: Notification = {
            id: this.generateNotificationId(),
            type: NotificationType.SUCCESS,
            title,
            message,
            timestamp: new Date(),
            duration: 5000,
            metadata: { syncResult: result },
            isRead: false,
            isPersistent: false
        };

        this.addNotification(notification);
    }

    /**
     * Show sync progress notification
     * Requirements: 5.5 - Progress indicators with completion percentage
     */
    showSyncProgress(progress: SyncProgressNotification): void {
        const existingProgressNotification = Array.from(this.notifications.values())
            .find(n => n.type === NotificationType.SYNC_PROGRESS && !n.isRead);

        if (existingProgressNotification) {
            // Update existing progress notification
            existingProgressNotification.message = this.formatProgressMessage(progress);
            existingProgressNotification.timestamp = new Date();
            existingProgressNotification.metadata = { progress };

            this.emit('notificationUpdated', existingProgressNotification);
        } else {
            // Create new progress notification
            const notification: Notification = {
                id: this.generateNotificationId(),
                type: NotificationType.SYNC_PROGRESS,
                title: 'Syncing Attendance Records',
                message: this.formatProgressMessage(progress),
                timestamp: new Date(),
                metadata: { progress },
                isRead: false,
                isPersistent: true
            };

            this.addNotification(notification);
        }

        // Auto-dismiss when complete
        if (progress.isComplete) {
            setTimeout(() => {
                this.dismissProgressNotifications();
            }, 2000);
        }
    }

    /**
     * Show network status notification
     * Requirements: 5.5 - Network status indicators
     */
    showNetworkStatus(isOnline: boolean, wasOffline: boolean = false): void {
        if (!isOnline) {
            const notification: Notification = {
                id: this.generateNotificationId(),
                type: NotificationType.WARNING,
                title: 'Offline Mode',
                message: 'No internet connection. Attendance will be saved locally and synced when connection is restored.',
                timestamp: new Date(),
                metadata: { networkStatus: 'offline' },
                isRead: false,
                isPersistent: true
            };

            this.addNotification(notification);
        } else if (wasOffline) {
            // Connection restored
            const notification: Notification = {
                id: this.generateNotificationId(),
                type: NotificationType.SUCCESS,
                title: 'Connection Restored',
                message: 'Internet connection restored. Syncing pending attendance records...',
                timestamp: new Date(),
                duration: 5000,
                metadata: { networkStatus: 'online' },
                isRead: false,
                isPersistent: false
            };

            this.addNotification(notification);

            // Dismiss offline notifications
            this.dismissNotificationsByMetadata({ networkStatus: 'offline' });
        }
    }

    /**
     * Show conflict resolution notification
     * Requirements: 5.3, 5.5 - Conflict resolution user feedback
     */
    showConflictResolution(resolvedCount: number, conflictTypes: string[]): void {
        const title = `${resolvedCount} Conflict${resolvedCount > 1 ? 's' : ''} Resolved`;
        const message = `Automatically resolved ${resolvedCount} data conflict${resolvedCount > 1 ? 's' : ''} during sync. Types: ${conflictTypes.join(', ')}.`;

        const notification: Notification = {
            id: this.generateNotificationId(),
            type: NotificationType.INFO,
            title,
            message,
            timestamp: new Date(),
            duration: 8000,
            actions: [{
                id: 'viewDetails',
                label: 'View Details',
                action: () => this.emit('showConflictDetails'),
                style: 'secondary'
            }],
            metadata: {
                conflictResolution: true,
                resolvedCount,
                conflictTypes
            },
            isRead: false,
            isPersistent: false
        };

        this.addNotification(notification);
    }

    /**
     * Show retry notification
     * Requirements: 5.1, 5.5 - Retry mechanism user feedback
     */
    showRetryNotification(retryCount: number, nextRetryIn: number): void {
        const minutes = Math.ceil(nextRetryIn / 60000);
        const message = `Sync failed. Automatic retry ${retryCount}/5 will occur in ${minutes} minute${minutes > 1 ? 's' : ''}.`;

        const notification: Notification = {
            id: this.generateNotificationId(),
            type: NotificationType.INFO,
            title: 'Sync Retry Scheduled',
            message,
            timestamp: new Date(),
            duration: 10000,
            actions: [{
                id: 'retryNow',
                label: 'Retry Now',
                action: () => this.emit('retryNow'),
                style: 'primary'
            }],
            metadata: {
                retry: true,
                retryCount,
                nextRetryIn
            },
            isRead: false,
            isPersistent: false
        };

        this.addNotification(notification);
    }

    /**
     * Show authentication error notification
     * Requirements: 5.5 - Authentication error handling
     */
    showAuthenticationError(): void {
        const notification: Notification = {
            id: this.generateNotificationId(),
            type: NotificationType.ERROR,
            title: 'Authentication Required',
            message: 'Your session has expired. Please log in again to continue syncing.',
            timestamp: new Date(),
            actions: [{
                id: 'login',
                label: 'Log In',
                action: () => this.emit('showLogin'),
                style: 'primary'
            }],
            metadata: { authError: true },
            isRead: false,
            isPersistent: true
        };

        this.addNotification(notification);
    }

    /**
     * Get all notifications
     */
    getAllNotifications(): Notification[] {
        return Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Get unread notifications
     */
    getUnreadNotifications(): Notification[] {
        return this.getAllNotifications().filter(n => !n.isRead);
    }

    /**
     * Mark notification as read
     */
    markAsRead(notificationId: string): void {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.isRead = true;
            this.emit('notificationUpdated', notification);
        }
    }

    /**
     * Dismiss notification
     */
    dismissNotification(notificationId: string): void {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            this.notifications.delete(notificationId);
            this.emit('notificationDismissed', notification);
        }
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications(): void {
        const count = this.notifications.size;
        this.notifications.clear();
        this.emit('allNotificationsCleared', count);
    }

    /**
     * Clear old notifications (older than specified days)
     */
    clearOldNotifications(daysToKeep: number = 7): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const toRemove: string[] = [];
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.timestamp < cutoffDate && !notification.isPersistent) {
                toRemove.push(id);
            }
        }

        toRemove.forEach(id => this.notifications.delete(id));

        if (toRemove.length > 0) {
            this.emit('oldNotificationsCleared', toRemove.length);
        }
    }

    /**
     * Subscribe to notification events
     */
    onNotificationAdded(callback: (notification: Notification) => void): () => void {
        this.on('notificationAdded', callback);
        return () => this.off('notificationAdded', callback);
    }

    onNotificationUpdated(callback: (notification: Notification) => void): () => void {
        this.on('notificationUpdated', callback);
        return () => this.off('notificationUpdated', callback);
    }

    onNotificationDismissed(callback: (notification: Notification) => void): () => void {
        this.on('notificationDismissed', callback);
        return () => this.off('notificationDismissed', callback);
    }

    /**
     * Add notification to the collection
     */
    private addNotification(notification: Notification): void {
        // Remove oldest notifications if we exceed the limit
        if (this.notifications.size >= this.MAX_NOTIFICATIONS) {
            const oldestId = Array.from(this.notifications.entries())
                .filter(([_, n]) => !n.isPersistent)
                .sort(([_, a], [__, b]) => a.timestamp.getTime() - b.timestamp.getTime())[0]?.[0];

            if (oldestId) {
                this.notifications.delete(oldestId);
            }
        }

        this.notifications.set(notification.id, notification);
        this.emit('notificationAdded', notification);

        // Auto-dismiss if duration is specified
        if (notification.duration) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, notification.duration);
        }
    }

    /**
     * Format progress message
     */
    private formatProgressMessage(progress: SyncProgressNotification): string {
        if (progress.isComplete) {
            return `Sync complete! ${progress.successfulRecords}/${progress.totalRecords} records synced successfully.`;
        }

        const percentage = Math.round(progress.percentage);
        return `${progress.currentOperation} (${percentage}%) - ${progress.processedRecords}/${progress.totalRecords} records processed`;
    }

    /**
     * Dismiss progress notifications
     */
    private dismissProgressNotifications(): void {
        const progressNotifications = Array.from(this.notifications.entries())
            .filter(([_, n]) => n.type === NotificationType.SYNC_PROGRESS);

        progressNotifications.forEach(([id, _]) => {
            this.dismissNotification(id);
        });
    }

    /**
     * Dismiss notifications by metadata criteria
     */
    private dismissNotificationsByMetadata(criteria: Record<string, any>): void {
        const toRemove: string[] = [];

        for (const [id, notification] of this.notifications.entries()) {
            if (notification.metadata) {
                const matches = Object.entries(criteria).every(([key, value]) =>
                    notification.metadata![key] === value
                );

                if (matches) {
                    toRemove.push(id);
                }
            }
        }

        toRemove.forEach(id => this.dismissNotification(id));
    }

    /**
     * Generate unique notification ID
     */
    private generateNotificationId(): string {
        return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const notificationService = new NotificationService();