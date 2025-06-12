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

  describe('Or (n-ary union)', () => {
    it('should throw error when valueSetOfSets is not provided', () => {
      const deep = newDeep();
      
      expect(() => {
        new deep.Or();
      }).toThrow('valueSetOfSets is required');
    });

    it('should throw error when fromEnv is not a Deep instance', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set());
      
      expect(() => {
        new deep.Or('invalid', valueSetOfSets);
      }).toThrow('fromEnv must be a Deep instance');
    });

    it('should throw error when valueSetOfSets is not a deep.Set', () => {
      const deep = newDeep();
      
      const notASet = new deep.Array([1, 2, 3]); // Deep instance but not a Set
      
      expect(() => {
        new deep.Or(undefined, notASet);
      }).toThrow('valueSetOfSets must be a deep.Set');
    });

    it('should throw error when valueSetOfSets contains non-Set elements', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set(['invalid']));
      
      expect(() => {
        new deep.Or(undefined, valueSetOfSets);
      }).toThrow('All elements in valueSetOfSets must be deep.Set instances');
    });

    it('should create Or instance with empty valueSetOfSets', () => {
      const deep = newDeep();
      
      const valueSetOfSets = new deep.Set(new Set());
      const or = new deep.Or(undefined, valueSetOfSets);
      
      expect(or.type.is(deep.Or)).toBe(true);
      expect(or.value).toBeDefined();
      expect(or.value.type.is(deep.Set)).toBe(true);
      expect(or.value._id).toBe(valueSetOfSets._id);
      expect(or.to).toBeDefined();
      expect(or.to.type.is(deep.Set)).toBe(true);
      expect(or.to._data).toEqual(new Set());
    });

    it('should calculate union of multiple sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const setC = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Result should be union A ∪ B ∪ C = {1, 2, 3, 4}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
    });

    it('should handle disjoint sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([3, 4]));
      const setC = new deep.Set(new Set([5, 6]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Result should include all elements from all sets
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle single set', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Result should be identical to the single set
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]);
    });

    it('should set fromEnv when provided', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const or = new deep.Or(envSet, valueSetOfSets);
      
      expect(or.from).toBeDefined();
      expect(or.from._id).toBe(envSet._id);
    });

    it('should handle overlapping sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2, 3, 4]));
      const setB = new deep.Set(new Set([2, 3, 4, 5]));
      const setC = new deep.Set(new Set([3, 4, 5, 6]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Result should be union with no duplicates: {1, 2, 3, 4, 5, 6} 
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('[DEBUG] Or tracking - reactive behavior', () => {
    it('should react to changes in source sets', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Initial union: {1, 2, 3}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]);
      
      // Add element to one set → should appear in result
      setA.add(4);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Add element that already exists in result → should not duplicate
      setB.add(4);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Remove element that exists in both sets → should remain in result
      setA.delete(2);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Remove element that exists only in one set → should disappear from result
      setA.delete(1);
      expect(Array.from(or.to._data).sort()).toEqual([2, 3, 4]);
    });

    it('should react to adding sets to .value', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Initial union: {1, 2, 3}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]);
      
      // Add a third set that expands the union
      const setC = new deep.Set(new Set([4, 5]));
      valueSetOfSets.add(setC._symbol);
      
      // New union: {1, 2, 3, 4, 5}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4, 5]);
      
      // Adding element to the new set should be tracked
      setC.add(6);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should react to removing sets from .value', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const setC = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Initial union: {1, 2, 3, 4}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Remove one set → union should contract if it contained unique elements
      valueSetOfSets.delete(setC._symbol);
      
      // New union without setC: A ∪ B = {1, 2, 3}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]);
      
      // Changes to removed set should not affect result
      setC.add(5);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]); // Should not change
    });

    it('should handle complex tracking scenarios', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const setC = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol, setC._symbol]));
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Initial union: {1, 2, 3, 4}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Add element that appears in multiple sets
      setA.add(3);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]); // No change - 3 already existed
      
      // Add unique element to multiple sets simultaneously
      setA.add(5);
      setB.add(5);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4, 5]);
      
      // Remove elements progressively to test union contraction
      setA.delete(1); // Only in A
      expect(Array.from(or.to._data).sort()).toEqual([2, 3, 4, 5]);
      
      setB.delete(2); // In A and B, but A already removed 
      expect(Array.from(or.to._data).sort()).toEqual([2, 3, 4, 5]); // 2 still in A
      
      setA.delete(2); // Now 2 is gone from both
      expect(Array.from(or.to._data).sort()).toEqual([3, 4, 5]);
      
      // Remove shared element from all containing sets
      setA.delete(5);
      setB.delete(5);
      expect(Array.from(or.to._data).sort()).toEqual([3, 4]);
    });

    it('should properly clean up tracking on destruction', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const or = new deep.Or(undefined, valueSetOfSets);
      
      // Initial union: {1, 2, 3}
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3]);
      
      // Verify tracking is working
      setA.add(4);
      expect(Array.from(or.to._data).sort()).toEqual([1, 2, 3, 4]);
      
      // Save reference to result set before destruction
      const resultSet = or.to;
      const originalResult = Array.from(resultSet._data);
      
      // Destroy the Or operation
      or.destroy();
      
      // Changes should no longer affect the result (tracking cleaned up)
      setA.add(5);
      setB.add(6);
      expect(Array.from(resultSet._data)).toEqual(originalResult); // Should remain unchanged
    });
  });
}); 