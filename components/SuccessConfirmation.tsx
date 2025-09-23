import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SuccessConfirmationProps {
    visible: boolean;
    message: string;
    details?: string;
    duration?: number;
    onDismiss?: () => void;
    variant?: 'toast' | 'modal' | 'inline';
    showIcon?: boolean;
    style?: any;
}

/**
 * Success Confirmation Component
 * Requirements: 8.4 - Success confirmations for completed operations
 */
export function SuccessConfirmation({
    visible,
    message,
    details,
    duration = 3000,
    onDismiss,
    variant = 'toast',
    showIcon = true,
    style
}: SuccessConfirmationProps) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(-100)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

    const hideConfirmation = React.useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss?.();
        });
    }, [fadeAnim, slideAnim, scaleAnim, onDismiss]);

    React.useEffect(() => {
        if (visible) {
            // Show animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 100,
                    friction: 8,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto dismiss after duration
            if (duration > 0) {
                const timer = setTimeout(() => {
                    hideConfirmation();
                }, duration);

                return () => clearTimeout(timer);
            }
        } else {
            hideConfirmation();
        }
    }, [visible, duration, hideConfirmation]);



    /**
     * Render toast variant
     * Requirements: 8.4 - Toast-style success notifications
     */
    const renderToast = () => (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
                style
            ]}
        >
            <TouchableOpacity
                style={styles.toastContent}
                onPress={hideConfirmation}
                activeOpacity={0.9}
            >
                {showIcon && (
                    <View style={styles.toastIconContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    </View>
                )}
                <View style={styles.toastTextContainer}>
                    <Text style={styles.toastMessage}>{message}</Text>
                    {details && (
                        <Text style={styles.toastDetails}>{details}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={hideConfirmation}
                >
                    <Ionicons name="close" size={16} color="#6b7280" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );

    /**
     * Render modal variant
     * Requirements: 8.4 - Modal-style success confirmations
     */
    const renderModal = () => (
        <Animated.View
            style={[
                styles.modalOverlay,
                { opacity: fadeAnim },
                style
            ]}
        >
            <Animated.View
                style={[
                    styles.modalContainer,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {showIcon && (
                    <View style={styles.modalIconContainer}>
                        <View style={styles.modalIconBackground}>
                            <Ionicons name="checkmark" size={32} color="#ffffff" />
                        </View>
                    </View>
                )}
                <Text style={styles.modalMessage}>{message}</Text>
                {details && (
                    <Text style={styles.modalDetails}>{details}</Text>
                )}
                <TouchableOpacity
                    style={styles.modalButton}
                    onPress={hideConfirmation}
                >
                    <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );

    /**
     * Render inline variant
     * Requirements: 8.4 - Inline success confirmations
     */
    const renderInline = () => (
        <Animated.View
            style={[
                styles.inlineContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
                style
            ]}
        >
            {showIcon && (
                <View style={styles.inlineIconContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                </View>
            )}
            <View style={styles.inlineTextContainer}>
                <Text style={styles.inlineMessage}>{message}</Text>
                {details && (
                    <Text style={styles.inlineDetails}>{details}</Text>
                )}
            </View>
        </Animated.View>
    );

    if (!visible) return null;

    switch (variant) {
        case 'modal':
            return renderModal();
        case 'inline':
            return renderInline();
        case 'toast':
        default:
            return renderToast();
    }
}

/**
 * Hook for managing success confirmations
 * Requirements: 8.4 - Success confirmation management
 */
export function useSuccessConfirmation() {
    const [confirmation, setConfirmation] = React.useState<{
        visible: boolean;
        message: string;
        details?: string;
        variant?: 'toast' | 'modal' | 'inline';
    }>({
        visible: false,
        message: '',
    });

    const showSuccess = React.useCallback((
        message: string,
        details?: string,
        variant: 'toast' | 'modal' | 'inline' = 'toast'
    ) => {
        setConfirmation({
            visible: true,
            message,
            details,
            variant,
        });
    }, []);

    const hideSuccess = React.useCallback(() => {
        setConfirmation(prev => ({
            ...prev,
            visible: false,
        }));
    }, []);

    return {
        confirmation,
        showSuccess,
        hideSuccess,
    };
}

const styles = StyleSheet.create({
    // Toast variant styles
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 1000,
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#10b981',
    },
    toastIconContainer: {
        marginRight: 12,
    },
    toastTextContainer: {
        flex: 1,
    },
    toastMessage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 2,
    },
    toastDetails: {
        fontSize: 12,
        color: '#6b7280',
    },
    dismissButton: {
        padding: 4,
        marginLeft: 8,
    },

    // Modal variant styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 32,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 16,
    },
    modalIconContainer: {
        marginBottom: 16,
    },
    modalIconBackground: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalMessage: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1f2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    modalDetails: {
        fontSize: 14,
        color: '#6b7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButton: {
        backgroundColor: '#10b981',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Inline variant styles
    inlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    inlineIconContainer: {
        marginRight: 8,
    },
    inlineTextContainer: {
        flex: 1,
    },
    inlineMessage: {
        fontSize: 14,
        fontWeight: '600',
        color: '#166534',
        marginBottom: 2,
    },
    inlineDetails: {
        fontSize: 12,
        color: '#15803d',
    },
});