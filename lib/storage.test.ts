import { newDeep } from '.';

describe('storage', () => {
  
});

// import { newDeep } from '.';
// import { 
//   StorageDump, 
//   StorageLink, 
//   StorageDelta, 
//   defaultMarking,
//   _generateDump,
//   _applyDelta, 
//   _applySubscription,
//   _sortDump 
// } from './storage';

// import Debug from './debug';

// const debug = Debug('storage:test');

// describe.skip('DEBUG', () => {
//   it('should test __isStorageEvent logic works correctly', () => {
//     const deep = newDeep();
//     const storage = new deep.Storage();
//     const storageId = storage._id;
//     const association = new deep();
//     let eventReceived = false;
//     let eventPayload: any;

//     // Setup listener for globalLinkChanged event on the deep instance
//     deep.on(deep.events.globalLinkChanged._id, (payload) => {
//       eventReceived = true;
//       eventPayload = payload;
//     });

//     // Check initial state of the flag
//     deep.Deep.__isStorageEvent = undefined;

//     deep.Deep.__isStorageEvent = storageId;

//     association.type = new deep();

//     // Ensure the handler was called
//     expect(eventReceived).toBe(true);
//     expect(eventPayload).toBeDefined();
//     expect(eventPayload.__isStorageEvent).toBe(undefined);
//   });
// });

// describe.skip('Phase 2: Core Storage Foundation', () => {
  
//   // === FILE FUNCTIONS TESTS (Priority: implement first) ===
  
//   describe('_generateDump(deep, storage)', () => {
//     it('should generate empty dump when no associations are stored', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       const dump = _generateDump(deep, storage);
      
//       expect(dump.ids).toEqual([]);
//       expect(dump.links).toEqual([]);
//     });
    
//     it('should include only typed associations in dump', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create typed and untyped associations
//       const typedAssoc = new deep.String('test string');
//       const plainAssoc = new deep(); // This has type = deep._id (plain association)
      
//       // Store both associations
//       typedAssoc.store(storage, deep.storageMarkers.oneTrue);
//       plainAssoc.store(storage, deep.storageMarkers.oneTrue);
      
//       const dump = _generateDump(deep, storage);
      
//       // Should include both typed associations and plain associations (with type = deep._id)
//       const typedAssocLink = dump.links.find(link => link._id === typedAssoc._id);
//       const plainAssocLink = dump.links.find(link => link._id === plainAssoc._id);
      
//       expect(typedAssocLink).toBeDefined();
//       expect(typedAssocLink?.type_id).toBe(deep.String._id);
//       expect(plainAssocLink).toBeDefined(); // Plain associations are now included
//       expect(plainAssocLink?.type_id).toBe(deep._id); // Type should be deep._id
//     });
    
//     it('should include all association fields (type_id, from_id, to_id, value_id)', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create associations with all fields
//       const typeAssoc = new deep.String('type data');
//       const fromAssoc = new deep.String('from data');
//       const toAssoc = new deep.String('to data');
//       const valueAssoc = new deep.String('value data');
//       const mainAssoc = new deep.String('main data');
      
//       // Set up relationships
//       mainAssoc.type = typeAssoc;
//       mainAssoc.from = fromAssoc;
//       mainAssoc.to = toAssoc;
//       mainAssoc.value = valueAssoc;
      
//       // Store all associations
//       typeAssoc.store(storage, deep.storageMarkers.oneTrue);
//       fromAssoc.store(storage, deep.storageMarkers.oneTrue);
//       toAssoc.store(storage, deep.storageMarkers.oneTrue);
//       valueAssoc.store(storage, deep.storageMarkers.oneTrue);
//       mainAssoc.store(storage, deep.storageMarkers.oneTrue);
      
//       const dump = _generateDump(deep, storage);
      
//       // Find the main association in dump
//       const mainLink = dump.links.find(link => link._id === mainAssoc._id);
      
//       expect(mainLink).toBeDefined();
//       expect(mainLink?.type_id).toBe(typeAssoc._id);
//       expect(mainLink?.from_id).toBe(fromAssoc._id);
//       expect(mainLink?.to_id).toBe(toAssoc._id);
//       expect(mainLink?.value_id).toBe(valueAssoc._id);
//       expect(mainLink?._created_at).toBeDefined();
//       expect(mainLink?._updated_at).toBeDefined();
//       expect(mainLink?._i).toBeDefined();
//     });
    
//     it('should include typed data (_string, _number, _function)', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create associations with typed data
//       const stringAssoc = new deep.String('test string value');
//       const numberAssoc = new deep.Number(42);
//       const functionAssoc = new deep.Function(() => 'test function');
      
//       // Store all associations
//       stringAssoc.store(storage, deep.storageMarkers.oneTrue);
//       numberAssoc.store(storage, deep.storageMarkers.oneTrue);
//       functionAssoc.store(storage, deep.storageMarkers.oneTrue);
      
//       const dump = _generateDump(deep, storage);
      
//       // Find associations in dump
//       const stringLink = dump.links.find(link => link._id === stringAssoc._id);
//       const numberLink = dump.links.find(link => link._id === numberAssoc._id);
//       const functionLink = dump.links.find(link => link._id === functionAssoc._id);
      
//       // Check string data
//       expect(stringLink).toBeDefined();
//       expect(stringLink?._string).toBe('test string value');
//       expect(stringLink?.type_id).toBe(deep.String._id);
      
//       // Check number data
//       expect(numberLink).toBeDefined();
//       expect(numberLink?._number).toBe(42);
//       expect(numberLink?.type_id).toBe(deep.Number._id);
      
//       // Check function data
//       expect(functionLink).toBeDefined();
//       expect(functionLink?._function).toBeDefined();
//       expect(typeof functionLink?._function).toBe('string');
//       expect(functionLink?.type_id).toBe(deep.Function._id);
//     });
    
//     it('should assign _i field correctly', () => {
//       // Create fresh deep instance to avoid interference from other tests
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Create several associations with different sequence numbers
//       const assoc1 = new deep();
//       const assoc2 = new deep();
//       const assoc3 = new deep();
      
//       // Store them to include in dump (without defaultMarking to keep test simple)
//       assoc1.store(storage, deep.storageMarkers.oneTrue);
//       assoc2.store(storage, deep.storageMarkers.oneTrue);
//       assoc3.store(storage, deep.storageMarkers.oneTrue);
      
//       // Generate dump
//       const dump = _generateDump(deep, storage);
      
//       // Find links by ID and check _i values
//       const assoc1Link = dump.links.find(l => l._id === assoc1._id);
//       const assoc2Link = dump.links.find(l => l._id === assoc2._id);
//       const assoc3Link = dump.links.find(l => l._id === assoc3._id);
      
//       // All links should be found
//       expect(assoc1Link).toBeDefined();
//       expect(assoc2Link).toBeDefined();
//       expect(assoc3Link).toBeDefined();
      
//       // Check that _i values match the association sequence numbers
//       expect(assoc1Link?._i).toBe(assoc1._i);
//       expect(assoc2Link?._i).toBe(assoc2._i);
//       expect(assoc3Link?._i).toBe(assoc3._i);
      
//       // Check that _i values are positive and unique for our associations
//       const ourIValues = [assoc1Link?._i, assoc2Link?._i, assoc3Link?._i].filter(i => i !== undefined);
//       expect(ourIValues.length).toBe(3);
//       expect(new Set(ourIValues).size).toBe(3); // All unique
//       expect(Math.min(...ourIValues)).toBeGreaterThan(0); // All positive
//     });
    
//     it('should handle complex association hierarchies', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // First store the types to satisfy dependency validation
//       deep.String.store(storage, deep.storageMarkers.typedTrue);
//       deep.Number.store(storage, deep.storageMarkers.typedTrue);
//       deep.Function.store(storage, deep.storageMarkers.typedTrue);
      
//       // Create simple test with typed data only (no complex dependencies)
//       const stringData = new deep.String('test string');
//       const numberData = new deep.Number(42);
//       const functionData = new deep.Function(() => 'test');
      
//       // Store all typed data instances
//       stringData.store(storage, deep.storageMarkers.oneTrue);
//       numberData.store(storage, deep.storageMarkers.oneTrue);
//       functionData.store(storage, deep.storageMarkers.oneTrue);
      
//       // Generate dump
//       const dump = _generateDump(deep, storage);
      
//       // Should include all stored typed data plus their types
//       const expectedIds = [stringData._id, numberData._id, functionData._id];
      
//       expect(dump.links.length).toBeGreaterThanOrEqual(expectedIds.length);
      
//       // Check that all expected associations are in dump
//       for (const expectedId of expectedIds) {
//         const link = dump.links.find(l => l._id === expectedId);
//         expect(link).toBeDefined();
//         expect(link?.type_id).toBeDefined();
//         expect(link?._created_at).toBeGreaterThan(0);
//         expect(link?._updated_at).toBeGreaterThan(0);
//         expect(link?._i).toBeGreaterThan(0);
//       }
      
//       // Check typed data is included correctly
//       const stringLink = dump.links.find(l => l._id === stringData._id);
//       expect(stringLink?._string).toBe('test string');
//       expect(stringLink?.type_id).toBe(deep.String._id);
      
//       const numberLink = dump.links.find(l => l._id === numberData._id);
//       expect(numberLink?._number).toBe(42);
//       expect(numberLink?.type_id).toBe(deep.Number._id);
      
//       const functionLink = dump.links.find(l => l._id === functionData._id);
//       expect(functionLink?._function).toBeDefined();
//       expect(functionLink?.type_id).toBe(deep.Function._id);
//     });
//   });

//   describe('_sortDump(links, needResortI?)', () => {
//     it('should sort links with no dependencies', () => {
//       const deep = newDeep();
      
//       // Create simple links with no dependencies
//       const links: StorageLink[] = [
//         {
//           _id: 'link1',
//           type_id: 'type1',
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'link2', 
//           type_id: 'type2',
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'link3',
//           type_id: 'type3', 
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Should maintain original order since no dependencies
//       expect(sorted).toHaveLength(3);
//       expect(sorted[0]._id).toBe('link1');
//       expect(sorted[1]._id).toBe('link2');
//       expect(sorted[2]._id).toBe('link3');
//     });
    
//     it('should sort by _i when needResortI=true', () => {
//       const deep = newDeep();
      
//       // Create links with _i in reverse order
//       const links: StorageLink[] = [
//         {
//           _id: 'link3',
//           type_id: 'type3',
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         },
//         {
//           _id: 'link1',
//           type_id: 'type1',
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'link2',
//           type_id: 'type2',
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         }
//       ];
      
//       const sorted = _sortDump(links, true);
      
//       // Should be sorted by _i field
//       expect(sorted).toHaveLength(3);
//       expect(sorted[0]._id).toBe('link1'); // _i: 1
//       expect(sorted[1]._id).toBe('link2'); // _i: 2
//       expect(sorted[2]._id).toBe('link3'); // _i: 3
//     });
    
//     it('should throw error when _i missing and needResortI=true', () => {
//       const deep = newDeep();
      
//       // Create links with missing _i field
//       const links: StorageLink[] = [
//         {
//           _id: 'link1',
//           type_id: 'type1',
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'link2',
//           type_id: 'type2',
//           _created_at: 2000,
//           _updated_at: 2000
//           // Missing _i field
//         }
//       ];
      
//       // Should throw error when needResortI=true and _i is missing
//       expect(() => {
//         _sortDump(links, true);
//       }).toThrow('Missing _i field for sorting on link link2');
//     });
    
//     it('should create correct dependency map', () => {
//       const deep = newDeep();
      
//       // Create links with various dependency patterns
//       const links: StorageLink[] = [
//         {
//           _id: 'independent',
//           type_id: 'someType',
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'dependent',
//           type_id: 'independent', // depends on 'independent'
//           from_id: 'independent',  // also depends on 'independent'
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'multiDependent',
//           type_id: 'dependent',     // depends on 'dependent'
//           from_id: 'independent',   // depends on 'independent'
//           to_id: 'dependent',       // depends on 'dependent'
//           value_id: 'independent',  // depends on 'independent'
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Should sort dependencies correctly
//       expect(sorted).toHaveLength(3);
      
//       // 'independent' should come first (no dependencies)
//       expect(sorted[0]._id).toBe('independent');
      
//       // 'dependent' should come second (depends on 'independent')
//       expect(sorted[1]._id).toBe('dependent');
      
//       // 'multiDependent' should come last (depends on both previous)
//       expect(sorted[2]._id).toBe('multiDependent');
//     });
    
//     it('should handle links with no dependencies', () => {
//       const deep = newDeep();
      
//       // Create multiple independent links (no dependencies between them)
//       const links: StorageLink[] = [
//         {
//           _id: 'link1',
//           type_id: 'externalType1', // external type, not in this dump
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'link2',
//           type_id: 'externalType2', // external type, not in this dump
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'link3',
//           type_id: 'externalType3', // external type, not in this dump
//           from_id: 'externalFrom',   // external reference
//           to_id: 'externalTo',       // external reference
//           value_id: 'externalValue', // external reference
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Should maintain original order since no internal dependencies
//       expect(sorted).toHaveLength(3);
//       expect(sorted[0]._id).toBe('link1');
//       expect(sorted[1]._id).toBe('link2');
//       expect(sorted[2]._id).toBe('link3');
      
//       // All links should be preserved exactly as they were
//       expect(sorted[0]).toEqual(links[0]);
//       expect(sorted[1]).toEqual(links[1]);
//       expect(sorted[2]).toEqual(links[2]);
//     });
    
//     it('should resolve simple dependency chains', () => {
//       const deep = newDeep();
      
//       // Create A->B->C chain (in reverse order to test sorting)
//       const links: StorageLink[] = [
//         {
//           _id: 'C',
//           type_id: 'B', // C depends on B
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         },
//         {
//           _id: 'A',
//           type_id: 'externalType', // A has no internal dependencies
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'B',
//           type_id: 'A', // B depends on A
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Should sort in dependency order: A -> B -> C
//       expect(sorted).toHaveLength(3);
//       expect(sorted[0]._id).toBe('A'); // No dependencies
//       expect(sorted[1]._id).toBe('B'); // Depends on A
//       expect(sorted[2]._id).toBe('C'); // Depends on B
      
//       // Verify the dependency chain is preserved
//       expect(sorted[1].type_id).toBe('A'); // B -> A
//       expect(sorted[2].type_id).toBe('B'); // C -> B
//     });
    
//     it('should handle complex dependency graphs', () => {
//       const deep = newDeep();
      
//       // Create complex dependency graph:
//       // Root -> [TypeA, TypeB]
//       // TypeA -> InstanceA
//       // TypeB -> InstanceB  
//       // InstanceA -> [InstanceB, Root] (multiple dependencies)
//       // InstanceB -> Root
//       const links: StorageLink[] = [
//         {
//           _id: 'InstanceA',
//           type_id: 'TypeA',
//           from_id: 'InstanceB', // depends on InstanceB
//           to_id: 'Root',        // depends on Root
//           _created_at: 5000,
//           _updated_at: 5000,
//           _i: 5
//         },
//         {
//           _id: 'TypeB',
//           type_id: 'Root',
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'Root',
//           type_id: 'externalType', // no internal dependencies
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'InstanceB',
//           type_id: 'TypeB',
//           value_id: 'Root', // depends on Root
//           _created_at: 4000,
//           _updated_at: 4000,
//           _i: 4
//         },
//         {
//           _id: 'TypeA',
//           type_id: 'Root',
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Should sort in dependency order
//       expect(sorted).toHaveLength(5);
      
//       // Root should come first (no dependencies)
//       expect(sorted[0]._id).toBe('Root');
      
//       // TypeA and TypeB should come after Root (both depend on Root)
//       const typeIndices = {
//         TypeA: sorted.findIndex(l => l._id === 'TypeA'),
//         TypeB: sorted.findIndex(l => l._id === 'TypeB'),
//         Root: 0
//       };
//       expect(typeIndices.TypeA).toBeGreaterThan(typeIndices.Root);
//       expect(typeIndices.TypeB).toBeGreaterThan(typeIndices.Root);
      
//       // InstanceB should come after TypeB
//       const instanceBIndex = sorted.findIndex(l => l._id === 'InstanceB');
//       expect(instanceBIndex).toBeGreaterThan(typeIndices.TypeB);
      
//       // InstanceA should come last (depends on TypeA, InstanceB, and Root)
//       const instanceAIndex = sorted.findIndex(l => l._id === 'InstanceA');
//       expect(instanceAIndex).toBeGreaterThan(typeIndices.TypeA);
//       expect(instanceAIndex).toBeGreaterThan(instanceBIndex);
//       expect(instanceAIndex).toBeGreaterThan(typeIndices.Root);
      
//       // Verify all links are preserved
//       expect(sorted.map(l => l._id).sort()).toEqual(['Root', 'TypeA', 'TypeB', 'InstanceA', 'InstanceB'].sort());
//     });
    
//     it('should detect circular dependencies', () => {
//       const deep = newDeep();
      
//       // Create links with circular dependency: A -> B -> C -> A
//       const links: StorageLink[] = [
//         {
//           _id: 'linkA',
//           type_id: 'linkB', // A depends on B
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         },
//         {
//           _id: 'linkB',
//           type_id: 'linkC', // B depends on C
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'linkC',
//           type_id: 'linkA', // C depends on A - creates cycle!
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         }
//       ];
      
//       debug('=== Testing circular dependency ===');
//       debug('Links:', links.map(l => `${l._id} -> ${l.type_id}`));
      
//       // Should throw error about circular dependency
//       expect(() => {
//         const result = _sortDump(links);
//         debug('Unexpected success! Result:', result.map(l => l._id));
//       }).toThrow('Circular dependency detected involving link');
//     });
    
//     it('should return topologically sorted result', () => {
//       const deep = newDeep();
      
//       // Create a comprehensive test with multiple dependency patterns
//       const links: StorageLink[] = [
//         // Level 3: depends on level 2
//         {
//           _id: 'final',
//           type_id: 'intermediate1',
//           from_id: 'intermediate2',
//           to_id: 'base1',
//           value_id: 'base2',
//           _created_at: 6000,
//           _updated_at: 6000,
//           _i: 6
//         },
//         // Level 2: depends on level 1
//         {
//           _id: 'intermediate2',
//           type_id: 'base2',
//           from_id: 'base1',
//           _created_at: 4000,
//           _updated_at: 4000,
//           _i: 4
//         },
//         {
//           _id: 'intermediate1',
//           type_id: 'base1',
//           value_id: 'base2',
//           _created_at: 3000,
//           _updated_at: 3000,
//           _i: 3
//         },
//         // Level 1: no internal dependencies
//         {
//           _id: 'base2',
//           type_id: 'externalType2',
//           _created_at: 2000,
//           _updated_at: 2000,
//           _i: 2
//         },
//         {
//           _id: 'base1',
//           type_id: 'externalType1',
//           _created_at: 1000,
//           _updated_at: 1000,
//           _i: 1
//         }
//       ];
      
//       const sorted = _sortDump(links);
      
//       // Verify topological ordering
//       expect(sorted).toHaveLength(5);
      
//       // Create position map for easier checking
//       const positions = new Map<string, number>();
//       sorted.forEach((link, index) => {
//         positions.set(link._id, index);
//       });
      
//       // Level 1 (base) should come first
//       expect(positions.get('base1')).toBeLessThan(positions.get('intermediate1')!);
//       expect(positions.get('base1')).toBeLessThan(positions.get('intermediate2')!);
//       expect(positions.get('base1')).toBeLessThan(positions.get('final')!);
      
//       expect(positions.get('base2')).toBeLessThan(positions.get('intermediate1')!);
//       expect(positions.get('base2')).toBeLessThan(positions.get('intermediate2')!);
//       expect(positions.get('base2')).toBeLessThan(positions.get('final')!);
      
//       // Level 2 (intermediate) should come before level 3
//       expect(positions.get('intermediate1')).toBeLessThan(positions.get('final')!);
//       expect(positions.get('intermediate2')).toBeLessThan(positions.get('final')!);
      
//       // Verify specific dependencies are respected
//       // intermediate1 depends on base1 and base2
//       expect(positions.get('base1')).toBeLessThan(positions.get('intermediate1')!);
//       expect(positions.get('base2')).toBeLessThan(positions.get('intermediate1')!);
      
//       // intermediate2 depends on base1 and base2
//       expect(positions.get('base1')).toBeLessThan(positions.get('intermediate2')!);
//       expect(positions.get('base2')).toBeLessThan(positions.get('intermediate2')!);
      
//       // final depends on all others
//       expect(positions.get('intermediate1')).toBeLessThan(positions.get('final')!);
//       expect(positions.get('intermediate2')).toBeLessThan(positions.get('final')!);
//       expect(positions.get('base1')).toBeLessThan(positions.get('final')!);
//       expect(positions.get('base2')).toBeLessThan(positions.get('final')!);
//     });
//   });

//   describe('_applyDelta(deep, delta, storage)', () => {
//     it('should apply insert operation correctly', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create a new ID for association to insert (don't create the association yet)
//       const newAssociationId = 'test-association-id';
//       const delta: StorageDelta = {
//         operation: 'insert',
//         link: {
//           _id: newAssociationId,
//           type_id: deep._id,
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       // Apply delta
//       _applyDelta(deep, delta, storage);
      
//       // Check that association was created and marked
//       expect(deep._ids.has(newAssociationId)).toBe(true);
//       expect(new deep(newAssociationId).isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
//     });
    
//     it('should apply update operation correctly - time changes only with semantic changes', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create and store an association
//       const association = new deep();
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       const oldUpdatedAt = association._updated_at;
      
//       // Test 1: Update without semantic changes - _updated_at should NOT change
//       const delta1: StorageDelta = {
//         operation: 'update',
//         id: association._id,
//         link: {
//           _id: association._id,
//           type_id: deep._id, // Same as current type
//           _created_at: association._created_at,
//           _updated_at: Date.now() + 1000, // New timestamp
//           _i: association._i
//         }
//       };
      
//       _applyDelta(deep, delta1, storage);
      
//       // _updated_at should remain unchanged because no semantic changes occurred
//       expect(association._updated_at).toBe(oldUpdatedAt);
      
//       // Test 2: Update with semantic changes - _updated_at should change
//       const newType = new deep();
//       newType.store(storage, deep.storageMarkers.oneTrue);
//       const newUpdatedAt = Date.now() + 2000;
      
//       const delta2: StorageDelta = {
//         operation: 'update',
//         id: association._id,
//         link: {
//           _id: association._id,
//           type_id: newType._id, // Different type - semantic change
//           _created_at: association._created_at,
//           _updated_at: newUpdatedAt,
//           _i: association._i
//         }
//       };
      
//       _applyDelta(deep, delta2, storage);
      
//       // _updated_at should change because semantic change occurred
//       expect(association._updated_at).toBe(newUpdatedAt);
//       expect(association._updated_at).not.toBe(oldUpdatedAt);
//     });
    
//     it('should apply delete operation correctly', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create and store an association
//       const association = new deep();
//       association.store(storage, deep.storageMarkers.oneTrue);
//       const associationId = association._id;
      
//       const delta: StorageDelta = {
//         operation: 'delete',
//         id: associationId
//       };
      
//       // Apply delta
//       _applyDelta(deep, delta, storage);
      
//       // Check that association was removed from storage
//       expect(new deep(associationId).isStored(storage)).toBe(false);
//     });
    
//     it('should mark deep._id associations as typedTrue when not in markers', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create association ID with type_id = deep._id (don't create association yet)
//       const associationId = 'test-typed-association-id';
//       const delta: StorageDelta = {
//         operation: 'insert',
//         link: {
//           _id: associationId,
//           type_id: deep._id, // This should get typedTrue marker
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       // Apply delta
//       _applyDelta(deep, delta, storage);
      
//       // Check that it got typedTrue marker
//       expect(new deep(associationId).isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
//     });
    
//     it('should validate referenced IDs exist for non-deep._id associations', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create type that exists in storage
//       const existingType = new deep();
//       existingType.store(storage, deep.storageMarkers.oneTrue);
      
//       // Try to insert association with valid type reference (don't create association yet)
//       const associationId = 'test-valid-ref-association-id';
//       const delta: StorageDelta = {
//         operation: 'insert',
//         link: {
//           _id: associationId,
//           type_id: existingType._id, // Valid reference
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       // Should not throw
//       expect(() => {
//         _applyDelta(deep, delta, storage);
//       }).not.toThrow();
//     });
    
//     it('should throw error when referenced IDs missing', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Try to insert association with non-existent type reference
//       const associationId = 'test-invalid-ref-association-id';
//       const nonExistentTypeId = 'non-existent-type-id';
      
//       const delta: StorageDelta = {
//         operation: 'insert',
//         link: {
//           _id: associationId,
//           type_id: nonExistentTypeId, // Invalid reference
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       // Should throw error
//       expect(() => {
//         _applyDelta(deep, delta, storage);
//       }).toThrow('not stored in the same storage');
//     });
    
//     it('should handle typed data correctly', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create string association with proper string argument
//       const stringAssociation = new deep.String('initial value');
//       stringAssociation.store(storage, deep.storageMarkers.oneTrue);
      
//       const delta: StorageDelta = {
//         operation: 'update',
//         id: stringAssociation._id,
//         link: {
//           _id: stringAssociation._id,
//           type_id: deep.String._id,
//           _created_at: stringAssociation._created_at,
//           _updated_at: Date.now(),
//           _i: stringAssociation._i,
//           _string: 'test string value'
//         }
//       };
      
//       // Apply delta
//       _applyDelta(deep, delta, storage);
      
//       // Check that data was set correctly
//       expect(stringAssociation.data).toBe('test string value');
//     });
//   });

//   describe('_applySubscription(deep, dump, storage)', () => {
//     it('should compare updated_at timestamps correctly - updates only with semantic changes', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create and store an association
//       const association = new deep();
//       association.store(storage, deep.storageMarkers.oneTrue);
//       const originalUpdatedAt = association._updated_at;
      
//       // Test 1: Dump with newer timestamp but no semantic changes
//       const newerTimestamp1 = originalUpdatedAt + 1000;
//       const dump1: StorageDump = {
//         links: [{
//           _id: association._id,
//           type_id: deep._id, // Same type - no semantic change
//           _created_at: association._created_at,
//           _updated_at: newerTimestamp1,
//           _i: 1
//         }]
//       };
      
//       _applySubscription(deep, dump1, storage);
      
//       // Should not update because no semantic changes despite newer timestamp
//       expect(association._updated_at).toBe(originalUpdatedAt);
      
//       // Test 2: Dump with semantic changes should update regardless of timestamp logic
//       const newType = new deep();
//       newType.store(storage, deep.storageMarkers.oneTrue);
//       const newerTimestamp2 = originalUpdatedAt + 2000;

//       debug('association._id', association._id);
//       debug('association._updated_at', association._updated_at);
//       debug('newType._id', newType._id);
//       debug('newType._updated_at', newType._updated_at);
      
//       const dump2: StorageDump = {
//         links: [{
//           _id: association._id,
//           type_id: newType._id, // Different type - semantic change
//           _created_at: association._created_at,
//           _updated_at: newerTimestamp2,
//           _i: 1
//         }, {
//           // if delete newType from dump2 then association will delete from deep after applySubscription
//           _id: newType._id,
//           type_id: deep._id,
//           _created_at: newType._created_at,
//           _updated_at: newerTimestamp2,
//           _i: 2
//         }]
//       };

//       _applySubscription(deep, dump2, storage);

//       debug('association._id', association._id);
//       debug('association._updated_at', association._updated_at);
      
//       // Should update because semantic change occurred
//       expect(association._updated_at).toBe(newerTimestamp2);
//       expect(association._updated_at).not.toBe(originalUpdatedAt);
//     });
    
//     it('should use _sortDump for dependency-aware processing', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create dump with dependencies (B depends on A)
//       const dump: StorageDump = {
//         links: [
//           {
//             _id: 'link-b',
//             type_id: 'link-a', // B depends on A
//             _created_at: Date.now(),
//             _updated_at: Date.now(),
//             _i: 2
//           },
//           {
//             _id: 'link-a',
//             type_id: deep._id,
//             _created_at: Date.now(),
//             _updated_at: Date.now(),
//             _i: 1
//           }
//         ]
//       };
      
//       // Should not throw (dependencies resolved correctly)
//       expect(() => {
//         _applySubscription(deep, dump, storage);
//       }).not.toThrow();
      
//       // Check that both associations were created
//       expect(deep._ids.has('link-a')).toBe(true);
//       expect(deep._ids.has('link-b')).toBe(true);
//     });
    
//     it('should call _applyDelta for each changed association', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create dump with multiple new associations
//       const dump: StorageDump = {
//         links: [
//           {
//             _id: 'new-link-1',
//             type_id: deep._id,
//             _created_at: Date.now(),
//             _updated_at: Date.now(),
//             _i: 1
//           },
//           {
//             _id: 'new-link-2',
//             type_id: deep._id,
//             _created_at: Date.now(),
//             _updated_at: Date.now(),
//             _i: 2
//           }
//         ]
//       };
      
//       // Apply subscription
//       _applySubscription(deep, dump, storage);
      
//       // Check that all associations were created
//       expect(deep._ids.has('new-link-1')).toBe(true);
//       expect(deep._ids.has('new-link-2')).toBe(true);
//     });
    
//     it('should handle empty dumps', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       const emptyDump: StorageDump = {
//         links: []
//       };
      
//       // Should not throw
//       expect(() => {
//         _applySubscription(deep, emptyDump, storage);
//       }).not.toThrow();
//     });
    
//     it('should handle large dumps efficiently', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create large dump (100 associations)
//       const links: StorageLink[] = [];
//       for (let i = 0; i < 100; i++) {
//         links.push({
//           _id: `large-link-${i}`,
//           type_id: deep._id,
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: i + 1
//         });
//       }
      
//       const largeDump: StorageDump = { links };
      
//       const startTime = Date.now();
//       _applySubscription(deep, largeDump, storage);
//       const endTime = Date.now();
      
//       // Should complete in reasonable time (less than 1 second)
//       expect(endTime - startTime).toBeLessThan(1000);
      
//       // Check that all associations were created
//       for (let i = 0; i < 100; i++) {
//         expect(deep._ids.has(`large-link-${i}`)).toBe(true);
//       }
//     });
    
//     it('should skip unchanged associations', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create and store an association
//       const association = new deep();
//       association.store(storage, deep.storageMarkers.oneTrue);
//       const originalUpdatedAt = association._updated_at;
      
//       // Create dump with same timestamp (unchanged)
//       const dump: StorageDump = {
//         links: [{
//           _id: association._id,
//           type_id: deep._id,
//           _created_at: association._created_at,
//           _updated_at: originalUpdatedAt, // Same timestamp
//           _i: 1
//         }]
//       };
      
//       // Apply subscription
//       _applySubscription(deep, dump, storage);
      
//       // Check that association was not modified
//       expect(association._updated_at).toBe(originalUpdatedAt);
//     });
//   });

//   describe('defaultMarking(deep, storage)', () => {
//     it('should mark deep with oneTrue marker', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Before marking
//       expect(deep.isStored(storage)).toBe(false);
      
//       // Apply default marking
//       defaultMarking(deep, storage);
      
//       // After marking
//       expect(deep.isStored(storage)).toBe(true);
//       expect(deep.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
//     });
    
//     it('should not automatically mark system types but allow manual marking with typedTrue', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking
//       defaultMarking(deep, storage);
      
//       // System types should NOT be automatically marked with typedTrue
//       expect(deep.String.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(deep.Number.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(deep.Function.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      
//       // But we can manually mark them with typedTrue
//       deep.String.store(storage, deep.storageMarkers.typedTrue);
//       expect(deep.String.isStored(storage, deep.storageMarkers.typedTrue)).toBe(true);
      
//       // And instances should inherit storage through type hierarchy when typedTrue is used
//       const stringInstance = new deep.String('test');
//       expect(stringInstance.isStored(storage)).toBe(true); // Inherits from deep.String which is marked with typedTrue
//       expect(stringInstance.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false); // But doesn't have direct typedTrue marker
//     });
    
//     it('should demonstrate new defaultMarking logic - only oneTrue for deep._id types', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Before defaultMarking, system types should not be marked
//       expect(deep.String.isStored(storage)).toBe(false);
//       expect(deep.Number.isStored(storage)).toBe(false);
//       expect(deep.Function.isStored(storage)).toBe(false);
//       expect(deep.Set.isStored(storage)).toBe(false);
//       expect(deep.Field.isStored(storage)).toBe(false);
//       expect(deep.Method.isStored(storage)).toBe(false);
//       expect(deep.Alive.isStored(storage)).toBe(false);
      
//       // Apply default marking
//       defaultMarking(deep, storage);
      
//       // After defaultMarking, system types are NOT automatically marked
//       expect(deep.String.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(deep.Number.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(deep.Function.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      
//       // But deep itself is marked with oneTrue
//       expect(deep.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      
//       // Only associations with type_id === deep._id are marked with oneTrue by default
//       const customType = new deep(); // This has type_id = deep._id
//       expect(customType.type_id).toBe(deep._id);
//       // Custom types created after defaultMarking should be marked if they have type_id = deep._id
//       // But they need to be explicitly stored
//       expect(customType.isStored(storage)).toBe(false);
      
//       // However, we can demonstrate typedTrue hierarchy by manually marking a type
//       deep.String.store(storage, deep.storageMarkers.typedTrue);
//       const stringInstance = new deep.String('test');
//       expect(stringInstance.isStored(storage)).toBe(true); // Inherits through type hierarchy
//     });
    
//     it('should demonstrate storage inheritance and manual marking behavior', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking
//       defaultMarking(deep, storage);
      
//       // Create new associations after marking
//       const newAssociation = new deep();
//       const newCustomType = new deep();
//       const newInstance = new newCustomType();
      
//       // New associations should NOT be automatically marked
//       expect(newAssociation.isStored(storage)).toBe(false);
//       expect(newCustomType.isStored(storage)).toBe(false);
//       expect(newInstance.isStored(storage)).toBe(false);
      
//       // They should not have any storage markers
//       expect(newAssociation.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
//       expect(newAssociation.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(newCustomType.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
//       expect(newCustomType.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
//       expect(newInstance.isStored(storage, deep.storageMarkers.oneTrue)).toBe(false);
//       expect(newInstance.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false);
      
//       // But they can be manually marked
//       newAssociation.store(storage, deep.storageMarkers.oneTrue);
//       expect(newAssociation.isStored(storage, deep.storageMarkers.oneTrue)).toBe(true);
      
//       // System types are NOT automatically marked, so instances don't inherit by default
//       const newString = new deep.String('test');
//       expect(newString.isStored(storage)).toBe(false); // No inheritance because deep.String is not marked
      
//       // But if we manually mark the type with typedTrue, instances inherit
//       deep.String.store(storage, deep.storageMarkers.typedTrue);
//       const anotherString = new deep.String('test2');
//       expect(anotherString.isStored(storage)).toBe(true); // Inherits from deep.String which is now marked with typedTrue
//       expect(anotherString.isStored(storage, deep.storageMarkers.typedTrue)).toBe(false); // But doesn't have direct typedTrue marker
//     });
//   });

//   // === STORAGE SYSTEM TESTS ===
  
//   describe('Storage Creation and Registration', () => {
//     it('should create Storage as Alive instance', () => {
//       const deep = newDeep();
      
//       // Check that Storage exists and is an Alive instance
//       expect(deep.Storage).toBeDefined();
//       expect(deep.Storage.type_id).toBe(deep.Alive.AliveInstance._id);
//     });
    
//     it('should register Storage in deep context', () => {
//       const deep = newDeep();
      
//       // Check that Storage is registered in context
//       expect(deep._contain.Storage).toBeDefined();
//       expect(deep._contain.Storage).toBe(deep.Storage);
//     });
//   });

//   describe('Storage Methods (state keys)', () => {
//     describe('generateDump()', () => {
//       it('should use _generateDump internally', () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         // Create some associations
//         const association = new deep();
//         association.store(storage, deep.storageMarkers.oneTrue);
        
//         // Call generateDump method
//         const dump = storage.state.generateDump();
        
//         // Should return StorageDump format
//         expect(dump).toBeDefined();
//         expect(dump.links).toBeDefined();
//         expect(Array.isArray(dump.links)).toBe(true);
//       });
      
//       it('should return correct StorageDump format', () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         // Create typed association
//         const stringAssoc = new deep.String('test');
//         stringAssoc.store(storage, deep.storageMarkers.oneTrue);
        
//         const dump = storage.state.generateDump();
        
//         // Check format
//         expect(dump.links.length).toBeGreaterThan(0);
//         const link = dump.links.find(l => l._id === stringAssoc._id);
//         expect(link).toBeDefined();
//         expect(link!.type_id).toBe(deep.String._id);
//         expect(link!._string).toBe('test');
//       });
//     });
    
//     describe('watch()', () => {
//       it('should set up event listeners for storage events', () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
        
//         // watch() should be callable
//         expect(typeof storage.state.watch).toBe('function');
        
//         // Should not throw when called
//         expect(() => {
//           storage.state.watch();
//         }).not.toThrow();
//       });
      
//       it('should call onLinkInsert when associations are stored', async () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         let insertedLink: StorageLink | null = null;
//         storage.state.onLinkInsert = (link: StorageLink) => {
//           insertedLink = link;
//         };

//         await storage.promise;
        
//         // Start watching for events
//         storage.state.watch();

//         await storage.promise;
        
//         // Create and store an association
//         const association = new deep.String('test-data');
//         association.store(storage, deep.storageMarkers.oneTrue);
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Check that onLinkInsert was called
//         expect(insertedLink).not.toBeNull();
//         expect(insertedLink!._id).toBe(association._id);
//         expect(insertedLink!.type_id).toBe(deep.String._id);
//         expect(insertedLink!._string).toBe('test-data');
//       });
      
//       it('should call onLinkDelete when associations are unstored', async () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         let deletedLink: StorageLink | null = null;
//         storage.state.onLinkDelete = (link: StorageLink) => {
//           deletedLink = link;
//         };
        
//         // Start watching for events
//         storage.state.watch();
        
//         // Create and store an association
//         const association = new deep();
//         association.type = deep.String;
//         association.store(storage, deep.storageMarkers.oneTrue);
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Reset for delete test
//         deletedLink = null;
        
//         // Unstore the association
//         association.unstore(storage);
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Check that onLinkDelete was called
//         expect(deletedLink).not.toBeNull();
//         expect(deletedLink!._id).toBe(association._id);
//       });
      
//       it('should call onLinkUpdate when associations change', async () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         let updatedLink: StorageLink | null = null;
//         storage.state.onLinkUpdate = (link: StorageLink) => {
//           updatedLink = link;
//         };
        
//         // Start watching for events
//         storage.state.watch();
        
//         // Create and store an association
//         const association = new deep();
//         association.type = deep.String;
//         association.store(storage, deep.storageMarkers.oneTrue);
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Reset for update test
//         updatedLink = null;
        
//         // Change the association (this should trigger onLinkUpdate)
//         const newType = new deep();
//         newType.store(storage, deep.storageMarkers.oneTrue);
//         association.type = newType;
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Check that onLinkUpdate was called
//         expect(updatedLink).not.toBeNull();
//         expect(updatedLink!._id).toBe(association._id);
//         expect(updatedLink!.type_id).toBe(newType._id);
//       });
      
//       it('should call onDataChanged when data changes', async () => {
//         const deep = newDeep();
//         const storage = new deep.Storage();
//         defaultMarking(deep, storage);
        
//         let dataChangedLink: StorageLink | null = null;
//         storage.state.onDataChanged = (link: StorageLink) => {
//           dataChangedLink = link;
//         };
        
//         // Start watching for events
//         storage.state.watch();
        
//         // Create and store an association with data
//         const association = new deep();
//         association.type = deep.String;
//         association.data = 'initial-data';
//         association.store(storage, deep.storageMarkers.oneTrue);
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Reset for data change test
//         dataChangedLink = null;
        
//         // Change the data
//         association.data = 'updated-data';
        
//         // Wait a bit for async event processing
//         await new Promise(resolve => setTimeout(resolve, 10));
        
//         // Check that onDataChanged was called
//         expect(dataChangedLink).not.toBeNull();
//         expect(dataChangedLink!._id).toBe(association._id);
//         expect(dataChangedLink!._string).toBe('updated-data');
//       });
//     });
//   });

//   describe('Storage Event Handlers', () => {
//     it('should initialize event handlers as undefined', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Check that handlers are initially undefined
//       expect(storage.state.onLinkInsert).toBeUndefined();
//       expect(storage.state.onLinkDelete).toBeUndefined();
//       expect(storage.state.onLinkUpdate).toBeUndefined();
//       expect(storage.state.onDataChanged).toBeUndefined();
//     });
    
//     it('should allow setting custom event handlers', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       const insertHandler = (link: StorageLink) => {};
//       const deleteHandler = (link: StorageLink) => {};
//       const updateHandler = (link: StorageLink) => {};
//       const dataHandler = (link: StorageLink) => {};
      
//       storage.state.onLinkInsert = insertHandler;
//       storage.state.onLinkDelete = deleteHandler;
//       storage.state.onLinkUpdate = updateHandler;
//       storage.state.onDataChanged = dataHandler;
      
//       expect(storage.state.onLinkInsert).toBe(insertHandler);
//       expect(storage.state.onLinkDelete).toBe(deleteHandler);
//       expect(storage.state.onLinkUpdate).toBe(updateHandler);
//       expect(storage.state.onDataChanged).toBe(dataHandler);
//     });
//   });

//   describe('Integration with Existing Storage System', () => {
//     it('should work alongside existing storages system', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Test that both systems coexist
//       expect(deep.storageMarkers).toBeDefined();
//       expect(deep.Storage).toBeDefined();
      
//       // Test that associations can be stored using both systems
//       const association = new deep();
      
//       // Use existing storage system
//       association.store(storage, deep.storageMarkers.oneTrue);
//       expect(association.isStored(storage)).toBe(true);
      
//       // Use new storage system
//       defaultMarking(deep, storage);
//       expect(deep.isStored(storage)).toBe(true);
//     });
    
//     it('should not break existing storage functionality', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Test existing storage methods still work
//       const association = new deep();
      
//       // Basic storage operations
//       association.store(storage, deep.storageMarkers.oneTrue);
//       expect(association.isStored(storage)).toBe(true);
      
//       const markers = association.storages(storage);
//       expect(Array.isArray(markers)).toBe(true);
      
//       association.unstore(storage);
//       expect(association.isStored(storage)).toBe(false);
//     });
//   });

//   describe('Interfaces', () => {
//     it('should define StorageDump interface correctly', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       const dump = _generateDump(deep, storage);
      
//       // Check StorageDump structure
//       expect(dump).toBeDefined();
//       expect(typeof dump).toBe('object');
//       expect('links' in dump).toBe(true);
//       expect(Array.isArray(dump.links)).toBe(true);
      
//       // ids field is optional
//       if ('ids' in dump) {
//         expect(Array.isArray(dump.ids)).toBe(true);
//       }
//     });
    
//     it('should define StorageLink interface correctly', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
//       defaultMarking(deep, storage);
      
//       // Create a typed association
//       const stringAssoc = new deep.String('test');
//       stringAssoc.store(storage, deep.storageMarkers.oneTrue);
      
//       const dump = _generateDump(deep, storage);
//       const link = dump.links.find(l => l._id === stringAssoc._id);
      
//       expect(link).toBeDefined();
      
//       // Check required fields
//       expect(typeof link!._id).toBe('string');
//       expect(typeof link!.type_id).toBe('string');
//       expect(typeof link!._created_at).toBe('number');
//       expect(typeof link!._updated_at).toBe('number');
      
//       // Check optional fields exist when relevant
//       expect(typeof link!._string).toBe('string');
//       expect(link!._string).toBe('test');
//     });
    
//     it('should define StorageDelta interface correctly', () => {
//       // Test delta structure
//       const insertDelta = {
//         operation: 'insert' as const,
//         link: {
//           _id: 'test-id',
//           type_id: 'test-type',
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       const updateDelta = {
//         operation: 'update' as const,
//         id: 'test-id',
//         link: {
//           _id: 'test-id',
//           type_id: 'test-type',
//           _created_at: Date.now(),
//           _updated_at: Date.now(),
//           _i: 1
//         }
//       };
      
//       const deleteDelta = {
//         operation: 'delete' as const,
//         id: 'test-id'
//       };
      
//       // Check that delter have correct structure
//       expect(insertDelta.operation).toBe('insert');
//       expect(deleteDelta.operation).toBe('delete');
//       expect(updateDelta.operation).toBe('update');
//     });
//   });
// });

// // === STORAGE ALIVE FUNCTION TESTS ===

// describe.skip('Storage Alive Function', () => {
//   describe('Storage creation and registration', () => {
//     it('should create Storage as Alive instance', () => {
//       const deep = newDeep();
      
//       expect(deep.Storage).toBeDefined();
//       expect(deep.Storage.type_id).toBe(deep.Alive.AliveInstance._id);
//     });
    
//     it('should register Storage in deep context', () => {
//       const deep = newDeep();
      
//       expect(deep._contain.Storage).toBeDefined();
//       expect(deep._contain.Storage).toBe(deep.Storage);
//     });
//   });

//   describe('Storage Methods (generateDump, watch)', () => {
//     it('should have generateDump method in state', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       expect(storage.state.generateDump).toBeDefined();
//       expect(typeof storage.state.generateDump).toBe('function');
      
//       const dump = storage.state.generateDump();
//       expect(dump).toBeDefined();
//       expect(dump.links).toBeDefined();
//       expect(Array.isArray(dump.links)).toBe(true);
//     });
    
//     it('should have watch method in state', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       expect(storage.state.watch).toBeDefined();
//       expect(typeof storage.state.watch).toBe('function');
      
//       // Should not throw when called
//       expect(() => storage.state.watch()).not.toThrow();
//     });
    
//     it('should set up event disposers when watch is called', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Initially no disposers
//       expect(storage.state._eventDisposers).toBeUndefined();
      
//       // Call watch
//       storage.state.watch();
      
//       // Should have disposers array
//       expect(storage.state._eventDisposers).toBeDefined();
//       expect(Array.isArray(storage.state._eventDisposers)).toBe(true);
//       expect(storage.state._eventDisposers.length).toBeGreaterThan(0);
//     });
    
//     it('should listen to storeAdded events when watch is active', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Verify events are defined
//       expect(deep.events.storeAdded).toBeDefined();
      
//       let eventReceived = false;
//       let eventPayload: any = null;
      
//       // Set up event handler
//       storage.state.onLinkInsert = (storageLink: StorageLink) => {
//         eventReceived = true;
//         eventPayload = storageLink;
//       };
      
//       // Start watching
//       storage.state.watch();
      
//       // Apply default marking first  
//       defaultMarking(deep, storage);
      
//       // Create and store association to trigger event
//       const association = new deep.String('test data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Check that event was handled
//       expect(eventReceived).toBe(true);
//       expect(eventPayload).toBeDefined();
//       expect(eventPayload._id).toBe(association._id);
//     });
    
//     it('should listen to storeRemoved events when watch is active', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Verify events are defined
//       expect(deep.events.storeRemoved).toBeDefined();
      
//       let eventReceived = false;
//       let eventPayload: any = null;
      
//       // Set up event handler
//       storage.state.onLinkDelete = (storageLink: StorageLink) => {
//         eventReceived = true;
//         eventPayload = storageLink;
//       };
      
//       // Start watching
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('test data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       eventReceived = false;
//       eventPayload = null;
      
//       // Remove association to trigger event  
//       association.unstore(storage);
      
//       // Check that event was handled
//       expect(eventReceived).toBe(true);
//       expect(eventPayload).toBeDefined();
//       expect(eventPayload._id).toBe(association._id);
//     });
    
//     it('should listen to globalLinkChanged events when watch is active', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Verify events are defined
//       expect(deep.events.globalLinkChanged).toBeDefined();
      
//       let eventReceived = false;
//       let eventPayload: any = null;
//       let targetAssociationId: string;
      
//       // Set up event handler
//       storage.state.onLinkUpdate = (storageLink: StorageLink) => {
//         // Only track updates for our target association
//         if (storageLink._id === targetAssociationId) {
//           eventReceived = true;
//           eventPayload = storageLink;
//         }
//       };
      
//       // Start watching
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('test data');
//       targetAssociationId = association._id;
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       eventReceived = false;
//       eventPayload = null;
      
//       // Update association to trigger globalLinkChanged event
//       const newType = new deep.String('new type');
//       newType.store(storage, deep.storageMarkers.oneTrue);
//       association.type = newType;
      
//       // Check that event was handled
//       expect(eventReceived).toBe(true);
//       expect(eventPayload).toBeDefined();
//       expect(eventPayload._id).toBe(association._id);
//     });
    
//     it('should listen to globalDataChanged events when watch is active', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Verify events are defined
//       expect(deep.events.globalDataChanged).toBeDefined();
      
//       let eventReceived = false;
//       let eventPayload: any = null;
      
//       // Set up event handler
//       storage.state.onDataChanged = (storageLink: StorageLink) => {
//         eventReceived = true;
//         eventPayload = storageLink;
//       };
      
//       // Start watching
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('initial data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       eventReceived = false;
//       eventPayload = null;
      
//       // Update data to trigger globalDataChanged event
//       association.data = 'updated data';
      
//       // Check that event was handled
//       expect(eventReceived).toBe(true);
//       expect(eventPayload).toBeDefined();
//       expect(eventPayload._id).toBe(association._id);
//       expect(eventPayload._string).toBe('updated data');
//     });
//   });

//   describe('Storage Event Handlers initialization', () => {
//     it('should initialize event handlers as undefined', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       expect(storage.state.onLinkInsert).toBeUndefined();
//       expect(storage.state.onLinkDelete).toBeUndefined();
//       expect(storage.state.onLinkUpdate).toBeUndefined();
//       expect(storage.state.onDataChanged).toBeUndefined();
//     });
    
//     it('should allow setting event handlers', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       const insertHandler = (link: StorageLink) => {};
//       const deleteHandler = (link: StorageLink) => {};
//       const updateHandler = (link: StorageLink) => {};
//       const dataHandler = (link: StorageLink) => {};
      
//       storage.state.onLinkInsert = insertHandler;
//       storage.state.onLinkDelete = deleteHandler;
//       storage.state.onLinkUpdate = updateHandler;
//       storage.state.onDataChanged = dataHandler;
      
//       expect(storage.state.onLinkInsert).toBe(insertHandler);
//       expect(storage.state.onLinkDelete).toBe(deleteHandler);
//       expect(storage.state.onLinkUpdate).toBe(updateHandler);
//       expect(storage.state.onDataChanged).toBe(dataHandler);
//     });
    
//     it('should call onLinkInsert when association is stored', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       let insertCalled = false;
//       let insertedLink: StorageLink | null = null;
      
//       storage.state.onLinkInsert = (storageLink: StorageLink) => {
//         insertCalled = true;
//         insertedLink = storageLink;
//       };
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('test data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Should have called the handler
//       expect(insertCalled).toBe(true);
//       expect(insertedLink).toBeDefined();
//       expect(insertedLink).not.toBeNull();
//       expect(insertedLink!._id).toBe(association._id);
//       expect(insertedLink!.type_id).toBe(deep.String._id);
//       expect(insertedLink!._string).toBe('test data');
//     });
    
//     it('should call onLinkDelete when association is unstored', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       let deleteCalled = false;
//       let deletedLink: StorageLink | null = null;
      
//       storage.state.onLinkDelete = (storageLink: StorageLink) => {
//         deleteCalled = true;
//         deletedLink = storageLink;
//       };
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('test data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       deleteCalled = false;
//       deletedLink = null;
      
//       // Unstore association
//       association.unstore(storage);
      
//       // Should have called the handler
//       expect(deleteCalled).toBe(true);
//       expect(deletedLink).toBeDefined();
//       expect(deletedLink).not.toBeNull();
//       expect(deletedLink!._id).toBe(association._id);
//     });
    
//     it('should call onLinkUpdate when stored association is updated', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       let updateCalled = false;
//       let updatedLink: StorageLink | null = null;
//       let targetAssociationId: string;
      
//       storage.state.onLinkUpdate = (storageLink: StorageLink) => {
//         // Only track updates for our target association
//         if (storageLink._id === targetAssociationId) {
//           updateCalled = true;
//           updatedLink = storageLink;
//         }
//       };
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('initial data');
//       targetAssociationId = association._id;
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       updateCalled = false;
//       updatedLink = null;
      
//       // Update association (this should trigger globalLinkChanged event)
//       const newType = new deep.String('new type');
//       newType.store(storage, deep.storageMarkers.oneTrue);
//       association.type = newType;
      
//       // Should have called the handler
//       expect(updateCalled).toBe(true);
//       expect(updatedLink).toBeDefined();
//       expect(updatedLink).not.toBeNull();
//       expect(updatedLink!._id).toBe(association._id);
//       expect(updatedLink!.type_id).toBe(newType._id);
//     });
    
//     it('should call onDataChanged when stored association data changes', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       let dataChangeCalled = false;
//       let changedLink: StorageLink | null = null;
      
//       storage.state.onDataChanged = (storageLink: StorageLink) => {
//         dataChangeCalled = true;
//         changedLink = storageLink;
//       };
//       storage.state.watch();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       // Create and store association
//       const association = new deep.String('initial data');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       // Reset flags
//       dataChangeCalled = false;
//       changedLink = null;
      
//       // Update data (this should trigger globalDataChanged event)
//       association.data = 'updated data';
      
//       // Should have called the handler
//       expect(dataChangeCalled).toBe(true);
//       expect(changedLink).toBeDefined();
//       expect(changedLink).not.toBeNull();
//       expect(changedLink!._id).toBe(association._id);
//       expect(changedLink!._string).toBe('updated data');
//     });
    
//     it('should cleanup event disposers on storage destruction', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Track disposer calls
//       let disposerCallCount = 0;
//       const mockDisposer = () => {
//         disposerCallCount++;
//       };
      
//       // Set up watch
//       storage.state.watch();
      
//       // Should have disposers
//       expect(storage.state._eventDisposers).toBeDefined();
//       expect(storage.state._eventDisposers.length).toBeGreaterThan(0);
      
//       // Replace one disposer with our mock to track calls
//       const originalDisposer = storage.state._eventDisposers[0];
//       storage.state._eventDisposers[0] = mockDisposer;
      
//       // Destroy storage
//       storage.destroy();
      
//       // After destroy, the entire state is deleted, so _eventDisposers becomes undefined
//       // But we can verify that our mock disposer was called
//       expect(disposerCallCount).toBe(1);
      
//       // State should be completely cleaned up after destroy
//       expect(storage._state).toEqual({});
//     });
    
//     it('should call onDestroy handler during storage destruction', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       let destroyCalled = false;
      
//       storage.state.onDestroy = () => {
//         destroyCalled = true;
//       };
      
//       // Destroy storage
//       storage.destroy();
      
//       // Should have called the destroy handler
//       expect(destroyCalled).toBe(true);
//     });
//   });

//   describe('Integration with existing storage system', () => {
//     it('should work with storages.ts storage markers', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Should be able to use with existing storage methods
//       const association = new deep();
      
//       expect(() => {
//         association.store(storage, deep.storageMarkers.oneTrue);
//       }).not.toThrow();
      
//       expect(association.isStored(storage)).toBe(true);
//     });
    
//     it('should integrate with existing event system', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Should be able to listen to events
//       let eventReceived = false;
//       const disposer = deep.on(deep.events.storeAdded._id, () => {
//         eventReceived = true;
//       });
      
//       const association = new deep();
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       expect(eventReceived).toBe(true);
      
//       disposer();
//     });
//   });

//   describe('Interface validation', () => {
//     it('should have correct Storage interface', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Check required state methods
//       expect(storage.state.generateDump).toBeDefined();
//       expect(storage.state.watch).toBeDefined();
      
//       // Check event handler properties
//       expect('onLinkInsert' in storage.state).toBe(true);
//       expect('onLinkDelete' in storage.state).toBe(true);
//       expect('onLinkUpdate' in storage.state).toBe(true);
//       expect('onDataChanged' in storage.state).toBe(true);
//     });
    
//     it('should have correct StorageLink generation', () => {
//       const deep = newDeep();
//       const storage = new deep.Storage();
      
//       // Apply default marking first
//       defaultMarking(deep, storage);
      
//       const association = new deep.String('test');
//       association.store(storage, deep.storageMarkers.oneTrue);
      
//       const dump = storage.state.generateDump();
//       const link = dump.links.find(l => l._id === association._id);
      
//       expect(link).toBeDefined();
      
//       // Check required fields
//       expect(typeof link!._id).toBe('string');
//       expect(typeof link!.type_id).toBe('string');
//       expect(typeof link!._created_at).toBe('number');
//       expect(typeof link!._updated_at).toBe('number');
      
//       // Check optional fields exist when relevant
//       expect(typeof link!._string).toBe('string');
//       expect(link!._string).toBe('test');
//     });
    
//     it('should handle StorageDelta interface correctly', () => {
//       const deep = newDeep();
      
//       // Test delta interface structure
//       const insertDelta: StorageDelta = {
//         operation: 'insert',
//         link: {
//           _id: 'test',
//           type_id: 'test-type',
//           _created_at: 1000,
//           _updated_at: 1000
//         }
//       };
      
//       const deleteDelta: StorageDelta = {
//         operation: 'delete',
//         id: 'test'
//       };
      
//       const updateDelta: StorageDelta = {
//         operation: 'update',
//         id: 'test',
//         link: {
//           _id: 'test',
//           type_id: 'test-type',
//           _created_at: 1000,
//           _updated_at: 2000
//         }
//       };
      
//       // Check that delter have correct structure
//       expect(insertDelta.operation).toBe('insert');
//       expect(deleteDelta.operation).toBe('delete');
//       expect(updateDelta.operation).toBe('update');
//     });
//   });
// }); 