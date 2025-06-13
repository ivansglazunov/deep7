import { describe, it, expect } from '@jest/globals';
import Debug from './debug';
import { newDeep } from './deep';
import { _invertFields, _oneRelationFields, _manyRelationFields, _allRelationFields } from './query';

const debug = Debug('query:test');

describe('Query Helper Constants', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment');
    deep = newDeep();
  });

  describe('_invertFields', () => {
    it('should have correct field mappings', () => {
      debug('🔍 Testing field mappings');
      
      // Test direct mappings
      expect(_invertFields['type']).toBe('typed');
      expect(_invertFields['typed']).toBe('type');
      expect(_invertFields['from']).toBe('out');
      expect(_invertFields['out']).toBe('from');
      expect(_invertFields['to']).toBe('in');
      expect(_invertFields['in']).toBe('to');
      expect(_invertFields['value']).toBe('valued');
      expect(_invertFields['valued']).toBe('value');
    });

    it('should be bidirectional (invertible)', () => {
      debug('🔄 Testing bidirectional mapping');
      
      // Every field should map to another field that maps back to it
      for (const [key, value] of Object.entries(_invertFields)) {
        expect(_invertFields[value as keyof typeof _invertFields]).toBe(key);
        debug(`✅ ${key} ↔ ${value} mapping confirmed`);
      }
    });

    it('should cover all relation fields', () => {
      debug('🎯 Testing complete coverage');
      
      const allFields = Object.keys({ ..._oneRelationFields, ..._manyRelationFields });
      for (const field of allFields) {
        expect(_invertFields).toHaveProperty(field);
        debug(`✅ Field ${field} has inversion mapping`);
      }
    });
  });

  describe('_oneRelationFields', () => {
    it('should mark single relation fields correctly', () => {
      debug('🔍 Testing single relation field identification');
      
      expect(_oneRelationFields['type']).toBe(true);
      expect(_oneRelationFields['from']).toBe(true);
      expect(_oneRelationFields['to']).toBe(true);
      expect(_oneRelationFields['value']).toBe(true);
      
      // These should not be in one relation fields
      expect(_oneRelationFields['typed' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['out' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['in' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['valued' as keyof typeof _oneRelationFields]).toBeUndefined();
    });
  });

  describe('_manyRelationFields', () => {
    it('should mark multiple relation fields correctly', () => {
      debug('🔍 Testing multiple relation field identification');
      
      expect(_manyRelationFields['typed']).toBe(true);
      expect(_manyRelationFields['out']).toBe(true);
      expect(_manyRelationFields['in']).toBe(true);
      expect(_manyRelationFields['valued']).toBe(true);
      
      // These should not be in many relation fields
      expect(_manyRelationFields['type' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['from' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['to' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['value' as keyof typeof _manyRelationFields]).toBeUndefined();
    });
  });

  describe('_allRelationFields', () => {
    it('should combine both single and multiple relation fields', () => {
      debug('🔍 Testing combined relation fields');
      
      // Should include all single relation fields
      for (const field of Object.keys(_oneRelationFields)) {
        expect(_allRelationFields).toHaveProperty(field);
        debug(`✅ Single field ${field} included in all fields`);
      }
      
      // Should include all multiple relation fields
      for (const field of Object.keys(_manyRelationFields)) {
        expect(_allRelationFields).toHaveProperty(field);
        debug(`✅ Multiple field ${field} included in all fields`);
      }
    });

    it('should have exactly 8 relation fields total', () => {
      debug('🔢 Testing total field count');
      
      const fieldCount = Object.keys(_allRelationFields).length;
      expect(fieldCount).toBe(8); // 4 single + 4 multiple
      debug(`✅ Total field count: ${fieldCount}`);
    });
  });

  describe('Field Type Classification', () => {
    it('should correctly classify fields by type', () => {
      debug('🏷️ Testing field type classification');
      
      const singleFields = ['type', 'from', 'to', 'value'];
      const multipleFields = ['typed', 'out', 'in', 'valued'];
      
      for (const field of singleFields) {
        expect(_oneRelationFields[field as keyof typeof _oneRelationFields]).toBe(true);
        expect(_manyRelationFields[field as keyof typeof _manyRelationFields]).toBeUndefined();
        debug(`✅ ${field} correctly classified as single relation`);
      }
      
      for (const field of multipleFields) {
        expect(_manyRelationFields[field as keyof typeof _manyRelationFields]).toBe(true);
        expect(_oneRelationFields[field as keyof typeof _oneRelationFields]).toBeUndefined();
        debug(`✅ ${field} correctly classified as multiple relation`);
      }
    });
  });

  describe('Constant Consistency', () => {
    it('should maintain consistency between invert fields and field types', () => {
      debug('🔗 Testing consistency between constants');
      
      // Every field in _invertFields should be in either _oneRelationFields or _manyRelationFields
      for (const field of Object.keys(_invertFields)) {
        const isInSingle = _oneRelationFields.hasOwnProperty(field);
        const isInMultiple = _manyRelationFields.hasOwnProperty(field);
        
        expect(isInSingle || isInMultiple).toBe(true);
        debug(`✅ Field ${field} is properly categorized`);
      }
    });

    it('should have no overlap between single and multiple fields', () => {
      debug('🚫 Testing no overlap between field types');
      
      for (const field of Object.keys(_oneRelationFields)) {
        expect(_manyRelationFields.hasOwnProperty(field)).toBe(false);
        debug(`✅ Single field ${field} not in multiple fields`);
      }
      
      for (const field of Object.keys(_manyRelationFields)) {
        expect(_oneRelationFields.hasOwnProperty(field)).toBe(false);
        debug(`✅ Multiple field ${field} not in single fields`);
      }
    });
  });
});

describe('manyRelation', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for manyRelation');
    deep = newDeep();
  });

  describe('Basic functionality', () => {
    it('should handle single relation fields', () => {
      const X = new deep();
      const a = new deep();
      a.type = X;

      // a.type = X, поэтому a.manyRelation('type') = { X }
      const aTypeSet = a.manyRelation('type');
      expect(aTypeSet.type.is(deep.Set)).toBe(true);
      expect(aTypeSet._data).toEqual(new Set([X._id]));
      expect(aTypeSet.size).toBe(1);
      expect(aTypeSet.has(X._id)).toBe(true);
    });

    it('should handle multiple relation fields', () => {
      const X = new deep();
      const a = new deep();
      const b = new deep();
      a.type = X;
      b.type = X;

      // X.typed = { a, b }, поэтому X.manyRelation('typed') = { a, b }
      const XTypedSet = X.manyRelation('typed');
      expect(XTypedSet.type.is(deep.Set)).toBe(true);
      expect(XTypedSet._data).toEqual(new Set([a._id, b._id]));
      expect(XTypedSet.size).toBe(2);
      expect(XTypedSet.has(a._id)).toBe(true);
      expect(XTypedSet.has(b._id)).toBe(true);
    });

    it('should handle empty relations', () => {
      const a = new deep();
      delete a.type; // удаляем автоматически установленный тип
      
      // a не имеет type, поэтому a.manyRelation('type') = { }
      const aTypeSet = a.manyRelation('type');
      expect(aTypeSet.type.is(deep.Set)).toBe(true);
      expect(aTypeSet._data.size).toBe(0);
      expect(aTypeSet.size).toBe(0);
    });

    it('should handle value relations', () => {
      const a = new deep();
      const str1 = new deep.String('hello');
      a.value = str1;

      const aValueSet = a.manyRelation('value');
      expect(aValueSet._data).toEqual(new Set([str1._id]));

      const str1ValuedSet = str1.manyRelation('valued');
      expect(str1ValuedSet._data).toEqual(new Set([a._id]));
    });

    it('should handle nonexistent fields', () => {
      const a = new deep();
      
      const emptySet = a.manyRelation('nonexistent');
      expect(emptySet.type.is(deep.Set)).toBe(true);
      expect(emptySet._data.size).toBe(0);
    });
  });

  describe('Reactive tracking - single relations', () => {
    it('should track changes to single relation fields', () => {
      const X = new deep();
      const Y = new deep();
      const a = new deep();
      a.type = X;

      const aTypeSet = a.manyRelation('type');
      expect(aTypeSet._data).toEqual(new Set([X._id]));

      let addedEvent = null;
      let deletedEvent = null;
      let changedCalled = false;

      aTypeSet.on(deep.events.dataAdd, (element: any) => {
        addedEvent = element._symbol;
      });
      aTypeSet.on(deep.events.dataDelete, (element: any) => {
        deletedEvent = element._symbol;
      });
      aTypeSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });

      // Change type from X to Y
      a.type = Y;

      expect(aTypeSet._data).toEqual(new Set([Y._id]));
      expect(addedEvent).toBe(Y._id);
      expect(deletedEvent).toBe(X._id);
      expect(changedCalled).toBe(true);
    });

    it('should track deletion of single relation fields', () => {
      const X = new deep();
      const a = new deep();
      a.type = X;

      const aTypeSet = a.manyRelation('type');
      expect(aTypeSet._data).toEqual(new Set([X._id]));

      let deletedEvent = null;
      let changedCalled = false;

      aTypeSet.on(deep.events.dataDelete, (element: any) => {
        deletedEvent = element._symbol;
      });
      aTypeSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });

      // Delete type
      delete a.type;

      expect(aTypeSet._data.size).toBe(0);
      expect(deletedEvent).toBe(X._id);
      expect(changedCalled).toBe(true);
    });
  });

  describe('Reactive tracking - multiple relations', () => {
    it('should track additions to multiple relation fields', () => {
      const X = new deep();
      const a = new deep();
      a.type = X;

      const XTypedSet = X.manyRelation('typed');
      expect(XTypedSet._data).toEqual(new Set([a._id]));

      let addedEvent = null;
      let changedCalled = false;

      XTypedSet.on(deep.events.dataAdd, (element: any) => {
        addedEvent = element._symbol;
      });
      XTypedSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });

      // Create new instance of X
      const b = new deep();
      b.type = X;

      expect(XTypedSet._data.has(b._id)).toBe(true);
      expect(addedEvent).toBe(b._id);
      expect(changedCalled).toBe(true);
    });

    it('should track removals from multiple relation fields', () => {
      const X = new deep();
      const a = new deep();
      const b = new deep();
      a.type = X;
      b.type = X;

      const XTypedSet = X.manyRelation('typed');
      expect(XTypedSet._data).toEqual(new Set([a._id, b._id]));

      let deletedEvent = null;
      let changedCalled = false;

      XTypedSet.on(deep.events.dataDelete, (element: any) => {
        deletedEvent = element._symbol;
      });
      XTypedSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });

      // Change type of a
      delete a.type;

      expect(XTypedSet._data.has(a._id)).toBe(false);
      expect(XTypedSet._data.has(b._id)).toBe(true);
      expect(deletedEvent).toBe(a._id);
      expect(changedCalled).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw error for non-string fieldName', () => {
      const a = new deep();
      
      expect(() => {
        a.manyRelation(123);
      }).toThrow('fieldName must be a string');
      
      expect(() => {
        a.manyRelation(null);
      }).toThrow('fieldName must be a string');
    });
  });

  describe('State management', () => {
    it('should store tracking information in state', () => {
      const X = new deep();
      const a = new deep();
      a.type = X;

      const aTypeSet = a.manyRelation('type');
      
      expect(aTypeSet._state._manyRelationSource).toBeDefined();
      expect(aTypeSet._state._manyRelationSource._id).toBe(a._id);
      expect(aTypeSet._state._manyRelationField).toBe('type');
      expect(aTypeSet._state._manyRelationDisposers).toBeDefined();
      expect(Array.isArray(aTypeSet._state._manyRelationDisposers)).toBe(true);
      expect(aTypeSet._state._manyRelationDisposers.length).toBeGreaterThan(0);
    });
  });

  describe('Tracking disposal and redundancy prevention', () => {
    it('should properly dispose tracking and stop events after disposal', () => {
      debug('🧪 Testing tracking disposal and event prevention');
      
      const X = new deep();
      const a = new deep();
      const b = new deep();
      
      a.type = X;
      
      const XTypedSet = X.manyRelation('typed');
      expect(XTypedSet._data).toEqual(new Set([a._id]));
      
      let addEventCount = 0;
      let deleteEventCount = 0;
      let changeEventCount = 0;
      
      const addDisposer = XTypedSet.on(deep.events.dataAdd, (element: any) => {
        addEventCount++;
        debug('🔥 dataAdd event fired:', element._symbol, 'total:', addEventCount);
      });
      
      const deleteDisposer = XTypedSet.on(deep.events.dataDelete, (element: any) => {
        deleteEventCount++;
        debug('🔥 dataDelete event fired:', element._symbol, 'total:', deleteEventCount);
      });
      
      const changeDisposer = XTypedSet.on(deep.events.dataChanged, () => {
        changeEventCount++;
        debug('🔥 dataChanged event fired, total:', changeEventCount);
      });
      
      debug('📊 Initial state - Events: add=%d, delete=%d, change=%d', addEventCount, deleteEventCount, changeEventCount);
      
      // Test 1: Normal operation should trigger events
      debug('🧪 Test 1: Adding b.type = X (should trigger events)');
      b.type = X;
      
      expect(XTypedSet._data.has(b._id)).toBe(true);
      expect(addEventCount).toBe(1);
      expect(changeEventCount).toBe(1);
      debug('✅ Events fired correctly - Events: add=%d, delete=%d, change=%d', addEventCount, deleteEventCount, changeEventCount);
      
      // Test 2: Dispose tracking
      debug('🧪 Test 2: Disposing tracking');
      const disposers = XTypedSet._state._manyRelationDisposers;
      expect(Array.isArray(disposers)).toBe(true);
      expect(disposers.length).toBeGreaterThan(0);
      
      debug('🔧 Found %d disposers to clean up', disposers.length);
      
      disposers.forEach((disposer: any, index: number) => {
        debug('🗑️ Disposing tracker %d/%d', index + 1, disposers.length);
        if (typeof disposer === 'function') {
          disposer();
        }
      });
      
      XTypedSet._state._manyRelationDisposers = [];
      debug('✅ Tracking disposed');
      
      // Test 3: Operations after disposal should NOT trigger events
      debug('🧪 Test 3: Operations after disposal (should NOT trigger events)');
      
      const beforeAddCount = addEventCount;
      const beforeDeleteCount = deleteEventCount;
      const beforeChangeCount = changeEventCount;
      
      const c = new deep();
      debug('➕ Creating c and setting c.type = X');
      c.type = X;
      
      debug('➖ Deleting a.type');
      delete a.type;
      
      const Y = new deep();
      debug('🔄 Changing b.type from X to Y');
      b.type = Y;
      
      debug('📊 After operations - Events: add=%d, delete=%d, change=%d', addEventCount, deleteEventCount, changeEventCount);
      
      expect(addEventCount).toBe(beforeAddCount);
      expect(deleteEventCount).toBe(beforeDeleteCount);
      expect(changeEventCount).toBe(beforeChangeCount);
      
      debug('✅ No events fired after disposal - tracking properly disabled');
      
      // Test 4: Verify the Set data is not automatically updated (since tracking is disabled)
      debug('🧪 Test 4: Verifying Set data is not auto-updated after disposal');
      debug('XTypedSet._data contents:', Array.from(XTypedSet._data));
      
      expect(XTypedSet._data.has(a._id)).toBe(true); // Still there since tracking disabled
      expect(XTypedSet._data.has(b._id)).toBe(true); // Still there since tracking disabled
      expect(XTypedSet._data.has(c._id)).toBe(false); // c should NOT be in the set since tracking was disabled
      
      debug('✅ Set data correctly frozen after tracking disposal');
      
      // Cleanup event listeners
      addDisposer();
      deleteDisposer();
      changeDisposer();
    });

    it('should handle multiple manyRelation instances independently', () => {
      debug('🧪 Testing independent manyRelation instances');
      
      const X = new deep();
      const a = new deep();
      
      a.type = X;
      
      const XTypedSet1 = X.manyRelation('typed');
      const XTypedSet2 = X.manyRelation('typed');
      
      expect(XTypedSet1._id).not.toBe(XTypedSet2._id);
      
      let events1 = 0;
      let events2 = 0;
      
      const disposer1 = XTypedSet1.on(deep.events.dataAdd, () => events1++);
      const disposer2 = XTypedSet2.on(deep.events.dataAdd, () => events2++);
      
      const b = new deep();
      b.type = X;
      
      expect(events1).toBe(1);
      expect(events2).toBe(1);
      
      // Dispose only first instance tracking
      XTypedSet1._state._manyRelationDisposers.forEach((d: any) => d());
      XTypedSet1._state._manyRelationDisposers = [];
      
      const c = new deep();
      c.type = X;
      
      expect(events1).toBe(1); // No change
      expect(events2).toBe(2); // Incremented
      
      // Cleanup
      disposer1();
      disposer2();
      XTypedSet2._state._manyRelationDisposers.forEach((d: any) => d());
    });

    it('should not create redundant event subscriptions', () => {
      debug('🧪 Testing for redundant event subscriptions');
      
      const X = new deep();
      const a = new deep();
      a.type = X;
      
      const XTypedSet = X.manyRelation('typed');
      
      const disposers = XTypedSet._state._manyRelationDisposers;
      
      // For 'typed' field, we should have exactly 2 disposers: typedAdded and typedDeleted
      expect(disposers.length).toBe(2);
      
      disposers.forEach((disposer: any, index: number) => {
        expect(typeof disposer).toBe('function');
        debug('✅ Disposer %d is a function', index + 1);
      });
      
      debug('✅ Exactly %d disposers created (no redundancy)', disposers.length);
      
      // Cleanup
      disposers.forEach((d: any) => d());
    });

    it('should prevent event cascades and redundant processing', () => {
      debug('🧪 Testing prevention of event cascades and redundant processing');
      
      const X = new deep();
      const Y = new deep();
      const a = new deep();
      const b = new deep();
      
      a.type = X;
      b.type = X;
      
      const XTypedSet = X.manyRelation('typed');
      
      let eventCount = 0;
      let lastEventElement = null;
      
      XTypedSet.on(deep.events.dataAdd, (element: any) => {
        eventCount++;
        lastEventElement = element._symbol;
        debug('📤 Event %d: dataAdd for %s', eventCount, element._symbol);
      });
      
      XTypedSet.on(deep.events.dataDelete, (element: any) => {
        eventCount++;
        lastEventElement = element._symbol;
        debug('📤 Event %d: dataDelete for %s', eventCount, element._symbol);
      });
      
      // Test: Multiple rapid changes should not cause redundant events
      debug('🔄 Performing multiple rapid changes');
      
      // Change a from X to Y
      a.type = Y;
      expect(eventCount).toBe(1);
      expect(lastEventElement).toBe(a._id);
      
      // Change a back to X
      a.type = X;
      expect(eventCount).toBe(2);
      expect(lastEventElement).toBe(a._id);
      
      // Setting same type again should not trigger events
      a.type = X;
      expect(eventCount).toBe(2); // No change
      
      debug('✅ No redundant events for same-value assignments');
      
      // Cleanup
      XTypedSet._state._manyRelationDisposers.forEach((d: any) => d());
    });
  });
});

describe('mapByField', () => {
  describe('Basic functionality', () => {
    it('should invert simple sets through type field', () => {
      const deep = newDeep();
      
      // Simple inversion
      const X = new deep();
      const a = new X(); // a.type = X
      const b = new X(); // b.type = X

      const typedSet = X.manyRelation('typed'); // { a, b }
      const invertedToType = typedSet.mapByField('type'); // search type for each element
      // typedSet.map(element => element.manyRelation('type')) => [{ X }, { X }]
      // deep.Or([{ X }, { X }]) => { X }
      expect(invertedToType._data).toEqual(new Set([X._id])); // { X }
    });

    it('should handle complex inversion scenarios', () => {
      const deep = newDeep();
      
      // Complex inversion - shows how to get { e, q, o, p }
      const R = new deep();    // root type
      const W = new R();       // W.type = R  
      const Z = new R();       // Z.type = R
      const e = new W();       // e.type = W
      const q = new W();       // q.type = W  
      const o = new Z();       // o.type = Z
      const p = new Z();       // p.type = Z

      // Query: find all elements whose type has type R
      // Step 1: deep.query({ type: R }) => { W, Z }
      const typesWithR = new deep.Set(new Set([W._id, Z._id])); // { W, Z }

      // Step 2: typesWithR.mapByField('typed') 
      // W.manyRelation('typed') => { e, q }
      // Z.manyRelation('typed') => { o, p }  
      // deep.Or([{ e, q }, { o, p }]) => { e, q, o, p }
      const invertedResult = typesWithR.mapByField('typed');
      expect(invertedResult._data).toEqual(new Set([e._id, q._id, o._id, p._id])); // { e, q, o, p }
    });

    it('should handle empty sets', () => {
      const deep = newDeep();
      
      // Empty results  
      const emptySet = new deep.Set(new Set());
      const emptyInverted = emptySet.mapByField('type');
      expect(emptyInverted._data.size).toBe(0); // { }
    });

    it('should validate field names', () => {
      const deep = newDeep();
      
      const X = new deep();
      const typedSet = X.manyRelation('typed');
      
      expect(() => typedSet.mapByField('invalidField')).toThrow('Field invalidField is not supported in mapByField operation');
    });

    it('should only work on Set instances', () => {
      const deep = newDeep();
      
      const X = new deep();
      
      expect(() => X.mapByField('type')).toThrow('mapByField can only be called on deep.Set instances');
    });
  });

  describe('Reactive tracking', () => {
    it('should track creation of new elements', () => {
      const deep = newDeep();
      
      const R = new deep();
      const W = new R(); // W.type = R
      const e = new W(); // e.type = W
      const q = new W(); // q.type = W

      const typesWithR = new deep.Set(new Set([W._id])); // { W }
      const invertedResult = typesWithR.mapByField('typed');
      
      // Initial state: { e, q }
      expect(invertedResult._data).toEqual(new Set([e._id, q._id]));
      
      // Track addition events
      let addedToInverted = null;
      invertedResult.on(deep.events.dataAdd, (element: any) => { 
        addedToInverted = element._symbol;
      });

      const r = new W(); // create new instance of W
      // r.type = W, so W.typed now { e, q, r }
      // invertedResult should become { e, q, r }
      expect(invertedResult._data.has(r._id)).toBe(true);
      expect(addedToInverted).toBe(r._id);
    });

    it('should track destruction of source elements', () => {
      const deep = newDeep();
      
      const R = new deep();
      const W = new R(); // W.type = R
      const Z = new R(); // Z.type = R
      const e = new W(); // e.type = W
      const q = new W(); // q.type = W
      const o = new Z(); // o.type = Z
      const p = new Z(); // p.type = Z

      const typesWithR = new deep.Set(new Set([W._id, Z._id])); // { W, Z }
      const invertedResult = typesWithR.mapByField('typed');
      
      // Initial state: { e, q, o, p }
      expect(invertedResult._data).toEqual(new Set([e._id, q._id, o._id, p._id]));
      
      // Track deletion events
      let deletedFromInverted = null;  
      invertedResult.on(deep.events.dataDelete, (element: any) => { 
        deletedFromInverted = element._symbol;
      });

      W.destroy(); // destroy W
      // All instances of W (e, q) lose their links
      // invertedResult should become { o, p }
      expect(invertedResult._data).toEqual(new Set([o._id, p._id]));
      expect(deletedFromInverted).toBeTruthy(); // one of e, q
    });

    it('should stop tracking after disposal', () => {
      const deep = newDeep();
      
      const W = new deep();
      const e = new W();
      
      const newTypesSet = new deep.Set(new Set([W._id]));
      const newInverted = newTypesSet.mapByField('typed');
      
      // Verify that dispose method exists
      expect(newInverted._context.dispose).toBeDefined();
      
      // Dispose all tracking
      newInverted.dispose();

      let eventAfterDispose = false;
      newInverted.on(deep.events.dataAdd, () => { eventAfterDispose = true; });
      
      const newElement = new W(); // create element
      expect(eventAfterDispose).toBe(false); // events should not occur
    });
  });
});