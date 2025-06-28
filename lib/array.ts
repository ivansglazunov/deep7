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
    self.track(newArr);
    
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
    
    // Recalculate the entire mapped array when source changes
    const newMappedData = sourceArray._data.map((item: any, index: number, array: any[]) => {
      const detectedItem = deep.detect(item);
      return mapFn(detectedItem._symbol, index, array);
    });
    
    // Update the mapped array's data
    mappedArray.__data = newMappedData;
    
    // Emit events to notify that mapped array changed
    mappedArray.emit(deep.events.dataChanged);
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