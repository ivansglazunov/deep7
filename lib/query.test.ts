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

  describe('Complex relation scenarios', () => {
    it('should handle cascading relation changes', () => {
      debug('🧪 Testing cascading relation changes');
      
      const X = new deep();
      const Y = new deep();
      const a = new deep();
      const b = new deep();
      
      a.type = X;
      b.type = Y;
      
      const XTypedSet = X.manyRelation('typed');
      const YTypedSet = Y.manyRelation('typed');
      
      expect(XTypedSet._data).toEqual(new Set([a._id]));
      expect(YTypedSet._data).toEqual(new Set([b._id]));
      
      let xEvents: string[] = [];
      let yEvents: string[] = [];
      
      XTypedSet.on(deep.events.dataAdd, (e: any) => xEvents.push(`add:${e._symbol}`));
      XTypedSet.on(deep.events.dataDelete, (e: any) => xEvents.push(`del:${e._symbol}`));
      YTypedSet.on(deep.events.dataAdd, (e: any) => yEvents.push(`add:${e._symbol}`));
      YTypedSet.on(deep.events.dataDelete, (e: any) => yEvents.push(`del:${e._symbol}`));
      
      // Move a from X to Y
      a.type = Y;
      
      expect(XTypedSet._data).toEqual(new Set([]));
      expect(YTypedSet._data).toEqual(new Set([a._id, b._id]));
      
      expect(xEvents).toEqual([`del:${a._id}`]);
      expect(yEvents).toEqual([`add:${a._id}`]);
      
      debug('✅ Cascading changes handled correctly');
    });

    it('should handle value chain relations', () => {
      debug('🧪 Testing value chain relations');
      
      const a = new deep();
      const b = new deep();
      const c = new deep();
      
      debug('📝 Initial setup: a=%s, b=%s, c=%s', a._id, b._id, c._id);
      
      // Create value chain: a -> b -> c
      a.value = b;
      b.value = c;
      
      debug('🔗 Created chain: a -> b -> c');
      debug('📊 a.value=%s, b.value=%s', a._value, b._value);
      debug('📊 c.valued=%s', Array.from(c._valued));
      
      const aValueSet = a.manyRelation('value');
      const bValuedSet = b.manyRelation('valued');
      const bValueSet = b.manyRelation('value');
      const cValuedSet = c.manyRelation('valued');
      
      debug('📊 Initial state:');
      debug('  aValueSet._data=%s', Array.from(aValueSet._data));
      debug('  bValuedSet._data=%s', Array.from(bValuedSet._data));
      debug('  bValueSet._data=%s', Array.from(bValueSet._data));
      debug('  cValuedSet._data=%s', Array.from(cValuedSet._data));
      
      expect(aValueSet._data).toEqual(new Set([b._id]));
      expect(bValuedSet._data).toEqual(new Set([a._id]));
      expect(bValueSet._data).toEqual(new Set([c._id]));
      expect(cValuedSet._data).toEqual(new Set([b._id]));
      
      // Track events
      let aValueEvents: string[] = [];
      let cValuedEvents: string[] = [];
      
      aValueSet.on(deep.events.dataAdd, (e: any) => aValueEvents.push(`add:${e._symbol}`));
      aValueSet.on(deep.events.dataDelete, (e: any) => aValueEvents.push(`del:${e._symbol}`));
      cValuedSet.on(deep.events.dataAdd, (e: any) => cValuedEvents.push(`add:${e._symbol}`));
      cValuedSet.on(deep.events.dataDelete, (e: any) => cValuedEvents.push(`del:${e._symbol}`));
      
      // Change middle of chain: a -> d -> c
      const d = new deep();
      debug('📝 Creating d=%s', d._id);
      debug('🔄 Changing chain from a -> b -> c to a -> d -> c');
      
      a.value = d;
      debug('✅ Set a.value = d');
      debug('📊 After a.value=d: a.value=%s, b.value=%s', a._value, b._value);
      debug('📊 c.valued=%s', Array.from(c._valued));
      
      d.value = c;
      debug('✅ Set d.value = c');
      debug('📊 After d.value=c: a.value=%s, d.value=%s', a._value, d._value);
      debug('📊 c.valued=%s', Array.from(c._valued));
      
      debug('📊 Final state:');
      debug('  aValueSet._data=%s', Array.from(aValueSet._data));
      debug('  cValuedSet._data=%s', Array.from(cValuedSet._data));
      debug('  aValueEvents=%s', aValueEvents);
      debug('  cValuedEvents=%s', cValuedEvents);
      
      expect(aValueSet._data).toEqual(new Set([d._id]));
      expect(cValuedSet._data).toEqual(new Set([b._id, d._id])); // Both b and d have value = c
      
      expect(aValueEvents).toEqual([`add:${d._id}`, `del:${b._id}`]);
      expect(cValuedEvents).toEqual([`add:${d._id}`]); // Only d was added, b was never removed from c.valued
      
      debug('✅ Value chain relations handled correctly');
    });

    it('should handle from/to relations', () => {
      debug('🧪 Testing from/to relations');
      
      const a = new deep();
      const b = new deep();
      const c = new deep();
      const link1 = new deep();
      const link2 = new deep();
      
      // Create links: a -> b, b -> c
      link1.from = a;
      link1.to = b;
      link2.from = b;
      link2.to = c;
      
      const aOutSet = a.manyRelation('out');
      const bInSet = b.manyRelation('in');
      const bOutSet = b.manyRelation('out');
      const cInSet = c.manyRelation('in');
      
      expect(aOutSet._data).toEqual(new Set([link1._id]));
      expect(bInSet._data).toEqual(new Set([link1._id]));
      expect(bOutSet._data).toEqual(new Set([link2._id]));
      expect(cInSet._data).toEqual(new Set([link2._id]));
      
      // Track events on b's incoming links
      let bInEvents: string[] = [];
      bInSet.on(deep.events.dataAdd, (e: any) => bInEvents.push(`add:${e._symbol}`));
      bInSet.on(deep.events.dataDelete, (e: any) => bInEvents.push(`del:${e._symbol}`));
      
      // Add another link to b
      const link3 = new deep();
      link3.from = c;
      link3.to = b;
      
      expect(bInSet._data).toEqual(new Set([link1._id, link3._id]));
      expect(bInEvents).toEqual([`add:${link3._id}`]);
      
      // Remove original link
      delete link1.to;
      
      expect(bInSet._data).toEqual(new Set([link3._id]));
      expect(bInEvents).toEqual([`add:${link3._id}`, `del:${link1._id}`]);
      
      debug('✅ From/to relations handled correctly');
    });
  });

  describe('Reactivity edge cases', () => {
    it('should handle rapid successive changes', () => {
      debug('🧪 Testing rapid successive changes');
      
      const X = new deep();
      const Y = new deep();
      const Z = new deep();
      const a = new deep();
      
      const XTypedSet = X.manyRelation('typed');
      const YTypedSet = Y.manyRelation('typed');
      const ZTypedSet = Z.manyRelation('typed');
      
      let allEvents: string[] = [];
      
      XTypedSet.on(deep.events.dataAdd, (e: any) => allEvents.push(`X+${e._symbol}`));
      XTypedSet.on(deep.events.dataDelete, (e: any) => allEvents.push(`X-${e._symbol}`));
      YTypedSet.on(deep.events.dataAdd, (e: any) => allEvents.push(`Y+${e._symbol}`));
      YTypedSet.on(deep.events.dataDelete, (e: any) => allEvents.push(`Y-${e._symbol}`));
      ZTypedSet.on(deep.events.dataAdd, (e: any) => allEvents.push(`Z+${e._symbol}`));
      ZTypedSet.on(deep.events.dataDelete, (e: any) => allEvents.push(`Z-${e._symbol}`));
      
      // Rapid type changes
      a.type = X;
      a.type = Y;
      a.type = Z;
      a.type = X;
      delete a.type;
      
      expect(allEvents).toEqual([
        `X+${a._id}`,
        `X-${a._id}`, `Y+${a._id}`,
        `Y-${a._id}`, `Z+${a._id}`,
        `Z-${a._id}`, `X+${a._id}`,
        `X-${a._id}`
      ]);
      
      expect(XTypedSet._data.size).toBe(0);
      expect(YTypedSet._data.size).toBe(0);
      expect(ZTypedSet._data.size).toBe(0);
      
      debug('✅ Rapid successive changes handled correctly');
    });

    it('should handle circular value references', () => {
      debug('🧪 Testing circular value references');
      
      const a = new deep();
      const b = new deep();
      
      // Create circular reference: a -> b -> a
      a.value = b;
      b.value = a;
      
      const aValueSet = a.manyRelation('value');
      const bValueSet = b.manyRelation('value');
      const aValuedSet = a.manyRelation('valued');
      const bValuedSet = b.manyRelation('valued');
      
      expect(aValueSet._data).toEqual(new Set([b._id]));
      expect(bValueSet._data).toEqual(new Set([a._id]));
      expect(aValuedSet._data).toEqual(new Set([b._id]));
      expect(bValuedSet._data).toEqual(new Set([a._id]));
      
      // Break the circle
      delete a.value;
      
      expect(aValueSet._data.size).toBe(0);
      expect(bValueSet._data).toEqual(new Set([a._id]));
      expect(aValuedSet._data).toEqual(new Set([b._id]));
      expect(bValuedSet._data.size).toBe(0);
      
      debug('✅ Circular references handled correctly');
    });

    it('should handle concurrent manyRelation calls', () => {
      debug('🧪 Testing concurrent manyRelation calls');
      
      const X = new deep();
      const relations: any[] = [];
      
      // Create multiple manyRelation instances concurrently
      for (let i = 0; i < 10; i++) {
        relations.push(X.manyRelation('typed'));
      }
      
      // All should be independent but have same initial data
      for (let i = 0; i < relations.length; i++) {
        expect(relations[i]._data.size).toBe(0);
        for (let j = i + 1; j < relations.length; j++) {
          expect(relations[i]._id).not.toBe(relations[j]._id);
        }
      }
      
      // Add instances and verify all relations see them
      const instances: any[] = [];
      for (let i = 0; i < 5; i++) {
        const instance = new deep();
        instance.type = X;
        instances.push(instance);
        
        for (const relation of relations) {
          expect(relation._data.has(instance._id)).toBe(true);
          expect(relation._data.size).toBe(i + 1);
        }
      }
      
      debug('✅ Concurrent calls handled correctly');
    });
  });

  describe('Performance and memory', () => {
    it('should not create memory leaks with many relations', () => {
      debug('🧪 Testing memory leak prevention');
      
      const X = new deep();
      const relations: any[] = [];
      
      // Create many manyRelation instances
      for (let i = 0; i < 50; i++) {
        relations.push(X.manyRelation('typed'));
      }
      
      // Create and destroy many instances
      for (let i = 0; i < 25; i++) {
        const instance = new deep();
        instance.type = X;
        
        // Verify all relations see the new instance
        for (const relation of relations) {
          expect(relation._data.has(instance._id)).toBe(true);
        }
        
        // Remove the instance
        delete instance.type;
        
        // Verify all relations no longer see the instance
        for (const relation of relations) {
          expect(relation._data.has(instance._id)).toBe(false);
        }
      }
      
      // All relations should be empty
      for (const relation of relations) {
        expect(relation._data.size).toBe(0);
      }
      
      debug('✅ No memory leaks detected');
    });

    it('should handle large numbers of elements efficiently', () => {
      debug('🧪 Testing performance with large numbers of elements');
      
      const X = new deep();
      const XTypedSet = X.manyRelation('typed');
      
      const instances: any[] = [];
      const startTime = Date.now();
      
      // Create many instances
      for (let i = 0; i < 500; i++) {
        const instance = new deep();
        instance.type = X;
        instances.push(instance);
      }
      
      const creationTime = Date.now() - startTime;
      debug('⏱️ Created 500 instances in %dms', creationTime);
      
      expect(XTypedSet._data.size).toBe(500);
      
      // Verify all instances are tracked
      for (const instance of instances) {
        expect(XTypedSet._data.has(instance._id)).toBe(true);
      }
      
      const verificationTime = Date.now() - startTime - creationTime;
      debug('⏱️ Verified 500 instances in %dms', verificationTime);
      
      // Remove all instances
      const removalStartTime = Date.now();
      for (const instance of instances) {
        delete instance.type;
      }
      
      const removalTime = Date.now() - removalStartTime;
      debug('⏱️ Removed 500 instances in %dms', removalTime);
      
      expect(XTypedSet._data.size).toBe(0);
      
      debug('✅ Performance test completed successfully');
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
      
      // Verify that tracking is initially set up
      expect(newInverted._state._mapByFieldDisposers).toBeDefined();
      expect(Array.isArray(newInverted._state._mapByFieldDisposers)).toBe(true);
      expect(newInverted._state._mapByFieldDisposers.length).toBeGreaterThan(0);
      
      // Set up event listener to detect if events still occur after destruction
      let eventAfterDestruction = false;
      newInverted.on(deep.events.dataAdd, () => { eventAfterDestruction = true; });
      
      // Destroy the result set - this should automatically trigger cleanup
      newInverted.destroy();
      
      // Create new element that would normally trigger tracking
      const newElement = new W(); // create element
      
      // Events should NOT occur because tracking was automatically cleaned up
      expect(eventAfterDestruction).toBe(false);
    });
  });
});

describe('queryField', () => {
  describe('Basic functionality', () => {
    it('should handle simple Deep instance queries', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const Y = new deep();
      const a = new X(); // a.type = X
      const b = new X(); // b.type = X  
      const c = new Y(); // c.type = Y

      const typeXResult = deep.queryField('type', X);
      
      expect(typeXResult._data).toEqual(new Set([a._id, b._id])); // { a, b }
    });
    
    it('should handle value relations', () => {
      const deep = newDeep();
      
      const X = new deep();
      const a = new X();
      const b = new X();
      
      const str1 = new deep.String('hello');
      const str2 = new deep.String('world');
      a.value = str1; // a.value = str1
      b.value = str2; // b.value = str2
      
      debug('str1._id', str1._id);
      debug('str2._id', str2._id);
      debug('a._id', a._id);
      debug('b._id', b._id);

      // ЗАКОМЕНТИРОВАЛ ЭТО, тут аксиома в корне не верна
      // АКСИОМА: queryField('valued', str1) → найти ТЕХ, кто ссылается на str1 по полю value

      const valueStr1Result = deep.queryField('value', str1);
      expect(valueStr1Result._data).toEqual(new Set([a._id])); // { a }

      const valuedaResult = deep.queryField('valued', a);
      expect(valuedaResult._data).toEqual(new Set([str1._id])); // { str1 }
      
      // // АКСИОМА: queryField('value', str1) → найти ТЕХ, кто имеет value = str1
      // const valueStr1Result = deep.queryField('value', str1);  
      // expect(valueStr1Result._data).toEqual(new Set([a._id])); // { a }
    });
    
    it('should handle nested query objects', () => {
      const deep = newDeep();
      
      const R = new deep();
      const W = new R(); // W.type = R
      const Z = new R(); // Z.type = R  
      const e = new W(); // e.type = W
      const q = new W(); // q.type = W
      
      // deep.queryField('type', { type: R }) should find all elements
      // whose type has type R (i.e. e, q, etc.)
      const nestedResult = deep.queryField('type', { type: R });
      expect(nestedResult._data).toEqual(new Set([e._id, q._id])); // { e, q }
    });
    
    it('should return empty sets for non-existent values', () => {
      const deep = newDeep();
      
      const nonExistent = new deep();
      const emptyResult = deep.queryField('from', nonExistent); // from usually not set
      expect(emptyResult._data.size).toBe(0); // { }
    });
    
    it('should throw error for invalid fields', () => {
      const deep = newDeep();
      
      const X = new deep();
      expect(() => deep.queryField('invalidField', X)).toThrow('Field invalidField is not supported in query expression');
    });
  });
  
  describe('Reactive tracking', () => {
    it('should track creation of new elements', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const a = new X(); // a.type = X
      const b = new X(); // b.type = X
      
      const typeXResult = deep.queryField('type', X);
      expect(typeXResult._data).toEqual(new Set([a._id, b._id]));
      
      let addedToQuery: string | null = null;
      typeXResult.on(deep.events.dataAdd, (element: any) => { 
        addedToQuery = element._symbol; 
      });
      
      const d = new X(); // create new instance of X
      expect(typeXResult._data.has(d._id)).toBe(true); // typeXResult = { a, b, d }
      expect(addedToQuery).toBe(d._id);
    });
    
    it('should track type changes', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const Y = new deep();
      const a = new X(); // a.type = X
      const b = new X(); // b.type = X
      
      const typeXResult = deep.queryField('type', X);
      expect(typeXResult._data).toEqual(new Set([a._id, b._id]));
      
      let removedFromQuery: string | null = null;
      typeXResult.on(deep.events.dataDelete, (element: any) => { 
        removedFromQuery = element._symbol; 
      });
      
      a.type = Y; // change type from X to Y
      expect(typeXResult._data.has(a._id)).toBe(false); // typeXResult = { b }
      expect(removedFromQuery).toBe(a._id);
    });
  });
});

describe('query', () => {
  describe('Basic functionality', () => {
    it('should handle simple query with one criterion', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const Y = new deep();
      const a = new X(); // a.type = X
      const b = new X(); // b.type = X
      const c = new Y(); // c.type = Y
      
      const simpleQuery = deep.query({ type: X });
      expect(simpleQuery._data).toEqual(new Set([a._id, b._id])); // { a, b }
    });
    
    it('should handle multiple criteria (AND operation)', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const a = new X();
      const b = new X();
      
      const str1 = new deep.String('hello');
      const str2 = new deep.String('world');
      a.value = str1; // a.type = X, a.value = str1
      b.value = str2; // b.type = X, b.value = str2
      
      const andQuery = deep.query({ type: X, value: str1 });
      expect(andQuery._data).toEqual(new Set([a._id])); // { a } - only a matches both criteria
    });
    
    it('should have correct internal structure for And operation', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const X = new deep();
      const a = new X();
      
      const str1 = new deep.String('hello');
      a.value = str1;
      
      const andQuery = deep.query({ type: X, value: str1 });
      
      // Check that the underlying operation is an And operation
      const andOperation = andQuery._state._andOperation;
      expect(andOperation.type.is(deep.And)).toBe(true);
      
      // andOperation.value should contain a set of result sets (criteria sets)
      const criteriaSets = Array.from(andOperation.value._data);
      expect(criteriaSets.length).toBe(2); // two criteria: type and value
    });
    
    it('should handle nested queries', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const R = new deep();
      const W = new R(); // W.type = R
      const Z = new R(); // Z.type = R
      const e = new W(); // e.type = W  
      const q = new W(); // q.type = W
      const o = new Z(); // o.type = Z
      const p = new Z(); // p.type = Z
      
      const nestedQuery = deep.query({ type: { type: R } });
      expect(nestedQuery._data).toEqual(new Set([e._id, q._id, o._id, p._id])); // { e, q, o, p }
    });
    
    it('should return empty results for non-matching criteria', () => {
      const deep = newDeep();
      
      // Создаем свежие экземпляры для этого теста
      const emptyQuery = deep.query({ from: new deep() }); // from usually not set
      expect(emptyQuery._data.size).toBe(0); // { }
    });
    
    it('should throw error for invalid query expressions', () => {
      const deep = newDeep();
      
      // Тестируем ошибки валидации
      expect(() => deep.query(null)).toThrow('Query expression must be a non-null object');
      expect(() => deep.query([])).toThrow('Query expression must be a non-null object');
      expect(() => deep.query({})).toThrow('Query expression cannot be empty');
      expect(() => deep.query('invalid')).toThrow('Query expression must be a non-null object');
    });
  });
  
  describe('Reactive tracking', () => {
    it('should track changes with single criterion', () => {
      const deep = newDeep();
      
      const X = new deep();
      const a = new X();
      const b = new X();
      
      const simpleQuery = deep.query({ type: X });
      expect(simpleQuery._data).toEqual(new Set([a._id, b._id]));
      
      let queryChanged = false;
      simpleQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      const d = new X(); // create new instance of X
      expect(simpleQuery._data.has(d._id)).toBe(true); // simpleQuery = { a, b, d }
      expect(queryChanged).toBe(true);
    });
    
    it('should track changes with multiple criteria', () => {
      const deep = newDeep();
      
      const X = new deep();
      const a = new X();
      
      const str1 = new deep.String('hello');
      a.value = str1;
      
      const andQuery = deep.query({ type: X, value: str1 });
      expect(andQuery._data).toEqual(new Set([a._id]));
      
      let andQueryChanged = false;  
      andQuery.on(deep.events.dataChanged, () => { andQueryChanged = true; });
      
      const e2 = new X();
      e2.value = str1; // e2.type = X, e2.value = str1 - matches both criteria
      expect(andQuery._data.has(e2._id)).toBe(true); // andQuery = { a, e2 }
      expect(andQueryChanged).toBe(true);
    });
    
    it('should track element destruction', () => {
      const deep = newDeep();
      
      const X = new deep();
      const a = new X();
      
      const str1 = new deep.String('hello');
      a.value = str1;
      
      const andQuery = deep.query({ type: X, value: str1 });
      expect(andQuery._data).toEqual(new Set([a._id]));
      
      let andQueryChanged = false;
      andQuery.on(deep.events.dataChanged, () => { andQueryChanged = true; });
      
      a.destroy(); // destroy a
      expect(andQuery._data.has(a._id)).toBe(false); // andQuery = { }
      expect(andQueryChanged).toBe(true);
    });
  });
});

describe('Complex Query Tests with Reactivity', () => {
  describe('Multiple reverse relations', () => {
    it('should handle typed queries with reactivity', () => {
      const deep = newDeep();
      
      const TypeA = new deep();
      const TypeB = new deep();
      const element1 = new TypeA(); // element1.type = TypeA
      const element2 = new TypeA(); // element2.type = TypeA
      const element3 = new TypeB(); // element3.type = TypeB
      
      // Query: find all types that have instances
      const typedQuery = deep.query({ typed: element1 });
      expect(typedQuery._data).toEqual(new Set([TypeA._id])); // { TypeA }
      
      // Set up reactivity tracking
      let queryChanged = false;
      typedQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Change element1's type
      element1.type = TypeB;
      expect(typedQuery._data).toEqual(new Set([TypeB._id])); // { TypeB }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Create new element with TypeB
      const element4 = new TypeB();
      expect(typedQuery._data).toEqual(new Set([TypeB._id])); // Still { TypeB }
      expect(queryChanged).toBe(false); // No change since TypeB was already in result
    });
    
    it('should handle out queries with reactivity', () => {
      const deep = newDeep();
      
      const sourceElement = new deep();
      const target1 = new deep();
      const target2 = new deep();
      
      const link1 = new deep();
      link1.from = sourceElement;
      link1.to = target1;
      
      // Query: find all elements that have sourceElement as their from
      const outQuery = deep.query({ out: sourceElement });
      expect(outQuery._data).toEqual(new Set([link1._id])); // { link1 }
      
      // Set up reactivity tracking
      let queryChanged = false;
      outQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Create new outgoing link
      const link2 = new deep();
      link2.from = sourceElement;
      link2.to = target2;
      
      expect(outQuery._data).toEqual(new Set([link1._id, link2._id])); // { link1, link2 }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Remove outgoing link
      delete link1.from;
      expect(outQuery._data).toEqual(new Set([link2._id])); // { link2 }
      expect(queryChanged).toBe(true);
    });
    
    it('should handle in queries with reactivity', () => {
      const deep = newDeep();
      
      const targetElement = new deep();
      const source1 = new deep();
      const source2 = new deep();
      
      const link1 = new deep();
      link1.from = source1;
      link1.to = targetElement;
      
      // Query: find all elements that have targetElement as their to
      const inQuery = deep.query({ in: targetElement });
      expect(inQuery._data).toEqual(new Set([link1._id])); // { link1 }
      
      // Set up reactivity tracking
      let queryChanged = false;
      inQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Create new incoming link
      const link2 = new deep();
      link2.from = source2;
      link2.to = targetElement;
      
      expect(inQuery._data).toEqual(new Set([link1._id, link2._id])); // { link1, link2 }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Change target of existing link
      link1.to = source2;
      expect(inQuery._data).toEqual(new Set([link2._id])); // { link2 }
      expect(queryChanged).toBe(true);
    });
    
    it('should handle valued queries with reactivity', () => {
      const deep = newDeep();
      
      const valueElement = new deep();
      const container1 = new deep();
      const container2 = new deep();
      
      container1.value = valueElement;
      
      // Query: find all elements that have valueElement as their value
      const valuedQuery = deep.query({ valued: valueElement });
      expect(valuedQuery._data).toEqual(new Set([container1._id])); // { container1 }
      
      // Set up reactivity tracking
      let queryChanged = false;
      valuedQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Add new container with same value
      container2.value = valueElement;
      expect(valuedQuery._data).toEqual(new Set([container1._id, container2._id])); // { container1, container2 }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Remove value from container
      delete container1.value;
      expect(valuedQuery._data).toEqual(new Set([container2._id])); // { container2 }
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Combined direct and reverse relations', () => {
    it('should handle mixed criteria with reactivity', () => {
      const deep = newDeep();
      
      const TypeA = new deep();
      const SourceC = new deep();
      const ElementB = new deep();
      const ElementD = new deep();
      
      // Create element that matches all criteria
      const matchingElement = new TypeA();
      ElementB.type = matchingElement; // ElementB.type = matchingElement (so matchingElement is typed by ElementB)
      matchingElement.from = SourceC;
      ElementD.from = matchingElement; // ElementD.from = matchingElement (so matchingElement is out for ElementD)
      
      // Query with mixed criteria
      const mixedQuery = deep.query({
        type: TypeA,        // direct: element.type = TypeA
        typed: ElementB,    // reverse: ElementB.type = element
        from: SourceC,      // direct: element.from = SourceC
        out: ElementD       // reverse: ElementD.from = element
      });
      
      expect(mixedQuery._data).toEqual(new Set([matchingElement._id])); // { matchingElement }
      
      // Set up reactivity tracking
      let queryChanged = false;
      mixedQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Break one criterion - change type
      matchingElement.type = new deep();
      expect(mixedQuery._data.size).toBe(0); // { } - no longer matches
      expect(queryChanged).toBe(true);
      
      // Reset tracking and restore
      queryChanged = false;
      matchingElement.type = TypeA;
      expect(mixedQuery._data).toEqual(new Set([matchingElement._id])); // { matchingElement }
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Nested queries with reverse relations', () => {
    it('should handle nested typed and out queries with reactivity', () => {
      const deep = newDeep();
      
      const SomeSource = new deep();
      const intermediateElement = new deep();
      const typeElement = new deep();
      const finalElement = new deep();
      
      // Set up chain: SomeSource <- intermediateElement, typeElement.type = finalElement, intermediateElement.type = typeElement
      intermediateElement.from = SomeSource; // intermediateElement.out = SomeSource
      finalElement.type = typeElement;        // typeElement.typed = finalElement
      intermediateElement.type = typeElement; // typeElement.typed = intermediateElement
      
      // Query: find elements that are typed by something that is out from SomeSource
      const nestedQuery = deep.query({
        typed: { out: SomeSource }
      });
      
      expect(nestedQuery._data).toEqual(new Set([typeElement._id])); // { typeElement }
      
      // Set up reactivity tracking
      let queryChanged = false;
      nestedQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Add new element to the chain
      const newIntermediate = new deep();
      newIntermediate.from = SomeSource;
      const newType = new deep();
      newIntermediate.type = newType;
      
      expect(nestedQuery._data).toEqual(new Set([typeElement._id, newType._id])); // { typeElement, newType }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Break the chain
      intermediateElement.from = new deep(); // No longer from SomeSource
      expect(nestedQuery._data).toEqual(new Set([newType._id])); // { newType }
      expect(queryChanged).toBe(true);
    });
    
    it('should handle deep nesting with multiple reverse relations', () => {
      const deep = newDeep();
      
      const TerminalElement = new deep();
      const valueContainer = new deep();
      const outSource = new deep();
      const typedElement = new deep();
      const typeOfTyped = new deep();
      
      // Build complex chain
      valueContainer.value = TerminalElement;     // TerminalElement.valued = valueContainer
      outSource.from = valueContainer;            // valueContainer.out = outSource  
      typedElement.type = outSource;              // outSource.typed = typedElement
      typeOfTyped.type = typedElement;            // typedElement.typed = typeOfTyped
      
      // Query: find types of elements that are typed by elements that are out from elements that are valued by TerminalElement
      const deepQuery = deep.query({
        type: {
          typed: {
            out: {
              valued: TerminalElement
            }
          }
        }
      });
      
      expect(deepQuery._data).toEqual(new Set([typedElement._id])); // { typedElement }
      
      // Set up reactivity tracking
      let queryChanged = false;
      deepQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Add parallel chain
      const newValueContainer = new deep();
      const newOutSource = new deep();
      const newTypedElement = new deep();
      const newTypeOfTyped = new deep();
      
      newValueContainer.value = TerminalElement;
      newOutSource.from = newValueContainer;
      newTypedElement.type = newOutSource;
      newTypeOfTyped.type = newTypedElement;
      
      expect(deepQuery._data).toEqual(new Set([typedElement._id, newTypedElement._id]));
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('All 8 relation types in one query', () => {
    it('should handle complete relation matrix with reactivity', () => {
      const deep = newDeep();
      
      // Create all reference elements
      const TypeA = new deep();
      const ElementB = new deep();
      const SourceC = new deep();
      const ElementD = new deep();
      const TargetE = new deep();
      const ElementF = new deep();
      const ValueG = new deep();
      const ElementH = new deep();
      
      // Create the one element that satisfies all 8 criteria
      const superElement = new TypeA();
      ElementB.type = superElement;    // superElement.typed = ElementB
      superElement.from = SourceC;     // superElement.from = SourceC
      ElementD.from = superElement;    // superElement.out = ElementD
      superElement.to = TargetE;       // superElement.to = TargetE
      ElementF.to = superElement;      // superElement.in = ElementF
      superElement.value = ValueG;     // superElement.value = ValueG
      ElementH.value = superElement;   // superElement.valued = ElementH
      
      // The ultimate query
      const ultimateQuery = deep.query({
        type: TypeA,      // direct
        typed: ElementB,  // reverse
        from: SourceC,    // direct
        out: ElementD,    // reverse
        to: TargetE,      // direct
        in: ElementF,     // reverse
        value: ValueG,    // direct
        valued: ElementH  // reverse
      });
      
      expect(ultimateQuery._data).toEqual(new Set([superElement._id])); // { superElement }
      
      // Set up reactivity tracking
      let queryChanged = false;
      ultimateQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Break one criterion at a time and verify
      
      // Break type criterion
      superElement.type = new deep();
      expect(ultimateQuery._data.size).toBe(0);
      expect(queryChanged).toBe(true);
      
      // Restore and reset
      queryChanged = false;
      superElement.type = TypeA;
      expect(ultimateQuery._data).toEqual(new Set([superElement._id]));
      expect(queryChanged).toBe(true);
      
      // Break typed criterion
      queryChanged = false;
      ElementB.type = new deep();
      expect(ultimateQuery._data.size).toBe(0);
      expect(queryChanged).toBe(true);
      
      // Restore
      queryChanged = false;
      ElementB.type = superElement;
      expect(ultimateQuery._data).toEqual(new Set([superElement._id]));
      expect(queryChanged).toBe(true);
      
      // Test other criteria similarly...
      queryChanged = false;
      delete superElement.from;
      expect(ultimateQuery._data.size).toBe(0);
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Value chains with reverse relations', () => {
    it('should handle value chains with valued queries and reactivity', () => {
      const deep = newDeep();
      
      const ChainElement = new deep();
      const intermediate = new deep();
      const terminal = new deep();
      
      // Set up value chain: terminal.value = intermediate, intermediate.valued = ChainElement
      intermediate.value = ChainElement;  // ChainElement.valued = intermediate
      terminal.value = intermediate;      // intermediate.valued = terminal
      
      // Query: find elements whose value is valued by ChainElement
      const chainQuery = deep.query({
        value: { valued: ChainElement }
      });
      
      expect(chainQuery._data).toEqual(new Set([terminal._id])); // { terminal }
      
      // Set up reactivity tracking
      let queryChanged = false;
      chainQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Add new element to chain
      const newTerminal = new deep();
      newTerminal.value = intermediate;
      
      expect(chainQuery._data).toEqual(new Set([terminal._id, newTerminal._id]));
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Break the chain
      intermediate.value = new deep(); // No longer valued by ChainElement
      expect(chainQuery._data.size).toBe(0); // Chain broken
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Dynamic changes with empty results', () => {
    it('should handle empty to populated transitions with reactivity', () => {
      const deep = newDeep();
      
      const OrphanElement = new deep();
      
      // Query for typed relations - initially empty
      const emptyQuery = deep.query({ typed: OrphanElement });
      expect(emptyQuery._data.size).toBe(1); // { OrphanElement } - OrphanElement is typed by itself initially
      
      // Set up reactivity tracking
      let queryChanged = false;
      emptyQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Make OrphanElement a type for something
      const newElement = new deep();
      newElement.type = OrphanElement;
      
      expect(emptyQuery._data).toEqual(new Set([OrphanElement._id])); // { OrphanElement }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Add more elements with same type
      const anotherElement = new deep();
      anotherElement.type = OrphanElement;
      
      expect(emptyQuery._data).toEqual(new Set([OrphanElement._id])); // Still { OrphanElement }
      expect(queryChanged).toBe(false); // No change in result set
      
      // Remove all typed relations
      delete newElement.type;
      delete anotherElement.type;
      
      expect(emptyQuery._data.size).toBe(0); // Back to { }
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Cascading changes through reverse relations', () => {
    it('should handle cascading changes through typed relations with reactivity', () => {
      const deep = newDeep();
      
      const BaseType = new deep();
      const someElement = new deep();
      const linkElement = new deep();
      
      // Initial setup: linkElement.from = someElement, but someElement is not of BaseType
      linkElement.from = someElement;
      
      // Query: find elements that are out from instances of BaseType
      const cascadeQuery = deep.query({ out: { typed: BaseType } });
      expect(cascadeQuery._data.size).toBe(0); // { } - someElement is not of BaseType
      
      // Set up reactivity tracking
      let queryChanged = false;
      cascadeQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Make someElement an instance of BaseType
      someElement.type = BaseType;
      
      expect(cascadeQuery._data).toEqual(new Set([linkElement._id])); // { linkElement }
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Add another element of BaseType with outgoing links
      const anotherElement = new BaseType();
      const anotherLink = new deep();
      anotherLink.from = anotherElement;
      
      expect(cascadeQuery._data).toEqual(new Set([linkElement._id, anotherLink._id]));
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Remove type from someElement
      delete someElement.type;
      
      expect(cascadeQuery._data).toEqual(new Set([anotherLink._id])); // { anotherLink }
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Mass operations and performance', () => {
    it('should handle mass changes efficiently with reactivity', () => {
      const deep = newDeep();
      
      const MassType = new deep();
      const elements: any[] = [];
      
      // Create 50 elements (reduced from 100 for test speed)
      for (let i = 0; i < 50; i++) {
        elements.push(new deep());
      }
      
      // Query for instances of MassType
      const massQuery = deep.query({ type: MassType });
      expect(massQuery._data.size).toBe(0);
      
      // Track changes
      let changeCount = 0;
      massQuery.on(deep.events.dataChanged, () => { changeCount++; });
      
      // Mass assignment of types
      const startTime = Date.now();
      for (const element of elements) {
        element.type = MassType;
      }
      const endTime = Date.now();
      
      expect(massQuery._data.size).toBe(50);
      expect(changeCount).toBe(50); // Each assignment should trigger change
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Mass removal
      changeCount = 0;
      for (const element of elements) {
        delete element.type;
      }
      
      expect(massQuery._data.size).toBe(0);
      expect(changeCount).toBe(50);
    });
  });
  
  describe('Element destruction in active queries', () => {
    it('should handle element destruction with reactivity', () => {
      const deep = newDeep();
      
      const QueryType = new deep();
      const element1 = new QueryType();
      const element2 = new QueryType();
      const element3 = new QueryType();
      
      // Query for instances of QueryType
      const destructionQuery = deep.query({ type: QueryType });
      expect(destructionQuery._data).toEqual(new Set([element1._id, element2._id, element3._id]));
      
      // Track changes
      let queryChanged = false;
      destructionQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Destroy one element
      element2.destroy();
      
      expect(destructionQuery._data).toEqual(new Set([element1._id, element3._id]));
      expect(queryChanged).toBe(true);
      
      // Reset tracking
      queryChanged = false;
      
      // Destroy another element
      element1.destroy();
      
      expect(destructionQuery._data).toEqual(new Set([element3._id]));
      expect(queryChanged).toBe(true);
      
      // Destroy last element
      queryChanged = false;
      element3.destroy();
      
      expect(destructionQuery._data.size).toBe(0);
      expect(queryChanged).toBe(true);
    });
  });
  
  describe('Circular relations in queries', () => {
    it('should handle circular type relations with reactivity', () => {
      const deep = newDeep();
      
      const A = new deep();
      const B = new deep();
      
      // Create circular relation: A.type = B, B.type = A
      A.type = B;
      B.type = A;
      
      // Query: find elements whose type has type A
      const circularQuery = deep.query({ type: { type: A } });
      expect(circularQuery._data).toEqual(new Set([A._id])); // { A } because A.type = B and B.type = A
      
      // Track changes
      let queryChanged = false;
      circularQuery.on(deep.events.dataChanged, () => { queryChanged = true; });
      
      // Break the circle
      B.type = new deep();
      
      expect(circularQuery._data.size).toBe(0); // No longer matches
      expect(queryChanged).toBe(true);
      
      // Restore circle
      queryChanged = false;
      B.type = A;
      
      expect(circularQuery._data).toEqual(new Set([A._id]));
      expect(queryChanged).toBe(true);
    });
  });
});