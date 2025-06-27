import { newDeep } from '.';
import isEqual from 'lodash/isEqual.js';

describe('Delter', () => {
  it('should sync two arrays string[] using delter', async () => {
    const deep = newDeep();

    const a = { id: 1, name: 'a' };
    const b = { id: 2, name: 'b' };
    const c = { id: 3, name: 'c' };
    const d = { id: 4, name: 'd' };

    const arr1Initial = [a, b];
    const arr2Initial = [a, b];

    const arr1 = new deep.Array([...arr1Initial]);
    const arr2 = new deep.Array([...arr2Initial]);

    const delter = new deep.Delter(arr1);
    await delter.mount();

    delter.state.data.on(deep.events.dataAdd, (delta) => {
      deep.setDelta(arr2, delta.data);
      delter.state.data.delete(delta);
    });
    
    // Test Add
    arr1.add(c);
    expect(isEqual(arr1._data, arr2._data)).toBe(true);
    expect(delter.state.data._data.length).toBe(0);

    // Test Delete
    arr1.delete(a);
    expect(isEqual(arr1._data, arr2._data)).toBe(true);
    expect(delter.state.data._data.length).toBe(0);

    // Test Set
    arr1.set(0, d);
    expect(isEqual(arr1._data, arr2._data)).toBe(true);
    expect(delter.state.data._data.length).toBe(0);

    // Final check
    expect(arr2._data).toEqual([d,c]);

    await delter.unmount();
  });
}); 