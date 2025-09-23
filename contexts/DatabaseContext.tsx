import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { initializeAppDatabase, checkDatabaseHealth, recoverDatabase } from '../services/databaseInit';

interface DatabaseContextType {
    isInitialized: boolean;
    isHealthy: boolean;
    isRecovering: boolean;
    initializationError: string | null;
    retryInitialization: () => Promise<void>;
    performHealthCheck: () => Promise<void>;
    recoverDatabaseIfNeeded: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
    children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isHealthy, setIsHealthy] = useState(false);
    const [isRecovering, setIsRecovering] = useState(false);
    const [initializationError, setInitializationError] = useState<string | null>(null);

    const initializeDatabase = async () => {
        try {
            setInitializationError(null);
            await initializeAppDatabase();
            setIsInitialized(true);

            // Perform initial health check
            const healthy = await checkDatabaseHealth();
            setIsHealthy(healthy);
        } catch (error) {
            console.error('Database initialization failed:', error);
            setInitializationError(error instanceof Error ? error.message : 'Unknown error');
            setIsInitialized(false);
            setIsHealthy(false);
        }
    };

    const retryInitialization = async () => {
        await initializeDatabase();
    };

    const performHealthCheck = async () => {
        try {
            const healthy = await checkDatabaseHealth();
            setIsHealthy(healthy);
        } catch (error) {
            console.error('Health check failed:', error);
            setIsHealthy(false);
        }
    };

    const recoverDatabaseIfNeeded = async () => {
        try {
            setIsRecovering(true);
            await recoverDatabase();
            setIsInitialized(true);
            setIsHealthy(true);
            setInitializationError(null);
        } catch (error) {
            console.error('Database recovery failed:', error);
            setInitializationError(error instanceof Error ? error.message : 'Recovery failed');
        } finally {
            setIsRecovering(false);
        }
    };

    // Initialize database on mount
    useEffect(() => {
        initializeDatabase();
    }, []);

    // Periodic health checks (every 5 minutes)
    useEffect(() => {
        if (!isInitialized) return;

        const healthCheckInterval = setInterval(() => {
            performHealthCheck();
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(healthCheckInterval);
    }, [isInitialized]);

    const contextValue: DatabaseContextType = {
        isInitialized,
        isHealthy,
        isRecovering,
        initializationError,
        retryInitialization,
        performHealthCheck,
        recoverDatabaseIfNeeded
    };

    return (
        <DatabaseContext.Provider value={contextValue}>
            {children}
        </DatabaseContext.Provider>
    );
}

export function useDatabaseContext(): DatabaseContextType {
    const context = useContext(DatabaseContext);
    if (context === undefined) {
        throw new Error('useDatabaseContext must be used within a DatabaseProvider');
    }
    return context;
}

// Database status component for debugging/monitoring
export function DatabaseStatus() {
    const { isInitialized, isHealthy, isRecovering, initializationError, retryInitialization, recoverDatabaseIfNeeded } = useDatabaseContext();

    if (isRecovering) {
        return (
            <View style={[styles.container, styles.warning]}>
                <Text style={styles.warningText}>🔄 Recovering database...</Text>
            </View>
        );
    }

    if (!isInitialized) {
        return (
            <View style={[styles.container, styles.error]}>
                <Text style={styles.errorText}>
                    ❌ Database not initialized
                </Text>
                {initializationError && (
                    <Text style={[styles.errorText, styles.smallText]}>
                        Error: {initializationError}
                    </Text>
                )}
                <TouchableOpacity
                    onPress={retryInitialization}
                    style={styles.retryButton}
                >
                    <Text style={styles.buttonText}>Retry Initialization</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!isHealthy) {
        return (
            <View style={[styles.container, styles.warning]}>
                <Text style={styles.warningText}>
                    ⚠️ Database health check failed
                </Text>
                <TouchableOpacity
                    onPress={recoverDatabaseIfNeeded}
                    style={styles.recoverButton}
                >
                    <Text style={styles.buttonText}>Recover Database</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, styles.success]}>
            <Text style={styles.successText}>✅ Database is healthy</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 8,
        margin: 8,
    },
    warning: {
        backgroundColor: '#fff3cd',
    },
    error: {
        backgroundColor: '#f8d7da',
    },
    success: {
        backgroundColor: '#d4edda',
    },
    warningText: {
        color: '#856404',
    },
    errorText: {
        color: '#721c24',
        marginBottom: 8,
    },
    successText: {
        color: '#155724',
    },
    smallText: {
        fontSize: 12,
    },
    retryButton: {
        backgroundColor: '#dc3545',
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    recoverButton: {
        backgroundColor: '#ffc107',
        padding: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});