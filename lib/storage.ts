import { Hasyx } from 'hasyx';
import Debug from './debug';

const debug = Debug('storage');

// Core Storage System for Deep Framework
// Provides base Storage Alive class with event handlers and methods for storage implementations

/**
 * Storage dump interface for serialization and restoration
 */
export interface StorageDump {
  ids?: string[]; // identifiers for newDeep() restoration
  links: StorageLink[];
}

/**
 * Storage link interface representing an association in storage format
 */
export interface StorageLink {
  _id: string;
  _type?: string; // optional - can be NULL when id != _deep
  _from?: string;
  _to?: string;
  _value?: string;
  _created_at: number;
  _updated_at: number;
  _i?: number; // sequence number, auto-assigned by StorageLocalDump on insert if not specified, immutable on update
  _function?: string;
  _number?: number;
  _string?: string;
  _protected?: boolean;
}

/**
 * Delta operation for incremental updates
 */
export interface StorageDelta {
  operation: 'insert' | 'delete' | 'update';
  id?: string;
  link?: StorageLink;
}


export function _generateProtectedDump(deep: any): StorageDump {
  const links: StorageLink[] = [];
  const ids: string[] = [];

  // 1. Get all associations and sort them by _i
  const sortedAssociations = Array.from(deep._ids as Set<string>)
    .map(id => new deep(id)) // Create deep instances for access to properties, including _i
    .sort((a, b) => {
      // Ensure _i exists for sorting
      const iA = typeof a._i === 'number' ? a._i : Infinity;
      const iB = typeof b._i === 'number' ? b._i : Infinity;
      return iA - iB;
    });

  // 2. Create StorageLink for each sorted association
  for (const association of sortedAssociations) {
    const storageLink: StorageLink = {
      _id: association._id,
      _type: association._type, // Can be undefined if id === deep._id
      _created_at: association._created_at,
      _updated_at: association._updated_at,
      _i: association._i, // Include client _i for possible use or debugging
      _protected: deep.Deep._isProtected(association._id),
    };

    if (association._from) storageLink._from = association._from;
    if (association._to) storageLink._to = association._to;
    if (association._value) storageLink._value = association._value;

    // Add data if exists
    const data = deep._getData(association._id);
    if (data !== undefined) {
      if (typeof data === 'string') {
        storageLink._string = data;
      } else if (typeof data === 'number') {
        storageLink._number = data;
      } else if (typeof data === 'function') {
        storageLink._function = data.toString();
      }
    }

    links.push(storageLink);
    ids.push(association._id); // ids also sorted by _i
  }

  return { ids, links };
}

/**
 * Check if storage instance is alive and functional
 * @param deep - Deep instance
 * @param storageOrId - Storage instance or ID to check
 * @returns true if storage is alive and can handle operations
 */
export function isStorageAlive(deep: any, storageOrId: any): boolean {
  let storageId: string;
  let storageInstanceToUse: any;

  if (typeof storageOrId === 'string') {
    if (!deep._ids.has(storageOrId)) {
      // It's important to decide if this should throw or return false.
      // For isStorageAlive, returning false might be more graceful if an invalid ID is passed.
      // However, the previous getStorageIdInternal threw, so keeping similar strictness.
      throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids for isStorageAlive.`);
    }
    storageId = storageOrId;
    storageInstanceToUse = new deep(storageId); // Instance is needed for properties
  } else if (storageOrId instanceof deep.Deep) {
    storageId = storageOrId._id;
    storageInstanceToUse = storageOrId; // Already have instance
  } else if (storageOrId && typeof storageOrId._id === 'string' && deep._ids.has(storageOrId._id)) {
    storageId = storageOrId._id; // Proxied object
    storageInstanceToUse = new deep(storageId); // Instance needed for properties
  } else {
    let typeInfoString: string = typeof storageOrId;
    if (storageOrId && storageOrId.constructor && storageOrId.constructor.name) {
      typeInfoString = typeInfoString + ' (' + storageOrId.constructor.name + ')';
    }
    // Consistent with previous error throwing for invalid types
    throw new Error('Storage must be a Deep instance, its proxy, or a valid string ID for isStorageAlive. Received type: ' + typeInfoString);
  }

  return storageInstanceToUse &&
    storageInstanceToUse._state &&
    storageInstanceToUse._reason !== storageInstanceToUse.deep?.reasons?.destruction?._id &&
    typeof storageInstanceToUse.state?.generateDump === 'function';
}

/**
 * Wrap storage operation with lifecycle guard to prevent execution on destroyed storage
 * @param deep - Deep instance
 * @param storageOrId - Storage instance or ID to check
 * @param operation - Async operation to execute
 * @returns Promise that resolves safely regardless of storage state
 */
export function wrapStorageOperation<T>(
  deep: any,
  storageOrId: any,
  operation: () => Promise<T>
): Promise<T | void> {
  // isStorageAlive will handle ID/instance resolution and validation
  return new Promise((resolve, reject) => {
    // Pass storageOrId directly to isStorageAlive, it will resolve/validate.
    if (!isStorageAlive(deep, storageOrId)) {
      // Log with the ID if possible, after resolving it carefully for logging.
      let idForLog = '[unknown_storage]';
      try {
        if (typeof storageOrId === 'string') idForLog = storageOrId;
        else if (storageOrId && storageOrId._id) idForLog = storageOrId._id;
      } catch (e) { }
      debug('💀 Storage %s is destroyed, skipping operation', idForLog);
      resolve(); // Gracefully skip operation
      return;
    }

    operation()
      .then(resolve)
      .catch((error) => {
        let idForLogCatch = '[unknown_storage]';
        try {
          if (typeof storageOrId === 'string') idForLogCatch = storageOrId;
          else if (storageOrId && storageOrId._id) idForLogCatch = storageOrId._id;
        } catch (e) { }
        if (!isStorageAlive(deep, storageOrId)) { // Re-check, pass original storageOrId
          debug('💀 Storage %s destroyed during operation, ignoring error: %s',
            idForLogCatch, error.message);
          resolve(); // Don't propagate errors from destroyed storage
        } else {
          debug('💥 Storage operation failed for %s:', idForLogCatch, error);
          reject(error);
        }
      });
  });
}

/**
 * Creates the core Storage system with Alive-based storage class
 * @param deep - Deep instance to attach storage to
 */
export function newStorage(deep: any) {
  const Storage = new deep.Alive(function (this: any) {
    const storage = this; // 'this' is the Alive instance being constructed (the storage itself)

    if (this._reason === deep.reasons.construction._id) {
      const state = this._state;
      state.generateDump = (): StorageDump => {
        // _generateDump needs 'deep' and the storage (this or its ID)
        return _generateDump(deep, storage); // Pass the instance itself
      };
      state.apply = (dump: StorageDump) => {
        return _applySubscription(deep, dump, storage);
      };
      state.watch = () => {
        if (!state._eventDisposers) state._eventDisposers = [];
        if (deep.events.storeAdded) {
          const disposer1 = deep.on(deep.events.storeAdded._id, function (this: any, payload: any) {
            if (payload._source === storage._id && state.onLinkInsert) {
              const storageLink = __generateStorageLink(deep, payload);
              if (storageLink) state.onLinkInsert(storageLink);
            }
          });
          state._eventDisposers.push(disposer1);
        }
        if (deep.events.storeRemoved) {
          const disposer2 = deep.on(deep.events.storeRemoved._id, (payload: any) => {
            if (payload._source === storage._id && state.onLinkDelete) {
              const storageLink = __generateStorageLink(deep, payload);
              if (storageLink) state.onLinkDelete(storageLink);
            }
          });
          state._eventDisposers.push(disposer2);
        }
        if (deep.events.globalLinkChanged) {
          const disposer3 = deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
            debug('🔄 globalLinkChanged initial', payload._plain, 'diff', payload.__storagesDiff);
            if (
              (
                (payload.__storagesDiff && (payload.__storagesDiff.old?.has(storage._id) || payload.__storagesDiff.new?.has(storage._id)))
                || payload.isStored(storage)
              )
              &&
              state.onLinkUpdate) {
              const storageLink = __generateStorageLink(deep, payload); // payload is the association instance
              if (storageLink) {
                debug('🔄 globalLinkChanged storageLink', storageLink);
                state.onLinkUpdate(storageLink);
              } else {
                debug('⚠️ globalLinkChanged storageLink is null');
              }
            }
          });
          state._eventDisposers.push(disposer3);
        }
        if (deep.events.globalDataChanged) {
          const disposer4 = deep.on(deep.events.globalDataChanged._id, (payload: any) => {
            const association = new deep(payload._id);
            // isStored will be made ID-aware, storage is 'this' (the storage instance)
            if (association.isStored(storage) && state.onDataChanged) {
              const storageLink = __generateStorageLink(deep, payload);
              if (storageLink) state.onDataChanged(storageLink);
            }
          });
          state._eventDisposers.push(disposer4);
        }
        if (deep.events.globalDestroyed) {
          const disposer5 = deep.on(deep.events.globalDestroyed._id, (payload: any) => {
            const allStorageMarkers = deep._getAllStorageMarkers();
            let wasStored = false;
            for (const [associationId, storageMap] of allStorageMarkers) {
              if (associationId === payload._id && storageMap.has(storage._id)) { // storage._id is correct here
                wasStored = true;
                break;
              }
            }
            const associationStorageMarkers = deep._getStorageMarkers(payload._id, storage._id); // storage._id
            if (associationStorageMarkers && associationStorageMarkers.size > 0) {
              debug('Cleaning up storage markers for destroyed association %s in storage %s', payload._id, storage._id);
              for (const markerId of Array.from(associationStorageMarkers)) {
                deep._deleteStorageMarker(payload._id, storage._id, markerId); // storage._id
              }
            }
            if (wasStored && state.onLinkDelete) {
              const storageLink: StorageLink = {
                _id: payload._id,
                _type: payload._type || deep.String._id,
                _created_at: payload._created_at || 0,
                _updated_at: Date.now(),
                _protected: deep.Deep._isProtected(payload._id),
              };
              debug('Handling destroy event for %s in storage %s', payload._id, storage._id);
              state.onLinkDelete(storageLink);
            }
          });
          state._eventDisposers.push(disposer5);
        }
      };
      state.onLinkInsert = undefined;
      state.onLinkDelete = undefined;
      state.onLinkUpdate = undefined;
      state.onDataChanged = undefined;
    } else if (this._reason === deep.reasons.destruction._id) {
      const state = this._state;
      debug('Storage destruction initiated for %s', this._id);
      if (state.onDestroy && typeof state.onDestroy === 'function') {
        try {
          state.onDestroy();
          debug('Storage onDestroy handler completed for %s', this._id);
        } catch (error) {
          debug('Error in storage onDestroy handler for %s: %s', this._id, (error as Error).message);
        }
      }
      if (state._eventDisposers) {
        for (const disposer of state._eventDisposers) {
          if (typeof disposer === 'function') disposer();
        }
        state._eventDisposers = [];
      }
      debug('Storage destruction completed for %s', this._id);
    }
  });
  deep._context.Storage = Storage;
  return Storage;
}

/**
 * Helper function to generate StorageLink from association
 * @param deep - Deep instance
 * @param association - Association to convert
 * @returns StorageLink or null if not meaningful
 */
function __generateStorageLink(deep: any, association: any): StorageLink | null {
  const typeId = association._type;
  if (!typeId) {
    debug(`🤔 __generateStorageLink don't generate storageLink for ${association?._id} because typeId is missing`);
    return null;
  }
  const storageLink: StorageLink = {
    _id: association._id,
    _type: typeId,
    _created_at: association._created_at,
    _updated_at: association._updated_at,
    _i: association._i,
    _protected: deep.Deep._isProtected(association._id),
  };
  if (association._from) storageLink._from = association._from;
  if (association._to) storageLink._to = association._to;
  if (association._value) storageLink._value = association._value;
  const data = deep._getData(association._id);
  if (data !== undefined) {
    if (typeof data === 'string') storageLink._string = data;
    else if (typeof data === 'number') storageLink._number = data;
    else if (typeof data === 'function') storageLink._function = data.toString();
  }
  return storageLink;
}

/**
 * Generate correct StorageDump for testing and internal use
 * @param deep - Deep instance
 * @param storageOrId - Storage instance or ID to use
 * @returns StorageDump - Generated dump
 */
export function _generateDump(deep: any, storageOrId: any): StorageDump {
  const links: StorageLink[] = [];
  const ids: string[] = [];
  let storageIdToUse: string;

  if (typeof storageOrId === 'string') {
    if (!deep._ids.has(storageOrId)) throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids for _generateDump.`);
    storageIdToUse = storageOrId;
  } else if (storageOrId instanceof deep.Deep) {
    storageIdToUse = storageOrId._id;
  } else if (storageOrId && typeof storageOrId._id === 'string' && deep._ids.has(storageOrId._id)) {
    storageIdToUse = storageOrId._id; // Proxied object
  } else {
    throw new Error('Storage must be a Deep instance, its proxy, or a valid string ID for _generateDump.');
  }

  debug('🔍 _generateDump: Starting generation for storage %s', storageIdToUse);
  const allStorageMarkers = deep._getAllStorageMarkers();
  debug('🔍 _generateDump: Total storage markers: %d', allStorageMarkers.size);
  const directlyMarked = new Set<string>();
  for (const [associationId, storageMap] of allStorageMarkers) {
    if (storageMap.has(storageIdToUse)) {
      directlyMarked.add(associationId);
    }
  }
  debug('🔍 _generateDump: Directly marked associations: %d', directlyMarked.size);
  const inheritedMarked = new Set<string>();
  for (const associationId of deep._ids) {
    if (directlyMarked.has(associationId)) continue;
    const association = new deep(associationId);
    // Pass storageOrId as isStored will be ID-aware
    if (association.isStored(storageOrId)) {
      inheritedMarked.add(associationId);
    }
  }
  debug('🔍 _generateDump: Inherited marked associations: %d', inheritedMarked.size);
  const allMarkedAssociations = new Set([...directlyMarked, ...inheritedMarked]);
  debug('🔍 _generateDump: Total marked associations: %d', allMarkedAssociations.size);
  for (const associationId of allMarkedAssociations) {
    debug('🔍 _generateDump: Checking association %s', associationId);
    if (!deep._ids.has(associationId)) {
      debug('🗑️ _generateDump: Skipping destroyed association %s', associationId);
      continue;
    }
    debug('✅ _generateDump: Association %s exists in deep._ids', associationId);
    const association = new deep(associationId);
    const typeId = association._type;
    if (!typeId && association._id !== deep._id) continue;
    const storageLink: StorageLink = {
      _id: associationId,
      _type: typeId,
      _created_at: association._created_at,
      _updated_at: association._updated_at,
      _i: association._i,
      _protected: deep.Deep._isProtected(associationId),
    };
    if (association._from) storageLink._from = association._from;
    if (association._to) storageLink._to = association._to;
    if (association._value) storageLink._value = association._value;
    const data = deep._getData(associationId);
    if (data !== undefined) {
      if (typeof data === 'string') storageLink._string = data;
      else if (typeof data === 'number') storageLink._number = data;
      else if (typeof data === 'function') storageLink._function = data.toString();
    }
    links.push(storageLink);
    ids.push(associationId);
  }
  return { ids, links };
}

/**
 * Dependency-aware sorting of storage links
 * @param links - Array of storage links to sort
 * @param needResortI - Whether to pre-sort by _i field
 * @returns Topologically sorted links array
 */
export function _sortDump(links: StorageLink[], needResortI?: boolean): StorageLink[] {
  const sortedLinks = needResortI ?
    [...links].sort((a, b) => {
      if (a._i === undefined || b._i === undefined) {
        throw new Error(`Missing _i field for sorting on link ${a._i === undefined ? a._id : b._id}`);
      }
      return a._i - b._i;
    }) : links;
  const linkIds = new Set(sortedLinks.map(link => link._id));
  const dependencyMap = new Map<string, { link: StorageLink, dependencies: Set<string> }>();
  for (const link of sortedLinks) {
    const dependencies = [link._type, link._from, link._to, link._value]
      .filter((dep): dep is string => Boolean(dep) && linkIds.has(dep as string));
    dependencyMap.set(link._id, { link, dependencies: new Set(dependencies) });
  }
  const result: StorageLink[] = [];
  const processing = new Set<string>();
  const processed = new Set<string>();
  const processLink = (linkId: string): void => {
    if (processed.has(linkId)) return;
    if (processing.has(linkId)) throw new Error(`Circular dependency detected involving link: ${linkId}`);
    processing.add(linkId);
    const entry = dependencyMap.get(linkId);
    if (!entry) throw new Error(`Link not found in dependency map: ${linkId}`);
    for (const depId of entry.dependencies) processLink(depId);
    result.push(entry.link);
    processed.add(linkId);
    processing.delete(linkId);
  };
  for (const link of sortedLinks) processLink(link._id);
  return result;
}

export function _validateDependencies(deep: any, link: StorageLink, storageOrId: any): void {
  const dependencies = [link._type, link._from, link._to, link._value]
    .filter(depId => depId && typeof depId === 'string');
  for (const depId of dependencies) {
    const dependency = new deep(depId);
    // Pass storageOrId as isStored will be ID-aware
    if (!dependency.isStored(storageOrId)) {
      throw new Error(`Dependency ${depId} is not stored in the same storage`);
    }
  }
}

export function _applyDelta(deep: any, delta: StorageDelta, storageOrId: any, skipValidation?: boolean): void {
  let storageIdToUse: string;
  if (typeof storageOrId === 'string') {
    if (!deep._ids.has(storageOrId)) throw new Error(`Invalid storage ID: ${storageOrId} for _applyDelta.`);
    storageIdToUse = storageOrId;
  } else if (storageOrId instanceof deep.Deep) {
    storageIdToUse = storageOrId._id;
  } else if (storageOrId && typeof storageOrId._id === 'string' && deep._ids.has(storageOrId._id)) {
    storageIdToUse = storageOrId._id; // Proxied
  } else {
    throw new Error('Storage must be a Deep instance, its proxy, or a valid string ID for _applyDelta.');
  }

  debug('Applying delta: %o to storage %s', delta, storageIdToUse);

  if (delta.operation === 'insert' && delta.link) {
    const link = delta.link;
    debug('Inserting link: %s into storage %s', link._id, storageIdToUse);
    if (!skipValidation) _validateDependencies(deep, link, storageOrId); // Pass original storageOrId
    const association = new deep(link._id);
    if (!deep._created_ats.has(link._id)) association._created_at = link._created_at;
    association._updated_at = link._updated_at;
    association._setSequenceNumber(link._id, link._i!);
    if (association._i !== link._i) throw new Error(`Sequence number mismatch for ${link._id}: expected ${link._i}, got ${association._i}.`);
    if (link._type) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.type = new deep(link._type);
    }
    if (link._from) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.from = new deep(link._from);
    }
    if (link._to) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.to = new deep(link._to);
    }
    if (link._value) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.value = new deep(link._value);
    }
    if (link._string !== undefined) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._string;
    }
    if (link._number !== undefined) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._number;
    }
    if (link._function !== undefined) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._function;
    }
    debug('Successfully inserted association: %s into storage %s', link._id, storageIdToUse);
    if (!skipValidation) {
      // Pass original storageOrId
      if (link._type === deep._id) association.store(storageOrId, deep.storageMarkers.typedTrue);
      else association.store(storageOrId, deep.storageMarkers.oneTrue);
    }
  } else if (delta.operation === 'delete' && delta.id) {
    debug('Deleting association: %s from storage %s', delta.id, storageIdToUse);
    const association = new deep(delta.id);
    association.unstore(storageOrId); // Pass original storageOrId
    association.destroy();
    debug('Successfully deleted association: %s from storage %s', delta.id, storageIdToUse);
  } else if (delta.operation === 'update' && delta.link) {
    const link = delta.link;
    debug('Updating association: %s in storage %s', link._id, storageIdToUse);
    if (!skipValidation) _validateDependencies(deep, link, storageOrId); // Pass original storageOrId
    const association = new deep(link._id);
    
    // Check for semantic changes to prevent unnecessary updates
    let hasSemanticChanges = false;
    
    if (link._type && association._type !== link._type) hasSemanticChanges = true;
    if (link._from && association._from !== link._from) hasSemanticChanges = true;
    if (link._to && association._to !== link._to) hasSemanticChanges = true;
    if (link._value && association._value !== link._value) hasSemanticChanges = true;
    if (link._string !== undefined && association._data !== link._string) hasSemanticChanges = true;
    if (link._number !== undefined && association._data !== link._number) hasSemanticChanges = true;
    if (link._function !== undefined && association._data !== link._function) hasSemanticChanges = true;
    
    // If no semantic changes, skip the update to prevent cycles
    if (!hasSemanticChanges) {
      debug('No semantic changes for association: %s in storage %s, skipping update', link._id, storageIdToUse);
      return;
    }
    
    if (link._type) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.type = new deep(link._type);
    }
    if (link._from) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.from = new deep(link._from);
    }
    if (link._to) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.to = new deep(link._to);
    }
    if (link._value) {
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.value = new deep(link._value);
    }
    if (link._updated_at !== undefined) association._updated_at = link._updated_at;
    if (link._i !== undefined) {
      association._setSequenceNumber(link._id, link._i);
      if (association._i !== link._i) throw new Error(`Sequence number mismatch for ${link._id}: expected ${link._i}, got ${association._i}.`);
    }
    if (link._string !== undefined) {
      if (association._type !== deep.String._id) throw new Error(`Association ${link._id} has _string data but type is not deep.String (${association._type})`);
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._string;
    }
    if (link._number !== undefined) {
      if (association._type !== deep.Number._id) throw new Error(`Association ${link._id} has _number data but type is not deep.Number (${association._type})`);
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._number;
    }
    if (link._function !== undefined) {
      if (association._type !== deep.Function._id) throw new Error(`Association ${link._id} has _function data but type is not deep.Function (${association._type})`);
      deep.Deep.__isStorageEvent = storageIdToUse;
      association.data = link._function;
    }
    debug('Successfully updated association: %s in storage %s', link._id, storageIdToUse);
  } else {
    let deltaString: string; try { deltaString = JSON.stringify(delta); } catch (e: any) { deltaString = `[Delta with circular reference: op=${delta.operation}]`; }
    throw new Error(`Invalid delta operation: ${deltaString}`);
  }
}

/**
 * Handle subscription-based dump synchronization
 * @param deep - Deep instance
 * @param dump - Storage dump to apply
 * @param storageOrId - Storage instance or ID
 */
export function _applySubscription(deep: any, dump: StorageDump, storageOrId: any): void {
  let storageIdToUse: string;
  if (typeof storageOrId === 'string') {
    if (!deep._ids.has(storageOrId)) throw new Error(`Invalid storage ID: ${storageOrId} for _applySubscription.`);
    storageIdToUse = storageOrId;
  } else if (storageOrId instanceof deep.Deep) {
    storageIdToUse = storageOrId._id;
  } else if (storageOrId && typeof storageOrId._id === 'string' && deep._ids.has(storageOrId._id)) {
    storageIdToUse = storageOrId._id; // Proxied
  } else {
    throw new Error('Storage must be a Deep instance, its proxy, or a valid string ID for _applySubscription.');
  }

  debug('🔄 Applying subscription dump to storage %s. Links in dump: %d', storageIdToUse, dump.links?.length || 0);
  if (!dump.links || dump.links.length === 0) {
    const idsToDeleteFromLocal: string[] = [];
    for (const localId of Array.from(deep._ids as Set<string>)) {
      const association = new deep(localId);
      // Pass original storageOrId
      if (!association._protected && association.isStored(storageOrId)) {
        idsToDeleteFromLocal.push(localId);
      }
    }
    if (idsToDeleteFromLocal.length > 0) {
      debug('🗑️ Empty dump for storage %s. Deleting %d local non-protected associations.', storageIdToUse, idsToDeleteFromLocal.length);
      for (const idToDelete of idsToDeleteFromLocal) {
        deep.Deep.__isStorageEvent = storageIdToUse;
        _applyDelta(deep, { operation: 'delete', id: idToDelete }, storageOrId, true); // Pass original storageOrId
        deep.Deep.__isStorageEvent = undefined;
      }
    }
    debug('✅ Empty dump processing complete for storage %s.', storageIdToUse);
    return;
  }

  const linksToProcess: StorageLink[] = [];
  const fetchedLinkIds = new Set<string>();
  for (const link of dump.links) {
    fetchedLinkIds.add(link._id);
    const existingAssociation = deep._ids.has(link._id) ? new deep(link._id) : undefined;
    const existingUpdatedAt = existingAssociation?._updated_at;
    
    let shouldProcess = false;
    
    if (!existingAssociation) {
      shouldProcess = true; // новая связь
    } else if (link._updated_at !== undefined && existingUpdatedAt !== undefined && link._updated_at > existingUpdatedAt) {
      shouldProcess = true; // _updated_at новее
    } else if (link._updated_at !== undefined && existingUpdatedAt === undefined) {
      shouldProcess = true; // отсутствует _updated_at локально
    } else {
      // Check for semantic differences even if _updated_at is the same
      if (link._type && existingAssociation._type !== link._type) shouldProcess = true;
      if (link._from && existingAssociation._from !== link._from) shouldProcess = true;
      if (link._to && existingAssociation._to !== link._to) shouldProcess = true;
      if (link._value && existingAssociation._value !== link._value) shouldProcess = true;
      if (link._string !== undefined && existingAssociation._data !== link._string) shouldProcess = true;
      if (link._number !== undefined && existingAssociation._data !== link._number) shouldProcess = true;
      if (link._function !== undefined && existingAssociation._data !== link._function) shouldProcess = true;
    }
    
    if (shouldProcess) {
      linksToProcess.push(link);
    }
  }

  const sortedLinksToProcess = _sortDump(linksToProcess, true);
  debug('⚙️ Processing %d sorted links (insert/update) for storage %s.', sortedLinksToProcess.length, storageIdToUse);
  for (const link of sortedLinksToProcess) {
    deep.Deep.__isStorageEvent = storageIdToUse;
    _applyDelta(deep, { operation: deep._ids.has(link._id) ? 'update' : 'insert', id: link._id, link: link }, storageOrId, true); // Pass original storageOrId
    deep.Deep.__isStorageEvent = undefined;

    // Moved marker application here, inside the loop for sorted links
    if (deep._ids.has(link._id)) {
      const association = new deep(link._id);
      const markerToUse = link._type === deep._id ? deep.storageMarkers.typedTrue : deep.storageMarkers.oneTrue;
      if (markerToUse) {
        const currentMarkers = deep._getStorageMarkers(link._id, storageIdToUse) as Set<string>; // storageIdToUse is resolved string
        if (!currentMarkers.has(markerToUse._id)) {
          deep.Deep.__isStorageEvent = storageIdToUse;
          association.store(storageOrId, markerToUse); // Pass original storageOrId
          deep.Deep.__isStorageEvent = undefined;
        }
      }
    }
  }

  const idsToDeleteFromLocal: string[] = [];
  for (const localId of Array.from(deep._ids as Set<string>)) {
    if (!fetchedLinkIds.has(localId)) {
      const association = new deep(localId);
      // Pass original storageOrId
      if (!association._protected && association.isStored(storageOrId)) {
        idsToDeleteFromLocal.push(localId);
      }
    }
  }
  if (idsToDeleteFromLocal.length > 0) {
    debug('🗑️ Deleting %d local associations for storage %s (not in dump).', idsToDeleteFromLocal.length, storageIdToUse);
    for (const idToDelete of idsToDeleteFromLocal) {
      if (deep._ids.has(idToDelete)) {
        deep.Deep.__isStorageEvent = storageIdToUse;
        _applyDelta(deep, { operation: 'delete', id: idToDelete }, storageOrId, true); // Pass original storageOrId
        deep.Deep.__isStorageEvent = undefined;
      }
    }
  }

  debug('✅ Subscription dump successfully applied to storage %s.', storageIdToUse);
}

/**
 * Mark existing deep hierarchy for storage synchronization
 * @param deep - Deep instance
 * @param storageOrId - Storage instance or ID
 */
export function defaultMarking(deep: any, storageOrId: any): void {
  // Pass original storageOrId; 'store' method will be ID-aware
  deep.store(storageOrId, deep.storageMarkers.oneTrue);
  const existingIds = Array.from(deep._ids);
  const StorageId = deep.Storage._id;
  for (const id of existingIds) {
    if (id === deep._id) continue;
    const association = new deep(id);
    if (association._type === deep._id) {
      association.store(storageOrId, deep.storageMarkers.oneTrue);
      // if (id === StorageId) {
      //   // storages not need syns by default
      // } else {
      //   // all others need to sync by default
      //   association.store(storageOrId, deep.storageMarkers.typedTrue);
      // }
    }
  }
}

/**
 * Watch context association fluctuation
 * @param deep - Deep instance
 * @param storageOrId - Storage instance or ID
 */
export function defaultMarkingWatch(deep: any, storageOrId: any): () => void {
  deep.on(deep.events.globalContextAdded._id, (payload: any) => {
    // Pass original storageOrId to isStored and store, as they will be ID-aware
    if (payload.from.isStored(storageOrId)) {
      payload.to.store(storageOrId, deep.storageMarkers.typedTrue);
    }
  });
  deep.on(deep.events.globalContextRemoved._id, (payload: any) => {
    // Pass original storageOrId to isStored and unstore
    if (payload.from.isStored(storageOrId)) {
      payload.to.unstore(storageOrId);
    }
  });
  return () => { };
}

/**
 * Retrieves all storages where a given link is currently stored.
 * @param deep - The Deep instance.
 * @param link - The Deep link instance to check.
 * @returns A Set of storage IDs where the link is stored.
 */
export function _getAllStorages(deep: any, link: any): Set<string> {
  if (!(link instanceof deep.Deep)) {
    // Or handle differently, e.g., by trying to create new deep(link) if it's an ID string
    throw new Error('_getAllStorages expects link to be a Deep instance.');
  }
  const storedIn = new Set<string>();
  // Get all potential storage IDs. deep.Storage might not exist if storages haven't been initialized for some reason.
  const allPossibleStorageIds = deep.Storage ? deep._Type.many(deep.Storage._id) : new Set<string>();

  for (const storageId of allPossibleStorageIds) {
    if (deep._ids.has(storageId)) { // Ensure the storageId is a valid, existing ID
      if (link.isStored(storageId)) { // isStored now accepts string IDs
        storedIn.add(storageId);
      }
    }
  }
  return storedIn;
}

export function _searchLostElements(deep1, deep2) {
  // Manual search lost elements
  const lostTypesNamed: any = {};
  const lostTypesIds: any = {};
  for (const id of deep1._ids) {
    const d = new deep1(id);
    if (!deep2._ids.has(d._id)) {
      if (d.type) lostTypesNamed[d.type.name] = (lostTypesNamed[d.type.name] || 0) + 1;
      else lostTypesIds[d._id] = (lostTypesIds[d._id] || 0) + 1;
    }
  }
  return { lostTypesNamed, lostTypesIds };
}
export function _newStorage({
  deep, onStoreConstructed, onLinkInsert, onLinkUpsert, onSubscription, _initialSync = true,
}: {
  deep: any;
  onStoreConstructed?: (storage: any, options: any) => void;
  onLinkInsert?: (storage: any, storageLink: StorageLink) => void;
  onLinkUpsert?: (storage: any, storageLink: StorageLink) => void;
  onSubscription?: (storage: any, apply: (dump: StorageDump) => void) => void;
  _initialSync?: boolean;
}) {
  const Storage = new deep.Function(function Storage(this: any, options: {
    dump?: StorageDump;
    storage?: any; // Allow passing existing storage
    hasyx: Hasyx;
  }) {
    const storage = options.storage || new deep.Storage();
    const ContextId = deep._context.Context._id;
    if (!ContextId) throw new Error('Storage: Context not found');

    debug('Storage constructed with id %s, options: %o', storage._id, { hasyx: !!options.hasyx, dump: !!options.dump });
    storage.state.hasyx = options.hasyx;
    storage.state.dump = options.dump;

    if (onStoreConstructed) { // This is the callback passed to _newStorage
      debug('onStoreConstructed');
      onStoreConstructed && onStoreConstructed(storage, options);

      storage.state.onDestroy = () => {
        storage?.state?._unsubscribe();
      };
      if (typeof storage.state.watch === 'function') {
        storage.state.watch();
      }

      storage.state._initialSync = _initialSync;
      storage.state.linkInsert = async (storageLink: StorageLink) => {
        debug('linkInsert', storageLink._id);
        onLinkInsert && await onLinkInsert(storage, storageLink);
      };
      storage.state.linkUpsert = async (storageLink: StorageLink) => {
        debug('linkUpsert', storageLink._id);
        onLinkUpsert && await onLinkUpsert(storage, storageLink);
      };
      storage.state.onLinkInsert = (storageLink: StorageLink) => {
        if (storage.state._initialSync) {
          debug('onLinkInsert initialSync', storageLink._id);
          return;
        }
        debug('onLinkInsert promise', storageLink._id);
        storage.promise = storage.promise.then(async () => {
          debug('onLinkInsert resolve', storageLink._id);
          await storage.state.linkInsert(storageLink);
        });
      };

      storage.state.onLinkDelete = (storageLink: StorageLink) => {
        if (storage.state._initialSync) {
          debug('onLinkDelete initialSync', storageLink._id);
          return;
        }
        debug('onLinkDelete promise', storageLink._id);
        storage.promise = storage.promise.then(() => {
          debug('onLinkDelete resolve', storageLink._id);
        });
      };

      storage.state.onLinkUpdate = (storageLink: StorageLink) => {
        if (storage.state._initialSync) {
          debug('onLinkDelete initialSync', storageLink._id);
          return;
        }
        debug('onLinkUpdate promise', storageLink._id);
        storage.promise = storage.promise.then(async () => {
          await storage.state.linkUpsert(storageLink);
          debug('onLinkUpdate resolve', storageLink._id);
        });
      };

      storage.state.onDataChanged = (storageLink: StorageLink) => {
        debug('onDataChanged promise', storageLink._id);
        storage.promise = storage.promise.then(() => {
          debug('onDataChanged resolve', storageLink._id);
        });
      };

      defaultMarking(deep, storage); // auto enable default marking
      const stopMarkingWatch = defaultMarkingWatch(deep, storage); // watch context association fluctuation

      let stopSubscription;
      const initializeActions = () => {
        storage.state._initialSync = false;
        if (onSubscription) {
          stopSubscription = onSubscription && onSubscription(storage, storage.state.apply);
        }
      };

      storage.state.onDestroy = () => {
        stopMarkingWatch();
        stopSubscription && stopSubscription();
      };

      if (storage.state.dump) {
        initializeActions();
      }
      else storage.promise = storage.promise.then(async () => {
        // Use new function _generateProtectedDump
        const dump = storage.state.dump = _generateProtectedDump(deep);
        for (const link of dump.links) { // Now dump.links sorted by client _i
          await storage.state.linkInsert(link);
        }
        initializeActions();
      });
    }

    return storage;
  });

  return Storage;
}
 