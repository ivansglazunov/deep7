// Defines the '_Set' type within the Deep framework, allowing for Deep instances that specifically represent and handle Set data.
import { _Data } from "./_data";
import { newMethod } from "./method";

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
    instance._type = currentConstructor._id;
    instance._data = internalSet;
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
      terminalInstance.emit('.value:add', detectedValue);
      terminalInstance.emit('.value:change');
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
        terminalInstance.emit('.value:delete', detectedItem);
      }
      terminalInstance.emit('.value:clear');
      terminalInstance.emit('.value:change');
    }

    return undefined;
  });

  _Set._context.delete = new deep.Method(function (this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    const detectedValue = deep.detect(value);
    const wasDeleted = terminalInstance._data.delete(detectedValue._symbol);

    if (wasDeleted) {
      terminalInstance.emit('.value:delete', detectedValue);
      terminalInstance.emit('.value:change');
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
    if (this._reason === 'getter') {
      const self = new deep(this._source);
      const terminalInstance = self.val;
      return terminalInstance._data.size;
    } else if (this._reason === 'setter' || this._reason === 'deleter') {
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

  // TODO: Implement .entries(), .forEach(), .keys(), .values()
  // These methods return iterators or involve callbacks, requiring careful implementation
  // within the deep.Method and deep.Function context.

  return _Set;
} 