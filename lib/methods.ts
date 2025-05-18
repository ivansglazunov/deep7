export function newMethods(deep: any) {
  // Method for adding an item (e.g., to a Set)
  // Expects this.val._data to have an .add() method.
  // Returns the original Deep instance (this.val) for chaining.
  deep._context.add = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source); // The Deep instance method was called on (e.g. mySet)
    const terminalInstance = self.val;    // Resolve to the instance holding the actual data
    
    if (!terminalInstance || typeof terminalInstance._data?.add !== 'function') {
      throw new Error(".add() requires the target instance's ._data to have an add method.");
    }
    const detectedValue = deep.detect(value);
    terminalInstance._data.add(detectedValue._data);
    return self; // Return the original Deep instance for chaining (e.g., mySet, not terminalInstance)
  });

  // Method for clearing a collection (e.g., Set, Array)
  // Expects this.val._data to have a .clear() method or be an Array.
  // Returns undefined.
  deep._context.clear = new deep.Method(function(this: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    if (!terminalInstance || !terminalInstance._data) {
      throw new Error(".clear() requires the target instance to have ._data.");
    }
    if (typeof terminalInstance._data.clear === 'function') {
      terminalInstance._data.clear();
    } else if (Array.isArray(terminalInstance._data)) {
      terminalInstance._data.length = 0;
    } else {
      throw new Error(".clear() not supported by the underlying data structure of the target instance.");
    }
    // Standard behavior for clear methods (like Set.clear) is to return undefined
    return undefined; 
  });

  // Method for deleting an item (e.g., from a Set)
  // Expects this.val._data to have a .delete() method.
  // Returns boolean.
  deep._context.delete = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    if (!terminalInstance || typeof terminalInstance._data?.delete !== 'function') {
      throw new Error(".delete() requires the target instance's ._data to have a delete method.");
    }
    const detectedValue = deep.detect(value);
    return terminalInstance._data.delete(detectedValue._data); // Returns boolean
  });

  // Method for checking existence (e.g., in a Set)
  // Expects this.val._data to have a .has() method.
  // Returns boolean.
  deep._context.has = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (!terminalInstance || typeof terminalInstance._data?.has !== 'function') {
      throw new Error(".has() requires the target instance's ._data to have a has method.");
    }
    const detectedValue = deep.detect(value);
    return terminalInstance._data.has(detectedValue._data); // Returns boolean
  });

  // Field for 'size' property (e.g., for Set, Map)
  // Expects this.val._data to have a .size property.
  // Returns a primitive number.
  deep._context.size = new deep.Field(function(this: any, key: any) {
    // key argument is unused here but part of deep.Field's function signature for getters
    if (this._reason === 'getter') {
      const self = new deep(this._source);
      const terminalInstance = self.val;
      if (!terminalInstance || typeof terminalInstance._data?.size !== 'number') {
        throw new Error(".size getter requires the target instance's ._data to have a size property (number).");
      }
      return terminalInstance._data.size;
    } else if (this._reason === 'setter' || this._reason === 'deleter') {
      throw new Error('.size property is read-only.');
    }
  });

  // Field for 'length' property (e.g., for Array, String)
  // Expects this.val._data to have a .length property.
  // Returns a primitive number.
  deep._context.length = new deep.Field(function(this: any, key: any) {
    // key argument is unused here but part of deep.Field's function signature for getters
    if (this._reason === 'getter') {
      const self = new deep(this._source);
      const terminalInstance = self.val;
       if (!terminalInstance || typeof terminalInstance._data?.length !== 'number') {
        throw new Error(".length getter requires the target instance's ._data to have a length property (number).");
      }
      return terminalInstance._data.length;
    } else if (this._reason === 'setter' || this._reason === 'deleter') {
      throw new Error('.length property is read-only.');
    }
  });
} 