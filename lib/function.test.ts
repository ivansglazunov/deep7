import { newDeep } from '.';

describe('function', () => {
  it('new deep.Function(!function) error', () => {
    const deep = newDeep();
    expect(() => new deep.Function(123)).toThrow('must got function but' + typeof 123);
  });
  it('object.fn = function(this: {}, a: number, b: number) { return a + b;}', () => {
    const deep = newDeep();
    const parent: any = { a: 1, b: 2, c: 0 };
    const fn = new deep.Function(function (this: any, a: number, b: number) {
      expect(this).toBe(parent);
      this.c = a + b;
      return this.c;
    });
    parent.fn = fn;
    expect(parent.fn(1, 2)).toBe(3);
    expect(parent.c).toBe(3);
  });
  it('fn = function(this: {}, a: number, b: number) { return a + b;}', () => {
    const deep = newDeep();
    const fn = new deep.Function(function (this: any, a: number, b: number) {
      expect(this).toBe(undefined);
      return a + b;
    });
    expect(fn(1, 2)).toBe(3);
  });
});
