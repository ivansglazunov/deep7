import { newDeep } from '.';

describe('method', () => {
  it('new deep.Method(!function&!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.Method(123)).toThrow('must got function or string id but got number');
  });
  it('deep.method = new Method', () => {
    const deep = newDeep();
    let value_id: any = 123;
    const method = new deep.Method(function (this: any, a: number, b: number) {
      return a + b;
    });
    deep._contain.method = method;
    expect(deep.method(1, 2)).toBe(3);
    expect(deep.method).toBe(method);
  });
  it('method', () => {
    const deep = newDeep();
    const called: any = [];
    const addCalled = (value) => called.push(value);
    const method = new deep.Method(function (this, value) {
      addCalled([this?._source, this?._reason, value]);
      return value;
    });

    const d = new deep();
    const a = new deep();
    const b = new deep();

    d._contain.method = method;

    const r1 = d.method('a');
    expect(a.method?.('b')).toBe(undefined);

    expect(r1).toBe('a');
  });
});
