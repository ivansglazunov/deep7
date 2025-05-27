# Deep Framework Storage System

## Overview

Deep Framework's storage system provides a flexible mechanism for marking and organizing associations without requiring external database integration. This document covers the core storage mechanics - the foundation upon which database synchronization can be built.

## Core Concepts

### Storage Markers

Storage markers are special Deep instances that define different storage strategies or categories:

```typescript
import { newDeep } from 'deep7';

const deep = newDeep();

// Access predefined storage markers
const { oneTrue, oneFalse, typedTrue, typedFalse } = deep.storageMarkers;

// Create custom storage markers
const customMarker = new deep.StorageMarker();
```

### Storage Types

The framework provides predefined storage types and markers:

- **Storage**: Base type for all storage configurations
- **StorageMarker**: Base type for all storage markers
- **oneTrue**: Individual association storage
- **oneFalse**: Individual association exclusion 
- **typedTrue**: Type-based storage inclusion
- **typedFalse**: Type-based storage exclusion

## Basic Usage

### Storing Associations

Mark associations for storage using the `.store()` method:

```typescript
const deep = newDeep();
const association = new deep();
const storage = new deep.Storage();

// Store with oneTrue marker (required parameter)
association.store(storage, deep.storageMarkers.oneTrue);

// Store with custom marker
const customMarker = new deep.StorageMarker();
association.store(storage, customMarker);

// Store with string IDs
association.store('my-storage', 'my-marker');
```

### Checking Storage Status

Use `.isStored()` to check if an association is marked for storage:

```typescript
// Check if stored in any storage
if (association.isStored(storage)) {
  console.log('Association is stored');
}

// Check specific marker
if (association.isStored(storage, customMarker)) {
  console.log('Association has custom marker');
}
```

### Retrieving Storage Information

Get storage markers and configurations:

```typescript
// Get markers for specific storage
const markers = association.storages(storage);
console.log('Markers:', markers.map(m => m._id));

// Get all storages for association
const allStorages = association.storages();
for (const [storageId, markers] of Object.entries(allStorages)) {
  console.log(`Storage ${storageId}:`, markers.length, 'markers');
}
```

### Removing Storage Markers

Use `.unstore()` to remove storage markers:

```typescript
// Remove specific marker
association.unstore(storage, customMarker);

// Remove all markers for storage
association.unstore(storage);
```

## Type Hierarchy Storage

Storage markers support inheritance through type hierarchies:

```typescript
const deep = newDeep();
const storage = new deep.Storage();

// Create type hierarchy
const BaseType = new deep();
const SpecificType = new deep();
const instance = new deep();

SpecificType.type = BaseType;
instance.type = SpecificType;

// Store marker on base type
BaseType.store(storage, deep.storageMarkers.typedTrue);

// Instance inherits storage through type chain
console.log(instance.isStored(storage)); // true
console.log(SpecificType.isStored(storage)); // true
```

### Type-Based Markers

Use `typedTrue` and `typedFalse` for automatic type-based storage:

```typescript
// All instances of UserType will be stored
const UserType = new deep();
UserType.store(storage, deep.storageMarkers.typedTrue);

// Any new User instance is automatically marked
const user1 = new UserType(); // Automatically stored
const user2 = new UserType(); // Automatically stored
```

## Storage Events

The storage system emits events when markers are added or removed:

### Event Types

- **storeAdded**: Emitted when `.store()` is called
- **storeRemoved**: Emitted when `.unstore()` is called

### Listening to Events

```typescript
const deep = newDeep();

// Listen for storage events globally
deep.on(deep.events.storeAdded._id, (payload) => {
  console.log('Storage added:', {
    source: payload._source,
    storageId: payload.storageId, 
    markerId: payload.markerId
  });
});

deep.on(deep.events.storeRemoved._id, (payload) => {
  console.log('Storage removed:', {
    source: payload._source,
    storageId: payload.storageId,
    markerId: payload.markerId
  });
});

// Trigger events
const association = new deep();
const storage = new deep.Storage();
association.store(storage, deep.storageMarkers.oneTrue); // Emits storeAdded
association.unstore(storage); // Emits storeRemoved
```

### Event Payloads

Storage events include structured payloads:

```typescript
{
  _source: string,      // Association ID that was stored/unstored
  _reason: string,      // Event type ID (storeAdded/storeRemoved)
  storageId: string,    // Storage ID involved
  markerId: string      // Marker ID involved
}
```

## Low-Level Storage Catalog

The framework maintains an internal storage catalog accessible through low-level methods:

### Direct Catalog Access

```typescript
const deep = newDeep();
const associationId = 'assoc-123';
const storageId = 'storage-456'; 
const markerId = 'marker-789';

// Set storage marker directly
deep._setStorageMarker(associationId, storageId, markerId);

// Get markers for association+storage
const markers = deep._getStorageMarkers(associationId, storageId);
console.log('Markers:', Array.from(markers));

// Get all storages for association
const allStorages = deep._getStorageMarkers(associationId);
console.log('All storages:', allStorages);

// Remove marker
deep._deleteStorageMarker(associationId, storageId, markerId);
```

### Catalog Structure

The internal storage catalog is organized as:

```
Map<associationId, Map<storageId, Set<markerId>>>
```

This allows efficient lookups and automatic cleanup of empty containers.

## Advanced Features

### Multiple Markers per Storage

Associations can have multiple markers for the same storage:

```typescript
const deep = newDeep();
const storage = new deep.Storage();
const association = new deep();

const marker1 = new deep.StorageMarker();
const marker2 = new deep.StorageMarker();

// Add multiple markers
association.store(storage, marker1);
association.store(storage, marker2);

// Check specific markers
console.log(association.isStored(storage, marker1)); // true
console.log(association.isStored(storage, marker2)); // true

// Remove specific marker
association.unstore(storage, marker1);
console.log(association.isStored(storage, marker1)); // false
console.log(association.isStored(storage, marker2)); // true
```

### String ID Support

Storage works with both Deep instances and string IDs:

```typescript
const deep = newDeep();
const association = new deep();

// Mix Deep instances and strings
const storage = new deep.Storage();
association.store(storage, 'string-marker-id');
association.store('string-storage-id', storage._id);
association.store('string-storage', 'string-marker');

// All work identically
console.log(association.isStored('string-storage', 'string-marker')); // true
```

### Cleanup on Destroy

Storage markers are automatically cleaned up when associations are destroyed:

```typescript
const deep = newDeep();
const storage = new deep.Storage();
const association = new deep();

// Store the association
association.store(storage, deep.storageMarkers.oneTrue);

// Verify storage
console.log(association.isStored(storage)); // true

// Destroy association
association.destroy();

// Storage catalog is cleaned up automatically
const allStorages = deep._getAllStorageMarkers();
console.log(allStorages.has(association._id)); // false
```

## Error Handling

The storage system provides clear error messages for invalid usage:

### Invalid Parameters

```typescript
const deep = newDeep();
const association = new deep();

// Missing marker parameter
try {
  association.store(storage); // Error: marker required
} catch (error) {
  console.log(error.message); // "Marker parameter is required..."
}

// Invalid storage parameter
try {
  association.store(123, deep.storageMarkers.oneTrue); // Error: not a Deep instance
} catch (error) {
  console.log(error.message); // "Storage must be a Deep instance (not string)"
}

// Invalid marker parameter  
try {
  association.store(storage, {}); // Error: not a Deep instance
} catch (error) {
  console.log(error.message); // "Marker must be a Deep instance (not string)"
}
```

## Performance Considerations

### Efficient Lookups

The storage catalog uses nested Maps and Sets for O(1) average lookups:

- Association → Storage mapping: O(1)
- Storage → Marker lookup: O(1) 
- Marker existence check: O(1)

### Memory Management

- Empty storage containers are automatically cleaned up
- Destroyed associations remove all storage entries
- No memory leaks from orphaned storage references

### Batch Operations

When removing all markers for a storage, events are emitted for each marker:

```typescript
const deep = newDeep();
const storage = new deep.Storage();
const association = new deep();

const marker1 = new deep.StorageMarker();
const marker2 = new deep.StorageMarker();

association.store(storage, marker1);
association.store(storage, marker2);

const events = [];
deep.on(deep.events.storeRemoved._id, (payload) => {
  events.push(payload.markerId);
});

// Remove all markers - emits event for each
association.unstore(storage);
console.log('Events emitted for:', events); // [marker1._id, marker2._id]
```

## Integration Points

### Future Database Integration

The storage system is designed as a foundation for database synchronization:

1. **Storage Markers** → Database sync flags
2. **Storage Events** → Database operation triggers  
3. **Type Hierarchy** → Bulk synchronization rules
4. **Storage Catalog** → Sync status tracking

### Promise Integration

Storage operations can be enhanced with promise-based completion tracking:

```typescript
// Future enhancement example (not yet implemented)
association.store(storage, deep.storageMarkers.oneTrue);
// await association.promise; // Wait for sync completion
```

## Complete API Reference

### Core Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `association.store(storage, marker)` | Add storage marker | `void` |
| `association.unstore(storage, marker?)` | Remove storage marker(s) | `void` |
| `association.isStored(storage, marker?)` | Check storage status | `boolean` |
| `association.storages(storage?)` | Get storage info | `Deep[]` or `object` |

### Low-Level Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `deep._setStorageMarker(assocId, storageId, markerId)` | Set marker directly | `void` |
| `deep._getStorageMarkers(assocId, storageId?)` | Get markers directly | `Set` or `Map` |
| `deep._deleteStorageMarker(assocId, storageId, markerId)` | Remove marker directly | `void` |
| `deep._getAllStorageMarkers()` | Get full catalog | `Map` |

### Storage Types & Markers

| Type/Marker | Purpose |
|-------------|---------|
| `deep.Storage` | Base storage type |
| `deep.StorageMarker` | Base marker type |
| `deep.storageMarkers.oneTrue` | Individual inclusion |
| `deep.storageMarkers.oneFalse` | Individual exclusion |
| `deep.storageMarkers.typedTrue` | Type-based inclusion |
| `deep.storageMarkers.typedFalse` | Type-based exclusion |

### Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `deep.events.storeAdded` | `association.store()` | `{_source, _reason, storageId, markerId}` |
| `deep.events.storeRemoved` | `association.unstore()` | `{_source, _reason, storageId, markerId}` |

---

**Next**: See [STORAGE-HASYX.md](./STORAGE-HASYX.md) for database synchronization integration. 