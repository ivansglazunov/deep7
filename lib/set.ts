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

// Polyfill for Set.prototype.union
if (!(Set.prototype as any).union) {
  Object.defineProperty(Set.prototype, 'union', {
    value: function(other: Set<any>): Set<any> {
      const result = new Set(this);
      for (const value of other) {
        result.add(value);
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
  const setDataHandler = new _Data<Set<any>>();
  deep._datas.set(_Set._id, setDataHandler);

  _Set._contain._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialSetArg = args[0];
    if (!(initialSetArg instanceof Set)) {
      throw new Error('must provide a Set instance to new deep.Set()');
    }
    
    // Validate that the Set doesn't contain Deep instances
    for (const item of initialSetArg) {
      if (item instanceof deep.Deep) {
        throw new Error(`Set contains a Deep instance: ${item._id}. Only _id or _symbol values are allowed in Sets.`);
      }
    }
    
    // Check if this original Set data already exists in our data handler
    const existingId = setDataHandler.byData(initialSetArg);
    if (existingId) {
      // Return existing Deep instance for this Set data
      return new deep(existingId);
    }
    
    // Create new instance and store the original Set directly
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = initialSetArg;
    
    // Store the original Set in the data handler for future lookups
    setDataHandler.byData(initialSetArg, instance._id);

    instance[Symbol.iterator] = function*() {
      for (const value of instance.__data) {
        yield value;
      }
    };
    
    return instance;
  };

  _Set._contain.add = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source); // The Deep.Set instance
    const terminalInstance = self.val; // Should resolve to self for a direct Deep.Set

    // Safety for recursive calls from _Deep._ids becouse it's a deep.Set instance after all
    if (this._source === deep._Deep?._ids?._id) {
      if (!terminalInstance._data.has(value)) {
        terminalInstance._data.add(value);
        const detectedValue = new deep(value);
        terminalInstance.emit(deep.events.dataAdd, detectedValue);
        terminalInstance.emit(deep.events.dataChanged);
      }
      return self;
    }

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

  _Set._contain.clear = new deep.Method(function (this: any) {
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

  _Set._contain.delete = new deep.Method(function (this: any, value: any) {
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

  _Set._contain.has = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    if (value instanceof deep.Deep) {
      return terminalInstance._data.has(value._id) || terminalInstance._data.has(value._symbol);
    } else {
      return terminalInstance._data.has(value);
    }
  });

  _Set._contain.size = new deep.Field(function (this: any, key: any) {
    if (this._reason === this.reasons.getter._id) {
      const self = new deep(this._source);
      const terminalInstance = self.val;
      return terminalInstance._data.size;
    } else if (this._reason === this.reasons.setter._id || this._reason === this.reasons.deleter._id) {
      throw new Error('.size property is read-only.');
    }
  });

  _Set._contain.first = new deep.Field(function (this: any, key: any) {
    if (this._reason === this.reasons.getter._id) {
      const self = new deep(this._source);
      const first = self._data.values().next().value;
      return first ? deep.detect(first) : undefined;
    } else throw new Error('.first property is read-only.');
  });

  _Set._contain[Symbol.iterator] = function* (this: any) {
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

  _Set._contain.map = new deep.Method(function(this: any, fn: (value: any) => any) {
    const self = new deep(this._source);

    if (!(self._data instanceof Set)) {
      throw new Error('Source data must be a Set for map operation');
    }

    // Create new Set with mapped values
    const mappedData = new Set();
    const mapValueTracker = new Map(); // Track original -> mapped value pairs

    // Apply mapping function to each element
    for (const originalValue of self._data) {
      const detectedOriginal = deep.detect(originalValue);
      const mappedValue = fn(detectedOriginal._symbol);
      
      // Convert Deep instances to _symbol (as per requirement)
      let finalValue = mappedValue;
      if (mappedValue instanceof deep.Deep) {
        finalValue = mappedValue._symbol;
      }
      
      mappedData.add(finalValue);
      mapValueTracker.set(originalValue, finalValue);
    }

    // Create result Deep.Set
    const resultSet = new deep.Set(mappedData);
    
    // Store tracking data in state
    resultSet._state._mapFn = fn;
    resultSet._state._sourceSet = self;
    resultSet._state._mapValues = mapValueTracker;

    // Set up reactive tracking using existing tracking system
    resultSet._state._onTracker = deep._contain.Set._contain.map._contain.trackable.data;
    
    // Create tracker to link source set to mapped set
    const tracker = self.track(resultSet);
    resultSet._state._sourceTracker = tracker;

    return resultSet;
  });

  // Add trackable to map method for reactive updates
  _Set._contain.map._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // This function will be called when tracked events occur
    const mappedSet = this;
    
    // Get the stored mapping function and source set from state
    const mapFn = mappedSet._state._mapFn;
    const sourceSet = mappedSet._state._sourceSet;
    const mapValues = mappedSet._state._mapValues;
    
    if (!mapFn || !sourceSet || !mapValues) return;

    if (event.is(deep.events.dataAdd)) {
      // Handle addition of elements to source set
      for (const addedElement of args) {
        const originalValue = addedElement._symbol;
        const mappedValue = mapFn(originalValue);
        
        // Convert Deep instances to _symbol
        let finalValue = mappedValue;
        if (mappedValue instanceof deep.Deep) {
          finalValue = mappedValue._symbol;
        }
        
        // Add to result set and update tracker
        mappedSet._data.add(finalValue);
        mapValues.set(originalValue, finalValue);
        
        // Emit events
        const detectedMapped = deep.detect(finalValue);
        mappedSet.emit(deep.events.dataAdd, detectedMapped);
        mappedSet.emit(deep.events.dataChanged);
      }
    } else if (event.is(deep.events.dataDelete)) {
      // Handle removal of elements from source set
      for (const deletedElement of args) {
        const originalValue = deletedElement._symbol;
        const mappedValue = mapValues.get(originalValue);
        
        if (mappedValue !== undefined) {
          // Remove from result set and update tracker
          mappedSet._data.delete(mappedValue);
          mapValues.delete(originalValue);
          
          // Emit events
          const detectedMapped = deep.detect(mappedValue);
          mappedSet.emit(deep.events.dataDelete, detectedMapped);
          mappedSet.emit(deep.events.dataChanged);
        }
      }
    } else if (event.is(deep.events.dataClear)) {
      // Handle clear operation on source set
      if (mappedSet._data.size > 0) {
        mappedSet._data.clear();
        mapValues.clear();
        
        mappedSet.emit(deep.events.dataClear);
        mappedSet.emit(deep.events.dataChanged);
      }
    }
  });

  _Set._contain.sort = new deep.Method(function(this: any, compareFn?: (a: any, b: any) => number) {
    const self = new deep(this._source);

    if (!(self._data instanceof Set)) {
      throw new Error('Source data must be a Set for sort operation');
    }

    // Convert Set to Array for sorting
    const arrayData = Array.from(self._data);
    
    // Sort the array
    if (compareFn) {
      arrayData.sort(compareFn);
    } else {
      arrayData.sort();
    }

    // Create result Deep.Array
    const resultArray = new deep.Array(arrayData);
    
    // Store tracking data in state
    resultArray._state._sourceSet = self;
    resultArray._state._sortFn = compareFn;

    // Set up reactive tracking using existing tracking system
    resultArray._state._onTracker = deep._contain.Set._contain.sort._contain.trackable.data;
    
    // Create tracker to link source set to sorted array
    const tracker = self.track(resultArray);
    resultArray._state._sourceTracker = tracker;

    return resultArray;
  });

  // Add trackable to sort method for reactive updates
  _Set._contain.sort._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // This function will be called when tracked events occur
    const sortedArray = this;
    
    // Get the stored sort function and source set from state
    const sortFn = sortedArray._state._sortFn;
    const sourceSet = sortedArray._state._sourceSet;
    
    if (!sourceSet) return;

    if (event.is(deep.events.dataAdd) || event.is(deep.events.dataDelete) || event.is(deep.events.dataClear)) {
      // Recreate sorted array from current source set data
      const arrayData = Array.from(sourceSet._data);
      
      // Sort the array
      if (sortFn) {
        arrayData.sort(sortFn);
      } else {
        arrayData.sort();
      }
      
      // Update the sorted array's data
      sortedArray.__data = arrayData;
      
      // Emit events to notify that sorted array changed
      sortedArray.emit(deep.events.dataChanged);
    }
  });

  _Set._contain.difference = new deep.Method(function(this: any, otherSet: any) {
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
    resultSet._state._onTracker = deep._contain.Set._contain.difference._contain.trackable.data;
    
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
  _Set._contain.difference._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
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

  _Set._contain.intersection = new deep.Method(function(this: any, otherSet: any) {
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
    resultSet._state._onTracker = deep._contain.Set._contain.intersection._contain.trackable.data;
    
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
  _Set._contain.intersection._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
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
    
    if (event.is(deep.events.dataAdd) || event.is(deep.events.dataDelete)) {
      // HANDLE BOTH ADD AND DELETE EVENTS using abstracted logic
      if (isLeftSetChange || isRightSetChange) {
        // Use abstracted function to determine if element should be in result
        const shouldContain = _intersectionShouldContain(elementSymbol, [leftSet, rightSet]);
        
        // Apply the change using abstracted function
        _applyElementChange(resultSet, changedElement, shouldContain, event, deep);
      }
    }
  });

  _Set._contain.union = new deep.Method(function(this: any, otherSet: any) {
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
      throw new Error('union method expects a deep.Set or a native Set.');
    }

    // Calculate initial union: A ∪ B (elements in either A or B or both)
    const unionResult = (self._data as any).union(otherDeepSet._data);
    const resultSet = new deep.Set(unionResult);

    // REACTIVE SETUP: Store references to source sets in result's state
    // These will be used by the trackable function to access original sets
    resultSet._state._leftSet = self;        // The left operand (A in A ∪ B)
    resultSet._state._rightSet = otherDeepSet; // The right operand (B in A ∪ B)
    
    // REACTIVE SETUP: Assign the trackable function to handle change events
    // This function will be called whenever tracked events occur on source sets
    resultSet._state._onTracker = deep._contain.Set._contain.union._contain.trackable.data;
    
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

  // REACTIVE IMPLEMENTATION: Trackable function for union operation
  // This is the core reactive logic that handles point-wise updates when source sets change
  _Set._contain.union._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // CONTEXT: this = result set (the set containing A ∪ B)
    // CONTEXT: event = the event that occurred (dataAdd, dataDelete, etc.)
    // CONTEXT: args = array of event arguments, where args[0] is the changed element
    const resultSet = this;
    
    // ENVIRONMENT ACCESS: Retrieve source sets stored during operation setup
    const leftSet = resultSet._state._leftSet;   // A in A ∪ B (left operand)
    const rightSet = resultSet._state._rightSet; // B in A ∪ B (right operand)
    
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
        // For union, both cases result in the element being in result, so treat as both changed
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
    
    // UNION OPERATION LOGIC: Apply point-wise updates based on A ∪ B semantics
    // The goal is to maintain: result = {x | x ∈ A or x ∈ B}
    
    if (event.is(deep.events.dataAdd)) {
      // HANDLE ADD EVENTS: Element was added to one of the source sets
      if (isLeftSetChange || isRightSetChange) {
        // RULE: Element ∈ result ⟺ element ∈ A or element ∈ B
        if (leftSet._data.has(elementSymbol) || rightSet._data.has(elementSymbol)) {
          // Element now in at least one of A or B → should be in result
          if (!resultSet._data.has(elementSymbol)) {
            resultSet._data.add(elementSymbol);
            // EMIT EVENTS: Notify observers that result set changed
            resultSet.emit(deep.events.dataAdd, changedElement);    // Specific add event
            resultSet.emit(deep.events.dataChanged);                // General change event
          }
        }
        // If element is in neither set, it should NOT be in result (no action needed if already absent)
      }
    } else if (event.is(deep.events.dataDelete)) {
      // HANDLE DELETE EVENTS: Element was removed from one of the source sets
      if (isLeftSetChange || isRightSetChange) {
        // RULE: Element ∈ result ⟺ element ∈ A or element ∈ B
        if (!(leftSet._data.has(elementSymbol) || rightSet._data.has(elementSymbol))) {
          // Element no longer in either A or B → should NOT be in result
          if (resultSet._data.has(elementSymbol)) {
            resultSet._data.delete(elementSymbol);
            // EMIT EVENTS: Notify observers that result set changed
            resultSet.emit(deep.events.dataDelete, changedElement); // Specific delete event
            resultSet.emit(deep.events.dataChanged);                // General change event
          }
        }
        // If element is still in at least one set, it should remain in result (no action needed)
      }
    }
  });

  // TODO: Implement .entries(), .forEach(), .keys(), .values()
  // These methods return iterators or involve callbacks, requiring careful implementation
  // within the deep.Method and deep.Function context.

  return _Set;
} 

// EXPORTED ABSTRACTIONS for reuse in nary operations
// These functions encapsulate the core logic of set operations for reuse in n-ary operations

/**
 * Determines if an element should be in the result of intersection operation
 * RULE: Element ∈ result ⟺ element ∈ ALL sets
 * @param element - The element symbol to check
 * @param sets - Array of Deep set instances to check against
 * @returns true if element should be in intersection result
 */
export const _intersectionShouldContain = (element: any, sets: any[]): boolean => {
  if (sets.length === 0) return false; // Empty intersection is empty
  return sets.every(set => set._data && set._data.has(element));
};

/**
 * Determines if an element should be in the result of union operation
 * RULE: Element ∈ result ⟺ element ∈ ANY set
 * @param element - The element symbol to check
 * @param sets - Array of Deep set instances to check against
 * @returns true if element should be in union result
 */
export const _unionShouldContain = (element: any, sets: any[]): boolean => {
  if (sets.length === 0) return false; // Empty union is empty
  return sets.some(set => set._data && set._data.has(element));
};

/**
 * Determines if an element should be in the result of difference operation
 * RULE: Element ∈ result ⟺ element ∈ fromSet AND element ∉ ALL excludeSets
 * @param element - The element symbol to check
 * @param fromSet - The source set to subtract from
 * @param excludeSets - Array of sets to exclude from the result
 * @returns true if element should be in difference result
 */
export const _differenceShouldContain = (element: any, fromSet: any, excludeSets: any[]): boolean => {
  if (!fromSet || !fromSet._data) return false;
  if (!fromSet._data.has(element)) return false; // Must be in source set
  
  // Must NOT be in any exclude set
  return !excludeSets.some(set => set._data && set._data.has(element));
};

/**
 * Applies element change to result set based on operation rules
 * Handles the logic of adding/removing elements and emitting appropriate events
 * @param resultSet - The result set to modify
 * @param changedElement - The Deep wrapper of the changed element
 * @param shouldContain - Whether the element should be in the result
 * @param event - The original event that triggered the change
 * @param deep - The deep instance for event access
 */
export const _applyElementChange = (
  resultSet: any, 
  changedElement: any, 
  shouldContain: boolean, 
  event: any,
  deep: any
): void => {
  const elementSymbol = changedElement._symbol;
  const isInResult = resultSet._data.has(elementSymbol);
  
  if (shouldContain && !isInResult) {
    // Element should be in result but is not → ADD it
    resultSet._data.add(elementSymbol);
    resultSet.emit(deep.events.dataAdd, changedElement);    // Specific add event
    resultSet.emit(deep.events.dataChanged);                // General change event
  } else if (!shouldContain && isInResult) {
    // Element should NOT be in result but is → REMOVE it
    resultSet._data.delete(elementSymbol);
    resultSet.emit(deep.events.dataDelete, changedElement); // Specific delete event
    resultSet.emit(deep.events.dataChanged);                // General change event
  }
  // If shouldContain matches isInResult, no change needed
};  