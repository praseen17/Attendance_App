import { CameraView } from 'expo-camera';
import { authService } from './authService';
import { mlApiService } from './mlApiService';
import { MLResult, MLError } from './faceCapture';

// Camera capture interfaces
export interface CameraConfig {
    captureInterval: number;
    imageQuality: number;
    maxRetries: number;
    autoFocus: boolean;
}

export interface CameraCapture {
    success: boolean;
    base64?: string;
    uri?: string;
    error?: string;
    timestamp: Date;
}

/**
 * Camera service for real-time face capture using CameraView
 * Requirements: 2.1, 2.2 - Real-time face capture for attendance
 */
export class CameraService {
    private config: CameraConfig;
    private isCapturing = false;
    private captureTimer: ReturnType<typeof setInterval> | null = null;
    private cameraRef: CameraView | null = null;

    // Event callbacks
    private onCaptureSuccessCallback: ((result: MLResult) => void) | null = null;
    private onCaptureErrorCallback: ((error: MLError) => void) | null = null;

    constructor(config?: Partial<CameraConfig>) {
        this.config = {
            captureInterval: 3000, // 3 seconds between captures
            imageQuality: 0.7,
            maxRetries: 3,
            autoFocus: true,
            ...config,
        };
    }

    /**
     * Set camera reference for capturing
     * Requirements: 2.1 - Camera reference management
     */
    setCameraRef(cameraRef: CameraView | null): void {
        this.cameraRef = cameraRef;
    }

    /**
     * Start automatic face capture
     * Requirements: 2.1, 2.2 - Automated face capture process
     */
    async startAutoCapture(sectionId: string): Promise<void> {
        if (this.isCapturing) {
            console.warn('Auto capture already in progress');
            return;
        }

        if (!this.cameraRef) {
            throw new Error('Camera reference not set');
        }

        this.isCapturing = true;
        console.log('Starting auto face capture for section:', sectionId);

        // Start capture loop
        this.captureTimer = setInterval(async () => {
            if (!this.isCapturing || !this.cameraRef) {
                return;
            }

            try {
                await this.performCapture(sectionId);
            } catch (error) {
                console.error('Auto capture error:', error);

                if (this.onCaptureErrorCallback) {
                    this.onCaptureErrorCallback({
                        type: 'RECOGNITION_FAILED',
                        message: error instanceof Error ? error.message : 'Auto capture failed',
                        timestamp: new Date(),
                    });
                }
            }
        }, this.config.captureInterval);
    }

    /**
     * Stop automatic face capture
     * Requirements: 2.1 - Stop automated capture process
     */
    stopAutoCapture(): void {
        this.isCapturing = false;

        if (this.captureTimer) {
            clearInterval(this.captureTimer);
            this.captureTimer = null;
        }

        console.log('Auto face capture stopped');
    }

    /**
     * Capture single image from camera
     * Requirements: 2.2 - Manual face capture
     */
    async captureSingleImage(sectionId: string): Promise<MLResult> {
        if (!this.cameraRef) {
            throw new Error('Camera reference not set');
        }

        try {
            const result = await this.performCapture(sectionId);
            return result;
        } catch (error) {
            console.error('Single capture error:', error);

            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: error instanceof Error ? error.message : 'Single capture failed',
                timestamp: new Date(),
            };

            if (this.onCaptureErrorCallback) {
                this.onCaptureErrorCallback(mlError);
            }

            throw mlError;
        }
    }

    /**
     * Perform actual image capture and processing
     * Requirements: 2.2, 2.3 - Face capture and ML processing
     */
    private async performCapture(sectionId: string): Promise<MLResult> {
        if (!this.cameraRef) {
            throw new Error('Camera reference not available');
        }

        try {
            // Capture image from camera
            const photo = await this.cameraRef.takePictureAsync({
                quality: this.config.imageQuality,
                base64: true,
                skipProcessing: false,
            });

            if (!photo || !photo.base64) {
                throw new Error('Failed to capture image or get base64 data');
            }

            // Get current user profile for faculty ID
            const userProfile = await authService.getUserProfile();
            if (!userProfile) {
                throw new Error('User profile not available');
            }

            // Send to ML model via HTTP API
            const apiResult = await mlApiService.analyzeFace({
                imageData: photo.base64,
                sectionId,
                facultyId: userProfile.id,
            });

            const result: MLResult = {
                success: apiResult.success,
                studentId: apiResult.studentId,
                confidence: apiResult.confidence,
                error: apiResult.error,
                timestamp: apiResult.timestamp || new Date(),
            };

            // Trigger success callback if recognition was successful
            if (result.success && result.studentId && this.onCaptureSuccessCallback) {
                this.onCaptureSuccessCallback(result);
            }

            return result;

        } catch (error) {
            console.error('Capture performance error:', error);
            throw error;
        }
    }

    /**
     * Set callback for successful face capture
     * Requirements: 2.3 - Success event handling
     */
    onCaptureSuccess(callback: (result: MLResult) => void): void {
        this.onCaptureSuccessCallback = callback;
    }

    /**
     * Set callback for capture errors
     * Requirements: 2.4, 2.5 - Error event handling
     */
    onCaptureError(callback: (error: MLError) => void): void {
        this.onCaptureErrorCallback = callback;
    }

    /**
     * Check if auto capture is active
     * Requirements: 2.1 - Capture status checking
     */
    isAutoCaptureActive(): boolean {
        return this.isCapturing;
    }

    /**
     * Update capture configuration
     * Requirements: 2.1 - Configuration management
     */
    updateConfig(newConfig: Partial<CameraConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // If capture interval changed and capturing is active, restart timer
        if (this.isCapturing && newConfig.captureInterval && this.captureTimer) {
            this.stopAutoCapture();
            // Note: Need to restart with section ID, but we don't have it here
            // This would need to be handled by the calling component
        }
    }

    /**
     * Get current configuration
     * Requirements: 2.1 - Configuration retrieval
     */
    getConfig(): CameraConfig {
        return { ...this.config };
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.stopAutoCapture();
        this.cameraRef = null;
        this.onCaptureSuccessCallback = null;
        this.onCaptureErrorCallback = null;
    }
}

// Export singleton instance
export const cameraService = new CameraService();