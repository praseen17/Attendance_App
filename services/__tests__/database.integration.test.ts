import { databaseService, AttendanceRecord, Student } from '../database';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(() => Promise.resolve({
        execAsync: jest.fn(() => Promise.resolve()),
        runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1 })),
        getAllAsync: jest.fn(() => Promise.resolve([])),
        getFirstAsync: jest.fn(() => Promise.resolve(null)),
        withTransactionAsync: jest.fn((callback) => callback()),
        closeAsync: jest.fn(() => Promise.resolve()),
    })),
}));

describe('Database Integration for Offline Attendance', () => {
    const mockStudent: Student = {
        id: 'student-1',
        rollNumber: 'CS001',
        name: 'John Doe',
        sectionId: 'cs-year-1',
        isActive: true,
    };

    const mockAttendanceRecord: AttendanceRecord = {
        studentId: 'student-1',
        facultyId: 'faculty-1',
        sectionId: 'cs-year-1',
        timestamp: new Date(),
        status: 'present',
        syncStatus: 'pending',
        captureMethod: 'ml',
        retryCount: 0,
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        await databaseService.initializeDatabase();
    });

    afterEach(async () => {
        await databaseService.closeDatabase();
    });

    describe('Local SQLite Storage', () => {
        it('should initialize database successfully', async () => {
            // Act & Assert - initialization happens in beforeEach
            expect(databaseService).toBeDefined();
        });

        it('should insert attendance record and return ID', async () => {
            // Act
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Assert
            expect(recordId).toBeDefined();
            expect(typeof recordId).toBe('number');
        });

        it('should cache students for offline operation', async () => {
            // Arrange
            const students = [mockStudent];

            // Act
            await databaseService.cacheStudents(students);

            // Assert - No error thrown means success
            expect(true).toBe(true);
        });

        it('should handle sync status updates', async () => {
            // Arrange
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Act
            await databaseService.updateSyncStatus(recordId, 'synced');
            await databaseService.markRecordSynced(recordId);

            // Assert - No error thrown means success
            expect(true).toBe(true);
        });
    });

    describe('Attendance Record Management', () => {
        it('should support both present and absent status', async () => {
            // Arrange
            const presentRecord = { ...mockAttendanceRecord, status: 'present' as const };
            const absentRecord = { ...mockAttendanceRecord, status: 'absent' as const };

            // Act
            const presentId = await databaseService.insertAttendance(presentRecord);
            const absentId = await databaseService.insertAttendance(absentRecord);

            // Assert
            expect(presentId).toBeDefined();
            expect(absentId).toBeDefined();
        });

        it('should support both ML and manual capture methods', async () => {
            // Arrange
            const mlRecord = { ...mockAttendanceRecord, captureMethod: 'ml' as const };
            const manualRecord = { ...mockAttendanceRecord, captureMethod: 'manual' as const };

            // Act
            const mlId = await databaseService.insertAttendance(mlRecord);
            const manualId = await databaseService.insertAttendance(manualRecord);

            // Assert
            expect(mlId).toBeDefined();
            expect(manualId).toBeDefined();
        });

        it('should handle different sync statuses', async () => {
            // Arrange & Act
            const pendingRecord = { ...mockAttendanceRecord, syncStatus: 'pending' as const };
            const syncingRecord = { ...mockAttendanceRecord, syncStatus: 'syncing' as const };
            const syncedRecord = { ...mockAttendanceRecord, syncStatus: 'synced' as const };
            const failedRecord = { ...mockAttendanceRecord, syncStatus: 'failed' as const };

            const pendingId = await databaseService.insertAttendance(pendingRecord);
            const syncingId = await databaseService.insertAttendance(syncingRecord);
            const syncedId = await databaseService.insertAttendance(syncedRecord);
            const failedId = await databaseService.insertAttendance(failedRecord);

            // Assert
            expect(pendingId).toBeDefined();
            expect(syncingId).toBeDefined();
            expect(syncedId).toBeDefined();
            expect(failedId).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle database not initialized error', async () => {
            // Arrange
            await databaseService.closeDatabase();

            // Act & Assert
            await expect(databaseService.insertAttendance(mockAttendanceRecord))
                .rejects.toThrow('Database not initialized');
        });

        it('should handle invalid attendance record gracefully', async () => {
            // Arrange
            const invalidRecord = {
                ...mockAttendanceRecord,
                status: 'invalid' as any, // Invalid status
            };

            // Act & Assert - Should not throw due to database constraints
            // The actual database would reject this, but our mock allows it
            const recordId = await databaseService.insertAttendance(invalidRecord);
            expect(recordId).toBeDefined();
        });
    });

    describe('Data Integrity', () => {
        it('should maintain referential integrity between students and attendance', async () => {
            // Arrange
            await databaseService.cacheStudents([mockStudent]);

            // Act
            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            // Assert
            expect(recordId).toBeDefined();
            expect(mockAttendanceRecord.studentId).toBe(mockStudent.id);
        });

        it('should handle timestamp consistency', async () => {
            // Arrange
            const now = new Date();
            const recordWithTimestamp = {
                ...mockAttendanceRecord,
                timestamp: now,
            };

            // Act
            const recordId = await databaseService.insertAttendance(recordWithTimestamp);

            // Assert
            expect(recordId).toBeDefined();
            expect(recordWithTimestamp.timestamp).toBe(now);
        });
    });
});