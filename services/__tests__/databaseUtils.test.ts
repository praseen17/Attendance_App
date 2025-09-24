import { createAttendanceRecord, validateAttendanceRecord } from '../databaseUtils';
import { AttendanceRecord } from '../database';

describe('DatabaseUtils', () => {
    describe('createAttendanceRecord', () => {
        it('should create a valid attendance record with default values', () => {
            const record = createAttendanceRecord(
                'student-1',
                'faculty-1',
                'section-1',
                'present'
            );

            expect(record.studentId).toBe('student-1');
            expect(record.facultyId).toBe('faculty-1');
            expect(record.sectionId).toBe('section-1');
            expect(record.status).toBe('present');
            expect(record.syncStatus).toBe('pending');
            expect(record.captureMethod).toBe('manual');
            expect(record.retryCount).toBe(0);
            expect(record.timestamp).toBeInstanceOf(Date);
        });

        it('should create a record with ML capture method when specified', () => {
            const record = createAttendanceRecord(
                'student-1',
                'faculty-1',
                'section-1',
                'absent',
                'ml'
            );

            expect(record.captureMethod).toBe('ml');
            expect(record.status).toBe('absent');
        });
    });

    describe('validateAttendanceRecord', () => {
        it('should validate a correct attendance record', () => {
            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            const result = validateAttendanceRecord(record);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return errors for missing required fields', () => {
            const record: AttendanceRecord = {
                studentId: '',
                facultyId: '',
                sectionId: '',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            const result = validateAttendanceRecord(record);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Student ID is required');
            expect(result.errors).toContain('Faculty ID is required');
            expect(result.errors).toContain('Section ID is required');
        });

        it('should return error for invalid status', () => {
            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'invalid' as any,
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            const result = validateAttendanceRecord(record);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Valid status (present/absent) is required');
        });

        it('should return error for invalid capture method', () => {
            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date(),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'invalid' as any
            };

            const result = validateAttendanceRecord(record);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Valid capture method (ml/manual) is required');
        });

        it('should return error for invalid timestamp', () => {
            const record: AttendanceRecord = {
                studentId: 'student-1',
                facultyId: 'faculty-1',
                sectionId: 'section-1',
                timestamp: new Date('invalid'),
                status: 'present',
                syncStatus: 'pending',
                captureMethod: 'manual'
            };

            const result = validateAttendanceRecord(record);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Valid timestamp is required');
        });
    });
});