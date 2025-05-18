import { _Reason, newDeep } from '.';

describe('method', () => {
  it('new deep.Method(!function&!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.Method(123)).toThrow('must got function or string id but got number');
  });
  it('deep.method = new Method', () => {
    const deep = newDeep();
    let _value: any = 123;
    const method = new deep.Method(function (this: any, a: number, b: number) {
      return a + b;
    });
    deep._context.method = method;
    expect(deep.method(1, 2)).toBe(3);
    expect(deep.method).toBe(method);
  });
});
