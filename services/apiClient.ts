import { authService } from './authService';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.1.40.91:3001';

// API response interface
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Network error class
export class NetworkError extends Error {
    constructor(message: string, public status?: number) {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Authenticated API Client
 * Requirements: 1.2, 1.4 - Authenticated API requests with token management
 */
export class ApiClient {
    /**
     * Make authenticated GET request
     */
    async get<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'GET',
        });
    }

    /**
     * Make authenticated POST request
     */
    async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Make authenticated PUT request
     */
    async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * Make authenticated DELETE request
     */
    async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, {
            method: 'DELETE',
        });
    }

    /**
     * Make authenticated request with automatic token refresh
     * Requirements: 1.2, 1.4 - Token management and automatic refresh
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit
    ): Promise<ApiResponse<T>> {
        try {
            const url = `${API_BASE_URL}${endpoint}`;

            // Make authenticated request
            const response = await authService.authenticatedFetch(url, options);

            // Parse response
            const responseData = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: responseData.message || `HTTP ${response.status}`,
                };
            }

            return {
                success: true,
                data: responseData,
            };
        } catch (error) {
            console.error('API request error:', error);

            if (error instanceof Error) {
                return {
                    success: false,
                    error: error.message,
                };
            }

            return {
                success: false,
                error: 'Unknown error occurred',
            };
        }
    }

    /**
     * Check network connectivity
     * Requirements: 1.5 - Network connectivity detection for offline mode
     */
    async checkConnectivity(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`, {
                method: 'GET',
                timeout: 5000,
            } as RequestInit);

            return response.ok;
        } catch (error) {
            console.log('Network connectivity check failed:', error);
            return false;
        }
    }

    /**
     * Upload attendance data for sync
     * Requirements: 4.2, 4.3 - Attendance sync functionality
     */
    async syncAttendance(attendanceRecords: any[]): Promise<ApiResponse> {
        return this.post('/api/attendance/sync', {
            records: attendanceRecords,
        });
    }

    /**
     * Get student list for a section
     * Requirements: 6.2, 6.3 - Student data management
     */
    async getStudentsBySection(sectionId: string): Promise<ApiResponse> {
        return this.get(`/api/students/section/${sectionId}`);
    }

    /**
     * Get faculty sections
     * Requirements: 6.2, 6.3 - Faculty section management
     */
    async getFacultySections(facultyId: string): Promise<ApiResponse> {
        return this.get(`/api/faculty/${facultyId}/sections`);
    }

    /**
     * Get attendance history for a student
     * Requirements: 4.2 - Attendance data retrieval
     */
    async getStudentAttendance(studentId: string): Promise<ApiResponse> {
        return this.get(`/api/attendance/student/${studentId}`);
    }
}

// Export singleton instance
export const apiClient = new ApiClient();