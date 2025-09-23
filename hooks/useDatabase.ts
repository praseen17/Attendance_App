import { useState, useEffect, useCallback } from 'react';
import { databaseService, AttendanceRecord, Student, SyncStatus } from '../services/database';

/**
 * Custom hook for database operations
 */
export function useDatabase() {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize database on hook mount
    useEffect(() => {
        const initDb = async () => {
            try {
                setIsLoading(true);
                await databaseService.initializeDatabase();
                setIsInitialized(true);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Database initialization failed');
            } finally {
                setIsLoading(false);
            }
        };

        initDb();
    }, []);

    // Attendance operations
    const insertAttendance = useCallback(async (record: AttendanceRecord): Promise<number | null> => {
        try {
            setIsLoading(true);
            setError(null);
            const id = await databaseService.insertAttendance(record);
            return id;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to insert attendance');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getPendingRecords = useCallback(async (): Promise<AttendanceRecord[]> => {
        try {
            setIsLoading(true);
            setError(null);
            return await databaseService.getPendingRecords();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get pending records');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const markRecordSynced = useCallback(async (id: number): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            await databaseService.markRecordSynced(id);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to mark record as synced');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateSyncStatus = useCallback(async (id: number, status: SyncStatus): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            await databaseService.updateSyncStatus(id, status);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update sync status');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Student operations
    const getStudentsBySection = useCallback(async (sectionId: string): Promise<Student[]> => {
        try {
            setIsLoading(true);
            setError(null);
            return await databaseService.getStudentsBySection(sectionId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get students');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const cacheStudents = useCallback(async (students: Student[]): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            await databaseService.cacheStudents(students);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to cache students');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getAttendanceByStudent = useCallback(async (studentId: string): Promise<AttendanceRecord[]> => {
        try {
            setIsLoading(true);
            setError(null);
            return await databaseService.getAttendanceByStudent(studentId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get student attendance');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Metadata operations
    const getSyncMetadata = useCallback(async (key: string): Promise<string | null> => {
        try {
            return await databaseService.getSyncMetadata(key);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get sync metadata');
            return null;
        }
    }, []);

    const setSyncMetadata = useCallback(async (key: string, value: string): Promise<boolean> => {
        try {
            await databaseService.setSyncMetadata(key, value);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to set sync metadata');
            return false;
        }
    }, []);

    // Utility operations
    const getDatabaseStats = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            return await databaseService.getDatabaseStats();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get database stats');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearSyncedRecords = useCallback(async (): Promise<boolean> => {
        try {
            setIsLoading(true);
            setError(null);
            await databaseService.clearSyncedRecords();
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to clear synced records');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        // State
        isInitialized,
        isLoading,
        error,

        // Attendance operations
        insertAttendance,
        getPendingRecords,
        markRecordSynced,
        updateSyncStatus,
        getAttendanceByStudent,

        // Student operations
        getStudentsBySection,
        cacheStudents,

        // Metadata operations
        getSyncMetadata,
        setSyncMetadata,

        // Utility operations
        getDatabaseStats,
        clearSyncedRecords,
        clearError
    };
}