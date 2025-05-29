# STORAGE-JSON.md - JSON File Storage Implementation Documentation

## Overview

The JSON File Storage Implementation (`storage-json.ts`) provides a persistent file-based storage backend for the Deep Framework. It stores associations in JSON files with atomic write operations, file watching capabilities, and supports both subscription-based and delta-based synchronization strategies. This module is designed for production use, development, and scenarios where persistent file-based storage is required.

## Core Components

### StorageJsonDump Class

The `StorageJsonDump` class provides persistent JSON file storage with configurable delays, atomic writes, and file watching capabilities.

```javascript
import { StorageJsonDump } from './storage-json';

// Create with file path
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Create with initial data and custom settings
const initialDump = { links: [...] };
const jsonDump = new StorageJsonDump('/path/to/storage.json', initialDump, 50); // maxCount = 50
```

#### Configuration Properties

```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Configurable delays (in milliseconds)
jsonDump._saveDaly = 100;        // Save operation delay (typo preserved for consistency)
jsonDump._loadDelay = 50;        // Load operation delay
jsonDump._insertDelay = 30;      // Insert operation delay
jsonDump._deleteDelay = 30;      // Delete operation delay
jsonDump._updateDelay = 30;      // Update operation delay
jsonDump._watchInterval = 200;   // File watching polling interval

// Auto-stop configuration
jsonDump._defaultIntervalMaxCount = 30; // Max polling intervals before auto-stop
```

#### Core Operations

##### Save Operation
```javascript
const dump = { links: [...] };
await jsonDump.save(dump);
console.log('Dump saved to JSON file with atomic write');
```

**Features:**
- Atomic write operations using temporary files
- Automatic file creation if it doesn't exist
- Configurable save delays for testing
- Updates internal state to prevent false change detection

##### Load Operation
```javascript
const dump = await jsonDump.load();
console.log('Loaded', dump.links.length, 'links from JSON file');
```

**Features:**
- Graceful handling of corrupted JSON files
- Automatic file creation if it doesn't exist
- Configurable load delays for testing
- Updates internal state for change detection

##### Insert Operation
```javascript
const link = {
  _id: 'new-link',
  _type: 'String',
  _created_at: Date.now(),
  _updated_at: Date.now(),
  _string: 'test value'
};

await jsonDump.insert(link);
console.log('Link inserted and file updated');
```

**Features:**
- Duplicate ID validation
- Concurrent write handling
- Atomic file updates
- Delta callback notifications

##### Delete Operation
```javascript
const linkToDelete = { _id: 'existing-link', /* ... */ };
await jsonDump.delete(linkToDelete);
console.log('Link deleted and file updated');
```

**Features:**
- Existence validation before deletion
- Atomic file updates
- Delta callback notifications

##### Update Operation
```javascript
const updatedLink = {
  _id: 'existing-link',
  _type: 'String',
  _created_at: originalTime,
  _updated_at: Date.now(),
  _string: 'updated value'
};

await jsonDump.update(updatedLink);
console.log('Link updated and file saved');
```

**Features:**
- Existence validation before update
- Atomic file updates
- Delta callback notifications

#### File System Features

##### Atomic Write Operations
```javascript
// All write operations use atomic writes to prevent corruption
await jsonDump.save(dump);
await jsonDump.insert(link);
await jsonDump.update(link);
await jsonDump.delete(link);

// Temporary files are used and then atomically renamed
// No partial writes or corruption during concurrent access
```

##### File Watching and Change Detection
```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// File watching starts automatically when subscriptions are added
const unsubscribe = await jsonDump.subscribe((dump) => {
  console.log('External file change detected:', dump.links.length, 'links');
});

// Detects changes made by other processes
// Uses both fs.watch and polling for reliability
// Automatically stops when no subscribers remain
```

##### Concurrent Access Handling
```javascript
// Multiple StorageJsonDump instances can safely access the same file
const jsonDump1 = new StorageJsonDump('/shared/storage.json');
const jsonDump2 = new StorageJsonDump('/shared/storage.json');

// Both instances can read and write safely
await jsonDump1.insert(link1);
await jsonDump2.insert(link2);

// Changes are synchronized through file watching
// Atomic writes prevent corruption
```

#### Subscription System

The subscription system provides real-time change notifications through file watching with automatic polling fallback.

##### Basic Subscription
```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Subscribe to file changes
const unsubscribe = await jsonDump.subscribe((dump) => {
  console.log('File changed:', dump.links.length, 'links');
});

// External changes to the file will trigger notifications
// Make changes from another process or instance
// Unsubscribe when done
unsubscribe();
```

##### Multiple Subscribers
```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Multiple subscribers receive the same notifications
const unsubscribe1 = await jsonDump.subscribe((dump) => {
  console.log('Subscriber 1:', dump.links.length);
});

const unsubscribe2 = await jsonDump.subscribe((dump) => {
  console.log('Subscriber 2:', dump.links.length);
});

// Both will be notified of file changes
// Clean up
unsubscribe1();
unsubscribe2();
```

##### Auto-Stop Functionality
```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json', undefined, 5); // Auto-stop after 5 intervals
jsonDump._watchInterval = 100; // 100ms intervals

const unsubscribe = await jsonDump.subscribe((dump) => {
  console.log('Notification received');
});

// File watching will automatically stop after 5 intervals (500ms)
// Timer is cleaned up automatically
```

#### Delta Callbacks

Delta callbacks provide immediate notification of changes without file watching overhead.

```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Set delta callback
jsonDump._onDelta = (delta) => {
  console.log('Delta:', delta.operation, delta.id || delta.link?._id);
};

// Operations trigger delta callbacks
await jsonDump.insert(newLink);    // Triggers: { operation: 'insert', link: ... }
await jsonDump.update(updatedLink); // Triggers: { operation: 'update', id: ..., link: ... }
await jsonDump.delete(linkToDelete); // Triggers: { operation: 'delete', id: ... }
```

#### Resource Management

##### Cleanup and Destruction
```javascript
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Set up subscriptions and watchers
const unsubscribe = await jsonDump.subscribe(() => {});

// Clean up all resources
jsonDump.destroy();

// All file watchers stopped
// All subscriptions cleared
// Timers cleaned up
```

### StorageJson Function

The `newStorageJson` function creates a Deep Framework storage implementation using `StorageJsonDump`.

#### Basic Usage

```javascript
const deep = newDeep();

// Create StorageJsonDump
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Create StorageJson with subscription strategy
const storageJson = new deep.StorageJson({
  filePath: '/path/to/storage.json',
  storageJsonDump: jsonDump,
  strategy: 'subscription'
});

// Wait for initialization
await storageJson.promise;
```

#### Configuration Options

```javascript
const storageJson = new deep.StorageJson({
  filePath: '/path/to/storage.json',  // Required: JSON file path
  storageJsonDump: jsonDump,          // Optional: existing StorageJsonDump instance
  strategy: 'subscription',           // Required: 'subscription' or 'delta'
  storage: existingStorage,           // Optional: existing storage to use
  dump: initialDump                   // Optional: initial dump to apply
});
```

#### Synchronization Strategies

##### Subscription Strategy
Uses file watching to detect changes in the JSON file and applies them to the Deep instance.

```javascript
const deep = newDeep();
const storageJson = new deep.StorageJson({
  filePath: '/path/to/storage.json',
  strategy: 'subscription'
});

await storageJson.promise;

// Create and store associations
const user = new deep();
const profile = new deep.String("John Doe");

user.value = profile;

// Mark for storage synchronization
user.store(storageJson, deep.storageMarkers.oneTrue);
profile.store(storageJson, deep.storageMarkers.oneTrue);

// Changes are automatically saved to JSON file
// External changes to file are automatically loaded
```

**Features:**
- Automatic file watching for external changes
- Configurable polling intervals
- Auto-stop when no subscribers
- Handles file deletion and recreation

##### Delta Strategy
Uses immediate callbacks to synchronize changes between the Deep instance and JSON file.

```javascript
const deep = newDeep();
const storageJson = new deep.StorageJson({
  filePath: '/path/to/storage.json',
  strategy: 'delta'
});

await storageJson.promise;

// Real-time synchronization
const association = new deep();
association.store(storageJson, deep.storageMarkers.oneTrue);

// Change is immediately written to JSON file
association.data = "new value";
```

**Features:**
- Immediate synchronization
- Lower latency than subscription strategy
- No polling overhead
- Suitable for high-frequency changes

## Multi-Process Synchronization

### Shared File Access

Multiple processes can safely share the same JSON file:

```javascript
// Process 1
const deep1 = newDeep();
const storage1 = new deep1.StorageJson({
  filePath: '/shared/data.json',
  strategy: 'subscription'
});

// Process 2
const deep2 = newDeep();
const storage2 = new deep2.StorageJson({
  filePath: '/shared/data.json',
  strategy: 'subscription'
});

// Changes in one process sync to the other
// Atomic writes prevent corruption
// File watching detects external changes
```

### Concurrent Write Handling

The system handles concurrent writes safely:

```javascript
// Multiple instances writing to same file
const jsonDump1 = new StorageJsonDump('/shared/storage.json');
const jsonDump2 = new StorageJsonDump('/shared/storage.json');

// Concurrent operations are handled safely
await Promise.all([
  jsonDump1.insert(link1),
  jsonDump2.insert(link2)
]);

// Both links will be present in the final file
// No data corruption or loss
```

### Data Consistency

The system maintains data consistency across multiple instances:

```javascript
// Create multiple instances
const instances = [
  new StorageJsonDump('/shared/storage.json'),
  new StorageJsonDump('/shared/storage.json'),
  new StorageJsonDump('/shared/storage.json')
];

// Perform operations from different instances
await instances[0].insert(link1);
await instances[1].insert(link2);
await instances[2].insert(link3);

// All instances will eventually have consistent state
// File watching ensures synchronization
```

## Error Handling

### File System Errors

```javascript
const jsonDump = new StorageJsonDump('/invalid/path/storage.json');

try {
  await jsonDump.save(dump);
} catch (error) {
  console.log('File system error:', error.message);
  // Handle permission errors, disk full, etc.
}
```

### JSON Corruption

```javascript
// Corrupted JSON files are handled gracefully
const jsonDump = new StorageJsonDump('/path/to/corrupted.json');

try {
  const dump = await jsonDump.load();
} catch (error) {
  console.log('JSON corruption detected:', error.message);
  // Implement recovery strategy
}
```

### Concurrent Access Conflicts

```javascript
// Retry logic for concurrent access conflicts
const jsonDump = new StorageJsonDump('/shared/storage.json');

// Automatic retry with exponential backoff
// Built into atomic write operations
await jsonDump.insert(link); // Automatically retries on conflicts
```

## Performance Considerations

### Large Files

```javascript
// Efficient handling of large JSON files
const jsonDump = new StorageJsonDump('/path/to/large-storage.json');

// Operations scale well with file size
// Atomic writes prevent corruption
// Memory usage is optimized
```

### High-Frequency Updates

```javascript
// Configure delays for high-frequency scenarios
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Reduce delays for faster operations
jsonDump._insertDelay = 1;
jsonDump._updateDelay = 1;
jsonDump._deleteDelay = 1;

// Use delta strategy for immediate updates
const storageJson = new deep.StorageJson({
  filePath: '/path/to/storage.json',
  strategy: 'delta'
});
```

### Resource Management

```javascript
// Proper cleanup prevents resource leaks
const jsonDump = new StorageJsonDump('/path/to/storage.json');

// Always clean up when done
process.on('exit', () => {
  jsonDump.destroy();
});

// Or use try/finally
try {
  // Use jsonDump
} finally {
  jsonDump.destroy();
}
```

## Testing and Development

### Test Configuration

```javascript
// Configure for testing
const jsonDump = new StorageJsonDump('/tmp/test-storage.json');

// Fast operations for testing
jsonDump._saveDaly = 1;
jsonDump._loadDelay = 1;
jsonDump._insertDelay = 1;
jsonDump._deleteDelay = 1;
jsonDump._updateDelay = 1;
jsonDump._watchInterval = 10;

// Auto-stop for test cleanup
jsonDump._defaultIntervalMaxCount = 5;
```

### Temporary Files

```javascript
import * as os from 'os';
import * as path from 'path';

// Create temporary files for testing
const tempFile = path.join(os.tmpdir(), `test-${Date.now()}.json`);
const jsonDump = new StorageJsonDump(tempFile);

// Clean up after tests
afterEach(() => {
  jsonDump.destroy();
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
});
```

### Mock External Changes

```javascript
// Simulate external file changes for testing
const jsonDump = new StorageJsonDump('/path/to/test.json');

const unsubscribe = await jsonDump.subscribe((dump) => {
  console.log('Change detected:', dump.links.length);
});

// Simulate external change
const externalDump = { links: [...] };
await fs.promises.writeFile('/path/to/test.json', JSON.stringify(externalDump));

// Subscription will detect the change
```

## Integration Examples

### Basic File Storage

```javascript
const deep = newDeep();

// Set up JSON file storage
const storageJson = new deep.StorageJson({
  filePath: './data/associations.json',
  strategy: 'subscription'
});

await storageJson.promise;

// Create semantic entities
const User = new deep();
const user = new User();
const userName = new deep.String("Alice");

// Build relationships
user.type = User;
user.value = userName;

// Enable synchronization
User.store(storageJson, deep.storageMarkers.typedTrue);  // All User instances
user.store(storageJson, deep.storageMarkers.oneTrue);    // Specific instance
userName.store(storageJson, deep.storageMarkers.oneTrue); // String data

// Data is automatically saved to JSON file
// External changes to file are automatically loaded
```

### Multi-Instance Synchronization

```javascript
// Share JSON file between multiple Deep instances
const sharedFile = './shared/data.json';

// First instance
const deep1 = newDeep();
const storage1 = new deep1.StorageJson({
  filePath: sharedFile,
  strategy: 'subscription'
});

// Second instance
const deep2 = newDeep();
const storage2 = new deep2.StorageJson({
  filePath: sharedFile,
  strategy: 'subscription'
});

await Promise.all([storage1.promise, storage2.promise]);

// Changes in one instance sync to the other
const value1 = new deep1.String('shared-value');
value1.store(storage1, deep1.storageMarkers.oneTrue);

// After synchronization, value appears in deep2
// File watching ensures real-time sync
```

### Configuration Management

```javascript
// Use JSON storage for configuration
const deep = newDeep();
const configStorage = new deep.StorageJson({
  filePath: './config/app-config.json',
  strategy: 'delta'  // Immediate updates
});

await configStorage.promise;

// Create configuration structure
const Config = new deep();
const DatabaseConfig = new deep();
const ApiConfig = new deep();

const dbHost = new deep.String('localhost');
const dbPort = new deep.Number(5432);
const apiKey = new deep.String('secret-key');

// Build configuration hierarchy
DatabaseConfig.type = Config;
ApiConfig.type = Config;

// Store configuration
Config.store(configStorage, deep.storageMarkers.typedTrue);
dbHost.store(configStorage, deep.storageMarkers.oneTrue);
dbPort.store(configStorage, deep.storageMarkers.oneTrue);
apiKey.store(configStorage, deep.storageMarkers.oneTrue);

// Configuration changes are immediately saved
dbHost.data = 'production-db.example.com';
```

## Best Practices

### File Path Management

```javascript
// Use absolute paths for production
const storageJson = new deep.StorageJson({
  filePath: path.resolve('./data/storage.json'),
  strategy: 'subscription'
});

// Ensure directory exists
const dir = path.dirname(filePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}
```

### Error Recovery

```javascript
// Implement backup and recovery
const primaryFile = './data/storage.json';
const backupFile = './data/storage.backup.json';

const storageJson = new deep.StorageJson({
  filePath: primaryFile,
  strategy: 'subscription'
});

// Create periodic backups
setInterval(async () => {
  try {
    const dump = await storageJson._state.storageJsonDump.load();
    await fs.promises.writeFile(backupFile, JSON.stringify(dump, null, 2));
  } catch (error) {
    console.log('Backup failed:', error.message);
  }
}, 60000); // Every minute
```

### Performance Optimization

```javascript
// Optimize for your use case
const storageJson = new deep.StorageJson({
  filePath: './data/storage.json',
  strategy: 'delta' // Use delta for high-frequency updates
});

// Configure delays based on requirements
const jsonDump = storageJson._state.storageJsonDump;
jsonDump._insertDelay = 0;  // No delay for inserts
jsonDump._updateDelay = 0;  // No delay for updates
jsonDump._saveDaly = 100;   // Batch saves every 100ms
```

### Resource Cleanup

```javascript
// Always clean up resources
const storageJson = new deep.StorageJson({
  filePath: './data/storage.json',
  strategy: 'subscription'
});

// Handle process termination
process.on('SIGINT', () => {
  storageJson.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  storageJson.destroy();
  process.exit(0);
});
``` 