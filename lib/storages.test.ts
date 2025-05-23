import { newDeep } from '.';

describe('Phase 3: Storage System Core', () => {
  describe('Storage Types and Markers', () => {
    it('should create storage types and markers', () => {
      const deep = newDeep();
      
      // Check that storage system was initialized
      expect(deep.Storage).toBeDefined();
      expect(deep.StorageMarker).toBeDefined();
      expect(deep.storageMarkers).toBeDefined();
      
      // Check that marker types exist
      expect(deep.storageMarkers.oneTrue).toBeDefined();
      expect(deep.storageMarkers.oneFalse).toBeDefined();
      expect(deep.storageMarkers.typedTrue).toBeDefined();
      expect(deep.storageMarkers.typedFalse).toBeDefined();
      
      // Check types
      expect(deep.storageMarkers.oneTrue.type.is(deep.StorageMarker)).toBe(true);
      expect(deep.storageMarkers.oneFalse.type.is(deep.StorageMarker)).toBe(true);
    });
    
    it('should create custom storage markers', () => {
      const deep = newDeep();
      
      const customMarker = new deep.StorageMarker();
      expect(customMarker.type.is(deep.StorageMarker)).toBe(true);
      expect(customMarker._id).toBeTruthy();
    });
  });

  describe('Low-level Storage Catalog', () => {
    it('should set and get storage markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Set a storage marker
      deep._setStorageMarker(association._id, storage._id, marker._id);
      
      // Check it was set
      const markers = deep._getStorageMarkers(association._id, storage._id) as Set<string>;
      expect(markers.has(marker._id)).toBe(true);
      
      // Check all storages for association
      const allStorages = deep._getStorageMarkers(association._id) as Map<string, Set<string>>;
      expect(allStorages.has(storage._id)).toBe(true);
      expect(allStorages.get(storage._id)?.has(marker._id)).toBe(true);
    });
    
    it('should delete storage markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Set and then delete
      deep._setStorageMarker(association._id, storage._id, marker._id);
      deep._deleteStorageMarker(association._id, storage._id, marker._id);
      
      // Check it was deleted
      const markers = deep._getStorageMarkers(association._id, storage._id) as Set<string>;
      expect(markers.has(marker._id)).toBe(false);
    });
    
    it('should handle multiple markers per storage', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker1 = new deep.StorageMarker();
      const marker2 = new deep.StorageMarker();
      const association = new deep();
      
      // Set multiple markers
      deep._setStorageMarker(association._id, storage._id, marker1._id);
      deep._setStorageMarker(association._id, storage._id, marker2._id);
      
      // Check both exist
      const markers = deep._getStorageMarkers(association._id, storage._id) as Set<string>;
      expect(markers.has(marker1._id)).toBe(true);
      expect(markers.has(marker2._id)).toBe(true);
      expect(markers.size).toBe(2);
    });
    
    it('should clean up empty storage containers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Set and delete marker
      deep._setStorageMarker(association._id, storage._id, marker._id);
      deep._deleteStorageMarker(association._id, storage._id, marker._id);
      
      // Check storage container was cleaned up
      const allStorages = deep._getStorageMarkers(association._id) as Map<string, Set<string>>;
      expect(allStorages.has(storage._id)).toBe(false);
      expect(allStorages.size).toBe(0);
    });
  });

  describe('Association Storage Methods', () => {
    it('should store associations with default marker', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      // Store with default marker
      association.store(storage);
      
      // Check it was stored
      expect(association.isStored(storage)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
    });
    
    it('should store associations with custom marker', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const customMarker = new deep.StorageMarker();
      const association = new deep();
      
      // Store with custom marker
      association.store(storage, customMarker);
      
      // Check it was stored
      expect(association.isStored(storage)).toBe(true);
      expect(association.isStored(storage, customMarker)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
    });
    
    it('should return storage markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker1 = new deep.StorageMarker();
      const marker2 = new deep.StorageMarker();
      const association = new deep();
      
      // Store with multiple markers
      association.store(storage, marker1);
      association.store(storage, marker2);
      
      // Get markers for specific storage
      const markers = association.storages(storage);
      expect(Array.isArray(markers)).toBe(true);
      expect(markers.length).toBe(2);
      expect(markers.some(m => m._id === marker1._id)).toBe(true);
      expect(markers.some(m => m._id === marker2._id)).toBe(true);
    });
    
    it('should return all storages', () => {
      const deep = newDeep();
      const storage1 = new deep.Storage();
      const storage2 = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Store in multiple storages
      association.store(storage1, marker);
      association.store(storage2, marker);
      
      // Get all storages
      const allStorages = association.storages();
      expect(typeof allStorages).toBe('object');
      expect(allStorages[storage1._id]).toBeDefined();
      expect(allStorages[storage2._id]).toBeDefined();
      expect(allStorages[storage1._id].length).toBe(1);
      expect(allStorages[storage2._id].length).toBe(1);
    });
    
    it('should unstore associations', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker1 = new deep.StorageMarker();
      const marker2 = new deep.StorageMarker();
      const association = new deep();
      
      // Store with multiple markers
      association.store(storage, marker1);
      association.store(storage, marker2);
      
      // Unstore specific marker
      association.unstore(storage, marker1);
      
      // Check only marker1 was removed
      expect(association.isStored(storage, marker1)).toBe(false);
      expect(association.isStored(storage, marker2)).toBe(true);
      expect(association.isStored(storage)).toBe(true); // Still has marker2
    });
    
    it('should unstore all markers for storage', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker1 = new deep.StorageMarker();
      const marker2 = new deep.StorageMarker();
      const association = new deep();
      
      // Store with multiple markers
      association.store(storage, marker1);
      association.store(storage, marker2);
      
      // Unstore all markers
      association.unstore(storage);
      
      // Check all markers were removed
      expect(association.isStored(storage, marker1)).toBe(false);
      expect(association.isStored(storage, marker2)).toBe(false);
      expect(association.isStored(storage)).toBe(false);
    });
  });

  describe('Storage with string IDs', () => {
    it('should work with string storage IDs', () => {
      const deep = newDeep();
      const storageId = 'my-storage-id';
      const markerId = 'my-marker-id';
      const association = new deep();
      
      // Store with string IDs
      association.store(storageId, markerId);
      
      // Check it was stored
      expect(association.isStored(storageId, markerId)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid storage parameter', () => {
      const deep = newDeep();
      const association = new deep();
      
      expect(() => {
        association.store(123); // Invalid parameter
      }).toThrow('Storage must be a Deep instance or string ID');
    });
    
    it('should throw error for invalid marker parameter', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      expect(() => {
        association.store(storage, 123); // Invalid marker
      }).toThrow('Marker must be a Deep instance or string ID');
    });
  });

  describe('Cleanup on destroy', () => {
    it('should clean up storage markers when association is destroyed', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Store the association
      association.store(storage, marker);
      
      // Verify it was stored
      expect(association.isStored(storage, marker)).toBe(true);
      
      // Destroy the association
      association.destroy();
      
      // Check storage markers were cleaned up
      const allStorages = deep._getAllStorageMarkers();
      expect(allStorages.has(association._id)).toBe(false);
    });
  });
}); 