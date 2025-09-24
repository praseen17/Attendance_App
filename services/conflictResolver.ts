import { AttendanceRecord } from './database';
import { syncErrorHandler, SyncErrorType } from './errorHandler';

/**
 * Conflict types for attendance records
 * Requirements: 5.3 - Conflict resolution for duplicate attendance records
 */
export enum ConflictType {
    DUPLICATE_RECORD = 'DUPLICATE_RECORD',
    TIMESTAMP_CONFLICT = 'TIMESTAMP_CONFLICT',
    STATUS_CONFLICT = 'STATUS_CONFLICT',
    METHOD_CONFLICT = 'METHOD_CONFLICT'
}

export interface ConflictResolution {
    type: ConflictType;
    strategy: ConflictResolutionStrategy;
    resolvedRecord: AttendanceRecord;
    discardedRecords: AttendanceRecord[];
    reason: string;
}

export enum ConflictResolutionStrategy {
    KEEP_LATEST = 'KEEP_LATEST',
    KEEP_EARLIEST = 'KEEP_EARLIEST',
    PREFER_ML_CAPTURE = 'PREFER_ML_CAPTURE',
    PREFER_MANUAL_CAPTURE = 'PREFER_MANUAL_CAPTURE',
    PREFER_PRESENT_STATUS = 'PREFER_PRESENT_STATUS',
    MERGE_RECORDS = 'MERGE_RECORDS',
    MANUAL_REVIEW = 'MANUAL_REVIEW'
}

export interface ConflictDetectionResult {
    hasConflicts: boolean;
    conflicts: AttendanceConflict[];
    cleanRecords: AttendanceRecord[];
}

export interface AttendanceConflict {
    type: ConflictType;
    records: AttendanceRecord[];
    severity: 'low' | 'medium' | 'high';
    description: string;
}

/**
 * Handles conflict resolution for duplicate attendance records
 * Requirements: 5.3 - Create conflict resolution for duplicate attendance records
 */
export class ConflictResolver {
    private readonly SAME_DAY_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    private readonly DUPLICATE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

    /**
     * Detect conflicts in attendance records
     * Requirements: 5.3 - Conflict detection for duplicate records
     */
    detectConflicts(records: AttendanceRecord[]): ConflictDetectionResult {
        const conflicts: AttendanceConflict[] = [];
        const processedRecords = new Set<number>();
        const cleanRecords: AttendanceRecord[] = [];

        // Group records by student and date for conflict detection
        const recordGroups = this.groupRecordsByStudentAndDate(records);

        for (const [key, groupRecords] of recordGroups.entries()) {
            if (groupRecords.length === 1) {
                // No conflicts for single records
                cleanRecords.push(groupRecords[0]);
                continue;
            }

            // Detect different types of conflicts
            const detectedConflicts = this.analyzeRecordGroup(groupRecords);

            if (detectedConflicts.length > 0) {
                conflicts.push(...detectedConflicts);

                // Mark all conflicting records as processed
                groupRecords.forEach(record => {
                    if (record.id) processedRecords.add(record.id);
                });
            } else {
                // No conflicts detected, add to clean records
                cleanRecords.push(...groupRecords);
            }
        }

        return {
            hasConflicts: conflicts.length > 0,
            conflicts,
            cleanRecords
        };
    }

    /**
     * Resolve conflicts using appropriate strategies
     * Requirements: 5.3 - Automatic conflict resolution
     */
    resolveConflicts(conflicts: AttendanceConflict[]): ConflictResolution[] {
        const resolutions: ConflictResolution[] = [];

        for (const conflict of conflicts) {
            try {
                const resolution = this.resolveConflict(conflict);
                resolutions.push(resolution);
            } catch (error) {
                console.error('Failed to resolve conflict:', error);

                // Log conflict resolution failure
                syncErrorHandler.logError({
                    level: 'error',
                    category: 'sync',
                    message: 'Conflict resolution failed',
                    details: {
                        conflictType: conflict.type,
                        recordCount: conflict.records.length,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    }
                });
            }
        }

        return resolutions;
    }

    /**
     * Resolve a single conflict
     * Requirements: 5.3 - Individual conflict resolution logic
     */
    private resolveConflict(conflict: AttendanceConflict): ConflictResolution {
        const strategy = this.selectResolutionStrategy(conflict);

        switch (strategy) {
            case ConflictResolutionStrategy.KEEP_LATEST:
                return this.resolveKeepLatest(conflict);

            case ConflictResolutionStrategy.KEEP_EARLIEST:
                return this.resolveKeepEarliest(conflict);

            case ConflictResolutionStrategy.PREFER_ML_CAPTURE:
                return this.resolvePreferMLCapture(conflict);

            case ConflictResolutionStrategy.PREFER_MANUAL_CAPTURE:
                return this.resolvePreferManualCapture(conflict);

            case ConflictResolutionStrategy.PREFER_PRESENT_STATUS:
                return this.resolvePreferPresentStatus(conflict);

            case ConflictResolutionStrategy.MERGE_RECORDS:
                return this.resolveMergeRecords(conflict);

            default:
                return this.resolveKeepLatest(conflict); // Default fallback
        }
    }

    /**
     * Select appropriate resolution strategy based on conflict type
     * Requirements: 5.3 - Strategy selection for different conflict types
     */
    private selectResolutionStrategy(conflict: AttendanceConflict): ConflictResolutionStrategy {
        switch (conflict.type) {
            case ConflictType.DUPLICATE_RECORD:
                // For exact duplicates, keep the latest one
                return ConflictResolutionStrategy.KEEP_LATEST;

            case ConflictType.TIMESTAMP_CONFLICT:
                // For timestamp conflicts, prefer ML capture if available
                const hasMLCapture = conflict.records.some(r => r.captureMethod === 'ml');
                return hasMLCapture
                    ? ConflictResolutionStrategy.PREFER_ML_CAPTURE
                    : ConflictResolutionStrategy.KEEP_LATEST;

            case ConflictType.STATUS_CONFLICT:
                // For status conflicts, prefer present status (more likely to be correct)
                return ConflictResolutionStrategy.PREFER_PRESENT_STATUS;

            case ConflictType.METHOD_CONFLICT:
                // For method conflicts, prefer ML capture (more accurate)
                return ConflictResolutionStrategy.PREFER_ML_CAPTURE;

            default:
                return ConflictResolutionStrategy.KEEP_LATEST;
        }
    }

    /**
     * Group records by student and date for conflict analysis
     */
    private groupRecordsByStudentAndDate(records: AttendanceRecord[]): Map<string, AttendanceRecord[]> {
        const groups = new Map<string, AttendanceRecord[]>();

        for (const record of records) {
            const date = new Date(record.timestamp);
            const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
            const key = `${record.studentId}_${record.sectionId}_${dateKey}`;

            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(record);
        }

        return groups;
    }

    /**
     * Analyze a group of records for conflicts
     */
    private analyzeRecordGroup(records: AttendanceRecord[]): AttendanceConflict[] {
        const conflicts: AttendanceConflict[] = [];

        // Check for exact duplicates
        const duplicates = this.findDuplicateRecords(records);
        if (duplicates.length > 0) {
            conflicts.push({
                type: ConflictType.DUPLICATE_RECORD,
                records: duplicates,
                severity: 'low',
                description: `Found ${duplicates.length} duplicate attendance records`
            });
        }

        // Check for timestamp conflicts (multiple records within short time)
        const timestampConflicts = this.findTimestampConflicts(records);
        if (timestampConflicts.length > 0) {
            conflicts.push({
                type: ConflictType.TIMESTAMP_CONFLICT,
                records: timestampConflicts,
                severity: 'medium',
                description: `Found ${timestampConflicts.length} records with conflicting timestamps`
            });
        }

        // Check for status conflicts (different attendance status for same student/day)
        const statusConflicts = this.findStatusConflicts(records);
        if (statusConflicts.length > 0) {
            conflicts.push({
                type: ConflictType.STATUS_CONFLICT,
                records: statusConflicts,
                severity: 'high',
                description: `Found conflicting attendance status for same student`
            });
        }

        // Check for capture method conflicts
        const methodConflicts = this.findMethodConflicts(records);
        if (methodConflicts.length > 0) {
            conflicts.push({
                type: ConflictType.METHOD_CONFLICT,
                records: methodConflicts,
                severity: 'low',
                description: `Found records with different capture methods`
            });
        }

        return conflicts;
    }

    /**
     * Find exact duplicate records
     */
    private findDuplicateRecords(records: AttendanceRecord[]): AttendanceRecord[] {
        const duplicates: AttendanceRecord[] = [];
        const seen = new Set<string>();

        for (const record of records) {
            const key = `${record.studentId}_${record.status}_${record.captureMethod}_${record.timestamp.getTime()}`;

            if (seen.has(key)) {
                duplicates.push(record);
            } else {
                seen.add(key);
            }
        }

        return duplicates;
    }

    /**
     * Find timestamp conflicts (records too close in time)
     */
    private findTimestampConflicts(records: AttendanceRecord[]): AttendanceRecord[] {
        const conflicts: AttendanceRecord[] = [];
        const sortedRecords = [...records].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        for (let i = 1; i < sortedRecords.length; i++) {
            const timeDiff = sortedRecords[i].timestamp.getTime() - sortedRecords[i - 1].timestamp.getTime();

            if (timeDiff < this.DUPLICATE_THRESHOLD) {
                if (!conflicts.includes(sortedRecords[i - 1])) {
                    conflicts.push(sortedRecords[i - 1]);
                }
                conflicts.push(sortedRecords[i]);
            }
        }

        return conflicts;
    }

    /**
     * Find status conflicts (different attendance status)
     */
    private findStatusConflicts(records: AttendanceRecord[]): AttendanceRecord[] {
        const statusGroups = new Map<string, AttendanceRecord[]>();

        for (const record of records) {
            if (!statusGroups.has(record.status)) {
                statusGroups.set(record.status, []);
            }
            statusGroups.get(record.status)!.push(record);
        }

        // If we have both present and absent records, it's a conflict
        if (statusGroups.size > 1) {
            return records; // All records are part of the conflict
        }

        return [];
    }

    /**
     * Find capture method conflicts
     */
    private findMethodConflicts(records: AttendanceRecord[]): AttendanceRecord[] {
        const methodGroups = new Map<string, AttendanceRecord[]>();

        for (const record of records) {
            if (!methodGroups.has(record.captureMethod)) {
                methodGroups.set(record.captureMethod, []);
            }
            methodGroups.get(record.captureMethod)!.push(record);
        }

        // If we have both ML and manual records, it's a potential conflict
        if (methodGroups.size > 1) {
            return records;
        }

        return [];
    }

    /**
     * Resolution strategy: Keep latest record
     */
    private resolveKeepLatest(conflict: AttendanceConflict): ConflictResolution {
        const sortedRecords = [...conflict.records].sort((a, b) =>
            b.timestamp.getTime() - a.timestamp.getTime()
        );

        return {
            type: conflict.type,
            strategy: ConflictResolutionStrategy.KEEP_LATEST,
            resolvedRecord: sortedRecords[0],
            discardedRecords: sortedRecords.slice(1),
            reason: 'Kept the most recent record'
        };
    }

    /**
     * Resolution strategy: Keep earliest record
     */
    private resolveKeepEarliest(conflict: AttendanceConflict): ConflictResolution {
        const sortedRecords = [...conflict.records].sort((a, b) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );

        return {
            type: conflict.type,
            strategy: ConflictResolutionStrategy.KEEP_EARLIEST,
            resolvedRecord: sortedRecords[0],
            discardedRecords: sortedRecords.slice(1),
            reason: 'Kept the earliest record'
        };
    }

    /**
     * Resolution strategy: Prefer ML capture
     */
    private resolvePreferMLCapture(conflict: AttendanceConflict): ConflictResolution {
        const mlRecords = conflict.records.filter(r => r.captureMethod === 'ml');
        const manualRecords = conflict.records.filter(r => r.captureMethod === 'manual');

        if (mlRecords.length > 0) {
            // If multiple ML records, keep the latest
            const sortedMLRecords = mlRecords.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            );

            return {
                type: conflict.type,
                strategy: ConflictResolutionStrategy.PREFER_ML_CAPTURE,
                resolvedRecord: sortedMLRecords[0],
                discardedRecords: [...sortedMLRecords.slice(1), ...manualRecords],
                reason: 'Preferred ML capture over manual entry'
            };
        }

        // Fallback to keeping latest if no ML records
        return this.resolveKeepLatest(conflict);
    }

    /**
     * Resolution strategy: Prefer manual capture
     */
    private resolvePreferManualCapture(conflict: AttendanceConflict): ConflictResolution {
        const manualRecords = conflict.records.filter(r => r.captureMethod === 'manual');
        const mlRecords = conflict.records.filter(r => r.captureMethod === 'ml');

        if (manualRecords.length > 0) {
            const sortedManualRecords = manualRecords.sort((a, b) =>
                b.timestamp.getTime() - a.timestamp.getTime()
            );

            return {
                type: conflict.type,
                strategy: ConflictResolutionStrategy.PREFER_MANUAL_CAPTURE,
                resolvedRecord: sortedManualRecords[0],
                discardedRecords: [...sortedManualRecords.slice(1), ...mlRecords],
                reason: 'Preferred manual entry over ML capture'
            };
        }

        return this.resolveKeepLatest(conflict);
    }

    /**
     * Resolution strategy: Prefer present status
     */
    private resolvePreferPresentStatus(conflict: AttendanceConflict): ConflictResolution {
        const presentRecords = conflict.records.filter(r => r.status === 'present');
        const absentRecords = conflict.records.filter(r => r.status === 'absent');

        if (presentRecords.length > 0) {
            // If multiple present records, prefer ML capture, then latest
            const mlPresentRecords = presentRecords.filter(r => r.captureMethod === 'ml');

            let selectedRecord: AttendanceRecord;
            if (mlPresentRecords.length > 0) {
                selectedRecord = mlPresentRecords.sort((a, b) =>
                    b.timestamp.getTime() - a.timestamp.getTime()
                )[0];
            } else {
                selectedRecord = presentRecords.sort((a, b) =>
                    b.timestamp.getTime() - a.timestamp.getTime()
                )[0];
            }

            const discarded = conflict.records.filter(r => r !== selectedRecord);

            return {
                type: conflict.type,
                strategy: ConflictResolutionStrategy.PREFER_PRESENT_STATUS,
                resolvedRecord: selectedRecord,
                discardedRecords: discarded,
                reason: 'Preferred present status over absent'
            };
        }

        return this.resolveKeepLatest(conflict);
    }

    /**
     * Resolution strategy: Merge records (for compatible conflicts)
     */
    private resolveMergeRecords(conflict: AttendanceConflict): ConflictResolution {
        // For now, merging is simplified to keeping the best record
        // In a more complex scenario, you might merge metadata or create composite records

        const sortedRecords = [...conflict.records].sort((a, b) => {
            // Prefer ML over manual
            if (a.captureMethod === 'ml' && b.captureMethod === 'manual') return -1;
            if (a.captureMethod === 'manual' && b.captureMethod === 'ml') return 1;

            // Prefer present over absent
            if (a.status === 'present' && b.status === 'absent') return -1;
            if (a.status === 'absent' && b.status === 'present') return 1;

            // Prefer latest timestamp
            return b.timestamp.getTime() - a.timestamp.getTime();
        });

        return {
            type: conflict.type,
            strategy: ConflictResolutionStrategy.MERGE_RECORDS,
            resolvedRecord: sortedRecords[0],
            discardedRecords: sortedRecords.slice(1),
            reason: 'Merged conflicting records using best available data'
        };
    }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();