import { newDeep } from '.';
import isEqual from 'lodash/isEqual.js';

describe('Patch', () => {
  it('should construct and mount a patch', async () => {
    const deep = newDeep();
    const data = new deep.Array([{ id: 1, name: 'A' }]);
    const patch = new deep.Patch({ data });
    expect(patch.data._data).toEqual([{ id: 1, name: 'A' }]);
    await patch.mount();
    expect(patch.isMounted).toBe(true);
    expect(patch.data._data).toEqual([{ id: 1, name: 'A' }]);
  });

  it('should handle custom idField', async () => {
    const deep = newDeep();
    const data = new deep.Array([{ _id: 1, name: 'A' }]);
    const patch = new deep.Patch({ data, idField: '_id' });
    await patch.mount();
    await patch.update({ data: [{ _id: 1, name: 'B' }] });
    expect(patch.data._data).toEqual([{ _id: 1, name: 'B' }]);
  });

  it('should use default isChanged function (based on isEqual)', async () => {
    const deep = newDeep();
    const initialData = [{ id: 1, name: 'A', version: 1 }];
    const data = new deep.Array([...initialData]);
    const patch = new deep.Patch({ data });
    await patch.mount();

    const updatedItem = { id: 1, name: 'B', version: 1 };
    const newData = [updatedItem];

    let setPayload: any;
    patch.data.on(deep.events.dataSet, (payload: any) => {
      setPayload = payload;
    });

    await patch.update({ data: newData });
    
    expect(setPayload._before).toEqual(initialData[0]);
    expect(setPayload._after).toEqual(updatedItem);
    expect(patch.data._data).toEqual(newData);
  });

  it('should accept custom isChanged function', async () => {
    const deep = newDeep();
    const initialData = [{ id: 1, name: 'A', version: 1 }];
    const data = new deep.Array([...initialData]);
    
    // Custom isChanged that only compares version field
    const customIsChanged = (oldItem: any, newItem: any) => {
      return oldItem.version !== newItem.version;
    };
    
    const patch = new deep.Patch({ 
      data, 
      isChanged: customIsChanged 
    });
    await patch.mount();

    // Update name but keep same version - should NOT trigger update
    const updatedItem1 = { id: 1, name: 'B', version: 1 };
    let setPayload: any = null;
    patch.data.on(deep.events.dataSet, (payload: any) => {
      setPayload = payload;
    });

    await patch.update({ data: [updatedItem1] });
    expect(setPayload).toBe(null); // No update should happen

    // Update version - should trigger update
    const updatedItem2 = { id: 1, name: 'B', version: 2 };
    await patch.update({ data: [updatedItem2] });
    
    expect(setPayload).not.toBe(null);
    expect(setPayload._after).toEqual(updatedItem2);
    expect(patch.data._data).toEqual([updatedItem2]);
  });

  it('should handle additions', async () => {
    const deep = newDeep();
    const initialData = [{ id: 1, name: 'A' }];
    const data = new deep.Array([...initialData]);
    const patch = new deep.Patch({ data });
    await patch.mount();
    
    const additions = [{ id: 2, name: 'B' }];
    const newData = [...initialData, ...additions];

    let addedPayload: any[] = [];
    patch.data.on(deep.events.dataAdd, (...payload: any[]) => {
      addedPayload = payload;
    });
    
    await patch.update({ data: newData });
    
    expect(addedPayload.length).toBe(1);
    expect(addedPayload[0]._symbol).toEqual(additions[0]);
    expect(patch.data._data).toEqual(newData);
  });

  it('should handle deletions', async () => {
    const deep = newDeep();
    const initialData = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
    const data = new deep.Array([...initialData]);
    const patch = new deep.Patch({ data });
    await patch.mount();
    
    const newData = [{ id: 1, name: 'A' }];
    const deletedItem = { id: 2, name: 'B' };

    let deletedPayload: any[] = [];
    patch.data.on(deep.events.dataDelete, (...payload: any[]) => {
      deletedPayload = payload;
    });
    
    await patch.update({ data: newData });
    
    expect(deletedPayload.length).toBe(1);
    expect(deletedPayload[0]._symbol).toEqual(deletedItem);
    expect(patch.data._data).toEqual(newData);
  });

  it('should handle updates', async () => {
    const deep = newDeep();
    const initialData = [{ id: 1, name: 'A' }];
    const data = new deep.Array([...initialData]);
    const patch = new deep.Patch({ data });
    await patch.mount();

    const updatedItem = { id: 1, name: 'B' };
    const newData = [updatedItem];

    let setPayload: any;
    patch.data.on(deep.events.dataSet, (payload: any) => {
      setPayload = payload;
    });

    await patch.update({ data: newData });
    
    expect(setPayload._before).toEqual(initialData[0]);
    expect(setPayload._after).toEqual(updatedItem);
    expect(patch.data._data).toEqual(newData);
  });

  it('should handle a mix of operations', async () => {
    const deep = newDeep();
    const initialData = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    const data = new deep.Array([...initialData]);
    const patch = new deep.Patch({ data });
    await patch.mount();

    const newData = [
      { id: 1, name: 'A_updated' }, // Update
      { id: 3, name: 'C' },          // Add
      // { id: 2, name: 'B' } is deleted
    ];

    const events: any = { add: [], delete: [], update: [] };
    patch.data.on(deep.events.dataAdd, (...p: any) => events.add.push(...p));
    patch.data.on(deep.events.dataDelete, (...p: any) => events.delete.push(...p));
    patch.data.on(deep.events.dataSet, (p: any) => events.update.push(p));

    await patch.update({ data: newData });

    expect(events.add.length).toBe(1);
    expect(events.add[0]._symbol).toEqual({ id: 3, name: 'C' });
    expect(events.delete.length).toBe(1);
    expect(events.delete[0]._symbol).toEqual({ id: 2, name: 'B' });
    expect(events.update.length).toBe(1);
    expect(events.update[0]._before).toEqual({ id: 1, name: 'A' });
    expect(events.update[0]._after).toEqual({ id: 1, name: 'A_updated' });
    
    expect(patch.data._data.length).toBe(2);
    // Use jest-each or similar for unordered comparison
    expect(patch.data._data).toEqual(expect.arrayContaining(newData));
  });
}); 