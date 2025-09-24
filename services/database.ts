import * as SQLite from 'expo-sqlite';

// Database interfaces based on design document
export interface AttendanceRecord {
    id?: number;
    studentId: string;
    facultyId: string;
    sectionId: string;
    timestamp: Date;
    status: 'present' | 'absent';
    syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
    captureMethod: 'ml' | 'manual';
    retryCount?: number;
    createdAt?: Date;
}

export interface Student {
    id: string;
    rollNumber: string;
    name: string;
    sectionId: string;
    isActive: boolean;
    lastSynced?: Date;
}

export interface SyncMetadata {
    key: string;
    value: string;
    updatedAt: Date;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export class DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private readonly DB_NAME = 'attendance.db';
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    /**
     * Initialize the SQLite database and create tables
     */
    async initializeDatabase(): Promise<void> {
        // Return existing initialization promise if already initializing
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // Return immediately if already initialized
        if (this.isInitialized && this.db) {
            return;
        }

        this.initializationPromise = this._initializeDatabase();
        return this.initializationPromise;
    }

    private async _initializeDatabase(): Promise<void> {
        try {
            console.log('Initializing SQLite database...');
            this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
            await this.createTables();
            this.isInitialized = true;
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.isInitialized = false;
            this.db = null;
            throw new Error('Database initialization failed');
        } finally {
            this.initializationPromise = null;
        }
    }

    /**
     * Check if database is initialized
     */
    private ensureInitialized(): void {
        if (!this.isInitialized || !this.db) {
            throw new Error('Database not initialized');
        }
    }

    /**
     * Create optimized database tables with enhanced indexes and performance settings
     */
    private async createTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Enable performance optimizations
        await this.db.execAsync('PRAGMA journal_mode = WAL');
        await this.db.execAsync('PRAGMA synchronous = NORMAL');
        await this.db.execAsync('PRAGMA cache_size = 10000');
        await this.db.execAsync('PRAGMA temp_store = MEMORY');
        await this.db.execAsync('PRAGMA mmap_size = 268435456'); // 256MB

        // Create attendance_records table with optimized structure
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        faculty_id TEXT NOT NULL,
        section_id TEXT NOT NULL,
        timestamp DATETIME NOT NULL,
        status TEXT CHECK(status IN ('present', 'absent')) NOT NULL,
        sync_status TEXT CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed')) DEFAULT 'pending',
        capture_method TEXT CHECK(capture_method IN ('ml', 'manual')) NOT NULL,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create students_cache table for offline operation
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS students_cache (
        id TEXT PRIMARY KEY,
        roll_number TEXT NOT NULL,
        name TEXT NOT NULL,
        section_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        last_synced DATETIME
      );
    `);

        // Create sync_metadata table
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Create comprehensive indexes for optimal query performance
        await this.createOptimizedIndexes();

        // Analyze tables for query optimization
        await this.db.execAsync('ANALYZE');
    }

    /**
     * Create optimized database indexes
     */
    private async createOptimizedIndexes(): Promise<void> {
        if (!this.db) return;

        const indexes = [
            // Primary indexes for attendance_records
            'CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_sync_status ON attendance_records(sync_status)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_records(timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_faculty_id ON attendance_records(faculty_id)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_section_id ON attendance_records(section_id)',

            // Composite indexes for common query patterns
            'CREATE INDEX IF NOT EXISTS idx_attendance_student_timestamp ON attendance_records(student_id, timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_sync_timestamp ON attendance_records(sync_status, timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_section_timestamp ON attendance_records(section_id, timestamp DESC)',
            'CREATE INDEX IF NOT EXISTS idx_attendance_faculty_timestamp ON attendance_records(faculty_id, timestamp DESC)',

            // Indexes for students_cache
            'CREATE INDEX IF NOT EXISTS idx_students_section_id ON students_cache(section_id)',
            'CREATE INDEX IF NOT EXISTS idx_students_active ON students_cache(is_active)',
            'CREATE INDEX IF NOT EXISTS idx_students_section_active ON students_cache(section_id, is_active)',
            'CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students_cache(roll_number)',
            'CREATE INDEX IF NOT EXISTS idx_students_name ON students_cache(name)',

            // Index for sync_metadata
            'CREATE INDEX IF NOT EXISTS idx_sync_metadata_updated ON sync_metadata(updated_at DESC)'
        ];

        for (const indexQuery of indexes) {
            try {
                await this.db.execAsync(indexQuery);
            } catch (error) {
                console.warn('Index creation warning:', error);
            }
        }

        console.log('Database indexes created successfully');
    }

    /**
     * Insert a new attendance record
     */
    async insertAttendance(record: AttendanceRecord): Promise<number> {
        this.ensureInitialized();

        try {
            const result = await this.db.runAsync(
                `INSERT INTO attendance_records 
         (student_id, faculty_id, section_id, timestamp, status, sync_status, capture_method, retry_count) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    record.studentId,
                    record.facultyId,
                    record.sectionId,
                    record.timestamp.toISOString(),
                    record.status,
                    record.syncStatus,
                    record.captureMethod,
                    record.retryCount || 0
                ]
            );

            return result.lastInsertRowId;
        } catch (error) {
            console.error('Failed to insert attendance record:', error);
            throw new Error('Failed to save attendance record');
        }
    }

    /**
     * Get all pending records that need to be synced
     */
    async getPendingRecords(): Promise<AttendanceRecord[]> {
        this.ensureInitialized();

        try {
            const rows = await this.db.getAllAsync(
                `SELECT * FROM attendance_records 
         WHERE sync_status = 'pending' OR sync_status = 'failed' 
         ORDER BY created_at ASC`
            );

            return rows.map(this.mapRowToAttendanceRecord);
        } catch (error) {
            console.error('Failed to get pending records:', error);
            throw new Error('Failed to retrieve pending records');
        }
    }

    /**
     * Mark a record as synced
     */
    async markRecordSynced(id: number): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            await this.db.runAsync(
                `UPDATE attendance_records 
         SET sync_status = 'synced' 
         WHERE id = ?`,
                [id]
            );
        } catch (error) {
            console.error('Failed to mark record as synced:', error);
            throw new Error('Failed to update record status');
        }
    }

    /**
     * Update sync status for a record
     */
    async updateSyncStatus(id: number, status: SyncStatus): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            await this.db.runAsync(
                `UPDATE attendance_records 
         SET sync_status = ? 
         WHERE id = ?`,
                [status, id]
            );
        } catch (error) {
            console.error('Failed to update sync status:', error);
            throw new Error('Failed to update sync status');
        }
    }

    /**
     * Get students by section ID from cache
     */
    async getStudentsBySection(sectionId: string): Promise<Student[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const rows = await this.db.getAllAsync(
                `SELECT * FROM students_cache 
         WHERE section_id = ? AND is_active = 1 
         ORDER BY name ASC`,
                [sectionId]
            );

            return rows.map(this.mapRowToStudent);
        } catch (error) {
            console.error('Failed to get students by section:', error);
            throw new Error('Failed to retrieve students');
        }
    }

    /**
     * Cache students data for offline operation
     */
    async cacheStudents(students: Student[]): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            // Use transaction for better performance
            await this.db.withTransactionAsync(async () => {
                for (const student of students) {
                    await this.db!.runAsync(
                        `INSERT OR REPLACE INTO students_cache 
             (id, roll_number, name, section_id, is_active, last_synced) 
             VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            student.id,
                            student.rollNumber,
                            student.name,
                            student.sectionId,
                            student.isActive ? 1 : 0,
                            student.lastSynced?.toISOString() || new Date().toISOString()
                        ]
                    );
                }
            });
        } catch (error) {
            console.error('Failed to cache students:', error);
            throw new Error('Failed to cache student data');
        }
    }

    /**
     * Get attendance records for a specific student
     */
    async getAttendanceByStudent(studentId: string): Promise<AttendanceRecord[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const rows = await this.db.getAllAsync(
                `SELECT * FROM attendance_records 
         WHERE student_id = ? 
         ORDER BY timestamp DESC`,
                [studentId]
            );

            return rows.map(this.mapRowToAttendanceRecord);
        } catch (error) {
            console.error('Failed to get attendance by student:', error);
            throw new Error('Failed to retrieve attendance records');
        }
    }

    /**
     * Get sync metadata
     */
    async getSyncMetadata(key: string): Promise<string | null> {
        this.ensureInitialized();

        try {
            const row = await this.db.getFirstAsync(
                `SELECT value FROM sync_metadata WHERE key = ?`,
                [key]
            ) as { value: string } | null;

            return row?.value || null;
        } catch (error) {
            console.error('Failed to get sync metadata:', error);
            return null;
        }
    }

    /**
     * Set sync metadata
     */
    async setSyncMetadata(key: string, value: string): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            await this.db.runAsync(
                `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) 
         VALUES (?, ?, ?)`,
                [key, value, new Date().toISOString()]
            );
        } catch (error) {
            console.error('Failed to set sync metadata:', error);
            throw new Error('Failed to save sync metadata');
        }
    }

    /**
     * Clear synced records with optimized cleanup
     */
    async clearSyncedRecords(daysToKeep: number = 7): Promise<number> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const result = await this.db.runAsync(
                `DELETE FROM attendance_records 
         WHERE sync_status = 'synced' AND created_at < datetime('now', '-${daysToKeep} days')`
            );

            // Vacuum database after cleanup to reclaim space
            await this.db.execAsync('VACUUM');

            console.log(`Cleaned up ${result.changes} synced records older than ${daysToKeep} days`);
            return result.changes || 0;
        } catch (error) {
            console.error('Failed to clear synced records:', error);
            return 0;
        }
    }

    /**
     * Optimize database performance
     */
    async optimizeDatabase(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            console.log('Starting database optimization...');

            // Update table statistics
            await this.db.execAsync('ANALYZE');

            // Rebuild indexes for optimal performance
            await this.db.execAsync('REINDEX');

            // Optimize database file
            await this.db.execAsync('PRAGMA optimize');

            // Check database integrity
            const integrityResult = await this.db.getFirstAsync('PRAGMA integrity_check') as { integrity_check: string };

            if (integrityResult.integrity_check !== 'ok') {
                console.warn('Database integrity check failed:', integrityResult.integrity_check);
            } else {
                console.log('Database integrity check passed');
            }

            console.log('Database optimization completed');
        } catch (error) {
            console.error('Database optimization failed:', error);
            throw error;
        }
    }

    /**
     * Get database performance metrics
     */
    async getDatabasePerformanceMetrics(): Promise<{
        databaseSize: number;
        pageCount: number;
        pageSize: number;
        freePages: number;
        cacheSize: number;
        journalMode: string;
        synchronousMode: string;
    }> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            const pageCount = await this.db.getFirstAsync('PRAGMA page_count') as { page_count: number };
            const pageSize = await this.db.getFirstAsync('PRAGMA page_size') as { page_size: number };
            const freePages = await this.db.getFirstAsync('PRAGMA freelist_count') as { freelist_count: number };
            const cacheSize = await this.db.getFirstAsync('PRAGMA cache_size') as { cache_size: number };
            const journalMode = await this.db.getFirstAsync('PRAGMA journal_mode') as { journal_mode: string };
            const synchronousMode = await this.db.getFirstAsync('PRAGMA synchronous') as { synchronous: string };

            const databaseSize = pageCount.page_count * pageSize.page_size;

            return {
                databaseSize,
                pageCount: pageCount.page_count,
                pageSize: pageSize.page_size,
                freePages: freePages.freelist_count,
                cacheSize: cacheSize.cache_size,
                journalMode: journalMode.journal_mode,
                synchronousMode: synchronousMode.synchronous
            };
        } catch (error) {
            console.error('Failed to get database performance metrics:', error);
            throw error;
        }
    }

    /**
     * Batch insert attendance records for better performance
     */
    async batchInsertAttendance(records: AttendanceRecord[]): Promise<number[]> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        if (records.length === 0) {
            return [];
        }

        try {
            const insertedIds: number[] = [];

            await this.db.withTransactionAsync(async () => {
                const statement = await this.db!.prepareAsync(
                    `INSERT INTO attendance_records 
           (student_id, faculty_id, section_id, timestamp, status, sync_status, capture_method, retry_count) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                );

                for (const record of records) {
                    const result = await statement.executeAsync([
                        record.studentId,
                        record.facultyId,
                        record.sectionId,
                        record.timestamp.toISOString(),
                        record.status,
                        record.syncStatus,
                        record.captureMethod,
                        record.retryCount || 0
                    ]);

                    insertedIds.push(result.lastInsertRowId);
                }

                await statement.finalizeAsync();
            });

            console.log(`Batch inserted ${records.length} attendance records`);
            return insertedIds;
        } catch (error) {
            console.error('Failed to batch insert attendance records:', error);
            throw new Error('Failed to save attendance records');
        }
    }

    /**
     * Get database statistics
     */
    async getDatabaseStats(): Promise<{
        totalRecords: number;
        pendingRecords: number;
        syncedRecords: number;
        failedRecords: number;
        cachedStudents: number;
    }> {
        this.ensureInitialized();

        try {
            const totalRecords = await this.db.getFirstAsync(
                `SELECT COUNT(*) as count FROM attendance_records`
            ) as { count: number };

            const pendingRecords = await this.db.getFirstAsync(
                `SELECT COUNT(*) as count FROM attendance_records WHERE sync_status = 'pending'`
            ) as { count: number };

            const syncedRecords = await this.db.getFirstAsync(
                `SELECT COUNT(*) as count FROM attendance_records WHERE sync_status = 'synced'`
            ) as { count: number };

            const failedRecords = await this.db.getFirstAsync(
                `SELECT COUNT(*) as count FROM attendance_records WHERE sync_status = 'failed'`
            ) as { count: number };

            const cachedStudents = await this.db.getFirstAsync(
                `SELECT COUNT(*) as count FROM students_cache WHERE is_active = 1`
            ) as { count: number };

            return {
                totalRecords: totalRecords.count,
                pendingRecords: pendingRecords.count,
                syncedRecords: syncedRecords.count,
                failedRecords: failedRecords.count,
                cachedStudents: cachedStudents.count
            };
        } catch (error) {
            console.error('Failed to get database stats:', error);
            throw new Error('Failed to retrieve database statistics');
        }
    }

    /**
     * Map database row to AttendanceRecord
     */
    private mapRowToAttendanceRecord(row: any): AttendanceRecord {
        return {
            id: row.id,
            studentId: row.student_id,
            facultyId: row.faculty_id,
            sectionId: row.section_id,
            timestamp: new Date(row.timestamp),
            status: row.status,
            syncStatus: row.sync_status,
            captureMethod: row.capture_method,
            retryCount: row.retry_count,
            createdAt: new Date(row.created_at)
        };
    }

    /**
     * Map database row to Student
     */
    private mapRowToStudent(row: any): Student {
        return {
            id: row.id,
            rollNumber: row.roll_number,
            name: row.name,
            sectionId: row.section_id,
            isActive: Boolean(row.is_active),
            lastSynced: row.last_synced ? new Date(row.last_synced) : undefined
        };
    }

    /**
     * Close database connection
     */
    async closeDatabase(): Promise<void> {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
        }
    }
}

// Export singleton instance
export const databaseService = new DatabaseService();