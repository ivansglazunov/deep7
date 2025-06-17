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

  it('materializeId dematerializeId', () => {
    const deep = newDeep();
    expect(deep.Storage.materializeId(deep._id)).toBe('/');
    expect(deep.Storage.dematerializeId('/')).toBe(deep._id);
    expect(deep.Storage.materializeId(deep.Function._id)).toBe('/Function');
    expect(deep.Storage.dematerializeId('/Function')).toBe(deep.Function._id);
    expect(deep.Storage.materializeId(deep.Storage.Memory._id)).toBe('/Storage/Memory');
    expect(deep.Storage.dematerializeId('/Storage/Memory')).toBe(deep.Storage.Memory._id);
    const testPackage = new deep.Package('test');
    expect(deep.Storage.materializeId(testPackage._id)).toBe('test');
    expect(deep.Storage.dematerializeId('test')).toBe(testPackage._id);
    testPackage.testLink = new deep();
    expect(deep.Storage.materializeId(testPackage.testLink._id)).toBe('test/testLink');
    expect(deep.Storage.dematerializeId('test/testLink')).toBe(testPackage.testLink._id);
    const A = new deep();
    A.B = new deep();
    expect(deep.Storage.materializeId(A.B._id)).toBe(A.B._id);
  });

  it('deep.Storage.Memory query', async () => {
    const deep1 = newDeep();
    const A = new deep1();
    const storage1 = new deep1.Storage.Memory({
      query: deep1.query({ type: A }),
    });
    await storage1.mount();
    expect(storage1.load()).toStrictEqual({ data: [] });
    const a1 = new A();
    expect(storage1.load()).toStrictEqual({ data: [
      storage1.materialize(a1),
    ] });
    const deep2 = newDeep();
    const storage2 = new deep2.Storage.Memory({
      memory: storage1.state._memory,
    });
    await storage2.mount();

    expect(deep2._ids.has(a1._id)).toBe(true);

    const a2 = new A();
    expect(storage1.load()).toStrictEqual({ data: [
      storage1.materialize(a1),
      storage1.materialize(a2),
    ] });
    expect(deep2._ids.has(a2._id)).toBe(true);

    const deep3 = newDeep();
    const storage3 = new deep3.Storage.Memory({
      memory: storage1.state._memory,
    });
    await storage3.mount();
    expect(deep3._ids.has(a1._id)).toBe(true);
    expect(deep3._ids.has(a2._id)).toBe(true);

    a1.destroy();
    expect(storage1.load()).toStrictEqual({ data: [
      storage1.materialize(a2),
    ] });
    expect(deep2._ids.has(a1._id)).toBe(false);
    expect(deep2._ids.has(a2._id)).toBe(true);
    expect(deep2._ids.has(a1._id)).toBe(false);
    expect(deep3._ids.has(a2._id)).toBe(true);

    await storage3.unmount();

    a2.destroy();
    expect(storage1.load()).toStrictEqual({ data: [] });
    expect(deep2._ids.has(a2._id)).toBe(false);

    expect(deep3._ids.has(a2._id)).toBe(true);

    expect(deep3(a2._id)._type).toBe(A._id);
    expect(deep1(A._id)._type).toBe(A._type);
    expect(deep3(A._id)._type).toBe(undefined);

    await storage1.unmount();
    await storage2.unmount();
  });

  it('deep.Storage.Memory package', async () => {
    const deep1 = newDeep();
    const testPackage = new deep1.Package('test');
    testPackage.hpmor1 = new deep1();

    expect(deep1.Storage.materializeId(testPackage.hpmor1._id)).toBe('test/hpmor1');
    expect(deep1.Storage.dematerializeId('test/hpmor1')).toBe(testPackage.hpmor1._id);

    const storage1 = new deep1.Storage.Memory({
      package: testPackage,
    });

    await storage1.mount();

    expect(storage1.load()).toStrictEqual({
      package: {
        name: 'test',
        version: '0.0.0',
      },
      data: [
        storage1.materialize(testPackage.hpmor1),
      ],
    });

    testPackage.hpmor2 = new deep1();
    expect(deep1.Storage.materializeId(testPackage.hpmor1._id)).toBe('test/hpmor1');
    expect(deep1.Storage.materializeId(testPackage.hpmor2._id)).toBe('test/hpmor2');

    expect(storage1.load()).toStrictEqual({
      package: {
        name: 'test',
        version: '0.0.0',
      },
      data: [
        storage1.materialize(testPackage.hpmor1),
        storage1.materialize(testPackage.hpmor2),
      ],
    });

    await storage1.unmount();
  });
});
