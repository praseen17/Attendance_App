import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useNetworkStatus, useNetworkSync, useNetworkQuality } from '@/hooks/useNetworkStatus';
import { NetworkStatusIndicator, OfflineBanner, ConnectionQualityIndicator } from '@/components/NetworkStatusIndicator';

/**
 * Network Status Screen Component
 * Requirements: 8.5 - Comprehensive network status display and management
 */
export function NetworkStatusScreen() {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [testSyncResult, setTestSyncResult] = useState<string | null>(null);

    // Network hooks
    const { networkStatus, checkConnectivity, waitForConnection } = useNetwork();
    const {
        isOnline,
        isOffline,
        connectionQuality,
        networkType,
        showOfflineNotification,
        dismissOfflineNotification
    } = useNetworkStatus();

    const { isSyncing, syncError, executeWithNetwork, clearSyncError } = useNetworkSync();
    const { qualityHistory, qualityTrend, isSuitableForSync } = useNetworkQuality();

    /**
     * Handle manual connectivity check
     * Requirements: 4.1 - Manual connectivity verification
     */
    const handleManualCheck = async () => {
        setIsRefreshing(true);
        try {
            const isConnected = await checkConnectivity();
            setTestSyncResult(isConnected ? 'Connection verified successfully' : 'No connection detected');
        } catch (error) {
            setTestSyncResult('Connection check failed');
        } finally {
            setIsRefreshing(false);
        }
    };

    /**
     * Test sync operation
     * Requirements: 4.1 - Network-dependent sync testing
     */
    const handleTestSync = async () => {
        const result = await executeWithNetwork(
            async () => {
                // Simulate sync operation
                await new Promise(resolve => setTimeout(resolve, 2000));
                return 'Sync operation completed successfully';
            },
            {
                waitForConnection: true,
                timeout: 10000,
                retryOnFailure: true
            }
        );

        setTestSyncResult(result || 'Sync operation failed');
    };

    /**
     * Test wait for connection
     * Requirements: 4.1 - Connection waiting functionality
     */
    const handleWaitForConnection = async () => {
        setIsRefreshing(true);
        try {
            const connected = await waitForConnection(15000);
            setTestSyncResult(connected ? 'Connection established' : 'Connection timeout');
        } catch (error) {
            setTestSyncResult('Wait for connection failed');
        } finally {
            setIsRefreshing(false);
        }
    };

    /**
     * Get status color based on connection state
     * Requirements: 8.5 - Visual status indicators
     */
    const getStatusColor = (isConnected: boolean) => {
        return isConnected ? '#10b981' : '#ef4444';
    };

    /**
     * Format timestamp for display
     * Requirements: 8.5 - Timestamp formatting
     */
    const formatTimestamp = (timestamp: Date) => {
        return timestamp.toLocaleString();
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleManualCheck}
                        colors={['#3b82f6']}
                        tintColor="#3b82f6"
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Network Status</Text>
                    <Text style={styles.headerSubtitle}>Monitor connectivity and sync operations</Text>
                </View>

                {/* Offline Banner */}
                <OfflineBanner />

                {/* Dismissible Notification */}
                {showOfflineNotification && (
                    <TouchableOpacity
                        onPress={dismissOfflineNotification}
                        style={styles.dismissibleNotification}
                    >
                        <Text style={styles.dismissibleText}>
                            📴 Connection lost. Tap to dismiss.
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Status Indicators Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status Indicators</Text>

                    <View style={styles.indicatorRow}>
                        <Text style={styles.indicatorLabel}>Compact:</Text>
                        <NetworkStatusIndicator variant="compact" />
                    </View>

                    <View style={styles.indicatorRow}>
                        <Text style={styles.indicatorLabel}>Detailed:</Text>
                        <NetworkStatusIndicator variant="detailed" showDetails />
                    </View>

                    <NetworkStatusIndicator variant="banner" />

                    <View style={styles.indicatorRow}>
                        <Text style={styles.indicatorLabel}>Quality:</Text>
                        <ConnectionQualityIndicator />
                        <Text style={styles.qualityText}>{connectionQuality}</Text>
                    </View>
                </View>

                {/* Current Status Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Status</Text>

                    <View style={styles.statusGrid}>
                        <View style={styles.statusCard}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(isOnline) }]} />
                            <Text style={styles.statusLabel}>Connection</Text>
                            <Text style={styles.statusValue}>{isOnline ? 'Online' : 'Offline'}</Text>
                        </View>

                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Network Type</Text>
                            <Text style={styles.statusValue}>{networkType}</Text>
                        </View>

                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Quality</Text>
                            <Text style={[styles.statusValue, { color: getStatusColor(isOnline) }]}>
                                {connectionQuality}
                            </Text>
                        </View>

                        <View style={styles.statusCard}>
                            <Text style={styles.statusLabel}>Sync Ready</Text>
                            <Text style={[styles.statusValue, { color: isSuitableForSync ? '#10b981' : '#ef4444' }]}>
                                {isSuitableForSync ? 'Yes' : 'No'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Detailed Information Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Detailed Information</Text>

                    <View style={styles.detailsContainer}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Internet Reachable:</Text>
                            <Text style={styles.detailValue}>
                                {networkStatus.isInternetReachable === null ? 'Unknown' :
                                    networkStatus.isInternetReachable ? 'Yes' : 'No'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Last Updated:</Text>
                            <Text style={styles.detailValue}>
                                {formatTimestamp(networkStatus.timestamp)}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quality Trend:</Text>
                            <Text style={[styles.detailValue, {
                                color: qualityTrend === 'improving' ? '#10b981' :
                                    qualityTrend === 'degrading' ? '#ef4444' : '#6b7280'
                            }]}>
                                {qualityTrend}
                            </Text>
                        </View>

                        {networkStatus.details && (
                            <>
                                {networkStatus.details.ssid && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Wi-Fi SSID:</Text>
                                        <Text style={styles.detailValue}>{networkStatus.details.ssid}</Text>
                                    </View>
                                )}

                                {networkStatus.details.strength && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Signal Strength:</Text>
                                        <Text style={styles.detailValue}>{networkStatus.details.strength} dBm</Text>
                                    </View>
                                )}

                                {networkStatus.details.ipAddress && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>IP Address:</Text>
                                        <Text style={styles.detailValue}>{networkStatus.details.ipAddress}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>

                {/* Quality History Section */}
                {qualityHistory.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quality History</Text>

                        <View style={styles.historyContainer}>
                            {qualityHistory.slice(-5).map((entry, index) => (
                                <View key={index} style={styles.historyItem}>
                                    <Text style={styles.historyTime}>
                                        {entry.timestamp.toLocaleTimeString()}
                                    </Text>
                                    <Text style={[styles.historyQuality, {
                                        color: entry.quality === 'excellent' || entry.quality === 'good' ? '#10b981' :
                                            entry.quality === 'fair' ? '#f59e0b' : '#ef4444'
                                    }]}>
                                        {entry.quality}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Test Operations Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Test Operations</Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={handleManualCheck}
                            style={[styles.testButton, styles.primaryButton]}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                                <Text style={styles.buttonText}>Check Connectivity</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleTestSync}
                            style={[styles.testButton, styles.secondaryButton]}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#3b82f6" />
                            ) : (
                                <Text style={[styles.buttonText, { color: '#3b82f6' }]}>Test Sync</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleWaitForConnection}
                            style={[styles.testButton, styles.warningButton]}
                            disabled={isRefreshing || isOnline}
                        >
                            <Text style={styles.buttonText}>Wait for Connection</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Test Results */}
                    {testSyncResult && (
                        <View style={styles.resultContainer}>
                            <Text style={styles.resultTitle}>Test Result:</Text>
                            <Text style={styles.resultText}>{testSyncResult}</Text>
                            <TouchableOpacity
                                onPress={() => setTestSyncResult(null)}
                                style={styles.clearButton}
                            >
                                <Text style={styles.clearButtonText}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Sync Error */}
                    {syncError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTitle}>Sync Error:</Text>
                            <Text style={styles.errorText}>{syncError}</Text>
                            <TouchableOpacity
                                onPress={clearSyncError}
                                style={styles.clearButton}
                            >
                                <Text style={styles.clearButtonText}>Clear Error</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 20,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#6b7280',
    },
    section: {
        backgroundColor: '#ffffff',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 16,
    },
    indicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    indicatorLabel: {
        fontSize: 14,
        color: '#6b7280',
        width: 80,
        marginRight: 12,
    },
    qualityText: {
        fontSize: 14,
        color: '#6b7280',
        marginLeft: 8,
        textTransform: 'capitalize',
    },
    statusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statusCard: {
        width: '48%',
        backgroundColor: '#f9fafb',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
    },
    statusLabel: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    statusValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        textTransform: 'capitalize',
    },
    detailsContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    detailLabel: {
        fontSize: 14,
        color: '#6b7280',
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1f2937',
        flex: 1,
        textAlign: 'right',
    },
    historyContainer: {
        backgroundColor: '#f9fafb',
        borderRadius: 8,
        padding: 12,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    historyTime: {
        fontSize: 12,
        color: '#6b7280',
    },
    historyQuality: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    buttonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    testButton: {
        width: '48%',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButton: {
        backgroundColor: '#3b82f6',
    },
    secondaryButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    warningButton: {
        backgroundColor: '#f59e0b',
        width: '100%',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    resultContainer: {
        backgroundColor: '#f0f9ff',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e40af',
        marginBottom: 4,
    },
    resultText: {
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 8,
    },
    errorContainer: {
        backgroundColor: '#fef2f2',
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#ef4444',
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#dc2626',
        marginBottom: 4,
    },
    errorText: {
        fontSize: 14,
        color: '#1f2937',
        marginBottom: 8,
    },
    clearButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#ffffff',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d1d5db',
    },
    clearButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
    },
    dismissibleNotification: {
        backgroundColor: '#f97316',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    dismissibleText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '500',
    },
});