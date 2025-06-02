// Storage system for Deep Framework
// Provides storage markers, types, and methods for synchronization with long-term memory

import Debug from './debug';

const debug = Debug('storages');

/**
 * Creates the storage system with markers, types, and methods
 * @param deep The Deep factory instance
 */
export function newStorages(deep: any) {
  // Create Storage type
  const Storage = new deep();
  deep._context.Storage = Storage;

  // Create storage markers
  const StorageMarker = new deep();
  deep._context.StorageMarker = StorageMarker;

  const storageMarkers = new deep();
  deep._context.storageMarkers = storageMarkers;

  // Define marker types
  storageMarkers._context.oneTrue = new StorageMarker();
  storageMarkers._context.oneFalse = new StorageMarker();
  storageMarkers._context.typedTrue = new StorageMarker();
  storageMarkers._context.typedFalse = new StorageMarker();

  // === STORAGE METHODS ===

  // store method - sets a storage marker for this association
  const storeMethod = new deep.Method(function (this: any, storage: any, marker: any) {
    const associationId = this._source;

    debug('🏷️ store() called for association %s', associationId);

    let storageId: string;
    let markerId: string;

    // Handle storage parameter - ONLY Deep instances allowed
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
      debug('✅ Storage ID: %s', storageId);
    } else {
      throw new Error('Storage must be a Deep instance (not string)');
    }

    // Handle marker parameter - NOW REQUIRED
    if (!marker) {
      throw new Error('Marker parameter is required. Use deep.storageMarkers.oneTrue, deep.storageMarkers.typedTrue, or custom marker.');
    }

    if (marker instanceof deep.Deep) {
      markerId = marker._id;
      debug('✅ Marker ID: %s', markerId);
    } else {
      throw new Error('Marker must be a Deep instance (not string)');
    }

    // VALIDATION: Check that all dependencies are also stored
    const association = new deep(associationId);
    const dependencies = [association._type, association._from, association._to, association._value]
      .filter(depId => depId && typeof depId === 'string' && deep._ids.has(depId));

    for (const depId of dependencies) {
      // Skip validation for _type = deep._id (normal case for plain associations)
      if (association._type === depId && depId === deep._id) {
        continue;
      }

      const dependency = new deep(depId);
      if (!dependency.isStored(storage)) {
        const fieldName = association._type === depId ? '_type' :
          association._from === depId ? '_from' :
            association._to === depId ? '_to' : '_value';
        throw new Error(`Cannot store association ${associationId}: dependency ${fieldName} (${depId}) is not stored in the same storage`);
      }
    }

    // Set the storage marker
    debug('📝 Setting storage marker for %s -> %s:%s', associationId, storageId, markerId);
    deep._setStorageMarker(associationId, storageId, markerId);

    // Emit storage event for listeners on the global deep instance
    // const payload = {
    //   _source: associationId,
    //   _reason: deep.events.storeAdded._id,
    //   storageId: storageId,
    //   markerId: markerId
    // };
    const payload = association;
    payload._source = storageId;
    payload._reason = deep.events.storeAdded._id;
    debug('📡 Emitting storeAdded event: %o', payload);
    deep._emit(deep.events.storeAdded._id, payload);

    debug('✅ store() completed for association %s', associationId);
    return this; // Return the same instance for chaining
  });

  deep._context.store = storeMethod;

  // Convenience method - store with default storage
  deep._context.stored = new deep.Method(function (this: any, marker?: any) {
    return storeMethod.call(this, deep.storage, marker);
  });

  // storages method - gets all storages for this association
  deep._context.storages = new deep.Method(function (this: any, storage?: any) {
    const associationId = this._source;

    if (storage) {
      // Get markers for specific storage - ONLY Deep instances allowed
      let storageId: string;
      if (storage instanceof deep.Deep) {
        storageId = storage._id;
      } else {
        throw new Error('Storage must be a Deep instance (not string)');
      }

      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      return Array.from(markers).map(markerId => new deep(markerId));
    } else {
      // Get all storages and their markers
      const allStorages = deep._getStorageMarkers(associationId) as Map<string, Set<string>>;
      const result: { [storageId: string]: any[] } = {};

      for (const [storageId, markers] of allStorages) {
        result[storageId] = Array.from(markers).map(markerId => new deep(markerId));
      }

      return result;
    }
  });

  // isStored method - checks if association is stored with given marker
  deep._context.isStored = new deep.Method(function (this: any, storage: any, marker?: any) {
    const associationId = this._source;
    let storageId: string;
    let markerId: string;

    // Handle storage parameter - ONLY Deep instances allowed
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
    } else {
      throw new Error('Storage must be a Deep instance (not string)');
    }

    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
      } else {
        throw new Error('Marker must be a Deep instance (not string)');
      }

      // When checking for a specific marker, only check direct markers (no inheritance)
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      return markers.has(markerId);
    } else {
      // Check if any markers exist for this storage on this association
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;

      if (markers.size > 0) {
        return true;
      }

      // Check type hierarchy for storage inheritance (only when no specific marker requested)
      const association = new deep(associationId);
      const typeChain = association.typeofs || [];

      for (const typeId of typeChain) {
        const typeMarkers = deep._getStorageMarkers(typeId, storageId) as Set<string>;

        // Only inherit typedTrue markers, not oneTrue markers
        for (const markerId of typeMarkers) {
          if (markerId === deep.storageMarkers.typedTrue._id) {
            // typedTrue marker means all instances of this type should be stored
            return true;
          }
          // oneTrue and other markers are NOT inherited
        }
      }

      return false;
    }
  });

  // Convenience method - check if stored in default storage
  deep._context.isStoredDefault = new deep.Method(function (this: any, marker?: any) {
    const isStoredMethod = deep._context.isStored;
    return isStoredMethod.call(this, deep.storage, marker);
  });

  // unstore method - removes a storage marker
  deep._context.unstore = new deep.Method(function (this: any, storage: any, marker?: any) {
    const associationId = this._source;
    let storageId: string;
    let markerId: string;

    // Handle storage parameter - ONLY Deep instances allowed
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
    } else {
      throw new Error('Storage must be a Deep instance (not string)');
    }

    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
      } else {
        throw new Error('Marker must be a Deep instance (not string)');
      }

      // Remove specific marker
      deep._deleteStorageMarker(associationId, storageId, markerId);

      // BIIIIIIG MIIIISTAKEEEEEEEEE
      // Emit storage removed event for specific marker
      // const payload = {
      //   _source: associationId,
      //   _reason: deep.events.storeRemoved._id,
      //   storageId: storageId,
      //   markerId: markerId
      // };
      const payload = new deep(associationId);
      payload._source = storage._id;
      payload._reason = deep.events.storeRemoved._id;
      deep._emit(deep.events.storeRemoved._id, payload);
    } else {
      // Remove all markers for this storage
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      for (const marker of Array.from(markers)) {
        deep._deleteStorageMarker(associationId, storageId, marker);

        // BIIIIIIG MIIIISTAKEEEEEEEEE
        // // Emit storage removed event for each marker
        // const payload = {
        //   _source: associationId,
        //   _reason: deep.events.storeRemoved._id,
        //   storageId: storageId,
        //   markerId: marker
        // };
        const payload = new deep(associationId);
        payload._source = storage._id;
        payload._reason = deep.events.storeRemoved._id;
        deep._emit(deep.events.storeRemoved._id, payload);
      }
    }

    return this; // Return the same instance for chaining
  });

  return { Storage, StorageMarker, storageMarkers };
} 