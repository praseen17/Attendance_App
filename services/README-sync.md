# Sync Service Implementation

## Overview

The Sync Service provides automatic synchronization of offline attendance records to the backend server. It implements the requirements for task 14: "Build automatic sync service".

## Features

### 1. Automatic Sync Initiation (Requirement 4.1)
- Monitors network connectivity changes
- Automatically starts sync when network is detected
- Configurable auto-sync intervals
- Manual sync trigger capability

### 2. Pending Records Retrieval and Batch Upload (Requirement 4.2, 4.3)
- Retrieves all pending records from SQLite database
- Processes records in configurable batches (default: 50 records per batch)
- Updates record sync status throughout the process
- Handles partial sync failures gracefully

### 3. Sync Progress Tracking (Requirement 8.2)
- Real-time progress updates with percentage completion
- Batch-level progress tracking
- Event-driven progress notifications
- Current sync status monitoring

### 4. User Feedback (Requirement 8.3)
- Comprehensive sync status indicators
- Progress bars with completion percentage
- Success/error notifications
- Last sync time tracking

## Architecture

### Core Components

1. **SyncService** (`services/syncService.ts`)
   - Main service class extending EventEmitter
   - Manages sync operations and state
   - Handles network connectivity monitoring
   - Provides event-based notifications

2. **SyncProvider** (`contexts/SyncContext.tsx`)
   - React context for sync state management
   - Initializes sync service on app startup
   - Provides sync state to components

3. **useSync Hook** (`hooks/useSync.ts`)
   - React hook for easy sync integration
   - Provides formatted status text
   - Handles sync actions and state

4. **SyncStatusIndicator** (`components/SyncStatusIndicator.tsx`)
   - Visual sync status component
   - Shows progress bars and status icons
   - Supports compact and detailed views

### Data Flow

```
Network Change → SyncService → Database → API Client → Backend
                      ↓
                 Progress Events → SyncProvider → Components
```

## Configuration

The sync service accepts configuration options:

```typescript
interface SyncConfig {
    batchSize: number;        // Records per batch (default: 50)
    maxRetries: number;       // Max retry attempts (default: 3)
    retryDelay: number;       // Delay between retries (default: 5000ms)
    autoSyncEnabled: boolean; // Enable auto sync (default: true)
    syncInterval: number;     // Periodic sync interval (default: 60000ms)
}
```

## Usage

### Basic Integration

```typescript
import { useSync } from '@/hooks/useSync';

function MyComponent() {
    const {
        isSyncing,
        syncProgress,
        hasPendingRecords,
        triggerSync,
        getSyncStatusText
    } = useSync();

    return (
        <View>
            <Text>{getSyncStatusText()}</Text>
            {isSyncing && (
                <ProgressBar progress={syncProgress?.percentage || 0} />
            )}
            <Button onPress={triggerSync} disabled={isSyncing}>
                Sync Now
            </Button>
        </View>
    );
}
```

### Using the Status Indicator

```typescript
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator';

function AttendanceScreen() {
    return (
        <View>
            {/* Detailed view with progress */}
            <SyncStatusIndicator showDetails={true} />
            
            {/* Compact view for headers */}
            <SyncStatusIndicator compact={true} />
        </View>
    );
}
```

## Event System

The sync service emits the following events:

- `syncStarted`: Sync operation begins
- `syncProgress`: Progress updates during sync
- `syncCompleted`: Sync operation completed successfully
- `syncError`: Sync operation failed
- `autoSyncStarted`: Auto sync enabled
- `autoSyncStopped`: Auto sync disabled

## Error Handling

### Network Errors
- Automatic retry with exponential backoff
- Graceful handling of connection loss during sync
- Resume sync when network is restored

### API Errors
- Individual batch error handling
- Partial sync success tracking
- Detailed error reporting

### Database Errors
- Transaction rollback on failures
- Data integrity preservation
- Error logging and reporting

## Sync States

Records progress through the following sync states:

1. `pending` - Record created, waiting for sync
2. `syncing` - Currently being uploaded
3. `synced` - Successfully uploaded to server
4. `failed` - Upload failed, will retry

## Performance Considerations

### Batch Processing
- Configurable batch sizes to balance performance and memory
- Small delays between batches to avoid server overload
- Parallel processing within batches

### Memory Management
- Efficient record processing without loading all data at once
- Cleanup of synced records after configurable retention period
- Progress tracking with minimal memory footprint

### Network Optimization
- Compression of sync data (handled by API client)
- Connection pooling for multiple requests
- Intelligent retry strategies

## Testing

The sync service includes comprehensive unit tests covering:

- Initialization and configuration
- Sync operation success/failure scenarios
- Batch processing logic
- Progress tracking accuracy
- Event emission verification
- Error handling paths

## Integration Points

### Database Service
- `getPendingRecords()` - Retrieve records to sync
- `updateSyncStatus()` - Update record sync state
- `getDatabaseStats()` - Get sync statistics

### Network Service
- `isOnline()` - Check connectivity status
- `onConnectionChange()` - Monitor network changes

### API Client
- `syncAttendance()` - Upload attendance records
- Handles authentication and error responses

## Monitoring and Debugging

### Logging
- Comprehensive console logging for debugging
- Sync operation tracking
- Error details and stack traces

### Statistics
- Total/pending/synced/failed record counts
- Sync success rates
- Last sync timestamps
- Performance metrics

## Future Enhancements

1. **Conflict Resolution**
   - Handle duplicate records
   - Merge conflicting data
   - User-driven conflict resolution

2. **Advanced Retry Logic**
   - Different retry strategies per error type
   - Exponential backoff with jitter
   - Circuit breaker pattern

3. **Sync Scheduling**
   - Time-based sync windows
   - Priority-based sync ordering
   - Background sync optimization

4. **Analytics**
   - Sync performance metrics
   - Network quality correlation
   - User behavior tracking

## Requirements Compliance

✅ **Requirement 4.1**: Automatic sync initiation on network detection
✅ **Requirement 4.2**: Pending records retrieval and batch upload
✅ **Requirement 4.3**: Record state updates and sync management
✅ **Requirement 8.2**: Sync progress tracking and user feedback
✅ **Requirement 8.3**: Real-time status indicators and notifications

The sync service fully implements all specified requirements with comprehensive error handling, progress tracking, and user feedback mechanisms.