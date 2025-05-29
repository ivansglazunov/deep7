# STORAGE.md - Core Storage System Documentation

## Overview

The Core Storage System (`storage.ts`) provides the foundational infrastructure for implementing storage backends in the Deep Framework. It defines the Storage Alive class with event handlers, serialization interfaces, and utility functions for storage implementations. This module serves as the base for all concrete storage implementations.

## Core Interfaces

### StorageDump

Represents a complete snapshot of stored associations for serialization and restoration.

```typescript
interface StorageDump {
  ids?: string[];        // Optional identifiers for newDeep() restoration
  links: StorageLink[];  // Array of stored associations
}
```

### StorageLink

Represents an association in storage format with all necessary metadata.

```typescript
interface StorageLink {
  _id: string;           // Unique association identifier
  _type: string;         // Type association ID (required for storage)
  _from?: string;        // From association ID (optional)
  _to?: string;          // To association ID (optional)
  _value?: string;       // Value association ID (optional)
  _created_at: number;   // Creation timestamp
  _updated_at: number;   // Last update timestamp
  _i?: number;           // Sequence number (auto-assigned if not specified)
  _function?: string;    // Function data (for Function type)
  _number?: number;      // Number data (for Number type)
  _string?: string;      // String data (for String type)
}
```

### StorageDelta

Represents incremental changes for real-time synchronization.

```typescript
interface StorageDelta {
  operation: 'insert' | 'delete' | 'update';
  id?: string;           // Association ID (for delete operations)
  link?: StorageLink;    // Full link data (for insert/update operations)
}
```

## Storage Alive Class

The Storage class is implemented as an Alive instance with construction and destruction handlers.

### Construction Phase

During construction, the Storage instance initializes:

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Storage state is initialized with methods and event handlers
const state = storage._state;

// Core methods available:
// - generateDump(): StorageDump
// - watch(): void (starts event subscriptions)

// Event handlers (to be set by implementations):
// - onLinkInsert: (link: StorageLink) => void
// - onLinkDelete: (link: StorageLink) => void  
// - onLinkUpdate: (link: StorageLink) => void
// - onDataChanged: (link: StorageLink) => void
// - onDestroy: () => void
```

### Event System Integration

The Storage class automatically subscribes to Deep Framework events:

#### Storage Events
- **`storeAdded`** - Triggered when associations are stored
- **`storeRemoved`** - Triggered when storage markers are removed

#### Global Events  
- **`globalLinkChanged`** - Triggered when association links change
- **`globalDataChanged`** - Triggered when association data changes
- **`globalDestroyed`** - Triggered when associations are destroyed

### Event Handler Implementation

Storage implementations should set event handlers during initialization:

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Set up event handlers
storage._state.onLinkInsert = (link) => {
  console.log('Insert:', link._id);
  // Implement storage-specific insert logic
};

storage._state.onLinkDelete = (link) => {
  console.log('Delete:', link._id);
  // Implement storage-specific delete logic
};

storage._state.onLinkUpdate = (link) => {
  console.log('Update:', link._id);
  // Implement storage-specific update logic
};

storage._state.onDataChanged = (link) => {
  console.log('Data changed:', link._id);
  // Implement storage-specific data change logic
};

storage._state.onDestroy = () => {
  console.log('Storage destroyed');
  // Implement cleanup logic
};

// Start watching for events
storage._state.watch();
```

## Core Utility Functions

### `_generateDump(deep, storage)`

Generates a complete dump of all associations stored in the given storage.

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Store some associations
const association1 = new deep();
association1.type = deep.String;
association1.data = 'test';
association1.store(storage, deep.storageMarkers.oneTrue);

// Generate dump
const dump = storage._state.generateDump();
console.log('Dump contains:', dump.links.length, 'links');
```

**Features:**
- Only includes associations with storage markers for the specified storage
- Automatically includes type dependencies
- Sorts links by sequence number for consistent ordering
- Includes all necessary metadata for restoration

### `_sortDump(links, needResortI?)`

Sorts storage links by sequence number with optional reassignment.

```javascript
const links = [
  { _id: 'a', _i: 3, /* ... */ },
  { _id: 'b', _i: 1, /* ... */ },
  { _id: 'c', _i: 2, /* ... */ }
];

// Sort by existing sequence numbers
const sorted = _sortDump(links);
console.log(sorted.map(l => l._i)); // [1, 2, 3]

// Sort and reassign sequence numbers
const resorted = _sortDump(links, true);
console.log(resorted.map(l => l._i)); // [1, 2, 3] (reassigned)
```

### `_validateDependencies(deep, link, storage)`

Validates that all dependencies of a link are stored in the same storage.

```javascript
const deep = newDeep();
const storage = new deep.Storage();

const link = {
  _id: 'test',
  _type: 'some-type',
  _from: 'some-from',
  // ... other fields
};

try {
  _validateDependencies(deep, link, storage);
  console.log('Dependencies valid');
} catch (error) {
  console.log('Validation failed:', error.message);
}
```

**Validation Rules:**
- `_type` must be stored in the same storage (if not deep._id)
- `_from` must be stored in the same storage (if present)
- `_to` must be stored in the same storage (if present)  
- `_value` must be stored in the same storage (if present)

### `_applyDelta(deep, delta, storage, skipValidation?)`

Applies a single delta operation to the Deep instance.

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Apply insert delta
const insertDelta = {
  operation: 'insert',
  link: {
    _id: 'new-assoc',
    _type: deep.String._id,
    _created_at: Date.now(),
    _updated_at: Date.now(),
    _string: 'test value'
  }
};

_applyDelta(deep, insertDelta, storage);

// Association is now available
const newAssoc = new deep('new-assoc');
console.log(newAssoc.data); // 'test value'
```

**Delta Operations:**
- **insert** - Creates new association with all links and data
- **delete** - Destroys association and cleans up references
- **update** - Updates existing association links and data

**Recursion Prevention:**
Uses `deep.Deep.__isStorageEvent` flag to prevent infinite loops during storage synchronization.

### `_applySubscription(deep, dump, storage)`

Applies a complete dump to restore associations from storage.

```javascript
const deep = newDeep();
const storage = new deep.Storage();

const dump = {
  links: [
    {
      _id: 'restored-assoc',
      _type: deep.String._id,
      _created_at: Date.now(),
      _updated_at: Date.now(),
      _string: 'restored value'
    }
  ]
};

await _applySubscription(deep, dump, storage);

// Association is restored
const restored = new deep('restored-assoc');
console.log(restored.data); // 'restored value'
```

**Features:**
- Processes links in dependency order
- Handles type dependencies automatically
- Prevents recursion during restoration
- Validates dependencies before application

### `defaultMarking(deep, storage)`

Applies default storage markers to essential framework types.

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Apply default marking
defaultMarking(deep, storage);

// Essential types are now marked for storage
console.log(deep.String.isStored(storage)); // true
console.log(deep.Number.isStored(storage)); // true
console.log(deep.Function.isStored(storage)); // true
```

**Default Markers Applied:**
- `deep.String` → `typedTrue`
- `deep.Number` → `typedTrue`  
- `deep.Function` → `typedTrue`
- `deep.Storage` → `typedTrue`
- `deep.StorageMarker` → `typedTrue`
- All storage marker instances → `oneTrue`

## Implementation Patterns

### Basic Storage Implementation

```javascript
const deep = newDeep();

// Create storage with event handlers
const storage = new deep.Storage();

// Set up persistence layer (example: in-memory)
const persistedData = new Map();

storage._state.onLinkInsert = async (link) => {
  persistedData.set(link._id, link);
  console.log('Persisted insert:', link._id);
};

storage._state.onLinkDelete = async (link) => {
  persistedData.delete(link._id);
  console.log('Persisted delete:', link._id);
};

storage._state.onLinkUpdate = async (link) => {
  persistedData.set(link._id, link);
  console.log('Persisted update:', link._id);
};

storage._state.onDestroy = () => {
  persistedData.clear();
  console.log('Storage destroyed');
};

// Start event watching
storage._state.watch();

// Apply default marking
defaultMarking(deep, storage);
```

### Asynchronous Storage Implementation

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Promise-based persistence
storage._state.onLinkInsert = async (link) => {
  try {
    await externalAPI.insert(link);
    console.log('Successfully inserted:', link._id);
  } catch (error) {
    console.error('Insert failed:', error);
  }
};

storage._state.onLinkUpdate = async (link) => {
  try {
    await externalAPI.update(link);
    console.log('Successfully updated:', link._id);
  } catch (error) {
    console.error('Update failed:', error);
  }
};

// Start watching
storage._state.watch();
```

### Batch Processing Implementation

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Batch operations for efficiency
const pendingOperations = [];
let batchTimer = null;

const processBatch = async () => {
  if (pendingOperations.length === 0) return;
  
  const batch = [...pendingOperations];
  pendingOperations.length = 0;
  
  try {
    await externalAPI.batch(batch);
    console.log('Processed batch of', batch.length, 'operations');
  } catch (error) {
    console.error('Batch processing failed:', error);
  }
};

storage._state.onLinkInsert = (link) => {
  pendingOperations.push({ operation: 'insert', link });
  
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(processBatch, 100); // 100ms batch window
};

storage._state.onLinkUpdate = (link) => {
  pendingOperations.push({ operation: 'update', link });
  
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(processBatch, 100);
};

storage._state.watch();
```

## Error Handling

### Dependency Validation Errors

```javascript
const deep = newDeep();
const storage = new deep.Storage();

const invalidLink = {
  _id: 'test',
  _type: 'unstored-type', // This type is not stored
  _created_at: Date.now(),
  _updated_at: Date.now()
};

try {
  _validateDependencies(deep, invalidLink, storage);
} catch (error) {
  console.log('Validation error:', error.message);
  // "Dependency _type (unstored-type) is not stored in storage"
}
```

### Delta Application Errors

```javascript
const deep = newDeep();
const storage = new deep.Storage();

const invalidDelta = {
  operation: 'update',
  link: {
    _id: 'non-existent',
    _type: deep.String._id,
    _created_at: Date.now(),
    _updated_at: Date.now()
  }
};

try {
  _applyDelta(deep, invalidDelta, storage);
} catch (error) {
  console.log('Delta error:', error.message);
  // Error applying delta for non-existent association
}
```

## Performance Considerations

### Dump Generation Optimization

```javascript
// Large storage instances may benefit from filtering
const generateFilteredDump = (deep, storage, filter) => {
  const allLinks = [];
  
  for (const associationId of deep._ids) {
    const association = new deep(associationId);
    if (association.isStored(storage) && filter(association)) {
      const link = __generateStorageLink(deep, association);
      if (link) allLinks.push(link);
    }
  }
  
  return { links: _sortDump(allLinks) };
};
```

### Event Handler Optimization

```javascript
// Debounce rapid updates
const createDebouncedHandler = (handler, delay = 100) => {
  const pending = new Map();
  
  return (link) => {
    if (pending.has(link._id)) {
      clearTimeout(pending.get(link._id));
    }
    
    pending.set(link._id, setTimeout(() => {
      handler(link);
      pending.delete(link._id);
    }, delay));
  };
};

storage._state.onLinkUpdate = createDebouncedHandler((link) => {
  // Actual update logic
  persistLink(link);
}, 50);
```

### Memory Management

```javascript
// Clean up event handlers on destruction
storage._state.onDestroy = () => {
  // Clear any timers
  if (batchTimer) clearTimeout(batchTimer);
  
  // Clear any caches
  cache.clear();
  
  // Close any connections
  if (connection) connection.close();
  
  console.log('Storage cleanup completed');
};
```

## Integration Examples

### Database Integration

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Database connection setup
const db = await connectToDatabase();

storage._state.onLinkInsert = async (link) => {
  await db.query('INSERT INTO links VALUES (?)', [JSON.stringify(link)]);
};

storage._state.onLinkDelete = async (link) => {
  await db.query('DELETE FROM links WHERE id = ?', [link._id]);
};

storage._state.onLinkUpdate = async (link) => {
  await db.query('UPDATE links SET data = ? WHERE id = ?', [JSON.stringify(link), link._id]);
};

storage._state.onDestroy = async () => {
  await db.close();
};

storage._state.watch();
defaultMarking(deep, storage);
```

### File System Integration

```javascript
const fs = require('fs').promises;
const path = require('path');

const deep = newDeep();
const storage = new deep.Storage();
const storageDir = './storage';

storage._state.onLinkInsert = async (link) => {
  const filePath = path.join(storageDir, `${link._id}.json`);
  await fs.writeFile(filePath, JSON.stringify(link, null, 2));
};

storage._state.onLinkDelete = async (link) => {
  const filePath = path.join(storageDir, `${link._id}.json`);
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

storage._state.watch();
```

### Network Synchronization

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// WebSocket connection for real-time sync
const ws = new WebSocket('ws://storage-server');

storage._state.onLinkInsert = (link) => {
  ws.send(JSON.stringify({ operation: 'insert', link }));
};

storage._state.onLinkUpdate = (link) => {
  ws.send(JSON.stringify({ operation: 'update', link }));
};

storage._state.onLinkDelete = (link) => {
  ws.send(JSON.stringify({ operation: 'delete', id: link._id }));
};

// Handle incoming changes
ws.onmessage = (event) => {
  const delta = JSON.parse(event.data);
  _applyDelta(deep, delta, storage, true); // Skip validation for remote changes
};

storage._state.watch();
```

## Testing

The storage system includes comprehensive tests covering:

- Storage Alive class construction and destruction
- Event handler registration and execution
- Dump generation and restoration
- Delta application and validation
- Dependency validation
- Error conditions and edge cases
- Performance scenarios

See `storage.test.ts` for detailed test examples and usage patterns.

## Best Practices

### 1. Always Apply Default Marking

```javascript
// ✅ Apply default marking for framework types
const storage = new deep.Storage();
defaultMarking(deep, storage);
storage._state.watch();
```

### 2. Handle Errors Gracefully

```javascript
// ✅ Wrap storage operations in try-catch
storage._state.onLinkInsert = async (link) => {
  try {
    await persistLink(link);
  } catch (error) {
    console.error('Storage error:', error);
    // Implement retry logic or error reporting
  }
};
```

### 3. Implement Proper Cleanup

```javascript
// ✅ Clean up resources on destruction
storage._state.onDestroy = () => {
  clearAllTimers();
  closeConnections();
  clearCaches();
};
```

### 4. Use Batch Operations for Performance

```javascript
// ✅ Batch operations when possible
const batchOperations = [];
storage._state.onLinkInsert = (link) => {
  batchOperations.push({ type: 'insert', link });
  scheduleBatchProcessing();
};
```

### 5. Validate Dependencies

```javascript
// ✅ Validate dependencies before applying deltas
try {
  _validateDependencies(deep, link, storage);
  _applyDelta(deep, delta, storage);
} catch (error) {
  console.error('Validation failed:', error);
}
```

## Integration with Other Systems

The storage system integrates with:

- **Storage Markers System** - Uses storage markers for filtering
- **Events System** - Subscribes to global Deep events
- **Type System** - Handles type dependencies automatically
- **Promise System** - Supports asynchronous operations
- **Lifecycle Management** - Automatic cleanup on destruction

This foundation enables building sophisticated storage backends while maintaining consistency with the Deep Framework's architecture and patterns. 