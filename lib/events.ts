// Provides event handling methods that support recursive propagation of .value: events
// This is used to implement backward references and value delegation

/**
 * Wraps the Deep event system with high-level methods that propagate events
 * up the value chain when those events start with '.value'
 * 
 * @param deep The deep factory instance
 * @returns The same deep instance with event methods added
 */
export function newEvents(deep: any) {
  // Method to emit events with .value: propagation
  deep._context.emit = new deep.Method(function(this: any, eventType: any, ...args: any[]) {
    const self = new deep(this._source); // The instance on which .emit() was called
    let eventId: string;
    let eventObjectForPropagation: any;

    if (eventType instanceof deep.Deep) {
        eventId = eventType._id;
        eventObjectForPropagation = eventType;
    } else if (typeof eventType === 'string') {
        eventId = eventType;
        eventObjectForPropagation = new deep(eventType); 
    } else {
        throw new Error('Event type must be a Deep event instance or string id.');
    }

    self._emit(eventId, ...args);
    
    if (eventObjectForPropagation && eventObjectForPropagation.type && eventObjectForPropagation.type.is(deep.events.Data)) { 
      const valueReferences = deep._Value ? deep._Value.many(self._id) : new Set();
      
      // For each object that has this object as its value, propagate the event
      for (const refId of valueReferences) {
        const refInstance = new deep(refId);
        // Call the wrapped 'emit' on refInstance to continue propagation
        refInstance.emit(eventType, ...args); // Propagate with original eventType
      }
    }
  });
  
  // Wrapper for the _on method
  deep._context.on = new deep.Method(function(this: any, eventType: any, handler: Function) {
    const self = new deep(this._source);
    let eventId: string;
    if (eventType instanceof deep.Deep) {
        eventId = eventType._id;
    } else if (typeof eventType === 'string') {
        eventId = eventType;
    } else {
        throw new Error('Event type must be a Deep event instance or string id.');
    }
    const disposer = self._on(eventId, handler);
    return disposer;
  });
  
  // Wrapper for the _off method
  deep._context.off = new deep.Method(function(this: any, eventType: any, handler: Function) {
    const self = new deep(this._source);
    let eventId: string;
    if (eventType instanceof deep.Deep) {
        eventId = eventType._id;
    } else if (typeof eventType === 'string') {
        eventId = eventType;
    } else {
        throw new Error('Event type must be a Deep event instance or string id.');
    }
    return self._off(eventId, handler);
  });
  
  // Wrapper for the _once method
  deep._context.once = new deep.Method(function(this: any, eventType: any, handler: Function) {
    const self = new deep(this._source);
    let eventId: string;
    if (eventType instanceof deep.Deep) {
        eventId = eventType._id;
    } else if (typeof eventType === 'string') {
        eventId = eventType;
    } else {
        throw new Error('Event type must be a Deep event instance or string id.');
    }
    return self._once(eventId, handler);
  });
  
  const Event = new deep();
  deep._context.Event = Event;
  
  // Create the events container
  const events = new deep();
  deep._context.events = events;

  const Type = events._context.Type = new Event();
  // .type:setted
  events._context.typeSetted = new Type();
  // .type:deleted
  events._context.typeDeleted = new Type();
  // .typed:deleted
  events._context.typedDeleted = new Type();
  // .typed:added
  events._context.typedAdded = new Type();
  // .typed:changed
  events._context.typedChanged = new Type();

  const From = events._context.From = new Event();
  // .from:setted
  events._context.fromSetted = new From();
  // .from:deleted
  events._context.fromDeleted = new From();
  // .out:deleted
  events._context.outDeleted = new From();
  // .out:added
  events._context.outAdded = new From();
  // .out:changed
  events._context.outChanged = new From();

  const To = events._context.To = new Event();
  // .to:setted
  events._context.toSetted = new To();
  // .to:deleted
  events._context.toDeleted = new To();
  // .in:deleted
  events._context.inDeleted = new To();
  // .in:added
  events._context.inAdded = new To();
  // .in:changed
  events._context.inChanged = new To();

  const Value = events._context.Value = new Event();
  // .value:setted
  events._context.valueSetted = new Value();
  // .value:deleted
  events._context.valueDeleted = new Value();
  // .valued:added
  events._context.valuedAdded = new Value();
  // .valued:deleted
  events._context.valuedDeleted = new Value();
  // .valued:changed
  events._context.valuedChanged = new Value();

  const Data = events._context.Data = new Event();
  // .data:setted
  events._context.dataSetted = new Data();
  // .data:changed
  events._context.dataChanged = new Data();
  // .value:add
  events._context.dataAdd = new Data();
  // .value:delete
  events._context.dataDelete = new Data();
  // .value:clear
  events._context.dataClear = new Data();
  
  // Phase 4: Database Events
  const Database = events._context.Database = new Event();
  // Database operation events
  events._context.dbAssociationCreated = new Database();
  events._context.dbLinkUpdated = new Database();
  events._context.dbDataUpdated = new Database();
  events._context.dbAssociationDeleted = new Database();
  
  // Batch operation events for bulk synchronization
  events._context.dbBatchStarted = new Database();
  events._context.dbBatchCompleted = new Database();
  events._context.dbBatchFailed = new Database();
  
  // Storage Events - for tracking when associations are marked for storage
  const Storage = events._context.Storage = new Event();
  // Storage marker events
  events._context.storeAdded = new Storage();      // When association.store(storage, marker) is called
  events._context.storeRemoved = new Storage();    // When association.unstore(storage, marker) is called
  events._context.storageChanged = new Storage();  // General storage configuration change
  
}
