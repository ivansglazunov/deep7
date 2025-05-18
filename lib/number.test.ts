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
});
