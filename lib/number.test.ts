import { newDeep } from '.';

describe('number', () => {
  it('new deep.Number(!number) error', () => {
    const deep = newDeep();
    expect(() => new deep.Number('abc')).toThrow('must got number but string');
  });
  it('object.num = 123', () => {
    const deep = newDeep();
    const num = new deep.Number(123);
    expect(num._data).toBe(123);
  });
  it('new deep.Number(0) should return object with _symbol === 0', () => {
    const deep = newDeep();
    const num = new deep.Number(0);
    expect(num._symbol).toBe(0);
  });
});
