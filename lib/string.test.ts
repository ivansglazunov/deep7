import { newDeep } from '.';

describe('string', () => {
  it('new deep.String(!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.String(123)).toThrow('must got string but number');
  });
  it('object.str = "abc"', () => {
    const deep = newDeep();
    const str = new deep.String('abc');
    expect(str._data).toBe('abc');
  });
  it('deep.String("equal").is(deep.String("equal"))', () => {
    const deep = newDeep();
    expect(new deep.String('equal')._id).toBe(new deep.String('equal')._id);
    expect(new deep.String('equal').is(new deep.String('equal')._id)).toBe(true);
  });
});
