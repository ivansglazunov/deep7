import { newDeep } from '.';

describe('Nary Operations', () => {
  describe('And (n-ary intersection)', () => {
    it('should throw error when valueSetOfSets is not provided', () => {
      const deep = newDeep();
      
      expect(() => {
        new deep.And();
      }).toThrow('valueSetOfSets is required');
    });

    it('should throw error when fromEnv is not a Deep instance', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set());
      
      expect(() => {
        new deep.And('invalid', valueSetOfSets);
      }).toThrow('fromEnv must be a Deep instance');
    });

    it('should throw error when valueSetOfSets is not a deep.Set', () => {
      const deep = newDeep();
      
      const notASet = new deep.Array([1, 2, 3]); // Deep instance but not a Set
      
      expect(() => {
        new deep.And(undefined, notASet);
      }).toThrow('valueSetOfSets must be a deep.Set');
    });

    it('should throw error when valueSetOfSets contains non-Set elements', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set(['invalid']));
      
      expect(() => {
        new deep.And(undefined, valueSetOfSets);
      }).toThrow('All elements in valueSetOfSets must be deep.Set instances');
    });

    it('should create And instance with empty valueSetOfSets', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set());
      const and = new deep.And(undefined, valueSetOfSets);
      
      expect(and.type.is(deep.And)).toBe(true);
      expect(and.value).toBeDefined();
      expect(and.value.type.is(deep.Set)).toBe(true);
      expect(and.value._id).toBe(valueSetOfSets._id);
      expect(and.to).toBeDefined();
      expect(and.to.type.is(deep.Set)).toBe(true);
      expect(and.to._data).toEqual(new Set());
    });

    it('should calculate intersection of multiple sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3, 4]));
      const setB = new deep.Set(new Set([2, 3, 4, 5]));
      const setC = new deep.Set(new Set([3, 4, 5, 6]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Result should be intersection A ∩ B ∩ C = {3, 4}
      expect(Array.from(and.to._data).sort()).toEqual([3, 4]);
    });

    it('should handle empty intersection', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([3, 4]));
      const setC = new deep.Set(new Set([5, 6]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Result should be empty as there's no common elements
      expect(and.to._data).toEqual(new Set());
    });

    it('should handle single set', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Result should be identical to the single set
      expect(Array.from(and.to._data).sort()).toEqual([1, 2, 3]);
    });

    it('should set fromEnv when provided', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const and = new deep.And(envSet, valueSetOfSets);
      
      expect(and.from).toBeDefined();
      expect(and.from._id).toBe(envSet._id);
    });
  });

  describe('[DEBUG] And tracking - reactive behavior', () => {
    it('should react to changes in source sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([2, 3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Initial intersection: {2, 3}
      expect(Array.from(and.to._data).sort()).toEqual([2, 3]);
      
      // Add element that exists in both → should appear in result
      setA.add(4);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3, 4]);
      
      // Add element that exists only in one → should not appear in result
      setA.add(5);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3, 4]);
      
      // Remove element from one set → should disappear from result
      setA.delete(2);
      expect(Array.from(and.to._data).sort()).toEqual([3, 4]);
    });

    it('should react to adding sets to .value', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3, 4]));
      const setB = new deep.Set(new Set([2, 3, 4, 5]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Initial intersection: {2, 3, 4}
      expect(Array.from(and.to._data).sort()).toEqual([2, 3, 4]);
      
      // Add a third set that further restricts the intersection
      const setC = new deep.Set(new Set([3, 4, 5, 6]));
      valueSetOfSets.add(setC._symbol);
      
      // New intersection: {3, 4}
      expect(Array.from(and.to._data).sort()).toEqual([3, 4]);
      
      // Adding element to the new set should be tracked
      setC.add(2);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3, 4]);
    });

    it('should react to removing sets from .value', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const setC = new deep.Set(new Set([2, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Initial intersection: {2}
      expect(and.to._data).toEqual(new Set([2]));
      
      // Remove one set → intersection should expand
      valueSetOfSets.delete(setC._symbol);
      
      // New intersection without setC: A ∩ B = {2}
      expect(and.to._data).toEqual(new Set([2]));
      
      // But now if we add element that's in A and B
      setA.add(3);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3]);
      
      // Changes to removed set should not affect result
      setC.add(3);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3]); // Should not change
    });

    it('should handle complex tracking scenarios', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([2, 3, 4]));
      const setC = new deep.Set(new Set([3, 4, 5]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Initial intersection: {3}
      expect(and.to._data).toEqual(new Set([3]));
      
      // Add common element to all sets
      setA.add(6);
      setB.add(6);
      setC.add(6);
      expect(Array.from(and.to._data).sort()).toEqual([3, 6]);
      
      // Remove element from one set
      setA.delete(6);
      expect(and.to._data).toEqual(new Set([3]));
    });

    it('should handle different data types in intersection', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 'hello', true]));
      const setB = new deep.Set(new Set(['hello', true, 42]));
      const setC = new deep.Set(new Set([true, 42, 'world']));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Initial intersection: {true}
      expect(and.to._data).toEqual(new Set([true]));
      
      // Add common element to all sets
      setA.add('common');
      setB.add('common');
      setC.add('common');
      expect(Array.from(and.to._data).sort()).toEqual(['common', true]);
    });

    it('should cleanup when And instance is destroyed', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([2, 3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const and = new deep.And(undefined, valueSetOfSets);
      
      // Verify tracking is working
      expect(Array.from(and.to._data).sort()).toEqual([2, 3]);
      setA.add(4);
      expect(Array.from(and.to._data).sort()).toEqual([2, 3, 4]);
      
      // Destroy the And instance
      and.destroy();
      
      // Verify that tracking stops after destruction
      setA.add(2); // This should not affect anything now
      // We can't really test that events stopped since the And instance is destroyed
      // But at least verify no errors are thrown
    });
  });
}); 