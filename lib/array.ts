// Implements the deep.Array data type, providing array-like functionality within the Deep framework.
import { _Data } from "./_data";

export function newArray(deep: any) {
  const _Array = new deep();

  // Register a data handler for _Array instances
  // The actual data stored will be a JavaScript Array
  deep._datas.set(_Array._id, new _Data<any[]>());

  _Array._contain._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialArrayArg = args[0] || [];
    if (!Array.isArray(initialArrayArg)) {
      throw new Error('deep.Array constructor expects an array argument.');
    }
    
    // Validate that the array doesn't contain Deep instances
    for (let i = 0; i < initialArrayArg.length; i++) {
      const item = initialArrayArg[i];
      if (item instanceof deep.Deep) {
        throw new Error(`Array item at index ${i} is a Deep instance. Only _id or _symbol values are allowed in arrays.`);
      }
    }

    const instance = new deep();
    instance.__type = currentConstructor._id;
    // Store the original array directly without copying
    instance.__data = initialArrayArg;
    return instance;
  };

  _Array._contain.push = new deep.Method(function(this: any, ...values: any[]) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!Array.isArray(terminalInstance._data)) {
      terminalInstance.__data = [];
    }
    
    const detectedValues = values.map((v: any) => deep.detect(v));
    const rawValues = detectedValues.map((dv: any) => dv._symbol);
    
    terminalInstance._data.push(...rawValues);
    
    // Simply pass the detectedValues as event args instead of payload
    terminalInstance.emit(deep.events.dataPush, ...detectedValues);
    terminalInstance.emit(deep.events.dataChanged, ...detectedValues);
    
    return terminalInstance._data.length;
  });

  _Array._contain.add = new deep.Method(function(this: any, ...values: any[]) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!Array.isArray(terminalInstance._data)) {
      terminalInstance.__data = [];
    }
    
    const added: any[] = [];
    for (const value of values) {
      const detectedValue = deep.detect(value);
      if (!terminalInstance._data.includes(detectedValue._symbol)) {
        terminalInstance._data.push(detectedValue._symbol);
        added.push(detectedValue);
      }
    }
    
    if (added.length > 0) {
      // Simply pass the added values as event args
      terminalInstance.emit(deep.events.dataAdd, ...added);
      terminalInstance.emit(deep.events.dataChanged, ...added);
    }
    
    return terminalInstance._data.length;
  });

  _Array._contain.delete = new deep.Method(function(this: any, ...values: any[]) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!Array.isArray(terminalInstance._data)) return false;
    
    const deleted: any[] = [];
    let changed = false;
    
    for (const value of values) {
      const detectedValue = deep.detect(value);
      const index = terminalInstance._data.indexOf(detectedValue._symbol);
      if (index > -1) {
        terminalInstance._data.splice(index, 1);
        deleted.push(detectedValue);
        changed = true;
      }
    }
    
    if (changed) {
      // Simply pass the deleted values as event args
      terminalInstance.emit(deep.events.dataDelete, ...deleted);
      terminalInstance.emit(deep.events.dataChanged, ...deleted);
    }
    
    return changed;
  });

  _Array._contain.set = new deep.Method(function(this: any, key: number, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!Array.isArray(terminalInstance._data)) {
      terminalInstance.__data = [];
    }
    
    const oldValue = terminalInstance._data[key];
    const detectedValue = deep.detect(value);
    
    terminalInstance._data[key] = detectedValue._symbol;
    
    detectedValue._field = key;
    detectedValue._before = oldValue;
    detectedValue._after = detectedValue._symbol;
    
    terminalInstance.emit(deep.events.dataSet, detectedValue);
    terminalInstance.emit(deep.events.dataChanged, detectedValue);
    
    return true;
  });

  _Array._contain.map = new deep.Method(function(this: any, fn: (value: any, index: number, array: any[]) => any) {
    const self = new deep(this._source);
    
    const func = new deep.Function(fn);
    const newData = self._data.map((item: any, index: number, array: any[]) => {
      const detectedItem = deep.detect(item);
      return fn(detectedItem._symbol, index, array);
    });
    
    // Create the result array with initial data
    const newArr = new deep.Array(newData);
    
    // Store the mapping function and source array in the mapped array's state for reactive updates
    newArr._state._mapFn = fn;
    newArr._state._sourceArray = self;
    
    // Set up reactive tracking by assigning trackable function to _state._onTracker
    newArr._state._onTracker = deep._contain.Array._contain.map._contain.trackable.data;
    
    // Create tracker to link source array to mapped array
    const tracker = self.track(newArr);
    newArr._state._sourceTracker = tracker;
    
    return newArr;
  });

  // Add trackable to map method
  _Array._contain.map._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // This function will be called when tracked events occur
    const mappedArray = this;
    
    // Get the stored mapping function and source array from state
    const mapFn = mappedArray._state._mapFn;
    const sourceArray = mappedArray._state._sourceArray;
    
    if (!mapFn || !sourceArray) return;
    
    if (event.is(deep.events.dataAdd)) {
      // Handle addition of elements to source array
      for (const addedElement of args) {
        const originalValue = addedElement._symbol;
        const originalIndex = sourceArray._data.indexOf(originalValue);
        
        // Apply mapping function to the new element
        const detectedOriginal = deep.detect(originalValue);
        const mappedValue = mapFn(detectedOriginal._symbol, originalIndex, sourceArray._data);
        
        // Add to result array at the same position
        mappedArray._data.push(mappedValue);
        
        // Emit events
        const detectedMapped = deep.detect(mappedValue);
        mappedArray.emit(deep.events.dataAdd, detectedMapped);
        mappedArray.emit(deep.events.dataChanged);
      }
    } else if (event.is(deep.events.dataDelete)) {
      // Handle removal of elements from source array
      for (const deletedElement of args) {
        const originalValue = deletedElement._symbol;
        
        // Find the corresponding mapped value and remove it
        // Since arrays maintain order, we need to find which mapped value corresponds to this original
        // We'll reconstruct the mapping to find the index
        let deleteIndex = -1;
        for (let i = 0; i < sourceArray._data.length; i++) {
          const sourceItem = sourceArray._data[i];
          if (sourceItem === originalValue) {
            deleteIndex = i;
            break;
          }
        }
        
        // If we couldn't find it in source (which means it was already deleted), 
        // we need a different approach - remove all mapped values that would map from this original
        if (deleteIndex === -1) {
          // Element was already removed from source, find what it would have mapped to
          const detectedOriginal = deep.detect(originalValue);
          const wouldMapTo = mapFn(detectedOriginal._symbol, 0, [originalValue]); // Best effort mapping
          
          // Remove first occurrence of this mapped value
          const mappedIndex = mappedArray._data.indexOf(wouldMapTo);
          if (mappedIndex > -1) {
            const removedMapped = mappedArray._data.splice(mappedIndex, 1)[0];
            
            // Emit events
            const detectedMapped = deep.detect(removedMapped);
            mappedArray.emit(deep.events.dataDelete, detectedMapped);
            mappedArray.emit(deep.events.dataChanged);
          }
        } else {
          // Remove the mapped value at the corresponding index
          if (deleteIndex < mappedArray._data.length) {
            const removedMapped = mappedArray._data.splice(deleteIndex, 1)[0];
            
            // Emit events
            const detectedMapped = deep.detect(removedMapped);
            mappedArray.emit(deep.events.dataDelete, detectedMapped);
            mappedArray.emit(deep.events.dataChanged);
          }
        }
      }
    } else if (event.is(deep.events.dataSet)) {
      // Handle setting element at specific index
      const setElement = args[0];
      const index = setElement._field;
      const newValue = setElement._after;
      
      if (typeof index === 'number' && index >= 0 && index < mappedArray._data.length) {
        // Apply mapping function to the new value
        const detectedNew = deep.detect(newValue);
        const mappedValue = mapFn(detectedNew._symbol, index, sourceArray._data);
        
        // Update the mapped array at the same index
        const oldMappedValue = mappedArray._data[index];
        mappedArray._data[index] = mappedValue;
        
        // Emit events
        const detectedMapped = deep.detect(mappedValue);
        detectedMapped._field = index;
        detectedMapped._before = oldMappedValue;
        detectedMapped._after = mappedValue;
        
        mappedArray.emit(deep.events.dataSet, detectedMapped);
        mappedArray.emit(deep.events.dataChanged, detectedMapped);
      }
    } else if (event.is(deep.events.dataPush)) {
      // Handle push operations (similar to dataAdd but specifically for push)
      for (const pushedElement of args) {
        const originalValue = pushedElement._symbol;
        const originalIndex = sourceArray._data.length - 1; // Last index after push
        
        // Apply mapping function to the new element
        const detectedOriginal = deep.detect(originalValue);
        const mappedValue = mapFn(detectedOriginal._symbol, originalIndex, sourceArray._data);
        
        // Add to result array
        mappedArray._data.push(mappedValue);
        
        // Emit events
        const detectedMapped = deep.detect(mappedValue);
        mappedArray.emit(deep.events.dataPush, detectedMapped);
        mappedArray.emit(deep.events.dataChanged);
      }
    } else {
      // Fallback for other events - do full recalculation
      const newMappedData = sourceArray._data.map((item: any, index: number, array: any[]) => {
        const detectedItem = deep.detect(item);
        return mapFn(detectedItem._symbol, index, array);
      });
      
      // Update the mapped array's data
      mappedArray.__data = newMappedData;
      
      // Emit events to notify that mapped array changed
      mappedArray.emit(deep.events.dataChanged);
    }
  });

  _Array._contain.filter = new deep.Method(function(this: any, fn: (value: any, index: number, array: any[]) => boolean) {
    const self = new deep(this._source);
    
    const func = new deep.Function(fn);
    const newData = self._data.filter((item: any, index: number, array: any[]) => {
      const detectedItem = deep.detect(item);
      return fn(detectedItem._symbol, index, array);
    });
    
    // Create the result array with initial filtered data
    const newArr = new deep.Array(newData);
    
    // Store the filter function and source array in the filtered array's state for reactive updates
    newArr._state._filterFn = fn;
    newArr._state._sourceArray = self;
    
    // Set up reactive tracking by assigning trackable function to _state._onTracker
    newArr._state._onTracker = deep._contain.Array._contain.filter._contain.trackable.data;
    
    // Create tracker to link source array to filtered array
    const tracker = self.track(newArr);
    newArr._state._sourceTracker = tracker;
    
    return newArr;
  });

  // Add trackable to filter method
  _Array._contain.filter._contain.trackable = new deep.Trackable(function(this: any, event: any, ...args: any[]) {
    // This function will be called when tracked events occur
    const filteredArray = this;
    
    // Get the stored filter function and source array from state
    const filterFn = filteredArray._state._filterFn;
    const sourceArray = filteredArray._state._sourceArray;
    
    if (!filterFn || !sourceArray) return;
    
    if (event.is(deep.events.dataAdd)) {
      // Handle addition of elements to source array
      for (const addedElement of args) {
        const originalValue = addedElement._symbol;
        const originalIndex = sourceArray._data.indexOf(originalValue);
        
        // Check if the new element should be included in filter
        const detectedOriginal = deep.detect(originalValue);
        const shouldInclude = filterFn(detectedOriginal._symbol, originalIndex, sourceArray._data);
        
        if (shouldInclude) {
          // Add to result array
          filteredArray._data.push(originalValue);
          
          // Emit events
          filteredArray.emit(deep.events.dataAdd, addedElement);
          filteredArray.emit(deep.events.dataChanged);
        }
      }
    } else if (event.is(deep.events.dataDelete)) {
      // Handle removal of elements from source array
      for (const deletedElement of args) {
        const originalValue = deletedElement._symbol;
        
        // Remove element from filtered array if it exists there
        const filteredIndex = filteredArray._data.indexOf(originalValue);
        if (filteredIndex > -1) {
          filteredArray._data.splice(filteredIndex, 1);
          
          // Emit events
          filteredArray.emit(deep.events.dataDelete, deletedElement);
          filteredArray.emit(deep.events.dataChanged);
        }
      }
    } else if (event.is(deep.events.dataSet)) {
      // Handle setting element at specific index
      const setElement = args[0];
      const index = setElement._field;
      const newValue = setElement._after;
      const oldValue = setElement._before;
      
      if (typeof index === 'number' && index >= 0) {
        // Check if old value was in filtered array
        const oldValueInFiltered = filteredArray._data.indexOf(oldValue);
        
        // Check if new value should be in filtered array
        const detectedNew = deep.detect(newValue);
        const shouldIncludeNew = filterFn(detectedNew._symbol, index, sourceArray._data);
        
        if (oldValueInFiltered > -1 && !shouldIncludeNew) {
          // Remove old value that no longer passes filter
          filteredArray._data.splice(oldValueInFiltered, 1);
          
          const detectedOld = deep.detect(oldValue);
          filteredArray.emit(deep.events.dataDelete, detectedOld);
          filteredArray.emit(deep.events.dataChanged);
        } else if (oldValueInFiltered === -1 && shouldIncludeNew) {
          // Add new value that now passes filter
          filteredArray._data.push(newValue);
          
          filteredArray.emit(deep.events.dataAdd, detectedNew);
          filteredArray.emit(deep.events.dataChanged);
        } else if (oldValueInFiltered > -1 && shouldIncludeNew) {
          // Update existing value in filtered array
          filteredArray._data[oldValueInFiltered] = newValue;
          
          const detectedMapped = deep.detect(newValue);
          detectedMapped._field = oldValueInFiltered;
          detectedMapped._before = oldValue;
          detectedMapped._after = newValue;
          
          filteredArray.emit(deep.events.dataSet, detectedMapped);
          filteredArray.emit(deep.events.dataChanged);
        }
      }
    } else if (event.is(deep.events.dataPush)) {
      // Handle push operations (similar to dataAdd but specifically for push)
      for (const pushedElement of args) {
        const originalValue = pushedElement._symbol;
        const originalIndex = sourceArray._data.length - 1; // Last index after push
        
        // Check if the new element should be included in filter
        const detectedOriginal = deep.detect(originalValue);
        const shouldInclude = filterFn(detectedOriginal._symbol, originalIndex, sourceArray._data);
        
        if (shouldInclude) {
          // Add to result array
          filteredArray._data.push(originalValue);
          
          // Emit events
          filteredArray.emit(deep.events.dataPush, pushedElement);
          filteredArray.emit(deep.events.dataChanged);
        }
      }
    } else {
      // Fallback for other events - do full recalculation
      const newFilteredData = sourceArray._data.filter((item: any, index: number, array: any[]) => {
        const detectedItem = deep.detect(item);
        return filterFn(detectedItem._symbol, index, array);
      });
      
      // Update the filtered array's data
      filteredArray.__data = newFilteredData;
      
      // Emit events to notify that filtered array changed
      filteredArray.emit(deep.events.dataChanged);
    }
  });

  _Array._contain.sort = new deep.Method(function(this: any, compareFn?: (a: any, b: any) => number) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!Array.isArray(terminalInstance._data)) {
      terminalInstance.__data = [];
    }
    
    // Store the old array state for comparison
    const oldData = [...terminalInstance._data];
    
    // Sort the array in place
    if (compareFn) {
      terminalInstance._data.sort(compareFn);
    } else {
      terminalInstance._data.sort();
    }
    
    // Only emit events if the array actually changed
    if (JSON.stringify(oldData) !== JSON.stringify(terminalInstance._data)) {
      terminalInstance.emit(deep.events.dataChanged);
    }
    
    return self; // Return the array instance for chaining
  });

  return _Array;
} 