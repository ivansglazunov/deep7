// Implements the deep.Array data type, providing array-like functionality within the Deep framework.
import { _Data } from "./_data";

export function newArray(deep: any) {
  const _Array = new deep();

  // Register a data handler for _Array instances
  // The actual data stored will be a JavaScript Array
  deep._datas.set(_Array._id, new _Data<any[]>());

  _Array._context._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialArrayArg = args[0] || [];
    if (!Array.isArray(initialArrayArg)) {
      throw new Error('deep.Array constructor expects an array argument.');
    }
    
    // Store a new Array internally, populated with data from initialArrayArg
    const internalArray: any[] = [];
    for (const item of initialArrayArg) {
      // Store raw data, similar to how Set works
      internalArray.push(item instanceof deep.Deep ? item._symbol : item);
    }

    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = internalArray;
    return instance;
  };

  _Array._context.push = new deep.Method(function(this: any, ...values: any[]) {
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

  _Array._context.add = new deep.Method(function(this: any, ...values: any[]) {
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

  _Array._context.delete = new deep.Method(function(this: any, ...values: any[]) {
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

  _Array._context.map = new deep.Method(function(this: any, fn: (value: any, index: number, array: any[]) => any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    const func = new deep.Function(fn);
    const newData = terminalInstance._data.map((item: any, index: number, array: any[]) => {
      const detectedItem = deep.detect(item);
      return fn(detectedItem._symbol, index, array);
    });
    
    // Use deep.Array instead of _Array to ensure proper type recognition
    const newArr = new deep.Array(newData);
    return newArr;
  });

  return _Array;
} 