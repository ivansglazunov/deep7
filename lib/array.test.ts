import { newDeep } from '.';

describe('Array', () => {
  it('should create a new deep.Array with initial data', () => {
    const deep = newDeep();
    const initialData = [1, 2, 3];
    const arr = new deep.Array(initialData);
    expect(arr._data).toEqual(initialData);
  });

  it('should push values and emit events', () => {
    const deep = newDeep();
    const arr = new deep.Array([1]);
    let pushCalled = false;
    let changedCalled = false;

    arr.on(deep.events.dataPush, (...args: any[]) => {
      pushCalled = true;
      expect(args.length).toBe(2);
      expect(args[0]._symbol).toBe(2);
      expect(args[1]._symbol).toBe(3);
    });
    arr.on(deep.events.dataChanged, (...args: any[]) => {
      changedCalled = true;
      expect(args.length).toBe(2);
    });

    const newLength = arr.push(2, 3);
    expect(newLength).toBe(3);
    expect(arr._data).toEqual([1, 2, 3]);
    expect(pushCalled).toBe(true);
    expect(changedCalled).toBe(true);
  });

  it('should add unique values and emit events', () => {
    const deep = newDeep();
    const arr = new deep.Array([1, 2]);
    let addCalled = false;
    let changedCalled = false;

    arr.on(deep.events.dataAdd, (...args: any[]) => {
      addCalled = true;
      expect(args.length).toBe(1);
      expect(args[0]._symbol).toBe(3);
    });
    arr.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    const newLength = arr.add(2, 3); // 2 is duplicate
    expect(newLength).toBe(3);
    expect(arr._data).toEqual([1, 2, 3]);
    expect(addCalled).toBe(true);
    expect(changedCalled).toBe(true);
  });

  it('should delete values and emit events', () => {
    const deep = newDeep();
    const arr = new deep.Array([1, 2, 3, 4]);
    let deleteCalled = false;
    let changedCalled = false;

    arr.on(deep.events.dataDelete, (...args: any[]) => {
      deleteCalled = true;
      expect(args.length).toBe(2);
      expect(args[0]._symbol).toBe(2);
      expect(args[1]._symbol).toBe(4);
    });
    arr.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    const result = arr.delete(2, 4, 5); // 5 does not exist
    expect(result).toBe(true);
    expect(arr._data).toEqual([1, 3]);
    expect(deleteCalled).toBe(true);
    expect(changedCalled).toBe(true);
  });

  it('should map values to a new deep.Array', () => {
    const deep = newDeep();
    const arr = new deep.Array([1, 2, 3]);
    const mapFn = (x: number) => x * 2;
    
    const mappedArr = arr.map(mapFn);
    
    expect(mappedArr.type.is(deep.Array)).toBe(true);
    expect(mappedArr._data).toEqual([2, 4, 6]);
    expect(arr._data).toEqual([1, 2, 3]); // Original array should be unchanged
  });

  it('should make array.map() reactive using tracking system', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const doubledArray = sourceArray.map((x: number) => x * 2);
    
    // Verify initial mapping
    expect(doubledArray._data).toEqual([2, 4, 6]);
    
    // Test reactivity by adding to source
    sourceArray.add(4);
    expect(doubledArray._data).toEqual([2, 4, 6, 8]);
    
    // Test removing from source
    sourceArray.delete(2);
    expect(doubledArray._data).toEqual([2, 6, 8]);
    
    // Test push operation
    sourceArray.push(5);
    expect(doubledArray._data).toEqual([2, 6, 8, 10]);
    
    // Test set operation
    sourceArray.set(0, 10);
    expect(doubledArray._data).toEqual([20, 6, 8, 10]);
  });

  it('should set a value at a given index and emit events', () => {
    const deep = newDeep();
    const initialData = [1, 2, 3];
    const arr = new deep.Array(initialData);
    let setCalled = false;
    let changedCalled = false;

    arr.on(deep.events.dataSet, (arg: any) => {
      setCalled = true;
      expect(arg._field).toBe(1);
      expect(arg._before).toBe(2);
      expect(arg._after).toBe(99);
    });
    arr.on(deep.events.dataChanged, (arg: any) => {
      changedCalled = true;
      expect(arg._field).toBe(1);
      expect(arg._before).toBe(2);
      expect(arg._after).toBe(99);
    });

    const result = arr.set(1, 99);
    expect(result).toBe(true);
    expect(arr._data).toEqual([1, 99, 3]);
    expect(setCalled).toBe(true);
    expect(changedCalled).toBe(true);
  });

  it('should sort array in ascending order by default', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 1, 4, 1, 5]);
    
    const result = arr.sort();
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([1, 1, 3, 4, 5]);
    expect(arr._data).toEqual([3, 1, 4, 1, 5]); // Original unchanged
  });

  it('should sort array with custom compare function', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 1, 4, 1, 5]);
    
    const result = arr.sort((a: number, b: number) => b - a); // Descending order
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([5, 4, 3, 1, 1]);
    expect(arr._data).toEqual([3, 1, 4, 1, 5]); // Original unchanged
  });

  it('should sort array and emit events', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 1, 4]);
    let changedCalled = false;

    const result = arr.sort();
    
    result.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    // Modify original array to trigger reactive update
    arr.add(2);
    
    expect(result._data).toEqual([1, 2, 3, 4]);
    expect(changedCalled).toBe(true);
  });

  it('should sort array with strings', () => {
    const deep = newDeep();
    const arr = new deep.Array(['cherry', 'apple', 'banana']);
    
    const result = arr.sort();
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual(['apple', 'banana', 'cherry']);
    expect(arr._data).toEqual(['cherry', 'apple', 'banana']); // Original unchanged
  });

  it('should sort array with mixed types using custom compareFn', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 'apple', 1, 'banana']);
    
    // Sort by string representation
    const result = arr.sort((a: any, b: any) => String(a).localeCompare(String(b)));
    
    expect(result.type.is(deep.Array)).toBe(true);
    expect(result._data).toEqual([1, 3, 'apple', 'banana']);
    expect(arr._data).toEqual([3, 'apple', 1, 'banana']); // Original unchanged
  });

  it('should filter values to a new deep.Array', () => {
    const deep = newDeep();
    const arr = new deep.Array([1, 2, 3, 4, 5]);
    const filterFn = (x: number) => x % 2 === 0; // Filter even numbers
    
    const filteredArr = arr.filter(filterFn);
    
    expect(filteredArr.type.is(deep.Array)).toBe(true);
    expect(filteredArr._data).toEqual([2, 4]);
    expect(arr._data).toEqual([1, 2, 3, 4, 5]); // Original array should be unchanged
  });

  it('should make array.filter() reactive using tracking system', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3, 4, 5]);
    const evenArray = sourceArray.filter((x: number) => x % 2 === 0);
    
    // Verify initial filtering
    expect(evenArray._data).toEqual([2, 4]);
    
    // Test reactivity by adding to source
    sourceArray.add(6); // Even number
    expect(evenArray._data).toEqual([2, 4, 6]);
    
    sourceArray.add(7); // Odd number - should not appear in filtered array
    expect(evenArray._data).toEqual([2, 4, 6]);
    
    // Test removing from source
    sourceArray.delete(2);
    expect(evenArray._data).toEqual([4, 6]);
  });

  it('should verify filter callback receives deep-wrapped values', () => {
    const deep = newDeep();
    
    const receivedValues: any[] = [];
    const sourceArray = new deep.Array(['hello', 'world', 'test']);
    
    const filteredArray = sourceArray.filter((value: any, index: number, array: any[]) => {
      receivedValues.push({
        value,
        isDeepSymbol: typeof value === 'string', // Should be the _symbol (unwrapped)
        index,
        arrayLength: array.length
      });
      return value.length > 4; // Filter strings longer than 4 characters
    });
    
    expect(filteredArray._data).toEqual(['hello', 'world']);
    expect(receivedValues).toHaveLength(3);
    expect(receivedValues[0].value).toBe('hello');
    expect(receivedValues[1].value).toBe('world');
    expect(receivedValues[2].value).toBe('test');
    expect(receivedValues[0].index).toBe(0);
    expect(receivedValues[1].index).toBe(1);
    expect(receivedValues[2].index).toBe(2);
  });

  it('should verify that Array.filter is trackable', () => {
    const deep = newDeep();
    
    // Test that Array.filter is trackable
    expect(deep.Array.filter.isTrackable).toBe(true);
    
    // Test that Array.filter has trackable in context
    expect(deep.Array.filter._contain.trackable).toBeDefined();
    expect(deep.Array.filter._contain.trackable.type.is(deep.Trackable)).toBe(true);
  });

  it('should support chained reactive filters', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const evenArray = sourceArray.filter((x: number) => x % 2 === 0); // [2, 4, 6, 8, 10]
    const bigEvenArray = evenArray.filter((x: number) => x > 5); // [6, 8, 10]
    
    // Verify chained filters work
    expect(bigEvenArray._data).toEqual([6, 8, 10]);
    
    // Test reactivity through the chain
    sourceArray.add(12); // Even and > 5
    expect(evenArray._data).toEqual([2, 4, 6, 8, 10, 12]);
    expect(bigEvenArray._data).toEqual([6, 8, 10, 12]);
    
    sourceArray.add(4); // Even but not > 5 (and already exists)
    expect(evenArray._data).toEqual([2, 4, 6, 8, 10, 12]); // No change due to add deduplication
    expect(bigEvenArray._data).toEqual([6, 8, 10, 12]);
  });

  it('should handle complex filter with objects', () => {
    const deep = newDeep();
    
    const people = [
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 30 },
      { name: 'Charlie', age: 35 }
    ];
    const sourceArray = new deep.Array(people);
    const youngPeople = sourceArray.filter((person: any) => person.age < 30);
    
    expect(youngPeople._data).toEqual([{ name: 'Alice', age: 25 }]);
    
    // Test reactivity with object addition
    sourceArray.add({ name: 'David', age: 28 });
    expect(youngPeople._data).toEqual([
      { name: 'Alice', age: 25 },
      { name: 'David', age: 28 }
    ]);
  });

  it('should handle empty filter results', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 3, 5, 7]);
    const evenArray = sourceArray.filter((x: number) => x % 2 === 0);
    
    expect(evenArray._data).toEqual([]);
    
    // Add even number
    sourceArray.add(2);
    expect(evenArray._data).toEqual([2]);
    
    // Remove it
    sourceArray.delete(2);
    expect(evenArray._data).toEqual([]);
  });

  it('should properly handle destruction and cleanup - with DEBUG logging', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3, 4, 5]);
    const evenArray = sourceArray.filter((x: number) => x % 2 === 0);
    
    // Verify initial state
    expect(evenArray._data).toEqual([2, 4]);
    expect(evenArray._state._sourceTracker).toBeDefined();
    
    // Verify tracking works
    sourceArray.add(6);
    expect(evenArray._data).toEqual([2, 4, 6]);
    
    // Break the tracking connection
    const untracked = sourceArray.untrack(evenArray);
    expect(untracked).toBe(true);
    
    let filteredEventFired = false;
    evenArray.on(deep.events.dataAdd, () => { 
      filteredEventFired = true;
    });
    
    // Test that events don't fire after untracking
    sourceArray.add(8);
    
    // Source should be updated, but filtered should NOT
    expect(sourceArray._data).toContain(8);
    expect(evenArray._data).toEqual([2, 4, 6]); // Should remain unchanged
    expect(filteredEventFired).toBe(false);
  });

  it('should create reactive sorted array with tracking', () => {
    const deep = newDeep();
    const sourceArray = new deep.Array([3, 1, 4, 1, 5]);
    
    const sortedArray = sourceArray.sort();
    
    // Should return new array instance, not modify original
    expect(sortedArray._id).not.toBe(sourceArray._id);
    expect(sortedArray.type.is(deep.Array)).toBe(true);
    expect(sortedArray._data).toEqual([1, 1, 3, 4, 5]);
    expect(sourceArray._data).toEqual([3, 1, 4, 1, 5]); // Original unchanged
  });

  it('should make Array.sort() reactive with point-wise updates', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([3, 1, 4]);
    const sortedArray = sourceArray.sort();
    
    // Verify initial sorting
    expect(sortedArray._data).toEqual([1, 3, 4]);
    
    // Test reactivity by adding to source - should insert in correct position
    sourceArray.add(2);
    expect(sortedArray._data).toEqual([1, 2, 3, 4]);
    
    // Test adding larger value
    sourceArray.add(5);
    expect(sortedArray._data).toEqual([1, 2, 3, 4, 5]);
    
    // Test adding smaller value
    sourceArray.add(0);
    expect(sortedArray._data).toEqual([0, 1, 2, 3, 4, 5]);
    
    // Test removing from source
    sourceArray.delete(3);
    expect(sortedArray._data).toEqual([0, 1, 2, 4, 5]);
  });

  it('should make Array.sort() reactive with custom compare function', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([3, 1, 4]);
    const sortedArray = sourceArray.sort((a: number, b: number) => b - a); // Descending
    
    // Verify initial sorting (descending)
    expect(sortedArray._data).toEqual([4, 3, 1]);
    
    // Test reactivity with descending order
    sourceArray.add(2);
    expect(sortedArray._data).toEqual([4, 3, 2, 1]);
    
    sourceArray.add(5);
    expect(sortedArray._data).toEqual([5, 4, 3, 2, 1]);
    
    sourceArray.delete(3);
    expect(sortedArray._data).toEqual([5, 4, 2, 1]);
  });

  it('should handle Array.sort() with push operations', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([3, 1]);
    const sortedArray = sourceArray.sort();
    
    expect(sortedArray._data).toEqual([1, 3]);
    
    // Test push operation
    sourceArray.push(2);
    expect(sortedArray._data).toEqual([1, 2, 3]);
    
    sourceArray.push(0, 4);
    expect(sortedArray._data).toEqual([0, 1, 2, 3, 4]);
  });

  it('should handle Array.sort() with set operations', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const sortedArray = sourceArray.sort();
    
    expect(sortedArray._data).toEqual([1, 2, 3]);
    
    // Test set operation (changing middle element)
    sourceArray.set(1, 5); // Change 2 to 5
    expect(sortedArray._data).toEqual([1, 3, 5]);
    
    sourceArray.set(0, 0); // Change 1 to 0
    expect(sortedArray._data).toEqual([0, 3, 5]);
  });

  it('should verify that Array.sort is trackable', () => {
    const deep = newDeep();
    
    // Test that Array.sort is trackable
    expect(deep.Array.sort.isTrackable).toBe(true);
    
    // Test that Array.sort has trackable in context
    expect(deep.Array.sort._contain.trackable).toBeDefined();
    expect(deep.Array.sort._contain.trackable.type.is(deep.Trackable)).toBe(true);
  });
});

describe('Array.find', () => {
  it('should find element that matches predicate', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3, 4, 5]);
    
    const result = array.find((element: any, index: any, arr: any) => element === 3);
    
    expect(result).toBeDefined();
    expect(result._symbol).toBe(3);
  });

  it('should return undefined if no element matches', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3]);
    
    const result = array.find((element: any, index: any, arr: any) => element === 5);
    
    expect(result).toBeUndefined();
  });

  it('should pass correct arguments to callback', () => {
    const deep = newDeep();
    const array = new deep.Array([10, 20, 30]);
    
    const callbackArgs: any[] = [];
    array.find((element: any, index: any, arr: any) => {
      callbackArgs.push({ element, index, arr });
      return element === 20;
    });
    
    expect(callbackArgs).toHaveLength(2);
    expect(callbackArgs[0].element).toBe(10);
    expect(callbackArgs[0].index).toBe(0);
    expect(callbackArgs[1].element).toBe(20);
    expect(callbackArgs[1].index).toBe(1);
  });

  it('should handle empty array', () => {
    const deep = newDeep();
    const array = new deep.Array([]);
    
    const result = array.find((element: any) => element === 1);
    
    expect(result).toBeUndefined();
  });
});

describe('Array.findKey', () => {
  it('should return index of element that matches predicate', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3, 4, 5]);
    
    const result = array.findKey((element: any, index: any, arr: any) => element === 3);
    
    expect(result).toBe(2);
  });

  it('should return undefined if no element matches', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3]);
    
    const result = array.findKey((element: any, index: any, arr: any) => element === 5);
    
    expect(result).toBeUndefined();
  });

  it('should return first matching index', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 2, 3]);
    
    const result = array.findKey((element: any) => element === 2);
    
    expect(result).toBe(1);
  });
});

describe('Array.findIndex', () => {
  it('should return index of element that matches predicate', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3, 4, 5]);
    
    const result = array.findIndex((element: any, index: any, arr: any) => element === 3);
    
    expect(result).toBe(2);
  });

  it('should return -1 if no element matches', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3]);
    
    const result = array.findIndex((element: any, index: any, arr: any) => element === 5);
    
    expect(result).toBe(-1);
  });

  it('should return first matching index for duplicates', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 2, 3]);
    
    const result = array.findIndex((element: any) => element === 2);
    
    expect(result).toBe(1);
  });

  it('should work with complex objects', () => {
    const deep = newDeep();
    const obj1 = { name: 'Alice', age: 25 };
    const obj2 = { name: 'Bob', age: 30 };
    const array = new deep.Array([obj1, obj2]);
    
    const result = array.findIndex((element: any) => element.name === 'Bob');
    
    expect(result).toBe(1);
  });

  it('should throw error for already setted data', () => {
    const deep = newDeep();
    const array = new deep.Array([1, 2, 3]);

    expect(() => (array._data = [])).toThrow();
  });
}); 