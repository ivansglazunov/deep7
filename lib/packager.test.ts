import { newDeep } from '.';
import { _delay } from './_promise';

const sort = (data) => data.sort((a, b) => a.id.localeCompare(b.id));

describe.skip('packager', () => {
  it('deep.Package', async () => {
    const deep = newDeep();
    expect(() => new deep.Package()).toThrow('Package name must be a string');
    const pckg = new deep.Package('test');
    expect(pckg.data.name).toBe('test');
    expect(pckg.data.version).toBe('0.0.0');
  });

  it('serializeId deserializeId', () => {
    const deep = newDeep();
    const storage = new deep.Storage({});
    const _size = deep._ids.size;
    let _nextSize = _size;

    expect(storage.serializeId(deep._id)).toBe('/');
    expect(storage.deserializeId('/')).toBe(deep._id);
    expect(storage.serializeId(deep.Function._id)).toBe('/Function');
    expect(storage.deserializeId('/Function')).toBe(deep.Function._id);

    deep.X = deep();
    _nextSize++; // deep
    _nextSize++; // context
    _nextSize++; // string
    deep.X.Y = deep();
    _nextSize++; // deep
    _nextSize++; // context
    _nextSize++; // string
    deep.X.Y.Z = deep();
    _nextSize++; // deep
    _nextSize++; // context
    _nextSize++; // string
    expect(storage.serializeId(storage.X.Y.Z._id)).toBe('/X/Y/Z');
    expect(storage.deserializeId('/X/Y/Z')).toBe(storage.X.Y.Z._id);

    const testPackage = new deep.Package('test');
    _nextSize++; // package
    _nextSize++; // object
    expect(storage.serializeId(testPackage._id)).toBe('test');
    expect(storage.deserializeId('test')).toBe(testPackage._id);
    testPackage.testLink = new deep();
    _nextSize++; // deep
    _nextSize++; // context
    _nextSize++; // string
    expect(storage.serializeId(testPackage.testLink._id)).toBe('test/testLink');
    expect(storage.deserializeId('test/testLink')).toBe(testPackage.testLink._id);
    
    const A = new deep();
    _nextSize++; // deep
    A.B = new deep();
    _nextSize++; // deep
    _nextSize++; // context
    _nextSize++; // string
    expect(storage.serializeId(A.B._id)).toBe(A.B._id);
    expect(storage.deserializeId(A.B._id)).toBe(A.B._id);
    expect(deep._ids.size).toBe(_nextSize);
  });
});
