import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSync } from '@/hooks/useSync';

interface OfflineModeIndicatorProps {
    variant?: 'banner' | 'badge' | 'status' | 'detailed';
    showDetails?: boolean;
    showPendingCount?: boolean;
    onPress?: () => void;
    style?: any;
}

/**
 * Offline Mode Indicator Component
 * Requirements: 8.5 - Offline mode status display with clear visual indicators
 */
export function OfflineModeIndicator({
    variant = 'banner',
    showDetails = true,
    showPendingCount = true,
    onPress,
    style
}: OfflineModeIndicatorProps) {
    const { isOffline, isOnline, connectionQuality, networkType } = useNetworkStatus();
    const { syncStats, hasPendingRecords } = useSync();
    const pulseAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (isOffline) {
            // Start pulsing animation for offline indicator
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.7,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isOffline, pulseAnim]);

    /**
     * Get offline status message
     * Requirements: 8.5 - Clear offline status messaging
     */
    const getOfflineMessage = (): string => {
        if (isOnline) {
            return `Connected via ${networkType}`;
        }

        if (hasPendingRecords) {
            return `Offline - ${syncStats.pendingRecords} records pending sync`;
        }

        return 'Working offline - Data will sync when connection is restored';
    };

    /**
     * Get offline status details
     * Requirements: 8.5 - Detailed offline information
     */
    const getOfflineDetails = (): string => {
        if (isOnline) {
            return `Connection quality: ${connectionQuality}`;
        }

        const details = [];
        if (syncStats.pendingRecords > 0) {
            details.push(`${syncStats.pendingRecords} attendance records waiting to sync`);
        }
        if (syncStats.lastSyncTime) {
            const lastSync = new Date(syncStats.lastSyncTime);
            details.push(`Last sync: ${lastSync.toLocaleString()}`);
        } else {
            details.push('No previous sync found');
        }

        return details.join(' • ');
    };

    /**
     * Render banner variant
     * Requirements: 8.5 - Banner-style offline notifications
     */
    const renderBanner = () => {
        if (isOnline && !hasPendingRecords) return null;

        return (
            <TouchableOpacity
                style={[
                    styles.bannerContainer,
                    {
                        backgroundColor: isOffline ? '#f97316' : '#f59e0b',
                    },
                    style
                ]}
                onPress={onPress}
                activeOpacity={0.8}
            >
                <Animated.View
                    style={[
                        styles.bannerContent,
                        { opacity: isOffline ? pulseAnim : 1 }
                    ]}
                >
                    <View style={styles.bannerIcon}>
                        <Ionicons
                            name={isOffline ? "cloud-offline" : "cloud-upload"}
                            size={20}
                            color="#ffffff"
                        />
                    </View>
                    <View style={styles.bannerText}>
                        <Text style={styles.bannerMessage}>
                            {getOfflineMessage()}
                        </Text>
                        {showDetails && (
                            <Text style={styles.bannerDetails}>
                                {getOfflineDetails()}
                            </Text>
                        )}
                    </View>
                    {showPendingCount && hasPendingRecords && (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>
                                {syncStats.pendingRecords}
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </TouchableOpacity>
        );
    };

    /**
     * Render badge variant
     * Requirements: 8.5 - Compact badge-style offline indicator
     */
    const renderBadge = () => {
        if (isOnline && !hasPendingRecords) return null;

        return (
            <Animated.View
                style={[
                    styles.badgeContainer,
                    {
                        backgroundColor: isOffline ? '#ef4444' : '#f59e0b',
                        opacity: isOffline ? pulseAnim : 1,
                    },
                    style
                ]}
            >
                <Ionicons
                    name={isOffline ? "cloud-offline" : "cloud-upload"}
                    size={12}
                    color="#ffffff"
                />
                {showPendingCount && hasPendingRecords && (
                    <Text style={styles.badgeText}>
                        {syncStats.pendingRecords}
                    </Text>
                )}
            </Animated.View>
        );
    };

    /**
     * Render status variant
     * Requirements: 8.5 - Status line offline indicator
     */
    const renderStatus = () => (
        <TouchableOpacity
            style={[styles.statusContainer, style]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Animated.View
                style={[
                    styles.statusDot,
                    {
                        backgroundColor: isOffline ? '#ef4444' : '#10b981',
                        opacity: isOffline ? pulseAnim : 1,
                    }
                ]}
            />
            <Text style={[
                styles.statusText,
                { color: isOffline ? '#ef4444' : '#10b981' }
            ]}>
                {isOffline ? 'Offline' : 'Online'}
            </Text>
            {showPendingCount && hasPendingRecords && (
                <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                        {syncStats.pendingRecords}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );

    /**
     * Render detailed variant
     * Requirements: 8.5 - Detailed offline mode display
     */
    const renderDetailed = () => (
        <View style={[styles.detailedContainer, style]}>
            <View style={styles.detailedHeader}>
                <Animated.View
                    style={[
                        styles.detailedIcon,
                        {
                            backgroundColor: isOffline ? '#ef4444' : '#10b981',
                            opacity: isOffline ? pulseAnim : 1,
                        }
                    ]}
                >
                    <Ionicons
                        name={isOffline ? "cloud-offline" : "cloud-done"}
                        size={24}
                        color="#ffffff"
                    />
                </Animated.View>
                <View style={styles.detailedContent}>
                    <Text style={styles.detailedTitle}>
                        {isOffline ? 'Offline Mode' : 'Online'}
                    </Text>
                    <Text style={styles.detailedSubtitle}>
                        {getOfflineMessage()}
                    </Text>
                </View>
                {showPendingCount && hasPendingRecords && (
                    <View style={styles.detailedBadge}>
                        <Text style={styles.detailedBadgeText}>
                            {syncStats.pendingRecords}
                        </Text>
                    </View>
                )}
            </View>

            {showDetails && (
                <View style={styles.detailedDetails}>
                    <Text style={styles.detailedDetailsText}>
                        {getOfflineDetails()}
                    </Text>

                    {isOffline && (
                        <View style={styles.offlineFeatures}>
                            <Text style={styles.featuresTitle}>Available offline:</Text>
                            <View style={styles.featuresList}>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={14} color="#10b981" />
                                    <Text style={styles.featureText}>Mark attendance</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={14} color="#10b981" />
                                    <Text style={styles.featureText}>View student lists</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <Ionicons name="checkmark" size={14} color="#10b981" />
                                    <Text style={styles.featureText}>Local data storage</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    switch (variant) {
        case 'badge':
            return renderBadge();
        case 'status':
            return renderStatus();
        case 'detailed':
            return renderDetailed();
        case 'banner':
        default:
            return renderBanner();
    }
}

const styles = StyleSheet.create({
    // Banner variant styles
    bannerContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    bannerIcon: {
        marginRight: 12,
    },
    bannerText: {
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
    pendingBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 8,
    },
    pendingBadgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },

    // Badge variant styles
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 24,
        minHeight: 24,
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
    },

    // Status variant styles
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statusBadge: {
        backgroundColor: '#f59e0b',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    statusBadgeText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '700',
    },

    // Detailed variant styles
    detailedContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    detailedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailedIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    detailedContent: {
        flex: 1,
    },
    detailedTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    detailedSubtitle: {
        fontSize: 14,
        color: '#6b7280',
    },
    detailedBadge: {
        backgroundColor: '#f59e0b',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    detailedBadgeText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    detailedDetails: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
    },
    detailedDetailsText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 12,
    },
    offlineFeatures: {
        marginTop: 8,
    },
    featuresTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8,
    },
    featuresList: {
        gap: 4,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureText: {
        fontSize: 12,
        color: '#6b7280',
        marginLeft: 6,
    },
});