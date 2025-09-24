import { DatabaseService } from '../database';
import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(),
}));

describe('DatabaseService Unit Tests', () => {
    let databaseService: DatabaseService;
    let mockDatabase: any;

    beforeEach(async () => {
        mockDatabase = {
            execAsync: jest.fn(),
            runAsync: jest.fn(),
            getFirstAsync: jest.fn(),
            getAllAsync: jest.fn(),
            closeAsync: jest.fn(),
            withTransactionAsync: jest.fn((callback) => callback()),
        };

        (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDatabase);
        databaseService = new DatabaseService();

        // Initialize the database for each test
        mockDatabase.execAsync.mockResolvedValue(undefined);
        await databaseService.initializeDatabase();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeDatabase', () => {
        it('should create all required tables', async () => {
            mockDatabase.execAsync.mockResolvedValue(undefined);

            await databaseService.initializeDatabase();

            expect(mockDatabase.execAsync).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS attendance_records')
            );
            expect(mockDatabase.execAsync).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS students_cache')
            );
            expect(mockDatabase.execAsync).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_metadata')
            );
        });

        it('should create indexes for performance', async () => {
            mockDatabase.execAsync.mockResolvedValue(undefined);

            await databaseService.initializeDatabase();

            expect(mockDatabase.execAsync).toHaveBeenCalledWith(
                expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_attendance_student_id')
            );
            expect(mockDatabase.execAsync).toHaveBeenCalledWith(
                expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_attendance_sync_status')
            );
        });

        it('should handle database initialization errors', async () => {
            mockDatabase.execAsync.mockRejectedValue(new Error('Database creation failed'));

            await expect(databaseService.initializeDatabase()).rejects.toThrow('Database initialization failed');
        });
    });

    describe('insertAttendance', () => {
        const mockAttendanceRecord = {
            studentId: 'student-1',
            facultyId: 'faculty-1',
            sectionId: 'section-1',
            timestamp: new Date('2024-01-15T10:00:00Z'),
            status: 'present' as const,
            captureMethod: 'ml' as const,
            syncStatus: 'pending' as const
        };

        it('should insert attendance record successfully', async () => {
            mockDatabase.runAsync.mockResolvedValue({ lastInsertRowId: 1 });

            const recordId = await databaseService.insertAttendance(mockAttendanceRecord);

            expect(recordId).toBe(1);
            expect(mockDatabase.runAsync).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO attendance_records'),
                [
                    'student-1',
                    'faculty-1',
                    'section-1',
                    '2024-01-15T10:00:00.000Z',
                    'present',
                    'pending',
                    'ml',
                    0
                ]
            );
        });

        it('should handle database insertion errors', async () => {
            mockDatabase.runAsync.mockRejectedValue(new Error('Database connection lost'));

            await expect(
                databaseService.insertAttendance(mockAttendanceRecord)
            ).rejects.toThrow('Failed to save attendance record');
        });
    });

    describe('getPendingRecords', () => {
        it('should retrieve all pending records', async () => {
            const mockPendingRecords = [
                {
                    id: 1,
                    student_id: 'student-1',
                    faculty_id: 'faculty-1',
                    section_id: 'section-1',
                    timestamp: '2024-01-15T10:00:00.000Z',
                    status: 'present',
                    sync_status: 'pending',
                    capture_method: 'ml',
                    retry_count: 0,
                    created_at: '2024-01-15T10:00:00.000Z'
                }
            ];

            mockDatabase.getAllAsync.mockResolvedValue(mockPendingRecords);

            const records = await databaseService.getPendingRecords();

            expect(records).toHaveLength(1);
            expect(records[0].studentId).toBe('student-1');
            expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
                expect.stringContaining("WHERE sync_status = 'pending' OR sync_status = 'failed'")
            );
        });

        it('should return empty array when no pending records', async () => {
            mockDatabase.getAllAsync.mockResolvedValue([]);

            const records = await databaseService.getPendingRecords();

            expect(records).toHaveLength(0);
        });

        it('should handle database query errors', async () => {
            mockDatabase.getAllAsync.mockRejectedValue(new Error('Query failed'));

            await expect(databaseService.getPendingRecords()).rejects.toThrow('Failed to retrieve pending records');
        });
    });

    describe('markRecordSynced', () => {
        it('should mark record as synced successfully', async () => {
            mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

            await databaseService.markRecordSynced(1);

            expect(mockDatabase.runAsync).toHaveBeenCalledWith(
                expect.stringContaining("SET sync_status = 'synced'"),
                [1]
            );
        });

        it('should handle database update errors', async () => {
            mockDatabase.runAsync.mockRejectedValue(new Error('Update failed'));

            await expect(databaseService.markRecordSynced(1)).rejects.toThrow('Failed to update record status');
        });
    });

    describe('updateSyncStatus', () => {
        it('should update sync status successfully', async () => {
            mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

            await databaseService.updateSyncStatus(1, 'failed');

            expect(mockDatabase.runAsync).toHaveBeenCalledWith(
                expect.stringContaining('SET sync_status = ?'),
                ['failed', 1]
            );
        });
    });

    describe('getStudentsBySection', () => {
        it('should retrieve students for valid section', async () => {
            const mockStudents = [
                {
                    id: 'student-1',
                    roll_number: 'ROLL001',
                    name: 'Student One',
                    section_id: 'section-1',
                    is_active: 1,
                    last_synced: null
                }
            ];

            mockDatabase.getAllAsync.mockResolvedValue(mockStudents);

            const students = await databaseService.getStudentsBySection('section-1');

            expect(students).toHaveLength(1);
            expect(students[0].rollNumber).toBe('ROLL001');
            expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
                expect.stringContaining('WHERE section_id = ? AND is_active = 1'),
                ['section-1']
            );
        });

        it('should return empty array for section with no students', async () => {
            mockDatabase.getAllAsync.mockResolvedValue([]);

            const students = await databaseService.getStudentsBySection('empty-section');

            expect(students).toHaveLength(0);
        });
    });

    describe('cacheStudents', () => {
        it('should cache student data successfully', async () => {
            const mockStudents = [
                {
                    id: 'student-1',
                    rollNumber: 'ROLL001',
                    name: 'Student One',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

            await databaseService.cacheStudents(mockStudents);

            expect(mockDatabase.withTransactionAsync).toHaveBeenCalled();
        });

        it('should handle database insertion errors', async () => {
            const mockStudents = [
                {
                    id: 'student-1',
                    rollNumber: 'ROLL001',
                    name: 'Student One',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            mockDatabase.withTransactionAsync.mockRejectedValue(new Error('Cache insertion failed'));

            await expect(databaseService.cacheStudents(mockStudents)).rejects.toThrow('Failed to cache student data');
        });
    });

    describe('getAttendanceByStudent', () => {
        it('should retrieve attendance history for student', async () => {
            const mockAttendance = [
                {
                    id: 1,
                    student_id: 'student-1',
                    faculty_id: 'faculty-1',
                    section_id: 'section-1',
                    timestamp: '2024-01-15T10:00:00.000Z',
                    status: 'present',
                    sync_status: 'synced',
                    capture_method: 'ml',
                    retry_count: 0,
                    created_at: '2024-01-15T10:00:00.000Z'
                }
            ];

            mockDatabase.getAllAsync.mockResolvedValue(mockAttendance);

            const attendance = await databaseService.getAttendanceByStudent('student-1');

            expect(attendance).toHaveLength(1);
            expect(attendance[0].status).toBe('present');
            expect(mockDatabase.getAllAsync).toHaveBeenCalledWith(
                expect.stringContaining('WHERE student_id = ?'),
                ['student-1']
            );
        });
    });

    describe('clearSyncedRecords', () => {
        it('should remove old synced records', async () => {
            mockDatabase.runAsync.mockResolvedValue({ changes: 5 });

            await databaseService.clearSyncedRecords();

            expect(mockDatabase.runAsync).toHaveBeenCalledWith(
                expect.stringContaining("WHERE sync_status = 'synced'")
            );
        });
    });

    describe('getDatabaseStats', () => {
        it('should return database statistics', async () => {
            mockDatabase.getFirstAsync
                .mockResolvedValueOnce({ count: 100 }) // total records
                .mockResolvedValueOnce({ count: 10 })  // pending records
                .mockResolvedValueOnce({ count: 85 })  // synced records
                .mockResolvedValueOnce({ count: 5 })   // failed records
                .mockResolvedValueOnce({ count: 50 }); // cached students

            const stats = await databaseService.getDatabaseStats();

            expect(stats).toEqual({
                totalRecords: 100,
                pendingRecords: 10,
                syncedRecords: 85,
                failedRecords: 5,
                cachedStudents: 50
            });
        });
    });

    describe('getSyncMetadata', () => {
        it('should retrieve sync metadata', async () => {
            mockDatabase.getFirstAsync.mockResolvedValue({ value: 'test-value' });

            const value = await databaseService.getSyncMetadata('test-key');

            expect(value).toBe('test-value');
            expect(mockDatabase.getFirstAsync).toHaveBeenCalledWith(
                expect.stringContaining('SELECT value FROM sync_metadata WHERE key = ?'),
                ['test-key']
            );
        });

        it('should return null for non-existent key', async () => {
            mockDatabase.getFirstAsync.mockResolvedValue(null);

            const value = await databaseService.getSyncMetadata('non-existent');

            expect(value).toBeNull();
        });
    });

    describe('setSyncMetadata', () => {
        it('should set sync metadata', async () => {
            mockDatabase.runAsync.mockResolvedValue({ changes: 1 });

            await databaseService.setSyncMetadata('test-key', 'test-value');

            expect(mockDatabase.runAsync).toHaveBeenCalledWith(
                expect.stringContaining('INSERT OR REPLACE INTO sync_metadata'),
                ['test-key', 'test-value', expect.any(String)]
            );
        });
    });

    describe('closeDatabase', () => {
        it('should close database connection', async () => {
            await databaseService.initializeDatabase();
            await databaseService.closeDatabase();

            expect(mockDatabase.closeAsync).toHaveBeenCalled();
        });
    });
});