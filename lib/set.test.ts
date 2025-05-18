import { newDeep } from './index';

describe('Deep Set', () => {
  it('should create a new Deep Set instance with native and Deep values', () => {
    const deep = newDeep();
    const deepString = new deep.String("deep_val");
    const initialData = new Set([1, "abc", deepString]);
    const mySet = new deep.Set(initialData);

    expect(mySet).toBeDefined();
    expect(mySet._type).toBe(deep.Set._id);
    expect(mySet._data instanceof Set).toBe(true);
    expect(mySet._data.size).toBe(3); 
    
    // Check for raw data storage
    expect(mySet._data.has(1)).toBe(true);
    expect(mySet._data.has("abc")).toBe(true);
    expect(mySet._data.has("deep_val")).toBe(true); // Constructor should store raw data

    expect(mySet.has(1)).toBe(true);
    expect(mySet.has("abc")).toBe(true);
    expect(mySet.has(deepString)).toBe(true); // .has should work with Deep instance
    expect(mySet.has("deep_val")).toBe(true); // .has should also work with raw value if it was stored
  });

  it('should require a Set instance for constructor', () => {
    const deep = newDeep();
    expect(() => new deep.Set([1, 2, 3])).toThrow('must provide a Set instance to new deep.Set()');
    expect(() => new deep.Set("not a set")).toThrow('must provide a Set instance to new deep.Set()');
    expect(() => new deep.Set({})).toThrow('must provide a Set instance to new deep.Set()');
  });

  it('.add() should add native and Deep elements and return the Set instance', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set());

    // Add native number
    let result = mySet.add(10);
    expect(mySet.has(10)).toBe(true);
    expect(mySet.size).toBe(1);
    expect(result._id).toBe(mySet._id); // Check for chaining

    // Add native string
    mySet.add("hello");
    expect(mySet.has("hello")).toBe(true);
    expect(mySet.size).toBe(2);

    // Add Deep String
    const deepString = new deep.String("world");
    mySet.add(deepString);
    expect(mySet.has(deepString)).toBe(true); // Test with Deep instance
    expect(mySet.has("world")).toBe(true);    // Test with raw string value
    expect(mySet.size).toBe(3);

    // Add Deep Number
    const deepNumber = new deep.Number(123);
    mySet.add(deepNumber);
    expect(mySet.has(deepNumber)).toBe(true);
    expect(mySet.has(123)).toBe(true);
    expect(mySet.size).toBe(4);

    // Verify internal raw data storage for deep values
    expect(mySet._data.has("world")).toBe(true);
    expect(mySet._data.has(123)).toBe(true);
  });

  it('.clear() should remove all elements', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set([1, new deep.String("deep_clear")]));
    expect(mySet.size).toBe(2);
    mySet.clear();
    expect(mySet.size).toBe(0);
    expect(mySet.has(1)).toBe(false);
    expect(mySet.has("deep_clear")).toBe(false);
  });

  it('.delete() should remove native and Deep elements and return true if successful', () => {
    const deep = newDeep();
    const deepStr = new deep.String("delete_me");
    const deepNum = new deep.Number(999);
    const mySet = new deep.Set(new Set([1, "abc", deepStr, deepNum, "untouched"]));

    // Delete native number
    let deleted = mySet.delete(1);
    expect(deleted).toBe(true);
    expect(mySet.has(1)).toBe(false);
    expect(mySet.size).toBe(4);

    // Delete native string
    deleted = mySet.delete("abc");
    expect(deleted).toBe(true);
    expect(mySet.has("abc")).toBe(false);
    expect(mySet.size).toBe(3);

    // Delete by Deep instance (String)
    deleted = mySet.delete(deepStr);
    expect(deleted).toBe(true);
    expect(mySet.has(deepStr)).toBe(false);
    expect(mySet.has("delete_me")).toBe(false);
    expect(mySet.size).toBe(2);

    // Try to delete by raw value after Deep instance was used for deletion (should also work if underlying raw data was same)
    // This specific string "delete_me" should be gone.
    deleted = mySet.delete("delete_me");
    expect(deleted).toBe(false); // Already deleted

    // Delete by Deep instance (Number)
    deleted = mySet.delete(deepNum);
    expect(deleted).toBe(true);
    expect(mySet.has(deepNum)).toBe(false);
    expect(mySet.has(999)).toBe(false);
    expect(mySet.size).toBe(1);

    // Try to delete non-existent
    const notDeleted = mySet.delete(4);
    expect(notDeleted).toBe(false);
    expect(mySet.size).toBe(1);
    expect(mySet.has("untouched")).toBe(true);
  });

  it('.has() should check for native and Deep elements', () => {
    const deep = newDeep();
    const deepItem = new deep.String("existing_deep_item");
    const mySet = new deep.Set(new Set(["a", "b", deepItem, 123]));

    expect(mySet.has("a")).toBe(true);
    expect(mySet.has("c")).toBe(false);
    
    expect(mySet.has(deepItem)).toBe(true); // Check by Deep instance
    expect(mySet.has("existing_deep_item")).toBe(true); // Check by raw value of the Deep instance

    const nonExistentDeepItem = new deep.String("not_there");
    expect(mySet.has(nonExistentDeepItem)).toBe(false);
    expect(mySet.has("not_there")).toBe(false);

    expect(mySet.has(123)).toBe(true);
    expect(mySet.has(new deep.Number(123))).toBe(true);
    expect(mySet.has(456)).toBe(false);
  });

  it('.size should return the number of elements as a primitive number', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set());
    expect(mySet.size).toBe(0);

    mySet.add(1);
    expect(mySet.size).toBe(1);

    mySet.add(2);
    expect(mySet.size).toBe(2);

    mySet.delete(1);
    expect(mySet.size).toBe(1);
  });

  it('.size should be read-only', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set([1]));
    expect(() => { (mySet as any).size = 5; }).toThrow('.size property is read-only.');
  });

  it('should emit events when items are added', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set());
    const events: any[] = [];
    
    // Subscribe to events
    mySet.on('.value:add', (value) => {
      events.push({ event: '.value:add', value });
    });
    
    mySet.on('.value:change', () => {
      events.push({ event: '.value:change' });
    });
    
    // Add an item
    mySet.add(123);
    
    // Check that events were fired
    expect(events.length).toBe(2);
    expect(events[0].event).toBe('.value:add');
    expect(events[0].value._data).toBe(123);
    expect(events[1].event).toBe('.value:change');
    
    // Add a Deep instance
    const deepStr = new deep.String("event_test");
    mySet.add(deepStr);
    
    // Should have two more events
    expect(events.length).toBe(4);
    expect(events[2].event).toBe('.value:add');
    expect(events[2].value._id).toBe(deepStr._id);
    expect(events[3].event).toBe('.value:change');
    
    // Adding the same item again should not trigger events
    events.length = 0;
    mySet.add(123);
    expect(events.length).toBe(0);
  });
  
  it('should emit events when items are deleted', () => {
    const deep = newDeep();
    const mySet = new deep.Set(new Set([1, 2, 3]));
    const events: any[] = [];
    
    // Subscribe to events
    mySet.on('.value:delete', (value) => {
      events.push({ event: '.value:delete', value });
    });
    
    mySet.on('.value:change', () => {
      events.push({ event: '.value:change' });
    });
    
    // Delete an item
    mySet.delete(2);
    
    // Check that events were fired
    expect(events.length).toBe(2);
    expect(events[0].event).toBe('.value:delete');
    expect(events[0].value._data).toBe(2);
    expect(events[1].event).toBe('.value:change');
    
    // Deleting a non-existent item should not trigger events
    events.length = 0;
    mySet.delete(999);
    expect(events.length).toBe(0);
  });
  
  it('should emit events when cleared', () => {
    const deep = newDeep();
    const items = [1, 2, new deep.String("test")];
    const mySet = new deep.Set(new Set(items));
    const events: any[] = [];
    
    // Subscribe to events
    mySet.on('.value:delete', (value) => {
      events.push({ event: '.value:delete', value });
    });
    
    mySet.on('.value:clear', () => {
      events.push({ event: '.value:clear' });
    });
    
    mySet.on('.value:change', () => {
      events.push({ event: '.value:change' });
    });
    
    // Clear the set
    mySet.clear();
    
    // Should have delete events for each item plus clear and change events
    expect(events.length).toBe(5);
    expect(events.filter(e => e.event === '.value:delete').length).toBe(3);
    expect(events.filter(e => e.event === '.value:clear').length).toBe(1);
    expect(events.filter(e => e.event === '.value:change').length).toBe(1);
    
    // Check payload of delete events (order might vary, so check existence)
    const deletedValues = events.filter(e => e.event === '.value:delete').map(e => e.value._data);
    expect(deletedValues).toContain(1);
    expect(deletedValues).toContain(2);
    expect(deletedValues).toContain("test");

    // Clearing an empty set should not trigger events
    events.length = 0;
    mySet.clear();
    expect(events.length).toBe(0);
  });

  describe('Symbol.iterator for Set', () => {
    it('should allow iteration over a Deep.Set using for...of', () => {
      const deep = newDeep();
      const deepStringVal = new deep.String("deep_string");
      const deepNumVal = new deep.Number(456);
      const nativeVal = 123;
      const nativeStr = "native_string";

      const initialData = new Set<any>([nativeVal, nativeStr, deepStringVal, deepNumVal]);
      
      const mySet = new deep.Set(initialData);

      const iteratedItems: any[] = [];
      for (const item of mySet) {
        iteratedItems.push(item);
      }

      expect(iteratedItems.length).toBe(4);

      const findIteratedItem = (originalValue: any) => {
        const found = iteratedItems.find(iterated => {
          const isOriginalDeep = originalValue instanceof deep.Deep;
          const isIteratedDeep = iterated instanceof deep.Deep;
          
          let match = false;
          if (isOriginalDeep && isIteratedDeep) {
            match = iterated._data === originalValue._data;
          } else if (!isOriginalDeep && isIteratedDeep) {
            match = iterated._data === originalValue;
          } else {
            match = iterated === originalValue;
          }
          return match;
        });
        return found;
      };

      // Test for nativeVal (123)
      const foundNativeVal = findIteratedItem(nativeVal);
      expect(foundNativeVal).toBeDefined();
      expect(foundNativeVal._data).toBe(nativeVal);

      // Test for nativeStr ("native_string")
      const foundNativeStr = findIteratedItem(nativeStr);
      expect(foundNativeStr).toBeDefined();
      expect(foundNativeStr._data).toBe(nativeStr);
      
      // Test for deepStringVal
      const foundDeepString = findIteratedItem(deepStringVal);
      expect(foundDeepString).toBeDefined(); 
      expect(foundDeepString._data).toBe(deepStringVal._data);

      // Test for deepNumVal
      const foundDeepNum = findIteratedItem(deepNumVal);
      expect(foundDeepNum).toBeDefined();
      expect(foundDeepNum._data).toBe(deepNumVal._data);
    });

    it('iterating an empty Deep.Set should produce no items', () => {
      const deep = newDeep();
      const mySet = new deep.Set(new Set());
      let itemCount = 0;
      for (const item of mySet) {
        itemCount++;
      }
      expect(itemCount).toBe(0);
      expect(typeof mySet[Symbol.iterator]).toBe('function');
    });
  });

  // TODO: Add tests for .entries(), .forEach(), .keys(), .values() when implemented
}); 