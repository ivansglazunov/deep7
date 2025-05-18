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

  // TODO: Add tests for .entries(), .forEach(), .keys(), .values() when implemented
}); 