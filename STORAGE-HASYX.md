# STORAGE-HASYX.md - Hasyx Database Storage Implementation Documentation

## Overview

The Hasyx Database Storage Implementation (`storage-hasyx.ts`) provides a real-time database-backed storage for the Deep Framework. It uses the Hasyx GraphQL client to interact with Hasura/PostgreSQL databases, providing persistent storage with real-time subscriptions, space isolation, and configurable delays for testing. This module is designed for production use where real database persistence and real-time synchronization are required.

## Core Components

### StorageHasyxDump Class

The `StorageHasyxDump` class provides real database storage through Hasyx with space isolation, real-time subscriptions, and configurable delays.

```javascript
import { StorageHasyxDump } from './storage-hasyx';
import { Hasyx } from 'hasyx';

// Create hasyx client
const hasyx = new Hasyx({
  wsUrl: 'wss://your-hasura-instance.com/v1/graphql',
  httpUrl: 'https://your-hasura-instance.com/v1/graphql',
  adminSecret: 'your-admin-secret'
});

// Create with space isolation
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');

// Create with initial data
const initialDump = { links: [...] };
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123', initialDump);
```

#### Space Isolation

StorageHasyxDump implements the Deep Framework space model where `deepSpaceId` corresponds to a root link:

```javascript
// Each space is isolated by deepSpaceId
const userSpace = new StorageHasyxDump(hasyx, 'user-123');
const projectSpace = new StorageHasyxDump(hasyx, 'project-456');

// Data in different spaces is completely isolated
await userSpace.insert(userLink);    // Only in user-123 space
await projectSpace.insert(projectLink); // Only in project-456 space
```

#### Configuration Properties

```javascript
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');

// Configurable delays (in milliseconds)
hasyxDump._saveDelay = 100;        // Save operation delay
hasyxDump._loadDelay = 50;         // Load operation delay
hasyxDump._insertDelay = 30;       // Insert operation delay
hasyxDump._deleteDelay = 30;       // Delete operation delay
hasyxDump._updateDelay = 30;       // Update operation delay
hasyxDump._subscribeInterval = 200; // Polling fallback interval

// Auto-stop configuration for polling fallback
hasyxDump._defaultIntervalMaxCount = 30; // Max polling intervals before auto-stop
```

#### Core Operations

##### Save Operation
```javascript
const dump = { links: [...] };
await hasyxDump.save(dump);
console.log('Dump saved to database with space isolation');
```

**Features:**
- Atomic database operations
- Space isolation through `_deep` column
- Root link validation (id == deepSpaceId for NULL _type)
- Configurable save delays for testing
- Automatic clearing of existing space data before save

##### Load Operation
```javascript
const dump = await hasyxDump.load();
console.log('Loaded', dump.links.length, 'links from database space');
```

**Features:**
- Space-filtered database queries
- Automatic data mapping from database to StorageLink format
- Configurable load delays for testing
- Graceful handling of empty spaces

##### Insert Operation
```javascript
const link = {
  _id: 'new-link',
  _type: 'String',
  _created_at: Date.now(),
  _updated_at: Date.now(),
  _string: 'test value'
};

await hasyxDump.insert(link);
console.log('Link inserted into database');
```

**Features:**
- Database constraints validation
- Space isolation enforcement
- Root link validation
- Delta callback notifications
- Error handling with detailed messages

##### Delete Operation
```javascript
const linkToDelete = { _id: 'existing-link', /* ... */ };
await hasyxDump.delete(linkToDelete);
console.log('Link deleted from database');
```

**Features:**
- Existence validation in database
- Space-isolated deletion
- Affected rows verification
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

await hasyxDump.update(updatedLink);
console.log('Link updated in database');
```

**Features:**
- Database existence validation
- Atomic update operations
- Space isolation enforcement
- Delta callback notifications

#### Real-time Subscription System

The subscription system provides real-time change notifications through Hasyx GraphQL subscriptions with automatic polling fallback.

**Important Limitations:**
- Hasyx subscriptions trigger **no more than once per second** (1000ms minimum interval)
- While called "real-time", actual update frequency is limited to 1Hz
- Tests must wait >1000ms for subscription updates to propagate

##### Basic Subscription
```javascript
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');

// Subscribe to real-time database changes
const unsubscribe = await hasyxDump.subscribe((dump) => {
  console.log('Database change detected:', dump.links.length, 'links');
});

// Changes from other processes/instances will trigger notifications
// Unsubscribe when done
unsubscribe();
```

##### GraphQL Subscription Query
The implementation uses the following GraphQL subscription:

```graphql
subscription linksInSpace($deepSpaceId: uuid!) {
  deep_links(where: {_deep: {_eq: $deepSpaceId}}) {
    id
    _deep
    _type
    _from
    _to
    _value
    string
    number
    function
    created_at
    updated_at
    _i
  }
}
```

##### Multiple Subscribers
```javascript
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');

// Multiple subscribers receive the same notifications
const unsubscribe1 = await hasyxDump.subscribe((dump) => {
  console.log('Subscriber 1:', dump.links.length);
});

const unsubscribe2 = await hasyxDump.subscribe((dump) => {
  console.log('Subscriber 2:', dump.links.length);
});

// Both will be notified of database changes
// Clean up
unsubscribe1();
unsubscribe2();
```

##### Polling Fallback
```javascript
// If GraphQL subscriptions fail, automatic polling fallback is used
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');
hasyxDump._subscribeInterval = 1000; // 1 second polling
hasyxDump._defaultIntervalMaxCount = 30; // Auto-stop after 30 intervals

const unsubscribe = await hasyxDump.subscribe((dump) => {
  console.log('Change detected via polling fallback');
});

// Polling will automatically stop after maxCount intervals
// Or stop immediately when unsubscribe() is called
```

#### Delta Callbacks

Delta callbacks provide immediate notification of local changes without polling.

```javascript
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');

// Set delta callback
hasyxDump._onDelta = (delta) => {
  console.log('Local delta:', delta.operation, delta.id || delta.link?._id);
};

// Operations trigger delta callbacks immediately
await hasyxDump.insert(newLink);    // Triggers: { operation: 'insert', link: ... }
await hasyxDump.update(updatedLink); // Triggers: { operation: 'update', id: ..., link: ... }
await hasyxDump.delete(linkToDelete); // Triggers: { operation: 'delete', id: ... }
```

### StorageHasyx Function

The `newStorageHasyx` function creates a Deep Framework storage implementation using `StorageHasyxDump`.

#### Basic Usage

```javascript
const deep = newDeep();
const hasyx = new Hasyx({
  wsUrl: 'wss://your-hasura-instance.com/v1/graphql',
  httpUrl: 'https://your-hasura-instance.com/v1/graphql',
  adminSecret: 'your-admin-secret'
});

// Create StorageHasyx with subscription strategy
const storageHasyx = new deep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'space-123'
});

// Wait for initialization
await storageHasyx.promise;
```

#### Configuration Options

```javascript
const storageHasyx = new deep.StorageHasyx({
  hasyx: hasyxClient,              // Required: Hasyx client instance
  deepSpaceId: 'space-123',        // Required: Space isolation ID
  strategy: 'subscription',        // Optional: 'subscription' (default)
  storage: existingStorage,        // Optional: existing storage to use
  dump: initialDump,               // Optional: initial dump to apply
  storageJsonDump: existingDump    // Optional: existing StorageHasyxDump instance
});
```

#### Environment Variables

For real database connections, set these environment variables:

```bash
# Required for production
NEXT_PUBLIC_HASURA_GRAPHQL_URL=https://your-hasura-instance.com/v1/graphql
HASURA_ADMIN_SECRET=your-admin-secret

# Optional for WebSocket subscriptions
NEXT_PUBLIC_HASURA_GRAPHQL_WS_URL=wss://your-hasura-instance.com/v1/graphql
```

#### Database Schema

StorageHasyx expects a `deep_links` table with the following schema:

```sql
CREATE TABLE deep_links (
  id UUID PRIMARY KEY,
  _deep UUID NOT NULL,
  _type UUID,
  _from UUID,
  _to UUID,
  _value UUID,
  string TEXT,
  number DOUBLE PRECISION,
  function TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  _i BIGINT
);

-- Index for space isolation
CREATE INDEX idx_deep_links_deep ON deep_links(_deep);
```

#### Synchronization Strategy

StorageHasyx uses subscription-based synchronization by default:

```javascript
const deep = newDeep();
const hasyx = new Hasyx({ /* config */ });

const storageHasyx = new deep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'space-123',
  strategy: 'subscription' // Real-time database synchronization
});

await storageHasyx.promise;

// Bi-directional synchronization is now active:
// 1. Local changes → Database
// 2. Database changes → Local Deep instance (via subscriptions)
```

#### Working with Spaces

```javascript
const deep = newDeep();
const hasyx = new Hasyx({ /* config */ });

// Create storage for specific space
const userStorage = new deep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'user-123'
});

// Apply default marking for this space
defaultMarking(deep, userStorage);
await userStorage.promise;

// Create and store data in this space
const userData = new deep.String('user data');
userData.store(userStorage, deep.storageMarkers.oneTrue);

// Data is automatically isolated to 'user-123' space in database
```

#### Integration with newDeep

```javascript
// Create newDeep with hasyx storage
const deep = newDeep();
const hasyx = new Hasyx({ /* config */ });

const storageHasyx = new deep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'my-space'
});

// Make it the default storage
deep.storage = storageHasyx;

// Apply default marking
defaultMarking(deep, storageHasyx);
await storageHasyx.promise;

// Now all operations use database storage
const stringData = new deep.String('test');
stringData.stored(deep.storageMarkers.oneTrue); // Stored in database

// Real-time synchronization across all instances
const anotherDeep = newDeep();
const anotherStorage = new anotherDeep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'my-space' // Same space
});

// Both instances will stay synchronized via database subscriptions
```

## Testing with Mock Hasyx

For testing without a real database connection:

```javascript
import { StorageHasyxDump } from './storage-hasyx';

// Create mock hasyx client
const mockHasyx = {
  select: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({ affected_rows: 1 }),
  delete: jest.fn().mockResolvedValue({ affected_rows: 1 }),
  subscribe: jest.fn().mockResolvedValue(() => {})
} as any;

// Use in tests
const testDump = new StorageHasyxDump(mockHasyx, 'test-space');
const deep = newDeep();
const testStorage = new deep.StorageHasyx({
  hasyx: mockHasyx,
  deepSpaceId: 'test-space'
});
```

## Error Handling

StorageHasyx provides comprehensive error handling:

```javascript
try {
  await hasyxDump.insert(invalidLink);
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('Duplicate link detected');
  } else if (error.message.includes('not found')) {
    console.log('Link not found for operation');
  } else if (error.message.includes('null _type')) {
    console.log('Root link validation failed');
  } else {
    console.log('Database error:', error.message);
  }
}
```

## Performance Considerations

1. **Subscription Frequency**: Hasyx subscriptions are limited to 1Hz (once per second)
2. **Space Isolation**: Each space is a separate database partition for optimal performance
3. **Configurable Delays**: Adjust delays based on your testing vs production needs
4. **Connection Pooling**: Hasyx handles connection pooling automatically
5. **Batch Operations**: Use `save()` for bulk operations instead of multiple `insert()` calls

## Cleanup and Resource Management

```javascript
// Manual cleanup
const hasyxDump = new StorageHasyxDump(hasyx, 'space-123');
const unsubscribe = await hasyxDump.subscribe(() => {});

// Always cleanup subscriptions
unsubscribe();
hasyxDump.destroy();

// Automatic cleanup for Deep Framework integration
const storageHasyx = new deep.StorageHasyx({
  hasyx: hasyx,
  deepSpaceId: 'space-123'
});

// Cleanup happens automatically on storage destruction
storageHasyx.destroy(); // Cleans up subscriptions and resources

// Global test cleanup (for Jest)
import { destroyAllSubscriptions } from './storage-hasyx';

afterAll(() => {
  destroyAllSubscriptions(); // Prevents Jest from hanging
});
```

## Production Best Practices

1. **Environment Variables**: Always use environment variables for database credentials
2. **Error Handling**: Implement proper error handling for database connectivity issues
3. **Space Management**: Plan your space isolation strategy based on your data model
4. **Monitoring**: Monitor database performance and subscription health
5. **Backup**: Implement database backup strategies for production data
6. **Testing**: Use mock hasyx clients for unit tests, real database for integration tests

## Comparison with Other Storage Implementations

| Feature | StorageHasyx | StorageJson | StorageLocal |
|---------|--------------|-------------|--------------|
| **Persistence** | Real Database | JSON Files | In-Memory |
| **Real-time Sync** | GraphQL Subscriptions (1Hz) | File Watching | Polling |
| **Multi-process** | ✅ Database-backed | ✅ File-based | ❌ Memory-only |
| **Space Isolation** | ✅ Database partitions | ❌ Single file | ❌ Single instance |
| **Production Ready** | ✅ Yes | ✅ Yes | ❌ Testing only |
| **Scalability** | ✅ Database scaling | ⚠️ File system limits | ❌ Single process |
| **Atomic Operations** | ✅ Database transactions | ✅ Atomic file writes | ✅ Memory operations |
| **Dependencies** | Hasyx + Database | File System | None |

StorageHasyx is the recommended choice for production applications requiring real database persistence, multi-process synchronization, and space isolation. 