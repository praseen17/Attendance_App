import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Dimensions, Platform } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, DataTable } from 'react-native-paper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width, height } = Dimensions.get('window');

export default function RecordsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Mock attendance data - replace with real data from your backend
  const attendanceRecords = [
    {
      date: '2024-01-15',
      totalStudents: 45,
      present: 38,
      absent: 7,
      records: [
        { id: 1, name: 'Rahul Kumar', rollNo: 'STU001', status: 'present', time: '09:15 AM' },
        { id: 2, name: 'Priya Sharma', rollNo: 'STU002', status: 'present', time: '09:12 AM' },
        { id: 3, name: 'Amit Singh', rollNo: 'STU003', status: 'present', time: '09:10 AM' },
        { id: 4, name: 'Sneha Patel', rollNo: 'STU004', status: 'absent', time: '-' },
      ]
    },
    {
      date: '2024-01-14',
      totalStudents: 45,
      present: 42,
      absent: 3,
      records: [
        { id: 1, name: 'Rahul Kumar', rollNo: 'STU001', status: 'present', time: '09:20 AM' },
        { id: 2, name: 'Priya Sharma', rollNo: 'STU002', status: 'present', time: '09:18 AM' },
        { id: 3, name: 'Amit Singh', rollNo: 'STU003', status: 'absent', time: '-' },
        { id: 4, name: 'Sneha Patel', rollNo: 'STU004', status: 'present', time: '09:25 AM' },
      ]
    }
  ];

  const weeklyStats = {
    totalDays: 5,
    averageAttendance: 87.2,
    bestDay: { date: '2024-01-12', rate: 95.6 },
    worstDay: { date: '2024-01-15', rate: 84.4 }
  };

  const getCurrentRecord = () => {
    return attendanceRecords.find(record => record.date === selectedDate) || attendanceRecords[0];
  };

  const currentRecord = getCurrentRecord();
  const attendanceRate = ((currentRecord.present / currentRecord.totalStudents) * 100).toFixed(1);

  const exportData = () => {
    // Here you would implement data export functionality
    alert('Export functionality would be implemented here');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.headerTitle, { color: '#ffffff', fontSize: 28, fontWeight: '700' }]}>
          📊 Attendance Records
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Track and analyze attendance data
        </ThemedText>
      </ThemedView>

      {/* View Mode Selector */}
      <ThemedView style={styles.viewModeContainer}>
        <View style={styles.chipContainer}>
          <Chip 
            selected={viewMode === 'daily'} 
            onPress={() => setViewMode('daily')}
            style={styles.chip}
          >
            Daily
          </Chip>
          <Chip 
            selected={viewMode === 'weekly'} 
            onPress={() => setViewMode('weekly')}
            style={styles.chip}
          >
            Weekly
          </Chip>
          <Chip 
            selected={viewMode === 'monthly'} 
            onPress={() => setViewMode('monthly')}
            style={styles.chip}
          >
            Monthly
          </Chip>
        </View>
        
        <Button 
          mode="outlined" 
          onPress={exportData}
          icon="download"
          compact
        >
          Export
        </Button>
      </ThemedView>

      <ScrollView style={styles.content}>
        {viewMode === 'daily' && (
          <>
            {/* Daily Summary */}
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Title>Daily Summary - {selectedDate}</Title>
                <View style={styles.summaryStats}>
                  <View style={styles.statItem}>
                    <IconSymbol name="person.2.fill" size={24} color="#2196F3" />
                    <ThemedText style={styles.statNumber}>{currentRecord.totalStudents}</ThemedText>
                    <ThemedText style={styles.statLabel}>Total</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <IconSymbol name="checkmark.circle.fill" size={24} color="#4CAF50" />
                    <ThemedText style={styles.statNumber}>{currentRecord.present}</ThemedText>
                    <ThemedText style={styles.statLabel}>Present</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <IconSymbol name="xmark.circle.fill" size={24} color="#F44336" />
                    <ThemedText style={styles.statNumber}>{currentRecord.absent}</ThemedText>
                    <ThemedText style={styles.statLabel}>Absent</ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <IconSymbol name="chart.bar.fill" size={24} color="#FF9800" />
                    <ThemedText style={styles.statNumber}>{attendanceRate}%</ThemedText>
                    <ThemedText style={styles.statLabel}>Rate</ThemedText>
                  </View>
                </View>
              </Card.Content>
            </Card>

            {/* Detailed Records */}
            <Card style={styles.recordsCard}>
              <Card.Content>
                <Title>Detailed Records</Title>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Name</DataTable.Title>
                    <DataTable.Title>Roll No</DataTable.Title>
                    <DataTable.Title>Status</DataTable.Title>
                    <DataTable.Title>Time</DataTable.Title>
                  </DataTable.Header>

                  {currentRecord.records.map((record) => (
                    <DataTable.Row key={record.id}>
                      <DataTable.Cell>{record.name}</DataTable.Cell>
                      <DataTable.Cell>{record.rollNo}</DataTable.Cell>
                      <DataTable.Cell>
                        <Chip 
                          icon={record.status === 'present' ? 'check' : 'close'}
                          style={[
                            styles.statusChip,
                            { backgroundColor: record.status === 'present' ? '#E8F5E8' : '#FFEBEE' }
                          ]}
                          textStyle={{ 
                            color: record.status === 'present' ? '#4CAF50' : '#F44336' 
                          }}
                        >
                          {record.status}
                        </Chip>
                      </DataTable.Cell>
                      <DataTable.Cell>{record.time}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </Card.Content>
            </Card>
          </>
        )}

        {viewMode === 'weekly' && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title>Weekly Summary</Title>
              <View style={styles.weeklyStats}>
                <View style={styles.weeklyStatItem}>
                  <ThemedText style={styles.weeklyStatLabel}>Average Attendance</ThemedText>
                  <ThemedText style={styles.weeklyStatValue}>{weeklyStats.averageAttendance}%</ThemedText>
                </View>
                <View style={styles.weeklyStatItem}>
                  <ThemedText style={styles.weeklyStatLabel}>Best Day</ThemedText>
                  <ThemedText style={styles.weeklyStatValue}>
                    {weeklyStats.bestDay.date} ({weeklyStats.bestDay.rate}%)
                  </ThemedText>
                </View>
                <View style={styles.weeklyStatItem}>
                  <ThemedText style={styles.weeklyStatLabel}>Worst Day</ThemedText>
                  <ThemedText style={styles.weeklyStatValue}>
                    {weeklyStats.worstDay.date} ({weeklyStats.worstDay.rate}%)
                  </ThemedText>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {viewMode === 'monthly' && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Title>Monthly Summary</Title>
              <Paragraph>Monthly view implementation would go here</Paragraph>
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <View style={styles.actionButtons}>
              <Button 
                mode="outlined" 
                onPress={() => {/* Generate report */}}
                icon="file-document"
                style={styles.actionButton}
              >
                Generate Report
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => {/* Send to parents */}}
                icon="send"
                style={styles.actionButton}
              >
                Notify Parents
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  chipContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  chip: {
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    height: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: (width - 72) / 4,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  recordsCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  statusChip: {
    height: 28,
    borderRadius: 14,
    minWidth: 70,
    justifyContent: 'center',
  },
  weeklyStats: {
    marginTop: 20,
  },
  weeklyStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  weeklyStatLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
  weeklyStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  actionsCard: {
    marginBottom: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
  },
});