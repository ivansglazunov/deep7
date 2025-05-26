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

  describe('Storage Dependency Validation', () => {
    it('should throw error when trying to store association with unstored _type dependency', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      const typeAssociation = new deep();
      
      // Set type but don't store it
      association.type = typeAssociation;
      
      // Trying to store association should fail because type is not stored
      expect(() => {
        association.store(storage);
      }).toThrow('Cannot store association');
      expect(() => {
        association.store(storage);
      }).toThrow('dependency _type');
      expect(() => {
        association.store(storage);
      }).toThrow('is not stored in the same storage');
    });

    it('should throw error when trying to store association with unstored _from dependency', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      const fromAssociation = new deep();
      
      // Set from but don't store it
      association.from = fromAssociation;
      
      // Trying to store association should fail because from is not stored
      expect(() => {
        association.store(storage);
      }).toThrow('Cannot store association');
      expect(() => {
        association.store(storage);
      }).toThrow('dependency _from');
    });

    it('should throw error when trying to store association with unstored _to dependency', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      const toAssociation = new deep();
      
      // Set to but don't store it
      association.to = toAssociation;
      
      // Trying to store association should fail because to is not stored
      expect(() => {
        association.store(storage);
      }).toThrow('Cannot store association');
      expect(() => {
        association.store(storage);
      }).toThrow('dependency _to');
    });

    it('should throw error when trying to store association with unstored _value dependency', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      const valueAssociation = new deep();
      
      // Set value but don't store it
      association.value = valueAssociation;
      
      // Trying to store association should fail because value is not stored
      expect(() => {
        association.store(storage);
      }).toThrow('Cannot store association');
      expect(() => {
        association.store(storage);
      }).toThrow('dependency _value');
    });

    it('should allow storing association when all dependencies are stored', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      const typeAssociation = new deep();
      const fromAssociation = new deep();
      const toAssociation = new deep();
      const valueAssociation = new deep();
      
      // Store all dependencies first
      typeAssociation.store(storage);
      fromAssociation.store(storage);
      toAssociation.store(storage);
      valueAssociation.store(storage);
      
      // Set dependencies
      association.type = typeAssociation;
      association.from = fromAssociation;
      association.to = toAssociation;
      association.value = valueAssociation;
      
      // Now storing association should work
      expect(() => {
        association.store(storage);
      }).not.toThrow();
      
      expect(association.isStored(storage)).toBe(true);
    });

    it('should allow storing association with no dependencies', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      // Association with no dependencies should be storable
      expect(() => {
        association.store(storage);
      }).not.toThrow();
      
      expect(association.isStored(storage)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for invalid storage parameter', () => {
      const deep = newDeep();
      const association = new deep();
      
      expect(() => {
        association.store(123); // Invalid parameter
      }).toThrow('Storage must be a Deep instance (not string)');
    });
    
    it('should throw error for invalid marker parameter', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      expect(() => {
        association.store(storage, 123); // Invalid marker
      }).toThrow('Marker must be a Deep instance (not string)');
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

  describe('Storage Events', () => {
    it('should emit storeAdded event when storing association', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      let eventReceived = false;
      let eventPayload: any = null;
      
      // Listen for storeAdded event
      const disposer = deep.on(deep.events.storeAdded._id, (payload: any) => {
        eventReceived = true;
        eventPayload = payload;
      });
      
      // Store the association
      association.store(storage, marker);
      
      // Check event was emitted
      expect(eventReceived).toBe(true);
      expect(eventPayload).toBeDefined();
      expect(eventPayload._source).toBe(association._id);
      expect(eventPayload._reason).toBe(deep.events.storeAdded._id);
      expect(eventPayload.storageId).toBe(storage._id);
      expect(eventPayload.markerId).toBe(marker._id);
      
      disposer();
    });
    
    it('should emit storeRemoved event when unstoring association', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker = new deep.StorageMarker();
      const association = new deep();
      
      // Store first
      association.store(storage, marker);
      
      let eventReceived = false;
      let eventPayload: any = null;
      
      // Listen for storeRemoved event
      const disposer = deep.on(deep.events.storeRemoved._id, (payload: any) => {
        eventReceived = true;
        eventPayload = payload;
      });
      
      // Unstore the association
      association.unstore(storage, marker);
      
      // Check event was emitted
      expect(eventReceived).toBe(true);
      expect(eventPayload).toBeDefined();
      expect(eventPayload._source).toBe(association._id);
      expect(eventPayload._reason).toBe(deep.events.storeRemoved._id);
      expect(eventPayload.storageId).toBe(storage._id);
      expect(eventPayload.markerId).toBe(marker._id);
      
      disposer();
    });
    
    it('should emit multiple storeRemoved events when unstoring all markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const marker1 = new deep.StorageMarker();
      const marker2 = new deep.StorageMarker();
      const association = new deep();
      
      // Store with multiple markers
      association.store(storage, marker1);
      association.store(storage, marker2);
      
      const eventsReceived: any[] = [];
      
      // Listen for storeRemoved events
      const disposer = deep.on(deep.events.storeRemoved._id, (payload: any) => {
        eventsReceived.push(payload);
      });
      
      // Unstore all markers
      association.unstore(storage);
      
      // Check events were emitted for both markers
      expect(eventsReceived.length).toBe(2);
      expect(eventsReceived.some(e => e.markerId === marker1._id)).toBe(true);
      expect(eventsReceived.some(e => e.markerId === marker2._id)).toBe(true);
      
      disposer();
    });
  });

  describe('Type Hierarchy Storage Inheritance', () => {
    it('should inherit storage from type hierarchy', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Create type hierarchy: BaseType -> SpecificType -> instance
      const BaseType = new deep();
      const SpecificType = new deep();
      const instance = new deep();
      
      // Set up type hierarchy
      SpecificType.type = BaseType;
      instance.type = SpecificType;
      
      // Store typedTrue marker on BaseType (as per documentation)
      BaseType.store(storage, deep.storageMarkers.typedTrue);
      
      // Instance should inherit storage through type hierarchy
      expect(instance.isStored(storage)).toBe(true);
      expect(SpecificType.isStored(storage)).toBe(true);
      
      // But direct markers should still work correctly
      expect(instance.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false); // No direct marker
      expect(BaseType.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true); // Direct marker
    });
    
    it('should prioritize direct storage over inherited storage', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const typeMarker = new deep.StorageMarker();
      const instanceMarker = new deep.StorageMarker();
      
      const ParentType = new deep();
      const instance = new deep();
      
      // Set up type hierarchy
      instance.type = ParentType;
      
      // Store different markers on type and instance
      ParentType.store(storage, typeMarker);
      instance.store(storage, instanceMarker);
      
      // Instance should have both its own and inherited storage
      expect(instance.isStored(storage)).toBe(true);
      expect(instance.isStored(storage, instanceMarker)).toBe(true); // Direct
      expect(instance.isStored(storage, typeMarker)).toBe(false); // Not direct, but inherited
    });
  });

  describe('Deep instance validation', () => {
    it('should reject string storage IDs', () => {
      const deep = newDeep();
      const association = new deep();
      
      expect(() => {
        association.store('my-storage-id'); // String not allowed
      }).toThrow('Storage must be a Deep instance (not string)');
    });
    
    it('should reject string marker IDs', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      expect(() => {
        association.store(storage, 'my-marker-id'); // String not allowed
      }).toThrow('Marker must be a Deep instance (not string)');
    });
  });
}); 