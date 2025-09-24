# SQLite Database Implementation

This directory contains the SQLite database implementation for the offline attendance system.

## Overview

The database implementation provides offline-first storage capabilities for the React Native attendance app, allowing faculty to capture and store attendance data locally when network connectivity is unavailable.

## Architecture

### Core Components

1. **DatabaseService** (`database.ts`) - Main database service class
2. **DatabaseProvider** (`../contexts/DatabaseContext.tsx`) - React context for database state
3. **useDatabase** (`../hooks/useDatabase.ts`) - React hook for database operations
4. **Database Utilities** (`databaseUtils.ts`) - Helper functions for common operations
5. **Database Initialization** (`databaseInit.ts`) - App startup database setup

### Database Schema

#### Tables

1. **attendance_records**
   - Stores attendance data with sync status
   - Supports both ML and manual capture methods
   - Tracks retry counts for failed sync operations

2. **students_cache**
   - Caches student data for offline operation
   - Enables attendance marking without network connectivity
   - Tracks last sync timestamp

3. **sync_metadata**
   - Stores sync-related metadata
   - Configurable key-value storage for sync state

## Features

### ✅ Implemented Features

- **Database Initialization**: Automatic schema creation and setup
- **Attendance Recording**: Store attendance records with full metadata
- **Student Caching**: Cache student data for offline operation
- **Sync Status Tracking**: Track pending, syncing, synced, and failed records
- **Data Validation**: Comprehensive validation for attendance records
- **Error Handling**: Robust error handling with recovery mechanisms
- **Statistics**: Database statistics and health monitoring
- **Testing**: Comprehensive test suite with mocks

### 🔄 Sync Capabilities

- **Pending Records**: Track records that need to be synced
- **Sync Status Management**: Update sync status for individual records
- **Batch Operations**: Support for batch student caching
- **Metadata Storage**: Store sync-related configuration and state

### 🛡️ Data Integrity

- **Validation**: Input validation for all data operations
- **Constraints**: Database constraints for data consistency
- **Indexes**: Performance indexes for common queries
- **Transactions**: Atomic operations for data consistency

## Usage

### Basic Setup

```typescript
import { DatabaseProvider } from '@/contexts/DatabaseContext';
import { useDatabase } from '@/hooks/useDatabase';

// Wrap your app with DatabaseProvider
function App() {
  return (
    <DatabaseProvider>
      <YourAppComponents />
    </DatabaseProvider>
  );
}

// Use database in components
function AttendanceComponent() {
  const { insertAttendance, getPendingRecords, isInitialized } = useDatabase();
  
  // Your component logic
}
```

### Creating Attendance Records

```typescript
import { createAttendanceRecord } from '@/services/databaseUtils';

const record = createAttendanceRecord(
  'student-123',
  'faculty-456',
  'section-789',
  'present',
  'ml' // or 'manual'
);

const recordId = await insertAttendance(record);
```

### Caching Students

```typescript
const students = [
  {
    id: 'student-1',
    rollNumber: '001',
    name: 'John Doe',
    sectionId: 'section-1',
    isActive: true
  }
];

await cacheStudents(students);
```

### Getting Sync Statistics

```typescript
import { getSyncStatistics } from '@/services/databaseUtils';

const stats = await getSyncStatistics();
console.log(`Sync progress: ${stats.syncProgress}%`);
```

## Database Schema Details

### attendance_records Table

```sql
CREATE TABLE attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  faculty_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  status TEXT CHECK(status IN ('present', 'absent')) NOT NULL,
  sync_status TEXT CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed')) DEFAULT 'pending',
  capture_method TEXT CHECK(capture_method IN ('ml', 'manual')) NOT NULL,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### students_cache Table

```sql
CREATE TABLE students_cache (
  id TEXT PRIMARY KEY,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  section_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  last_synced DATETIME
);
```

### sync_metadata Table

```sql
CREATE TABLE sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

The implementation includes comprehensive tests:

```bash
# Run all database tests
npm test services/__tests__/

# Run specific test files
npm test services/__tests__/database.test.ts
npm test services/__tests__/databaseUtils.test.ts
npm test services/__tests__/database.integration.test.ts
```

### Test Coverage

- ✅ Database initialization
- ✅ CRUD operations for attendance records
- ✅ Student caching operations
- ✅ Sync status management
- ✅ Data validation
- ✅ Error handling
- ✅ Database statistics
- ✅ Utility functions

## Performance Considerations

### Indexes

The implementation includes indexes for:
- `attendance_records.student_id`
- `attendance_records.sync_status`
- `students_cache.section_id`

### Optimization Features

- **Connection Pooling**: Managed by expo-sqlite
- **Batch Operations**: Transaction support for bulk operations
- **Lazy Loading**: On-demand data loading
- **Cleanup**: Automatic cleanup of old synced records

## Error Handling

### Database Recovery

```typescript
import { recoverDatabase } from '@/services/databaseInit';

try {
  await recoverDatabase();
} catch (error) {
  // Handle recovery failure
}
```

### Health Monitoring

```typescript
import { checkDatabaseHealth } from '@/services/databaseInit';

const isHealthy = await checkDatabaseHealth();
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **3.1**: ✅ Local SQLite storage for attendance data
- **3.2**: ✅ Offline operation with local database
- **3.3**: ✅ Sync status tracking for pending records

## Dependencies

- `expo-sqlite`: SQLite database for React Native
- `@react-native-async-storage/async-storage`: For secure token storage (used by context)

## File Structure

```
services/
├── database.ts              # Main database service
├── databaseInit.ts          # Database initialization utilities
├── databaseUtils.ts         # Helper functions and utilities
├── __tests__/              # Test files
│   ├── database.test.ts
│   ├── database.integration.test.ts
│   └── databaseUtils.test.ts
└── README.md               # This file

contexts/
└── DatabaseContext.tsx     # React context provider

hooks/
└── useDatabase.ts          # React hook for database operations

__mocks__/
└── expo-sqlite.ts          # Mock for testing
```

## Next Steps

This database implementation is ready for integration with:

1. **Sync Service** (Task 14) - Will use `getPendingRecords()` and `markRecordSynced()`
2. **Authentication Service** (Task 10) - Will store user session data
3. **WebSocket Client** (Task 11) - Will store ML recognition results
4. **Attendance Capture** (Task 12) - Will use `insertAttendance()` for storing records

The database foundation is complete and tested, ready for the next implementation tasks.