import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useDatabase } from '../hooks/useDatabase';
import { useDatabaseContext } from '../contexts/DatabaseContext';
import { createAttendanceRecord, getSyncStatistics } from '../services/databaseUtils';
import { AttendanceRecord, Student } from '../services/database';

/**
 * Example component demonstrating database usage
 * This can be used for testing and as a reference for other components
 */
export function DatabaseExample() {
    const {
        isInitialized,
        isLoading,
        error,
        insertAttendance,
        getPendingRecords,
        getStudentsBySection,
        cacheStudents,
        getDatabaseStats,
        clearError
    } = useDatabase();

    const { isHealthy } = useDatabaseContext();

    const [pendingRecords, setPendingRecords] = useState<AttendanceRecord[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [stats, setStats] = useState<any>(null);

    // Load data when database is ready
    useEffect(() => {
        if (isInitialized && isHealthy) {
            loadData();
        }
    }, [isInitialized, isHealthy]);

    const loadData = async () => {
        try {
            const [records, dbStats] = await Promise.all([
                getPendingRecords(),
                getDatabaseStats()
            ]);

            setPendingRecords(records);
            setStats(dbStats);
        } catch (err) {
            console.error('Failed to load data:', err);
        }
    };

    const handleAddSampleAttendance = async () => {
        const record = createAttendanceRecord(
            'student-001',
            'faculty-001',
            'section-001',
            'present',
            'manual'
        );

        const id = await insertAttendance(record);
        if (id) {
            Alert.alert('Success', `Attendance record added with ID: ${id}`);
            loadData(); // Refresh data
        }
    };

    const handleCacheSampleStudents = async () => {
        const sampleStudents: Student[] = [
            {
                id: 'student-001',
                rollNumber: '001',
                name: 'John Doe',
                sectionId: 'section-001',
                isActive: true
            },
            {
                id: 'student-002',
                rollNumber: '002',
                name: 'Jane Smith',
                sectionId: 'section-001',
                isActive: true
            }
        ];

        const success = await cacheStudents(sampleStudents);
        if (success) {
            Alert.alert('Success', 'Sample students cached successfully');

            // Load students for the section
            const cachedStudents = await getStudentsBySection('section-001');
            setStudents(cachedStudents);
        }
    };

    const handleGetSyncStats = async () => {
        try {
            const syncStats = await getSyncStatistics();
            Alert.alert('Sync Statistics', JSON.stringify(syncStats, null, 2));
        } catch (err) {
            Alert.alert('Error', 'Failed to get sync statistics');
        }
    };

    if (!isInitialized) {
        return (
            <View style={{ padding: 20, alignItems: 'center' }}>
                <Text>Database initializing...</Text>
                {error && (
                    <View style={{ marginTop: 10 }}>
                        <Text style={{ color: 'red' }}>Error: {error}</Text>
                        <TouchableOpacity
                            onPress={clearError}
                            style={{ backgroundColor: '#007bff', padding: 10, borderRadius: 5, marginTop: 10 }}
                        >
                            <Text style={{ color: 'white' }}>Clear Error</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    return (
        <ScrollView style={{ flex: 1, padding: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
                Database Example
            </Text>

            {/* Status */}
            <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Status:</Text>
                <Text>Initialized: {isInitialized ? '✅' : '❌'}</Text>
                <Text>Healthy: {isHealthy ? '✅' : '❌'}</Text>
                <Text>Loading: {isLoading ? '🔄' : '✅'}</Text>
            </View>

            {/* Error Display */}
            {error && (
                <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f8d7da', borderRadius: 8 }}>
                    <Text style={{ color: '#721c24', fontWeight: 'bold' }}>Error:</Text>
                    <Text style={{ color: '#721c24' }}>{error}</Text>
                    <TouchableOpacity
                        onPress={clearError}
                        style={{ backgroundColor: '#dc3545', padding: 8, borderRadius: 4, marginTop: 10 }}
                    >
                        <Text style={{ color: 'white', textAlign: 'center' }}>Clear Error</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Buttons */}
            <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                    onPress={handleAddSampleAttendance}
                    style={{ backgroundColor: '#28a745', padding: 15, borderRadius: 8, marginBottom: 10 }}
                    disabled={isLoading}
                >
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                        Add Sample Attendance
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleCacheSampleStudents}
                    style={{ backgroundColor: '#17a2b8', padding: 15, borderRadius: 8, marginBottom: 10 }}
                    disabled={isLoading}
                >
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                        Cache Sample Students
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleGetSyncStats}
                    style={{ backgroundColor: '#ffc107', padding: 15, borderRadius: 8, marginBottom: 10 }}
                    disabled={isLoading}
                >
                    <Text style={{ color: 'black', textAlign: 'center', fontWeight: 'bold' }}>
                        Show Sync Statistics
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={loadData}
                    style={{ backgroundColor: '#6c757d', padding: 15, borderRadius: 8 }}
                    disabled={isLoading}
                >
                    <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                        Refresh Data
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Database Stats */}
            {stats && (
                <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#e9ecef', borderRadius: 8 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Database Statistics:</Text>
                    <Text>Total Records: {stats.totalRecords}</Text>
                    <Text>Pending Records: {stats.pendingRecords}</Text>
                    <Text>Synced Records: {stats.syncedRecords}</Text>
                    <Text>Failed Records: {stats.failedRecords}</Text>
                    <Text>Cached Students: {stats.cachedStudents}</Text>
                </View>
            )}

            {/* Pending Records */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                    Pending Records ({pendingRecords.length}):
                </Text>
                {pendingRecords.length === 0 ? (
                    <Text style={{ fontStyle: 'italic', color: '#6c757d' }}>No pending records</Text>
                ) : (
                    pendingRecords.map((record, index) => (
                        <View key={record.id || index} style={{
                            padding: 10,
                            backgroundColor: '#fff',
                            borderRadius: 5,
                            marginBottom: 5,
                            borderLeftWidth: 3,
                            borderLeftColor: record.status === 'present' ? '#28a745' : '#dc3545'
                        }}>
                            <Text>Student: {record.studentId}</Text>
                            <Text>Status: {record.status}</Text>
                            <Text>Method: {record.captureMethod}</Text>
                            <Text>Time: {record.timestamp.toLocaleString()}</Text>
                            <Text>Sync: {record.syncStatus}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* Cached Students */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
                    Cached Students ({students.length}):
                </Text>
                {students.length === 0 ? (
                    <Text style={{ fontStyle: 'italic', color: '#6c757d' }}>No cached students</Text>
                ) : (
                    students.map((student) => (
                        <View key={student.id} style={{
                            padding: 10,
                            backgroundColor: '#fff',
                            borderRadius: 5,
                            marginBottom: 5
                        }}>
                            <Text>Name: {student.name}</Text>
                            <Text>Roll: {student.rollNumber}</Text>
                            <Text>Section: {student.sectionId}</Text>
                            <Text>Active: {student.isActive ? 'Yes' : 'No'}</Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}