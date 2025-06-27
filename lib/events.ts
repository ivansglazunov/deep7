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
  deep._contain.emit = new deep.Method(function (this: any, eventType: any, ...args: any[]) {
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

    // Check if arguments are Deep instances if required by event type conventions
    // (This check can be customized or removed based on specific event system needs)
    for (const arg of args) {
      // if (!(arg instanceof deep.Deep)) {
      //   throw new Error('Event argument must be a Deep instance.');
      // }
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
          field = 'type_id';
          before = payload?._before;
          after = payload?._after;
        } else if (eventId === deep.events.typeDeleted._id) {
          field = 'type_id';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.fromSetted._id) {
          field = 'from_id';
          before = payload?._before;
          after = payload?._after;
        } else if (eventId === deep.events.fromDeleted._id) {
          field = 'from_id';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.toSetted._id) {
          field = 'to_id';
          before = payload?._before;
          after = payload?._after;
        } else if (eventId === deep.events.toDeleted._id) {
          field = 'to_id';
          before = payload?._before;
          after = undefined;
        } else if (eventId === deep.events.valueSetted._id) {
          field = 'value_id';
          before = payload?._before;
          after = payload?._after;
        } else if (eventId === deep.events.valueDeleted._id) {
          field = 'value_id';
          before = payload?._before;
          after = undefined;
        }

        // Emit global link changed event on the deep space
        if (deep._emit && deep.events.globalLinkChanged && field) {
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

          // Copy __storagesDiff if present in the original payload
          if (payload && payload.__storagesDiff) {
            globalPayload.__storagesDiff = payload.__storagesDiff;
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
  deep._contain.on = new deep.Method(function (this: any, eventType: any, handler: Function) {
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
  deep._contain.off = new deep.Method(function (this: any, eventType: any, handler: Function) {
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
  deep._contain.once = new deep.Method(function (this: any, eventType: any, handler: Function) {
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
  deep._contain.Event = Event;

  // Create the events container
  const events = new deep();
  deep._contain.events = events;

  events._contain.error = new Event();

  const Type = events._contain.TypeEvent = new Event();
  
  // TYPE EVENTS - occur when type_id field of association changes
  // Payload contains: _source (association id), _reason (event id), _before (old value), _after (new value)
  
  // .type:setted - occurs when setting new type_id value via instance.type = newType
  // Emitted on the association itself, _before contains old type, _after contains new type
  events._contain.typeSetted = new Type();
  
  // .type:deleted - occurs when deleting type_id via delete instance.type
  // Emitted on the association itself, _before contains deleted type, _after = undefined
  events._contain.typeDeleted = new Type();
  
  // .typed:deleted - occurs on type when an instance is removed from it
  // Emitted on the type, _after contains id of removed instance
  events._contain.typedDeleted = new Type();
  
  // .typed:added - occurs on type when a new instance is added to it
  // Emitted on the type, _after contains id of added instance
  events._contain.typedAdded = new Type();
  
  // .typed:changed - occurs on associations that reference a changed type
  // Used for cascading updates when type changes
  events._contain.typedChanged = new Type();

  const From = events._contain.FromEvent = new Event();
  
  // FROM EVENTS - occur when from_id field of association changes (outgoing links)
  // Payload contains: _source, _reason, _before, _after
  
  // .from:setted - occurs when setting from_id via instance.from = target
  events._contain.fromSetted = new From();
  
  // .from:deleted - occurs when deleting from_id via delete instance.from
  events._contain.fromDeleted = new From();
  
  // .out:deleted - occurs on target association when an outgoing link is removed from it
  events._contain.outDeleted = new From();
  
  // .out:added - occurs on target association when an outgoing link is added to it
  events._contain.outAdded = new From();
  
  // .out:changed - occurs on associations that reference a changed from-link
  events._contain.outChanged = new From();

  const To = events._contain.ToEvent = new Event();
  
  // TO EVENTS - occur when to_id field of association changes (incoming links)
  // Payload contains: _source, _reason, _before, _after
  
  // .to:setted - occurs when setting to_id via instance.to = target
  events._contain.toSetted = new To();
  
  // .to:deleted - occurs when deleting to_id via delete instance.to
  events._contain.toDeleted = new To();
  
  // .in:deleted - occurs on target association when an incoming link is removed from it
  events._contain.inDeleted = new To();
  
  // .in:added - occurs on target association when an incoming link is added to it
  events._contain.inAdded = new To();
  
  // .in:changed - occurs on associations that reference a changed to-link
  events._contain.inChanged = new To();

  const Value = events._contain.ValueEvent = new Event();
  
  // VALUE EVENTS - occur when value_id field of association changes (value chains)
  // Payload contains: _source, _reason, _before, _after
  
  // .value:setted - occurs when setting value_id via instance.value = target
  events._contain.valueSetted = new Value();
  
  // .value:deleted - occurs when deleting value_id via delete instance.value
  events._contain.valueDeleted = new Value();
  
  // .valued:added - occurs on target association when a value-link is added to it
  events._contain.valuedAdded = new Value();
  
  // .valued:deleted - occurs on target association when a value-link is removed from it
  events._contain.valuedDeleted = new Value();
  
  // .valued:changed - occurs on associations that reference a changed value-link
  // Used for cascading updates along value chains
  events._contain.valuedChanged = new Value();

  const Data = events._contain.DataEvent = new Event();
  
  // DATA EVENTS - occur when typed data of association changes
  // Payload contains: _source, _reason, added/removed elements as arguments
  
  // .data:setted - occurs when setting data via instance.data = value
  // Emitted on terminal association in value chain
  events._contain.dataSetted = new Data();
  
  // .data:changed - general data change event, emitted after all specific events
  // Propagates up value chain for reactivity
  events._contain.dataChanged = new Data();
  
  // .data:add - occurs when adding elements to Set/Array via add/push
  // Arguments contain added Deep elements
  events._contain.dataAdd = new Data();
  
  // .data:delete - occurs when removing elements from Set/Array via delete/remove
  // Arguments contain removed Deep elements
  events._contain.dataDelete = new Data();
  
  // .data:clear - occurs when clearing all elements from Set/Array via clear()
  events._contain.dataClear = new Data();
  
  // .data:push - specific event for Array.push(), contains added elements
  events._contain.dataPush = new Data();

  // .data:set - occurs when an element in an array is set by index
  events._contain.dataSet = new Data();

  // .data:updated - occurs when an element in an array is updated
  events._contain.dataUpdated = new Data();

  // Phase 4: Database Events
  const Hasyx = events._contain.HasyxEvent = new Event();
  
  // HASYX EVENTS - external database synchronization events
  // Payload contains information about synchronized changes
  
  // Hasyx operation events
  events._contain.hasyxInserted = new Hasyx();
  events._contain.hasyxUpdated = new Hasyx();
  events._contain.hasyxDeleted = new Hasyx();
  events._contain.hasyxTypeChanged = new Hasyx();
  events._contain.hasyxFromChanged = new Hasyx();
  events._contain.hasyxToChanged = new Hasyx();
  events._contain.hasyxFromAdded = new Hasyx();
  events._contain.hasyxValueChanged = new Hasyx();
  events._contain.hasyxDataChanged = new Hasyx();
  events._contain.hasyxStringChanged = new Hasyx();
  events._contain.hasyxNumberChanged = new Hasyx();
  events._contain.hasyxFunctionChanged = new Hasyx();

  // Storage Events - for tracking when associations are marked for storage
  const Storage = events._contain.StorageEvent = new Event();
  
  // STORAGE EVENTS - occur when storage markers of associations change
  // Payload contains: _source (association id), storageId, markerId
  
  // .store:added - occurs when calling association.store(storage, marker)
  events._contain.storeAdded = new Storage();
  
  // .store:removed - occurs when calling association.unstore(storage, marker)
  events._contain.storeRemoved = new Storage();
  
  // .storage:changed - general storage configuration change event
  events._contain.storageChanged = new Storage();

  // Global Events - for tracking all changes at Deep space level
  const Global = events._contain.Global = new Event();
  
  // GLOBAL EVENTS - global events emitted on deep instance to track all changes
  
  // LIFECYCLE EVENTS:
  
  // .global:constructed - occurs when creating new association via new deep()
  // Payload: { _id, _reason: 'globalConstructed', _source: _id, _deep: deep._id, timestamp }
  // Emitted on deep instance after association creation
  events._contain.globalConstructed = new Global();
  
  // .global:destroyed - occurs when calling association.destroy()
  // Payload: { _id, _reason: 'globalDestroyed', _source: _id, _deep: deep._id, timestamp }
  // Emitted on deep instance BEFORE association cleanup
  // IMPORTANT: this is the only event guaranteed to occur during destruction
  events._contain.globalDestroyed = new Global();
  
  // .destroyed - occurs on specific association when it's being destroyed
  // Payload: { _source: association._id, _reason: 'destroyed' }
  // Emitted on the association itself BEFORE cleanup, allows local cleanup subscriptions
  events._contain.destroyed = new Global();

  // CHANGE EVENTS (emitted on deep instance for any changes in space):
  
  // .global:linkChanged - occurs on any link changes (type_id, from_id, to_id, value_id)
  // Payload: { _source: id, _field: 'type_id'|'from_id'|'to_id'|'value_id', _before, _after, __isStorageEvent?, __storagesDiff? }
  // Automatically emitted from events.ts when processing link events
  events._contain.globalLinkChanged = new Global();
  
  // .global:dataChanged - occurs on any typed data changes
  // Payload: { _source: id, _field: '_data', _after: newData, __isStorageEvent? }
  // Automatically emitted from events.ts when processing data events
  events._contain.globalDataChanged = new Global();
  
  // .global:storageChanged - occurs when storage markers change
  events._contain.globalStorageChanged = new Global();
  
  // .global:contextAdded - occurs when context is added
  events._contain.globalContextAdded = new Global();
  
  // .global:contextRemoved - occurs when context is removed
  events._contain.globalContextRemoved = new Global();

  // Synchronization events
  const Sync = events._contain.Sync = new Event();
  
  // SYNC EVENTS - события синхронизации для координации операций
  
  events._contain.syncRequired = new Sync();       // Synchronization required
  events._contain.syncStarted = new Sync();        // Synchronization started
  events._contain.syncCompleted = new Sync();      // Synchronization completed
  events._contain.syncFailed = new Sync();         // Synchronization failed
}
