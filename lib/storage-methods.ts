// High-level storage methods for Deep Framework associations
// Provides store, storages, and isStored methods

/**
 * Creates storage management methods for associations
 * @param deep The Deep factory instance
 */
export function newStorageMethods(deep: any) {
  // store method - sets a storage marker for this association
  deep._context.store = new deep.Method(function(this: any, storage: any, marker?: any) {
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
    } else {
      // Default to oneTrue marker if no marker provided
      markerId = deep.storageMarkers.oneTrue._id;
    }
    
    // Set the storage marker
    deep._setStorageMarker(associationId, storageId, markerId);
    
    return new deep(associationId)._proxify; // Return the source association for chaining
  });
  
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
      // Check if any markers exist for this storage
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      return markers.size > 0;
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
    } else {
      // Remove all markers for this storage
      const markers = deep._getStorageMarkers(associationId, storageId) as Set<string>;
      for (const marker of Array.from(markers)) {
        deep._deleteStorageMarker(associationId, storageId, marker);
      }
    }
    
    return new deep(associationId)._proxify; // Return the source association for chaining
  });
} 