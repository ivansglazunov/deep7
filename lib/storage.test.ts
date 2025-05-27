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

describe('DEBUG', () => {
  it('should test hypothesis about deep.typed contents', () => {
    const deep = newDeep();
    console.log('=== DEBUG: Deep Structure Analysis ===');
    console.log('deep._id:', deep._id);
    console.log('deep._typed size:', deep._typed.size);
    console.log('deep._typed contents:', Array.from(deep._typed));
    console.log('deep.String._id:', deep.String._id);
    console.log('deep.Number._id:', deep.Number._id);
    console.log('deep.Function._id:', deep.Function._id);
    console.log('deep.String in _typed:', deep._typed.has(deep.String._id));
    console.log('deep.Number in _typed:', deep._typed.has(deep.Number._id));
    console.log('deep.Function in _typed:', deep._typed.has(deep.Function._id));
    
    // Test defaultMarking behavior
    const storage = new deep.Storage();
    console.log('\n=== Before defaultMarking ===');
    console.log('deep.isStored(storage):', deep.isStored(storage));
    console.log('deep.String.isStored(storage):', deep.String.isStored(storage));
    
    defaultMarking(deep, storage);
    
    console.log('\n=== After defaultMarking ===');
    console.log('deep.isStored(storage):', deep.isStored(storage));
    console.log('deep.isStored(storage, oneTrue):', deep.isStored(storage, deep.storageMarkers.oneTrue));
    console.log('deep.String.isStored(storage):', deep.String.isStored(storage));
    console.log('deep.String.isStored(storage, typedTrue):', deep.String.isStored(storage, deep.storageMarkers.typedTrue));
    console.log('deep.Number.isStored(storage):', deep.Number.isStored(storage));
    console.log('deep.Function.isStored(storage):', deep.Function.isStored(storage));
    
    // Check what's actually in storage markers
    console.log('\n=== Storage Markers Analysis ===');
    const allMarkers = deep._getAllStorageMarkers();
    console.log('All storage markers:', allMarkers);
    for (const [assocId, storageMap] of allMarkers) {
      console.log(`Association ${assocId}:`, storageMap);
    }
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
    it.skip('should sort by _i when needResortI=true', () => {
      // Test _i-based sorting
    });
    
    it.skip('should throw error when _i missing and needResortI=true', () => {
      // Test _i validation
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
    
    it.skip('should detect circular dependencies', () => {
      // Test circular dependency detection
    });
    
    it.skip('should return topologically sorted result', () => {
      // Test final ordering correctness
    });
  });

  describe('_applyDelta(deep, delta, storage)', () => {
    it.skip('should apply insert operation correctly', () => {
      // Test delta insert
    });
    
    it.skip('should apply update operation correctly', () => {
      // Test delta update
    });
    
    it.skip('should apply delete operation correctly', () => {
      // Test delta delete
    });
    
    it.skip('should mark deep._id associations as typedTrue when not in markers', () => {
      // Test automatic marking logic
    });
    
    it.skip('should validate referenced IDs exist for non-deep._id associations', () => {
      // Test dependency validation
    });
    
    it.skip('should throw error when referenced IDs missing', () => {
      // Test error handling for missing dependencies
    });
    
    it.skip('should handle typed data correctly', () => {
      // Test data field handling
    });
  });

  describe('_applySubscription(deep, dump, storage)', () => {
    it.skip('should compare updated_at timestamps correctly', () => {
      // Test timestamp comparison logic
    });
    
    it.skip('should use _sortDump for dependency-aware processing', () => {
      // Test integration with _sortDump
    });
    
    it.skip('should call _applyDelta for each changed association', () => {
      // Test delta application
    });
    
    it.skip('should handle empty dumps', () => {
      // Test edge case
    });
    
    it.skip('should handle large dumps efficiently', () => {
      // Test performance
    });
    
    it.skip('should skip unchanged associations', () => {
      // Test optimization
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
    it.skip('should create Storage as Alive instance', () => {
      // Test Storage creation
    });
    
    it.skip('should register Storage in deep context', () => {
      // Test registration
    });
  });

  describe('Storage Methods (state keys)', () => {
    describe('generateDump()', () => {
      it.skip('should use _generateDump internally', () => {
        // Test internal function usage
      });
      
      it.skip('should return correct StorageDump format', () => {
        // Test return format
      });
    });
    
    describe('watch()', () => {
      it.skip('should set up event listeners for storage events', () => {
        // Test event listener setup
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
    it.skip('should initialize event handlers as undefined', () => {
      // Test initial state
    });
    
    it.skip('should allow setting custom event handlers', () => {
      // Test handler assignment
    });
  });

  describe('Integration with Existing Storage System', () => {
    it.skip('should work alongside existing storages system', () => {
      // Test compatibility
    });
    
    it.skip('should not break existing storage functionality', () => {
      // Test non-interference
    });
  });

  describe('Interfaces', () => {
    it.skip('should define StorageDump interface correctly', () => {
      // Test interface compliance
    });
    
    it.skip('should define StorageLink interface correctly', () => {
      // Test interface compliance
    });
    
    it.skip('should define StorageDelta interface correctly', () => {
      // Test interface compliance
    });
  });
}); 