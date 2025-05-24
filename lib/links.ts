// Helper function to create the event payload
function createLinkEventPayload(deep: any, id: string, eventIdForReason: string) {
  // Return plain JavaScript object to avoid Deep serialization issues
  return {
    _id: id,
    _reason: eventIdForReason,
    _source: id // The event is about this instance
  };
}

// Helper function to emit change events on instances referring to changedInstanceId
function emitReferrerChangeEvents(deep: any, changedInstanceId: string, visited = new Set()) {
  const processingKey = `${changedInstanceId}:emitReferrerChangeEvents`;
  if (visited.has(processingKey)) {
    return; // Already processing or processed this instance in this cascade
  }
  visited.add(processingKey);

  const relationsToNotify = [
    { relation: deep._Type, eventName: deep.events.typedChanged._id, reverseLinkProp: '_type' },
    { relation: deep._From, eventName: deep.events.outChanged._id, reverseLinkProp: '_from' },
    { relation: deep._To, eventName: deep.events.inChanged._id, reverseLinkProp: '_to' },
    { relation: deep._Value, eventName: deep.events.valuedChanged._id, reverseLinkProp: '_value' },
  ];

  for (const { relation, eventName, reverseLinkProp } of relationsToNotify) {
    const referrers = relation.many(changedInstanceId);
    for (const referrerId of referrers) {
      const referrerInstance = new deep(referrerId);
      if (referrerInstance[reverseLinkProp] === changedInstanceId) {
        const payload = createLinkEventPayload(deep, referrerId, eventName);
        // Use _emit to prevent re-triggering general emit logic from events.ts
        new deep(referrerId)._emit(eventName, payload);

        // If a valuedChanged event was emitted, recurse to propagate further
        if (eventName === deep.events.valuedChanged._id) {
          emitReferrerChangeEvents(deep, referrerId, visited); 
        }
      }
    }
  }
  // visited.delete(processingKey); // Optional: clear if you want to allow re-processing in completely separate operations. Usually not needed for a single cascade.
}

export function newType(deep: any) {
  const Type = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._Type.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._Type.one(sourceId); // Read current _type directly from relation
      const newTargetDeep = new deep(value); // value is the new target Deep instance or id
      const newTargetId = newTargetDeep._id;

      // Perform actual operation using _Deep's setter (updates _Type relation and _updated_at for source)
      source._type = newTargetId;

      new deep(sourceId)._emit(deep.events.typeSetted._id, createLinkEventPayload(deep, sourceId, deep.events.typeSetted._id));

      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.typedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.typedDeleted._id));
        }
        new deep(newTargetId)._emit(deep.events.typedAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.typedAdded._id));
      }
      
      emitReferrerChangeEvents(deep, sourceId, visited);

      return newTargetId; // Value that was effectively set
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._Type.one(sourceId); 
      if (!oldTargetId) return true; 
      deep._Type.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      new deep(sourceId)._emit(deep.events.typeDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.typeDeleted._id));

      new deep(oldTargetId)._emit(deep.events.typedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.typedDeleted._id));
      
      // 4. Referrer change events for sourceId
      emitReferrerChangeEvents(deep, sourceId, visited);

      return true;
    }
  });
  return Type;
}

export function newFrom(deep: any) {
  const From = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._From.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._From.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._from = newTargetId; // Original logic
      new deep(sourceId)._emit(deep.events.fromSetted._id, createLinkEventPayload(deep, sourceId, deep.events.fromSetted._id));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.outDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.outDeleted._id));
        }
        new deep(newTargetId)._emit(deep.events.outAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.outAdded._id));
      }
      emitReferrerChangeEvents(deep, sourceId, visited);
      return newTargetId; // Consistent with original v._id return, now newTargetId
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._From.one(sourceId);
      if (!oldTargetId) return true;
      deep._From.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf();
      new deep(sourceId)._emit(deep.events.fromDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.fromDeleted._id));
      new deep(oldTargetId)._emit(deep.events.outDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.outDeleted._id));
      emitReferrerChangeEvents(deep, sourceId, visited);
      return true;
    }
  });
  return From;
}

export function newTo(deep: any) {
  const To = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._To.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._To.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._to = newTargetId; // Original logic
      new deep(sourceId)._emit(deep.events.toSetted._id, createLinkEventPayload(deep, sourceId, deep.events.toSetted._id));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.inDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.inDeleted._id));
        }
        new deep(newTargetId)._emit(deep.events.inAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.inAdded._id));
      }
      emitReferrerChangeEvents(deep, sourceId, visited);
      return newTargetId;
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._To.one(sourceId);
      if (!oldTargetId) return true;
      deep._To.delete(sourceId); 
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      new deep(sourceId)._emit(deep.events.toDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.toDeleted._id));
      new deep(oldTargetId)._emit(deep.events.inDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.inDeleted._id));
      emitReferrerChangeEvents(deep, sourceId, visited);
      return true;
    }
  });
  return To;
}

export function newValue(deep: any) {
  const Value = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._Value.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._Value.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._value = newTargetId; // Original logic, assumes source._value uses _Deep setter for _Value relation
      new deep(sourceId)._emit(deep.events.valueSetted._id, createLinkEventPayload(deep, sourceId, deep.events.valueSetted._id));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.valuedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.valuedDeleted._id));
        }
        new deep(newTargetId)._emit(deep.events.valuedAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.valuedAdded._id));
      }
      emitReferrerChangeEvents(deep, sourceId, visited);
      return newTargetId;
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._Value.one(sourceId);
      if (!oldTargetId) return true;
      deep._Value.delete(sourceId); 
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      new deep(sourceId)._emit(deep.events.valueDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.valueDeleted._id));
      new deep(oldTargetId)._emit(deep.events.valuedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.valuedDeleted._id));
      emitReferrerChangeEvents(deep, sourceId, visited);
      return true;
    }
  });
  return Value;
}

export function newVal(deep: any) {
  const ValField = new deep.Field(function(this: any, key: any, valueToSet: any) {
    const ownerId = this._source;
    let currentInstance = new deep(ownerId);

    if (this._reason == deep.reasons.getter._id) {
      const visited = new Set<string>();
      visited.add(currentInstance._id);
      while (currentInstance._value !== undefined) {
        const nextValueTarget = currentInstance._value;
        if (!nextValueTarget || typeof nextValueTarget !== 'string') {
            break; 
        }
        currentInstance = new deep(nextValueTarget);
        if (visited.has(currentInstance._id)) {
          break; 
        }
        visited.add(currentInstance._id);
      }
      return currentInstance;
    } else if (this._reason == deep.reasons.setter._id) {
      throw new Error('Setting .val is not supported. Set .value on the desired instance directly.');
    } else if (this._reason == deep.reasons.deleter._id) {
      throw new Error('Deleting .val is not supported. Delete .value on the desired instance directly.');
    }
  });
  return ValField;
}

export function newData(deep: any) {
  const DataField = new deep.Field(function(this: any, key: any, valueToSet: any) {
    const ownerIdConst = this._source; // Keep original ownerId as const
    // For newData, we always start with a fresh visited set for this specific operation.
    const visitedForDataOp = new Set(); 

    if (this._reason == deep.reasons.getter._id) {
      let currentId = ownerIdConst; // Use a mutable variable for iteration
      const visited = new Set<string>();
      visited.add(currentId);
      while (new deep(currentId)._value !== undefined) {
        const nextValueTargetId = new deep(currentId)._value;
        if (!nextValueTargetId || typeof nextValueTargetId !== 'string') {
            break; 
        }
        currentId = nextValueTargetId; // Assign to the mutable variable
        if (visited.has(currentId)) {
          break; 
        }
        visited.add(currentId);
      }
      return new deep(currentId)._data; // Get data from the final currentId
    } else if (this._reason == deep.reasons.setter._id) {
      // Get the terminal instance in the value chain (same logic as in getter)
      const valInstance = findTerminalValueInstance(deep, ownerIdConst); // Use original ownerIdConst
      const typeId = valInstance._type;
      
      // Check if the instance has a type with a registered _Data handler
      if (typeId && deep._datas.has(typeId)) {
        // Set the data
        valInstance._data = valueToSet;
        
        // Emit data:setted event on the terminal instance (use _emit)
        new deep(valInstance._id)._emit(deep.events.dataSetted._id, createLinkEventPayload(deep, valInstance._id, deep.events.dataSetted._id));
        
        // Propagate .data:changed events up the value chain
        propagateDataChangeEvents(deep, valInstance._id, visitedForDataOp); // Pass the specific visited set
        
        return true;
      } else {
        throw new Error('Setting .data is only supported on instances with a registered data handler for their type.');
      }
    } else if (this._reason == deep.reasons.deleter._id) {
      // Get the terminal instance in the value chain
      const valInstance = findTerminalValueInstance(deep, ownerIdConst); // Use original ownerIdConst
      const typeId = valInstance._type;
      
      // Check if the instance has a type with a registered _Data handler
      if (typeId && deep._datas.has(typeId)) {
        // We can't directly set ._data to undefined because the _data setter in _deep.ts requires a value
        // Instead, we'll throw an error unless there's a clear way to "delete" data within the handler
        throw new Error('Deleting .data is not directly supported. Consider setting it to a null or default value instead.');
      } else {
        throw new Error('Deleting .data is only supported on instances with a registered data handler for their type.');
      }
    }
  });
  return DataField;
}

// Helper function to find the terminal instance in a value chain
function findTerminalValueInstance(deep: any, startId: string) {
  let instance = new deep(startId);
  const visited = new Set<string>();
  visited.add(instance._id);
  
  while (instance._value !== undefined) {
    const nextValueTargetId = instance._value;
    if (!nextValueTargetId || typeof nextValueTargetId !== 'string') {
      break;
    }
    instance = new deep(nextValueTargetId);
    if (visited.has(instance._id)) {
      break; // Cycle detected
    }
    visited.add(instance._id);
  }
  
  return instance;
}

// Function to propagate data:changed events up the value chain
function propagateDataChangeEvents(deep: any, changedInstanceId: string, visited = new Set()) {
  const processingKey = `${changedInstanceId}:propagateDataChange`;
  if (visited.has(processingKey)) {
    return;
  }
  visited.add(processingKey);

  const referrers = deep._Value.many(changedInstanceId);
  
  for (const referrerId of referrers) {
    const payload = createLinkEventPayload(deep, referrerId, deep.events.dataChanged._id);
    new deep(referrerId)._emit(deep.events.dataChanged._id, payload); 
    
    propagateDataChangeEvents(deep, referrerId, visited);
  }
}