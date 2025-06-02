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
  // Method to emit events with .value: propagation and global event emission
  deep._context.emit = new deep.Method(function (this: any, eventType: any, ...args: any[]) {
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

    for (const arg of args) {
      if (!(arg instanceof deep.Deep)) {
        throw new Error('Event argument must be a Deep instance.');
      }
    }

    // Emit the original event
    self._emit(eventId, ...args);

    // Auto-emit corresponding global events for link events
    if (deep.events) {
      const payload = args[0]; // Event payload

      // Check if this is a link event and emit corresponding global event
      if (eventId === deep.events.typeSetted._id ||
        eventId === deep.events.typeDeleted._id ||
        eventId === deep.events.fromSetted._id ||
        eventId === deep.events.fromDeleted._id ||
        eventId === deep.events.toSetted._id ||
        eventId === deep.events.toDeleted._id ||
        eventId === deep.events.valueSetted._id ||
        eventId === deep.events.valueDeleted._id) {

        // Determine which field changed and get before/after values
        let field: string = '';
        let before: any = undefined;
        let after: any = undefined;

        if (eventId === deep.events.typeSetted._id) {
          field = '_type';
          before = payload?._before || deep._id; // Use payload before or fallback to deep._id
          after = self._type;
        } else if (eventId === deep.events.typeDeleted._id) {
          field = '_type';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.fromSetted._id) {
          field = '_from';
          before = payload?._before;
          after = self._from;
        } else if (eventId === deep.events.fromDeleted._id) {
          field = '_from';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.toSetted._id) {
          field = '_to';
          before = payload?._before;
          after = self._to;
        } else if (eventId === deep.events.toDeleted._id) {
          field = '_to';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.valueSetted._id) {
          field = '_value';
          before = payload?._before;
          after = self._value;
        } else if (eventId === deep.events.valueDeleted._id) {
          field = '_value';
          before = payload?._before;
          after = undefined;
        }

        // Emit global link changed event on the deep space
        if (deep._emit && deep.events.globalLinkChanged && field) {
          // BIIIIG MIIIISTAKEEEEEEEEE
          // const globalPayload: any = {
          //   _id: self._id,
          //   _reason: deep.events.globalLinkChanged._id,
          //   _source: self._id,
          //   _deep: deep._id,
          //   _field: field,
          //   before: before,
          //   after: after,
          //   timestamp: new Date().valueOf()
          // };

          const globalPayload = new deep(self._id);
          globalPayload._reason = deep.events.globalLinkChanged._id;
          globalPayload._source = self._id;
          globalPayload._field = field;
          globalPayload._before = before;
          globalPayload._after = after;

          // Include __isStorageEvent in payload if it was set in the original payload
          if (payload && payload.__isStorageEvent !== undefined) {
            globalPayload.__isStorageEvent = payload.__isStorageEvent;
          }

          deep._emit(deep.events.globalLinkChanged._id, globalPayload);
        }
      }

      // Check if this is a data event and emit corresponding global event
      if (eventId === deep.events.dataSetted._id ||
        eventId === deep.events.dataChanged._id ||
        eventId === deep.events.dataAdd._id ||
        eventId === deep.events.dataDelete._id ||
        eventId === deep.events.dataClear._id) {

        // Emit global data changed event on the deep space
        if (deep._emit && deep.events.globalDataChanged) {
          const globalDataPayload = new deep(self._id);
          globalDataPayload._reason = deep.events.globalDataChanged._id;
          globalDataPayload._source = self._id;
          globalDataPayload._field = '_data';
          globalDataPayload._after = self._data;

          // BIIIIG MIIIISTAKEEEEEEEEE
          // const globalDataPayload: any = {
          //   _id: self._id,
          //   _reason: deep.events.globalDataChanged._id,
          //   _source: self._id,
          //   _deep: deep._id,
          //   field: '_data',
          //   before: undefined, // We don't track previous data value here
          //   after: self._data,
          //   timestamp: new Date().valueOf()
          // };

          // Include __isStorageEvent in payload if it was set in the original payload
          if (payload && payload.__isStorageEvent !== undefined) {
            globalDataPayload.__isStorageEvent = payload.__isStorageEvent;
          }

          deep._emit(deep.events.globalDataChanged._id, globalDataPayload);
        }
      }
    }

    // Propagate data events up the value chain
    if (eventObjectForPropagation && eventObjectForPropagation.type && eventObjectForPropagation.type.is(deep.events.DataEvent)) {
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
  deep._context.on = new deep.Method(function (this: any, eventType: any, handler: Function) {
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
  deep._context.off = new deep.Method(function (this: any, eventType: any, handler: Function) {
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
  deep._context.once = new deep.Method(function (this: any, eventType: any, handler: Function) {
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

  const Type = events._context.TypeEvent = new Event();
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

  const From = events._context.FromEvent = new Event();
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

  const To = events._context.ToEvent = new Event();
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

  const Value = events._context.ValueEvent = new Event();
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

  const Data = events._context.DataEvent = new Event();
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
  const Database = events._context.DatabaseEvent = new Event();
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
  const Storage = events._context.StorageEvent = new Event();
  // Storage marker events
  events._context.storeAdded = new Storage();      // When association.store(storage, marker) is called
  events._context.storeRemoved = new Storage();    // When association.unstore(storage, marker) is called
  events._context.storageChanged = new Storage();  // General storage configuration change

  // Global Events - for tracking all changes at Deep space level
  const Global = events._context.Global = new Event();
  // Association lifecycle events
  events._context.globalConstructed = new Global();   // New association created
  events._context.globalDestroyed = new Global(); // Association destroyed

  // Global change events (emitted on deep instance for any change in the space)
  events._context.globalLinkChanged = new Global();    // Any link changed (_type, _from, _to, _value)
  events._context.globalDataChanged = new Global();    // Any typed data changed
  events._context.globalStorageChanged = new Global(); // Any storage markers changed

  // Synchronization events
  const Sync = events._context.Sync = new Event();
  events._context.syncRequired = new Sync();       // Synchronization required
  events._context.syncStarted = new Sync();        // Synchronization started
  events._context.syncCompleted = new Sync();      // Synchronization completed
  events._context.syncFailed = new Sync();         // Synchronization failed

}
