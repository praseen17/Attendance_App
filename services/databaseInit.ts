import { databaseService } from './database';

/**
 * Initialize the database when the app starts
 * This should be called in the app's entry point
 */
export async function initializeAppDatabase(): Promise<void> {
    try {
        console.log('Initializing SQLite database...');
        await databaseService.initializeDatabase();
        console.log('Database initialization completed successfully');
    } catch (error) {
        console.error('Critical error: Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Database health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
    try {
        const stats = await databaseService.getDatabaseStats();
        console.log('Database health check:', stats);
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

/**
 * Database recovery utility
 */
export async function recoverDatabase(): Promise<void> {
    try {
        console.log('Attempting database recovery...');
        await databaseService.closeDatabase();
        await databaseService.initializeDatabase();
        console.log('Database recovery completed');
    } catch (error) {
        console.error('Database recovery failed:', error);
        throw new Error('Unable to recover database. App may need to be reinstalled.');
    }
}