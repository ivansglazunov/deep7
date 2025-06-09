# Deep Array Documentation

## Overview
The Deep Array system provides array-like functionality within the Deep framework, supporting reactive operations and event-driven programming patterns.

## Basic Usage

### Creating Arrays
```javascript
const deep = newDeep();

// Create empty array
const emptyArray = new deep.Array([]);

// Create array with initial data
const numbers = new deep.Array([1, 2, 3]);

// Create array with mixed types
const mixed = new deep.Array(['hello', 42, true]);
```

### Array Operations

#### Adding Elements
```javascript
const arr = new deep.Array([1, 2]);

// Add unique elements (duplicates ignored)
arr.add(3, 4, 5); // [1, 2, 3, 4, 5]
arr.add(3);       // [1, 2, 3, 4, 5] - no change

// Push elements (allows duplicates)
arr.push(3, 6);   // [1, 2, 3, 4, 5, 3, 6]
```

#### Removing Elements
```javascript
const arr = new deep.Array([1, 2, 3, 4, 5]);

// Delete specific elements
arr.delete(2, 4); // [1, 3, 5]
```

#### Mapping Arrays
```javascript
const numbers = new deep.Array([1, 2, 3]);

// Create mapped array
const doubled = numbers.map(x => x * 2); // [2, 4, 6]
```

## Reactive Array Maps

### Basic Reactive Mapping
Arrays support reactive mapping operations that automatically update when the source array changes:

```javascript
const source = new deep.Array([1, 2, 3]);
const mapped = source.map(x => x * 2);

console.log(Array.from(mapped)); // [2, 4, 6]

// Modify source - mapped array updates automatically
source.add(4);
console.log(Array.from(mapped)); // [2, 4, 6, 8]

source.delete(2);
console.log(Array.from(mapped)); // [2, 6, 8]
```

### Chained Reactive Maps
You can chain multiple reactive transformations:

```javascript
const source = new deep.Array([1, 2, 3]);
const doubled = source.map(x => x * 2);      // [2, 4, 6]
const incremented = doubled.map(x => x + 1); // [3, 5, 7]

// Changes propagate through the entire chain
source.add(4);
console.log(Array.from(doubled));      // [2, 4, 6, 8]
console.log(Array.from(incremented));  // [3, 5, 7, 9]
```

### Trackable Maps
Array map operations are implemented using the Trackable system:

```javascript
// Check if map operation is trackable
console.log(deep.Array.map.isTrackable); // true

// Access the underlying trackable function
const trackable = deep.Array.map._context.trackable;
console.log(trackable.type.is(deep.Trackable)); // true
```

## Events

### Array Data Events
Arrays emit events when their data changes:

- `deep.events.dataAdd` - Elements added
- `deep.events.dataDelete` - Elements removed  
- `deep.events.dataPush` - Elements pushed
- `deep.events.dataChanged` - General data change

### Event Handling
```javascript
const arr = new deep.Array([1, 2, 3]);

// Listen for add events
arr.on(deep.events.dataAdd, (...args) => {
  console.log('Added:', args.map(arg => arg._symbol));
});

// Listen for delete events
arr.on(deep.events.dataDelete, (...args) => {
  console.log('Deleted:', args.map(arg => arg._symbol));
});

// Listen for any data changes
arr.on(deep.events.dataChanged, () => {
  console.log('Array changed:', arr._data);
});
```

## Internal Structure

### Data Storage
Deep Arrays store their data using the `_Data` handler system:
- Internal storage: JavaScript Array containing raw values
- Elements are stored as `_symbol` values from detected Deep instances
- Type validation ensures only arrays are accepted as initial data

### Reactive Implementation
Reactive maps are implemented using:
- **Trackable functions**: Define the mapping logic
- **Tracker instances**: Establish reactive relationships between arrays
- **State tracking**: Store mapping functions and source references for updates

### State Properties
Mapped arrays maintain internal state:
- `_state._mapFn`: The mapping function
- `_state._sourceArray`: Reference to source array
- `_state._onTracker`: Trackable function for handling updates

## Best Practices

### Performance Considerations
- Reactive maps recalculate the entire array on each change
- For large datasets, consider batching operations
- Avoid deeply nested reactive chains for performance

### Memory Management
- Reactive relationships create references between arrays
- Consider explicitly breaking tracking relationships when no longer needed
- Use `tracker.destroy()` to clean up tracker instances

### Error Handling
```javascript
// Validate array construction
try {
  const arr = new deep.Array("not an array"); // Throws error
} catch (error) {
  console.error('Invalid array data:', error.message);
}

// Handle mapping errors
const source = new deep.Array([1, 2, 'invalid']);
const mapped = source.map(x => {
  if (typeof x !== 'number') {
    throw new Error('Expected number');
  }
  return x * 2;
});
```

## Integration

### With Storage Systems
Arrays integrate with Deep storage systems for persistence:
```javascript
const storage = new deep.Storage();
const arr = new deep.Array([1, 2, 3]);

// Store array for persistence
arr.store(storage, deep.storageMarkers.oneTrue);
```

### With Event System
Arrays participate in the global Deep event system:
```javascript
// Listen for global data changes
deep.on(deep.events.globalDataChanged, (payload) => {
  if (payload._source === arr._id) {
    console.log('Array data changed globally');
  }
});
```

### With Tracking System
Arrays can be used with manual tracking for custom behaviors:
```javascript
const source = new deep.Array([1, 2, 3]);
const target = new deep.Array([]);

// Set up custom tracking behavior
target._state._onTracker = function(event, ...args) {
  // Custom logic for handling tracked events
  console.log('Tracked event:', event._id, args);
};

// Create tracker
const tracker = source.track(target);
``` 