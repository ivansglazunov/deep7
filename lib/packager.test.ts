import { newDeep } from '.';
import { _delay } from './_promise';

describe('packages', () => {
  it('deep.Package', async () => {
    const deep = newDeep();
    expect(() => new deep.Package()).toThrow('Package name must be a string');
    const pckg = new deep.Package('test');
    expect(pckg.data.name).toBe('test');
    expect(pckg.data.version).toBe('0.0.0');
  });

  it('serializeId deserializeId', () => {
    const deep = newDeep();
    const storage = new deep.Storage.Memory({});
    expect(storage.serializeId(deep._id)).toBe('/');
    expect(storage.deserializeId('/')).toBe(deep._id);
    expect(storage.serializeId(deep.Function._id)).toBe('/Function');
    expect(storage.deserializeId('/Function')).toBe(deep.Function._id);
    expect(storage.serializeId(deep.Storage.Memory._id)).toBe('/Storage/Memory');
    expect(storage.deserializeId('/Storage/Memory')).toBe(deep.Storage.Memory._id);
    const testPackage = new deep.Package('test');
    expect(storage.serializeId(testPackage._id)).toBe('test');
    expect(storage.deserializeId('test')).toBe(testPackage._id);
    testPackage.testLink = new deep();
    expect(storage.serializeId(testPackage.testLink._id)).toBe('test/testLink');
    expect(storage.deserializeId('test/testLink')).toBe(testPackage.testLink._id);
    const A = new deep();
    A.B = new deep();
    expect(storage.serializeId(A.B._id)).toBe(A.B._id);
  });

  it('deep.Storage.Memory query', async () => {
    const deep1 = newDeep();
    const A = new deep1();
    const a1 = new A();

    // deep1 to memory storage
    const storage1 = new deep1.Storage.Memory({
      query: deep1.query({ type: A }),
      mode: 'soft',
    });
    expect(storage1.load()).toStrictEqual({ data: [] }); // is empty

    // deep2 soft syncing
    const deep2 = newDeep();
    const storage2 = new deep2.Storage.Memory({
      memory: storage1.state._memory,
      mode: 'soft',
    });

    // deep3 strict syncing
    const deep3 = newDeep();
    const storage3 = new deep2.Storage.Memory({
      memory: storage1.state._memory,
      mode: 'strict',
    });

    // check load
    expect(storage2.load()).toStrictEqual({ data: [] }); // is empty
    expect(storage3.load()).toStrictEqual({ data: [] }); // is empty

    // mount
    await storage1.mount();
    await storage2.mount();
    await storage3.mount();

    // soft syncing a._type A
    expect(storage1.isMounted).toBe(true);
    expect(storage2.isMounted).toBe(true);

    // A is not defined
    expect(storage3.isMounted).toBe(false);
    expect(storage3.isUnmounted).toBe(true);

    // check load
    expect(storage1.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
      ]
    });
    expect(storage2.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
      ]
    });
    expect(storage3.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
      ]
    });

    // check ids
    expect(storage1.state._errors).toStrictEqual([]);
    expect(deep2._ids.has(a1._id)).toBe(true);
    expect(storage2.state._errors).toStrictEqual([]);
    expect(deep3._ids.has(a1._id)).toBe(false);
    expect(storage3.state._errors).toStrictEqual([
      `[strict] Failed to resolve dependencies for link ${a1._id}`
    ]);

    // add new link
    const a2 = new A();
    expect(storage1.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
        storage1.serialize(a2),
      ]
    });
    expect(deep2._ids.has(a2._id)).toBe(true);
    expect(storage2.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
        storage1.serialize(a2),
      ]
    });
    expect(deep3._ids.has(a2._id)).toBe(false);
    expect(storage3.load()).toStrictEqual({
      data: [
        storage1.serialize(a1),
        storage1.serialize(a2),
      ]
    });

    // destroy
    a1.destroy();
    expect(storage1.load()).toStrictEqual({
      data: [
        storage1.serialize(a2),
      ]
    });
    expect(storage2.load()).toStrictEqual({
      data: [
        storage1.serialize(a2),
      ]
    });
    expect(storage3.load()).toStrictEqual({
      data: [
        storage1.serialize(a2),
      ]
    });
    expect(deep2._ids.has(a1._id)).toBe(false);
    expect(deep2._ids.has(a2._id)).toBe(true);
    expect(deep3._ids.has(a1._id)).toBe(false);
    expect(deep3._ids.has(a2._id)).toBe(false);

    await storage1.unmount();
    await storage2.unmount();
    // await storage3.unmount(); // already unmounted
  });

  it('deep.Storage.Memory package', async () => {
    const deep1 = newDeep();
    const testPackage = new deep1.Package('test');
    testPackage.a1 = new deep1();

    expect(deep1.Storage.serializeId(testPackage.a1._id)).toBe('test/a1');
    expect(deep1.Storage.deserializeId('test/a1')).toBe(testPackage.a1._id);

    const storage1 = new deep1.Storage.Memory({
      package: testPackage,
    });
    await storage1.mount();

    const sort = (data) => data.sort((a, b) => a.id.localeCompare(b.id));

    expect(sort(storage1.load().data)).toStrictEqual(sort([
      storage1.serialize(testPackage.a1),
    ]));

    const deep4 = newDeep();
    const storage4 = new deep4.Storage.Memory({
      memory: storage1.state._memory,
      subscribe: false,
      mode: 'soft',
    });
    await storage4.mount();
    const package4 = storage4.package;
    expect(storage4.isMounted).toBe(true);

    expect(storage4.state._errors).toStrictEqual([]);

    expect(sort(storage4.load().data)).toStrictEqual(sort([
      storage1.serialize(testPackage.a1),
    ]));
    expect(package4.a1._type).toBe(deep4._id);
    expect(package4.a1._id).not.toBe(testPackage.a1._id);
    const package4_a1 = package4.a1._id;
    
    const B = new deep1();
    testPackage.b1 = new B();

    expect(package4?._contain?.b1?._id).toBe(undefined); // without subscribe b dont thinking

    testPackage.a2 = new deep1();
    expect(storage1.serializeId(testPackage.a1._id)).toBe('test/a1');
    expect(storage1.serializeId(testPackage.a2._id)).toBe('test/a2');

    expect(deep4._ids.has(testPackage.a2._id)).toBe(false);

    expect(sort(storage1.load().data)).toStrictEqual(sort([
      storage1.serialize(testPackage.a1),
      storage1.serialize(testPackage.a2),
      storage1.serialize(testPackage.b1),
    ]));

    const deep2 = newDeep();
    const storage2 = new deep2.Storage.Memory({
      memory: storage1.state._memory,
      // auto detect package from memory
      mode: 'strict', // save error and unmount becouse a.type A is not founded
    });
    await storage2.mount();
    expect(storage2.isUnmounted).toBe(true);
    expect(storage2.state._errors).toStrictEqual([
      `[strict] Failed to resolve dependencies for link test/b1`
    ]);

    const deep3 = newDeep();
    const storage3 = new deep3.Storage.Memory({
      memory: storage1.state._memory,
      // auto detect package from memory
      mode: 'soft',
    });
    await storage3.mount();
    expect(storage3.package.data).toStrictEqual({ name: 'test', version: '0.0.0' });
    expect(storage3.isUnmounted).toBe(false);
    expect(storage1.state._errors).toStrictEqual([]);
    expect(storage2.state._errors).toStrictEqual([
      `[strict] Failed to resolve dependencies for link test/b1`
    ]);
    expect(storage3.state._errors).toStrictEqual([]);

    expect(deep4._ids.has(package4_a1)).toBe(true);

    await storage1.unmount();
    // await storage2.unmount(); // already unmounted
    await storage3.unmount();
    await storage4.unmount();

    // console.log('package4_a1', package4_a1);
    // expect(deep4._ids.has(package4_a1)).toBe(false);
  });
});
