import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AttendanceStatusIndicator } from './AttendanceStatusIndicator';
import { NetworkStatusIndicator, OfflineBanner } from './NetworkStatusIndicator';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { StatusDashboard } from './StatusDashboard';
import { SuccessConfirmation, useSuccessConfirmation } from './SuccessConfirmation';
import { ProgressIndicator, useProgressIndicator } from './ProgressIndicator';
import { OfflineModeIndicator } from './OfflineModeIndicator';
import { attendanceStatusService } from '@/services/attendanceStatusService';

/**
 * Demo component showcasing all status indicators
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Comprehensive status indicator demonstration
 */
export function StatusIndicatorDemo() {
    const { confirmation, showSuccess, hideSuccess } = useSuccessConfirmation();
    const { progress, showProgress, updateProgress, hideProgress, completeProgress } = useProgressIndicator();
    const [demoProgress, setDemoProgress] = React.useState(0);

    /**
     * Demo success confirmation
     * Requirements: 8.4 - Success confirmations
     */
    const demoSuccessConfirmation = (variant: 'toast' | 'modal' | 'inline') => {
        showSuccess(
            'Student marked present',
            'John Doe - Confidence: 95% | 15/30 students',
            variant
        );
    };

    /**
     * Demo progress indicator
     * Requirements: 8.2 - Progress indicators
     */
    const demoProgressIndicator = () => {
        showProgress('Syncing attendance records...', 0, '0/25 records');

        const interval = setInterval(() => {
            setDemoProgress(prev => {
                const newProgress = prev + 10;
                if (newProgress >= 100) {
                    clearInterval(interval);
                    completeProgress('Sync completed', 'All records synced successfully');
                    setDemoProgress(0);
                    return 100;
                }
                updateProgress(newProgress, 'Syncing attendance records...', `${Math.floor(newProgress / 4)}/25 records`);
                return newProgress;
            });
        }, 500);
    };

    /**
     * Demo attendance status updates
     * Requirements: 8.1 - Attendance status indicators
     */
    const demoAttendanceStatus = (type: 'success' | 'error' | 'capturing' | 'processing') => {
        switch (type) {
            case 'success':
                attendanceStatusService.setSuccess(
                    'Student recognized successfully',
                    'Jane Smith - Confidence: 92%'
                );
                break;
            case 'error':
                attendanceStatusService.setError(
                    'Face recognition failed',
                    'Poor lighting conditions - Try manual entry'
                );
                break;
            case 'capturing':
                attendanceStatusService.setCapturing(
                    'Capturing attendance...',
                    'Point camera at students',
                    45
                );
                break;
            case 'processing':
                attendanceStatusService.setProcessing(
                    'Processing face data...',
                    'Analyzing facial features',
                    75
                );
                break;
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Status Indicators Demo</Text>

            {/* Status Dashboard */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Status Dashboard</Text>
                <StatusDashboard variant="full" showHistory={true} />
            </View>

            {/* Attendance Status Indicators */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Attendance Status</Text>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Compact:</Text>
                    <AttendanceStatusIndicator variant="compact" />
                </View>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Detailed:</Text>
                    <AttendanceStatusIndicator variant="detailed" showProgress={true} />
                </View>

                <AttendanceStatusIndicator variant="banner" />

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#10b981' }]}
                        onPress={() => demoAttendanceStatus('success')}
                    >
                        <Text style={styles.buttonText}>Success</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#ef4444' }]}
                        onPress={() => demoAttendanceStatus('error')}
                    >
                        <Text style={styles.buttonText}>Error</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#3b82f6' }]}
                        onPress={() => demoAttendanceStatus('capturing')}
                    >
                        <Text style={styles.buttonText}>Capturing</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#8b5cf6' }]}
                        onPress={() => demoAttendanceStatus('processing')}
                    >
                        <Text style={styles.buttonText}>Processing</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Network Status Indicators */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Network Status</Text>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Compact:</Text>
                    <NetworkStatusIndicator variant="compact" />
                </View>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Detailed:</Text>
                    <NetworkStatusIndicator variant="detailed" showDetails={true} />
                </View>

                <NetworkStatusIndicator variant="banner" />
                <OfflineBanner />
            </View>

            {/* Offline Mode Indicators */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Offline Mode</Text>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Badge:</Text>
                    <OfflineModeIndicator variant="badge" />
                </View>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Status:</Text>
                    <OfflineModeIndicator variant="status" />
                </View>

                <OfflineModeIndicator variant="banner" showDetails={true} />
                <OfflineModeIndicator variant="detailed" showDetails={true} />
            </View>

            {/* Sync Status Indicators */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sync Status</Text>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Compact:</Text>
                    <SyncStatusIndicator compact={true} />
                </View>

                <View style={styles.demoRow}>
                    <Text style={styles.demoLabel}>Detailed:</Text>
                    <SyncStatusIndicator showDetails={true} />
                </View>
            </View>

            {/* Success Confirmations */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Success Confirmations</Text>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#10b981' }]}
                        onPress={() => demoSuccessConfirmation('toast')}
                    >
                        <Text style={styles.buttonText}>Toast</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#10b981' }]}
                        onPress={() => demoSuccessConfirmation('modal')}
                    >
                        <Text style={styles.buttonText}>Modal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.demoButton, { backgroundColor: '#10b981' }]}
                        onPress={() => demoSuccessConfirmation('inline')}
                    >
                        <Text style={styles.buttonText}>Inline</Text>
                    </TouchableOpacity>
                </View>

                <SuccessConfirmation
                    visible={false}
                    message="Demo inline success"
                    details="This is an inline success confirmation"
                    variant="inline"
                />
            </View>

            {/* Progress Indicators */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Progress Indicators</Text>

                <TouchableOpacity
                    style={[styles.demoButton, { backgroundColor: '#3b82f6', alignSelf: 'flex-start' }]}
                    onPress={demoProgressIndicator}
                >
                    <Text style={styles.buttonText}>Demo Progress</Text>
                </TouchableOpacity>

                <ProgressIndicator
                    visible={true}
                    progress={65}
                    message="Demo linear progress"
                    details="15/25 records processed"
                    variant="linear"
                    showPercentage={true}
                />

                <ProgressIndicator
                    visible={true}
                    progress={80}
                    message="Demo circular progress"
                    details="Processing data..."
                    variant="circular"
                    showPercentage={true}
                />

                <ProgressIndicator
                    visible={true}
                    progress={45}
                    message="Demo steps progress"
                    details="Step 2 of 5"
                    variant="steps"
                    showPercentage={true}
                />
            </View>

            {/* Success and Progress Overlays */}
            <SuccessConfirmation
                visible={confirmation.visible}
                message={confirmation.message}
                details={confirmation.details}
                variant={confirmation.variant}
                onDismiss={hideSuccess}
            />

            <ProgressIndicator
                visible={progress.visible}
                progress={progress.progress}
                message={progress.message}
                details={progress.details}
                variant="linear"
                showPercentage={true}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        textAlign: 'center',
        marginVertical: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    demoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 12,
    },
    demoLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6b7280',
        width: 80,
    },
    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    demoButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
});