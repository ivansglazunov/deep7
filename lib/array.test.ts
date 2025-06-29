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
    
    expect(result._id).toBe(arr._id); // Should return the same array instance
    expect(arr._data).toEqual([1, 1, 3, 4, 5]);
  });

  it('should sort array with custom compare function', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 1, 4, 1, 5]);
    
    const result = arr.sort((a: number, b: number) => b - a); // Descending order
    
    expect(result._id).toBe(arr._id); // Should return the same array instance
    expect(arr._data).toEqual([5, 4, 3, 1, 1]);
  });

  it('should sort array and emit events', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 1, 4]);
    let changedCalled = false;

    arr.on(deep.events.dataChanged, () => {
      changedCalled = true;
    });

    arr.sort();
    
    expect(arr._data).toEqual([1, 3, 4]);
    expect(changedCalled).toBe(true);
  });

  it('should sort array with strings', () => {
    const deep = newDeep();
    const arr = new deep.Array(['cherry', 'apple', 'banana']);
    
    arr.sort();
    
    expect(arr._data).toEqual(['apple', 'banana', 'cherry']);
  });

  it('should sort array with mixed types using custom compareFn', () => {
    const deep = newDeep();
    const arr = new deep.Array([3, 'apple', 1, 'banana']);
    
    // Sort by string representation
    arr.sort((a: any, b: any) => String(a).localeCompare(String(b)));
    
    expect(arr._data).toEqual([1, 3, 'apple', 'banana']);
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
      console.log('DEBUG: Filtered array received add event after untrack - this should not happen!');
    });
    
    console.log('DEBUG: Adding element after untrack...');
    
    // Test that events don't fire after untracking
    sourceArray.add(8);
    
    // Source should be updated, but filtered should NOT
    expect(sourceArray._data).toContain(8);
    expect(evenArray._data).toEqual([2, 4, 6]); // Should remain unchanged
    expect(filteredEventFired).toBe(false);
    
    console.log('DEBUG: Untrack test completed successfully - no events fired on filtered array');
  });
}); 