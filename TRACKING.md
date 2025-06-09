# Deep Tracking System Documentation

## Overview
The Deep Tracking system provides reactive programming capabilities within the Deep framework, enabling automatic propagation of changes between related instances through the Trackable and Tracker classes.

## Core Concepts

### Trackable
A Trackable is a special Deep instance that wraps functions to enable reactive behavior. When Trackable functions are executed, they can respond to tracked events.

### Tracker  
A Tracker establishes a reactive relationship between two Deep instances, forwarding events from a source to a target through the target's `_onTracker` function.

### isTrackable Field
The `isTrackable` field indicates whether a Deep instance has trackable functionality available through its context.

## Basic Usage

### Creating Trackables
```javascript
const deep = newDeep();

// Create trackable with JavaScript function
const trackableFn = function(event, ...args) {
  console.log('Trackable called:', event._id, args);
};
const trackable = new deep.Trackable(trackableFn);

// Create trackable with Deep Function ID
const fn = new deep.Function(() => console.log('Hello'));
const trackableFromId = new deep.Trackable(fn._id);
```

### Trackable Properties
```javascript
const trackable = new deep.Trackable(myFunction);

// Type checking
console.log(trackable.type.is(deep.Trackable)); // true

// Wrapped function access
console.log(trackable.value.type.is(deep.Function)); // true

// Original function data
console.log(trackable.data === myFunction); // true
```

### Manual Tracking Setup
```javascript
const source = new deep.Array([1, 2, 3]);
const target = new deep.Array([]);

// Define tracking behavior on target
target._state._onTracker = function(event, ...args) {
  console.log('Received event:', event._id);
  console.log('Event args:', args.map(arg => arg._symbol));
  
  // Custom reactive logic here
  this._data = source._data.map(x => x * 2);
};

// Create tracker relationship
const tracker = source.track(target);
```

### Checking Trackable Status
```javascript
// Array.map is trackable
console.log(deep.Array.map.isTrackable); // true

// Regular arrays are not trackable  
const arr = new deep.Array([1, 2, 3]);
console.log(arr.isTrackable); // false

// Regular instances are not trackable
const instance = new deep();
console.log(instance.isTrackable); // false
```

## Advanced Usage

### Custom Trackable Functions
```javascript
// Create a custom trackable for data transformation
const transformTrackable = new deep.Trackable(function(event, ...args) {
  const target = this; // 'this' is the target instance
  
  switch(event._id) {
    case deep.events.dataAdd._id:
      // Handle add events
      args.forEach(arg => {
        target._data.push(arg._symbol.toUpperCase());
      });
      break;
      
    case deep.events.dataDelete._id:  
      // Handle delete events
      args.forEach(arg => {
        const index = target._data.indexOf(arg._symbol.toUpperCase());
        if (index > -1) target._data.splice(index, 1);
      });
      break;
      
    case deep.events.dataChanged._id:
      // Handle general changes
      target.emit(deep.events.dataChanged);
      break;
  }
});

// Apply custom trackable to an instance
const target = new deep.Array([]);
target._state._onTracker = transformTrackable.data;
```

### Event-Specific Tracking
```javascript
const source = new deep.Array(['a', 'b', 'c']);
const target = new deep.Array([]);

// Track only specific events
target._state._onTracker = function(event, ...args) {
  if (event._id === deep.events.dataAdd._id) {
    // Only respond to add events
    args.forEach(arg => {
      this._data.push(`NEW: ${arg._symbol}`);
    });
    this.emit(deep.events.dataChanged);
  }
};

const tracker = source.track(target);

source.add('d'); // target will contain ['NEW: d']
source.delete('a'); // target unchanged (delete event ignored)
```

### Chained Tracking
```javascript
const source = new deep.Array([1, 2, 3]);
const intermediate = new deep.Array([]);
const final = new deep.Array([]);

// First transformation: double values
intermediate._state._onTracker = function(event, ...args) {
  this._data = source._data.map(x => x * 2);
  this.emit(deep.events.dataChanged);
};

// Second transformation: add 1 to each value  
final._state._onTracker = function(event, ...args) {
  this._data = intermediate._data.map(x => x + 1);
  this.emit(deep.events.dataChanged);
};

// Create tracking chain
const tracker1 = source.track(intermediate);
const tracker2 = intermediate.track(final);

source.add(4);
// source: [1, 2, 3, 4]
// intermediate: [2, 4, 6, 8]  
// final: [3, 5, 7, 9]
```

## Integration with Array Maps

### Reactive Array Mapping
The Array `map` method uses the tracking system internally:

```javascript
const source = new deep.Array([1, 2, 3]);
const mapped = source.map(x => x * 2);

// Behind the scenes:
// 1. map method creates trackable function
// 2. Sets up _onTracker on result array
// 3. Creates tracker from source to result
// 4. Stores mapping function in result._state._mapFn

console.log(mapped._state._mapFn); // Original mapping function
console.log(mapped._state._sourceArray === source); // true
```

### Array Map Trackable
```javascript
// Access the built-in map trackable
const mapTrackable = deep.Array.map._context.trackable;
console.log(mapTrackable.type.is(deep.Trackable)); // true

// The trackable function handles reactive updates
console.log(typeof mapTrackable.data); // 'function'
```

## Event System Integration

### Tracked Events
The tracking system responds to these Deep events:
- `deep.events.dataAdd` - Data elements added
- `deep.events.dataDelete` - Data elements removed  
- `deep.events.dataPush` - Data elements pushed
- `deep.events.dataChanged` - General data changes

### Event Flow
```javascript
const source = new deep.Array([1, 2]);
const target = new deep.Array([]);

let eventLog = [];

target._state._onTracker = function(event, ...args) {
  eventLog.push({
    event: event._id,
    args: args.map(arg => arg._symbol),
    timestamp: Date.now()
  });
};

const tracker = source.track(target);

source.add(3);        // Triggers dataAdd + dataChanged
source.delete(1);     // Triggers dataDelete + dataChanged  
source.push(4, 5);    // Triggers dataPush + dataChanged

console.log(eventLog); // Array of tracked events
```

## Lifecycle Management

### Trackable Lifecycle
Trackables follow the Alive pattern with construction and destruction:

```javascript
// Trackable construction (automatic)
const trackable = new deep.Trackable(myFunction);
// _construction method called if defined

// Trackable destruction (manual)
trackable.destroy();
// _destruction method called if defined
```

### Tracker Lifecycle  
```javascript
const tracker = source.track(target);

// Tracker is Alive instance
console.log(tracker.type.is(deep.Tracker)); // true

// Manual cleanup
tracker.destroy();
// Removes event listeners and cleans up state
```

### Memory Management
```javascript
// Clean up tracking relationships
function cleanupTracking(tracker) {
  if (tracker && typeof tracker.destroy === 'function') {
    tracker.destroy();
  }
}

// Automatic cleanup on source/target destruction
source.destroy(); // Cleans up associated trackers
target.destroy(); // Cleans up associated trackers
```

## Error Handling

### Trackable Validation
```javascript
// Invalid trackable arguments
try {
  new deep.Trackable(123); // throws error
} catch (error) {
  console.error('Invalid trackable:', error.message);
}

try {
  new deep.Trackable('invalid-id'); // throws error  
} catch (error) {
  console.error('Invalid function ID:', error.message);
}
```

### Tracking Error Recovery
```javascript
target._state._onTracker = function(event, ...args) {
  try {
    // Potentially failing tracking logic
    this._data = source._data.map(complexTransform);
  } catch (error) {
    console.error('Tracking error:', error);
    // Fallback behavior
    this._data = source._data.slice(); // Simple copy
  }
};
```

## Performance Considerations

### Efficient Tracking
- Minimize work in `_onTracker` functions
- Use event-specific logic to avoid unnecessary processing
- Consider batching operations for multiple changes

```javascript
// Efficient: only process relevant events
target._state._onTracker = function(event, ...args) {
  if (event._id === deep.events.dataChanged._id) {
    // Single update for any change
    this._data = source._data.map(transform);
  }
  // Ignore granular events (dataAdd, dataDelete, etc.)
};
```

### Memory Optimization
- Clean up unused trackers
- Avoid circular tracking relationships
- Use weak references where appropriate

## Best Practices

### Design Patterns
```javascript
// 1. Factory pattern for trackables
function createFilterTrackable(predicate) {
  return new deep.Trackable(function(event, ...args) {
    this._data = this._state._sourceArray._data.filter(predicate);
    this.emit(deep.events.dataChanged);
  });
}

// 2. Mixin pattern for tracking behavior
function addTrackingMixin(instance, trackableFn) {
  instance._state._onTracker = trackableFn.data;
  return instance;
}

// 3. Observer pattern for multiple targets
function createBroadcastTracker(source, targets) {
  return targets.map(target => source.track(target));
}
```

### Testing Strategies
```javascript
// Test trackable functionality
describe('Custom Trackable', () => {
  it('should respond to events correctly', () => {
    const trackable = new deep.Trackable(myTrackingFunction);
    const source = new deep.Array([1, 2, 3]);
    const target = new deep.Array([]);
    
    target._state._onTracker = trackable.data;
    const tracker = source.track(target);
    
    source.add(4);
    expect(target._data).toEqual(expectedResult);
  });
});
``` 