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

  describe('And tracking - reactive behavior', () => {
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

  describe('Or tracking - reactive behavior', () => {
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

  describe('Not operation - parameter validation', () => {
    it('should throw error if fromEnv is not provided', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      expect(() => {
        new deep.Not(undefined, valueSetOfSets);
      }).toThrow('fromEnv is required for Not operation');
    });

    it('should throw error if fromEnv is not a Deep instance', () => {
      const deep = newDeep();
      
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      expect(() => {
        new deep.Not('invalid', valueSetOfSets);
      }).toThrow('fromEnv must be a Deep instance');
    });

    it('should throw error if fromEnv is not a deep.Set', () => {
      const deep = newDeep();
      
      const notASet = new deep();
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      expect(() => {
        new deep.Not(notASet, valueSetOfSets);
      }).toThrow('fromEnv must be a deep.Set');
    });

    it('should throw error if valueSetOfSets is not provided', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      
      expect(() => {
        new deep.Not(envSet, undefined);
      }).toThrow('valueSetOfSets is required');
    });

    it('should throw error if valueSetOfSets is not a Deep instance', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      
      expect(() => {
        new deep.Not(envSet, 'invalid');
      }).toThrow('valueSetOfSets must be a Deep instance');
    });

    it('should throw error if valueSetOfSets is not a deep.Set', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      const notASet = new deep();
      
      expect(() => {
        new deep.Not(envSet, notASet);
      }).toThrow('valueSetOfSets must be a deep.Set');
    });

    it('should throw error if valueSetOfSets contains non-Set elements', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      const notASet = new deep();
      const valueSetOfSets = new deep.Set(new Set([notASet._symbol]));
      
      expect(() => {
        new deep.Not(envSet, valueSetOfSets);
      }).toThrow('All elements in valueSetOfSets must be deep.Set instances');
    });
  });

  describe('Not operation - basic functionality', () => {
    it('should create Not instance with proper links', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4]));
      const setA = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      expect(not.type.is(deep.Not)).toBe(true);
      expect(not.from._id).toBe(envSet._id);
      expect(not.value._id).toBe(valueSetOfSets._id);
      expect(not.to.type.is(deep.Set)).toBe(true);
    });

    it('should handle empty environment', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([]));
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Empty environment minus anything = empty
      expect(Array.from(not.to._data)).toEqual([]);
    });

    it('should handle empty exclusions', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      const valueSetOfSets = new deep.Set(new Set([]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Environment minus nothing = environment
      expect(Array.from(not.to._data).sort()).toEqual([1, 2, 3]);
    });

    it('should compute simple difference: env\\{A}', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4]));
      const setA = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2,3,4} \ {2,3} = {1,4}
      expect(Array.from(not.to._data).sort()).toEqual([1, 4]);
    });

    it('should compute multiple exclusions: env\\{A,B}', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2,3,4,5} \ ({1,2} ∪ {3,4}) = {1,2,3,4,5} \ {1,2,3,4} = {5}
      expect(Array.from(not.to._data)).toEqual([5]);
    });

    it('should handle overlapping exclusions', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([2, 3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2,3,4,5} \ ({1,2,3} ∪ {2,3,4}) = {1,2,3,4,5} \ {1,2,3,4} = {5}
      expect(Array.from(not.to._data)).toEqual([5]);
    });

    it('should handle disjoint exclusions', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5, 6]));
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([5, 6]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2,3,4,5,6} \ ({1,2} ∪ {5,6}) = {1,2,3,4,5,6} \ {1,2,5,6} = {3,4}
      expect(Array.from(not.to._data).sort()).toEqual([3, 4]);
    });

    it('should handle complete exclusion', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2]));
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2} \ {1,2} = {}
      expect(Array.from(not.to._data)).toEqual([]);
    });

    it('should handle non-intersecting exclusions', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2]));
      const setA = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2} \ {3,4} = {1,2}
      expect(Array.from(not.to._data).sort()).toEqual([1, 2]);
    });

    it('should handle single element sets', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1]));
      const setA = new deep.Set(new Set([1]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1} \ {1} = {}
      expect(Array.from(not.to._data)).toEqual([]);
    });

    it('should handle duplicates in exclusions correctly', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      const setA = new deep.Set(new Set([1]));
      const setB = new deep.Set(new Set([1])); // Duplicate exclusion
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // {1,2,3} \ ({1} ∪ {1}) = {1,2,3} \ {1} = {2,3}
      expect(Array.from(not.to._data).sort()).toEqual([2, 3]);
    });
  });

  describe('Not tracking - reactive behavior', () => {
    it('should react to changes in environment (fromEnv)', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3]));
      const setA = new deep.Set(new Set([2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3} \ {2} = {1,3}
      expect(Array.from(not.to._data).sort()).toEqual([1, 3]);
      
      // Add element to environment → should appear in result if not excluded
      envSet.add(4);
      expect(Array.from(not.to._data).sort()).toEqual([1, 3, 4]);
      
      // Add element to environment that is excluded → should not appear in result
      envSet.add(2); // 2 is already in environment and excluded
      expect(Array.from(not.to._data).sort()).toEqual([1, 3, 4]);
      
      // Remove element from environment → should disappear from result
      envSet.delete(1);
      expect(Array.from(not.to._data).sort()).toEqual([3, 4]);
    });

    it('should react to changes in exclude sets', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4]));
      const setA = new deep.Set(new Set([2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3,4} \ {2} = {1,3,4}
      expect(Array.from(not.to._data).sort()).toEqual([1, 3, 4]);
      
      // Add element to exclude set → should disappear from result
      setA.add(3);
      expect(Array.from(not.to._data).sort()).toEqual([1, 4]);
      
      // Add element to exclude set that's not in environment → no change
      setA.add(5);
      expect(Array.from(not.to._data).sort()).toEqual([1, 4]);
      
      // Remove element from exclude set → should reappear in result
      setA.delete(2);
      expect(Array.from(not.to._data).sort()).toEqual([1, 2, 4]);
      
      // Remove element from exclude set that wasn't affecting result → no change
      setA.delete(5);
      expect(Array.from(not.to._data).sort()).toEqual([1, 2, 4]);
    });

    it('should react to adding sets to .value', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3,4,5} \ {1,2} = {3,4,5}
      expect(Array.from(not.to._data).sort()).toEqual([3, 4, 5]);
      
      // Add a second exclude set
      const setB = new deep.Set(new Set([3, 4]));
      valueSetOfSets.add(setB._symbol);
      
      // New difference: {1,2,3,4,5} \ ({1,2} ∪ {3,4}) = {5}
      expect(Array.from(not.to._data)).toEqual([5]);
      
      // Adding element to the new exclude set should be tracked
      setB.add(5);
      expect(Array.from(not.to._data)).toEqual([]);
    });

    it('should react to removing sets from .value', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3,4,5} \ ({1,2} ∪ {3,4}) = {5}
      expect(Array.from(not.to._data)).toEqual([5]);
      
      // Remove one exclude set → difference should expand
      valueSetOfSets.delete(setB._symbol);
      
      // New difference without setB: {1,2,3,4,5} \ {1,2} = {3,4,5}
      expect(Array.from(not.to._data).sort()).toEqual([3, 4, 5]);
      
      // Changes to removed set should not affect result
      setB.add(5);
      expect(Array.from(not.to._data).sort()).toEqual([3, 4, 5]); // Should not change
    });

    it('should handle complex tracking scenarios', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4, 5, 6]));
      const setA = new deep.Set(new Set([1, 2]));
      const setB = new deep.Set(new Set([3, 4]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3,4,5,6} \ ({1,2} ∪ {3,4}) = {5,6}
      expect(Array.from(not.to._data).sort()).toEqual([5, 6]);
      
      // Add element to environment that's not excluded
      envSet.add(7);
      expect(Array.from(not.to._data).sort()).toEqual([5, 6, 7]);
      
      // Add element to environment that is excluded
      envSet.add(1); // 1 is already in environment and excluded
      expect(Array.from(not.to._data).sort()).toEqual([5, 6, 7]);
      
      // Expand exclusion to cover more elements
      setA.add(5);
      expect(Array.from(not.to._data).sort()).toEqual([6, 7]);
      
      // Remove element from environment
      envSet.delete(6);
      expect(Array.from(not.to._data).sort()).toEqual([7]);
      
      // Remove exclusion to bring back elements
      setA.delete(5);
      expect(Array.from(not.to._data).sort()).toEqual([5, 7]);
      
      // Add overlapping exclusion
      setB.add(5);
      expect(Array.from(not.to._data).sort()).toEqual([7]);
    });

    it('should properly clean up tracking on destruction', () => {
      const deep = newDeep();
      
      const envSet = new deep.Set(new Set([1, 2, 3, 4]));
      const setA = new deep.Set(new Set([2, 3]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const not = new deep.Not(envSet, valueSetOfSets);
      
      // Initial difference: {1,2,3,4} \ {2,3} = {1,4}
      expect(Array.from(not.to._data).sort()).toEqual([1, 4]);
      
      // Verify tracking is working
      envSet.add(5);
      expect(Array.from(not.to._data).sort()).toEqual([1, 4, 5]);
      
      // Save reference to result set before destruction
      const resultSet = not.to;
      const originalResult = Array.from(resultSet._data);
      
      // Destroy the Not operation
      not.destroy();
      
      // Changes should no longer affect the result (tracking cleaned up)
      envSet.add(6);
      setA.add(1);
      expect(Array.from(resultSet._data)).toEqual(originalResult); // Should remain unchanged
    });
  });

  describe('Element Destruction Bug Investigation', () => {
    it('should handle element destruction in Or operations', () => {
      const deep = newDeep();
      
      // Create type and elements
      const TypeA = new deep();
      const elem1 = new TypeA();
      const elem2 = new TypeA();
      
      // Create sets containing these elements
      const setA = new deep.Set(new Set([elem1._symbol, elem2._symbol]));
      const setB = new deep.Set(new Set([elem1._symbol]));
      
      // Create Or operation
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const orResult = new deep.Or(undefined, valueSetOfSets);
      
      // Initial state: should contain both elements
      expect(orResult.to._data.has(elem1._symbol)).toBe(true);
      expect(orResult.to._data.has(elem2._symbol)).toBe(true);
      expect(orResult.to._data.size).toBe(2);
      
      // Track destruction events
      let destructionEventsFired = 0;
      const destructionHandler = () => {
        destructionEventsFired++;
      };
      
      orResult.to.on(deep.events.dataDelete, destructionHandler);
      
      // Destroy the type (which should destroy all elements of that type)
      TypeA.destroy();
      
      // Check if elements are properly removed from Or result
      console.log('After TypeA.destroy():');
      console.log('- orResult.to._data.has(elem1._symbol):', orResult.to._data.has(elem1._symbol));
      console.log('- orResult.to._data.has(elem2._symbol):', orResult.to._data.has(elem2._symbol));
      console.log('- orResult.to._data.size:', orResult.to._data.size);
      console.log('- Destruction events fired:', destructionEventsFired);
      
             // FIXED: Elements are correctly removed from Or result after cascading deletion
       expect(orResult.to._data.has(elem1._symbol)).toBe(false);
       expect(orResult.to._data.has(elem2._symbol)).toBe(false);
       expect(orResult.to._data.size).toBe(0);
       expect(destructionEventsFired).toBe(2); // Fires for both elements
    });

    it('should handle element destruction in And operations', () => {
      const deep = newDeep();
      
      // Create type and elements
      const TypeA = new deep();
      const elem1 = new TypeA();
      const elem2 = new TypeA();
      
      // Create sets containing these elements
      const setA = new deep.Set(new Set([elem1._symbol, elem2._symbol]));
      const setB = new deep.Set(new Set([elem1._symbol, elem2._symbol]));
      
      // Create And operation
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const andResult = new deep.And(undefined, valueSetOfSets);
      
      // Initial state: should contain both elements (intersection)
      expect(andResult.to._data.has(elem1._symbol)).toBe(true);
      expect(andResult.to._data.has(elem2._symbol)).toBe(true);
      expect(andResult.to._data.size).toBe(2);
      
      // Track destruction events
      let destructionEventsFired = 0;
      const destructionHandler = () => {
        destructionEventsFired++;
      };
      
      andResult.to.on(deep.events.dataDelete, destructionHandler);
      
      // Destroy the type (which should destroy all elements of that type)
      TypeA.destroy();
      
      // Check if elements are properly removed from And result
      console.log('After TypeA.destroy():');
      console.log('- andResult.to._data.has(elem1._symbol):', andResult.to._data.has(elem1._symbol));
      console.log('- andResult.to._data.has(elem2._symbol):', andResult.to._data.has(elem2._symbol));
      console.log('- andResult.to._data.size:', andResult.to._data.size);
      console.log('- Destruction events fired:', destructionEventsFired);
      
             // FIXED: Elements are correctly removed from And result after cascading deletion
       expect(andResult.to._data.has(elem1._symbol)).toBe(false);
       expect(andResult.to._data.has(elem2._symbol)).toBe(false);
       expect(andResult.to._data.size).toBe(0);
       expect(destructionEventsFired).toBe(2); // Fires for both elements
    });

    it('should handle element destruction in Not operations', () => {
      const deep = newDeep();
      
      // Create types and elements
      const TypeA = new deep();
      const TypeB = new deep();
      const elem1 = new TypeA();
      const elem2 = new TypeA();
      const elem3 = new TypeB();
      
      // Create sets
      const fromSet = new deep.Set(new Set([elem1._symbol, elem2._symbol, elem3._symbol]));
      const excludeSet = new deep.Set(new Set([elem3._symbol])); // Only exclude elem3
      
      // Create Not operation (fromSet - excludeSet)
      const valueSetOfSets = new deep.Set(new Set([excludeSet._symbol]));
      const notResult = new deep.Not(fromSet, valueSetOfSets);
      
      // Initial state: should contain elem1 and elem2 (elem3 is excluded)
      expect(notResult.to._data.has(elem1._symbol)).toBe(true);
      expect(notResult.to._data.has(elem2._symbol)).toBe(true);
      expect(notResult.to._data.has(elem3._symbol)).toBe(false);
      expect(notResult.to._data.size).toBe(2);
      
      // Track destruction events
      let destructionEventsFired = 0;
      const destructionHandler = () => {
        destructionEventsFired++;
      };
      
      notResult.to.on(deep.events.dataDelete, destructionHandler);
      
      // Destroy TypeA (which should destroy elem1 and elem2)
      TypeA.destroy();
      
      // Check if elements are properly removed from Not result
      console.log('After TypeA.destroy():');
      console.log('- notResult.to._data.has(elem1._symbol):', notResult.to._data.has(elem1._symbol));
      console.log('- notResult.to._data.has(elem2._symbol):', notResult.to._data.has(elem2._symbol));
      console.log('- notResult.to._data.has(elem3._symbol):', notResult.to._data.has(elem3._symbol));
      console.log('- notResult.to._data.size:', notResult.to._data.size);
      console.log('- Destruction events fired:', destructionEventsFired);
      
             // FIXED: elem1 and elem2 are correctly removed after cascading deletion
       expect(notResult.to._data.has(elem1._symbol)).toBe(false);
       expect(notResult.to._data.has(elem2._symbol)).toBe(false);
       expect(notResult.to._data.has(elem3._symbol)).toBe(false); // Still excluded
       expect(notResult.to._data.size).toBe(0);
       expect(destructionEventsFired).toBe(2); // Fires for elem1 and elem2
    });

    it('should verify globalDestroyed event is fired', () => {
      const deep = newDeep();
      
      // Track global destruction events
      let globalDestroyedEventsFired = 0;
      const globalDestroyedHandler = (payload: any) => {
        globalDestroyedEventsFired++;
        console.log('globalDestroyed event fired for:', payload._source);
      };
      
      deep.on(deep.events.globalDestroyed, globalDestroyedHandler);
      
      // Create type and element
      const TypeA = new deep();
      const elem1 = new TypeA();
      
      console.log('Created element:', elem1._id);
      
      // Destroy the type
      TypeA.destroy();
      
      console.log('After TypeA.destroy():');
      console.log('- Global destroyed events fired:', globalDestroyedEventsFired);
      
      // Should fire globalDestroyed event
      expect(globalDestroyedEventsFired).toBeGreaterThan(0);
    });

    it('should test direct globalDestroyed tracking in n-ary operations', () => {
      const deep = newDeep();
      
      // Create type and element
      const TypeA = new deep();
      const elem1 = new TypeA();
      
      // Create simple Or operation
      const setA = new deep.Set(new Set([elem1._symbol]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const orResult = new deep.Or(undefined, valueSetOfSets);
      
      // Verify element is in result
      expect(orResult.to._data.has(elem1._symbol)).toBe(true);
      
      // Track events on the Or result
      let dataDeleteEventsFired = 0;
      orResult.to.on(deep.events.dataDelete, () => {
        dataDeleteEventsFired++;
        console.log('dataDelete event fired on Or result');
      });
      
      // Track global destruction events
      let globalDestroyedEventsFired = 0;
      deep.on(deep.events.globalDestroyed, (payload: any) => {
        globalDestroyedEventsFired++;
        console.log('globalDestroyed event fired for:', payload._source);
        
        // Manually check if this element is in our Or result
        if (orResult.to._data.has(payload._source)) {
          console.log('Element', payload._source, 'found in Or result, should be removed');
        }
      });
      
      console.log('Before destruction:');
      console.log('- Element in Or result:', orResult.to._data.has(elem1._symbol));
      console.log('- Or result size:', orResult.to._data.size);
      
      // Destroy the element
      elem1.destroy();
      
      console.log('After elem1.destroy():');
      console.log('- Element in Or result:', orResult.to._data.has(elem1._symbol));
      console.log('- Or result size:', orResult.to._data.size);
      console.log('- Global destroyed events fired:', globalDestroyedEventsFired);
      console.log('- Data delete events fired:', dataDeleteEventsFired);
      
      // Element should be removed from Or result
      expect(orResult.to._data.has(elem1._symbol)).toBe(false);
      expect(orResult.to._data.size).toBe(0);
      expect(globalDestroyedEventsFired).toBe(1);
      expect(dataDeleteEventsFired).toBe(1);
    });

    it('should handle direct element destruction correctly (working case)', () => {
      const deep = newDeep();
      
      // Create type and elements
      const TypeA = new deep();
      const elem1 = new TypeA();
      const elem2 = new TypeA();
      
      // Create sets containing these elements
      const setA = new deep.Set(new Set([elem1._symbol, elem2._symbol]));
      const setB = new deep.Set(new Set([elem1._symbol]));
      
      // Create Or operation
      const valueSetOfSets = new deep.Set(new Set([setA._symbol, setB._symbol]));
      const orResult = new deep.Or(undefined, valueSetOfSets);
      
      // Initial state: should contain both elements
      expect(orResult.to._data.has(elem1._symbol)).toBe(true);
      expect(orResult.to._data.has(elem2._symbol)).toBe(true);
      expect(orResult.to._data.size).toBe(2);
      
      // Track destruction events
      let destructionEventsFired = 0;
      const destructionHandler = () => {
        destructionEventsFired++;
      };
      
      orResult.to.on(deep.events.dataDelete, destructionHandler);
      
      // Destroy elements directly (not the type)
      elem1.destroy();
      elem2.destroy();
      
      // Check if elements are properly removed from Or result
      console.log('After direct element destruction:');
      console.log('- orResult.to._data.has(elem1._symbol):', orResult.to._data.has(elem1._symbol));
      console.log('- orResult.to._data.has(elem2._symbol):', orResult.to._data.has(elem2._symbol));
      console.log('- orResult.to._data.size:', orResult.to._data.size);
      console.log('- Destruction events fired:', destructionEventsFired);
      
      // EXPECTED: Elements should be removed from Or result
      expect(orResult.to._data.has(elem1._symbol)).toBe(false);
      expect(orResult.to._data.has(elem2._symbol)).toBe(false);
      expect(orResult.to._data.size).toBe(0);
      expect(destructionEventsFired).toBe(2); // Should fire for both elements
    });

    it('should demonstrate the difference between type destruction and element destruction', () => {
      const deep = newDeep();
      
      // Test 1: Direct element destruction (should work)
      const TypeA = new deep();
      const elem1 = new TypeA();
      
      const setA = new deep.Set(new Set([elem1._symbol]));
      const valueSetOfSets = new deep.Set(new Set([setA._symbol]));
      const orResult1 = new deep.Or(undefined, valueSetOfSets);
      
      expect(orResult1.to._data.has(elem1._symbol)).toBe(true);
      
      // Destroy element directly
      elem1.destroy();
      expect(orResult1.to._data.has(elem1._symbol)).toBe(false);
      console.log('✅ Direct element destruction works correctly');
      
      // Test 2: Type destruction (currently broken)
      const TypeB = new deep();
      const elem2 = new TypeB();
      const elem3 = new TypeB();
      
      const setB = new deep.Set(new Set([elem2._symbol, elem3._symbol]));
      const valueSetOfSets2 = new deep.Set(new Set([setB._symbol]));
      const orResult2 = new deep.Or(undefined, valueSetOfSets2);
      
      expect(orResult2.to._data.has(elem2._symbol)).toBe(true);
      expect(orResult2.to._data.has(elem3._symbol)).toBe(true);
      
      // Destroy type (elements remain as ghosts)
      TypeB.destroy();
      
      console.log('After TypeB.destroy():');
      console.log('- elem2 still in Or result:', orResult2.to._data.has(elem2._symbol));
      console.log('- elem3 still in Or result:', orResult2.to._data.has(elem3._symbol));
      console.log('- elem2._type exists:', elem2._type !== undefined);
      console.log('- elem3._type exists:', elem3._type !== undefined);
      
             // FIXED: Cascading deletion now works correctly!
       // When type is destroyed, all its elements are also destroyed and removed from n-ary operations
       expect(orResult2.to._data.has(elem2._symbol)).toBe(false); // FIXED: elements properly removed
       expect(orResult2.to._data.has(elem3._symbol)).toBe(false); // FIXED: elements properly removed
       
       console.log('✅ Type destruction now correctly removes elements from n-ary operations!');
    });
  });

  describe('Not with deep._ids tracking', () => {
    it('should track new elements appearing in deep._ids when using Not operation', () => {
      const deep = newDeep();
      
      // Создаем тип A и несколько элементов этого типа
      const A = new deep();
      const a1 = new deep();
      a1.type = A;
      const a2 = new deep();
      a2.type = A;
      
      // Создаем множество элементов типа A
      const typeASet = new deep.Set(new Set([a1._symbol, a2._symbol]));
      
      // Создаем Not операцию: все элементы из deep._ids КРОМЕ элементов типа A
      // env = deep._ids, exclude = typeASet
      const notTypeA = new deep.Not(deep._ids, new deep.Set(new Set([typeASet._symbol])));
      
      const initialSize = notTypeA.to.size;
      console.log(`Initial size of Not operation: ${initialSize}`);
      console.log(`deep._ids size: ${deep._ids.size}`);
      console.log(`typeASet size: ${typeASet.size}`);
      
      // Проверяем, что элементы типа A НЕ включены в результат
      expect(notTypeA.to.has(a1)).toBe(false);
      expect(notTypeA.to.has(a2)).toBe(false);
      
      // Настраиваем отслеживание событий
      let addedCount = 0;
      let deletedCount = 0;
      let addedElements: any[] = [];
      let deletedElements: any[] = [];
      
      notTypeA.to.on(deep.events.dataAdd, (element: any) => {
        addedCount++;
        addedElements.push(element);
        console.log(`Element added to Not result: ${element._id}, total added: ${addedCount}`);
        console.log(`  - Element type: ${element._type || 'undefined'}`);
        console.log(`  - Element in typeASet: ${typeASet.has(element)}`);
        console.log(`  - Current notTypeA.to size: ${notTypeA.to.size}`);
      });
      
      notTypeA.to.on(deep.events.dataDelete, (element: any) => {
        deletedCount++;
        deletedElements.push(element);
        console.log(`Element deleted from Not result: ${element._id}, total deleted: ${deletedCount}`);
        console.log(`  - Element type: ${element._type || 'undefined'}`);
        console.log(`  - Element in typeASet: ${typeASet.has(element)}`);
        console.log(`  - Current notTypeA.to size: ${notTypeA.to.size}`);
      });
      
      // ТЕСТ 1: Создаем новый элемент БЕЗ типа A - он должен появиться в результатах Not
      console.log('\n--- ТЕСТ 1: Создание элемента без типа A ---');
      console.log(`Before creating newElement: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      const newElement = new deep();
      console.log(`Created new element: ${newElement._id}`);
      console.log(`After creating newElement: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      console.log(`deep._ids size after creation: ${deep._ids.size}`);
      console.log(`notTypeA.to size after creation: ${notTypeA.to.size}`);
      
      // Элемент должен появиться в результатах (он в deep._ids, но не в typeASet)
      expect(notTypeA.to.has(newElement)).toBe(true);
      expect(addedCount).toBe(1);
      expect(addedElements[0]._id).toBe(newElement._id);
      
      // ТЕСТ 2: Создаем новый элемент типа A - он НЕ должен появиться в результатах Not
      console.log('\n--- ТЕСТ 2: Создание элемента типа A ---');
      console.log(`Before creating newA: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      const newA = new deep();
      console.log(`Created new A element (before setting type): ${newA._id}`);
      console.log(`After creating newA (before type): addedCount=${addedCount}, deletedCount=${deletedCount}`);
      
      console.log(`Setting type A for newA...`);
      newA.type = A;
      console.log(`After setting type A: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      
      console.log(`Adding newA to typeASet...`);
      typeASet.add(newA._symbol); // Добавляем в множество исключений
      console.log(`After adding to typeASet: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      
      console.log(`Created new A element: ${newA._id}`);
      console.log(`deep._ids size after A creation: ${deep._ids.size}`);
      console.log(`typeASet size after adding newA: ${typeASet.size}`);
      console.log(`notTypeA.to size after A creation: ${notTypeA.to.size}`);
      
      // Элемент НЕ должен появиться в результатах (он в deep._ids, но также в typeASet)
      expect(notTypeA.to.has(newA)).toBe(false);
      // ИСПРАВЛЕНИЕ: Счетчик добавлений должен увеличиться до 2 (newElement + newA),
      // но newA потом удаляется, поэтому deletedCount = 1
      expect(addedCount).toBe(2); // Было добавлено 2 элемента: newElement и newA
      expect(deletedCount).toBe(1); // Был удален 1 элемент: newA (после добавления в typeASet)
      
      // ТЕСТ 3: Удаляем элемент из множества исключений - он должен появиться в результатах
      console.log('\n--- ТЕСТ 3: Удаление из множества исключений ---');
      console.log(`Before removing a1: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      typeASet.delete(a1._symbol);
      console.log(`Removed a1 from typeASet`);
      console.log(`After removing a1: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      console.log(`typeASet size after removal: ${typeASet.size}`);
      console.log(`notTypeA.to size after removal: ${notTypeA.to.size}`);
      
      // a1 теперь должен появиться в результатах (он в deep._ids, но больше не в typeASet)
      expect(notTypeA.to.has(a1)).toBe(true);
      expect(addedCount).toBe(3); // Добавился a1
      expect(addedElements[2]._id).toBe(a1._id);
      
      // ТЕСТ 4: Добавляем элемент обратно в множество исключений - он должен исчезнуть из результатов
      console.log('\n--- ТЕСТ 4: Добавление обратно в множество исключений ---');
      console.log(`Before re-adding a1: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      typeASet.add(a1._symbol);
      console.log(`Added a1 back to typeASet`);
      console.log(`After re-adding a1: addedCount=${addedCount}, deletedCount=${deletedCount}`);
      console.log(`typeASet size after re-adding: ${typeASet.size}`);
      console.log(`notTypeA.to size after re-adding: ${notTypeA.to.size}`);
      
      // a1 должен исчезнуть из результатов
      expect(notTypeA.to.has(a1)).toBe(false);
      expect(deletedCount).toBe(2); // Удалены: newA и a1
      expect(deletedElements[1]._id).toBe(a1._id);
      
      console.log('\n--- Финальная проверка ---');
      console.log(`Final addedCount: ${addedCount}`);
      console.log(`Final deletedCount: ${deletedCount}`);
      console.log(`Final notTypeA.to size: ${notTypeA.to.size}`);
      console.log(`Final deep._ids size: ${deep._ids.size}`);
    });

    it('should handle destruction tracking with deep._ids', () => {
      const deep = newDeep();
      
      // Создаем тип A и элемент этого типа
      const A = new deep();
      const a1 = new deep();
      a1.type = A;
      
      const typeASet = new deep.Set(new Set([a1._symbol]));
      const notTypeA = new deep.Not(deep._ids, new deep.Set(new Set([typeASet._symbol])));
      
      // Создаем обычный элемент, который должен быть в результатах
      const regularElement = new deep();
      expect(notTypeA.to.has(regularElement)).toBe(true);
      
      // Настраиваем отслеживание
      let deletedCount = 0;
      notTypeA.to.on(deep.events.dataDelete, () => deletedCount++);
      
      // Уничтожаем обычный элемент - он должен исчезнуть из результатов
      const elementId = regularElement._id;
      console.log(`Before destroy: deep._ids.has(${elementId}) = ${deep._ids.has(elementId)}`);
      console.log(`Before destroy: deep._ids.size = ${deep._ids.size}`);
      console.log(`Before destroy: deep._ids._data.has(${elementId}) = ${deep._ids._data.has(elementId)}`);
      
      regularElement.destroy();
      
      console.log(`After destroy: deep._ids.has(${elementId}) = ${deep._ids.has(elementId)}`);
      console.log(`After destroy: deep._ids.size = ${deep._ids.size}`);
      console.log(`After destroy: deep._ids._data.has(${elementId}) = ${deep._ids._data.has(elementId)}`);
      
      // Дополнительная отладка для понимания проблемы с has()
      const detectedElement = deep.detect(elementId);
      console.log(`detectedElement._id = ${detectedElement._id}`);
      console.log(`detectedElement._symbol = ${detectedElement._symbol}`);
      console.log(`deep._ids._data.has(detectedElement._id) = ${deep._ids._data.has(detectedElement._id)}`);
      console.log(`deep._ids._data.has(detectedElement._symbol) = ${deep._ids._data.has(detectedElement._symbol)}`);
      
      // Проверяем, что элемент больше не в deep._ids
      // ИСПРАВЛЕНИЕ: Используем _data.has() вместо has(), чтобы не создавать новые элементы
      expect(deep._ids._data.has(elementId)).toBe(false);
      
      // И что он исчез из результатов Not операции
      expect(deletedCount).toBe(1);
    });
  });
}); 