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

  it('should allow iteration over a Deep.Set using for...of with deeps', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new deep();
    const c = new deep();
    const initialData = new Set([a._id, b._id, c._id]);
    const mySet = new deep.Set(initialData);
    const iteratedItems: any[] = [];
    for (const item of mySet) {
        iteratedItems.push(item._id);
    }
    expect(iteratedItems).toEqual([a._id, b._id, c._id]);
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
    // Use _symbol instead of Deep instances in Sets
    const setA = new deep.Set(new Set([1, 'hello', obj1._symbol]));
    const setB = new deep.Set(new Set(['hello', obj2._symbol, 5]));
    const resultSet = setA.difference(setB);

    expect(resultSet.size).toBe(2);
    expect(resultSet.has(1)).toBe(true);
    expect(resultSet.has('hello')).toBe(false);
    expect(resultSet.has(obj1._symbol)).toBe(true);
    expect(resultSet.has(obj2._symbol)).toBe(false);
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

  describe('Set.union', () => {
    it('should calculate the union between two deep.Sets', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([3, 4, 5]));
      
      const unionSet = setA.union(setB);
      
      expect(unionSet.type.is(deep.Set)).toBe(true);
      expect(unionSet.size).toBe(5);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has(2)).toBe(true);
      expect(unionSet.has(3)).toBe(true);
      expect(unionSet.has(4)).toBe(true);
      expect(unionSet.has(5)).toBe(true);
    });

    it('should calculate union with an empty set', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([]));
      
      const unionSet = setA.union(setB);
      
      expect(unionSet.size).toBe(3);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has(2)).toBe(true);
      expect(unionSet.has(3)).toBe(true);
    });

    it('should result in union when sets have no common elements', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([4, 5, 6]));
      
      const unionSet = setA.union(setB);
      
      expect(unionSet.size).toBe(6);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has(2)).toBe(true);
      expect(unionSet.has(3)).toBe(true);
      expect(unionSet.has(4)).toBe(true);
      expect(unionSet.has(5)).toBe(true);
      expect(unionSet.has(6)).toBe(true);
    });

    it('should result in identical set if sets are same', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 2, 3]));
      const setB = new deep.Set(new Set([1, 2, 3]));
      
      const unionSet = setA.union(setB);
      
      expect(unionSet.size).toBe(3);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has(2)).toBe(true);
      expect(unionSet.has(3)).toBe(true);
    });

    it('should calculate union with a native JavaScript Set', () => {
      const deep = newDeep();
      const deepSet = new deep.Set(new Set([1, 2, 3]));
      const nativeSet = new Set([3, 4, 5]);
      
      const unionSet = deepSet.union(nativeSet);
      
      expect(unionSet.type.is(deep.Set)).toBe(true);
      expect(unionSet.size).toBe(5);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has(2)).toBe(true);
      expect(unionSet.has(3)).toBe(true);
      expect(unionSet.has(4)).toBe(true);
      expect(unionSet.has(5)).toBe(true);
    });

    it('should handle different data types', () => {
      const deep = newDeep();
      const setA = new deep.Set(new Set([1, 'hello', 'world']));
      const setB = new deep.Set(new Set(['world', 42, 'test', null, true]));
      
      const unionSet = setA.union(setB);
      
      expect(unionSet.size).toBe(7);
      expect(unionSet.has(1)).toBe(true);
      expect(unionSet.has('hello')).toBe(true);
      expect(unionSet.has('world')).toBe(true);
      expect(unionSet.has(42)).toBe(true);
      expect(unionSet.has('test')).toBe(true);
      expect(unionSet.has(null)).toBe(true);
      expect(unionSet.has(true)).toBe(true);
    });
  });

  describe('Set.difference tracking', () => {
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
    expect(deep.Set.difference._contain.trackable).toBeDefined();
    expect(deep.Set.difference._contain.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Set.difference._contain.trackable;
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

describe('Set.intersection tracking', () => {
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
    expect(deep.Set.intersection._contain.trackable).toBeDefined();
    expect(deep.Set.intersection._contain.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Set.intersection._contain.trackable;
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

describe('Set.union tracking', () => {
  it('should make union() reactive using tracking system', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([3, 4, 5]));
    const unionSet = setA.union(setB);
    
    // Verify initial union
    expect(unionSet.size).toBe(5);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    expect(unionSet.has(4)).toBe(true);
    expect(unionSet.has(5)).toBe(true);
    
    // Test reactivity by adding to one set
    setA.add(6);
    expect(unionSet.size).toBe(6);
    expect(unionSet.has(6)).toBe(true);
    
    // Test that isTrackable works
    expect(deep.Set.union.isTrackable).toBe(true);
  });

  it('should react to changes in left set (A in A ∪ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));
    const unionSet = setA.union(setB);
    
    // Initial state: A={1,2}, B={2,3}, A∪B={1,2,3}
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    
    // Add element to A that's not in B - should appear in result
    setA.add(4);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(4)).toBe(true);
    
    // Add element to A that's already in B - should not change result size
    setA.add(3);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(3)).toBe(true);
    
    // Delete element from A that's not in B - should remove from result
    setA.delete(1);
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(false);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    expect(unionSet.has(4)).toBe(true);
    
    // Delete element from A that's also in B - should keep in result
    setA.delete(2);
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(2)).toBe(true); // Still in B
    expect(unionSet.has(3)).toBe(true);
    expect(unionSet.has(4)).toBe(true);
  });

  it('should react to changes in right set (B in A ∪ B)', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));
    const unionSet = setA.union(setB);
    
    // Initial state: A={1,2}, B={2,3}, A∪B={1,2,3}
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    
    // Add element to B that's not in A - should appear in result
    setB.add(4);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(4)).toBe(true);
    
    // Add element to B that's already in A - should not change result size
    setB.add(1);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(1)).toBe(true);
    
    // Delete element from B that's not in A - should remove from result
    setB.delete(3);
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(3)).toBe(false);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(4)).toBe(true);
    
    // Delete element from B that's also in A - should keep in result
    setB.delete(2);
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(2)).toBe(true); // Still in A
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(4)).toBe(true);
  });

  it('should support isTrackable field for union method', () => {
    const deep = newDeep();
    
    // Test that Set.union is trackable
    expect(deep.Set.union.isTrackable).toBe(true);
    
    // Test that Set.union has trackable in context
    expect(deep.Set.union._contain.trackable).toBeDefined();
    expect(deep.Set.union._contain.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Set.union._contain.trackable;
    expect(trackable.value.type.is(deep.Function)).toBe(true);
    expect(typeof trackable.data).toBe('function');
    
    // Test that regular sets are not trackable
    const regularSet = new deep.Set(new Set([1, 2, 3]));
    expect(regularSet.isTrackable).toBe(false);
  });

  it('should handle chained reactive operations with union', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));  
    const setC = new deep.Set(new Set([3, 4]));
    
    // Chain: (A ∪ B) ∪ C
    const firstUnion = setA.union(setB);  // {1, 2, 3}
    const chainedUnion = firstUnion.union(setC);  // {1, 2, 3, 4}
    
    // Verify chained operations work
    expect(chainedUnion.size).toBe(4);
    expect(chainedUnion.has(1)).toBe(true);
    expect(chainedUnion.has(2)).toBe(true);
    expect(chainedUnion.has(3)).toBe(true);
    expect(chainedUnion.has(4)).toBe(true);
    
    // Test reactivity through the chain
    setA.add(5);  // A becomes {1,2,5}
    expect(firstUnion.size).toBe(4);  // firstUnion becomes {1,2,3,5}
    expect(chainedUnion.size).toBe(5);  // chainedUnion becomes {1,2,3,4,5}
    expect(chainedUnion.has(5)).toBe(true);
  });

  it('should stop tracking when untrack is called', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));
    const unionSet = setA.union(setB);
    
    // Initial state: A={1,2}, B={2,3}, A∪B={1,2,3}
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    
    // Test that tracking works initially
    setA.add(4);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(4)).toBe(true);
    
    // Untrack both source sets
    const untrackResultA = setA.untrack(unionSet);
    const untrackResultB = setB.untrack(unionSet);
    
    expect(untrackResultA).toBe(true);
    expect(untrackResultB).toBe(true);
    
    // After untracking, changes should not affect the result
    setA.add(5); // This won't be tracked
    setB.add(6); // This won't be tracked either
    expect(unionSet.size).toBe(4); // Size should remain the same
    expect(unionSet.has(5)).toBe(false); // 5 should not be tracked
    expect(unionSet.has(6)).toBe(false); // 6 should not be tracked
    
    setA.delete(1); // Should not remove 1 from unionSet
    expect(unionSet.has(1)).toBe(true); // 1 should still be there
  });

  it('should handle edge cases with empty sets', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2, 3]));
    const setB = new deep.Set(new Set([]));
    const unionSet = setA.union(setB);
    
    // Initial state: A={1,2,3}, B={}, A∪B={1,2,3}
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    
    // Add element to empty set B
    setB.add(4);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(4)).toBe(true);
    
    // Add element to B that's already in A
    setB.add(1);
    expect(unionSet.size).toBe(4); // Size should not change
    expect(unionSet.has(1)).toBe(true);
    
    // Remove element from B that's not in A
    setB.delete(4);
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(4)).toBe(false);
  });

  it('should handle simultaneous changes to both sets', () => {
    const deep = newDeep();
    
    const setA = new deep.Set(new Set([1, 2]));
    const setB = new deep.Set(new Set([2, 3]));
    const unionSet = setA.union(setB);
    
    // Initial state: A={1,2}, B={2,3}, A∪B={1,2,3}
    expect(unionSet.size).toBe(3);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
    
    // Add same element to both sets
    setA.add(4);
    setB.add(4);
    expect(unionSet.size).toBe(4);
    expect(unionSet.has(4)).toBe(true);
    
    // Delete element from one set only (but not both)
    setA.delete(4);
    expect(unionSet.size).toBe(4); // Should remain because still in B
    expect(unionSet.has(4)).toBe(true);
    
    // Delete element from the other set too
    setB.delete(4);
    expect(unionSet.size).toBe(3); // Now should be removed
    expect(unionSet.has(4)).toBe(false);
    expect(unionSet.has(1)).toBe(true);
    expect(unionSet.has(2)).toBe(true);
    expect(unionSet.has(3)).toBe(true);
  });
});

describe('Set.map', () => {
  let deep: any;

  beforeEach(() => {
    deep = newDeep();
  });

  describe('Basic functionality', () => {
    it('should map elements with a simple transformation', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      expect(mappedSet.type.is(deep.Set)).toBe(true);
      expect(mappedSet._data).toEqual(new Set([2, 4, 6]));
      expect(mappedSet.size).toBe(3);
      expect(mappedSet.has(2)).toBe(true);
      expect(mappedSet.has(4)).toBe(true);
      expect(mappedSet.has(6)).toBe(true);
    });

    it('should handle string transformations', () => {
      const sourceSet = new deep.Set(new Set(['a', 'b', 'c']));
      const mappedSet = sourceSet.map((s: string) => s.toUpperCase());
      
      expect(mappedSet._data).toEqual(new Set(['A', 'B', 'C']));
      expect(mappedSet.has('A')).toBe(true);
      expect(mappedSet.has('B')).toBe(true);
      expect(mappedSet.has('C')).toBe(true);
    });

    it('should maintain mapping state for tracking', () => {
      const sourceSet = new deep.Set(new Set(['a', 'b']));
      const mappedSet = sourceSet.map((s: string) => s.toUpperCase());
      
      // Check internal state
      expect(mappedSet._state._mapFn).toBeDefined();
      expect(mappedSet._state._sourceSet._id).toBe(sourceSet._id);
      expect(mappedSet._state._mapValues).toBeInstanceOf(Map);
      expect(mappedSet._state._mapValues.get('a')).toBe('A');
      expect(mappedSet._state._mapValues.get('b')).toBe('B');
    });

    it('should throw error for already setted data', () => {
      // Create a Set instance and modify its _data to be non-Set
      const validSet = new deep.Set(new Set([1, 2]));
      
      // Directly modify internal data to break assumption while keeping Set context
      expect(() => (validSet._data = 'invalid-data' as any)).toThrow();
    });
  });

  describe('Deep instance conversion', () => {
    it('should convert Deep instances to _symbol in results', () => {
      const deep1 = new deep();
      const deep2 = new deep();
      const sourceSet = new deep.Set(new Set([deep1._id, deep2._id]));
      
      // Callback returns Deep instances - should be converted to _symbol
      const mappedSet = sourceSet.map((id: string) => new deep(id));
      
      // Result should contain _symbol values, not Deep instances
      expect(Array.from(mappedSet._data)).toEqual([deep1._id, deep2._id]);
      expect(mappedSet.has(deep1._id)).toBe(true);
      expect(mappedSet.has(deep2._id)).toBe(true);
      
      // Verify mapping tracker reflects the conversion
      expect(mappedSet._state._mapValues.get(deep1._id)).toBe(deep1._id);
      expect(mappedSet._state._mapValues.get(deep2._id)).toBe(deep2._id);
    });

    it('should handle mixed return types with Deep conversion', () => {
      const deepInstance = new deep();
      const sourceSet = new deep.Set(new Set([1, 'test']));
      
      const mappedSet = sourceSet.map((value: any) => {
        if (value === 1) return deepInstance; // Deep instance
        return value.toUpperCase(); // String
      });
      
      expect(mappedSet._data).toEqual(new Set([deepInstance._id, 'TEST']));
      expect(mappedSet.has(deepInstance._id)).toBe(true);
      expect(mappedSet.has('TEST')).toBe(true);
    });
  });

  describe('Reactive tracking - adding elements', () => {
    it('should track additions to source set', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      let addedToMapped: any = null;
      let changedCalled = false;
      
      mappedSet.on(deep.events.dataAdd, (element: any) => {
        addedToMapped = element._symbol;
      });
      mappedSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });
      
      // Add element to source
      sourceSet.add(4);
      
      // Check mapped set updated
      expect(mappedSet._data.has(8)).toBe(true);
      expect(mappedSet.size).toBe(4);
      expect(addedToMapped).toBe(8);
      expect(changedCalled).toBe(true);
      
      // Check mapping tracker updated
      expect(mappedSet._state._mapValues.get(4)).toBe(8);
    });

    it('should emit correct events for additions', () => {
      const sourceSet = new deep.Set(new Set([1, 2]));
      const mappedSet = sourceSet.map((x: number) => x * 10);
      
      const events: any[] = [];
      mappedSet.on(deep.events.dataAdd, (element: any) => {
        events.push({ type: 'add', value: element._symbol });
      });
      mappedSet.on(deep.events.dataChanged, () => {
        events.push({ type: 'changed' });
      });
      
      sourceSet.add(3);
      
      expect(events).toEqual([
        { type: 'add', value: 30 },
        { type: 'changed' }
      ]);
    });
  });

  describe('Reactive tracking - removing elements', () => {
    it('should track deletions from source set', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      let deletedFromMapped: any = null;
      let changedCalled = false;
      
      mappedSet.on(deep.events.dataDelete, (element: any) => {
        deletedFromMapped = element._symbol;
      });
      mappedSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });
      
      // Delete element from source
      sourceSet.delete(1);
      
      // Check mapped set updated
      expect(mappedSet._data.has(2)).toBe(false);
      expect(mappedSet.size).toBe(2);
      expect(deletedFromMapped).toBe(2);
      expect(changedCalled).toBe(true);
      
      // Check mapping tracker cleaned up
      expect(mappedSet._state._mapValues.has(1)).toBe(false);
    });

    it('should handle deletion of non-existent elements gracefully', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      let eventsFired = 0;
      mappedSet.on(deep.events.dataDelete, () => { eventsFired++; });
      
      // Try to delete element that doesn't exist
      sourceSet.delete(5);
      
      // Should not trigger events on mapped set
      expect(eventsFired).toBe(0);
      expect(mappedSet.size).toBe(3);
    });
  });

  describe('Reactive tracking - clear operations', () => {
    it('should track clear operations on source set', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      let changedCalled = false;
      
      mappedSet.on(deep.events.dataChanged, () => {
        changedCalled = true;
      });
      
      // Clear source set
      sourceSet.clear();
      
      expect(sourceSet.size).toBe(0);
      expect(mappedSet.size).toBe(0);
      expect(changedCalled).toBe(true);
    });
  });

  describe('Tracking lifecycle', () => {
    it('should stop tracking when source tracker is disposed', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      // Verify initial tracking state
      expect(mappedSet.size).toBe(3);
      
      // Test that tracking initially works
      sourceSet.add(4);
      expect(mappedSet.has(8)).toBe(true);
      expect(mappedSet.size).toBe(4);
      
      // Check that tracker exists in state
      expect(mappedSet._state._sourceTracker).toBeDefined();
      
      // Use untrack method instead of calling disposer directly
      const untracked = sourceSet.untrack(mappedSet);
      expect(untracked).toBe(true);
      
      let eventFired = false;
      mappedSet.on(deep.events.dataAdd, () => { eventFired = true; });
      
      // Add element to source - should not affect mapped set after untrack
      sourceSet.add(5);
      
      expect(mappedSet._data.has(10)).toBe(false);
      expect(mappedSet.size).toBe(4); // Should remain unchanged
      expect(eventFired).toBe(false);
    });

    it('should handle untrack from source set', () => {
      const sourceSet = new deep.Set(new Set([1, 2]));
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      // Verify initial tracking works
      sourceSet.add(3);
      expect(mappedSet.has(6)).toBe(true);
      
      // Untrack the mapped set from source
      const untracked = sourceSet.untrack(mappedSet);
      expect(untracked).toBe(true);
      
      // Further changes should not be tracked
      let eventFired = false;
      mappedSet.on(deep.events.dataAdd, () => { eventFired = true; });
      
      sourceSet.add(4);
      expect(mappedSet.has(8)).toBe(false);
      expect(eventFired).toBe(false);
    });
  });

  describe('Complex transformations', () => {
    it('should handle object transformations', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => ({ value: x, doubled: x * 2 }));
      
      // Should work with complex objects
      expect(mappedSet.size).toBe(3);
      
      // Check that objects are stored correctly
      const values = Array.from(mappedSet._data);
      expect(values).toContainEqual({ value: 1, doubled: 2 });
      expect(values).toContainEqual({ value: 2, doubled: 4 });
      expect(values).toContainEqual({ value: 3, doubled: 6 });
    });

    it('should handle function transformations', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: number) => (y: number) => x + y);
      
      expect(mappedSet.size).toBe(3);
      
      // Functions should be stored as-is
      const functions = Array.from(mappedSet._data);
      expect(functions.every(f => typeof f === 'function')).toBe(true);
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large sets efficiently', () => {
      const largeData = new Set();
      for (let i = 0; i < 1000; i++) {
        largeData.add(i);
      }
      
      const sourceSet = new deep.Set(largeData);
      const mappedSet = sourceSet.map((x: number) => x * 2);
      
      expect(mappedSet.size).toBe(1000);
      expect(mappedSet._state._mapValues.size).toBe(1000);
      
      // Test that tracking still works with large sets
      sourceSet.add(1000);
      expect(mappedSet.has(2000)).toBe(true);
      expect(mappedSet.size).toBe(1001);
    });

    it('should handle duplicate results from mapping', () => {
      // Multiple source values map to same result
      const sourceSet = new deep.Set(new Set([1, -1, 2, -2]));
      const mappedSet = sourceSet.map((x: number) => Math.abs(x));
      
      // Set should only contain unique values
      expect(mappedSet._data).toEqual(new Set([1, 2]));
      expect(mappedSet.size).toBe(2);
    });

    it('should handle identity transformations', () => {
      const sourceSet = new deep.Set(new Set([1, 2, 3]));
      const mappedSet = sourceSet.map((x: any) => x);
      expect(mappedSet._data).toEqual(new Set([1, 2, 3]));
      expect(mappedSet.size).toBe(3);
      
      // Should still track changes
      sourceSet.add(4);
      expect(mappedSet.has(4)).toBe(true);
    });
  });
});

describe('Set.sort', () => {
  it('should sort set to deep.Array in ascending order by default', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([3, 1, 4, 1, 5])); // Note: Set will deduplicate 1
    
    const result = set.sort();
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([1, 3, 4, 5]); // Sorted and deduplicated
    expect(set.size).toBe(4); // Original set unchanged
  });

  it('should sort set to deep.Array with custom compare function', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([3, 1, 4, 5]));
    
    const result = set.sort((a: number, b: number) => b - a); // Descending order
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([5, 4, 3, 1]);
    expect(set.size).toBe(4); // Original set unchanged
  });

  it('should sort set with strings', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set(['cherry', 'apple', 'banana']));
    
    const result = set.sort();
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual(['apple', 'banana', 'cherry']);
  });

  it('should sort set with mixed types using custom compareFn', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([3, 'apple', 1, 'banana']));
    
    // Sort by string representation
    const result = set.sort((a: any, b: any) => String(a).localeCompare(String(b)));
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([1, 3, 'apple', 'banana']);
  });

  it('should sort empty set to empty deep.Array', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set());
    
    const result = set.sort();
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([]);
  });

  it('should maintain reactivity - sorted array should update when original set changes', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([3, 1, 4]));
    
    const sortedArray = set.sort();
    let changedCalled = false;

    sortedArray.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    // Modify original set
    set.add(2);
    
    expect(sortedArray._data).toEqual([1, 2, 3, 4]);
    expect(changedCalled).toBe(true);
  });

  it('should maintain reactivity when element deleted from original set', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([3, 1, 4, 5]));
    
    const sortedArray = set.sort();
    let changedCalled = false;

    sortedArray.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    // Delete from original set
    set.delete(3);
    
    expect(sortedArray._data).toEqual([1, 4, 5]);
    expect(changedCalled).toBe(true);
  });

  it('should make Set.sort() reactive with point-wise updates', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([3, 1, 4]));
    const sortedArray = sourceSet.sort();
    
    // Verify initial sorting
    expect(sortedArray._data).toEqual([1, 3, 4]);
    
    // Test reactivity by adding to source - should insert in correct position
    sourceSet.add(2);
    expect(sortedArray._data).toEqual([1, 2, 3, 4]);
    
    // Test adding larger value
    sourceSet.add(5);
    expect(sortedArray._data).toEqual([1, 2, 3, 4, 5]);
    
    // Test adding smaller value
    sourceSet.add(0);
    expect(sortedArray._data).toEqual([0, 1, 2, 3, 4, 5]);
    
    // Test removing from source
    sourceSet.delete(3);
    expect(sortedArray._data).toEqual([0, 1, 2, 4, 5]);
  });

  it('should make Set.sort() reactive with custom compare function and point-wise updates', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([3, 1, 4]));
    const sortedArray = sourceSet.sort((a: number, b: number) => b - a); // Descending
    
    // Verify initial sorting (descending)
    expect(sortedArray._data).toEqual([4, 3, 1]);
    
    // Test reactivity with descending order
    sourceSet.add(2);
    expect(sortedArray._data).toEqual([4, 3, 2, 1]);
    
    sourceSet.add(5);
    expect(sortedArray._data).toEqual([5, 4, 3, 2, 1]);
    
    sourceSet.delete(3);
    expect(sortedArray._data).toEqual([5, 4, 2, 1]);
  });

  it('should handle Set.sort() with clear operations', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([3, 1, 4]));
    const sortedArray = sourceSet.sort();
    
    expect(sortedArray._data).toEqual([1, 3, 4]);
    
    // Test clear operation
    sourceSet.clear();
    expect(sortedArray._data).toEqual([]);
  });

  it('should verify that Set.sort is trackable', () => {
    const deep = newDeep();
    
    // Test that Set.sort is trackable
    expect(deep.Set.sort.isTrackable).toBe(true);
    
    // Test that Set.sort has trackable in context
    expect(deep.Set.sort._contain.trackable).toBeDefined();
    expect(deep.Set.sort._contain.trackable.type.is(deep.Trackable)).toBe(true);
  });

  it('should handle edge case with duplicate values during reactive updates', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([2, 1, 3]));
    const sortedArray = sourceSet.sort();
    
    expect(sortedArray._data).toEqual([1, 2, 3]);
    
    // Adding duplicate should not change sorted array (sets deduplicate)
    sourceSet.add(2);
    expect(sortedArray._data).toEqual([1, 2, 3]); // No change expected
    
    // Delete and re-add
    sourceSet.delete(2);
    expect(sortedArray._data).toEqual([1, 3]);
    
    sourceSet.add(2);
    expect(sortedArray._data).toEqual([1, 2, 3]);
  });
});

describe('Set.filter', () => {
  it('should filter values to a new deep.Set', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3, 4, 5]));
    const filterFn = (x: number) => x % 2 === 0; // Filter even numbers
    
    const filteredSet = set.filter(filterFn);
    
    expect(filteredSet.type.is(deep.Set)).toBe(true);
    expect(filteredSet.size).toBe(2);
    expect(filteredSet.has(2)).toBe(true);
    expect(filteredSet.has(4)).toBe(true);
    expect(filteredSet.has(1)).toBe(false);
    expect(filteredSet.has(3)).toBe(false);
    expect(filteredSet.has(5)).toBe(false);
    expect(set.size).toBe(5); // Original set should be unchanged
  });

  it('should make set.filter() reactive using tracking system', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0);
    
    // Verify initial filtering
    expect(evenSet.size).toBe(2);
    expect(evenSet.has(2)).toBe(true);
    expect(evenSet.has(4)).toBe(true);
    
    // Test reactivity by adding to source
    sourceSet.add(6); // Even number
    expect(evenSet.size).toBe(3);
    expect(evenSet.has(6)).toBe(true);
    
    sourceSet.add(7); // Odd number - should not appear in filtered set
    expect(evenSet.size).toBe(3);
    expect(evenSet.has(7)).toBe(false);
    
    // Test removing from source
    sourceSet.delete(2);
    expect(evenSet.size).toBe(2);
    expect(evenSet.has(2)).toBe(false);
    expect(evenSet.has(4)).toBe(true);
  });

  it('should verify filter callback receives deep-wrapped values', () => {
    const deep = newDeep();
    
    const receivedValues: any[] = [];
    const sourceSet = new deep.Set(new Set(['hello', 'world', 'test']));
    
    const filteredSet = sourceSet.filter((value: any) => {
      receivedValues.push({
        value,
        isString: typeof value === 'string', // Should be the _symbol (unwrapped)
      });
      return value.length > 4; // Filter strings longer than 4 characters
    });
    
    expect(filteredSet.size).toBe(2);
    expect(filteredSet.has('hello')).toBe(true);
    expect(filteredSet.has('world')).toBe(true);
    expect(filteredSet.has('test')).toBe(false);
    expect(receivedValues).toHaveLength(3);
    expect(receivedValues[0].value).toBe('hello');
    expect(receivedValues[1].value).toBe('world');
    expect(receivedValues[2].value).toBe('test');
    expect(receivedValues.every(rv => rv.isString)).toBe(true);
  });

  it('should verify that Set.filter is trackable', () => {
    const deep = newDeep();
    
    // Test that Set.filter is trackable
    expect(deep.Set.filter.isTrackable).toBe(true);
    
    // Test that Set.filter has trackable in context
    expect(deep.Set.filter._contain.trackable).toBeDefined();
    expect(deep.Set.filter._contain.trackable.type.is(deep.Trackable)).toBe(true);
  });

  it('should support chained reactive filters', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0); // [2, 4, 6, 8, 10]
    const bigEvenSet = evenSet.filter((x: number) => x > 5); // [6, 8, 10]
    
    // Verify chained filters work
    expect(bigEvenSet.size).toBe(3);
    expect(bigEvenSet.has(6)).toBe(true);
    expect(bigEvenSet.has(8)).toBe(true);
    expect(bigEvenSet.has(10)).toBe(true);
    
    // Test reactivity through the chain
    sourceSet.add(12); // Even and > 5
    expect(evenSet.has(12)).toBe(true);
    expect(bigEvenSet.has(12)).toBe(true);
    
    sourceSet.add(4); // Even but not > 5 (and already exists)
    expect(evenSet.has(4)).toBe(true); // Already was there
    expect(bigEvenSet.has(4)).toBe(false); // Should not be added to bigEvenSet
  });

  it('should handle complex filter with objects', () => {
    const deep = newDeep();
    
    const people = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];
    const sourceSet = new deep.Set(new Set(people));
    const youngPeople = sourceSet.filter((person: any) => person.age < 30);
    
    expect(youngPeople.size).toBe(1);
    // Use Array.from to check content since Set.has() compares references
    const youngArray = Array.from(youngPeople._data);
    expect(youngArray).toContainEqual({ name: 'Alice', age: 25 });
    
    // Test reactivity with object addition
    const davidObj = { name: 'David', age: 28 };
    sourceSet.add(davidObj);
    expect(youngPeople.size).toBe(2);
    const updatedYoungArray = Array.from(youngPeople._data);
    expect(updatedYoungArray).toContainEqual({ name: 'Alice', age: 25 });
    expect(updatedYoungArray).toContainEqual({ name: 'David', age: 28 });
  });

  it('should handle empty filter results', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 3, 5, 7]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0);
    
    expect(evenSet.size).toBe(0);
    
    // Add even number
    sourceSet.add(2);
    expect(evenSet.size).toBe(1);
    expect(evenSet.has(2)).toBe(true);
    
    // Remove it
    sourceSet.delete(2);
    expect(evenSet.size).toBe(0);
  });

  it('should handle clear operation on source set', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0);
    
    expect(evenSet.size).toBe(2); // [2, 4]
    
    let changedCalled = false;
    
    evenSet.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });
    
    // Clear source set
    sourceSet.clear();
    
    expect(sourceSet.size).toBe(0);
    expect(evenSet.size).toBe(0);
    expect(changedCalled).toBe(true);
  });

  it('should properly handle untracking and prevent memory leaks', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 2, 3, 4]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0);
    
    // Verify initial filtering works
    expect(evenSet.size).toBe(2);
    expect(evenSet.has(2)).toBe(true);
    expect(evenSet.has(4)).toBe(true);
    
    // Check that tracker exists in state
    expect(evenSet._state._sourceTracker).toBeDefined();
    
    // Use untrack method to break the connection
    const untracked = sourceSet.untrack(evenSet);
    expect(untracked).toBe(true);
    
    let eventFired = false;
    evenSet.on(deep.events.dataAdd, () => { eventFired = true; });
    
    // Add element to source - should not affect filtered set after untrack
    sourceSet.add(6);
    
    expect(evenSet.has(6)).toBe(false);
    expect(evenSet.size).toBe(2); // Should remain unchanged
    expect(eventFired).toBe(false);
  });

  it('should properly handle destruction and cleanup - with DEBUG logging', () => {
    const deep = newDeep();
    
    const sourceSet = new deep.Set(new Set([1, 2, 3, 4, 5]));
    const evenSet = sourceSet.filter((x: number) => x % 2 === 0);
    
    // Verify initial state
    expect(evenSet.size).toBe(2);
    expect(evenSet._state._sourceTracker).toBeDefined();
    
    let sourceChangedCount = 0;
    let filteredChangedCount = 0;
    
    // Set up event listeners to track activity
    sourceSet.on(deep.events.dataChanged, () => {
      sourceChangedCount++;
    });
    
    evenSet.on(deep.events.dataChanged, () => {
      filteredChangedCount++;
    });
    
    // Add element to verify tracking works
    sourceSet.add(6);
    expect(sourceChangedCount).toBe(1);
    expect(filteredChangedCount).toBe(1);
    expect(evenSet.has(6)).toBe(true);
    
    // Destroy the filtered set
    evenSet.destroy();
    
    // Reset counters for post-destruction test
    sourceChangedCount = 0;
    filteredChangedCount = 0;
    
    // Add element to source - should NOT trigger events on destroyed filtered set
    sourceSet.add(8);
    
    // Source set should still work normally
    expect(sourceChangedCount).toBe(1);
    expect(sourceSet.has(8)).toBe(true);
    
    // Filtered set should not receive events anymore
    expect(filteredChangedCount).toBe(0);
  });

  it('should handle filter with Deep instances as filter values', () => {
    const deep = newDeep();
    
    const a = new deep();
    const b = new deep();
    const c = new deep();
    
    // Create set with Deep instance IDs
    const sourceSet = new deep.Set(new Set([a._id, b._id, c._id, 'string', 42]));
    
    // Filter only Deep instance IDs (strings that are UUIDs)
    const deepOnlySet = sourceSet.filter((value: any) => {
      return typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
    
    expect(deepOnlySet.size).toBe(3);
    expect(deepOnlySet.has(a._id)).toBe(true);
    expect(deepOnlySet.has(b._id)).toBe(true);
    expect(deepOnlySet.has(c._id)).toBe(true);
    expect(deepOnlySet.has('string')).toBe(false);
    expect(deepOnlySet.has(42)).toBe(false);
    
    // Test reactivity
    const d = new deep();
    sourceSet.add(d._id);
    expect(deepOnlySet.size).toBe(4);
    expect(deepOnlySet.has(d._id)).toBe(true);
  });
});

describe('Set.find', () => {
  it('should find element that matches predicate', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3, 4, 5]));
    
    const result = set.find((element: any, key: any, s: any) => element === 3);
    
    expect(result).toBeDefined();
    expect(result._symbol).toBe(3);
  });

  it('should return undefined if no element matches', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3]));
    
    const result = set.find((element: any, key: any, s: any) => element === 5);
    
    expect(result).toBeUndefined();
  });

  it('should pass correct arguments to callback', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([10, 20, 30]));
    
    const callbackArgs: any[] = [];
    set.find((element: any, key: any, s: any) => {
      callbackArgs.push({ element, key, s });
      return element === 20;
    });
    
    expect(callbackArgs.length).toBeGreaterThan(0);
    const foundArg = callbackArgs.find(arg => arg.element === 20);
    expect(foundArg).toBeDefined();
    expect(foundArg.key).toBe(20);
  });

  it('should handle empty set', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([]));
    
    const result = set.find((element: any) => element === 1);
    
    expect(result).toBeUndefined();
  });

  it('should work with string values', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set(['apple', 'banana', 'cherry']));
    
    const result = set.find((element: any) => element.startsWith('ban'));
    
    expect(result).toBeDefined();
    expect(result._symbol).toBe('banana');
  });
});

describe('Set.findKey', () => {
  it('should return value of element that matches predicate', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3, 4, 5]));
    
    const result = set.findKey((element: any, key: any, s: any) => element === 3);
    
    expect(result).toBe(3);
  });

  it('should return undefined if no element matches', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3]));
    
    const result = set.findKey((element: any, key: any, s: any) => element === 5);
    
    expect(result).toBeUndefined();
  });

  it('should return string value correctly', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set(['apple', 'banana', 'cherry']));
    
    const result = set.findKey((element: any) => element.includes('an'));
    
    expect(result).toBe('banana');
  });

  it('should pass correct arguments to callback', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([10, 20]));
    
    const callbackArgs: any[] = [];
    set.findKey((element: any, key: any, s: any) => {
      callbackArgs.push({ element, key, s });
      return element === 20;
    });
    
    expect(callbackArgs.length).toBeGreaterThan(0);
    const foundArg = callbackArgs.find(arg => arg.element === 20);
    expect(foundArg).toBeDefined();
    expect(foundArg.key).toBe(20);
    expect(foundArg.element).toBe(foundArg.key);
  });
});

describe('Set.findIndex', () => {
  it('should always return -1 for sets', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3, 4, 5]));
    
    const result = set.findIndex((element: any, key: any, s: any) => element === 3);
    
    expect(result).toBe(-1);
  });

  it('should return -1 even when no element matches for sets', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([1, 2, 3]));
    
    const result = set.findIndex((element: any, key: any, s: any) => element === 5);
    
    expect(result).toBe(-1);
  });

  it('should return -1 for empty sets', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set([]));
    
    const result = set.findIndex((element: any) => element === 1);
    
    expect(result).toBe(-1);
  });

  it('should return -1 regardless of callback function', () => {
    const deep = newDeep();
    const set = new deep.Set(new Set(['a', 'b', 'c']));
    
    const result1 = set.findIndex((element: any) => true);
    const result2 = set.findIndex((element: any) => false);
    const result3 = set.findIndex((element: any) => element === 'b');
    
    expect(result1).toBe(-1);
    expect(result2).toBe(-1);
    expect(result3).toBe(-1);
  });
});