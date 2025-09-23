import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetwork } from '@/contexts/NetworkContext';

interface NetworkStatusIndicatorProps {
    variant?: 'compact' | 'detailed' | 'banner';
    showDetails?: boolean;
    onPress?: () => void;
    style?: any;
}

/**
 * Network Status Indicator Component
 * Requirements: 8.5 - Network connectivity status indicators in UI
 */
export function NetworkStatusIndicator({
    variant = 'compact',
    showDetails = false,
    onPress,
    style
}: NetworkStatusIndicatorProps) {
    const { isOnline, networkType, connectionQuality, networkStatus } = useNetwork();

    /**
     * Get status color based on connection state and quality
     * Requirements: 8.5 - Visual status indicators
     */
    const getStatusColor = () => {
        if (!isOnline) return '#ef4444'; // Red for offline

        switch (connectionQuality) {
            case 'excellent': return '#10b981'; // Green
            case 'good': return '#10b981'; // Green
            case 'fair': return '#f59e0b'; // Yellow
            case 'poor': return '#f97316'; // Orange
            case 'none': return '#ef4444'; // Red
            default: return '#6b7280'; // Gray
        }
    };

    /**
     * Get status icon based on connection state
     * Requirements: 8.5 - Status icons
     */
    const getStatusIcon = () => {
        if (!isOnline) return '📴';

        switch (connectionQuality) {
            case 'excellent': return '📶';
            case 'good': return '📶';
            case 'fair': return '📶';
            case 'poor': return '📶';
            case 'none': return '📴';
            default: return '🌐';
        }
    };

    /**
     * Get status text based on connection state
     * Requirements: 8.5 - Status text descriptions
     */
    const getStatusText = () => {
        if (!isOnline) return 'Offline';

        switch (connectionQuality) {
            case 'excellent': return 'Excellent';
            case 'good': return 'Good';
            case 'fair': return 'Fair';
            case 'poor': return 'Poor';
            case 'none': return 'No Connection';
            default: return 'Connected';
        }
    };

    /**
     * Get detailed status message
     * Requirements: 8.5 - Detailed network information
     */
    const getDetailedMessage = () => {
        if (!isOnline) {
            return 'Working offline - Data will sync when connection is restored';
        }

        return `Connected via ${networkType} - Data syncing available`;
    };

    /**
     * Render compact variant
     * Requirements: 8.5 - Compact status display
     */
    const renderCompact = () => (
        <View style={[styles.compactContainer, { backgroundColor: getStatusColor() }, style]}>
            <Text style={styles.compactIcon}>{getStatusIcon()}</Text>
            <Text style={styles.compactText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
    );

    /**
     * Render detailed variant
     * Requirements: 8.5 - Detailed status display
     */
    const renderDetailed = () => (
        <View style={[styles.detailedContainer, style]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <View style={styles.detailedContent}>
                <Text style={styles.detailedTitle}>
                    {getStatusIcon()} {getStatusText()}
                </Text>
                <Text style={styles.detailedSubtitle}>{networkType}</Text>
                {showDetails && (
                    <Text style={styles.detailedDetails}>
                        Last updated: {networkStatus.timestamp.toLocaleTimeString()}
                    </Text>
                )}
            </View>
        </View>
    );

    /**
     * Render banner variant
     * Requirements: 8.5 - Banner status notifications
     */
    const renderBanner = () => (
        <View style={[styles.bannerContainer, { backgroundColor: getStatusColor() }, style]}>
            <Text style={styles.bannerIcon}>{getStatusIcon()}</Text>
            <View style={styles.bannerContent}>
                <Text style={styles.bannerText}>{getDetailedMessage()}</Text>
            </View>
        </View>
    );

    const content = () => {
        switch (variant) {
            case 'compact': return renderCompact();
            case 'detailed': return renderDetailed();
            case 'banner': return renderBanner();
            default: return renderCompact();
        }
    };

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {content()}
            </TouchableOpacity>
        );
    }

    return content();
}

/**
 * Offline Mode Banner Component
 * Requirements: 1.5, 8.5 - Offline mode notifications
 */
export function OfflineBanner({ style }: { style?: any }) {
    const { isOffline } = useNetwork();

    if (!isOffline) return null;

    return (
        <View style={[styles.offlineBanner, style]}>
            <Text style={styles.offlineBannerIcon}>📴</Text>
            <Text style={styles.offlineBannerText}>
                You&apos;re offline. Changes will sync when connection is restored.
            </Text>
        </View>
    );
}

/**
 * Connection Quality Indicator Component
 * Requirements: 8.5 - Connection quality visualization
 */
export function ConnectionQualityIndicator({ style }: { style?: any }) {
    const { connectionQuality, isOnline } = useNetwork();

    if (!isOnline) return null;

    const getQualityBars = () => {
        const bars = [];
        const maxBars = 4;
        let activeBars = 0;

        switch (connectionQuality) {
            case 'excellent': activeBars = 4; break;
            case 'good': activeBars = 3; break;
            case 'fair': activeBars = 2; break;
            case 'poor': activeBars = 1; break;
            default: activeBars = 0; break;
        }

        for (let i = 0; i < maxBars; i++) {
            bars.push(
                <View
                    key={i}
                    style={[
                        styles.qualityBar,
                        {
                            height: (i + 1) * 3 + 2,
                            backgroundColor: i < activeBars ? '#10b981' : '#e5e7eb'
                        }
                    ]}
                />
            );
        }

        return bars;
    };

    return (
        <View style={[styles.qualityContainer, style]}>
            {getQualityBars()}
        </View>
    );
}

const styles = StyleSheet.create({
    // Compact variant styles
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 80,
    },
    compactIcon: {
        fontSize: 12,
        marginRight: 4,
    },
    compactText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },

    // Detailed variant styles
    detailedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    detailedContent: {
        flex: 1,
    },
    detailedTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    detailedSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    detailedDetails: {
        fontSize: 10,
        color: '#9ca3af',
        marginTop: 2,
    },

    // Banner variant styles
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    bannerIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    bannerContent: {
        flex: 1,
    },
    bannerText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },

    // Offline banner styles
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f97316',
        padding: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
    },
    offlineBannerIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    offlineBannerText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },

    // Connection quality indicator styles
    qualityContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 16,
        width: 20,
    },
    qualityBar: {
        width: 3,
        marginRight: 1,
        borderRadius: 1,
    },
});