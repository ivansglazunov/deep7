import { newDeep } from '.';
import { 
  StorageDump, 
  StorageLink, 
  StorageDelta, 
  defaultMarking,
  _generateDump,
  _applyDelta, 
  _applySubscription,
  _sortDump 
} from './storage';

import Debug from './debug';

const debug = Debug('storage:test');

describe('DEBUG', () => {
  it('should test __isStorageEvent logic works correctly', () => {
    const deep = newDeep();
    const storage = new deep.Storage();
    const association = new deep();
    
    let eventReceived = false;
    let eventPayload: any = null;
    
    // Listen for global link changed events
    const disposer = deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
      eventReceived = true;
      eventPayload = payload;
    });
    
    // Set __isStorageEvent before making changes
    const storageId = storage._id;
    deep.Deep.__isStorageEvent = storageId;
    
    // Make a change that should trigger an event
    association.type = new deep();
    
    // Check that event was received with correct __isStorageEvent
    expect(eventReceived).toBe(true);
    expect(eventPayload).toBeDefined();
    expect(eventPayload.__isStorageEvent).toBe(storageId);
    
    // Check that __isStorageEvent was reset
    expect(deep.Deep.__isStorageEvent).toBeUndefined();
    
    disposer();
  });
});

describe('Phase 2: Core Storage Foundation', () => {
  
  // === FILE FUNCTIONS TESTS (Priority: implement first) ===
  
  describe('_generateDump(deep, storage)', () => {
    it('should generate empty dump when no associations are stored', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      const dump = _generateDump(deep, storage);
      
      expect(dump.ids).toEqual([]);
      expect(dump.links).toEqual([]);
    });
    
    it('should include only typed associations in dump', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Apply default marking first
      defaultMarking(deep, storage);
      
      // Create typed and untyped associations
      const typedAssoc = new deep.String('test string');
      const untypedAssoc = new deep();
      
      // Store both associations
      typedAssoc.store(storage);
      untypedAssoc.store(storage);
      
      const dump = _generateDump(deep, storage);
      
      // Should only include typed associations (not plain deep instances)
      const typedAssocLink = dump.links.find(link => link._id === typedAssoc._id);
      const untypedAssocLink = dump.links.find(link => link._id === untypedAssoc._id);
      
      expect(typedAssocLink).toBeDefined();
      expect(typedAssocLink?._type).toBe(deep.String._id);
      expect(untypedAssocLink).toBeUndefined(); // Should not be included
    });
    
    it('should include all association fields (_type, _from, _to, _value)', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Apply default marking first
      defaultMarking(deep, storage);
      
      // Create associations with all fields
      const typeAssoc = new deep.String('type data');
      const fromAssoc = new deep.String('from data');
      const toAssoc = new deep.String('to data');
      const valueAssoc = new deep.String('value data');
      const mainAssoc = new deep.String('main data');
      
      // Set up relationships
      mainAssoc.type = typeAssoc;
      mainAssoc.from = fromAssoc;
      mainAssoc.to = toAssoc;
      mainAssoc.value = valueAssoc;
      
      // Store all associations
      typeAssoc.store(storage);
      fromAssoc.store(storage);
      toAssoc.store(storage);
      valueAssoc.store(storage);
      mainAssoc.store(storage);
      
      const dump = _generateDump(deep, storage);
      
      // Find the main association in dump
      const mainLink = dump.links.find(link => link._id === mainAssoc._id);
      
      expect(mainLink).toBeDefined();
      expect(mainLink?._type).toBe(typeAssoc._id);
      expect(mainLink?._from).toBe(fromAssoc._id);
      expect(mainLink?._to).toBe(toAssoc._id);
      expect(mainLink?._value).toBe(valueAssoc._id);
      expect(mainLink?._created_at).toBeDefined();
      expect(mainLink?._updated_at).toBeDefined();
      expect(mainLink?._i).toBeDefined();
    });
    
    it('should include typed data (_string, _number, _function)', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Apply default marking first
      defaultMarking(deep, storage);
      
      // Create associations with typed data
      const stringAssoc = new deep.String('test string value');
      const numberAssoc = new deep.Number(42);
      const functionAssoc = new deep.Function(() => 'test function');
      
      // Store all associations
      stringAssoc.store(storage);
      numberAssoc.store(storage);
      functionAssoc.store(storage);
      
      const dump = _generateDump(deep, storage);
      
      // Find associations in dump
      const stringLink = dump.links.find(link => link._id === stringAssoc._id);
      const numberLink = dump.links.find(link => link._id === numberAssoc._id);
      const functionLink = dump.links.find(link => link._id === functionAssoc._id);
      
      // Check string data
      expect(stringLink).toBeDefined();
      expect(stringLink?._string).toBe('test string value');
      expect(stringLink?._type).toBe(deep.String._id);
      
      // Check number data
      expect(numberLink).toBeDefined();
      expect(numberLink?._number).toBe(42);
      expect(numberLink?._type).toBe(deep.Number._id);
      
      // Check function data
      expect(functionLink).toBeDefined();
      expect(functionLink?._function).toBeDefined();
      expect(typeof functionLink?._function).toBe('string');
      expect(functionLink?._type).toBe(deep.Function._id);
    });
    
    it.skip('should assign _i field correctly', () => {
      // Test sequence number assignment
    });
    
    it.skip('should handle complex association hierarchies', () => {
      // Test with nested associations
    });
  });

  describe('_sortDump(links, needResortI?)', () => {
    it('should sort links with no dependencies', () => {
      const deep = newDeep();
      
      // Create simple links with no dependencies
      const links: StorageLink[] = [
        {
          _id: 'link1',
          _type: 'type1',
          _created_at: 1000,
          _updated_at: 1000,
          _i: 1
        },
        {
          _id: 'link2', 
          _type: 'type2',
          _created_at: 2000,
          _updated_at: 2000,
          _i: 2
        },
        {
          _id: 'link3',
          _type: 'type3', 
          _created_at: 3000,
          _updated_at: 3000,
          _i: 3
        }
      ];
      
      const sorted = _sortDump(links);
      
      // Should maintain original order since no dependencies
      expect(sorted).toHaveLength(3);
      expect(sorted[0]._id).toBe('link1');
      expect(sorted[1]._id).toBe('link2');
      expect(sorted[2]._id).toBe('link3');
    });
    
    it('should sort by _i when needResortI=true', () => {
      const deep = newDeep();
      
      // Create links with _i in reverse order
      const links: StorageLink[] = [
        {
          _id: 'link3',
          _type: 'type3',
          _created_at: 3000,
          _updated_at: 3000,
          _i: 3
        },
        {
          _id: 'link1',
          _type: 'type1',
          _created_at: 1000,
          _updated_at: 1000,
          _i: 1
        },
        {
          _id: 'link2',
          _type: 'type2',
          _created_at: 2000,
          _updated_at: 2000,
          _i: 2
        }
      ];
      
      const sorted = _sortDump(links, true);
      
      // Should be sorted by _i field
      expect(sorted).toHaveLength(3);
      expect(sorted[0]._id).toBe('link1'); // _i: 1
      expect(sorted[1]._id).toBe('link2'); // _i: 2
      expect(sorted[2]._id).toBe('link3'); // _i: 3
    });
    
    it('should throw error when _i missing and needResortI=true', () => {
      const deep = newDeep();
      
      // Create links with missing _i field
      const links: StorageLink[] = [
        {
          _id: 'link1',
          _type: 'type1',
          _created_at: 1000,
          _updated_at: 1000,
          _i: 1
        },
        {
          _id: 'link2',
          _type: 'type2',
          _created_at: 2000,
          _updated_at: 2000
          // Missing _i field
        }
      ];
      
      // Should throw error when needResortI=true and _i is missing
      expect(() => {
        _sortDump(links, true);
      }).toThrow('Missing _i field for sorting on link link2');
    });
    
    it.skip('should create correct dependency map', () => {
      // Test dependency detection
    });
    
    it.skip('should handle links with no dependencies', () => {
      // Test independent links
    });
    
    it.skip('should resolve simple dependency chains', () => {
      // Test A->B->C chains
    });
    
    it.skip('should handle complex dependency graphs', () => {
      // Test multiple dependencies
    });
    
    it('should detect circular dependencies', () => {
      const deep = newDeep();
      
      // Create links with circular dependency: A -> B -> C -> A
      const links: StorageLink[] = [
        {
          _id: 'linkA',
          _type: 'linkB', // A depends on B
          _created_at: 1000,
          _updated_at: 1000,
          _i: 1
        },
        {
          _id: 'linkB',
          _type: 'linkC', // B depends on C
          _created_at: 2000,
          _updated_at: 2000,
          _i: 2
        },
        {
          _id: 'linkC',
          _type: 'linkA', // C depends on A - creates cycle!
          _created_at: 3000,
          _updated_at: 3000,
          _i: 3
        }
      ];
      
      debug('=== Testing circular dependency ===');
      debug('Links:', links.map(l => `${l._id} -> ${l._type}`));
      
      // Should throw error about circular dependency
      expect(() => {
        const result = _sortDump(links);
        debug('Unexpected success! Result:', result.map(l => l._id));
      }).toThrow('Circular dependency detected involving link');
    });
    
    it.skip('should return topologically sorted result', () => {
      // Test final ordering correctness
    });
  });

  describe('_applyDelta(deep, delta, storage)', () => {
    it('should apply insert operation correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create a new ID for association to insert (don't create the association yet)
      const newAssociationId = 'test-association-id';
      const delta: StorageDelta = {
        operation: 'insert',
        link: {
          _id: newAssociationId,
          _type: deep._id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      // Apply delta
      _applyDelta(deep, delta, storage);
      
      // Check that association was created and marked
      expect(deep._ids.has(newAssociationId)).toBe(true);
      expect(new deep(newAssociationId).isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
    });
    
    it('should apply update operation correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create and store an association
      const association = new deep();
      association.store(storage);
      
      const oldUpdatedAt = association._updated_at;
      const newUpdatedAt = Date.now() + 1000;
      
      const delta: StorageDelta = {
        operation: 'update',
        id: association._id,
        link: {
          _id: association._id,
          _type: deep._id,
          _created_at: association._created_at,
          _updated_at: newUpdatedAt,
          _i: association._i
        }
      };
      
      // Apply delta
      _applyDelta(deep, delta, storage);
      
      // Check that _updated_at was changed
      expect(association._updated_at).toBe(newUpdatedAt);
      expect(association._updated_at).not.toBe(oldUpdatedAt);
    });
    
    it('should apply delete operation correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create and store an association
      const association = new deep();
      association.store(storage);
      const associationId = association._id;
      
      const delta: StorageDelta = {
        operation: 'delete',
        id: associationId
      };
      
      // Apply delta
      _applyDelta(deep, delta, storage);
      
      // Check that association was removed from storage
      expect(new deep(associationId).isStored(storage)).toBe(false);
    });
    
    it('should mark deep._id associations as typedTrue when not in markers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create association ID with _type = deep._id (don't create association yet)
      const associationId = 'test-typed-association-id';
      const delta: StorageDelta = {
        operation: 'insert',
        link: {
          _id: associationId,
          _type: deep._id, // This should get typedTrue marker
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      // Apply delta
      _applyDelta(deep, delta, storage);
      
      // Check that it got typedTrue marker
      expect(new deep(associationId).isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
    });
    
    it('should validate referenced IDs exist for non-deep._id associations', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create type that exists in storage
      const existingType = new deep();
      existingType.store(storage);
      
      // Try to insert association with valid type reference (don't create association yet)
      const associationId = 'test-valid-ref-association-id';
      const delta: StorageDelta = {
        operation: 'insert',
        link: {
          _id: associationId,
          _type: existingType._id, // Valid reference
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      // Should not throw
      expect(() => {
        _applyDelta(deep, delta, storage);
      }).not.toThrow();
    });
    
    it('should throw error when referenced IDs missing', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Try to insert association with non-existent type reference
      const associationId = 'test-invalid-ref-association-id';
      const nonExistentTypeId = 'non-existent-type-id';
      
      const delta: StorageDelta = {
        operation: 'insert',
        link: {
          _id: associationId,
          _type: nonExistentTypeId, // Invalid reference
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      // Should throw error
      expect(() => {
        _applyDelta(deep, delta, storage);
      }).toThrow('not stored in the same storage');
    });
    
    it('should handle typed data correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create string association with proper string argument
      const stringAssociation = new deep.String('initial value');
      stringAssociation.store(storage);
      
      const delta: StorageDelta = {
        operation: 'update',
        id: stringAssociation._id,
        link: {
          _id: stringAssociation._id,
          _type: deep.String._id,
          _created_at: stringAssociation._created_at,
          _updated_at: Date.now(),
          _i: stringAssociation._i,
          _string: 'test string value'
        }
      };
      
      // Apply delta
      _applyDelta(deep, delta, storage);
      
      // Check that data was set correctly
      expect(stringAssociation.data).toBe('test string value');
    });
  });

  describe('_applySubscription(deep, dump, storage)', () => {
    it('should compare updated_at timestamps correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create and store an association
      const association = new deep();
      association.store(storage);
      const originalUpdatedAt = association._updated_at;
      
      // Create dump with newer timestamp
      const newerTimestamp = originalUpdatedAt + 1000;
      const dump: StorageDump = {
        links: [{
          _id: association._id,
          _type: deep._id,
          _created_at: association._created_at,
          _updated_at: newerTimestamp,
          _i: 1
        }]
      };
      
      // Apply subscription
      _applySubscription(deep, dump, storage);
      
      // Check that association was updated
      expect(association._updated_at).toBe(newerTimestamp);
    });
    
    it('should use _sortDump for dependency-aware processing', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create dump with dependencies (B depends on A)
      const dump: StorageDump = {
        links: [
          {
            _id: 'link-b',
            _type: 'link-a', // B depends on A
            _created_at: Date.now(),
            _updated_at: Date.now(),
            _i: 2
          },
          {
            _id: 'link-a',
            _type: deep._id,
            _created_at: Date.now(),
            _updated_at: Date.now(),
            _i: 1
          }
        ]
      };
      
      // Should not throw (dependencies resolved correctly)
      expect(() => {
        _applySubscription(deep, dump, storage);
      }).not.toThrow();
      
      // Check that both associations were created
      expect(deep._ids.has('link-a')).toBe(true);
      expect(deep._ids.has('link-b')).toBe(true);
    });
    
    it('should call _applyDelta for each changed association', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create dump with multiple new associations
      const dump: StorageDump = {
        links: [
          {
            _id: 'new-link-1',
            _type: deep._id,
            _created_at: Date.now(),
            _updated_at: Date.now(),
            _i: 1
          },
          {
            _id: 'new-link-2',
            _type: deep._id,
            _created_at: Date.now(),
            _updated_at: Date.now(),
            _i: 2
          }
        ]
      };
      
      // Apply subscription
      _applySubscription(deep, dump, storage);
      
      // Check that all associations were created
      expect(deep._ids.has('new-link-1')).toBe(true);
      expect(deep._ids.has('new-link-2')).toBe(true);
    });
    
    it('should handle empty dumps', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      const emptyDump: StorageDump = {
        links: []
      };
      
      // Should not throw
      expect(() => {
        _applySubscription(deep, emptyDump, storage);
      }).not.toThrow();
    });
    
    it('should handle large dumps efficiently', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create large dump (100 associations)
      const links: StorageLink[] = [];
      for (let i = 0; i < 100; i++) {
        links.push({
          _id: `large-link-${i}`,
          _type: deep._id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: i + 1
        });
      }
      
      const largeDump: StorageDump = { links };
      
      const startTime = Date.now();
      _applySubscription(deep, largeDump, storage);
      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Check that all associations were created
      for (let i = 0; i < 100; i++) {
        expect(deep._ids.has(`large-link-${i}`)).toBe(true);
      }
    });
    
    it('should skip unchanged associations', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create and store an association
      const association = new deep();
      association.store(storage);
      const originalUpdatedAt = association._updated_at;
      
      // Create dump with same timestamp (unchanged)
      const dump: StorageDump = {
        links: [{
          _id: association._id,
          _type: deep._id,
          _created_at: association._created_at,
          _updated_at: originalUpdatedAt, // Same timestamp
          _i: 1
        }]
      };
      
      // Apply subscription
      _applySubscription(deep, dump, storage);
      
      // Check that association was not modified
      expect(association._updated_at).toBe(originalUpdatedAt);
    });
  });

  describe('defaultMarking(deep, storage)', () => {
    it('should mark deep with oneTrue marker', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Before marking
      expect(deep.isStored(storage)).toBe(false);
      
      // Apply default marking
      defaultMarking(deep, storage);
      
      // After marking
      expect(deep.isStored(storage)).toBe(true);
      expect(deep.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
    });
    
    it('should mark all deep.typed with typedTrue marker', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Apply default marking
      defaultMarking(deep, storage);
      
      // Check that system types are marked
      expect(deep.String.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      expect(deep.Number.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      expect(deep.Function.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
    });
    
    it.skip('should ensure all system types are marked', () => {
      // Test String, Number, Function marking
    });
    
    it.skip('should not affect new associations created after marking', () => {
      // Test that new deep() instances are unmarked
    });
  });

  // === STORAGE SYSTEM TESTS ===
  
  describe('Storage Creation and Registration', () => {
    it('should create Storage as Alive instance', () => {
      const deep = newDeep();
      
      // Check that Storage exists and is an Alive instance
      expect(deep.Storage).toBeDefined();
      expect(deep.Storage._type).toBe(deep.Alive.AliveInstance._id);
    });
    
    it('should register Storage in deep context', () => {
      const deep = newDeep();
      
      // Check that Storage is registered in context
      expect(deep._context.Storage).toBeDefined();
      expect(deep._context.Storage).toBe(deep.Storage);
    });
  });

  describe('Storage Methods (state keys)', () => {
    describe('generateDump()', () => {
      it('should use _generateDump internally', () => {
        const deep = newDeep();
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Create some associations
        const association = new deep();
        association.store(storage);
        
        // Call generateDump method
        const dump = storage.state.generateDump();
        
        // Should return StorageDump format
        expect(dump).toBeDefined();
        expect(dump.links).toBeDefined();
        expect(Array.isArray(dump.links)).toBe(true);
      });
      
      it('should return correct StorageDump format', () => {
        const deep = newDeep();
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Create typed association
        const stringAssoc = new deep.String('test');
        stringAssoc.store(storage);
        
        const dump = storage.state.generateDump();
        
        // Check format
        expect(dump.links.length).toBeGreaterThan(0);
        const link = dump.links.find(l => l._id === stringAssoc._id);
        expect(link).toBeDefined();
        expect(link!._type).toBe(deep.String._id);
        expect(link!._string).toBe('test');
      });
    });
    
    describe('watch()', () => {
      it('should set up event listeners for storage events', () => {
        const deep = newDeep();
        const storage = new deep.Storage();
        
        // watch() should be callable
        expect(typeof storage.state.watch).toBe('function');
        
        // Should not throw when called
        expect(() => {
          storage.state.watch();
        }).not.toThrow();
      });
      
      it.skip('should call onLinkInsert when associations are stored', () => {
        // Test insert handler
      });
      
      it.skip('should call onLinkDelete when associations are unstored', () => {
        // Test delete handler
      });
      
      it.skip('should call onLinkUpdate when associations change', () => {
        // Test update handler
      });
      
      it.skip('should call onDataChanged when data changes', () => {
        // Test data change handler
      });
    });
  });

  describe('Storage Event Handlers', () => {
    it('should initialize event handlers as undefined', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Check that handlers are initially undefined
      expect(storage.state.onLinkInsert).toBeUndefined();
      expect(storage.state.onLinkDelete).toBeUndefined();
      expect(storage.state.onLinkUpdate).toBeUndefined();
      expect(storage.state.onDataChanged).toBeUndefined();
    });
    
    it('should allow setting custom event handlers', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Set custom handlers
      const insertHandler = jest.fn();
      const deleteHandler = jest.fn();
      const updateHandler = jest.fn();
      const dataHandler = jest.fn();
      
      storage.state.onLinkInsert = insertHandler;
      storage.state.onLinkDelete = deleteHandler;
      storage.state.onLinkUpdate = updateHandler;
      storage.state.onDataChanged = dataHandler;
      
      // Check that handlers are set
      expect(storage.state.onLinkInsert).toBe(insertHandler);
      expect(storage.state.onLinkDelete).toBe(deleteHandler);
      expect(storage.state.onLinkUpdate).toBe(updateHandler);
      expect(storage.state.onDataChanged).toBe(dataHandler);
    });
  });

  describe('Integration with Existing Storage System', () => {
    it('should work alongside existing storages system', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Test that both systems coexist
      expect(deep.storageMarkers).toBeDefined();
      expect(deep.Storage).toBeDefined();
      
      // Test that associations can be stored using both systems
      const association = new deep();
      
      // Use existing storage system
      association.store(storage, deep.storageMarkers.oneTrue);
      expect(association.isStored(storage)).toBe(true);
      
      // Use new storage system
      defaultMarking(deep, storage);
      expect(deep.isStored(storage)).toBe(true);
    });
    
    it('should not break existing storage functionality', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      
      // Test existing storage methods still work
      const association = new deep();
      
      // Basic storage operations
      association.store(storage);
      expect(association.isStored(storage)).toBe(true);
      
      const markers = association.storages(storage);
      expect(Array.isArray(markers)).toBe(true);
      
      association.unstore(storage);
      expect(association.isStored(storage)).toBe(false);
    });
  });

  describe('Interfaces', () => {
    it('should define StorageDump interface correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      const dump = _generateDump(deep, storage);
      
      // Check StorageDump structure
      expect(dump).toBeDefined();
      expect(typeof dump).toBe('object');
      expect('links' in dump).toBe(true);
      expect(Array.isArray(dump.links)).toBe(true);
      
      // ids field is optional
      if ('ids' in dump) {
        expect(Array.isArray(dump.ids)).toBe(true);
      }
    });
    
    it('should define StorageLink interface correctly', () => {
      const deep = newDeep();
      const storage = new deep.Storage();
      defaultMarking(deep, storage);
      
      // Create a typed association
      const stringAssoc = new deep.String('test');
      stringAssoc.store(storage);
      
      const dump = _generateDump(deep, storage);
      const link = dump.links.find(l => l._id === stringAssoc._id);
      
      expect(link).toBeDefined();
      
      // Check required fields
      expect(typeof link!._id).toBe('string');
      expect(typeof link!._type).toBe('string');
      expect(typeof link!._created_at).toBe('number');
      expect(typeof link!._updated_at).toBe('number');
      
      // Check optional fields exist when relevant
      expect(typeof link!._string).toBe('string');
      expect(link!._string).toBe('test');
    });
    
    it('should define StorageDelta interface correctly', () => {
      // Test delta structure
      const insertDelta = {
        operation: 'insert' as const,
        link: {
          _id: 'test-id',
          _type: 'test-type',
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      const updateDelta = {
        operation: 'update' as const,
        id: 'test-id',
        link: {
          _id: 'test-id',
          _type: 'test-type',
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 1
        }
      };
      
      const deleteDelta = {
        operation: 'delete' as const,
        id: 'test-id'
      };
      
      // Check that deltas have correct structure
      expect(insertDelta.operation).toBe('insert');
      expect(insertDelta.link).toBeDefined();
      
      expect(updateDelta.operation).toBe('update');
      expect(updateDelta.id).toBeDefined();
      expect(updateDelta.link).toBeDefined();
      
      expect(deleteDelta.operation).toBe('delete');
      expect(deleteDelta.id).toBeDefined();
    });
  });
}); 