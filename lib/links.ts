// import { _getAllStorages } from './storages';

// Helper function to create the event payload
function createLinkEventPayload(deep: any, id: string, eventIdForReason: string, extraData?: any, __isStorageEvent?: string, storagesDiff?: { old: Set<string>, new: Set<string> }) {
  const payload = new deep(id);
  payload._reason = eventIdForReason;
  payload._source = id;
  if (extraData?.before) {
    payload._before = extraData.before;
  }
  if (extraData?.after) {
    payload._after = extraData.after;
  }
  if (__isStorageEvent !== undefined) {
    payload.__isStorageEvent = __isStorageEvent;
  }
  if (storagesDiff) {
    payload.__storagesDiff = storagesDiff;
  }
  return payload;
}

// Helper function to emit change events on instances referring to changedInstanceId
function emitReferrerChangeEvents(deep: any, changedInstanceId: string, __isStorageEvent?: string, visited = new Set(), storagesDiff?: { old: Set<string>, new: Set<string> }) {
  const processingKey = `${changedInstanceId}:emitReferrerChangeEvents`;
  if (visited.has(processingKey)) {
    return; // Already processing or processed this instance in this cascade
  }
  visited.add(processingKey);

  const relationsToNotify = [
    { relation: deep._Type, eventName: deep.events.typedChanged._id, reverseLinkProp: 'type_id' },
    { relation: deep._From, eventName: deep.events.outChanged._id, reverseLinkProp: 'from_id' },
    { relation: deep._To, eventName: deep.events.inChanged._id, reverseLinkProp: 'to_id' },
    { relation: deep._Value, eventName: deep.events.valuedChanged._id, reverseLinkProp: 'value_id' },
  ];

  for (const { relation, eventName, reverseLinkProp } of relationsToNotify) {
    const referrers = relation.many(changedInstanceId);
    for (const referrerId of referrers) {
      const referrerInstance = new deep(referrerId);
      if (referrerInstance[reverseLinkProp] === changedInstanceId) {
        // For referred events, storagesDiff of the original event might not be directly applicable
        // or might need recalculation for the referrer. Passing it for now if provided.
        const payload = createLinkEventPayload(deep, referrerId, eventName, undefined, __isStorageEvent, storagesDiff);
        new deep(referrerId)._emit(eventName, payload);

        if (eventName === deep.events.valuedChanged._id) {
          emitReferrerChangeEvents(deep, referrerId, __isStorageEvent, visited, storagesDiff);
        }
      }
    }
  }
}

export function newId(deep: any) {
  const Id = new deep.Field(function (this: any, key: any, value: any) {
    const ownerId = this._source;

    if (this._reason == deep.reasons.getter._id) {
      return ownerId;
    } else if (this._reason == deep.reasons.setter._id) {
      throw new Error('Setting .id is not supported on TOP level API.');
    } else if (this._reason == deep.reasons.deleter._id) {
      throw new Error('Setting .id is not supported on TOP level API.');
    }
  });
  return Id;
}

export function newType(deep: any) {
  const Type = new deep.Field(function (this: any, key: any, value: any) {
    const isStorageEvent = deep.Deep.__isStorageEvent; // Read the global flag

    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._Type.one(sourceId);
      // Reset the flag here if we are not in a setter/deleter flow that would otherwise reset it.
      // This handles cases where a getter might be part of a chain that expects the flag to be cleared.
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._Type.one(sourceId);

      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;

      // const beforeStorages = _getAllStorages(deep, source);

      source.type_id = newTargetId;

      // const afterStorages = _getAllStorages(deep, source);
      // const storagesDiff = { old: beforeStorages, new: afterStorages };
      const storagesDiff = undefined;

      new deep(sourceId).emit(deep.events.typeSetted._id, createLinkEventPayload(deep, sourceId, deep.events.typeSetted._id, { before: oldTargetId, after: newTargetId }, isStorageEvent, storagesDiff));

      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.typedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.typedDeleted._id, { before: oldTargetId, after: sourceId }, isStorageEvent, storagesDiff));
        }
        new deep(newTargetId)._emit(deep.events.typedAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.typedAdded._id, { after: sourceId }, isStorageEvent, storagesDiff));
      }

      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited, storagesDiff);
      
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return newTargetId;
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._Type.one(sourceId);
      if (!oldTargetId) {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        }
        return true;
      }

      // const beforeStorages = _getAllStorages(deep, source);

      deep._Type.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf();

      // const afterStorages = _getAllStorages(deep, source); // Should be empty or different
      // const storagesDiff = { old: beforeStorages, new: afterStorages };
      const storagesDiff = undefined;

      new deep(sourceId).emit(deep.events.typeDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.typeDeleted._id, { before: oldTargetId }, isStorageEvent, storagesDiff));
      new deep(oldTargetId)._emit(deep.events.typedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.typedDeleted._id, { before: oldTargetId, after: sourceId }, isStorageEvent, storagesDiff));

      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited, storagesDiff);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return true;
    }
  });
  return Type;
}

export function newFrom(deep: any) {
  const From = new deep.Field(function (this: any, key: any, value: any) {
    const isStorageEvent = deep.Deep.__isStorageEvent; // Read the global flag

    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._From.one(sourceId);
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._From.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source.from_id = newTargetId; // Original logic
      const fromSettedPayload = createLinkEventPayload(deep, sourceId, deep.events.fromSetted._id, { before: oldTargetId, after: newTargetId }, isStorageEvent);
      new deep(sourceId).emit(deep.events.fromSetted._id, fromSettedPayload);
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          const outDeletedPayload = createLinkEventPayload(deep, oldTargetId, deep.events.outDeleted._id, { after: sourceId }, isStorageEvent);
          new deep(oldTargetId)._emit(deep.events.outDeleted._id, outDeletedPayload);
        }
        const outAddedPayload = createLinkEventPayload(deep, newTargetId, deep.events.outAdded._id, { after: sourceId }, isStorageEvent);
        new deep(newTargetId)._emit(deep.events.outAdded._id, outAddedPayload);
      }
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return newTargetId; // Consistent with original v._id return, now newTargetId
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._From.one(sourceId);
      if (!oldTargetId) {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        }
        return true;
      }
      deep._From.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf();
      new deep(sourceId).emit(deep.events.fromDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.fromDeleted._id, { before: oldTargetId }, isStorageEvent));
      new deep(oldTargetId)._emit(deep.events.outDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.outDeleted._id, { after: sourceId }, isStorageEvent));
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return true;
    }
  });
  return From;
}

export function newTo(deep: any) {
  const To = new deep.Field(function (this: any, key: any, value: any) {
    const isStorageEvent = deep.Deep.__isStorageEvent; // Read the global flag

    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._To.one(sourceId);
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._To.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source.to_id = newTargetId; // Original logic
      new deep(sourceId).emit(deep.events.toSetted._id, createLinkEventPayload(deep, sourceId, deep.events.toSetted._id, { before: oldTargetId, after: newTargetId }, isStorageEvent));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.inDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.inDeleted._id, { after: sourceId }, isStorageEvent));
        }
        new deep(newTargetId)._emit(deep.events.inAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.inAdded._id, { after: sourceId }, isStorageEvent));
      }
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return newTargetId;
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._To.one(sourceId);
      if (!oldTargetId) {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        }
        return true;
      }
      deep._To.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      new deep(sourceId).emit(deep.events.toDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.toDeleted._id, { before: oldTargetId }, isStorageEvent));
      new deep(oldTargetId)._emit(deep.events.inDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.inDeleted._id, { after: sourceId }, isStorageEvent));
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return true;
    }
  });
  return To;
}

export function newValue(deep: any) {
  const Value = new deep.Field(function (this: any, key: any, value: any) {
    const isStorageEvent = deep.Deep.__isStorageEvent; // Read the global flag

    const sourceId = this._source;
    const source = new deep(sourceId);
    const visited = new Set();

    if (this._reason == deep.reasons.getter._id) {
      const targetId = deep._Value.one(sourceId);
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == deep.reasons.setter._id) {
      const oldTargetId = deep._Value.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source.value_id = newTargetId; // Original logic, assumes source.value_id uses _Deep setter for _Value relation
      new deep(sourceId).emit(deep.events.valueSetted._id, createLinkEventPayload(deep, sourceId, deep.events.valueSetted._id, { before: oldTargetId, after: newTargetId }, isStorageEvent));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          new deep(oldTargetId)._emit(deep.events.valuedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.valuedDeleted._id, { after: sourceId }, isStorageEvent));
        }
        new deep(newTargetId)._emit(deep.events.valuedAdded._id, createLinkEventPayload(deep, newTargetId, deep.events.valuedAdded._id, { after: sourceId }, isStorageEvent));
      }
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return newTargetId;
    } else if (this._reason == deep.reasons.deleter._id) {
      const oldTargetId = deep._Value.one(sourceId);
      if (!oldTargetId) {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        }
        return true;
      }
      deep._Value.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      new deep(sourceId).emit(deep.events.valueDeleted._id, createLinkEventPayload(deep, sourceId, deep.events.valueDeleted._id, { before: oldTargetId }, isStorageEvent));
      new deep(oldTargetId)._emit(deep.events.valuedDeleted._id, createLinkEventPayload(deep, oldTargetId, deep.events.valuedDeleted._id, { after: sourceId }, isStorageEvent));
      emitReferrerChangeEvents(deep, sourceId, isStorageEvent, visited);

      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return true;
    }
  });
  return Value;
}

export function newVal(deep: any) {
  const ValField = new deep.Field(function (this: any, key: any, valueToSet: any) {
    const ownerId = this._source;
    let currentInstance = new deep(ownerId);

    if (this._reason == deep.reasons.getter._id) {
      const visited = new Set<string>();
      visited.add(currentInstance._id);
      while (currentInstance.value_id !== undefined) {
        const nextValueTarget = currentInstance.value_id;
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
  const DataField = new deep.Field(function (this: any, key: any, valueToSet: any) {
    const isStorageEvent = deep.Deep.__isStorageEvent; // Read the global flag

    const ownerIdConst = this._source; // Keep original ownerId as const
    // For newData, we always start with a fresh visited set for this specific operation.
    const visitedForDataOp = new Set();

    if (this._reason == deep.reasons.getter._id) {
      let currentId = ownerIdConst; // Use a mutable variable for iteration
      const visited = new Set<string>();
      visited.add(currentId);
      while (new deep(currentId).value_id !== undefined) {
        const nextValueTargetId = new deep(currentId).value_id;
        if (!nextValueTargetId || typeof nextValueTargetId !== 'string') {
          break;
        }
        currentId = nextValueTargetId; // Assign to the mutable variable
        if (visited.has(currentId)) {
          break;
        }
        visited.add(currentId);
      }
      if (deep.Deep.__isStorageEvent === isStorageEvent) {
        deep.Deep.__isStorageEvent = undefined;
      }
      return new deep(currentId)._data; // Get data from the final currentId
    } else if (this._reason == deep.reasons.setter._id) {
      // Get the terminal instance in the value chain (same logic as in getter)
      const valInstance = findTerminalValueInstance(deep, ownerIdConst); // Use original ownerIdConst
      const typeId = valInstance.type_id;

      // Check if the instance has a type with a registered _Data handler
      if (typeId && deep._datas.has(typeId)) {
        // Set the data
        valInstance._data = valueToSet;

        // Emit data:setted event on the terminal instance
        new deep(valInstance._id).emit(deep.events.dataSetted._id, createLinkEventPayload(deep, valInstance._id, deep.events.dataSetted._id, undefined, isStorageEvent));

        // Propagate .data:changed events up the value chain
        propagateDataChangeEvents(deep, valInstance._id, isStorageEvent, visitedForDataOp); // Pass the specific visited set

        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        }
        return true;
      } else {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        } // Reset flag even if error thrown
        throw new Error('Setting .data is only supported on instances with a registered data handler for their type.');
      }
    } else if (this._reason == deep.reasons.deleter._id) {
      // Get the terminal instance in the value chain
      const valInstance = findTerminalValueInstance(deep, ownerIdConst); // Use original ownerIdConst
      const typeId = valInstance.type_id;

      // Check if the instance has a type with a registered _Data handler
      if (typeId && deep._datas.has(typeId)) {
        // We can't directly set ._data to undefined because the _data setter in _deep.ts requires a value
        // Instead, we'll throw an error unless there's a clear way to "delete" data within the handler
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        } // Reset flag even if error thrown
        throw new Error('Deleting .data is not directly supported. Consider setting it to a null or default value instead.');
      } else {
        if (deep.Deep.__isStorageEvent === isStorageEvent) {
          deep.Deep.__isStorageEvent = undefined;
        } // Reset flag even if error thrown
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

  while (instance.value_id !== undefined) {
    const nextValueTargetId = instance.value_id;
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
function propagateDataChangeEvents(deep: any, changedInstanceId: string, __isStorageEvent?: string, visited = new Set()) {
  const processingKey = `${changedInstanceId}:propagateDataChange`;
  if (visited.has(processingKey)) {
    return;
  }
  visited.add(processingKey);

  const referrers = deep._Value.many(changedInstanceId);

  for (const referrerId of referrers) {
    const payload = createLinkEventPayload(deep, referrerId, deep.events.dataChanged._id, undefined, __isStorageEvent);
    new deep(referrerId)._emit(deep.events.dataChanged._id, payload);

    propagateDataChangeEvents(deep, referrerId, __isStorageEvent, visited);
  }
}

/**
 * Initialize all link fields on the deep instance
 * Call this once to set up all link-related Fields
 */
export function newLinks(deep: any) {
  // Initialize all link fields
  deep._contain.id = newId(deep);
  deep._contain.type = newType(deep);
  deep._contain.from = newFrom(deep);
  deep._contain.to = newTo(deep);
  deep._contain.value = newValue(deep);
  deep._contain.val = newVal(deep);
  deep._contain.data = newData(deep);

  return {
    id: deep._contain.id,
    source: deep._contain.source,
    reason: deep._contain.reason,
    type: deep._contain.type,
    from: deep._contain.from,
    to: deep._contain.to,
    value: deep._contain.value,
    val: deep._contain.val,
    data: deep._contain.data
  };
}