# STORAGE-LOCAL.md - Local Storage Implementation Documentation

## Overview

The Local Storage Implementation (`storage-local.ts`) provides a testing and development storage backend for the Deep Framework. It simulates external storage systems with configurable delays and supports both subscription-based and delta-based synchronization strategies. This module is designed for testing, development, and scenarios where persistent storage is not required.

## Core Components

### StorageLocalDump Class

The `StorageLocalDump` class simulates an external storage system with configurable delays for all operations.

```javascript
import { StorageLocalDump } from './storage-local';

// Create with default settings
const localDump = new StorageLocalDump();

// Create with initial data and custom settings
const initialDump = { links: [...] };
const localDump = new StorageLocalDump(initialDump, 50); // maxCount = 50
```

#### Configuration Properties

```javascript
const localDump = new StorageLocalDump();

// Configurable delays (in milliseconds)
localDump._saveDaly = 100;        // Save operation delay (typo preserved)
localDump._loadDelay = 50;        // Load operation delay
localDump._insertDelay = 30;      // Insert operation delay
localDump._deleteDelay = 30;      // Delete operation delay
localDump._updateDelay = 30;      // Update operation delay
localDump._subscribeInterval = 200; // Subscription polling interval

// Auto-stop configuration
localDump._defaultIntervalMaxCount = 30; // Max polling intervals before auto-stop
```

#### Core Operations

##### Save Operation
```javascript
const dump = { links: [...] };
await localDump.save(dump);
console.log('Dump saved with configured delay');
```

##### Load Operation
```javascript
const dump = await localDump.load();
console.log('Loaded', dump.links.length, 'links');
```

##### Insert Operation
```javascript
const link = {
  _id: 'new-link',
  _type: 'String',
  _created_at: Date.now(),
  _updated_at: Date.now(),
  _string: 'test value'
};

await localDump.insert(link);
console.log('Link inserted');
```

##### Delete Operation
```javascript
const linkToDelete = { _id: 'existing-link', /* ... */ };
await localDump.delete(linkToDelete);
console.log('Link deleted');
```

##### Update Operation
```javascript
const updatedLink = {
  _id: 'existing-link',
  _type: 'String',
  _created_at: originalTime,
  _updated_at: Date.now(),
  _string: 'updated value'
};

await localDump.update(updatedLink);
console.log('Link updated');
```

#### Subscription System

The subscription system provides real-time change notifications with automatic polling and auto-stop functionality.

##### Basic Subscription
```javascript
const localDump = new StorageLocalDump();

// Subscribe to changes
const unsubscribe = await localDump.subscribe((dump) => {
  console.log('Change detected:', dump.links.length, 'links');
});

// Make changes
await localDump.insert(newLink);

// Unsubscribe when done
unsubscribe();
```

##### Multiple Subscribers
```javascript
const localDump = new StorageLocalDump();

// Multiple subscribers receive the same notifications
const unsubscribe1 = await localDump.subscribe((dump) => {
  console.log('Subscriber 1:', dump.links.length);
});

const unsubscribe2 = await localDump.subscribe((dump) => {
  console.log('Subscriber 2:', dump.links.length);
});

// Both will be notified of changes
await localDump.insert(newLink);

// Clean up
unsubscribe1();
unsubscribe2();
```

##### Auto-Stop Functionality
```javascript
const localDump = new StorageLocalDump(undefined, 5); // Auto-stop after 5 intervals
localDump._subscribeInterval = 100; // 100ms intervals

const unsubscribe = await localDump.subscribe((dump) => {
  console.log('Notification received');
});

// Polling will automatically stop after 5 intervals (500ms)
// Timer is cleaned up automatically
```

#### Delta Callbacks

Delta callbacks provide immediate notification of changes without polling.

```javascript
const localDump = new StorageLocalDump();

// Set delta callback
localDump._onDelta = (delta) => {
  console.log('Delta:', delta.operation, delta.id || delta.link?._id);
};

// Operations trigger delta callbacks
await localDump.insert(newLink);    // Triggers: { operation: 'insert', link: ... }
await localDump.update(updatedLink); // Triggers: { operation: 'update', id: ..., link: ... }
await localDump.delete(linkToDelete); // Triggers: { operation: 'delete', id: ... }
```

### StorageLocal Function

The `newStorageLocal` function creates a Deep Framework storage implementation using `StorageLocalDump`.

#### Basic Usage

```javascript
const deep = newDeep();

// Create StorageLocalDump
const localDump = new StorageLocalDump();

// Create StorageLocal with subscription strategy
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription'
});

// Wait for initialization
await storageLocal.promise;
```

#### Configuration Options

```javascript
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,     // Required: StorageLocalDump instance
  strategy: 'subscription',        // Required: 'subscription' or 'delta'
  storage: existingStorage,        // Optional: existing storage to use
  dump: initialDump               // Optional: initial dump to apply
});
```

#### Synchronization Strategies

##### Subscription Strategy
Uses polling to detect changes in the local dump and applies them to the Deep instance.

```javascript
const deep = newDeep();
const localDump = new StorageLocalDump();
localDump._subscribeInterval = 100; // Fast polling for testing

const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription'
});

await storageLocal.promise;

// External changes to localDump will be detected and applied
await localDump.insert({
  _id: 'external-change',
  _type: deep.String._id,
  _created_at: Date.now(),
  _updated_at: Date.now(),
  _string: 'external value'
});

// After next polling interval, association will be available
setTimeout(() => {
  const external = new deep('external-change');
  console.log(external.data); // 'external value'
}, 150);
```

##### Delta Strategy
Uses immediate delta callbacks for real-time synchronization.

```javascript
const deep = newDeep();
const localDump = new StorageLocalDump();

const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'delta'
});

await storageLocal.promise;

// External changes trigger immediate synchronization
await localDump.insert({
  _id: 'immediate-change',
  _type: deep.String._id,
  _created_at: Date.now(),
  _updated_at: Date.now(),
  _string: 'immediate value'
});

// Association is immediately available
const immediate = new deep('immediate-change');
console.log(immediate.data); // 'immediate value'
```

## Complete Integration Example

### Basic Setup

```javascript
import { newDeep } from 'deep7';
import { StorageLocalDump } from './storage-local';
import { defaultMarking } from './storage';

const deep = newDeep();

// Create and configure local dump
const localDump = new StorageLocalDump();
localDump._insertDelay = 10;
localDump._updateDelay = 10;
localDump._subscribeInterval = 50;

// Create storage with subscription strategy
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription'
});

// Apply default marking for framework types
defaultMarking(deep, storageLocal);

// Start watching for events
await storageLocal.promise;
```

### Storing and Retrieving Data

```javascript
// Store framework types first (required for dependencies)
deep.String.store(storageLocal, deep.storageMarkers.typedTrue);

// Create and store associations
const association = new deep();
association.type = deep.String;
association.data = 'test value';
association.store(storageLocal, deep.storageMarkers.oneTrue);

// Wait for synchronization
await storageLocal.promise;

// Verify data was stored in local dump
const dump = await localDump.load();
const storedLink = dump.links.find(l => l._id === association._id);
console.log('Stored:', storedLink._string); // 'test value'
```

### Multi-Instance Synchronization

```javascript
// Create first deep instance
const deep1 = newDeep();
const storage1 = new deep1.Storage();
defaultMarking(deep1, storage1);

// Create shared local dump
const sharedDump = new StorageLocalDump();
sharedDump._subscribeInterval = 50;

// Connect first instance
const storageLocal1 = new deep1.StorageLocal({
  storageLocalDump: sharedDump,
  strategy: 'subscription',
  storage: storage1
});

await storageLocal1.promise;

// Create second deep instance
const deep2 = newDeep();
const storage2 = new deep2.Storage();
defaultMarking(deep2, storage2);

// Connect second instance to same dump
const storageLocal2 = new deep2.StorageLocal({
  storageLocalDump: sharedDump,
  strategy: 'subscription',
  storage: storage2
});

await storageLocal2.promise;

// Changes in one instance sync to the other
const value2 = new deep2.String('shared-value');
await storageLocal2.promise;

// After synchronization delay, value appears in first instance
setTimeout(() => {
  const value1 = deep1.detect('shared-value');
  console.log('Synchronized:', value1.data); // 'shared-value'
}, 100);
```

## Error Handling

### Common Errors

#### Invalid StorageLocalDump Parameter
```javascript
try {
  const storageLocal = new deep.StorageLocal({
    storageLocalDump: 'invalid',
    strategy: 'subscription'
  });
} catch (error) {
  console.log(error.message); // 'storageLocalDump must be a StorageLocalDump instance'
}
```

#### Unknown Strategy
```javascript
try {
  const storageLocal = new deep.StorageLocal({
    storageLocalDump: localDump,
    strategy: 'unknown'
  });
} catch (error) {
  console.log(error.message); // 'Unknown strategy: unknown'
}
```

#### Duplicate Link Insertion
```javascript
const localDump = new StorageLocalDump();
const link = { _id: 'duplicate', /* ... */ };

await localDump.insert(link);

try {
  await localDump.insert(link); // Same ID
} catch (error) {
  console.log(error.message); // 'Link with id duplicate already exists'
}
```

#### Non-existent Link Operations
```javascript
const localDump = new StorageLocalDump();
const nonExistent = { _id: 'missing', /* ... */ };

try {
  await localDump.delete(nonExistent);
} catch (error) {
  console.log(error.message); // 'Link with id missing not found'
}

try {
  await localDump.update(nonExistent);
} catch (error) {
  console.log(error.message); // 'Link with id missing not found'
}
```

## Performance Considerations

### Delay Configuration

Adjust delays based on testing requirements:

```javascript
// Fast testing (minimal delays)
localDump._insertDelay = 1;
localDump._updateDelay = 1;
localDump._deleteDelay = 1;
localDump._subscribeInterval = 10;

// Realistic simulation (moderate delays)
localDump._insertDelay = 50;
localDump._updateDelay = 50;
localDump._deleteDelay = 50;
localDump._subscribeInterval = 200;

// Slow network simulation (high delays)
localDump._insertDelay = 500;
localDump._updateDelay = 500;
localDump._deleteDelay = 500;
localDump._subscribeInterval = 1000;
```

### Memory Management

```javascript
// Proper cleanup to prevent memory leaks
const localDump = new StorageLocalDump();
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription'
});

// Clean up when done
storageLocal.destroy(); // Cleans up subscriptions
localDump.destroy();    // Cleans up timers and callbacks
```

### Auto-Stop Configuration

```javascript
// Prevent runaway polling in tests
const localDump = new StorageLocalDump(undefined, 10); // Auto-stop after 10 intervals

// Disable auto-stop for long-running scenarios
const localDump = new StorageLocalDump(undefined, 0); // Never auto-stop
```

## Testing Patterns

### Basic Storage Test

```javascript
it('should store and retrieve associations', async () => {
  const deep = newDeep();
  const localDump = new StorageLocalDump();
  localDump._insertDelay = 1; // Fast for testing
  
  const storageLocal = new deep.StorageLocal({
    storageLocalDump: localDump,
    strategy: 'subscription'
  });
  
  await storageLocal.promise;
  
  // Store type first
  deep.String.store(storageLocal, deep.storageMarkers.typedTrue);
  
  // Create and store association
  const association = new deep();
  association.type = deep.String;
  association.data = 'test';
  association.store(storageLocal, deep.storageMarkers.oneTrue);
  
  await storageLocal.promise;
  
  // Verify storage
  const dump = await localDump.load();
  const stored = dump.links.find(l => l._id === association._id);
  expect(stored).toBeDefined();
  expect(stored._string).toBe('test');
});
```

### Synchronization Test

```javascript
it('should synchronize external changes', async () => {
  const deep = newDeep();
  const localDump = new StorageLocalDump();
  localDump._subscribeInterval = 20; // Fast polling
  
  const storageLocal = new deep.StorageLocal({
    storageLocalDump: localDump,
    strategy: 'subscription'
  });
  
  await storageLocal.promise;
  await new Promise(resolve => setTimeout(resolve, 50)); // Wait for subscription
  
  // Simulate external change
  await localDump.insert({
    _id: 'external',
    _type: deep.String._id,
    _created_at: Date.now(),
    _updated_at: Date.now(),
    _string: 'external value'
  });
  
  await new Promise(resolve => setTimeout(resolve, 50)); // Wait for sync
  
  // Verify synchronization
  const external = new deep('external');
  expect(external.data).toBe('external value');
});
```

### Multi-Instance Test

```javascript
it('should sync between multiple instances', async () => {
  const sharedDump = new StorageLocalDump();
  sharedDump._subscribeInterval = 20;
  
  // Setup first instance
  const deep1 = newDeep();
  const storageLocal1 = new deep1.StorageLocal({
    storageLocalDump: sharedDump,
    strategy: 'subscription'
  });
  await storageLocal1.promise;
  
  // Setup second instance
  const deep2 = newDeep();
  const storageLocal2 = new deep2.StorageLocal({
    storageLocalDump: sharedDump,
    strategy: 'subscription'
  });
  await storageLocal2.promise;
  
  // Create data in second instance
  const value2 = new deep2.String('shared');
  await storageLocal2.promise;
  await new Promise(resolve => setTimeout(resolve, 50)); // Wait for sync
  
  // Verify in first instance
  const value1 = deep1.detect('shared');
  expect(value1).toBeDefined();
  expect(value1.data).toBe('shared');
});
```

## Cleanup and Resource Management

### Automatic Cleanup

```javascript
// StorageLocal automatically cleans up on destroy
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription'
});

// This cleans up:
// - Event subscriptions
// - Storage event handlers
// - Internal references
storageLocal.destroy();
```

### Manual Cleanup

```javascript
// StorageLocalDump cleanup
const localDump = new StorageLocalDump();

// Set up subscriptions and callbacks
const unsubscribe = await localDump.subscribe(callback);
localDump._onDelta = deltaCallback;

// Manual cleanup
unsubscribe();                    // Remove subscription
localDump._onDelta = undefined;   // Clear delta callback
localDump.destroy();              // Clean up timers and internal state
```

### Test Cleanup Pattern

```javascript
describe('Storage Local Tests', () => {
  const localDumpInstances = [];
  
  // Helper to track instances
  const createTrackedLocalDump = (...args) => {
    const instance = new StorageLocalDump(...args);
    localDumpInstances.push(instance);
    return instance;
  };
  
  afterEach(() => {
    // Clean up all instances
    for (const instance of localDumpInstances) {
      try {
        instance.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    localDumpInstances.length = 0;
  });
  
  it('test with automatic cleanup', () => {
    const localDump = createTrackedLocalDump();
    // Test logic...
    // Cleanup happens automatically in afterEach
  });
});
```

## Advanced Features

### Custom Delay Patterns

```javascript
// Simulate network jitter
const jitterDelay = (baseDelay) => {
  return baseDelay + Math.random() * baseDelay * 0.5;
};

localDump._insertDelay = jitterDelay(100);
localDump._updateDelay = jitterDelay(100);

// Simulate progressive slowdown
let operationCount = 0;
const progressiveDelay = (baseDelay) => {
  operationCount++;
  return baseDelay * (1 + operationCount * 0.1);
};
```

### Conditional Delta Callbacks

```javascript
// Filter delta callbacks by operation type
localDump._onDelta = (delta) => {
  switch (delta.operation) {
    case 'insert':
      handleInsert(delta.link);
      break;
    case 'update':
      handleUpdate(delta.id, delta.link);
      break;
    case 'delete':
      handleDelete(delta.id);
      break;
  }
};
```

### Subscription Filtering

```javascript
// Filter subscription notifications
const filteredSubscribe = (localDump, filter) => {
  return localDump.subscribe((dump) => {
    const filteredDump = {
      ...dump,
      links: dump.links.filter(filter)
    };
    
    if (filteredDump.links.length > 0) {
      handleFilteredDump(filteredDump);
    }
  });
};

// Only notify about String type changes
const unsubscribe = await filteredSubscribe(localDump, (link) => {
  return link._type === deep.String._id;
});
```

## Integration with Other Systems

The storage-local system integrates with:

- **Core Storage System** - Implements Storage interface
- **Storage Markers System** - Respects storage marking rules
- **Events System** - Emits and responds to storage events
- **Promise System** - Supports asynchronous operations
- **Testing Framework** - Designed for test scenarios

## Best Practices

### 1. Configure Appropriate Delays

```javascript
// ✅ Fast delays for unit tests
localDump._insertDelay = 1;
localDump._subscribeInterval = 10;

// ✅ Realistic delays for integration tests
localDump._insertDelay = 50;
localDump._subscribeInterval = 100;
```

### 2. Always Clean Up Resources

```javascript
// ✅ Proper cleanup pattern
afterEach(() => {
  storageLocal.destroy();
  localDump.destroy();
});
```

### 3. Handle Asynchronous Operations

```javascript
// ✅ Wait for operations to complete
await storageLocal.promise;
await localDump.insert(link);
await new Promise(resolve => setTimeout(resolve, 50)); // Wait for sync
```

### 4. Use Appropriate Strategy

```javascript
// ✅ Use subscription for polling-based sync
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'subscription' // Good for testing external changes
});

// ✅ Use delta for immediate sync
const storageLocal = new deep.StorageLocal({
  storageLocalDump: localDump,
  strategy: 'delta' // Good for real-time scenarios
});
```

### 5. Apply Default Marking

```javascript
// ✅ Always apply default marking
const storageLocal = new deep.StorageLocal({...});
defaultMarking(deep, storageLocal);
await storageLocal.promise;
```

This local storage implementation provides a robust foundation for testing and development scenarios while maintaining full compatibility with the Deep Framework's storage architecture. 