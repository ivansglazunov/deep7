import { newDeep } from '.';

describe('Set', () => {
  it('should create a new deep.Set with initial data', () => {
    const deep = newDeep();
    const initialData = new Set([1, 2, 3]);
    const set = new deep.Set(initialData);
    expect(set.size).toBe(3);
    expect(set.has(1)).toBe(true);
    expect(set.has(2)).toBe(true);
    expect(set.has(3)).toBe(true);
  });
  
  it('should require a Set instance for constructor', () => {
    const deep = newDeep();
    expect(() => new (deep.Set as any)([1, 2, 3])).toThrow('must provide a Set instance to new deep.Set()');
  });

  it('should add unique values and emit events', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2]));
    let addCalled = false;
    let changedCalled = false;

    set.on(deep.events.dataAdd, (arg: any) => {
      addCalled = true;
      expect(arg._symbol).toBe(3);
    });
    set.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    set.add(3);
    expect(set.size).toBe(3);
    expect(set.has(3)).toBe(true);
    expect(addCalled).toBe(true);
    expect(changedCalled).toBe(true);

    // reset and test adding duplicate
    addCalled = false;
    changedCalled = false;
    set.add(3);
    expect(set.size).toBe(3);
    expect(addCalled).toBe(false);
    expect(changedCalled).toBe(false);
  });

  it('should delete values and emit events', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3, 4]));
    let deleteCalled = false;
    let changedCalled = false;

    set.on(deep.events.dataDelete, (arg: any) => {
      deleteCalled = true;
      expect(arg._symbol).toBe(2);
    });
    set.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    const result = set.delete(2);
    expect(result).toBe(true);
    expect(set.size).toBe(3);
    expect(set.has(2)).toBe(false);
    expect(deleteCalled).toBe(true);
    expect(changedCalled).toBe(true);

    const result2 = set.delete(5); // 5 does not exist
    expect(result2).toBe(false);
  });

  it('should allow iteration over a Deep.Set using for...of', () => {
    const deep = newDeep();
    const initialData = new Set([1, "a", 3]);
    const mySet = new deep.Set(initialData);
    const iteratedItems: any[] = [];
    for (const item of mySet) {
        iteratedItems.push(item._symbol);
    }
    expect(iteratedItems).toEqual([1, "a", 3]);
  });
});

describe('Set.difference', () => {
  it('should calculate the difference between two deep.Sets', () => {
    const deep = newDeep();
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3, 4, 5]));
    const resultSet = setA.difference(setB);
    
    expect(resultSet.type.is(deep.Set)).toBe(true);
    expect(resultSet.size).toBe(2);
    expect(resultSet.has(1)).toBe(true);
    expect(resultSet.has(2)).toBe(true);
    expect(resultSet.has(3)).toBe(false);
  });

  it('should calculate difference with an empty set', () => {
    const deep = newDeep();
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([]));
    const resultSet = setA.difference(setB);

    expect(resultSet.size).toBe(3);
    expect(resultSet.has(1)).toBe(true);
    expect(resultSet.has(2)).toBe(true);
    expect(resultSet.has(3)).toBe(true);
  });

  it('should result in an empty set if sets are same', () => {
    const deep = newDeep();
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([1, 2, 3]));
    const resultSet = setA.difference(setB);

    expect(resultSet.size).toBe(0);
  });

  it('should calculate difference with a native JavaScript Set', () => {
    const deep = newDeep();
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new Set([3, 4]);
    const resultSet = setA.difference(setB);

    expect(resultSet.size).toBe(2);
    expect(resultSet.has(1)).toBe(true);
    expect(resultSet.has(2)).toBe(true);
    expect(resultSet.has(3)).toBe(false);
  });

  it('should handle different data types', () => {
    const deep = newDeep();
    const obj1 = new deep();
    const obj2 = new deep();
    const setA = new deep.Set(new Set([1, 'hello', obj1]));
    const setB = new deep.Set(new Set(['hello', obj2, 5]));
    const resultSet = setA.difference(setB);

    expect(resultSet.size).toBe(2);
    expect(resultSet.has(1)).toBe(true);
    expect(resultSet.has('hello')).toBe(false);
    expect(resultSet.has(obj1)).toBe(true);
    expect(resultSet.has(obj2)).toBe(false);
  });
});

  describe('Set.intersection', () => {
    it('should calculate the intersection between two deep.Sets', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3, 4]));
      const setB = new deep.Set(new Set([3, 4, 5, 6]));
      
      const intersectionSet = setA.intersection(setB);
      
      expect(intersectionSet.type.is(deep.Set)).toBe(true);
      expect(intersectionSet.size).toBe(2);
      expect(intersectionSet.has(3)).toBe(true);
      expect(intersectionSet.has(4)).toBe(true);
      expect(intersectionSet.has(1)).toBe(false);
      expect(intersectionSet.has(2)).toBe(false);
      expect(intersectionSet.has(5)).toBe(false);
      expect(intersectionSet.has(6)).toBe(false);
      
      // Original sets should be unchanged
      expect(setA.size).toBe(4);
      expect(setB.size).toBe(4);
    });

    it('should calculate intersection with an empty set', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([]));
      
      const intersectionSet = setA.intersection(setB);
      
      expect(intersectionSet.size).toBe(0);
      expect(Array.from(intersectionSet).length).toBe(0);
    });

    it('should result in an empty set if sets have no common elements', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([4, 5, 6]));
      
      const intersectionSet = setA.intersection(setB);
      
      expect(intersectionSet.size).toBe(0);
    });

    it('should result in identical set if sets are same', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([1, 2, 3]));
      
      const intersectionSet = setA.intersection(setB);
      
      expect(intersectionSet.size).toBe(3);
      expect(intersectionSet.has(1)).toBe(true);
      expect(intersectionSet.has(2)).toBe(true);
      expect(intersectionSet.has(3)).toBe(true);
    });

    it('should calculate intersection with a native JavaScript Set', () => {
      const deep = newDeep();
      const deepSet = new deep.Set(new Set([1, 2, 3, 4]));
      const nativeSet = new Set([3, 4, 5, 6]);
      
      const intersectionSet = deepSet.intersection(nativeSet);
      
      expect(intersectionSet.type.is(deep.Set)).toBe(true);
      expect(intersectionSet.size).toBe(2);
      expect(intersectionSet.has(3)).toBe(true);
      expect(intersectionSet.has(4)).toBe(true);
    });

    it('should handle different data types', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 'hello', 'world', 100]));
      const setB = new deep.Set(new Set(['hello', 'world', 42, 'test']));
      
      const intersectionSet = setA.intersection(setB);
      
      expect(intersectionSet.size).toBe(2);
      expect(intersectionSet.has('hello')).toBe(true);
      expect(intersectionSet.has('world')).toBe(true);
      expect(intersectionSet.has(1)).toBe(false);
      expect(intersectionSet.has(100)).toBe(false);
      expect(intersectionSet.has(42)).toBe(false);
      expect(intersectionSet.has('test')).toBe(false);
    });
  });

  describe('[DEBUG] Set.difference tracking', () => {
  it('should make difference() reactive using tracking system', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3, 4]));
    const differenceSet = setA.difference(setB);
    

    
    // Verify initial difference
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(1)).toBe(true);
    expect(differenceSet.has(2)).toBe(true);
    expect(differenceSet.has(3)).toBe(false);
    
    // Test reactivity by adding to left set
    setA.add(5);
    expect(differenceSet.size).toBe(3);
    expect(differenceSet.has(5)).toBe(true);
    
    // Test that isTrackable works
    expect(deep.Set.difference.isTrackable).toBe(true);
  });

  it('should react to changes in left set (A in A \\ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3, 4]));
    const differenceSet = setA.difference(setB);
    
    // Initial state: A={1,2,3}, B={3,4}, A\B={1,2}
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(1)).toBe(true);
    expect(differenceSet.has(2)).toBe(true);
    
    // Add element to A that's not in B
    setA.add(5);
    expect(differenceSet.size).toBe(3);
    expect(differenceSet.has(5)).toBe(true);
    
    // Add element to A that's already in B - should not appear in result
    setA.add(4);
    expect(differenceSet.size).toBe(3);
    expect(differenceSet.has(4)).toBe(false);
    
    // Delete element from A
    setA.delete(1);
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(1)).toBe(false);
  });

  it('should react to changes in right set (B in A \\ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3]));
    const differenceSet = setA.difference(setB);
    
    // Initial state: A={1,2,3}, B={3}, A\B={1,2}
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(1)).toBe(true);
    expect(differenceSet.has(2)).toBe(true);
    expect(differenceSet.has(3)).toBe(false);
    
    // Add element to B that exists in A - should remove from result
    setB.add(2);
    expect(differenceSet.size).toBe(1);
    expect(differenceSet.has(2)).toBe(false);
    expect(differenceSet.has(1)).toBe(true);
    
    // Delete element from B - should add back to result if it's in A
    setB.delete(3);
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(3)).toBe(true);
  });

  it('should support isTrackable field for difference method', () => {
    const deep = newDeep();
    
    // Test that Set.difference is trackable
    expect(deep.Set.difference.isTrackable).toBe(true);
    
    // Test that Set.difference has trackable in context
    expect(deep.Set.difference._context.trackable).toBeDefined();
    expect(deep.Set.difference._context.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Set.difference._context.trackable;
    expect(trackable.value.type.is(deep.Function)).toBe(true);
    expect(typeof trackable.data).toBe('function');
    
    // Test that regular sets are not trackable
    const regularSet = new deep.Set(new Set([1, 2, 3]));
    expect(regularSet.isTrackable).toBe(false);
    
    // Test that other set methods are not trackable
    expect(deep.Set.add.isTrackable).toBe(false);
    expect(deep.Set.delete.isTrackable).toBe(false);
  });

  it('should handle chained reactive operations', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3, 4]));
    const setB = new deep.Set(new Set([3, 4]));  
    const setC = new deep.Set(new Set([2]));
    
    // Chain: (A \ B) \ C
    const firstDifference = setA.difference(setB);  // {1, 2}
    const chainedDifference = firstDifference.difference(setC);  // {1}
    
    // Verify chained operations work
    expect(chainedDifference.size).toBe(1);
    expect(chainedDifference.has(1)).toBe(true);
    
    // Test reactivity through the chain
    setA.add(5);  // A becomes {1,2,3,4,5}
    expect(firstDifference.size).toBe(3);  // firstDifference becomes {1,2,5}
    expect(chainedDifference.size).toBe(2);  // chainedDifference becomes {1,5}
    expect(chainedDifference.has(5)).toBe(true);
  });

  it('should stop tracking when untrack is called', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3]));
    const differenceSet = setA.difference(setB);
    
    // Initial state: A={1,2,3}, B={3}, A\B={1,2}
    expect(differenceSet.size).toBe(2);
    expect(differenceSet.has(1)).toBe(true);
    expect(differenceSet.has(2)).toBe(true);
    
    // Test that tracking works initially
    setA.add(4);
    expect(differenceSet.size).toBe(3);
    expect(differenceSet.has(4)).toBe(true);
    
    // Untrack both source sets
    const untrackResultA = setA.untrack(differenceSet);
    const untrackResultB = setB.untrack(differenceSet);
    
    expect(untrackResultA).toBe(true);
    expect(untrackResultB).toBe(true);
    
    // After untracking, changes should not affect the result
    setA.add(5); // Should not appear in differenceSet
    expect(differenceSet.size).toBe(3); // Size should remain the same
    expect(differenceSet.has(5)).toBe(false); // 5 should not be tracked
    
    setB.add(2); // Should not remove 2 from differenceSet
    expect(differenceSet.has(2)).toBe(true); // 2 should still be there
  });

  it('should handle partial untracking correctly', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3]));
    const differenceSet = setA.difference(setB);
    
    // Initial state: A={1,2,3}, B={3}, A\B={1,2}
    expect(differenceSet.size).toBe(2);
    
    // Untrack only setA, but keep setB tracking
    const untrackResultA = setA.untrack(differenceSet);
    expect(untrackResultA).toBe(true);
    
    // Changes to setA should not be tracked anymore
    setA.add(4);
    expect(differenceSet.has(4)).toBe(false);
    
    // But changes to setB should still be tracked
    setB.add(1); // This should remove 1 from the result
    expect(differenceSet.has(1)).toBe(false);
  });
});

describe('[DEBUG] Set.intersection tracking', () => {
  it('should make intersection() reactive using tracking system', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([2, 3, 4]));
    const intersectionSet = setA.intersection(setB);
    
    // Verify initial intersection
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(true);
    expect(intersectionSet.has(3)).toBe(true);
    expect(intersectionSet.has(1)).toBe(false);
    expect(intersectionSet.has(4)).toBe(false);
    
    // Test reactivity by adding to both sets
    setA.add(5);
    setB.add(5);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(5)).toBe(true);
    
    // Test that isTrackable works
    expect(deep.Set.intersection.isTrackable).toBe(true);
  });

  it('should react to changes in left set (A in A ∩ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([2, 3, 4]));
    const intersectionSet = setA.intersection(setB);
    
    // Initial state: A={1,2,3}, B={2,3,4}, A∩B={2,3}
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(true);
    expect(intersectionSet.has(3)).toBe(true);
    
    // Add element to A that's also in B - should appear in result
    setA.add(4);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(4)).toBe(true);
    
    // Add element to A that's not in B - should not appear in result
    setA.add(5);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(5)).toBe(false);
    
    // Delete element from A that's also in result
    setA.delete(2);
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(false);
    expect(intersectionSet.has(3)).toBe(true);
    expect(intersectionSet.has(4)).toBe(true);
  });

  it('should react to changes in right set (B in A ∩ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([2, 3]));
    const intersectionSet = setA.intersection(setB);
    
    // Initial state: A={1,2,3}, B={2,3}, A∩B={2,3}
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(true);
    expect(intersectionSet.has(3)).toBe(true);
    
    // Add element to B that exists in A - should appear in result
    setB.add(1);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(1)).toBe(true);
    
    // Add element to B that doesn't exist in A - should not appear in result
    setB.add(4);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(4)).toBe(false);
    
    // Delete element from B - should remove from result
    setB.delete(2);
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(false);
    expect(intersectionSet.has(3)).toBe(true);
    expect(intersectionSet.has(1)).toBe(true);
  });

  it('should support isTrackable field for intersection method', () => {
    const deep = newDeep();
    
    // Test that Set.intersection is trackable
    expect(deep.Set.intersection.isTrackable).toBe(true);
    
    // Test that Set.intersection has trackable in context
    expect(deep.Set.intersection._context.trackable).toBeDefined();
    expect(deep.Set.intersection._context.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Set.intersection._context.trackable;
    expect(trackable.value.type.is(deep.Function)).toBe(true);
    expect(typeof trackable.data).toBe('function');
    
    // Test that regular sets are not trackable
    const regularSet = new deep.Set(new Set([1, 2, 3]));
    expect(regularSet.isTrackable).toBe(false);
  });

  it('should handle chained reactive operations with intersection', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3, 4]));
    const setB = new deep.Set(new Set([2, 3, 4, 5]));  
    const setC = new deep.Set(new Set([3, 4, 5, 6]));
    
    // Chain: (A ∩ B) ∩ C
    const firstIntersection = setA.intersection(setB);  // {2, 3, 4}
    const chainedIntersection = firstIntersection.intersection(setC);  // {3, 4}
    
    // Verify chained operations work
    expect(chainedIntersection.size).toBe(2);
    expect(chainedIntersection.has(3)).toBe(true);
    expect(chainedIntersection.has(4)).toBe(true);
    
    // Test reactivity through the chain
    setA.add(5);  // A becomes {1,2,3,4,5}
    expect(firstIntersection.size).toBe(4);  // firstIntersection becomes {2,3,4,5}
    expect(chainedIntersection.size).toBe(3);  // chainedIntersection becomes {3,4,5}
    expect(chainedIntersection.has(5)).toBe(true);
  });

  it('should stop tracking when untrack is called', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([2, 3, 4]));
    const intersectionSet = setA.intersection(setB);
    
    // Initial state: A={1,2,3}, B={2,3,4}, A∩B={2,3}
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(2)).toBe(true);
    expect(intersectionSet.has(3)).toBe(true);
    
    // Test that tracking works initially
    setA.add(4);
    expect(intersectionSet.size).toBe(3);
    expect(intersectionSet.has(4)).toBe(true);
    
    // Untrack both source sets
    const untrackResultA = setA.untrack(intersectionSet);
    const untrackResultB = setB.untrack(intersectionSet);
    
    expect(untrackResultA).toBe(true);
    expect(untrackResultB).toBe(true);
    
    // After untracking, changes should not affect the result
    setA.add(5); // This won't be tracked
    setB.add(5); // This won't be tracked either
    expect(intersectionSet.size).toBe(3); // Size should remain the same
    expect(intersectionSet.has(5)).toBe(false); // 5 should not be tracked
    
    setA.delete(2); // Should not remove 2 from intersectionSet
    expect(intersectionSet.has(2)).toBe(true); // 2 should still be there
  });

  it('should handle edge cases with empty sets', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([]));
    const intersectionSet = setA.intersection(setB);
    
    // Initial state: A={1,2,3}, B={}, A∩B={}
    expect(intersectionSet.size).toBe(0);
    
    // Add element to empty set B
    setB.add(2);
    expect(intersectionSet.size).toBe(1);
    expect(intersectionSet.has(2)).toBe(true);
    
    // Remove element from B
    setB.delete(2);
    expect(intersectionSet.size).toBe(0);
  });

  it('should handle simultaneous changes to both sets', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));
    const intersectionSet = setA.intersection(setB);
    
    // Initial state: A={1,2}, B={2,3}, A∩B={2}
    expect(intersectionSet.size).toBe(1);
    expect(intersectionSet.has(2)).toBe(true);
    
    // Add same element to both sets
    setA.add(4);
    setB.add(4);
    expect(intersectionSet.size).toBe(2);
    expect(intersectionSet.has(4)).toBe(true);
    
    // Delete element from one set only
    setA.delete(4);
    expect(intersectionSet.size).toBe(1);
    expect(intersectionSet.has(4)).toBe(false);
    expect(intersectionSet.has(2)).toBe(true);
  });
});