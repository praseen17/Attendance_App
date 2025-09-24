import { DatabaseService, AttendanceRecord, Student } from '../database';

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
    openDatabaseAsync: jest.fn(() => Promise.resolve({
        execAsync: jest.fn(() => Promise.resolve()),
        runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1 })),
        getAllAsync: jest.fn(() => Promise.resolve([])),
        getFirstAsync: jest.fn(() => Promise.resolve({ count: 0 })),
        withTransactionAsync: jest.fn((callback) => callback()),
        closeAsync: jest.fn(() => Promise.resolve())
    }))
}));

describe('DatabaseService', () => {
    let databaseService: DatabaseService;

    beforeEach(() => {
        databaseService = new DatabaseService();
        jest.clearAllMocks();
    });

    describe('initializeDatabase', () => {
        it('should initialize database successfully', async () => {
            await expect(databaseService.initializeDatabase()).resolves.not.toThrow();
        });
    });

    describe('insertAttendance', () => {
        it('should insert attendance record successfully', async () => {
            await databaseService.initializeDatabase();

            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            const result = await databaseService.insertAttendance(record);
            expect(result).toBe(1);
        });

        it('should throw error when database not initialized', async () => {
            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            await expect(databaseService.insertAttendance(record)).rejects.toThrow('Database not initialized');
        });
    });

    describe('getPendingRecords', () => {
        it('should return empty array when no pending records', async () => {
            await databaseService.initializeDatabase();
            const records = await databaseService.getPendingRecords();
            expect(records).toEqual([]);
        });
    });

    describe('cacheStudents', () => {
        it('should cache students successfully', async () => {
            await databaseService.initializeDatabase();

            const students: Student[] = [
                {
                    id: 'student-1',
                    rollNumber: '001',
                    name: 'John Doe',
                    sectionId: 'section-1',
                    isActive: true
                }
            ];

            await expect(databaseService.cacheStudents(students)).resolves.not.toThrow();
        });
    });

    describe('getDatabaseStats', () => {
        it('should return database statistics', async () => {
            await databaseService.initializeDatabase();

            const stats = await databaseService.getDatabaseStats();
            expect(stats).toHaveProperty('totalRecords');
            expect(stats).toHaveProperty('pendingRecords');
            expect(stats).toHaveProperty('syncedRecords');
            expect(stats).toHaveProperty('failedRecords');
            expect(stats).toHaveProperty('cachedStudents');
        });
    });
});