// Face-based attendance service for the new attendance flow
// This service handles the complete face detection, liveness detection, and attendance marking process

import { authService } from './authService';
import { mlApiService } from './mlApiService';

export interface FaceAttendanceResult {
    success: boolean;
    attendanceId?: string;
    studentId?: string;
    studentName?: string;
    rollNumber?: string;
    sectionName?: string;
    status?: string;
    captureMethod?: string;
    faceDetected?: boolean;
    livenessDetected?: boolean;
    confidenceScore?: number;
    faceDetectionTimestamp?: Date;
    attendanceTimestamp?: Date;
    date?: string;
    error?: string;
    details?: string;
}

export interface AttendanceImageResult {
    success: boolean;
    attendanceId?: string;
    imageCaptured?: boolean;
    timestamp?: Date;
    error?: string;
    details?: string;
}

export interface StudentEnrollmentResult {
    success: boolean;
    studentId?: string;
    rollNumber?: string;
    name?: string;
    sectionId?: string;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    faceEnrolled?: boolean;
    enrollmentMessage?: string;
    enrollmentError?: string;
    warning?: string;
    error?: string;
    details?: string;
}

export interface StudentReEnrollmentResult {
    success: boolean;
    studentId?: string;
    rollNumber?: string;
    name?: string;
    faceReEnrolled?: boolean;
    enrollmentMessage?: string;
    error?: string;
    details?: string;
}

class FaceAttendanceService {
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    }

    /**
     * Mark attendance using face detection and liveness detection
     * This is the main method for the new attendance flow
     */
    async markAttendanceWithFace(
        imageData: string,
        sectionId: string
    ): Promise<FaceAttendanceResult> {
        try {
            const token = await authService.getToken();
            if (!token) {
                return {
                    success: false,
                    error: 'Authentication required',
                    details: 'Please log in to mark attendance'
                };
            }

            const response = await fetch(`${this.apiUrl}/api/attendance-face/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageData,
                    sectionId
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'Failed to mark attendance',
                    details: result.details || 'Unknown error occurred'
                };
            }

            return {
                success: true,
                attendanceId: result.data.attendanceId,
                studentId: result.data.studentId,
                studentName: result.data.studentName,
                rollNumber: result.data.rollNumber,
                sectionName: result.data.sectionName,
                status: result.data.status,
                captureMethod: result.data.captureMethod,
                faceDetected: result.data.faceDetected,
                livenessDetected: result.data.livenessDetected,
                confidenceScore: result.data.confidenceScore,
                faceDetectionTimestamp: result.data.faceDetectionTimestamp ? new Date(result.data.faceDetectionTimestamp) : undefined,
                attendanceTimestamp: result.data.attendanceTimestamp ? new Date(result.data.attendanceTimestamp) : undefined,
                date: result.data.date
            };

        } catch (error) {
            console.error('Face attendance marking error:', error);
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Failed to connect to server'
            };
        }
    }

    /**
     * Capture attendance image after marking attendance
     * This method is called after successful attendance marking
     */
    async captureAttendanceImage(
        attendanceId: string,
        imageData: string
    ): Promise<AttendanceImageResult> {
        try {
            const token = await authService.getToken();
            if (!token) {
                return {
                    success: false,
                    error: 'Authentication required',
                    details: 'Please log in to capture attendance image'
                };
            }

            const response = await fetch(`${this.apiUrl}/api/attendance-face/capture-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    attendanceId,
                    imageData
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'Failed to capture attendance image',
                    details: result.details || 'Unknown error occurred'
                };
            }

            return {
                success: true,
                attendanceId: result.data.attendanceId,
                imageCaptured: result.data.imageCaptured,
                timestamp: result.data.timestamp ? new Date(result.data.timestamp) : undefined
            };

        } catch (error) {
            console.error('Attendance image capture error:', error);
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Failed to connect to server'
            };
        }
    }

    /**
     * Enroll a new student with face data
     * This method creates a new student and enrolls their face in the ML system
     */
    async enrollStudentWithFace(
        rollNumber: string,
        name: string,
        sectionId: string,
        faceImage: string,
        isActive: boolean = true
    ): Promise<StudentEnrollmentResult> {
        try {
            const token = await authService.getToken();
            if (!token) {
                return {
                    success: false,
                    error: 'Authentication required',
                    details: 'Please log in to enroll student'
                };
            }

            const response = await fetch(`${this.apiUrl}/api/students-face/enroll`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rollNumber,
                    name,
                    sectionId,
                    faceImage,
                    isActive
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'Failed to enroll student',
                    details: result.details || 'Unknown error occurred'
                };
            }

            return {
                success: true,
                studentId: result.data.id,
                rollNumber: result.data.rollNumber,
                name: result.data.name,
                sectionId: result.data.sectionId,
                isActive: result.data.isActive,
                createdAt: result.data.createdAt ? new Date(result.data.createdAt) : undefined,
                updatedAt: result.data.updatedAt ? new Date(result.data.updatedAt) : undefined,
                faceEnrolled: result.data.faceEnrolled,
                enrollmentMessage: result.data.enrollmentMessage,
                enrollmentError: result.data.enrollmentError,
                warning: result.warning
            };

        } catch (error) {
            console.error('Student enrollment error:', error);
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Failed to connect to server'
            };
        }
    }

    /**
     * Re-enroll an existing student's face
     * This method allows updating the face data for an existing student
     */
    async reEnrollStudentFace(
        studentId: string,
        faceImage: string
    ): Promise<StudentReEnrollmentResult> {
        try {
            const token = await authService.getToken();
            if (!token) {
                return {
                    success: false,
                    error: 'Authentication required',
                    details: 'Please log in to re-enroll student face'
                };
            }

            const response = await fetch(`${this.apiUrl}/api/students-face/re-enroll/${studentId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    faceImage
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'Failed to re-enroll student face',
                    details: result.details || 'Unknown error occurred'
                };
            }

            return {
                success: true,
                studentId: result.data.studentId,
                rollNumber: result.data.rollNumber,
                name: result.data.name,
                faceReEnrolled: result.data.faceReEnrolled,
                enrollmentMessage: result.data.enrollmentMessage
            };

        } catch (error) {
            console.error('Student face re-enrollment error:', error);
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Failed to connect to server'
            };
        }
    }

    /**
     * Get face-based attendance history for a specific student
     */
    async getFaceAttendanceHistory(
        studentId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{
        success: boolean;
        data?: {
            student: {
                id: string;
                name: string;
                rollNumber: string;
            };
            attendanceRecords: Array<{
                id: string;
                date: string;
                status: string;
                captureMethod: string;
                faceDetected: boolean;
                livenessDetected: boolean;
                confidenceScore: number;
                faceDetectionTimestamp: Date;
                attendanceImageTimestamp?: Date;
                hasAttendanceImage: boolean;
                facultyName: string;
                sectionName: string;
                createdAt: Date;
            }>;
        };
        pagination?: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
        };
        error?: string;
        details?: string;
    }> {
        try {
            const token = await authService.getToken();
            if (!token) {
                return {
                    success: false,
                    error: 'Authentication required',
                    details: 'Please log in to view attendance history'
                };
            }

            const response = await fetch(
                `${this.apiUrl}/api/attendance-face/student/${studentId}?limit=${limit}&offset=${offset}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: result.error || 'Failed to retrieve attendance history',
                    details: result.details || 'Unknown error occurred'
                };
            }

            return {
                success: true,
                data: {
                    student: result.data.student,
                    attendanceRecords: result.data.attendanceRecords.map((record: any) => ({
                        ...record,
                        faceDetectionTimestamp: new Date(record.faceDetectionTimestamp),
                        attendanceImageTimestamp: record.attendanceImageTimestamp ? new Date(record.attendanceImageTimestamp) : undefined,
                        createdAt: new Date(record.createdAt)
                    }))
                },
                pagination: result.pagination
            };

        } catch (error) {
            console.error('Get face attendance history error:', error);
            return {
                success: false,
                error: 'Network error',
                details: error instanceof Error ? error.message : 'Failed to connect to server'
            };
        }
    }
}

export const faceAttendanceService = new FaceAttendanceService();
