# Deep Framework Storage Synchronization

## Overview

Deep Framework provides automatic bi-directional synchronization between in-memory associations and external storage backends (currently Hasura GraphQL). This system allows you to work with Deep associations naturally while transparently persisting changes to a database.

## Core Example - Complete Database Synchronization

Here's a complete example showing the full synchronization lifecycle:

```typescript
import { newDeep } from 'deep7';
import { Hasyx } from 'hasyx';

// === PART 1: Create new Deep instance and sync to database ===

// Setup Hasura client
const hasyx = new Hasyx({
  url: 'https://your-hasura-app.hasura.app/v1/graphql',
  secret: 'your-admin-secret'
});

// Create new Deep instance
const deep = newDeep();

// Initialize storage synchronization
const storage = new deep.HasyxDeepStorage();
storage.initialize({ hasyxClient: hasyx });

// Create string associations
const stringA = new deep.String('a');
const stringB = new deep.String('b'); 
const stringC = new deep.String('c');

// Mark for database synchronization
stringA.store('database', deep.storageMarkers.oneTrue);
stringB.store('database', deep.storageMarkers.oneTrue);
stringC.store('database', deep.storageMarkers.oneTrue);

// Check storage status
console.log('String A is stored:', stringA.isStored('database')); // true
console.log('String B is stored:', stringB.isStored('database')); // true
console.log('String C is stored:', stringC.isStored('database')); // true

// Wait a moment for synchronization (in current implementation)
await new Promise(resolve => setTimeout(resolve, 1000));

// Verify strings exist in database
const resultA = await hasyx.select({
  table: 'deep.strings',
  where: { id: { _eq: stringA._id } },
  returning: ['id', '_data']
});
console.log('String A in database:', resultA[0]?._data || 'not found'); // 'a'

const resultsAll = await hasyx.select({
  table: 'deep.strings',
  where: { 
    id: { _in: [stringA._id, stringB._id, stringC._id] }
  },
  returning: ['id', '_data']
});
console.log('All strings in database:', resultsAll.map(r => r._data)); // ['a', 'b', 'c']

// Stop synchronization
storage.destroy();

// === PART 2: Load everything from database ===

// Create new Deep instance from database
const existingResult = await hasyx.select({
  table: 'deep.links',
  returning: ['id', '_i', '_type', '_from', '_to', '_value'],
  order_by: [{ _i: 'asc' }]
});

const existingIds = existingResult.map(link => link.id);

// Create Deep instance with existing IDs
const restoredDeep = newDeep({ existingIds });

// Initialize storage for restored instance
const restoredStorage = new restoredDeep.HasyxDeepStorage();
restoredStorage.initialize({ hasyxClient: hasyx });

// Load string data and establish associations
const stringResults = await hasyx.select({
  table: 'deep.strings',
  returning: ['id', '_data', { link: ['_type'] }]
});

// Restore string data to associations
for (const stringData of stringResults) {
  const association = new restoredDeep(stringData.id);
  association._data = stringData._data; // Restore string content
  if (stringData.link._type) {
    association._type = stringData.link._type; // Restore type
  }
}

// Check that our strings a, b, c are present with original IDs
const restoredA = new restoredDeep(stringA._id);
const restoredB = new restoredDeep(stringB._id);
const restoredC = new restoredDeep(stringC._id);

console.log('Restored string A data:', restoredA._data); // 'a'
console.log('Restored string B data:', restoredB._data); // 'b'
console.log('Restored string C data:', restoredC._data); // 'c'

// Verify they are properly typed
const stringType = restoredDeep.String;
console.log('String A is typed as String:', restoredA._type === stringType._id); // true
console.log('String B is typed as String:', restoredB._type === stringType._id); // true
console.log('String C is typed as String:', restoredC._type === stringType._id); // true

// Verify that deep.String.typed contains our restored strings
const typedStrings = stringType.typed; // All instances with String type
console.log('Number of typed strings:', typedStrings.size); // Should include a, b, c

// Cleanup
restoredStorage.destroy();
```

This example demonstrates:
1. **Creating new Deep instance** and initializing synchronization
2. **Creating associations** (strings with data 'a', 'b', 'c')
3. **Marking for storage** using `.store()` method
4. **Checking storage status** with `.isStored()` method
5. **Verifying database contents** after synchronization
6. **Loading from database** - creating new Deep instance from existing data
7. **Verifying restored data** - checking that all strings are properly loaded and typed

> **Note**: The current implementation is in active development. Event-based synchronization (using promises and event listeners) is being developed. The above example shows the basic workflow that will be enhanced with automatic event handling in future versions.

## Architecture

The storage synchronization system consists of several key components:

- **HasyxDeepStorage**: Main synchronization engine that connects Deep Framework to Hasura
- **Storage Markers**: System for tracking which associations should be synchronized
- **Event System**: Automatic detection and handling of association changes
- **Database Schema**: Optimized schema for storing Deep associations and their relationships

## Quick Start

### 1. Setup Database Connection

```typescript
import { newDeep } from 'deep7';
import { Hasyx } from 'hasyx';

// Create Deep instance
const deep = newDeep();

// Setup Hasura client
const hasyx = new Hasyx({
  url: 'https://your-hasura-app.hasura.app/v1/graphql',
  secret: 'your-admin-secret'
});

// Initialize storage synchronization
const storage = new deep.HasyxDeepStorage();
storage.initialize({ hasyxClient: hasyx });
```

### 2. Mark Associations for Storage

```typescript
// Create associations
const user = new deep();
const profile = new deep();
const data = new deep.String("John Doe");

// Establish relationships
user.type = profile;
profile.value = data;

// Mark for database synchronization
user.store('database', deep.storageMarkers.oneTrue);
profile.store('database', deep.storageMarkers.oneTrue);
data.store('database', deep.storageMarkers.oneTrue);
```

### 3. Automatic Synchronization

Once marked with `.store()`, associations are automatically synchronized:
- **Creates**: New associations are inserted into database
- **Updates**: Link changes (_type, _from, _to, _value) are updated
- **Data**: String, Number, Function data is synchronized
- **Deletes**: Removed associations are deleted from database

## Core Concepts

### Association Storage Markers

Storage markers determine how associations are synchronized:

```typescript
// Mark association for synchronization
association.store(storageId, markerId);

// Available markers
deep.storageMarkers.oneTrue    // Synchronize this association
deep.storageMarkers.oneFalse   // Exclude from synchronization
deep.storageMarkers.typedTrue  // Synchronize all associations of this type
deep.storageMarkers.typedFalse // Exclude all associations of this type

// Remove from synchronization
association.unstore(storageId, markerId);
```

### Database Schema

The system uses an optimized schema in Hasura:

```sql
-- Core associations table
deep.links (
  id uuid PRIMARY KEY,
  _i bigint,              -- Sequence number
  _type uuid,             -- Reference to type association
  _from uuid,             -- Reference to source association  
  _to uuid,               -- Reference to target association
  _value uuid,            -- Reference to value association
  created_at timestamptz,
  updated_at timestamptz
)

-- Typed data tables
deep.strings (
  id uuid PRIMARY KEY REFERENCES deep.links(id),
  _data text
)

deep.numbers (
  id uuid PRIMARY KEY REFERENCES deep.links(id), 
  _data numeric
)

deep.functions (
  id uuid PRIMARY KEY REFERENCES deep.links(id),
  _data jsonb
)
```

## Working with Synchronized Associations

### Creating Associations

```typescript
const deep = newDeep();
const storage = new deep.HasyxDeepStorage();
await storage.initialize({ hasyxClient: hasyx });

// Create user entity
const User = new deep();
const user = new User();
const userName = new deep.String("Alice");

// Establish relationships
user.type = User;
user.value = userName;

// Mark for synchronization (automatic DB insert)
User.store('database', deep.storageMarkers.oneTrue);
user.store('database', deep.storageMarkers.oneTrue);
userName.store('database', deep.storageMarkers.oneTrue);

// The system automatically:
// 1. Inserts User association into deep.links
// 2. Inserts user association with _type = User._id
// 3. Inserts userName into deep.strings
// 4. Updates user association with _value = userName._id
```

### Updating Associations

```typescript
// Change user's name
const newName = new deep.String("Bob");
newName.store('database', deep.storageMarkers.oneTrue);

// Update relationship (triggers DB update)
user.value = newName;

// Change user type
const AdminUser = new deep();
AdminUser.store('database', deep.storageMarkers.oneTrue);
user.type = AdminUser; // Automatically updates _type in database
```

### Creating Relationships

```typescript
// Create entities
const post = new deep();
const author = user; // From previous example

// Create relationship
post.from = author; // "post is from author"
post.store('database', deep.storageMarkers.oneTrue);

// Access relationships
const postAuthor = post.from;   // Gets author
const userPosts = author.out;   // Gets all posts from this author
```

### Working with Collections

```typescript
// Create a set of tags
const tags = new deep.Set();
tags.add(new deep.String("javascript"));
tags.add(new deep.String("database"));

// Associate with post
post.value = tags;

// Mark for synchronization
tags.store('database', deep.storageMarkers.oneTrue);
```

## Synchronization Events

The system provides events to track synchronization status:

```typescript
// Listen for synchronization events
deep.on(deep.events.storeAdded._id, (payload) => {
  console.log('Association marked for storage:', payload._source);
});

deep.on(deep.events.dbAssociationCreated._id, (payload) => {
  console.log('Association created in database:', payload._source);
});

deep.on(deep.events.dbLinkUpdated._id, (payload) => {
  console.log('Association updated in database:', payload._source);
});

deep.on(deep.events.dbDataUpdated._id, (payload) => {
  console.log('Association data updated:', payload._source);
});
```

### Waiting for Synchronization

```typescript
// Wait for specific association to be synchronized
async function waitForSync(association) {
  return new Promise((resolve) => {
    const disposer = association.on(deep.events.dbAssociationCreated._id, (payload) => {
      if (payload._source === association._id) {
        disposer(); // Cleanup listener
        resolve(true);
      }
    });
  });
}

// Usage
const user = new deep();
user.store('database', deep.storageMarkers.oneTrue);
await waitForSync(user);
console.log('User synchronized to database!');
```

### Batch Synchronization

```typescript
// Wait for multiple associations
async function waitForBatchSync(associations) {
  const promises = associations.map(assoc => waitForSync(assoc));
  await Promise.all(promises);
}

// Create multiple related associations
const entities = [];
for (let i = 0; i < 10; i++) {
  const entity = new deep();
  entity.value = new deep.String(`Entity ${i}`);
  entity.store('database', deep.storageMarkers.oneTrue);
  entities.push(entity);
}

await waitForBatchSync(entities);
console.log('All entities synchronized!');
```

## Loading from Storage

### Restoring Deep Instance from Database

```typescript
// Method 1: Create newDeep with existing IDs
async function loadFromDatabase(hasyx) {
  // Fetch all association IDs from database
  const result = await hasyx.select({
    table: 'deep.links',
    returning: ['id', '_i', '_type', '_from', '_to', '_value'],
    order_by: [{ _i: 'asc' }] // Restore in creation order
  });
  
  const existingIds = result.map(link => link.id);
  
  // Create Deep instance with existing IDs
  const deep = newDeep({ existingIds });
  
  // Initialize storage
  const storage = new deep.HasyxDeepStorage();
  await storage.initialize({ hasyxClient: hasyx });
  
  return deep;
}

// Usage
const deep = await loadFromDatabase(hasyx);
// Now all existing associations are available with their original IDs
```

### Loading Specific Data Types

```typescript
// Load all strings with their associations
async function loadStrings(hasyx) {
  const result = await hasyx.select({
    table: 'deep.strings',
    returning: [
      'id',
      '_data',
      { link: ['_type', '_from', '_to', '_value'] }
    ]
  });
  
  return result.map(item => ({
    id: item.id,
    data: item._data,
    type: item.link._type,
    from: item.link._from,
    to: item.link._to,
    value: item.link._value
  }));
}
```

### Incremental Loading

```typescript
// Load associations created after specific sequence number
async function loadSince(hasyx, lastSequence = 0) {
  const result = await hasyx.select({
    table: 'deep.links', 
    where: { _i: { _gt: lastSequence } },
    returning: ['id', '_i', '_type', '_from', '_to', '_value'],
    order_by: [{ _i: 'asc' }]
  });
  
  return result;
}

// Load and apply incremental changes
async function syncFromDatabase(deep, hasyx, lastSequence) {
  const changes = await loadSince(hasyx, lastSequence);
  
  for (const change of changes) {
    const association = new deep(change.id);
    if (change._type) association._type = change._type;
    if (change._from) association._from = change._from;
    if (change._to) association._to = change._to;
    if (change._value) association._value = change._value;
  }
  
  return changes.length > 0 ? Math.max(...changes.map(c => c._i)) : lastSequence;
}
```

## Advanced Usage

### Custom Storage Backends

```typescript
// Extend HasyxDeepStorage for custom backends
class CustomDeepStorage extends deep.HasyxDeepStorage {
  async handleAssociationCreated(payload) {
    // Custom logic for your storage backend
    await this.customBackend.create(payload);
    return super.handleAssociationCreated(payload);
  }
}
```

### Selective Synchronization

```typescript
// Only synchronize specific types
const UserType = new deep();
const PostType = new deep();

// Mark types for synchronization
UserType.store('database', deep.storageMarkers.typedTrue);
PostType.store('database', deep.storageMarkers.typedTrue);

// All instances of UserType and PostType will be automatically synchronized
const user = new UserType(); // Auto-synchronized
const post = new PostType(); // Auto-synchronized
const comment = new deep();   // Not synchronized
```

### Performance Optimization

```typescript
// Batch operations for better performance
async function bulkCreate(deep, items) {
  const associations = [];
  
  // Create all associations first
  for (const item of items) {
    const assoc = new deep();
    assoc.value = new deep.String(item.name);
    associations.push(assoc);
  }
  
  // Mark all for storage at once
  for (const assoc of associations) {
    assoc.store('database', deep.storageMarkers.oneTrue);
  }
  
  // Wait for batch completion
  await waitForBatchSync(associations);
  
  return associations;
}
```

## Error Handling

```typescript
// Handle synchronization errors
storage.on(deep.events.dbBatchFailed._id, (error) => {
  console.error('Synchronization failed:', error);
  // Implement retry logic or fallback
});

// Monitor synchronization status
let syncInProgress = false;
storage.on(deep.events.dbBatchStarted._id, () => {
  syncInProgress = true;
});

storage.on(deep.events.dbBatchCompleted._id, () => {
  syncInProgress = false;
});
```

## Best Practices

### 1. Initialize Storage Early
```typescript
// Initialize storage before creating associations
const deep = newDeep();
const storage = new deep.HasyxDeepStorage();
await storage.initialize({ hasyxClient: hasyx });

// Now create and work with associations
```

### 2. Use Meaningful Types
```typescript
// Create semantic types
const User = new deep();
const Post = new deep();
const Comment = new deep();

// Use them consistently
const user = new User();
const post = new Post();
post.from = user; // "post from user"
```

### 3. Cleanup Resources
```typescript
// Always cleanup when done
try {
  // Work with storage
} finally {
  storage.destroy(); // Cleanup listeners and connections
}
```

### 4. Monitor Performance
```typescript
// Track synchronization metrics
let syncCount = 0;
storage.on(deep.events.dbAssociationCreated._id, () => {
  syncCount++;
  if (syncCount % 100 === 0) {
    console.log(`Synchronized ${syncCount} associations`);
  }
});
```

## Troubleshooting

### Common Issues

1. **Associations not synchronizing**
   - Check if association is marked with `.store()`
   - Verify storage is initialized
   - Check database connectivity

2. **Performance issues**
   - Use batch operations for bulk changes
   - Consider selective synchronization
   - Monitor sync event frequency

3. **Data inconsistency**
   - Ensure proper cleanup on errors
   - Use transactions for related changes
   - Implement conflict resolution

### Debug Mode

```typescript
// Enable debug logging
DEBUG="deep7:hasyx:*" npm start

// Or in code
import Debug from 'debug';
const debug = Debug('your-app:storage');
debug('Storage operation completed');
```

This synchronization system provides a seamless bridge between Deep Framework's powerful association system and persistent storage, enabling applications that work naturally with semantic data while maintaining full database backing.

### Synchronization Events

Monitor sync status with events:

```typescript
// Listen for sync events
deep.on(deep.events.dbAssociationCreated._id, (payload) => {
  console.log('Association synced to database:', payload._source);
});

// Wait for specific sync completion
async function waitForSync(association) {
  return new Promise(resolve => {
    const disposer = association.on(deep.events.dbAssociationCreated._id, (payload) => {
      if (payload._source === association._id) {
        disposer();
        resolve(true);
      }
    });
  });
}

// Usage
const user = new deep();
user.store('database', deep.storageMarkers.oneTrue);
await waitForSync(user);
console.log('User synchronized!');
```

### Promise-Based Synchronization Tracking

Deep Framework provides built-in promise chaining for tracking asynchronous operations:

#### Basic Promise Usage

```typescript
// Any association can track async operations
const user = new deep();

// Get current promise (creates resolved promise if none exists)
const currentPromise = user.promise; // Promise<boolean>

// Set async operation
user.promise = new Promise(resolve => {
  // Simulate async database operation
  setTimeout(() => resolve('sync complete'), 1000);
});

// Wait for completion
await user.promise;
console.log('All async operations completed');
```

#### Promise Chaining

Promises automatically chain to ensure proper execution order:

```typescript
const storage = new deep.HasyxDeepStorage();

// First operation
storage.promise = createUserInDatabase();

// Second operation (waits for first to complete)
storage.promise = updateUserProfile();

// Third operation (waits for second to complete)  
storage.promise = sendNotification();

// Wait for all operations
await storage.promise;
console.log('All synchronization operations completed');
```

#### Storage Promise Integration

HasyxDeepStorage automatically uses promises for operation tracking:

```typescript
// Initialize storage
const storage = new deep.HasyxDeepStorage();
await storage.initialize({ hasyxClient: hasyx });

// Create multiple associations
const user1 = new deep();
const user2 = new deep();
const user3 = new deep();

// Mark for synchronization (triggers async operations)
user1.store('database', deep.storageMarkers.oneTrue);
user2.store('database', deep.storageMarkers.oneTrue);
user3.store('database', deep.storageMarkers.oneTrue);

// Wait for all storage operations to complete
await storage.promise;
console.log('All users synchronized to database');

// Check individual association status
await user1.promise; // Resolves when user1 sync is complete
console.log('User1 specifically is synchronized');
```

#### Promise Status Checking

```typescript
// Check if operations are pending
const isPending = user.promise !== Promise.resolve();

// Get detailed promise status
import { getPromiseStatus } from 'deep7/lib/promise';

const status = getPromiseStatus(user);
console.log('Has promise:', status.hasPromise);
console.log('Is pending:', status.isPending);
console.log('Current promise:', status.promise);
```

#### Error Handling in Promises

```typescript
try {
  // Set operation that might fail
  user.promise = riskyDatabaseOperation();
  
  // Wait for completion
  await user.promise;
  console.log('Operation successful');
} catch (error) {
  console.error('Sync operation failed:', error);
  
  // Reset to clean state
  delete user.promise; // Creates new resolved promise
}
``` 