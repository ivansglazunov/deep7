import { jest } from '@jest/globals';
import { newDeep } from '.';

describe('for loops', () => {
  it('should iterate over deep object properties', () => {
    const deep = newDeep();
    const A = new deep();
    const x = new deep();
    const y = new deep();
    const z = new deep();
    A._contain.x = x;
    A._contain.y = y;
    A._contain.z = z;

    const inKeys: string[] = [];
    for (const key in A) {
      inKeys.push(key);
    }
    expect(inKeys).toEqual(expect.arrayContaining(['x', 'y', 'z']));
    // Check it does not contain internal properties
    expect(inKeys).not.toContain('_id');

    const ofValues: any[] = [];
    for (const value of A) {
      ofValues.push(value);
    }
    expect(ofValues.length).toBe(3);
    expect(ofValues.find(v => v._id === x._id)).toBeTruthy();
    expect(ofValues.find(v => v._id === y._id)).toBeTruthy();
    expect(ofValues.find(v => v._id === z._id)).toBeTruthy();
  });

  it('should iterate over deep.Object', () => {
    const deep = newDeep();
    const objData = { x: 'a', y: 'b', z: 'c' };
    const deepObj = new deep.Object(objData);

    const inKeys: string[] = [];
    for (const key in deepObj) {
      if (Object.prototype.hasOwnProperty.call(objData, key)) {
        inKeys.push(key);
      }
    }
    expect(inKeys).toEqual(Object.keys(objData));

    const ofValues: any[] = [];
    for (const value of deepObj) {
      ofValues.push(value);
    }
    expect(ofValues).toEqual(Object.values(objData));
  });

  it('should iterate over deep.Set', () => {
    const deep = newDeep();
    const setData = new Set(['a', 'b', 'c']);
    const deepSet = new deep.Set(setData);

    const ofValues: string[] = [];
    // @ts-ignore
    for (const value of deepSet) {
      ofValues.push(value);
    }
    expect(ofValues.length).toBe(setData.size);
  });
}); 