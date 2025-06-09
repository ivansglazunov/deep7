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
}); 