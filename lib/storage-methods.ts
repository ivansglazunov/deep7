// High-level storage methods for Deep Framework associations
// Provides store, storages, and isStored methods

/**
 * Creates storage management methods for associations
 * @param deep The Deep factory instance
 */
export function newStorageMethods(deep: any) {
  // store method - sets a storage marker for this association
  const storeMethod = new deep.Method(function(this: any, storage: any, marker?: any) {
    const associationId = this._source;
    console.log('store() called with associationId:', associationId, 'storage:', storage, 'marker:', marker);
    
    let storageId: string;
    let markerId: string;
    
    // Handle storage parameter
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
    } else if (typeof storage === 'string') {
      storageId = storage;
    } else {
      throw new Error('Storage must be a Deep instance or string ID');
    }
    console.log('Resolved storageId:', storageId);
    
    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
      } else if (typeof marker === 'string') {
        markerId = marker;
      } else {
        throw new Error('Marker must be a Deep instance or string ID');
      }
    } else {
      // Default to oneTrue marker if no marker provided
      markerId = deep.storageMarkers.oneTrue._id;
    }
    console.log('Resolved markerId:', markerId);
    
    // Set the storage marker
    console.log('Calling deep._setStorageMarker with:', { associationId, storageId, markerId });
    deep._setStorageMarker(associationId, storageId, markerId);
    console.log('deep._setStorageMarker completed');
    
    // Verify marker was set
    const markers = deep._getStorageMarkers(associationId, storageId);
    console.log('Verification - markers after _setStorageMarker:', markers);
    
    // Emit storage event for listeners on the global deep instance
    const payload = {
      _source: associationId,
      _reason: deep.events.storeAdded._id,
      storageId: storageId,
      markerId: markerId
    };
    console.log('Emitting storeAdded event with payload:', payload);
    deep._emit(deep.events.storeAdded._id, payload);
    
    return this; // Return the same instance for chaining, not a new one
  });
  
  deep._context.store = storeMethod;
  
  // storages method - gets all storages for this association
  deep._context.storages = new deep.Method(function(this: any, storage?: any) {
    const associationId = this._source;
    
    if (storage) {
      // Get markers for specific storage
      let storageId: string;
      if (storage instanceof deep.Deep) {
        storageId = storage._id;
      } else if (typeof storage === 'string') {
        storageId = storage;
      } else {
        throw new Error('Storage must be a Deep instance or string ID');
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
    
    // Handle storage parameter
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
    } else if (typeof storage === 'string') {
      storageId = storage;
    } else {
      throw new Error('Storage must be a Deep instance or string ID');
    }
    
    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
      } else if (typeof marker === 'string') {
        markerId = marker;
      } else {
        throw new Error('Marker must be a Deep instance or string ID');
      }
      
      // Check for specific marker
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      return markers.has(markerId);
    } else {
      // Check if any markers exist for this storage on this association
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      
      if (markers.size > 0) {
        return true;
      }
      
      // Also check type hierarchy for storage inheritance
      const association = new deep(associationId);
      const typeChain = association.typeofs || [];
      
      for (const typeId of typeChain) {
        const typeMarkers = deep._getStorageMarkers(typeId, storageId) as Set<string>;
        if (typeMarkers.size > 0) {
          return true;
        }
      }
      
      return false;
    }
  });
  
  // unstore method - removes a storage marker
  deep._context.unstore = new deep.Method(function(this: any, storage: any, marker?: any) {
    const associationId = this._source;
    let storageId: string;
    let markerId: string;
    
    // Handle storage parameter
    if (storage instanceof deep.Deep) {
      storageId = storage._id;
    } else if (typeof storage === 'string') {
      storageId = storage;
    } else {
      throw new Error('Storage must be a Deep instance or string ID');
    }
    
    // Handle marker parameter
    if (marker) {
      if (marker instanceof deep.Deep) {
        markerId = marker._id;
      } else if (typeof marker === 'string') {
        markerId = marker;
      } else {
        throw new Error('Marker must be a Deep instance or string ID');
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
    
    return this; // Return the same instance for chaining, not a new one
  });
} 