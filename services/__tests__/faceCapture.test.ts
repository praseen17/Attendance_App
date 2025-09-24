import { FaceCaptureService, CaptureOptions, CaptureResult } from '../faceCapture';
import { mlWebSocketService, MLResult, MLError } from '../mlWebSocketService';
import { authService } from '../authService';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

// Mock dependencies
jest.mock('expo-camera');
jest.mock('expo-image-picker');
jest.mock('../mlWebSocketService');
jest.mock('../authService');

const mockCamera = Camera as jest.Mocked<typeof Camera>;
const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const mockMLWebSocketService = mlWebSocketService as jest.Mocked<typeof mlWebSocketService>;
const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('FaceCaptureService', () => {
    let service: FaceCaptureService;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        mockCamera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
        mockCamera.getCameraPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
        mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' } as any);
        mockMLWebSocketService.isWebSocketConnected.mockReturnValue(true);
        mockMLWebSocketService.connect.mockResolvedValue();
        mockAuthService.getUserProfile.mockResolvedValue({
            id: 'faculty-123',
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            sections: ['section-1'],
        });

        service = new FaceCaptureService({
            autoCapture: true,
            captureInterval: 100, // Short interval for testing
            maxRetries: 3,
            fallbackToManual: true,
        });
    });

    describe('Camera Permissions', () => {
        it('should request camera permissions successfully', async () => {
            const result = await service.requestCameraPermissions();

            expect(mockCamera.requestCameraPermissionsAsync).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should handle camera permission denial', async () => {
            mockCamera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

            const result = await service.requestCameraPermissions();

            expect(result).toBe(false);
        });

        it('should check existing camera permissions', async () => {
            const result = await service.hasCameraPermissions();

            expect(mockCamera.getCameraPermissionsAsync).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should handle camera permission check failure', async () => {
            mockCamera.getCameraPermissionsAsync.mockRejectedValue(new Error('Permission check failed'));

            const result = await service.hasCameraPermissions();

            expect(result).toBe(false);
        });
    });

    describe('Image Capture', () => {
        const captureOptions: CaptureOptions = {
            sectionId: 'section-123',
            quality: 0.8,
            base64: true,
        };

        it('should capture image from camera successfully', async () => {
            const mockResult = {
                canceled: false,
                assets: [{
                    uri: 'file://image.jpg',
                    base64: 'base64-image-data',
                }],
            };

            mockImagePicker.launchCameraAsync.mockResolvedValue(mockResult as any);

            const result = await service.captureFromCamera(captureOptions);

            expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            expect(result).toEqual({
                success: true,
                imageUri: 'file://image.jpg',
                base64: 'base64-image-data',
            });
        });

        it('should handle camera capture cancellation', async () => {
            mockImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true } as any);

            const result = await service.captureFromCamera(captureOptions);

            expect(result).toEqual({
                success: false,
                error: 'Camera capture cancelled',
            });
        });

        it('should handle camera capture without permissions', async () => {
            mockCamera.getCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);
            mockCamera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

            const result = await service.captureFromCamera(captureOptions);

            expect(result).toEqual({
                success: false,
                error: 'Camera permission denied',
            });
        });

        it('should capture image from gallery successfully', async () => {
            const mockResult = {
                canceled: false,
                assets: [{
                    uri: 'file://gallery-image.jpg',
                    base64: 'base64-gallery-data',
                }],
            };

            mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockResult as any);

            const result = await service.captureFromGallery(captureOptions);

            expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
            expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
                base64: true,
            });

            expect(result).toEqual({
                success: true,
                imageUri: 'file://gallery-image.jpg',
                base64: 'base64-gallery-data',
            });
        });

        it('should handle gallery access permission denial', async () => {
            mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'denied' } as any);

            const result = await service.captureFromGallery(captureOptions);

            expect(result).toEqual({
                success: false,
                error: 'Media library permission denied',
            });
        });
    });

    describe('Face Processing', () => {
        it('should process face image successfully', async () => {
            const captureResult: CaptureResult = {
                success: true,
                imageUri: 'file://image.jpg',
                base64: 'base64-image-data',
            };

            const mockMLResult: MLResult = {
                success: true,
                studentId: 'student-456',
                confidence: 0.95,
            };

            mockMLWebSocketService.sendFaceData.mockResolvedValue(mockMLResult);

            const result = await service.processFaceImage(captureResult, 'section-123');

            expect(mockMLWebSocketService.sendFaceData).toHaveBeenCalledWith({
                imageData: 'base64-image-data',
                sectionId: 'section-123',
                facultyId: 'faculty-123',
                timestamp: expect.any(Date),
            });

            expect(result).toEqual(mockMLResult);
        });

        it('should handle invalid capture result', async () => {
            const captureResult: CaptureResult = {
                success: false,
                error: 'Capture failed',
            };

            await expect(service.processFaceImage(captureResult, 'section-123')).rejects.toMatchObject({
                type: 'INVALID_DATA',
                message: 'Capture failed',
            });
        });

        it('should handle missing user profile', async () => {
            mockAuthService.getUserProfile.mockResolvedValue(null);

            const captureResult: CaptureResult = {
                success: true,
                base64: 'base64-image-data',
            };

            await expect(service.processFaceImage(captureResult, 'section-123')).rejects.toMatchObject({
                type: 'RECOGNITION_FAILED',
                message: 'User profile not available',
            });
        });

        it('should handle ML processing error', async () => {
            const captureResult: CaptureResult = {
                success: true,
                base64: 'base64-image-data',
            };

            mockMLWebSocketService.sendFaceData.mockRejectedValue(new Error('ML processing failed'));

            await expect(service.processFaceImage(captureResult, 'section-123')).rejects.toMatchObject({
                type: 'RECOGNITION_FAILED',
                message: 'ML processing failed',
            });
        });
    });

    describe('Single Face Capture', () => {
        it('should capture and process single face from camera', async () => {
            const mockCaptureResult = {
                canceled: false,
                assets: [{
                    uri: 'file://image.jpg',
                    base64: 'base64-image-data',
                }],
            };

            const mockMLResult: MLResult = {
                success: true,
                studentId: 'student-456',
                confidence: 0.95,
            };

            mockImagePicker.launchCameraAsync.mockResolvedValue(mockCaptureResult as any);
            mockMLWebSocketService.sendFaceData.mockResolvedValue(mockMLResult);

            const captureSuccessCallback = jest.fn();
            service.onCaptureSuccess(captureSuccessCallback);

            const result = await service.captureSingleFace('section-123', true);

            expect(result).toEqual(mockMLResult);
            expect(captureSuccessCallback).toHaveBeenCalledWith(mockMLResult);
        });

        it('should capture and process single face from gallery', async () => {
            const mockCaptureResult = {
                canceled: false,
                assets: [{
                    uri: 'file://gallery-image.jpg',
                    base64: 'base64-gallery-data',
                }],
            };

            const mockMLResult: MLResult = {
                success: true,
                studentId: 'student-789',
                confidence: 0.88,
            };

            mockImagePicker.launchImageLibraryAsync.mockResolvedValue(mockCaptureResult as any);
            mockMLWebSocketService.sendFaceData.mockResolvedValue(mockMLResult);

            const result = await service.captureSingleFace('section-123', false);

            expect(result).toEqual(mockMLResult);
        });

        it('should handle single face capture error', async () => {
            mockImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true } as any);

            const captureErrorCallback = jest.fn();
            service.onCaptureError(captureErrorCallback);

            await expect(service.captureSingleFace('section-123', true)).rejects.toMatchObject({
                type: 'RECOGNITION_FAILED',
                message: 'Camera capture cancelled',
            });

            expect(captureErrorCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'RECOGNITION_FAILED',
                    message: 'Camera capture cancelled',
                })
            );
        });
    });

    describe('Auto Capture', () => {
        it('should start auto capture successfully', async () => {
            await service.startAutoCapture('section-123');

            expect(mockMLWebSocketService.isWebSocketConnected).toHaveBeenCalled();
            expect(service.isAutoCaptureActive()).toBe(true);
        });

        it('should connect to WebSocket if not connected', async () => {
            mockMLWebSocketService.isWebSocketConnected.mockReturnValue(false);

            await service.startAutoCapture('section-123');

            expect(mockMLWebSocketService.connect).toHaveBeenCalled();
            expect(service.isAutoCaptureActive()).toBe(true);
        });

        it('should fallback to manual if WebSocket connection fails', async () => {
            mockMLWebSocketService.isWebSocketConnected.mockReturnValue(false);
            mockMLWebSocketService.connect.mockRejectedValue(new Error('Connection failed'));

            const fallbackCallback = jest.fn();
            service.onFallbackToManual(fallbackCallback);

            await service.startAutoCapture('section-123');

            expect(fallbackCallback).toHaveBeenCalled();
            expect(service.isAutoCaptureActive()).toBe(false);
        });

        it('should stop auto capture', async () => {
            await service.startAutoCapture('section-123');
            expect(service.isAutoCaptureActive()).toBe(true);

            service.stopAutoCapture();
            expect(service.isAutoCaptureActive()).toBe(false);
        });

        it('should not start auto capture if already active', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            await service.startAutoCapture('section-123');
            await service.startAutoCapture('section-123'); // Second call

            expect(consoleSpy).toHaveBeenCalledWith('Auto capture already in progress');

            consoleSpy.mockRestore();
        });
    });

    describe('Event Callbacks', () => {
        it('should handle ML WebSocket student identification', async () => {
            const captureSuccessCallback = jest.fn();
            service.onCaptureSuccess(captureSuccessCallback);

            const mockResult: MLResult = {
                success: true,
                studentId: 'student-123',
                confidence: 0.92,
            };

            // Simulate ML WebSocket callback
            const onStudentIdentifiedCallback = mockMLWebSocketService.onStudentIdentified.mock.calls[0][0];
            onStudentIdentifiedCallback(mockResult);

            expect(captureSuccessCallback).toHaveBeenCalledWith(mockResult);
        });

        it('should handle ML WebSocket errors', async () => {
            const captureErrorCallback = jest.fn();
            service.onCaptureError(captureErrorCallback);

            const mockError: MLError = {
                type: 'RECOGNITION_FAILED',
                message: 'Face not detected',
                timestamp: new Date(),
            };

            // Simulate ML WebSocket error callback
            const onErrorCallback = mockMLWebSocketService.onError.mock.calls[0][0];
            onErrorCallback(mockError);

            expect(captureErrorCallback).toHaveBeenCalledWith(mockError);
        });

        it('should fallback to manual on connection loss during capture', async () => {
            const fallbackCallback = jest.fn();
            service.onFallbackToManual(fallbackCallback);

            await service.startAutoCapture('section-123');

            // Simulate connection status change to disconnected
            const onConnectionStatusCallback = mockMLWebSocketService.onConnectionStatus.mock.calls[0][0];
            onConnectionStatusCallback(false);

            expect(fallbackCallback).toHaveBeenCalled();
        });

        it('should determine fallback conditions correctly', async () => {
            const fallbackCallback = jest.fn();
            service.onFallbackToManual(fallbackCallback);

            const fallbackErrors: MLError[] = [
                { type: 'CONNECTION_LOST', message: 'Connection lost', timestamp: new Date() },
                { type: 'TIMEOUT', message: 'Request timeout', timestamp: new Date() },
                { type: 'RECOGNITION_FAILED', message: 'Recognition failed', timestamp: new Date() },
            ];

            const nonFallbackErrors: MLError[] = [
                { type: 'LOW_CONFIDENCE', message: 'Low confidence', timestamp: new Date() },
                { type: 'INVALID_DATA', message: 'Invalid data', timestamp: new Date() },
            ];

            // Test fallback errors
            const onErrorCallback = mockMLWebSocketService.onError.mock.calls[0][0];

            fallbackErrors.forEach(error => {
                onErrorCallback(error);
            });

            expect(fallbackCallback).toHaveBeenCalledTimes(fallbackErrors.length);

            // Reset callback
            fallbackCallback.mockClear();

            // Test non-fallback errors
            nonFallbackErrors.forEach(error => {
                onErrorCallback(error);
            });

            expect(fallbackCallback).not.toHaveBeenCalled();
        });
    });

    describe('Configuration', () => {
        it('should use custom configuration', () => {
            const customService = new FaceCaptureService({
                autoCapture: false,
                captureInterval: 5000,
                maxRetries: 5,
                fallbackToManual: false,
            });

            expect((customService as any).config).toEqual({
                autoCapture: false,
                captureInterval: 5000,
                maxRetries: 5,
                fallbackToManual: false,
            });
        });

        it('should use default configuration when not provided', () => {
            const defaultService = new FaceCaptureService();

            expect((defaultService as any).config).toEqual({
                autoCapture: true,
                captureInterval: 2000,
                maxRetries: 3,
                fallbackToManual: true,
            });
        });
    });
});