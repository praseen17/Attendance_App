import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { authService } from './authService';
import { mlApiService } from './mlApiService';

// Face capture interfaces
export interface CaptureOptions {
    sectionId: string;
    quality?: number;
    base64?: boolean;
    allowsEditing?: boolean;
    aspect?: [number, number];
}

export interface CaptureResult {
    success: boolean;
    imageUri?: string;
    base64?: string;
    error?: string;
}

export interface FaceCaptureConfig {
    autoCapture: boolean;
    captureInterval: number;
    maxRetries: number;
    fallbackToManual: boolean;
}

// ML types used by UI
export interface MLResult {
    success: boolean;
    studentId?: string;
    confidence?: number;
    timestamp?: Date;
    error?: string;
}

export type MLErrorType =
    | 'CONNECTION_LOST'
    | 'LOW_CONFIDENCE'
    | 'TIMEOUT'
    | 'RECOGNITION_FAILED'
    | 'INVALID_DATA'
    | 'UNKNOWN';

export interface MLError {
    type: MLErrorType;
    message: string;
    timestamp?: Date;
}

/**
 * Face capture service for ML-based attendance
 * Requirements: 2.1, 2.2, 2.3 - Face data capture and transmission
 */
export class FaceCaptureService {
    private config: FaceCaptureConfig;
    private isCapturing = false;
    private captureTimer: ReturnType<typeof setTimeout> | null = null;

    // Event callbacks
    private onCaptureSuccessCallback: ((result: MLResult) => void) | null = null;
    private onCaptureErrorCallback: ((error: MLError) => void) | null = null;
    private onFallbackToManualCallback: (() => void) | null = null;

    constructor(config?: Partial<FaceCaptureConfig>) {
        this.config = {
            autoCapture: true,
            captureInterval: 2000, // 2 seconds between captures
            maxRetries: 3,
            fallbackToManual: true,
            ...config,
        };

        // No WebSocket setup needed with HTTP API
    }

    /**
     * Request camera permissions
     * Requirements: 2.1 - Camera access for face capture
     */
    async requestCameraPermissions(): Promise<boolean> {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Camera permission request failed:', error);
            return false;
        }
    }

    /**
     * Check if camera permissions are granted
     * Requirements: 2.1 - Camera permission checking
     */
    async hasCameraPermissions(): Promise<boolean> {
        try {
            const { status } = await ImagePicker.getCameraPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Camera permission check failed:', error);
            return false;
        }
    }

    /**
     * Capture face image using camera
     * Requirements: 2.2 - Face data capture functionality
     */
    async captureFromCamera(options: CaptureOptions): Promise<CaptureResult> {
        try {
            // Check camera permissions
            const hasPermission = await this.hasCameraPermissions();
            if (!hasPermission) {
                const granted = await this.requestCameraPermissions();
                if (!granted) {
                    return {
                        success: false,
                        error: 'Camera permission denied',
                    };
                }
            }

            // Launch camera
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: options.allowsEditing || false,
                aspect: options.aspect || [1, 1],
                quality: options.quality || 0.8,
                base64: options.base64 !== false, // Default to true
            });

            if (result.canceled) {
                return {
                    success: false,
                    error: 'Camera capture cancelled',
                };
            }

            const asset = result.assets[0];
            return {
                success: true,
                imageUri: asset.uri,
                base64: asset.base64 || undefined,
            };

        } catch (error) {
            console.error('Camera capture error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Camera capture failed',
            };
        }
    }

    /**
     * Capture face image from gallery
     * Requirements: 2.2 - Alternative face data capture method
     */
    async captureFromGallery(options: CaptureOptions): Promise<CaptureResult> {
        try {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                return {
                    success: false,
                    error: 'Media library permission denied',
                };
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: options.allowsEditing || true,
                aspect: options.aspect || [1, 1],
                quality: options.quality || 0.8,
                base64: options.base64 !== false, // Default to true
            });

            if (result.canceled) {
                return {
                    success: false,
                    error: 'Image selection cancelled',
                };
            }

            const asset = result.assets[0];
            return {
                success: true,
                imageUri: asset.uri,
                base64: asset.base64 || undefined,
            };

        } catch (error) {
            console.error('Gallery capture error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Gallery selection failed',
            };
        }
    }

    /**
     * Process captured face image and send to ML model
     * Requirements: 2.2, 2.3 - Face data processing and student identification
     */
    async processFaceImage(
        captureResult: CaptureResult,
        sectionId: string
    ): Promise<MLResult> {
        if (!captureResult.success || !captureResult.base64) {
            const error: MLError = {
                type: 'INVALID_DATA',
                message: captureResult.error || 'Invalid capture result',
                timestamp: new Date(),
            };
            throw error;
        }

        try {
            // Get current user profile for faculty ID
            const userProfile = await authService.getUserProfile();
            if (!userProfile) {
                throw new Error('User profile not available');
            }

            // Send to ML model via HTTP API
            const apiResult = await mlApiService.analyzeFace({
                imageData: captureResult.base64,
                sectionId,
                facultyId: userProfile.id,
            });

            return {
                success: apiResult.success,
                studentId: apiResult.studentId,
                confidence: apiResult.confidence,
                error: apiResult.error,
                timestamp: apiResult.timestamp || new Date(),
            };

        } catch (error) {
            console.error('Face processing error:', error);

            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: error instanceof Error ? error.message : 'Face processing failed',
                timestamp: new Date(),
            };

            if (this.onCaptureErrorCallback) {
                this.onCaptureErrorCallback(mlError);
            }

            throw mlError;
        }
    }

    /**
     * Start automatic face capture for attendance
     * Requirements: 2.1, 2.2 - Automated face capture process
     */
    async startAutoCapture(sectionId: string): Promise<void> {
        if (this.isCapturing) {
            console.warn('Auto capture already in progress');
            return;
        }

        this.isCapturing = true;
        console.log('Starting auto face capture for section:', sectionId);

        // Start capture loop
        this.scheduleNextCapture(sectionId);
    }

    /**
     * Stop automatic face capture
     * Requirements: 2.1 - Stop automated capture process
     */
    stopAutoCapture(): void {
        this.isCapturing = false;

        if (this.captureTimer) {
            clearTimeout(this.captureTimer);
            this.captureTimer = null;
        }

        console.log('Auto face capture stopped');
    }

    /**
     * Capture and process single face image
     * Requirements: 2.2, 2.3 - Manual face capture and processing
     */
    async captureSingleFace(
        sectionId: string,
        useCamera: boolean = true
    ): Promise<MLResult> {
        const captureOptions: CaptureOptions = {
            sectionId,
            quality: 0.8,
            base64: true,
            allowsEditing: false,
            aspect: [1, 1],
        };

        try {
            // Capture image
            const captureResult = useCamera
                ? await this.captureFromCamera(captureOptions)
                : await this.captureFromGallery(captureOptions);

            if (!captureResult.success) {
                throw new Error(captureResult.error || 'Image capture failed');
            }

            // Process with ML model
            const result = await this.processFaceImage(captureResult, sectionId);

            if (this.onCaptureSuccessCallback) {
                this.onCaptureSuccessCallback(result);
            }

            return result;

        } catch (error) {
            console.error('Single face capture error:', error);

            const mlError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: error instanceof Error ? error.message : 'Face capture failed',
                timestamp: new Date(),
            };

            if (this.onCaptureErrorCallback) {
                this.onCaptureErrorCallback(mlError);
            }

            throw mlError;
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
     * Set callback for fallback to manual entry
     * Requirements: 2.4, 2.5 - Fallback mechanism
     */
    onFallbackToManual(callback: () => void): void {
        this.onFallbackToManualCallback = callback;
    }

    /**
     * Check if auto capture is active
     * Requirements: 2.1 - Capture status checking
     */
    isAutoCaptureActive(): boolean {
        return this.isCapturing;
    }

    /**
     * Schedule next automatic capture
     * Requirements: 2.1, 2.2 - Automated capture scheduling
     */
    private scheduleNextCapture(sectionId: string): void {
        if (!this.isCapturing) {
            return;
        }

        this.captureTimer = setTimeout(async () => {
            if (!this.isCapturing) {
                return;
            }

            try {
                await this.performAutoCapture(sectionId);
            } catch (error) {
                console.error('Auto capture error:', error);

                // Continue capturing unless max retries reached
                if (this.config.fallbackToManual && this.onFallbackToManualCallback) {
                    this.onFallbackToManualCallback();
                }
            }

            // Schedule next capture
            this.scheduleNextCapture(sectionId);
        }, this.config.captureInterval);
    }

    /**
     * Perform automatic face capture
     * Requirements: 2.2 - Automated face capture execution
     */
    private async performAutoCapture(sectionId: string): Promise<void> {
        const captureOptions: CaptureOptions = {
            sectionId,
            quality: 0.7, // Lower quality for auto capture
            base64: true,
            allowsEditing: false,
            aspect: [1, 1],
        };

        try {
            // Capture from camera
            const captureResult = await this.captureFromCamera(captureOptions);

            if (captureResult.success) {
                // Process with ML model
                const result = await this.processFaceImage(captureResult, sectionId);

                if (result.success && this.onCaptureSuccessCallback) {
                    this.onCaptureSuccessCallback(result);
                }
            }

        } catch (error) {
            console.error('Auto capture processing error:', error);

            if (this.onCaptureErrorCallback) {
                this.onCaptureErrorCallback({
                    type: 'RECOGNITION_FAILED',
                    message: error instanceof Error ? error.message : 'Auto capture failed',
                    timestamp: new Date(),
                });
            }
        }
    }

    // No WebSocket callbacks with HTTP API

    /**
     * Determine if should fallback to manual entry based on error type
     * Requirements: 2.4, 2.5 - Error-based fallback logic
     */
    private shouldFallbackToManual(error: MLError): boolean {
        const fallbackErrorTypes: MLError['type'][] = [
            'CONNECTION_LOST',
            'TIMEOUT',
            'RECOGNITION_FAILED',
        ];

        return fallbackErrorTypes.includes(error.type);
    }
}

// Export singleton instance
export const faceCaptureService = new FaceCaptureService();