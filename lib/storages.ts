// Storage system for Deep Framework
// Provides storage markers, types, and methods for synchronization with long-term memory

import Debug from './debug';

const debug = Debug('storages');

/**
 * Creates the storage system with markers, types, and methods
 * @param deep The Deep factory instance
 */
export function newStorages(deep: any) {
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
  deep._context.store = new deep.Method(function (this: any, storageOrId: any, markerOrId: any) {
    const associationId = this._source;

    debug('🏷️ store() called for association %s', associationId);

    let storageId: string;
    let markerId: string;

    // Handle storage parameter
    if (typeof storageOrId === 'string') {
      if (!deep._ids.has(storageOrId)) {
        throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids.`);
      }
      storageId = storageOrId;
      debug('✅ Storage ID from string: %s', storageId);
    } else if (storageOrId instanceof deep.Deep) {
      storageId = storageOrId._id;
      debug('✅ Storage ID from instance: %s', storageId);
    } else {
      throw new Error('Storage must be a Deep instance or a valid string ID.');
    }

    // Handle marker parameter - NOW REQUIRED
    if (!markerOrId) {
      throw new Error('Marker parameter is required. Use deep.storageMarkers.oneTrue, deep.storageMarkers.typedTrue, or custom marker.');
    }

    if (typeof markerOrId === 'string') {
      if (!deep._ids.has(markerOrId)) {
        throw new Error(`Invalid marker ID: ${markerOrId} not found in deep._ids.`);
      }
      markerId = markerOrId;
      debug('✅ Marker ID from string: %s', markerId);
    } else if (markerOrId instanceof deep.Deep) {
      markerId = markerOrId._id;
      debug('✅ Marker ID from instance: %s', markerId);
    } else {
      throw new Error('Marker must be a Deep instance or a valid string ID.');
    }

    // VALIDATION: Check that all dependencies are also stored
    const association = new deep(associationId);
    // Pass original storageOrId and markerOrId to isStored as it will be ID-aware
    if (association.isStored(storageOrId, markerOrId)) return; 
    const dependencies = [association._type, association._from, association._to, association._value]
      .filter(depId => depId && typeof depId === 'string' && deep._ids.has(depId));

    // Set the storage marker using resolved string IDs
    debug('📝 Setting storage marker for %s -> %s:%s', associationId, storageId, markerId);
    deep._setStorageMarker(associationId, storageId, markerId);

    const payload = association;
    payload._source = storageId; // Source of the event is the storage
    payload._reason = deep.events.storeAdded._id;
    // Add marker information to payload if needed, for example:
    // payload.markerId = markerId; // Or pass the marker instance if preferred by event consumers
    debug('📡 Emitting storeAdded event for association %s regarding storage %s, marker %s', associationId, storageId, markerId);
    deep._emit(deep.events.storeAdded._id, payload);

    debug('✅ store() completed for association %s', associationId);
    return this; // Return the same instance for chaining
  });

  // storages method - gets all storages for this association
  deep._context.storages = new deep.Method(function (this: any, storageOrId?: any) {
    const associationId = this._source;
    let storageIdToQuery: string | undefined = undefined;

    if (storageOrId) {
      // Handle storage parameter
      if (typeof storageOrId === 'string') {
        if (!deep._ids.has(storageOrId)) {
          throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids.`);
        }
        storageIdToQuery = storageOrId;
      } else if (storageOrId instanceof deep.Deep) {
        storageIdToQuery = storageOrId._id;
      } else {
        throw new Error('Storage must be a Deep instance or a valid string ID.');
      }

      const markers = deep._getStorageMarkers(associationId, storageIdToQuery) as Set<string>;
      return Array.from(markers).map(markerId => new deep(markerId));
    } else {
      // Get all storages and their markers
      const allStorages = deep._getStorageMarkers(associationId) as Map<string, Set<string>>;
      const result: { [storageId: string]: any[] } = {};

      for (const [sId, markers] of allStorages) {
        result[sId] = Array.from(markers).map(markerId => new deep(markerId));
      }
      return result;
    }
  });

  // isStored method - checks if association is stored with given marker
  deep._context.isStored = new deep.Method(function (this: any, storageOrId: any, markerOrId?: any) {
    const associationId = this._source;
    let storageId: string;
    let markerId: string | undefined;

    // Handle storage parameter
    if (typeof storageOrId === 'string') {
      if (!deep._ids.has(storageOrId)) {
        throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids for isStored.`);
      }
      storageId = storageOrId;
    } else if (storageOrId instanceof deep.Deep) {
      storageId = storageOrId._id;
    } else {
      throw new Error('Storage must be a Deep instance or a valid string ID for isStored.');
    }

    if (markerOrId) {
      if (typeof markerOrId === 'string') {
        if (!deep._ids.has(markerOrId)) {
          throw new Error(`Invalid marker ID: ${markerOrId} not found in deep._ids for isStored.`);
        }
        markerId = markerOrId;
      } else if (markerOrId instanceof deep.Deep) {
        markerId = markerOrId._id;
      } else {
        throw new Error(`Marker must be a Deep instance or a valid string ID for isStored but ${typeof markerOrId} was provided.`);
      }
    }

    if (markerId) {
      // When checking for a specific marker, only check direct markers (no inheritance)
      // At this point, resolvedMarkerId is guaranteed to be a string if no error was thrown.
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
      const typeChain = association.typeofs || []; // typeofs should provide the chain of type IDs

      for (const typeId of typeChain) {
        if (!deep._ids.has(typeId)) continue; // Skip if typeId somehow isn't a valid ID
        // const typeInstance = new deep(typeId); // Not needed for this check

        // Get markers directly for the typeId in the given storageId
        const typeMarkers = deep._getStorageMarkers(typeId, storageId) as Set<string>;
        if (typeMarkers.has(deep.storageMarkers.typedTrue._id)) {
          return true; // typedTrue on a type in the chain means this instance is stored.
        }
      }
      return false;
    }
  });

  // unstore method - removes a storage marker
  deep._context.unstore = new deep.Method(function (this: any, storageOrId: any, markerOrId?: any) {
    const associationId = this._source;
    let storageId: string;

    // Handle storage parameter
    if (typeof storageOrId === 'string') {
      if (!deep._ids.has(storageOrId)) {
        throw new Error(`Invalid storage ID: ${storageOrId} not found in deep._ids.`);
      }
      storageId = storageOrId;
    } else if (storageOrId instanceof deep.Deep) {
      storageId = storageOrId._id;
    } else {
      throw new Error('Storage must be a Deep instance or a valid string ID.');
    }

    // Handle marker parameter
    if (markerOrId) {
      let resolvedMarkerId: string | undefined;
      if (typeof markerOrId === 'string') {
        if (!deep._ids.has(markerOrId)) {
          throw new Error(`Invalid marker ID: ${markerOrId} not found in deep._ids.`);
        }
        resolvedMarkerId = markerOrId;
      } else if (markerOrId instanceof deep.Deep) {
        resolvedMarkerId = markerOrId._id;
      } else {
        throw new Error('Marker must be a Deep instance or a valid string ID.');
      }

      if (resolvedMarkerId) {
        debug('🗑️ unstore() specific marker for association %s, storage %s, marker %s', associationId, storageId, resolvedMarkerId);
        deep._deleteStorageMarker(associationId, storageId, resolvedMarkerId); // Now resolvedMarkerId is definitely a string here
      } else {
        // This case should ideally not be reached if markerOrId was provided and valid according to above checks
        debug('⚠️ unstore() called with markerOrId but resolvedMarkerId was not defined. Association: %s, Storage: %s', associationId, storageId);
      }
    } else {
      // If no marker is specified, remove all markers for this association in this storage
      debug('🗑️ unstore() all markers for association %s, storage %s', associationId, storageId);
      const markersForStorage = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      for (const mId of markersForStorage) {
        deep._deleteStorageMarker(associationId, storageId, mId);
      }
    }

    // Emit storage event
    const payload = new deep(associationId); // Event is about the association
    payload._source = storageId; // Source of the event is the storage
        payload._reason = deep.events.storeRemoved._id;

    debug('📡 Emitting storeRemoved event for association %s regarding storage %s', associationId, storageId);
        deep._emit(deep.events.storeRemoved._id, payload);

    debug('✅ unstore() completed for association %s', associationId);
    return this; // Return the same instance for chaining
  });
}/**
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
  // Get all potential storage IDs. deep.Package.Storage might not exist if storages haven't been initialized for some reason.
  const allPossibleStorageIds = deep?.Package?.Storage ? deep._Type.many(deep.Package.Storage._id) : new Set<string>();

  for (const storageId of allPossibleStorageIds) {
    if (deep._ids.has(storageId)) { // Ensure the storageId is a valid, existing ID
      if (link.isStored(storageId)) { // isStored now accepts string IDs
        storedIn.add(storageId);
      }
    }
  }
  return storedIn;
}
 