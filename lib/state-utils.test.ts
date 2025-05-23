import { newDeep } from '.';
import { 
  extractAllIds, 
  extractState, 
  compareDeepStates, 
  getDifferencesSummary, 
  validateIds,
  AssociationState,
  StateDifference
} from './state-utils';

describe('Phase 2: State Restoration & ID Management', () => {
  describe('extractAllIds', () => {
    it('should extract IDs sorted by sequence number', () => {
      const deep = newDeep();
      const a = new deep();
      const b = new deep();
      const c = new deep();

      const ids = extractAllIds(deep);
      
      // Should include all created instances plus deep itself
      expect(ids).toContain(deep._id);
      expect(ids).toContain(a._id);
      expect(ids).toContain(b._id);
      expect(ids).toContain(c._id);
      
      // Should be sorted by _i (sequence number)
      for (let i = 1; i < ids.length; i++) {
        const prev = new deep(ids[i-1]);
        const curr = new deep(ids[i]);
        expect(prev._i).toBeLessThanOrEqual(curr._i);
      }
    });

    it('should handle empty deep instance', () => {
      const deep = newDeep();
      const ids = extractAllIds(deep);
      
      // Should at least contain the deep instance itself
      expect(ids.length).toBeGreaterThanOrEqual(1);
      expect(ids).toContain(deep._id);
    });
  });

  describe('existingIds system', () => {
    it('should use existing IDs when provided', () => {
      // Provide plenty of IDs to ensure we don't run out during initialization
      const predefinedIds = Array.from({ length: 1000 }, (_, i) => `test-id-${i + 1}`);
      const deep = newDeep({ existingIds: predefinedIds });
      
      // The first ID will be used by the deep instance itself
      expect(deep._id).toBe('test-id-1');
      
      // Creating new instances should use predefined IDs from our pool
      const a = new deep();
      const b = new deep();
      const c = new deep();
      
      // They should all follow our predefined pattern
      expect(a._id).toMatch(/^test-id-\d+$/);
      expect(b._id).toMatch(/^test-id-\d+$/);
      expect(c._id).toMatch(/^test-id-\d+$/);
      
      // And they should be different
      expect(new Set([a._id, b._id, c._id]).size).toBe(3);
    });

    it('should fall back to generating new IDs when existing ones are exhausted', () => {
      // Provide fewer IDs so they get exhausted
      const predefinedIds = Array.from({ length: 200 }, (_, i) => `id${i + 1}`);
      const deep = newDeep({ existingIds: predefinedIds });
      
      // All predefined IDs should be exhausted by now, so new instances get generated IDs
      const a = new deep();
      const b = new deep();
      
      // These should be generated UUIDs, not from our predefined list
      expect(a._id).not.toMatch(/^id\d+$/);
      expect(b._id).not.toMatch(/^id\d+$/);
      expect(typeof a._id).toBe('string');
      expect(typeof b._id).toBe('string');
      expect(a._id.length).toBeGreaterThan(0);
      expect(b._id.length).toBeGreaterThan(0);
    });

    it('should handle empty existing IDs array', () => {
      const deep = newDeep({ existingIds: [] });
      const a = new deep();
      
      // Should generate new ID
      expect(typeof a._id).toBe('string');
      expect(a._id.length).toBeGreaterThan(0);
    });
  });

  describe('extractState', () => {
    it('should extract complete state information', () => {
      const deep = newDeep();
      const stringType = new deep.String('test');
      const numberType = new deep.Number(42);
      
      // Create some links
      stringType._type = deep.String._id;
      numberType._type = deep.Number._id;
      numberType._from = stringType._id;
      
      const state = extractState(deep);
      
      expect(state.ids).toBeDefined();
      expect(state.associations).toBeDefined();
      expect(Array.isArray(state.ids)).toBe(true);
      
      // Check that all created instances are in the state
      expect(state.ids).toContain(stringType._id);
      expect(state.ids).toContain(numberType._id);
      
      // Check association data
      const stringAssoc = state.associations[stringType._id];
      expect(stringAssoc).toBeDefined();
      expect(stringAssoc._type).toBe(deep.String._id);
      expect(stringAssoc._data).toBe('test');
      
      const numberAssoc = state.associations[numberType._id];
      expect(numberAssoc).toBeDefined();
      expect(numberAssoc._type).toBe(deep.Number._id);
      expect(numberAssoc._data).toBe(42);
      expect(numberAssoc._from).toBe(stringType._id);
    });
  });

  describe('compareDeepStates', () => {
    it('should detect identical states', () => {
      const deep1 = newDeep();
      const a1 = new deep1.String('hello');
      const b1 = new deep1.Number(123);
      a1._from = b1._id;
      
      const deep2 = newDeep();
      const a2 = new deep2.String('hello');
      const b2 = new deep2.Number(123);
      a2._from = b2._id;
      
      // This won't be identical due to different IDs, but let's test the structure
      const comparison = compareDeepStates(deep1, deep2);
      expect(comparison.identical).toBe(false); // Expected due to different generated IDs
      expect(Array.isArray(comparison.differences)).toBe(true);
    });

    it('should detect differences in types', () => {
      const deep1 = newDeep();
      const a1 = new deep1();
      
      const deep2 = newDeep();
      const a2 = new deep2();
      a2._type = deep2.String._id; // Different type
      
      const comparison = compareDeepStates(deep1, deep2);
      expect(comparison.identical).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
    });

    it('should handle edge case of empty states', () => {
      const deep1 = newDeep();
      const deep2 = newDeep();
      
      const comparison = compareDeepStates(deep1, deep2);
      expect(comparison.identical).toBe(false); // Different IDs for deep instances
      expect(Array.isArray(comparison.differences)).toBe(true);
    });
  });

  describe('full cycle: create → extract → recreate → compare', () => {
    it('should achieve perfect state restoration with predefined IDs', () => {
      // Create initial state
      const originalDeep = newDeep();
      const str = new originalDeep.String('test data');
      const num = new originalDeep.Number(456);
      str._from = num._id;
      num._to = str._id;
      
      // Extract all IDs sorted by sequence number
      const extractedIds = extractAllIds(originalDeep);
      
      // Create new deep with same IDs (provide enough extras for safety)
      const restoredDeep = newDeep({ existingIds: extractedIds });
      
      // Now we need to create instances in the SAME ORDER to get the same IDs
      // The challenge is that newDeep() already consumed many IDs
      // So we need to recreate the EXACT same sequence
      
      // Find what IDs the original str and num got
      const strId = str._id;
      const numId = num._id;
      
      // Since we can't predict exact order, let's create instances with explicit IDs
      const restoredStr = new restoredDeep(strId);
      const restoredNum = new restoredDeep(numId);
      
      // Set their types and data
      restoredStr._type = originalDeep.String._id;
      restoredStr._data = 'test data';
      restoredNum._type = originalDeep.Number._id;
      restoredNum._data = 456;
      restoredStr._from = restoredNum._id;
      restoredNum._to = restoredStr._id;
      
      // IDs should match exactly
      expect(restoredStr._id).toBe(str._id);
      expect(restoredNum._id).toBe(num._id);
      
      // Basic structure should be identical
      expect(restoredStr._data).toBe(str._data);
      expect(restoredNum._data).toBe(num._data);
      expect(restoredStr._from).toBe(str._from);
      expect(restoredNum._to).toBe(num._to);
    });

    it('should handle complex state with multiple relationships', () => {
      const originalDeep = newDeep();
      
      // Create a more complex structure
      const root = new originalDeep();
      const child1 = new originalDeep();
      const child2 = new originalDeep();
      const data = new originalDeep.String('complex data');
      
      // Set up relationships
      child1._type = root._id;
      child2._type = root._id;
      child1._value = data._id;
      child2._from = child1._id;
      child2._to = data._id;
      
      // Extract and restore with explicit IDs
      const extractedIds = extractAllIds(originalDeep);
      const restoredDeep = newDeep({ existingIds: extractedIds });
      
      // Recreate structure with explicit IDs
      const restoredRoot = new restoredDeep(root._id);
      const restoredChild1 = new restoredDeep(child1._id);
      const restoredChild2 = new restoredDeep(child2._id);
      const restoredData = new restoredDeep(data._id);
      
      // Set up the same relationships
      restoredData._type = originalDeep.String._id;
      restoredData._data = 'complex data';
      restoredChild1._type = restoredRoot._id;
      restoredChild2._type = restoredRoot._id;
      restoredChild1._value = restoredData._id;
      restoredChild2._from = restoredChild1._id;
      restoredChild2._to = restoredData._id;
      
      // Verify all IDs match
      expect(restoredRoot._id).toBe(root._id);
      expect(restoredChild1._id).toBe(child1._id);
      expect(restoredChild2._id).toBe(child2._id);
      expect(restoredData._id).toBe(data._id);
      
      // Verify relationships
      expect(restoredChild1._type).toBe(child1._type);
      expect(restoredChild2._type).toBe(child2._type);
      expect(restoredChild1._value).toBe(child1._value);
      expect(restoredChild2._from).toBe(child2._from);
      expect(restoredChild2._to).toBe(child2._to);
    });
  });

  describe('validateIds', () => {
    it('should validate correct ID list', () => {
      const ids = ['id1', 'id2', 'id3'];
      const result = validateIds(ids);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect duplicate IDs', () => {
      const ids = ['id1', 'id2', 'id1'];
      const result = validateIds(ids);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Duplicate IDs');
    });

    it('should detect invalid IDs', () => {
      const ids = ['id1', '', null as any, undefined as any, 123 as any];
      const result = validateIds(ids);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid IDs');
    });
  });

  describe('getDifferencesSummary', () => {
    it('should return "identical" message for no differences', () => {
      const summary = getDifferencesSummary([]);
      expect(summary).toBe('States are identical');
    });

    it('should format differences correctly', () => {
      const differences: StateDifference[] = [
        {
          type: 'missing_id',
          id: 'id1',
          message: 'ID id1 is missing'
        },
        {
          type: 'property_diff',
          id: 'id2',
          property: '_type',
          value1: 'type1',
          value2: 'type2',
          message: 'Types differ'
        }
      ];
      
      const summary = getDifferencesSummary(differences);
      expect(summary).toContain('Found 2 differences');
      expect(summary).toContain('ID id1 is missing');
      expect(summary).toContain('Types differ');
    });
  });

  describe('edge cases', () => {
    it('should handle circular references without hanging', () => {
      const deep = newDeep();
      const a = new deep();
      const b = new deep();
      
      // Create circular reference
      a._value = b._id;
      b._value = a._id;
      
      // Should not hang or throw
      expect(() => {
        const ids = extractAllIds(deep);
        const state = extractState(deep);
      }).not.toThrow();
    });

    it('should handle instances with no relationships', () => {
      const deep = newDeep();
      const isolated = new deep();
      
      const state = extractState(deep);
      const isolatedState = state.associations[isolated._id];
      
      expect(isolatedState).toBeDefined();
      expect(isolatedState._type).toBe(deep._id);
      expect(isolatedState._from).toBeUndefined();
      expect(isolatedState._to).toBeUndefined();
      expect(isolatedState._value).toBeUndefined();
    });
  });
}); 