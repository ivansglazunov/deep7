// DEEP FRAMEWORK SET IMPLEMENTATION
// Defines the '_Set' type within the Deep framework, allowing for Deep instances that specifically represent and handle Set data.
//
// CORE ARCHITECTURE:
// 1. Basic Set operations (add, delete, has, size, iteration)
// 2. Binary operations (difference, intersection, union) with reactive tracking
// 3. Reactive system based on Trackable functions and event emission
//
// REACTIVE PATTERN FOR BINARY OPERATIONS:
// 1. Store source operands in result._state for access in trackable
// 2. Create bidirectional tracking: sourceA.track(result), sourceB.track(result)  
// 3. Assign trackable function to result._state._onTracker
// 4. Trackable receives events and applies point-wise updates to maintain operation semantics

import { _Data } from "./_data";
import { newMethod } from "./method";

// Polyfill for Set.prototype.difference
if (!(Set.prototype as any).difference) {
  Object.defineProperty(Set.prototype, 'difference', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set(this);
      for (const value of other) {
        result.delete(value);
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill for Set.prototype.intersection
if (!(Set.prototype as any).intersection) {
  Object.defineProperty(Set.prototype, 'intersection', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set();
      for (const value of this) {
        if (other.has(value)) {
          result.add(value);
        }
      }
      return result;
    },
    writable: true,
    configurable: true,
  });
}

export function newSet(deep: any) {
  const _Set = new deep();

  // Register a data handler for _Set instances
  // The actual data stored will be a JavaScript Set
  deep._datas.set(_Set._id, new _Data<Set<any>>());

  _Set._context._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialSetArg = args[0];
    if (!(initialSetArg instanceof Set)) {
      throw new Error('must provide a Set instance to new deep.Set()');
    }
    // Store a new Set internally, populated with raw data from initialSetArg
    const internalSet = new Set();
    for (const item of initialSetArg) {
      // We detect each item to ensure if it was a deep instance, we store its raw data.
      // If it was a raw value, detect wraps it, then we take its ._data.
      internalSet.add(item instanceof deep.Deep ? item._symbol : item);
    }

    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = internalSet;
    return instance;
  };

  _Set._context.add = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source); // The Deep.Set instance
    const terminalInstance = self.val; // Should resolve to self for a direct Deep.Set

    const detectedValue = deep.detect(value);
    const valueExists = terminalInstance._data.has(detectedValue._symbol);

    terminalInstance._data.add(detectedValue._symbol);

    if (!valueExists) {
      // Emit events on the Set instance itself (self/terminalInstance)
      terminalInstance.emit(deep.events.dataAdd, detectedValue);
      terminalInstance.emit(deep.events.dataChanged);
    }

    return self; // Return the Deep.Set instance for chaining
  });

  _Set._context.clear = new deep.Method(function (this: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    let itemsToRemove: any[] = [];
    if (terminalInstance._data instanceof Set) {
      itemsToRemove = Array.from(terminalInstance._data);
    } else if (Array.isArray(terminalInstance._data)) {
      // Though this is Set.ts, good to be robust if .val somehow led elsewhere.
      itemsToRemove = [...terminalInstance._data];
    }

    if (itemsToRemove.length > 0) {
      if (typeof terminalInstance._data.clear === 'function') {
        terminalInstance._data.clear();
      } else if (Array.isArray(terminalInstance._data)) {
        terminalInstance._data.length = 0;
      }

      for (const item of itemsToRemove) {
        const detectedItem = deep.detect(item);
        terminalInstance.emit(deep.events.dataDelete, detectedItem);
      }
      terminalInstance.emit(deep.events.dataClear);
      terminalInstance.emit(deep.events.dataChanged);
    }

    return undefined;
  });

  _Set._context.delete = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    const detectedValue = deep.detect(value);
    const wasDeleted = terminalInstance._data.delete(detectedValue._symbol);

    if (wasDeleted) {
      terminalInstance.emit(deep.events.dataDelete, detectedValue);
      terminalInstance.emit(deep.events.dataChanged);
    }

    return wasDeleted;
  });

  _Set._context.has = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    const detectedValue = deep.detect(value);
    return terminalInstance._data.has(detectedValue._symbol);
  });

  _Set._context.size = new deep.Field(function (this: any, key: any) {
    if (this._reason === this.reasons.getter._id) {
      const self = new deep(this._source);
      const terminalInstance = self.val;
      return terminalInstance._data.size;
    } else if (this._reason === this.reasons.setter._id || this._reason === this.reasons.deleter._id) {
      throw new Error('.size property is read-only.');
    }
  });

  _Set._context[Symbol.iterator] = function* (this: any) {
    // 'this' will be the proxy of the Deep.Set instance.
    // this._data will correctly resolve to _deep._data via the proxy.
    const internalSet = this._data as Set<any>;
    if (internalSet instanceof Set) {
      for (const item of internalSet) {
        // 'deep' is the deep instance passed to newSet
        yield deep.detect(item);
      }
    }
  };

  _Set._context.difference = new deep.Method(function(this: any, otherSet: any) {
    const self = new deep(this._source);

    if (!(self._data instanceof Set)) {
      throw new Error('self._data must be a Set');
    }
    let otherDeepSet;
    if (otherSet instanceof deep.Deep && otherSet.type.is(deep.Set)) {
      otherDeepSet = otherSet;
    } else if (otherSet instanceof Set) {
      otherDeepSet = new deep.Set(otherSet);
    } else {
      throw new Error('difference method expects a deep.Set or a native Set.');
    }

    // Calculate initial difference: A \ B (elements in A but not in B)
    const differenceResult = (self._data as any).difference(otherDeepSet._data);
    const resultSet = new deep.Set(differenceResult);

    // REACTIVE SETUP: Store references to source sets in result's state
    // These will be used by the trackable function to access original sets
    resultSet._state._leftSet = self;        // The left operand (A in A \ B)
    resultSet._state._rightSet = otherDeepSet; // The right operand (B in A \ B)
    
    // REACTIVE SETUP: Assign the trackable function to handle change events
    // This function will be called whenever tracked events occur on source sets
    resultSet._state._onTracker = deep._context.Set._context.difference._context.trackable.data;
    
    // REACTIVE SETUP: Create bidirectional tracking relationships
    // Each tracker links a source set to the result set for event propagation
    const leftTracker = self.track(resultSet);       // A → result tracking
    const rightTracker = otherDeepSet.track(resultSet); // B → result tracking
    
    // REACTIVE SETUP: Store tracker references for debugging/cleanup
    // (Currently used for reference but source detection uses set state analysis)
    resultSet._state._leftTracker = leftTracker;
    resultSet._state._rightTracker = rightTracker;
    
    return resultSet;
  });

  // REACTIVE IMPLEMENTATION: Trackable function for difference operation
  // This is the core reactive logic that handles point-wise updates when source sets change
  _Set._context.difference._context.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // CONTEXT: this = result set (the set containing A \ B)
    // CONTEXT: event = the event that occurred (dataAdd, dataDelete, etc.)
    // CONTEXT: args = array of event arguments, where args[0] is the changed element
    const resultSet = this;
    
    // ENVIRONMENT ACCESS: Retrieve source sets stored during operation setup
    const leftSet = resultSet._state._leftSet;   // A in A \ B (left operand)
    const rightSet = resultSet._state._rightSet; // B in A \ B (right operand)
    
    // SAFETY CHECK: Ensure we have all required data
    if (!leftSet || !rightSet || !args.length) return;

    // EVENT DATA EXTRACTION: Get the element that changed from event arguments
    // args[0] = Deep instance representing the changed element
    // args[0]._symbol = actual value that was added/removed (e.g., number, string)
    const changedElement = args[0];              // Deep wrapper of the changed value
    const elementSymbol = changedElement._symbol; // Raw value (1, "hello", etc.)
    
    // SOURCE DETECTION: Determine which set (left or right) triggered this event
    // CHALLENGE: The tracking system doesn't directly tell us which tracker fired
    // SOLUTION: Analyze current state of both sets to infer the source
    let isLeftSetChange = false;
    let isRightSetChange = false;
    
    // STATE-BASED SOURCE DETECTION: Check set contents to determine change source
    // This approach is more reliable than trying to trace tracker IDs
    if (event.is(deep.events.dataAdd)) {
      // ADD EVENT LOGIC: Element was added to one of the source sets
      if (leftSet._data.has(elementSymbol) && !rightSet._data.has(elementSymbol)) {
        // CASE: Element exists in A but not in B → was added to A (left set)
        isLeftSetChange = true;
      } else if (rightSet._data.has(elementSymbol)) {
        // CASE: Element exists in B → was added to B (right set)
        isRightSetChange = true;
      }
    } else if (event.is(deep.events.dataDelete)) {
      // DELETE EVENT LOGIC: Element was removed from one of the source sets
      if (!leftSet._data.has(elementSymbol)) {
        // CASE: Element no longer in A → was deleted from A (left set)
        isLeftSetChange = true;
      } else if (!rightSet._data.has(elementSymbol)) {
        // CASE: Element no longer in B → was deleted from B (right set)
        isRightSetChange = true;
      }
    }
    

    
    // DIFFERENCE OPERATION LOGIC: Apply point-wise updates based on A \ B semantics
    // The goal is to maintain: result = {x | x ∈ A and x ∉ B}
    
    if (event.is(deep.events.dataAdd)) {
      // HANDLE ADD EVENTS: Element was added to one of the source sets
      if (isLeftSetChange) {
        // LEFT SET ADD: Element added to A
        // RULE: If element ∈ A and element ∉ B, then element should be ∈ result
        if (!rightSet._data.has(elementSymbol)) {
          // Element added to A and not in B → add to result
          resultSet._data.add(elementSymbol);
          // EMIT EVENTS: Notify observers that result set changed
          resultSet.emit(deep.events.dataAdd, changedElement);    // Specific add event
          resultSet.emit(deep.events.dataChanged);                // General change event
        }
        // If element is also in B, it should NOT be in result (no action needed)
      } else if (isRightSetChange) {
        // RIGHT SET ADD: Element added to B
        // RULE: If element ∈ B, then element should be ∉ result (regardless of A)
        if (resultSet._data.has(elementSymbol)) {
          // Element was in result but now also in B → remove from result
          resultSet._data.delete(elementSymbol);
          // EMIT EVENTS: Notify observers that result set changed
          resultSet.emit(deep.events.dataDelete, changedElement); // Specific delete event
          resultSet.emit(deep.events.dataChanged);                // General change event
        }
      }
    } else if (event.is(deep.events.dataDelete)) {
      // HANDLE DELETE EVENTS: Element was removed from one of the source sets
      if (isLeftSetChange) {
        // LEFT SET DELETE: Element removed from A
        // RULE: If element ∉ A, then element should be ∉ result (regardless of B)
        if (resultSet._data.has(elementSymbol)) {
          // Element was in result but no longer in A → remove from result
          resultSet._data.delete(elementSymbol);
          // EMIT EVENTS: Notify observers that result set changed
          resultSet.emit(deep.events.dataDelete, changedElement); // Specific delete event
          resultSet.emit(deep.events.dataChanged);                // General change event
        }
      } else if (isRightSetChange) {
        // RIGHT SET DELETE: Element removed from B
        // RULE: If element ∈ A and element ∉ B, then element should be ∈ result
        if (leftSet._data.has(elementSymbol) && !resultSet._data.has(elementSymbol)) {
          // Element in A and no longer in B → add to result
          resultSet._data.add(elementSymbol);
          // EMIT EVENTS: Notify observers that result set changed
          resultSet.emit(deep.events.dataAdd, changedElement);    // Specific add event
          resultSet.emit(deep.events.dataChanged);                // General change event
        }
      }
    }
    
             // AVAILABLE ENVIRONMENT FOR FUTURE OPERATIONS (intersection, union, etc.):
    // 
    // CONTEXT OBJECTS:
    // - resultSet: the target set being updated (this)
    // - leftSet, rightSet: source operand sets (from resultSet._state)
    // - event: the type of change (dataAdd, dataDelete, etc.)
    // - args[0]: Deep wrapper of changed element
    // - elementSymbol: raw value of changed element (args[0]._symbol)
    // 
    // DATA ACCESS & MODIFICATION:
    // - leftSet._data, rightSet._data: JavaScript Set instances for reading
    // - resultSet._data: JavaScript Set instance for modification
    // - resultSet._data.add(elementSymbol): add element to result
    // - resultSet._data.delete(elementSymbol): remove element from result
    // - resultSet._data.has(elementSymbol): check if element in result
    // 
    // EVENT EMISSION (required for reactive propagation):
    // - resultSet.emit(deep.events.dataAdd, changedElement): emit add event
    // - resultSet.emit(deep.events.dataDelete, changedElement): emit delete event  
    // - resultSet.emit(deep.events.dataChanged): emit general change event
    // 
    // OPERATION SEMANTICS TO IMPLEMENT:
    // - INTERSECTION (A ∩ B): result = {x | x ∈ A and x ∈ B}
    // - UNION (A ∪ B): result = {x | x ∈ A or x ∈ B}
    // 
    // SOURCE DETECTION PATTERN:
    // Use same state-based detection logic as difference:
         // - For ADD events: check which set contains the new element
     // - For DELETE events: check which set no longer contains the element
  });

  _Set._context.intersection = new deep.Method(function(this: any, otherSet: any) {
    const self = new deep(this._source);

    if (!(self._data instanceof Set)) {
      throw new Error('self._data must be a Set');
    }
    let otherDeepSet;
    if (otherSet instanceof deep.Deep && otherSet.type.is(deep.Set)) {
      otherDeepSet = otherSet;
    } else if (otherSet instanceof Set) {
      otherDeepSet = new deep.Set(otherSet);
    } else {
      throw new Error('intersection method expects a deep.Set or a native Set.');
    }

    // Calculate initial intersection: A ∩ B (elements in both A and B)
    const intersectionResult = (self._data as any).intersection(otherDeepSet._data);
    const resultSet = new deep.Set(intersectionResult);

    // REACTIVE SETUP: Store references to source sets in result's state
    // These will be used by the trackable function to access original sets
    resultSet._state._leftSet = self;        // The left operand (A in A ∩ B)
    resultSet._state._rightSet = otherDeepSet; // The right operand (B in A ∩ B)
    
    // REACTIVE SETUP: Assign the trackable function to handle change events
    // This function will be called whenever tracked events occur on source sets
    resultSet._state._onTracker = deep._context.Set._context.intersection._context.trackable.data;
    
    // REACTIVE SETUP: Create bidirectional tracking relationships
    // Each tracker links a source set to the result set for event propagation
    const leftTracker = self.track(resultSet);       // A → result tracking
    const rightTracker = otherDeepSet.track(resultSet); // B → result tracking
    
    // REACTIVE SETUP: Store tracker references for debugging/cleanup
    // (Currently used for reference but source detection uses set state analysis)
    resultSet._state._leftTracker = leftTracker;
    resultSet._state._rightTracker = rightTracker;
    
    return resultSet;
  });

  // REACTIVE IMPLEMENTATION: Trackable function for intersection operation
  // This is the core reactive logic that handles point-wise updates when source sets change
  _Set._context.intersection._context.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // CONTEXT: this = result set (the set containing A ∩ B)
    // CONTEXT: event = the event that occurred (dataAdd, dataDelete, etc.)
    // CONTEXT: args = array of event arguments, where args[0] is the changed element
    const resultSet = this;
    
    // ENVIRONMENT ACCESS: Retrieve source sets stored during operation setup
    const leftSet = resultSet._state._leftSet;   // A in A ∩ B (left operand)
    const rightSet = resultSet._state._rightSet; // B in A ∩ B (right operand)
    
    // SAFETY CHECK: Ensure we have all required data
    if (!leftSet || !rightSet || !args.length) return;

    // EVENT DATA EXTRACTION: Get the element that changed from event arguments
    // args[0] = Deep instance representing the changed element
    // args[0]._symbol = actual value that was added/removed (e.g., number, string)
    const changedElement = args[0];              // Deep wrapper of the changed value
    const elementSymbol = changedElement._symbol; // Raw value (1, "hello", etc.)
    
    // SOURCE DETECTION: Determine which set (left or right) triggered this event
    // CHALLENGE: The tracking system doesn't directly tell us which tracker fired
    // SOLUTION: Analyze current state of both sets to infer the source
    let isLeftSetChange = false;
    let isRightSetChange = false;
    
    // STATE-BASED SOURCE DETECTION: Check set contents to determine change source
    // This approach is more reliable than trying to trace tracker IDs
    if (event.is(deep.events.dataAdd)) {
      // ADD EVENT LOGIC: Element was added to one of the source sets
      if (leftSet._data.has(elementSymbol) && !rightSet._data.has(elementSymbol)) {
        // CASE: Element exists in A but not in B → was added to A (left set)
        isLeftSetChange = true;
      } else if (!leftSet._data.has(elementSymbol) && rightSet._data.has(elementSymbol)) {
        // CASE: Element exists in B but not in A → was added to B (right set)
        isRightSetChange = true;
      } else if (leftSet._data.has(elementSymbol) && rightSet._data.has(elementSymbol)) {
        // CASE: Element exists in both sets → could be added to either, determine by previous state
        // For intersection, both cases result in the element being in result, so treat as both changed
        isLeftSetChange = true;
        isRightSetChange = true;
      }
    } else if (event.is(deep.events.dataDelete)) {
      // DELETE EVENT LOGIC: Element was removed from one of the source sets
      if (!leftSet._data.has(elementSymbol) && rightSet._data.has(elementSymbol)) {
        // CASE: Element no longer in A but still in B → was deleted from A (left set)
        isLeftSetChange = true;
      } else if (leftSet._data.has(elementSymbol) && !rightSet._data.has(elementSymbol)) {
        // CASE: Element still in A but no longer in B → was deleted from B (right set)
        isRightSetChange = true;
      } else if (!leftSet._data.has(elementSymbol) && !rightSet._data.has(elementSymbol)) {
        // CASE: Element in neither set → could have been deleted from either, treat as both changed
        isLeftSetChange = true;
        isRightSetChange = true;
      }
    }
    
    // INTERSECTION OPERATION LOGIC: Apply point-wise updates based on A ∩ B semantics
    // The goal is to maintain: result = {x | x ∈ A and x ∈ B}
    
    if (event.is(deep.events.dataAdd)) {
      // HANDLE ADD EVENTS: Element was added to one of the source sets
      if (isLeftSetChange || isRightSetChange) {
        // RULE: Element ∈ result ⟺ element ∈ A and element ∈ B
        if (leftSet._data.has(elementSymbol) && rightSet._data.has(elementSymbol)) {
          // Element now in both A and B → should be in result
          if (!resultSet._data.has(elementSymbol)) {
            resultSet._data.add(elementSymbol);
            // EMIT EVENTS: Notify observers that result set changed
            resultSet.emit(deep.events.dataAdd, changedElement);    // Specific add event
            resultSet.emit(deep.events.dataChanged);                // General change event
          }
        }
        // If element is not in both sets, it should NOT be in result (no action needed if already absent)
      }
    } else if (event.is(deep.events.dataDelete)) {
      // HANDLE DELETE EVENTS: Element was removed from one of the source sets
      if (isLeftSetChange || isRightSetChange) {
        // RULE: Element ∈ result ⟺ element ∈ A and element ∈ B
        if (!(leftSet._data.has(elementSymbol) && rightSet._data.has(elementSymbol))) {
          // Element no longer in both A and B → should NOT be in result
          if (resultSet._data.has(elementSymbol)) {
            resultSet._data.delete(elementSymbol);
            // EMIT EVENTS: Notify observers that result set changed
            resultSet.emit(deep.events.dataDelete, changedElement); // Specific delete event
            resultSet.emit(deep.events.dataChanged);                // General change event
          }
        }
      }
    }
  });

  // TODO: Implement .entries(), .forEach(), .keys(), .values()
  // These methods return iterators or involve callbacks, requiring careful implementation
  // within the deep.Method and deep.Function context.

  return _Set;
}  