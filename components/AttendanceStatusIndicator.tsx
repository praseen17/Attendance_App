import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { attendanceStatusService, AttendanceStatus, AttendanceStatusType } from '@/services/attendanceStatusService';

interface AttendanceStatusIndicatorProps {
    variant?: 'compact' | 'detailed' | 'banner';
    showProgress?: boolean;
    showIcon?: boolean;
    style?: any;
}

/**
 * Attendance Status Indicator Component
 * Requirements: 8.1, 8.4 - Real-time status indicators and user feedback
 */
export function AttendanceStatusIndicator({
    variant = 'detailed',
    showProgress = true,
    showIcon = true,
    style
}: AttendanceStatusIndicatorProps) {
    const [status, setStatus] = React.useState<AttendanceStatus>(
        attendanceStatusService.getCurrentStatus()
    );

    React.useEffect(() => {
        const unsubscribe = attendanceStatusService.onStatusChange((newStatus) => {
            setStatus(newStatus);
        });

        return unsubscribe;
    }, []);

    /**
     * Get status color based on status type
     * Requirements: 8.1 - Visual status indicators
     */
    const getStatusColor = (type: AttendanceStatusType): string => {
        return attendanceStatusService.getStatusColor(type);
    };

    /**
     * Get status icon based on status type
     * Requirements: 8.1 - Visual status indicators
     */
    const getStatusIcon = (type: AttendanceStatusType): string => {
        return attendanceStatusService.getStatusIcon(type);
    };

    /**
     * Render progress bar for operations with progress
     * Requirements: 8.1, 8.2 - Progress indicators
     */
    const renderProgressBar = () => {
        if (!showProgress || status.progress === undefined) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${status.progress}%`,
                                backgroundColor: getStatusColor(status.type)
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {Math.round(status.progress)}%
                </Text>
            </View>
        );
    };

    /**
     * Render compact variant
     * Requirements: 8.1 - Compact status display
     */
    const renderCompact = () => (
        <View style={[styles.compactContainer, { backgroundColor: getStatusColor(status.type) }, style]}>
            {showIcon && (
                <Text style={styles.compactIcon}>{getStatusIcon(status.type)}</Text>
            )}
            <Text style={styles.compactText}>{status.message}</Text>
            {(status.type === 'connecting' || status.type === 'processing' || status.type === 'syncing') && (
                <ActivityIndicator size="small" color="#ffffff" style={styles.compactSpinner} />
            )}
        </View>
    );

    /**
     * Render detailed variant
     * Requirements: 8.1, 8.4 - Detailed status display with feedback
     */
    const renderDetailed = () => (
        <View style={[styles.detailedContainer, style]}>
            <View style={styles.statusHeader}>
                <View style={styles.statusIconContainer}>
                    {(status.type === 'connecting' || status.type === 'processing' || status.type === 'syncing') ? (
                        <ActivityIndicator size="small" color={getStatusColor(status.type)} />
                    ) : showIcon ? (
                        <Text style={[styles.statusIcon, { color: getStatusColor(status.type) }]}>
                            {getStatusIcon(status.type)}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.statusContent}>
                    <Text style={[styles.statusMessage, { color: getStatusColor(status.type) }]}>
                        {status.message}
                    </Text>
                    {status.details && (
                        <Text style={styles.statusDetails}>{status.details}</Text>
                    )}
                    <Text style={styles.statusTimestamp}>
                        {status.timestamp.toLocaleTimeString()}
                    </Text>
                </View>
            </View>
            {renderProgressBar()}
        </View>
    );

    /**
     * Render banner variant
     * Requirements: 8.1, 8.3 - Banner notifications for important status
     */
    const renderBanner = () => (
        <View style={[styles.bannerContainer, { backgroundColor: getStatusColor(status.type) }, style]}>
            {showIcon && (
                <Text style={styles.bannerIcon}>{getStatusIcon(status.type)}</Text>
            )}
            <View style={styles.bannerContent}>
                <Text style={styles.bannerMessage}>{status.message}</Text>
                {status.details && (
                    <Text style={styles.bannerDetails}>{status.details}</Text>
                )}
            </View>
            {(status.type === 'connecting' || status.type === 'processing' || status.type === 'syncing') && (
                <ActivityIndicator size="small" color="#ffffff" />
            )}
        </View>
    );

    switch (variant) {
        case 'compact':
            return renderCompact();
        case 'banner':
            return renderBanner();
        case 'detailed':
        default:
            return renderDetailed();
    }
}

const styles = StyleSheet.create({
    // Compact variant styles
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        minHeight: 32,
    },
    compactIcon: {
        fontSize: 14,
        marginRight: 6,
        color: '#ffffff',
    },
    compactText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    compactSpinner: {
        marginLeft: 8,
    },

    // Detailed variant styles
    detailedContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    statusIconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statusIcon: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statusContent: {
        flex: 1,
    },
    statusMessage: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    statusDetails: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    statusTimestamp: {
        fontSize: 10,
        color: '#9ca3af',
    },

    // Progress bar styles
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        marginRight: 8,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: '600',
        minWidth: 35,
        textAlign: 'right',
    },

    // Banner variant styles
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginHorizontal: 16,
        marginVertical: 4,
    },
    bannerIcon: {
        fontSize: 16,
        marginRight: 8,
        color: '#ffffff',
    },
    bannerContent: {
        flex: 1,
    },
    bannerMessage: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    bannerDetails: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
});