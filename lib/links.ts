import { _Data } from "./_data";
import { z } from "zod";
import { _Reason } from "./deep";

// Helper function to create the event payload
function createLinkEventPayload(deep: any, id: string, reason: string) {
  const payload = new deep(id);
  payload._reason = reason;
  payload._source = id; // The event is about this instance
  return payload;
}

// Helper function to emit change events on instances referring to changedInstanceId
function emitReferrerChangeEvents(deep: any, changedInstanceId: string) {
  const relationsToNotify = [
    { relation: deep._Type, eventName: ".typed:changed", reverseLinkProp: '_type' },
    { relation: deep._From, eventName: ".out:changed", reverseLinkProp: '_from' },
    { relation: deep._To, eventName: ".in:changed", reverseLinkProp: '_to' },
    { relation: deep._Value, eventName: ".valued:changed", reverseLinkProp: '_value' },
  ];

  // Iterate over all Deep instances that might be referring to changedInstanceId
  // This is a simplified approach. A more robust way would be to iterate all existing deep._ids
  // and check their link properties. For now, we focus on direct referrers via _Relation.many().
  for (const { relation, eventName, reverseLinkProp } of relationsToNotify) {
    // relation.many(changedInstanceId) gives IDs of Deep objects X where X's link (e.g., X._type) IS changedInstanceId.
    const referrers = relation.many(changedInstanceId);
    for (const referrerId of referrers) {
      // Ensure the referrer's specific link indeed points to changedInstanceId.
      // This check is somewhat redundant if relation.many() is precise, but good for safety.
      const referrerInstance = new deep(referrerId);
      if (referrerInstance[reverseLinkProp] === changedInstanceId) {
        const payload = createLinkEventPayload(deep, referrerId, "changed");
        deep._events.emit(referrerId, eventName, payload);
      }
    }
  }
}

export function newType(deep: any) {
  const Type = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);

    if (this._reason == _Reason.Getter) {
      const targetId = deep._Type.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == _Reason.Setter) {
      const oldTargetId = deep._Type.one(sourceId); // Read current _type directly from relation
      const newTargetDeep = new deep(value); // value is the new target Deep instance or id
      const newTargetId = newTargetDeep._id;

      // Perform actual operation using _Deep's setter (updates _Type relation and _updated_at for source)
      source._type = newTargetId;

      // 1. Event on source: ._type:setted
      deep._events.emit(sourceId, ".type:setted", createLinkEventPayload(deep, sourceId, "setted"));

      if (oldTargetId !== newTargetId) {
        // 2. Event on old target: ._typed:deleted
        if (oldTargetId) {
          deep._events.emit(oldTargetId, ".typed:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
        }
        // 3. Event on new target: ._typed:added
        deep._events.emit(newTargetId, ".typed:added", createLinkEventPayload(deep, newTargetId, "added"));
      }
      
      // 4. Referrer change events for sourceId (instances X where X.type/from/to/value = sourceId)
      emitReferrerChangeEvents(deep, sourceId);

      return newTargetId; // Value that was effectively set
    } else if (this._reason == _Reason.Deleter) {
      const oldTargetId = deep._Type.one(sourceId); 
      if (!oldTargetId) return true; 
      deep._Type.delete(sourceId);
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      deep._events.emit(sourceId, ".type:deleted", createLinkEventPayload(deep, sourceId, "deleted"));

      // 2. Event on old target: ._typed:deleted
      deep._events.emit(oldTargetId, ".typed:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
      
      // 4. Referrer change events for sourceId
      emitReferrerChangeEvents(deep, sourceId);

      return true;
    }
  });
  return Type;
}

export function newFrom(deep: any) {
  const From = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    if (this._reason == _Reason.Getter) {
      const targetId = deep._From.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == _Reason.Setter) {
      const oldTargetId = deep._From.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._from = newTargetId; // Original logic
      deep._events.emit(sourceId, ".from:setted", createLinkEventPayload(deep, sourceId, "setted"));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          deep._events.emit(oldTargetId, ".out:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
        }
        deep._events.emit(newTargetId, ".out:added", createLinkEventPayload(deep, newTargetId, "added"));
      }
      emitReferrerChangeEvents(deep, sourceId);
      return newTargetId; // Consistent with original v._id return, now newTargetId
    } else if (this._reason == _Reason.Deleter) {
      const oldTargetId = deep._From.one(sourceId);
      if (!oldTargetId) return true; 
      deep._From.delete(sourceId); 
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      deep._events.emit(sourceId, ".from:deleted", createLinkEventPayload(deep, sourceId, "deleted"));
      deep._events.emit(oldTargetId, ".out:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
      emitReferrerChangeEvents(deep, sourceId);
      return true;
    }
  });
  return From;
}

export function newTo(deep: any) {
  const To = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    if (this._reason == _Reason.Getter) {
      const targetId = deep._To.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == _Reason.Setter) {
      const oldTargetId = deep._To.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._to = newTargetId; // Original logic
      deep._events.emit(sourceId, ".to:setted", createLinkEventPayload(deep, sourceId, "setted"));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          deep._events.emit(oldTargetId, ".in:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
        }
        deep._events.emit(newTargetId, ".in:added", createLinkEventPayload(deep, newTargetId, "added"));
      }
      emitReferrerChangeEvents(deep, sourceId);
      return newTargetId;
    } else if (this._reason == _Reason.Deleter) {
      const oldTargetId = deep._To.one(sourceId);
      if (!oldTargetId) return true;
      deep._To.delete(sourceId); 
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      deep._events.emit(sourceId, ".to:deleted", createLinkEventPayload(deep, sourceId, "deleted"));
      deep._events.emit(oldTargetId, ".in:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
      emitReferrerChangeEvents(deep, sourceId);
      return true;
    }
  });
  return To;
}

export function newValue(deep: any) {
  const Value = new deep.Field(function(this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    if (this._reason == _Reason.Getter) {
      const targetId = deep._Value.one(sourceId);
      return targetId ? new deep(targetId) : undefined;
    } else if (this._reason == _Reason.Setter) {
      const oldTargetId = deep._Value.one(sourceId);
      const newTargetDeep = new deep(value);
      const newTargetId = newTargetDeep._id;
      source._value = newTargetId; // Original logic, assumes source._value uses _Deep setter for _Value relation
      deep._events.emit(sourceId, ".value:setted", createLinkEventPayload(deep, sourceId, "setted"));
      if (oldTargetId !== newTargetId) {
        if (oldTargetId) {
          deep._events.emit(oldTargetId, ".valued:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
        }
        deep._events.emit(newTargetId, ".valued:added", createLinkEventPayload(deep, newTargetId, "added"));
      }
      emitReferrerChangeEvents(deep, sourceId);
      return newTargetId;
    } else if (this._reason == _Reason.Deleter) {
      const oldTargetId = deep._Value.one(sourceId);
      if (!oldTargetId) return true;
      deep._Value.delete(sourceId); 
      new deep(sourceId)._updated_at = new Date().valueOf(); // Update timestamp
      deep._events.emit(sourceId, ".value:deleted", createLinkEventPayload(deep, sourceId, "deleted"));
      deep._events.emit(oldTargetId, ".valued:deleted", createLinkEventPayload(deep, oldTargetId, "deleted"));
      emitReferrerChangeEvents(deep, sourceId);
      return true;
    }
  });
  return Value;
}

export function newVal(deep: any) {
  const ValField = new deep.Field(function(this: any, key: any, valueToSet: any) {
    const ownerId = this._source;
    let currentInstance = new deep(ownerId);

    if (this._reason == _Reason.Getter) {
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
    } else if (this._reason == _Reason.Setter) {
      throw new Error('Setting .val is not supported. Set .value on the desired instance directly.');
    } else if (this._reason == _Reason.Deleter) {
      throw new Error('Deleting .val is not supported. Delete .value on the desired instance directly.');
    }
  });
  return ValField;
}

export function newData(deep: any) {
  const DataField = new deep.Field(function(this: any, key: any, valueToSet: any) {
    const ownerId = this._source;
    let terminalInstance = new deep(ownerId);

    if (this._reason == _Reason.Getter) {
      const visited = new Set<string>();
      visited.add(terminalInstance._id);
      while (terminalInstance._value !== undefined) {
        const nextValueTargetId = terminalInstance._value;
        if (!nextValueTargetId || typeof nextValueTargetId !== 'string') {
            break; 
        }
        terminalInstance = new deep(nextValueTargetId);
        if (visited.has(terminalInstance._id)) {
          break;
        }
        visited.add(terminalInstance._id);
      }
      return terminalInstance._data;
    } else if (this._reason == _Reason.Setter) {
      throw new Error('Setting .data is not directly supported. Modify ._data on the underlying value instance.');
    } else if (this._reason == _Reason.Deleter) {
      throw new Error('Deleting .data is not directly supported.');
    }
  });
  return DataField;
}