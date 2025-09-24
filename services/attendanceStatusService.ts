import { EventEmitter } from 'events';

// Status types for attendance operations
export type AttendanceStatusType =
    | 'idle'
    | 'connecting'
    | 'capturing'
    | 'processing'
    | 'success'
    | 'error'
    | 'syncing'
    | 'synced'
    | 'offline';

export interface AttendanceStatus {
    type: AttendanceStatusType;
    message: string;
    details?: string;
    timestamp: Date;
    progress?: number; // 0-100 for progress indicators
    studentId?: string;
    studentName?: string;
}

export interface StatusIndicatorConfig {
    showProgress: boolean;
    autoHideSuccess: boolean;
    autoHideDelay: number;
    persistErrors: boolean;
}

/**
 * Service for managing attendance status indicators and user feedback
 * Requirements: 8.1, 8.4 - Real-time status indicators and user feedback
 */
export class AttendanceStatusService extends EventEmitter {
    private currentStatus: AttendanceStatus;
    private statusHistory: AttendanceStatus[] = [];
    private config: StatusIndicatorConfig;
    private autoHideTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(config?: Partial<StatusIndicatorConfig>) {
        super();

        this.config = {
            showProgress: true,
            autoHideSuccess: true,
            autoHideDelay: 3000,
            persistErrors: true,
            ...config,
        };

        this.currentStatus = {
            type: 'idle',
            message: 'Ready',
            timestamp: new Date(),
        };
    }

    /**
     * Update the current status
     * Requirements: 8.1 - Real-time status indicators
     */
    updateStatus(
        type: AttendanceStatusType,
        message: string,
        details?: string,
        progress?: number,
        studentId?: string,
        studentName?: string
    ): void {
        // Clear any existing auto-hide timer
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }

        const newStatus: AttendanceStatus = {
            type,
            message,
            details,
            timestamp: new Date(),
            progress,
            studentId,
            studentName,
        };

        this.currentStatus = newStatus;
        this.statusHistory.unshift(newStatus);

        // Keep only last 50 status updates
        if (this.statusHistory.length > 50) {
            this.statusHistory = this.statusHistory.slice(0, 50);
        }

        // Emit status change event
        this.emit('statusChanged', newStatus);

        // Auto-hide success messages if configured
        if (this.config.autoHideSuccess && type === 'success') {
            this.autoHideTimer = setTimeout(() => {
                this.updateStatus('idle', 'Ready');
            }, this.config.autoHideDelay);
        }

        console.log(`[AttendanceStatus] ${type.toUpperCase()}: ${message}${details ? ` - ${details}` : ''}`);
    }

    /**
     * Set status to idle
     * Requirements: 8.1 - Status management
     */
    setIdle(message: string = 'Ready'): void {
        this.updateStatus('idle', message);
    }

    /**
     * Set status to connecting
     * Requirements: 8.1 - Connection status indicators
     */
    setConnecting(message: string = 'Connecting...', details?: string): void {
        this.updateStatus('connecting', message, details);
    }

    /**
     * Set status to capturing
     * Requirements: 8.1 - Capture status indicators
     */
    setCapturing(message: string = 'Capturing attendance...', details?: string, progress?: number): void {
        this.updateStatus('capturing', message, details, progress);
    }

    /**
     * Set status to processing
     * Requirements: 8.1 - Processing status indicators
     */
    setProcessing(message: string = 'Processing...', details?: string, progress?: number): void {
        this.updateStatus('processing', message, details, progress);
    }

    /**
     * Set status to success
     * Requirements: 8.1, 8.4 - Success confirmations
     */
    setSuccess(
        message: string,
        details?: string,
        studentId?: string,
        studentName?: string
    ): void {
        this.updateStatus('success', message, details, undefined, studentId, studentName);
    }

    /**
     * Set status to error
     * Requirements: 8.3 - Error messages and suggested actions
     */
    setError(message: string, details?: string, suggestedAction?: string): void {
        const errorDetails = details && suggestedAction
            ? `${details} - ${suggestedAction}`
            : details || suggestedAction;

        this.updateStatus('error', message, errorDetails);
    }

    /**
     * Set status to syncing
     * Requirements: 8.2 - Sync progress indicators
     */
    setSyncing(message: string = 'Syncing...', progress?: number, details?: string): void {
        this.updateStatus('syncing', message, details, progress);
    }

    /**
     * Set status to synced
     * Requirements: 8.2 - Sync completion confirmation
     */
    setSynced(message: string = 'Sync completed', details?: string): void {
        this.updateStatus('synced', message, details);
    }

    /**
     * Set status to offline
     * Requirements: 8.5 - Offline mode status display
     */
    setOffline(message: string = 'Offline mode', details?: string): void {
        this.updateStatus('offline', message, details);
    }

    /**
     * Update capture progress
     * Requirements: 8.1 - Real-time progress tracking
     */
    updateCaptureProgress(presentCount: number, totalCount: number, studentName?: string): void {
        const progress = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;
        const message = studentName
            ? `✓ ${studentName} marked present`
            : 'Capturing attendance...';
        const details = `${presentCount}/${totalCount} students (${progress.toFixed(0)}%)`;

        this.setCapturing(message, details, progress);
    }

    /**
     * Update sync progress
     * Requirements: 8.2 - Sync progress indicators with completion percentage
     */
    updateSyncProgress(syncedCount: number, totalCount: number, currentRecord?: string): void {
        const progress = totalCount > 0 ? (syncedCount / totalCount) * 100 : 0;
        const message = currentRecord
            ? `Syncing ${currentRecord}...`
            : 'Syncing attendance records...';
        const details = `${syncedCount}/${totalCount} records (${progress.toFixed(0)}%)`;

        this.setSyncing(message, progress, details);
    }

    /**
     * Report face recognition success
     * Requirements: 8.1, 8.4 - Face recognition feedback
     */
    reportFaceRecognitionSuccess(
        studentName: string,
        confidence: number,
        presentCount: number,
        totalCount: number
    ): void {
        const message = `✓ ${studentName} recognized`;
        const details = `Confidence: ${(confidence * 100).toFixed(0)}% | ${presentCount}/${totalCount}`;

        this.setSuccess(message, details, undefined, studentName);
    }

    /**
     * Report face recognition error
     * Requirements: 8.3 - Face recognition error handling
     */
    reportFaceRecognitionError(error: string, suggestedAction?: string): void {
        const suggestions = suggestedAction || this.getFaceRecognitionSuggestion(error);
        this.setError('Face recognition failed', `${error} - ${suggestions}`);
    }

    /**
     * Report manual entry success
     * Requirements: 8.1, 8.4 - Manual entry feedback
     */
    reportManualEntrySuccess(
        studentName: string,
        status: 'present' | 'absent',
        presentCount: number,
        totalCount: number
    ): void {
        const message = `✓ ${studentName} marked ${status} (manual)`;
        const details = `${presentCount}/${totalCount} students`;

        this.setSuccess(message, details, undefined, studentName);
    }

    /**
     * Report sync error with retry information
     * Requirements: 8.2, 8.3 - Sync error handling
     */
    reportSyncError(error: string, retryCount: number, maxRetries: number): void {
        const details = retryCount < maxRetries
            ? `Retry ${retryCount}/${maxRetries} - Will retry automatically`
            : 'Max retries reached - Check connection and try manual sync';

        this.setError('Sync failed', `${error} - ${details}`);
    }

    /**
     * Report network connectivity status
     * Requirements: 8.5 - Network status indicators
     */
    reportNetworkStatus(isOnline: boolean, details?: string): void {
        if (isOnline) {
            this.setSuccess('Online', details || 'Network connection restored');
        } else {
            this.setOffline('Offline', details || 'No network connection - Working offline');
        }
    }

    /**
     * Get current status
     * Requirements: 8.1 - Status retrieval
     */
    getCurrentStatus(): AttendanceStatus {
        return { ...this.currentStatus };
    }

    /**
     * Get status history
     * Requirements: 8.1 - Status history tracking
     */
    getStatusHistory(limit: number = 10): AttendanceStatus[] {
        return this.statusHistory.slice(0, limit).map(status => ({ ...status }));
    }

    /**
     * Get status color for UI indicators
     * Requirements: 8.1 - Visual status indicators
     */
    getStatusColor(type: AttendanceStatusType): string {
        switch (type) {
            case 'success':
            case 'synced':
                return '#10b981'; // Green
            case 'error':
                return '#ef4444'; // Red
            case 'capturing':
            case 'processing':
                return '#3b82f6'; // Blue
            case 'connecting':
            case 'syncing':
                return '#f59e0b'; // Amber
            case 'offline':
                return '#6b7280'; // Gray
            case 'idle':
            default:
                return '#6b7280'; // Gray
        }
    }

    /**
     * Get status icon for UI indicators
     * Requirements: 8.1 - Visual status indicators
     */
    getStatusIcon(type: AttendanceStatusType): string {
        switch (type) {
            case 'success':
            case 'synced':
                return '✓';
            case 'error':
                return '✗';
            case 'capturing':
                return '📷';
            case 'processing':
                return '⚡';
            case 'connecting':
            case 'syncing':
                return '🔄';
            case 'offline':
                return '📴';
            case 'idle':
            default:
                return '●';
        }
    }

    /**
     * Check if current status requires user attention
     * Requirements: 8.3 - Error attention management
     */
    requiresAttention(): boolean {
        return this.currentStatus.type === 'error' ||
            (this.currentStatus.type === 'offline' && this.config.persistErrors);
    }

    /**
     * Clear status history
     * Requirements: 8.1 - Status management
     */
    clearHistory(): void {
        this.statusHistory = [];
        this.emit('historyCleared');
    }

    /**
     * Subscribe to status changes
     * Requirements: 8.1 - Real-time status updates
     */
    onStatusChange(callback: (status: AttendanceStatus) => void): () => void {
        this.on('statusChanged', callback);

        // Return unsubscribe function
        return () => {
            this.off('statusChanged', callback);
        };
    }

    /**
     * Get face recognition error suggestions
     * Requirements: 8.3 - Suggested actions for errors
     */
    private getFaceRecognitionSuggestion(error: string): string {
        const errorLower = error.toLowerCase();

        if (errorLower.includes('lighting') || errorLower.includes('dark')) {
            return 'Ensure good lighting conditions';
        } else if (errorLower.includes('face') || errorLower.includes('detection')) {
            return 'Position face clearly in frame';
        } else if (errorLower.includes('connection') || errorLower.includes('network')) {
            return 'Check network connection or use manual entry';
        } else if (errorLower.includes('confidence') || errorLower.includes('low')) {
            return 'Try again or use manual entry';
        } else {
            return 'Try manual entry as fallback';
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.autoHideTimer) {
            clearTimeout(this.autoHideTimer);
            this.autoHideTimer = null;
        }

        this.removeAllListeners();
        this.statusHistory = [];
    }
}

// Export singleton instance
export const attendanceStatusService = new AttendanceStatusService();