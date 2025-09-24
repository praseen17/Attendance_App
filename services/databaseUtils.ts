import { databaseService, AttendanceRecord, Student } from './database';

/**
 * Utility functions for common database operations
 */

/**
 * Create a new attendance record with default values
 */
export function createAttendanceRecord(
    studentId: string,
    facultyId: string,
    sectionId: string,
    status: 'present' | 'absent',
    captureMethod: 'ml' | 'manual' = 'manual'
): AttendanceRecord {
    return {
        studentId,
        facultyId,
        sectionId,
        timestamp: new Date(),
        status,
        syncStatus: 'pending',
        captureMethod,
        retryCount: 0
    };
}

/**
 * Batch insert attendance records
 */
export async function batchInsertAttendance(records: AttendanceRecord[]): Promise<number[]> {
    const insertedIds: number[] = [];

    for (const record of records) {
        try {
            const id = await databaseService.insertAttendance(record);
            insertedIds.push(id);
        } catch (error) {
            console.error('Failed to insert attendance record:', error);
            // Continue with other records even if one fails
        }
    }

    return insertedIds;
}

/**
 * Get attendance summary for a section
 */
export async function getAttendanceSummary(sectionId: string, date?: Date): Promise<{
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
}> {
    try {
        const students = await databaseService.getStudentsBySection(sectionId);
        const totalStudents = students.length;

        if (totalStudents === 0) {
            return {
                totalStudents: 0,
                presentCount: 0,
                absentCount: 0,
                attendanceRate: 0
            };
        }

        // Get attendance records for the date (default to today)
        const targetDate = date || new Date();
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        let presentCount = 0;
        let absentCount = 0;

        for (const student of students) {
            const attendanceRecords = await databaseService.getAttendanceByStudent(student.id);

            // Find attendance record for the target date
            const dayRecord = attendanceRecords.find(record => {
                const recordDate = new Date(record.timestamp);
                return recordDate >= startOfDay && recordDate <= endOfDay;
            });

            if (dayRecord) {
                if (dayRecord.status === 'present') {
                    presentCount++;
                } else {
                    absentCount++;
                }
            }
            // If no record found, student is considered absent
            else {
                absentCount++;
            }
        }

        const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

        return {
            totalStudents,
            presentCount,
            absentCount,
            attendanceRate: Math.round(attendanceRate * 100) / 100 // Round to 2 decimal places
        };
    } catch (error) {
        console.error('Failed to get attendance summary:', error);
        return {
            totalStudents: 0,
            presentCount: 0,
            absentCount: 0,
            attendanceRate: 0
        };
    }
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics(): Promise<{
    totalRecords: number;
    pendingRecords: number;
    syncedRecords: number;
    failedRecords: number;
    syncProgress: number;
}> {
    try {
        const stats = await databaseService.getDatabaseStats();
        const syncProgress = stats.totalRecords > 0
            ? (stats.syncedRecords / stats.totalRecords) * 100
            : 100;

        return {
            ...stats,
            syncProgress: Math.round(syncProgress * 100) / 100
        };
    } catch (error) {
        console.error('Failed to get sync statistics:', error);
        return {
            totalRecords: 0,
            pendingRecords: 0,
            syncedRecords: 0,
            failedRecords: 0,
            syncProgress: 0
        };
    }
}

/**
 * Validate attendance record before insertion
 */
export function validateAttendanceRecord(record: AttendanceRecord): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (!record.studentId || record.studentId.trim() === '') {
        errors.push('Student ID is required');
    }

    if (!record.facultyId || record.facultyId.trim() === '') {
        errors.push('Faculty ID is required');
    }

    if (!record.sectionId || record.sectionId.trim() === '') {
        errors.push('Section ID is required');
    }

    if (!record.status || !['present', 'absent'].includes(record.status)) {
        errors.push('Valid status (present/absent) is required');
    }

    if (!record.captureMethod || !['ml', 'manual'].includes(record.captureMethod)) {
        errors.push('Valid capture method (ml/manual) is required');
    }

    if (!record.timestamp || isNaN(record.timestamp.getTime())) {
        errors.push('Valid timestamp is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Clean up old synced records (older than specified days)
 */
export async function cleanupOldRecords(daysToKeep: number = 30): Promise<number> {
    try {
        const stats = await databaseService.getDatabaseStats();
        const initialCount = stats.syncedRecords;

        await databaseService.clearSyncedRecords();

        const newStats = await databaseService.getDatabaseStats();
        const cleanedCount = initialCount - newStats.syncedRecords;

        console.log(`Cleaned up ${cleanedCount} old synced records`);
        return cleanedCount;
    } catch (error) {
        console.error('Failed to cleanup old records:', error);
        return 0;
    }
}

/**
 * Export attendance data for backup or analysis
 */
export async function exportAttendanceData(): Promise<{
    attendanceRecords: AttendanceRecord[];
    students: Student[];
    exportDate: string;
}> {
    try {
        // Get all attendance records
        const pendingRecords = await databaseService.getPendingRecords();

        // Get all cached students
        const allStudents: Student[] = [];
        // Note: This is a simplified approach. In a real app, you might want to 
        // get students from all sections or have a method to get all students

        return {
            attendanceRecords: pendingRecords,
            students: allStudents,
            exportDate: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to export attendance data:', error);
        throw new Error('Failed to export data');
    }
}

/**
 * Check if student exists in cache
 */
export async function isStudentCached(studentId: string): Promise<boolean> {
    try {
        const attendanceRecords = await databaseService.getAttendanceByStudent(studentId);
        return attendanceRecords.length > 0;
    } catch (error) {
        console.error('Failed to check if student is cached:', error);
        return false;
    }
}

/**
 * Get recent attendance activity
 */
export async function getRecentActivity(limit: number = 10): Promise<AttendanceRecord[]> {
    try {
        const pendingRecords = await databaseService.getPendingRecords();

        // Sort by timestamp descending and limit results
        return pendingRecords
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    } catch (error) {
        console.error('Failed to get recent activity:', error);
        return [];
    }
}