import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { AttendanceStatusIndicator } from './AttendanceStatusIndicator';
import { NetworkStatusIndicator, OfflineBanner } from './NetworkStatusIndicator';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';
import { attendanceStatusService } from '@/services/attendanceStatusService';

interface StatusDashboardProps {
    variant?: 'full' | 'compact' | 'minimal';
    showHistory?: boolean;
    onStatusPress?: () => void;
    style?: any;
}

/**
 * Comprehensive Status Dashboard Component
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - All status indicators and user feedback
 */
export function StatusDashboard({
    variant = 'full',
    showHistory = false,
    onStatusPress,
    style
}: StatusDashboardProps) {
    const { isOnline, isOffline, connectionQuality, networkType } = useNetworkStatus();
    const { isSyncing, syncStats, hasPendingRecords } = useSync();
    const [statusHistory, setStatusHistory] = React.useState(
        attendanceStatusService.getStatusHistory(5)
    );

    React.useEffect(() => {
        const unsubscribe = attendanceStatusService.onStatusChange(() => {
            setStatusHistory(attendanceStatusService.getStatusHistory(5));
        });

        return unsubscribe;
    }, []);

    /**
     * Get overall system status
     * Requirements: 8.1 - System status overview
     */
    const getSystemStatus = () => {
        if (isOffline) return { status: 'offline', message: 'System Offline' };
        if (isSyncing) return { status: 'syncing', message: 'Syncing Data' };
        if (hasPendingRecords) return { status: 'pending', message: 'Sync Pending' };
        return { status: 'ready', message: 'System Ready' };
    };

    /**
     * Render minimal variant
     * Requirements: 8.1 - Minimal status display
     */
    const renderMinimal = () => {
        const systemStatus = getSystemStatus();
        return (
            <View style={[styles.minimalContainer, style]}>
                <View style={[styles.statusDot, { backgroundColor: getSystemStatusColor(systemStatus.status) }]} />
                <Text style={styles.minimalText}>{systemStatus.message}</Text>
            </View>
        );
    };

    /**
     * Render compact variant
     * Requirements: 8.1, 8.2, 8.5 - Compact status overview
     */
    const renderCompact = () => (
        <View style={[styles.compactContainer, style]}>
            <View style={styles.compactRow}>
                <AttendanceStatusIndicator variant="compact" style={styles.compactStatus} />
                <NetworkStatusIndicator variant="compact" style={styles.compactNetwork} />
            </View>
            {(isSyncing || hasPendingRecords) && (
                <View style={styles.compactSyncRow}>
                    <SyncStatusIndicator compact={true} />
                </View>
            )}
        </View>
    );

    /**
     * Render full variant
     * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5 - Complete status dashboard
     */
    const renderFull = () => (
        <View style={[styles.fullContainer, style]}>
            {/* Offline Banner */}
            <OfflineBanner />

            {/* Main Status Indicators */}
            <View style={styles.statusGrid}>
                <View style={styles.statusCard}>
                    <Text style={styles.cardTitle}>Attendance Status</Text>
                    <AttendanceStatusIndicator variant="detailed" />
                </View>

                <View style={styles.statusCard}>
                    <Text style={styles.cardTitle}>Network Status</Text>
                    <NetworkStatusIndicator variant="detailed" showDetails={true} />
                </View>

                <View style={styles.statusCard}>
                    <Text style={styles.cardTitle}>Sync Status</Text>
                    <SyncStatusIndicator showDetails={true} />
                </View>
            </View>

            {/* System Overview */}
            <View style={styles.overviewCard}>
                <Text style={styles.cardTitle}>System Overview</Text>
                <View style={styles.overviewGrid}>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>Connection</Text>
                        <Text style={[styles.overviewValue, { color: isOnline ? '#10b981' : '#ef4444' }]}>
                            {isOnline ? `${connectionQuality} (${networkType})` : 'Offline'}
                        </Text>
                    </View>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>Pending Sync</Text>
                        <Text style={[styles.overviewValue, { color: hasPendingRecords ? '#f59e0b' : '#10b981' }]}>
                            {syncStats.pendingRecords} records
                        </Text>
                    </View>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>Last Sync</Text>
                        <Text style={styles.overviewValue}>
                            {syncStats.lastSyncTime ? syncStats.lastSyncTime.toLocaleTimeString() : 'Never'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Status History */}
            {showHistory && statusHistory.length > 0 && (
                <View style={styles.historyCard}>
                    <Text style={styles.cardTitle}>Recent Activity</Text>
                    <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                        {statusHistory.map((status, index) => (
                            <TouchableOpacity
                                key={`${status.timestamp.getTime()}-${index}`}
                                style={styles.historyItem}
                                onPress={onStatusPress}
                            >
                                <View style={[
                                    styles.historyDot,
                                    { backgroundColor: attendanceStatusService.getStatusColor(status.type) }
                                ]} />
                                <View style={styles.historyContent}>
                                    <Text style={styles.historyMessage}>{status.message}</Text>
                                    {status.details && (
                                        <Text style={styles.historyDetails}>{status.details}</Text>
                                    )}
                                    <Text style={styles.historyTime}>
                                        {status.timestamp.toLocaleTimeString()}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );

    /**
     * Get system status color
     * Requirements: 8.1 - Visual status indicators
     */
    const getSystemStatusColor = (status: string): string => {
        switch (status) {
            case 'ready': return '#10b981';
            case 'syncing': return '#3b82f6';
            case 'pending': return '#f59e0b';
            case 'offline': return '#6b7280';
            default: return '#6b7280';
        }
    };

    switch (variant) {
        case 'minimal':
            return renderMinimal();
        case 'compact':
            return renderCompact();
        case 'full':
        default:
            return renderFull();
    }
}

const styles = StyleSheet.create({
    // Minimal variant styles
    minimalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    minimalText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '500',
    },

    // Compact variant styles
    compactContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    compactStatus: {
        flex: 1,
    },
    compactNetwork: {
        flex: 1,
    },
    compactSyncRow: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },

    // Full variant styles
    fullContainer: {
        flex: 1,
    },
    statusGrid: {
        gap: 16,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    statusCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 12,
    },

    // Overview card styles
    overviewCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    overviewGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    overviewItem: {
        flex: 1,
        alignItems: 'center',
    },
    overviewLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
        textAlign: 'center',
    },
    overviewValue: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    // History card styles
    historyCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    historyList: {
        flex: 1,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    historyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 6,
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyMessage: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
        marginBottom: 2,
    },
    historyDetails: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 2,
    },
    historyTime: {
        fontSize: 10,
        color: '#9ca3af',
    },
});