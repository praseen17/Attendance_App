import React from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProgressIndicatorProps {
    visible: boolean;
    progress: number; // 0-100
    message: string;
    details?: string;
    variant?: 'linear' | 'circular' | 'steps';
    showPercentage?: boolean;
    showIcon?: boolean;
    animated?: boolean;
    style?: any;
}

/**
 * Progress Indicator Component
 * Requirements: 8.2 - Sync progress indicators with completion percentage
 */
export function ProgressIndicator({
    visible,
    progress,
    message,
    details,
    variant = 'linear',
    showPercentage = true,
    showIcon = true,
    animated = true,
    style
}: ProgressIndicatorProps) {
    const progressAnim = React.useRef(new Animated.Value(0)).current;
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, fadeAnim]);

    React.useEffect(() => {
        if (animated) {
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 500,
                useNativeDriver: false,
            }).start();
        } else {
            progressAnim.setValue(progress);
        }
    }, [progress, animated, progressAnim]);

    /**
     * Get progress color based on completion
     * Requirements: 8.2 - Visual progress feedback
     */
    const getProgressColor = (): string => {
        if (progress >= 100) return '#10b981'; // Green for complete
        if (progress >= 75) return '#3b82f6'; // Blue for high progress
        if (progress >= 50) return '#f59e0b'; // Amber for medium progress
        return '#6b7280'; // Gray for low progress
    };

    /**
     * Render linear progress bar
     * Requirements: 8.2 - Linear progress visualization
     */
    const renderLinear = () => (
        <View style={[styles.linearContainer, style]}>
            <View style={styles.linearHeader}>
                {showIcon && (
                    <View style={styles.iconContainer}>
                        {progress >= 100 ? (
                            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                        ) : (
                            <ActivityIndicator size="small" color={getProgressColor()} />
                        )}
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={styles.message}>{message}</Text>
                    {details && (
                        <Text style={styles.details}>{details}</Text>
                    )}
                </View>
                {showPercentage && (
                    <Text style={[styles.percentage, { color: getProgressColor() }]}>
                        {Math.round(progress)}%
                    </Text>
                )}
            </View>
            <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                    <Animated.View
                        style={[
                            styles.progressBarFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                    extrapolate: 'clamp',
                                }),
                                backgroundColor: getProgressColor(),
                            },
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    /**
     * Render circular progress indicator
     * Requirements: 8.2 - Circular progress visualization
     */
    const renderCircular = () => {
        const size = 80;
        const strokeWidth = 6;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const strokeDashoffset = circumference - (progress / 100) * circumference;

        return (
            <View style={[styles.circularContainer, style]}>
                <View style={styles.circularProgress}>
                    <View style={[styles.circularBackground, { width: size, height: size }]}>
                        <View style={styles.circularInner}>
                            {showIcon && (
                                progress >= 100 ? (
                                    <Ionicons name="checkmark" size={24} color="#10b981" />
                                ) : (
                                    <ActivityIndicator size="small" color={getProgressColor()} />
                                )
                            )}
                            {showPercentage && (
                                <Text style={[styles.circularPercentage, { color: getProgressColor() }]}>
                                    {Math.round(progress)}%
                                </Text>
                            )}
                        </View>
                    </View>
                </View>
                <View style={styles.circularText}>
                    <Text style={styles.message}>{message}</Text>
                    {details && (
                        <Text style={styles.details}>{details}</Text>
                    )}
                </View>
            </View>
        );
    };

    /**
     * Render step-based progress indicator
     * Requirements: 8.2 - Step-based progress visualization
     */
    const renderSteps = () => {
        const steps = 5;
        const currentStep = Math.ceil((progress / 100) * steps);

        return (
            <View style={[styles.stepsContainer, style]}>
                <View style={styles.stepsHeader}>
                    {showIcon && (
                        <View style={styles.iconContainer}>
                            {progress >= 100 ? (
                                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            ) : (
                                <ActivityIndicator size="small" color={getProgressColor()} />
                            )}
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        <Text style={styles.message}>{message}</Text>
                        {details && (
                            <Text style={styles.details}>{details}</Text>
                        )}
                    </View>
                    {showPercentage && (
                        <Text style={[styles.percentage, { color: getProgressColor() }]}>
                            {Math.round(progress)}%
                        </Text>
                    )}
                </View>
                <View style={styles.stepsIndicator}>
                    {Array.from({ length: steps }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.step,
                                {
                                    backgroundColor: index < currentStep ? getProgressColor() : '#e5e7eb',
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>
        );
    };

    if (!visible) return null;

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            {variant === 'circular' && renderCircular()}
            {variant === 'steps' && renderSteps()}
            {variant === 'linear' && renderLinear()}
        </Animated.View>
    );
}

/**
 * Hook for managing progress indicators
 * Requirements: 8.2 - Progress indicator management
 */
export function useProgressIndicator() {
    const [progress, setProgress] = React.useState<{
        visible: boolean;
        progress: number;
        message: string;
        details?: string;
    }>({
        visible: false,
        progress: 0,
        message: '',
    });

    const showProgress = React.useCallback((
        message: string,
        initialProgress: number = 0,
        details?: string
    ) => {
        setProgress({
            visible: true,
            progress: initialProgress,
            message,
            details,
        });
    }, []);

    const updateProgress = React.useCallback((
        newProgress: number,
        message?: string,
        details?: string
    ) => {
        setProgress(prev => ({
            ...prev,
            progress: Math.max(0, Math.min(100, newProgress)),
            message: message || prev.message,
            details: details !== undefined ? details : prev.details,
        }));
    }, []);

    const hideProgress = React.useCallback(() => {
        setProgress(prev => ({
            ...prev,
            visible: false,
        }));
    }, []);

    const completeProgress = React.useCallback((
        message: string = 'Completed',
        details?: string
    ) => {
        setProgress(prev => ({
            ...prev,
            progress: 100,
            message,
            details,
        }));

        // Auto-hide after completion
        setTimeout(() => {
            hideProgress();
        }, 2000);
    }, [hideProgress]);

    return {
        progress,
        showProgress,
        updateProgress,
        hideProgress,
        completeProgress,
    };
}

const styles = StyleSheet.create({
    // Linear variant styles
    linearContainer: {
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
    linearHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        marginRight: 12,
        width: 24,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    details: {
        fontSize: 12,
        color: '#6b7280',
    },
    percentage: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },
    progressBarContainer: {
        marginTop: 8,
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },

    // Circular variant styles
    circularContainer: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    circularProgress: {
        marginBottom: 16,
    },
    circularBackground: {
        borderRadius: 40,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    circularInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circularPercentage: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 4,
    },
    circularText: {
        alignItems: 'center',
    },

    // Steps variant styles
    stepsContainer: {
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
    stepsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    stepsIndicator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    step: {
        flex: 1,
        height: 4,
        borderRadius: 2,
        marginHorizontal: 2,
    },
});