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
    expect(result._type).toBe(deep.String._id);
    expect(result._data).toBe("hello");
  });

  it('should wrap number in deep.Number', () => {
    const result = deep.detect(123);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result._type).toBe(deep.Number._id);
    expect(result._data).toBe(123);
  });

  it('should wrap function in deep.Function', () => {
    const myFunc = () => console.log('test');
    const result = deep.detect(myFunc);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result._type).toBe(deep.Function._id);
    expect(result._data).toBe(myFunc);
  });

  it('should wrap Set in deep.Set', () => {
    const mySet = new Set([1, 'a']);
    const result = deep.detect(mySet);
    expect(result instanceof deep.Deep).toBe(true);
    expect(result._type).toBe(deep.Set._id);
    expect(result._data instanceof Set).toBe(true);
    expect(result._data.has(1)).toBe(true);
    expect(result._data.has('a')).toBe(true);
  });

  it('should throw error for boolean (until _Boolean is implemented)', () => {
    expect(() => deep.detect(true)).toThrow('deep.Boolean type not found or not yet implemented for boolean detection.');
  });

  it('should throw error for Array (until deep.Array is implemented)', () => {
    expect(() => deep.detect([1, 2])).toThrow('Array detection and wrapping not yet implemented (deep.Array missing).');
  });

  it('should throw error for Object (until deep.Object is implemented)', () => {
    expect(() => deep.detect({ a: 1 })).toThrow('Object detection and wrapping not yet implemented (deep.Object missing).');
  });

  it('should throw error for null', () => {
    expect(() => deep.detect(null)).toThrow(/Type detection and wrapping for type 'object' \(value: null\) not yet implemented or value is null\/undefined./);
  });

  it('should throw error for undefined', () => {
    expect(() => deep.detect(undefined)).toThrow(/Type detection and wrapping for type 'undefined' \(value: undefined\) not yet implemented or value is null\/undefined./);
  });
}); 