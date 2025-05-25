// Storage system for Deep Framework
// Provides storage markers, types, and methods for synchronization with long-term memory

import Debug from './debug';
const debugStorage = Debug('deep7:storage:markers');

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
  const storeMethod = new deep.Method(function(this: any, storage: any, marker?: any) {
    const associationId = this._source;
    
    debugStorage('🏷️ store() called for association %s', associationId);
    
    let storageId: string;
    let markerId: string;
    
    // Handle storage parameter - ONLY Deep instances allowed
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
      debugStorage('✅ Storage ID: %s', storageId);
    } else {
      throw new Error('Storage must be a Deep instance (not string)');
    }
    
    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
        debugStorage('✅ Marker ID: %s', markerId);
      } else {
        throw new Error('Marker must be a Deep instance (not string)');
      }
    } else {
      // Default to oneTrue marker if no marker provided
      markerId = deep.storageMarkers.oneTrue._id;
      debugStorage('✅ Using default oneTrue marker: %s', markerId);
    }
    
    // Set the storage marker
    debugStorage('📝 Setting storage marker for %s -> %s:%s', associationId, storageId, markerId);
    deep._setStorageMarker(associationId, storageId, markerId);
    
    // Emit storage event for listeners on the global deep instance
    const payload = {
      _source: associationId,
      _reason: deep.events.storeAdded._id,
      storageId: storageId,
      markerId: markerId
    };
    debugStorage('📡 Emitting storeAdded event: %o', payload);
    deep._emit(deep.events.storeAdded._id, payload);
    
    debugStorage('✅ store() completed for association %s', associationId);
    return this; // Return the same instance for chaining
  });
  
  deep._context.store = storeMethod;
  
  // Convenience method - store with default storage
  deep._context.stored = new deep.Method(function(this: any, marker?: any) {
    return storeMethod.call(this, deep.storage, marker);
  });
  
  // storages method - gets all storages for this association
  deep._context.storages = new deep.Method(function(this: any, storage?: any) {
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
  deep._context.isStored = new deep.Method(function(this: any, storage: any, marker?: any) {
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
      
      // Check for specific marker
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      if (markers.has(markerId)) {
        return true;
      }
      
      // Check type hierarchy for specific marker
      const association = new deep(associationId);
      const typeChain = association.typeofs || [];
      
      for (const typeId of typeChain) {
        const typeMarkers = deep._getStorageMarkers(typeId, storageId) as Set<string>;
        if (typeMarkers.has(markerId)) {
          return true;
        }
      }
      
      return false;
    } else {
      // Check if any markers exist for this storage on this association
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      
      if (markers.size > 0) {
        return true;
      }
      
      // Check type hierarchy for storage inheritance
      const association = new deep(associationId);
      const typeChain = association.typeofs || [];
      
      for (const typeId of typeChain) {
        const typeMarkers = deep._getStorageMarkers(typeId, storageId) as Set<string>;
        if (typeMarkers.size > 0) {
          // Check if type has typedTrue marker - if so, instances should be stored
          if (typeMarkers.has(deep.storageMarkers.typedTrue._id)) {
            return true;
          }
          // Check if type has any other markers
          if (typeMarkers.has(deep.storageMarkers.oneTrue._id)) {
            return true;
          }
        }
      }
      
      return false;
    }
  });
  
  // Convenience method - check if stored in default storage
  deep._context.isStoredDefault = new deep.Method(function(this: any, marker?: any) {
    const isStoredMethod = deep._context.isStored;
    return isStoredMethod.call(this, deep.storage, marker);
  });
  
  // unstore method - removes a storage marker
  deep._context.unstore = new deep.Method(function(this: any, storage: any, marker?: any) {
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
      
      // Emit storage removed event for specific marker
      const payload = {
        _source: associationId,
        _reason: deep.events.storeRemoved._id,
        storageId: storageId,
        markerId: markerId
      };
      deep._emit(deep.events.storeRemoved._id, payload);
    } else {
      // Remove all markers for this storage
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      for (const marker of Array.from(markers)) {
        deep._deleteStorageMarker(associationId, storageId, marker);
        
        // Emit storage removed event for each marker
        const payload = {
          _source: associationId,
          _reason: deep.events.storeRemoved._id,
          storageId: storageId,
          markerId: marker
        };
        deep._emit(deep.events.storeRemoved._id, payload);
      }
    }
    
    return this; // Return the same instance for chaining
  });
  
  return { Storage, StorageMarker, storageMarkers };
} 