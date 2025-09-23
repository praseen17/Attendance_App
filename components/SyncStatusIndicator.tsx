import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '../hooks/useSync';
import { networkService } from '../services/networkService';

interface SyncStatusIndicatorProps {
    showDetails?: boolean;
    onPress?: () => void;
    compact?: boolean;
}

/**
 * Sync status indicator component
 * Requirements: 8.2, 8.3 - Real-time status indicators and user feedback
 */
export function SyncStatusIndicator({
    showDetails = true,
    onPress,
    compact = false
}: SyncStatusIndicatorProps) {
    const {
        isSyncing,
        syncProgress,
        syncStats,
        isAutoSyncActive,
        getSyncStatusText,
        getSyncProgressText,
        getLastSyncText,
        hasPendingRecords,
        triggerSync
    } = useSync();

    const isOnline = networkService.isOnline();

    /**
     * Get sync status icon and color
     */
    const getSyncIcon = () => {
        if (isSyncing) {
            return { name: 'sync' as const, color: '#007AFF' };
        }

        if (!isOnline) {
            return { name: 'cloud-offline' as const, color: '#FF3B30' };
        }

        if (hasPendingRecords) {
            return { name: 'cloud-upload' as const, color: '#FF9500' };
        }

        return { name: 'cloud-done' as const, color: '#34C759' };
    };

    /**
     * Handle sync indicator press
     */
    const handlePress = async () => {
        if (onPress) {
            onPress();
            return;
        }

        if (!isSyncing && isOnline && hasPendingRecords) {
            try {
                await triggerSync();
            } catch (error) {
                console.error('Manual sync failed:', error);
            }
        }
    };

    const { name: iconName, color: iconColor } = getSyncIcon();

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.compactContainer, { opacity: isOnline ? 1 : 0.6 }]}
                onPress={handlePress}
                disabled={isSyncing}
            >
                {isSyncing ? (
                    <ActivityIndicator size="small" color={iconColor} />
                ) : (
                    <Ionicons name={iconName} size={20} color={iconColor} />
                )}
                {hasPendingRecords && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{syncStats.pendingRecords}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.container, { opacity: isOnline ? 1 : 0.6 }]}
            onPress={handlePress}
            disabled={isSyncing}
        >
            <View style={styles.iconContainer}>
                {isSyncing ? (
                    <ActivityIndicator size="small" color={iconColor} />
                ) : (
                    <Ionicons name={iconName} size={24} color={iconColor} />
                )}
                {hasPendingRecords && !isSyncing && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{syncStats.pendingRecords}</Text>
                    </View>
                )}
            </View>

            {showDetails && (
                <View style={styles.textContainer}>
                    <Text style={styles.statusText}>
                        {isSyncing ? getSyncProgressText() : getSyncStatusText()}
                    </Text>

                    {!isSyncing && (
                        <Text style={styles.lastSyncText}>
                            Last sync: {getLastSyncText()}
                        </Text>
                    )}

                    {isSyncing && syncProgress && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${syncProgress.percentage}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {Math.round(syncProgress.percentage)}%
                            </Text>
                        </View>
                    )}

                    {!isOnline && (
                        <Text style={styles.offlineText}>
                            Device is offline
                        </Text>
                    )}

                    {!isAutoSyncActive && isOnline && (
                        <Text style={styles.warningText}>
                            Auto sync is disabled
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E9ECEF',
    },
    compactContainer: {
        position: 'relative',
        padding: 8,
    },
    iconContainer: {
        position: 'relative',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C1C1E',
        marginBottom: 2,
    },
    lastSyncText: {
        fontSize: 12,
        color: '#8E8E93',
    },
    offlineText: {
        fontSize: 12,
        color: '#FF3B30',
        fontWeight: '500',
    },
    warningText: {
        fontSize: 12,
        color: '#FF9500',
        fontWeight: '500',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: '#E9ECEF',
        borderRadius: 2,
        marginRight: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: '#8E8E93',
        minWidth: 35,
        textAlign: 'right',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});