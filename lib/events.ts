// Provides event handling methods that support recursive propagation of .value: events
// This is used to implement backward references and value delegation

/**
 * Wraps the Deep event system with high-level methods that propagate events
 * up the value chain when those events start with '.value'
 * 
 * @param deep The deep factory instance
 * @returns The same deep instance with event methods added
 */
export function wrapEvents(deep: any) {
  // Method to emit events with .value: propagation
  deep._context.emit = new deep.Method(function(this: any, eventType: string, ...args: any[]) {
    const self = new deep(this._source); // The instance on which .emit() was called
    
    // Call the built-in _emit method on self to emit locally.
    self._emit(eventType, ...args);
    
    // If the event starts with .value:, propagate it up the value chain
    if (eventType.startsWith('.value:')) { // Ensure full prefix for clarity
      const valueReferences = deep._Value ? deep._Value.many(self._id) : new Set();
      
      // For each object that has this object as its value, propagate the event
      for (const refId of valueReferences) {
        const refInstance = new deep(refId);
        // Call the wrapped 'emit' on refInstance to continue propagation
        refInstance.emit(eventType, ...args);
      }
    }
  });
  
  // Wrapper for the _on method
  deep._context.on = new deep.Method(function(this: any, eventType: string, handler: Function) {
    const self = new deep(this._source);
    return self._on(eventType, handler);
  });
  
  // Wrapper for the _off method
  deep._context.off = new deep.Method(function(this: any, eventType: string, handler: Function) {
    const self = new deep(this._source);
    return self._off(eventType, handler);
  });
  
  // Wrapper for the _once method
  deep._context.once = new deep.Method(function(this: any, eventType: string, handler: Function) {
    const self = new deep(this._source);
    return self._once(eventType, handler);
  });
  
  return deep;
} 