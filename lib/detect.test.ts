import { newDeep } from './index';

describe('deep.detect', () => {
  const deep = newDeep();

  it('should return Deep instance as is', () => {
    const existingDeep = new deep.String("already deep");
    expect(deep.detect(existingDeep)._id).toBe(existingDeep._id);
  });

  it('should wrap string in deep.String', () => {
    const result = deep.detect("hello");
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.type_id).toBe(deep.String._id);
    expect(result._data).toBe("hello");
  });

  it('should return existing deep.String instance for same string data', () => {
    const str1 = new deep.String("test");
    const str2 = deep.detect("test");
    expect(str2._id).toBe(str1._id);
    expect(str2._data).toBe("test");
  });

  it('should wrap number in deep.Number', () => {
    const result = deep.detect(123);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.type_id).toBe(deep.Number._id);
    expect(result._data).toBe(123);
  });

  it('should return existing deep.Number instance for same number data', () => {
    const num1 = new deep.Number(42);
    const num2 = deep.detect(42);
    expect(num2._id).toBe(num1._id);
    expect(num2._data).toBe(42);
  });

  it('should wrap function in deep.Function', () => {
    const myFunc = () => console.log('test');
    const result = deep.detect(myFunc);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.type_id).toBe(deep.Function._id);
    expect(result._data).toBe(myFunc);
  });

  it('should return existing deep.Function instance for same function data', () => {
    const myFunc = () => console.log('test');
    const func1 = new deep.Function(myFunc);
    const func2 = deep.detect(myFunc);
    expect(func2._id).toBe(func1._id);
    expect(func2._data).toBe(myFunc);
  });

  it('should wrap Set in deep.Set', () => {
    const mySet = new Set([1, 'a']);
    const result = deep.detect(mySet);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.type_id).toBe(deep.Set._id);
    expect(result._data instanceof Set).toBe(true);
    expect(result._data.has(1)).toBe(true);
    expect(result._data.has('a')).toBe(true);
  });

  it('should return existing deep.Set instance for same Set data', () => {
    const mySet = new Set([1, 'a']);
    const set1 = new deep.Set(mySet);
    const set2 = deep.detect(mySet);
    expect(set2._id).toBe(set1._id);
    expect(set2._data instanceof Set).toBe(true);
    expect(set2._data.has(1)).toBe(true);
    expect(set2._data.has('a')).toBe(true);
  });

  it('should create different instances for different Set data', () => {
    const set1Data = new Set([1, 2]);
    const set2Data = new Set([3, 4]);
    const deepSet1 = deep.detect(set1Data);
    const deepSet2 = deep.detect(set2Data);
    expect(deepSet1._id).not.toBe(deepSet2._id);
    expect(deepSet1._data instanceof Set).toBe(true);
    expect(deepSet1._data.has(1)).toBe(true);
    expect(deepSet1._data.has(2)).toBe(true);
    expect(deepSet2._data instanceof Set).toBe(true);
    expect(deepSet2._data.has(3)).toBe(true);
    expect(deepSet2._data.has(4)).toBe(true);
  });

  // it('should throw error for boolean (until _Boolean is implemented)', () => {
  //   expect(() => deep.detect(true)).toThrow('deep.Boolean type not found or not yet implemented for boolean detection.');
  // });

  it('should wrap array in deep.Array', () => {
    const myArray = [1, 2, 'test'];
    const result = deep.detect(myArray);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.typeof(deep.Array)).toBe(true);
    expect(result._data).toBe(myArray);
    expect(result._data[0]).toBe(1);
    expect(result._data[1]).toBe(2);
    expect(result._data[2]).toBe('test');
  });

  it('should wrap object in deep.Object', () => {
    const myObject = { a: 1, b: 'test' };
    const result = deep.detect(myObject);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result.typeof(deep.Object)).toBe(true);
    expect(result._data).toBe(myObject);
    expect(result._data.a).toBe(1);
    expect(result._data.b).toBe('test');
  });

  it('should return existing deep.Array instance for same array data', () => {
    const myArray = [1, 2, 3];
    const array1 = new deep.Array(myArray);
    const array2 = deep.detect(myArray);
    expect(array2._id).toBe(array1._id);
    expect(array2._data).toBe(myArray);
    expect(array2._data[0]).toBe(1);
    expect(array2._data[1]).toBe(2);
    expect(array2._data[2]).toBe(3);
  });

  it('should return existing deep.Object instance for same object data', () => {
    const myObject = { x: 10, y: 20 };
    const obj1 = new deep.Object(myObject);
    const obj2 = deep.detect(myObject);
    expect(obj2._id).toBe(obj1._id);
    expect(obj2._data).toBe(myObject);
    expect(obj2._data.x).toBe(10);
    expect(obj2._data.y).toBe(20);
  });

  // it('should throw error for null', () => {
  //   expect(() => deep.detect(null)).toThrow(/Type detection and wrapping for type 'object' \(value: null\) not yet implemented or value is null\/undefined./);
  // });

  it('should throw error for undefined', () => {
    expect(() => deep.detect(undefined)).toThrow(/Type detection and wrapping for type 'undefined' \(value: undefined\) not yet implemented or value is null\/undefined./);
  });
}); 