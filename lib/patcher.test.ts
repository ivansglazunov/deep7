import { newDeep } from "./deep";

const deep = newDeep();

describe('Patcher', () => {
  it('should create Patcher instance with undefined initial data', () => {
    const patcher = new deep.Patcher();
    
    expect(patcher).toBeDefined();
    expect(patcher.value).toBeInstanceOf(deep.Deep);
    expect(patcher.value.type_id).toBe(deep.Array.id);
    expect(patcher.value.data).toEqual([]);
  });

  it('should create Patcher instance with array initial data', () => {
    const initialData = [{ id: 1, name: 'A' }];
    const patcher = new deep.Patcher(initialData);
    
    expect(patcher.value.data).toEqual(initialData);
  });

  it('should create Patcher instance with deep.Array initial data', () => {
    const initialData = new deep.Array([{ id: 1, name: 'A' }]);
    const patcher = new deep.Patcher(initialData);
    
    expect(patcher.value.id).toBe(initialData.id);
    expect(patcher.value.data).toEqual([{ id: 1, name: 'A' }]);
  });

  it('should throw error for invalid initial data', () => {
    expect(() => {
      new deep.Patcher("invalid");
    }).toThrow('Patcher constructor expects initial data to be undefined, Array, or deep.Array');
  });

  it('should handle custom idField', () => {
    const initialData = [{ _id: 1, name: 'A' }];
    const patcher = new deep.Patcher(initialData, { idField: '_id' });
    
    expect(patcher.ref._idField).toBe('_id');
    
    const newData = [{ _id: 1, name: 'B' }];
    patcher.patch(newData);
    
    expect(patcher.value.data).toEqual(newData);
  });

  it('should handle custom isChanged function', () => {
    const initialData = [{ id: 1, name: 'A', version: 1 }];
    
    const customIsChanged = (oldItem: any, newItem: any) => {
      return oldItem.version !== newItem.version;
    };
    
    const patcher = new deep.Patcher(initialData, { isChanged: customIsChanged });
    
    const newData1 = [{ id: 1, name: 'B', version: 1 }];
    patcher.patch(newData1);
    
    expect(patcher.value.data).toEqual(initialData);
    
    const newData2 = [{ id: 1, name: 'B', version: 2 }];
    patcher.patch(newData2);
    
    expect(patcher.value.data).toEqual(newData2);
  });

  it('should handle additions with patch method', () => {
    let _log: any[] = [];
    const effect = (worker, source, target, stage, args) => {
      if (stage === deep.Deep._Inserted) {
        _log.push(`added:${JSON.stringify(args[1])}`);
      }
      return worker.super(source, target, stage, args);
    };
    
    const Container = deep(effect);
    const container = new Container();
    
    const initialData = [{ id: 1, name: 'A' }];
    const patcher = new deep.Patcher(initialData);
    
    container.value = patcher.value;
    
    const newData = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ];
    
    patcher.patch(newData);
    
    expect(patcher.value.data).toEqual(newData);
    expect(_log.length).toBe(1);
    expect(_log[0]).toContain('{"id":2,"name":"B"}');
  });

  it('should handle deletions with patch method', () => {
    let _log: any[] = [];
    const effect = (worker, source, target, stage, args) => {
      if (stage === deep.Deep._Deleted) {
        _log.push(`deleted:${JSON.stringify(args[1])}`);
      }
      return worker.super(source, target, stage, args);
    };
    
    const Container = deep(effect);
    const container = new Container();
    
    const initialData = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ];
    const patcher = new deep.Patcher(initialData);
    
    container.value = patcher.value;
    
    const newData = [{ id: 1, name: 'A' }];
    
    patcher.patch(newData);
    
    expect(patcher.value.data).toEqual(newData);
    expect(_log.length).toBe(1);
    expect(_log[0]).toContain('{"id":2,"name":"B"}');
  });

  it('should handle updates with patch method', () => {
    let _log: any[] = [];
    const effect = (worker, source, target, stage, args) => {
      if (stage === deep.Deep._Updated) {
        _log.push(`updated:${JSON.stringify(args)}`);
      }
      return worker.super(source, target, stage, args);
    };
    
    const Container = deep(effect);
    const container = new Container();
    
    const initialData = [{ id: 1, name: 'A' }];
    const patcher = new deep.Patcher(initialData);
    
    container.value = patcher.value;
    
    const newData = [{ id: 1, name: 'B' }];
    
    patcher.patch(newData);
    
    expect(patcher.value.data).toEqual(newData);
    expect(_log.length).toBe(1);
  });

  it('should handle mix of operations', () => {
    const initialData = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ];
    
    const patcher = new deep.Patcher(initialData);
    
    const newData = [
      { id: 1, name: 'A_updated' }, // Update
      { id: 3, name: 'C' }          // Add
      // { id: 2, name: 'B' } is deleted
    ];
    
    patcher.patch(newData);
    
    expect(patcher.value.data.length).toBe(2);
    expect(patcher.value.data).toEqual(expect.arrayContaining(newData));
  });

  it('should throw error when patch called with non-array', () => {
    const patcher = new deep.Patcher();
    
    expect(() => {
      patcher.patch("not an array");
    }).toThrow('Patcher.patch() expects an array');
  });

  it('should maintain reactivity when parent listens to patcher.value', () => {
    let eventCount = 0;
    const effect = (worker, source, target, stage, args) => {
      if (stage === deep.Deep._Inserted || stage === deep.Deep._Deleted || stage === deep.Deep._Updated) {
        eventCount++;
      }
      return worker.super(source, target, stage, args);
    };
    
    const Parent = deep(effect);
    const parent = new Parent();
    
    const patcher = new deep.Patcher([{ id: 1, name: 'A' }]);
    
    parent.value = patcher.value;
    
    patcher.patch([
      { id: 1, name: 'A_updated' },
      { id: 2, name: 'B' }
    ]);
    
    expect(eventCount).toBeGreaterThan(0);
  });
}); 