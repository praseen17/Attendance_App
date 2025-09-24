// Mock for expo-sqlite
export const openDatabaseAsync = jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1 })),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    getFirstAsync: jest.fn(() => Promise.resolve({ count: 0 })),
    withTransactionAsync: jest.fn((callback) => callback()),
    closeAsync: jest.fn(() => Promise.resolve())
}));

export default {
    openDatabaseAsync
};