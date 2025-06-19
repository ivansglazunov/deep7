export function newMethods(deep: any) {
  // Method for adding an item (e.g., to a Set)
  deep._contain.add = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (typeof terminalInstance.add !== 'function') {
      throw new Error(".add() method not found on the terminal instance or its prototype chain.");
    }
    // Arguments are passed directly; terminalInstance.add handles its own logic (like deep.detect)
    return terminalInstance.add(value);
  });

  // Method for clearing a collection (e.g., Set, Array)
  deep._contain.clear = new deep.Method(function(this: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    if (typeof terminalInstance.clear !== 'function') {
      throw new Error(".clear() method not found on the terminal instance or its prototype chain.");
    }
    return terminalInstance.clear();
  });

  // Method for deleting an item (e.g., from a Set)
  deep._contain.delete = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;

    if (typeof terminalInstance.delete !== 'function') {
      throw new Error(".delete() method not found on the terminal instance or its prototype chain.");
    }
    return terminalInstance.delete(value);
  });

  // Method for checking existence (e.g., in a Set)
  deep._contain.has = new deep.Method(function(this: any, value: any) {
    const self = new deep(this._source);
    const terminalInstance = self.val;
    
    if (typeof terminalInstance.has !== 'function') {
      throw new Error(".has() method not found on the terminal instance or its prototype chain.");
    }
    return terminalInstance.has(value);
  });

  // Field for 'size' property (e.g., for Set, Map)
  deep._contain.size = new deep.Field(function(this: any, key: any) {
    if (this._reason === this.reasons.getter._id) {
      const self = new deep(this._source);
      const terminalInstance = self.val;
      if (terminalInstance.size === undefined) { // Check for undefined specifically, as 0 is a valid size
        throw new Error(".size property not found on the terminal instance or its prototype chain.");
      }
      return terminalInstance.size;
    } else if (this._reason === this.reasons.setter._id || this._reason === this.reasons.deleter._id) {
      throw new Error('.size property is read-only.');
    }
  });

  // Field for 'length' property (e.g., for Array, String)
  deep._contain.length = new deep.Field(function(this: any, key: any) {
    if (this._reason === this.reasons.getter._id) {
      const self = new deep(this._source);
      const terminalInstance = self.val;
       if (terminalInstance.length === undefined) { // Check for undefined, as 0 is valid length
        throw new Error(".length property not found on the terminal instance or its prototype chain.");
      }
      return terminalInstance.length;
    } else if (this._reason === this.reasons.setter._id || this._reason === this.reasons.deleter._id) {
      throw new Error('.length property is read-only.');
    }
  });
} 