# STORAGES.md - Storage System Core Documentation

## Overview

The Storage System Core (`storages.ts`) provides the foundational storage infrastructure for the Deep Framework. It implements storage markers, types, and methods for synchronization with long-term memory systems. This module establishes the core concepts of storage marking, dependency validation, and type hierarchy inheritance.

## Core Concepts

### Storage Markers

Storage markers are special Deep instances that indicate how and why an association is stored:

- **`oneTrue`** - Marks individual associations for storage (not inherited by type hierarchy)
- **`oneFalse`** - Marks individual associations as explicitly not stored
- **`typedTrue`** - Marks type definitions for storage (inherited by all instances of this type)
- **`typedFalse`** - Marks type definitions as explicitly not stored

### Storage Types

- **`Storage`** - Base storage type for creating storage instances
- **`StorageMarker`** - Base type for creating custom storage markers

## API Reference

### Core Methods

#### `store(storage, marker)`

Stores an association with a specific marker in the given storage.

```javascript
const deep = newDeep();
const storage = new deep.Storage();
const association = new deep();

// Store with oneTrue marker
association.store(storage, deep.storageMarkers.oneTrue);

// Store with custom marker
const customMarker = new deep.StorageMarker();
association.store(storage, customMarker);
```

**Parameters:**
- `storage` (Deep instance) - Storage instance where association will be stored
- `marker` (Deep instance) - Storage marker indicating storage reason

**Validation:**
- Both parameters must be Deep instances (strings not allowed)
- Marker parameter is required
- All dependencies (_type, _from, _to, _value) must be stored in the same storage

**Events:**
- Emits `storeAdded` event with payload containing association ID, storage ID, and marker ID

#### `stored(marker)`

Convenience method to store in the default storage.

```javascript
association.stored(deep.storageMarkers.oneTrue);
```

#### `isStored(storage, marker?)`

Checks if an association is stored with optional marker specification.

```javascript
// Check if stored in any way
const isStored = association.isStored(storage);

// Check for specific marker
const hasOneTrue = association.isStored(storage, deep.storageMarkers.oneTrue);
```

**Type Hierarchy Inheritance:**
- When no specific marker is requested, checks type hierarchy for `typedTrue` markers
- Only `typedTrue` markers are inherited through type chain
- `oneTrue` and other markers are NOT inherited

#### `storages(storage?)`

Returns storage markers for the association.

```javascript
// Get markers for specific storage
const markers = association.storages(storage);

// Get all storages and their markers
const allStorages = association.storages();
```

#### `unstore(storage, marker?)`

Removes storage markers from an association.

```javascript
// Remove specific marker
association.unstore(storage, deep.storageMarkers.oneTrue);

// Remove all markers for storage
association.unstore(storage);
```

**Events:**
- Emits `storeRemoved` event for each removed marker

### Storage Dependency Validation

The system enforces strict dependency validation to maintain data integrity:

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Create dependencies
const typeAssoc = new deep();
const fromAssoc = new deep();
const toAssoc = new deep();
const valueAssoc = new deep();

// Store dependencies first
typeAssoc.store(storage, deep.storageMarkers.oneTrue);
fromAssoc.store(storage, deep.storageMarkers.oneTrue);
toAssoc.store(storage, deep.storageMarkers.oneTrue);
valueAssoc.store(storage, deep.storageMarkers.oneTrue);

// Create association with dependencies
const association = new deep();
association.type = typeAssoc;
association.from = fromAssoc;
association.to = toAssoc;
association.value = valueAssoc;

// Now storing association will succeed
association.store(storage, deep.storageMarkers.oneTrue);
```

**Validation Rules:**
- All referenced associations (_type, _from, _to, _value) must be stored in the same storage
- Exception: _type = deep._id (normal case for plain associations) is allowed
- Validation occurs before setting storage marker

### Type Hierarchy Storage Inheritance

The system supports inheritance of storage through type hierarchies:

```javascript
const deep = newDeep();
const storage = new deep.Storage();

// Create type hierarchy
const BaseType = new deep();
const SpecificType = new deep();
const instance = new deep();

// Set up hierarchy
SpecificType.type = BaseType;
instance.type = SpecificType;

// Store typedTrue marker on base type
BaseType.store(storage, deep.storageMarkers.typedTrue);

// All descendants inherit storage
console.log(BaseType.isStored(storage));     // true (direct)
console.log(SpecificType.isStored(storage)); // true (inherited)
console.log(instance.isStored(storage));     // true (inherited)

// But specific marker checks are only true for direct markers
console.log(BaseType.isStored(storage, deep.storageMarkers.typedTrue));     // true
console.log(SpecificType.isStored(storage, deep.storageMarkers.typedTrue)); // false
console.log(instance.isStored(storage, deep.storageMarkers.typedTrue));     // false
```

**Inheritance Rules:**
- Only `typedTrue` markers are inherited through type hierarchy
- `oneTrue` and other markers are NOT inherited
- Inheritance is checked when no specific marker is requested
- Direct markers take precedence over inherited ones

### Custom Storage Markers

Create custom markers for specialized storage scenarios:

```javascript
const deep = newDeep();
const customMarker = new deep.StorageMarker();

// Use custom marker
association.store(storage, customMarker);

// Check for custom marker
const hasCustom = association.isStored(storage, customMarker);
```

## Error Handling

### Common Errors

1. **Invalid Parameter Types**
```javascript
// These will throw errors
association.store('string-id'); // Storage must be Deep instance
association.store(storage, 'marker-id'); // Marker must be Deep instance
```

2. **Missing Dependencies**
```javascript
const association = new deep();
const unstored = new deep();
association.type = unstored;

// This will throw: dependency _type is not stored
association.store(storage, deep.storageMarkers.oneTrue);
```

3. **Missing Marker**
```javascript
// This will throw: Marker parameter is required
association.store(storage);
```

## Events

### Storage Events

The system emits events for storage operations:

#### `storeAdded`
Emitted when an association is stored.

```javascript
deep.on(deep.events.storeAdded._id, (payload) => {
  console.log('Stored:', payload._source);
  console.log('Storage:', payload.storageId);
  console.log('Marker:', payload.markerId);
});
```

#### `storeRemoved`
Emitted when storage markers are removed.

```javascript
deep.on(deep.events.storeRemoved._id, (payload) => {
  console.log('Removed:', payload._source);
  console.log('Storage:', payload.storageId);
  console.log('Marker:', payload.markerId);
});
```

## Cleanup and Lifecycle

### Automatic Cleanup

Storage markers are automatically cleaned up when associations are destroyed:

```javascript
const association = new deep();
association.store(storage, deep.storageMarkers.oneTrue);

// Destroy association - storage markers are automatically cleaned up
association.destroy();

// Storage markers no longer exist
const allStorages = deep._getAllStorageMarkers();
console.log(allStorages.has(association._id)); // false
```

## Best Practices

### 1. Always Store Dependencies First

```javascript
// ✅ Correct: Store dependencies before main association
typeAssoc.store(storage, deep.storageMarkers.oneTrue);
association.type = typeAssoc;
association.store(storage, deep.storageMarkers.oneTrue);

// ❌ Wrong: Will throw dependency validation error
association.type = unstored;
association.store(storage, deep.storageMarkers.oneTrue);
```

### 2. Use Appropriate Markers

```javascript
// ✅ Use typedTrue for type definitions
MyType.store(storage, deep.storageMarkers.typedTrue);

// ✅ Use oneTrue for individual instances
instance.store(storage, deep.storageMarkers.oneTrue);

// ✅ Use custom markers for specialized scenarios
instance.store(storage, customMarker);
```

### 3. Check Storage Before Operations

```javascript
// ✅ Verify storage before dependent operations
if (association.isStored(storage)) {
  // Safe to perform storage-dependent operations
}

// ✅ Check for specific markers when needed
if (association.isStored(storage, deep.storageMarkers.typedTrue)) {
  // This is a type definition
}
```

### 4. Handle Type Hierarchy Correctly

```javascript
// ✅ Store base types with typedTrue for inheritance
BaseType.store(storage, deep.storageMarkers.typedTrue);

// ✅ Instances automatically inherit storage
const instance = new BaseType();
console.log(instance.isStored(storage)); // true (inherited)

// ✅ Use oneTrue for instance-specific storage
instance.store(storage, deep.storageMarkers.oneTrue);
```

## Performance Considerations

### 1. Type Hierarchy Traversal

The system traverses type hierarchies when checking for inherited storage. Deep hierarchies may impact performance:

```javascript
// Consider the depth of type hierarchies
// Deep hierarchies require more traversal time
const deep1 = new deep();
const deep2 = new deep(); deep2.type = deep1;
const deep3 = new deep(); deep3.type = deep2;
// ... many levels
```

### 2. Storage Marker Management

Storage markers are stored in memory maps. Large numbers of associations with many markers may impact memory usage:

```javascript
// Monitor storage marker usage in production
const allStorages = deep._getAllStorageMarkers();
console.log('Total associations with storage:', allStorages.size);
```

## Integration with Other Systems

The storage system integrates with:

- **Events System** - Emits storage-related events
- **Type System** - Supports type hierarchy inheritance
- **Lifecycle Management** - Automatic cleanup on destruction
- **Storage Implementations** - Provides foundation for concrete storage systems

## Testing

The storage system includes comprehensive tests covering:

- Basic storage operations
- Dependency validation
- Type hierarchy inheritance
- Error conditions
- Event emission
- Cleanup and lifecycle
- Performance scenarios

See `storages.test.ts` for detailed test examples and usage patterns. 