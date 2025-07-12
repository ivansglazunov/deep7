import { newDeep } from "./deep";

const deep = newDeep();

describe('Delter', () => {
  it('should create Delter instance', () => {
    const arr = new deep.Array([1, 2, 3]);
    const delter = new deep.Delter(arr);
    
    expect(delter).toBeDefined();
    expect(delter.value).toBeInstanceOf(deep.Deep);
    expect(delter.value.type_id).toBe(deep.Array.id);
    expect(delter.value.data).toEqual([1, 2, 3]); 
    expect(delter.data).toEqual([]);
  });

  it('should track array additions', () => {
    let _log: any[] = [];
    const effect = (worker, source, target, stage, args) => {
      if (stage === deep.Deep._Inserted) {
        _log.push(`inserted:${JSON.stringify(args)}`);
      }
      return worker.super(source, target, stage, args);
    };
    
    const Container = deep(effect);
    const container = new Container();
    
    const arr = new deep.Array([1, 2]);
    const delter = new deep.Delter(arr);
    
    container.value = delter.value;
    
    arr.add(3);
    
    expect(delter.data.length).toBe(1);
    const delta = delter.data[0];
    expect(delta.type).toBe('add');
    expect(delta.payload.value).toBe(3);
    expect(delta.payload.index).toBe(2);
    
    expect(_log.length).toBe(1);
  });

  it('should track array deletions', () => {
    const arr = new deep.Array([1, 2, 3]);
    const delter = new deep.Delter(arr);
    
    arr.delete(2);
    
    expect(delter.data.length).toBe(1);
    const delta = delter.data[0];
    expect(delta.type).toBe('delete');
    expect(delta.payload.value).toBe(2);
  });

  it('should sync two arrays using delter and setDelta', () => {
    const a = { id: 1, name: 'a' };
    const b = { id: 2, name: 'b' };
    const c = { id: 3, name: 'c' };

    const arr1 = new deep.Array([a, b]);
    const arr2 = new deep.Array([a, b]);
    
    const delter = new deep.Delter(arr1);
    
    let deltaCount = 0;
    const Container = deep((worker, source, target, stage, args) => {
      if (stage === deep.Deep._Inserted || stage === deep.Deep._Deleted || stage === deep.Deep._Updated) {
        deltaCount++;
        expect(delter.deltas.data.length).toBe(1);
        arr2.setDelta(delter.deltas.data.shift());
      }
      return worker.super(source, target, stage, args);
    });
    const container = new Container();
    container.value = delter; 
    
    arr1.add(c);
    expect(arr1.data).toEqual([a, b, c]);
    expect(arr2.data).toEqual([a, b, c]);
    expect(delter.data.length).toBe(0);  
    
    arr1.delete(a);
    expect(arr1.data).toEqual([b, c]);
    expect(arr2.data).toEqual([b, c]);
    expect(delter.data.length).toBe(0);
  });

  it('should handle getDelta static method', () => {
    const delta = deep.getDelta(deep.Deep._Inserted, [1, 'test']);
    
    expect(delta.type).toBe('add');
    expect(delta.payload.index).toBe(1);
    expect(delta.payload.value).toBe('test');
    expect(typeof delta.id).toBe('string');
  });

  it('should handle setDelta static method', () => {
    const arr = new deep.Array([1, 2]);
    const delta = {
      id: 'test',
      type: 'add' as const,
      payload: { index: 2, value: 3 }
    };
    
    arr.setDelta(delta);
    expect(arr.data).toEqual([1, 2, 3]);
  });

  it('should throw error when no watched instance provided', () => {
    expect(() => {
      new deep.Delter();
    }).toThrow('Delter constructor requires a deep instance to watch.');
  });

  it('should throw error for unsupported event type', () => {
    expect(() => {
      deep.getDelta('unknown_event', []);
    }).toThrow('Unsupported event type for getDelta: unknown_event');
  });

  it('should throw error for unsupported delta type', () => {
    const arr = new deep.Array();
    const invalidDelta = { id: 'test', type: 'invalid', payload: {} };
    
    expect(() => {
      arr.setDelta(invalidDelta);
    }).toThrow('Unsupported delta type: invalid');
  });
}); 