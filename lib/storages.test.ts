import { newDeep } from '.';
import Debug from './debug';
import { _getAllStorages } from './storage';

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
      
      // Store with oneTrue marker (was default, now explicit)
      association.store(storage, deep.storageMarkers.oneTrue);
      
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

  // Storage Dependency Validation was removed from the system
  // Associations can now be stored regardless of their dependencies' storage status

  describe('Error handling', () => {
    it('should throw error for invalid storage parameter', () => {
      const deep = newDeep();
      const association = new deep();
      
      expect(() => {
        association.store(123); // Invalid parameter
      }).toThrow('Storage must be a Deep instance or a valid string ID.');
    });
    
    it('should throw error for invalid marker parameter', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      expect(() => {
        association.store(storage, 123); // Invalid marker
      }).toThrow('Marker must be a Deep instance or a valid string ID.');
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
      expect(eventPayload._source).toBe(storage._id);
      expect(eventPayload._reason).toBe(deep.events.storeAdded._id);
      
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
      expect(eventPayload._source).toBe(storage._id);
      expect(eventPayload._reason).toBe(deep.events.storeRemoved._id);
      
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
      expect(eventsReceived.length).toBe(1);
      
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
      }).toThrow('Invalid storage ID: my-storage-id not found in deep._ids.');
    });
    
    it('should reject string marker IDs', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      expect(() => {
        association.store(storage, 'my-marker-id'); // String not allowed
      }).toThrow('Invalid marker ID: my-marker-id not found in deep._ids.');
    });
  });

  describe('isStored() Method Comprehensive Testing', () => {
    it('should correctly handle isStored with specific markers vs general storage check', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      // Initially not stored
      expect(association.isStored(storage)).toBe(false);
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
      expect(association.isStored(storage, deep.storageMarkers.oneFalse)).toBe(false);
      
      // Store with oneTrue marker
      association.store(storage, deep.storageMarkers.oneTrue);
      
      // General check should return true
      expect(association.isStored(storage)).toBe(true);
      
      // Specific marker checks
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.oneFalse)).toBe(false);
      expect(association.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      
      // Add another marker
      association.store(storage, deep.storageMarkers.oneFalse);
      
      // General check still true
      expect(association.isStored(storage)).toBe(true);
      
      // Both specific markers should be true
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.oneFalse)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
    });

    it('should correctly handle type hierarchy inheritance with typedTrue markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Create type hierarchy: GrandParent -> Parent -> Child -> Instance
      const GrandParent = new deep();
      const Parent = new deep();
      const Child = new deep();
      const instance = new deep();
      
      // Set up type hierarchy
      Parent.type = GrandParent;
      Child.type = Parent;
      instance.type = Child;
      
      // Initially nothing is stored
      expect(instance.isStored(storage)).toBe(false);
      expect(Child.isStored(storage)).toBe(false);
      expect(Parent.isStored(storage)).toBe(false);
      expect(GrandParent.isStored(storage)).toBe(false);
      
      // Store typedTrue marker on GrandParent
      GrandParent.store(storage, deep.storageMarkers.typedTrue);
      
      // All descendants should inherit storage through type hierarchy
      expect(GrandParent.isStored(storage)).toBe(true);
      expect(Parent.isStored(storage)).toBe(true);
      expect(Child.isStored(storage)).toBe(true);
      expect(instance.isStored(storage)).toBe(true);
      
      // But specific marker checks should only be true for GrandParent
      expect(GrandParent.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      expect(Parent.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      expect(Child.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      expect(instance.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
    });

    it('should not inherit oneTrue markers through type hierarchy', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      const ParentType = new deep();
      const instance = new deep();
      
      // Set up type hierarchy
      instance.type = ParentType;
      
      // Store oneTrue marker on parent type
      ParentType.store(storage, deep.storageMarkers.oneTrue);
      
      // Parent should be stored
      expect(ParentType.isStored(storage)).toBe(true);
      expect(ParentType.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      
      // Instance should NOT inherit oneTrue markers
      expect(instance.isStored(storage)).toBe(false);
      expect(instance.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
    });

    it('should handle mixed markers correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      const BaseType = new deep();
      const instance = new deep();
      
      // Set up type hierarchy
      instance.type = BaseType;
      
      // Store typedTrue on base type and oneTrue on instance
      BaseType.store(storage, deep.storageMarkers.typedTrue);
      instance.store(storage, deep.storageMarkers.oneTrue);
      
      // Both should be stored (different reasons)
      expect(BaseType.isStored(storage)).toBe(true);
      expect(instance.isStored(storage)).toBe(true);
      
      // Check specific markers
      expect(BaseType.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      expect(BaseType.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
      
      expect(instance.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      expect(instance.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false); // Not direct
    });

    it('should handle multiple storage instances correctly', () => {
      const deep = newDeep();
      const storage1 = new deep.Storage();
      const storage2 = new deep.Storage();
      const association = new deep();
      
      // Store in different storages with different markers
      association.store(storage1, deep.storageMarkers.oneTrue);
      association.store(storage2, deep.storageMarkers.oneFalse);
      
      // Check storage1
      expect(association.isStored(storage1)).toBe(true);
      expect(association.isStored(storage1, deep.storageMarkers.oneTrue)).toBe(true);
      expect(association.isStored(storage1, deep.storageMarkers.oneFalse)).toBe(false);
      
      // Check storage2
      expect(association.isStored(storage2)).toBe(true);
      expect(association.isStored(storage2, deep.storageMarkers.oneFalse)).toBe(true);
      expect(association.isStored(storage2, deep.storageMarkers.oneTrue)).toBe(false);
    });

    it('should handle edge case: association with no type', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      const association = new deep();
      
      // Association starts with deep._id as type, then we remove it
      delete association.type;
      
      // Store the association
      association.store(storage, deep.storageMarkers.oneTrue);
      
      // Should be stored directly
      expect(association.isStored(storage)).toBe(true);
      expect(association.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
    });

    it('should handle complex scenario: multiple inheritance paths', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Create diamond inheritance pattern
      const Root = new deep();
      const BranchA = new deep();
      const BranchB = new deep();
      const Leaf = new deep();
      
      // Set up inheritance
      BranchA.type = Root;
      BranchB.type = Root;
      Leaf.type = BranchA; // Could also inherit from BranchB, but we'll use BranchA
      
      // Store typedTrue on Root
      Root.store(storage, deep.storageMarkers.typedTrue);
      
      // All should inherit from Root
      expect(Root.isStored(storage)).toBe(true);
      expect(BranchA.isStored(storage)).toBe(true);
      expect(BranchB.isStored(storage)).toBe(true);
      expect(Leaf.isStored(storage)).toBe(true);
      
      // Only Root should have direct marker
      expect(Root.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      expect(BranchA.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      expect(BranchB.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      expect(Leaf.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
    });

    it('should handle performance case: deep type hierarchy', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Create deep hierarchy (10 levels)
      const types: any[] = [];
      for (let i = 0; i < 10; i++) {
        types.push(new deep());
        if (i > 0) {
          types[i].type = types[i - 1];
        }
      }
      
      // Store typedTrue on root (types[0])
      types[0].store(storage, deep.storageMarkers.typedTrue);
      
      // All types should inherit storage
      for (let i = 0; i < 10; i++) {
        expect(types[i].isStored(storage)).toBe(true);
      }
      
      // Only root should have direct marker
      expect(types[0].isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      for (let i = 1; i < 10; i++) {
        expect(types[i].isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      }
    });
  });
});

const debugStoragesTest = Debug('deep:storages:test');

describe('Deep Storages with ID parameter', () => {
  it('should allow store, unstore, and isStored with storage ID', () => {
    const deep = newDeep();

    if (!deep.Storage || !deep.storageMarkers || !deep.storageMarkers.oneTrue) {
      console.warn('deep.Storage or deep.storageMarkers.oneTrue not found. Ensure storages are initialized.');
      if (typeof require === 'function') {
        try {
          const { newStorage } = require('./storage');
          const { newStorages } = require('./storages');
          if (newStorage) newStorage(deep);
          if (newStorages) newStorages(deep);
        } catch (e) {
          debugStoragesTest('Failed to manually initialize storages for test', e);
        }
      }
      if (!deep.Storage || !deep.storageMarkers || !deep.storageMarkers.oneTrue) {
        throw new Error('Test setup failed: deep.Storage or deep.storageMarkers.oneTrue is missing.');
      }
    }

    const MyStorageType = deep.Storage;
    const storageInstance = new MyStorageType();
    const storageId = storageInstance._id;

    const association = new deep();

    debugStoragesTest(`Storing association ${association._id} in storage ${storageId} using ID.`);
    association.store(storageId, deep.storageMarkers.oneTrue);

    debugStoragesTest(`Checking if association ${association._id} isStored in storage ${storageId} using ID.`);
    expect(association.isStored(storageId)).toBe(true);
    debugStoragesTest(`Checking if association ${association._id} isStored (with marker) in storage ${storageId} using ID.`);
    expect(association.isStored(storageId, deep.storageMarkers.oneTrue)).toBe(true);

    debugStoragesTest(`Unstoring association ${association._id} from storage ${storageId} using ID.`);
    association.unstore(storageId, deep.storageMarkers.oneTrue);

    debugStoragesTest(`Checking if association ${association._id} isStored in storage ${storageId} (after unstore) using ID.`);
    expect(association.isStored(storageId)).toBe(false);
    debugStoragesTest(`Checking if association ${association._id} isStored (with marker) in storage ${storageId} (after unstore) using ID.`);
    expect(association.isStored(storageId, deep.storageMarkers.oneTrue)).toBe(false);

    const anotherAssociation = new deep();
    debugStoragesTest(`Storing association ${anotherAssociation._id} in storage ${storageInstance._id} using instance.`);
    anotherAssociation.store(storageInstance, deep.storageMarkers.oneTrue);
    debugStoragesTest(`Checking if association ${anotherAssociation._id} isStored in storage ${storageInstance._id} using instance.`);
    expect(anotherAssociation.isStored(storageInstance)).toBe(true);
    debugStoragesTest(`Unstoring association ${anotherAssociation._id} from storage ${storageInstance._id} using instance.`);
    anotherAssociation.unstore(storageInstance, deep.storageMarkers.oneTrue);
    debugStoragesTest(`Checking if association ${anotherAssociation._id} isStored in storage ${storageInstance._id} (after unstore) using instance.`);
    expect(anotherAssociation.isStored(storageInstance)).toBe(false);

    debugStoragesTest('Storage ID tests completed successfully.');
  });
});

describe('__storagesDiff in globalLinkChanged events', () => {
  it('should correctly report storage changes via __storagesDiff when type is changed', () => {
    const deep = newDeep();
    const typeA = new deep();
    const storage = new deep.Storage();

    typeA.store(storage, deep.storageMarkers.typedTrue);

    const instanceB = new deep();
    let eventCounter = 0;
    const receivedPayloads: any[] = [];

    const disposer = deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
      eventCounter++;
      receivedPayloads.push({
        eventNumber: eventCounter,
        id: payload._id,
        field: payload._field,
        before: payload._before,
        after: payload._after,
        storagesDiff: payload.__storagesDiff ? {
          old: new Set(payload.__storagesDiff.old),
          new: new Set(payload.__storagesDiff.new)
        } : undefined
      });
    });

    const initialStoragesB = _getAllStorages(deep, instanceB);
    expect(initialStoragesB.has(storage._id)).toBe(false);

    instanceB.type = typeA;
    instanceB.type = deep;

    disposer();

    const eventsForInstanceB = receivedPayloads.filter(p => p.id === instanceB._id && p.field === '_type');
    expect(eventsForInstanceB.length).toBe(2);

    const event1 = eventsForInstanceB.find(p => p.eventNumber === 1 && p.after === typeA._id);
    expect(event1).toBeDefined();
    expect(event1.storagesDiff).toBeDefined();
    if (event1?.storagesDiff) {
      expect(event1.storagesDiff.old.has(storage._id)).toBe(false);
      expect(event1.storagesDiff.new.has(storage._id)).toBe(true);
    }

    const event2 = eventsForInstanceB.find(p => p.eventNumber === 2 && p.after === deep._id);
    expect(event2).toBeDefined();
    expect(event2.storagesDiff).toBeDefined();
    if (event2?.storagesDiff) {
      expect(event2.storagesDiff.old.has(storage._id)).toBe(true);
      expect(event2.storagesDiff.new.has(storage._id)).toBe(false);
    }
  });
}); 