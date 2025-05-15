import { Deep, deep } from './';

describe('function', () => {
  it('as callable', () => {
    let called = false;
    const fn = function (this: Deep) {
      called = true;
      expect(this.prev).toBe(deep.undefined.symbol);
      expect(this.prevBy).toBe(deep.apply.symbol);
      return 123;
    }
    const f = new deep.Function(fn);
    const o = { f };
    expect(f.data).toBe(fn);
    expect(f()).toBe(123);
    expect(called).toBe(true);
  });
  
  it('as constructor', () => {
    let called = false;
    const fn = function(this: Deep, a?: number) {
      called = true;
      expect(this.prev).toBe(X.symbol);
      expect(this.prevBy).toBe(deep.construct.symbol);
      return { a };
    };
    const X = new deep.Function(fn);
    const x = new X(123);
    expect(called).toBe(true);
    expect(X).toBeInstanceOf(Deep);
    expect(X.data).toBe(fn);
    expect(x).not.toBeInstanceOf(Deep);
    expect(x).toEqual({ a: 123 });
  });

  it('as callable and constructor', () => {
    let called = false;
    let constructed = false;
    const fn = function(this: Deep, a?: number) {
      if (this.prevBy == deep.apply.symbol) {
        expect(this.prev).toBe(deep.undefined.symbol);
        called = true;
        return a;
      } else if (this.prevBy == deep.construct.symbol) {
        expect(this.prev).toBe(f.symbol);
        constructed = true;
        return { a };
      } else {
        throw new Error('!prevBy');
      }
    };
    const f = new deep.Function(fn);
    const obj = new f(123);
    expect(constructed).toBe(true);
    expect(obj).not.toBeInstanceOf(Deep);
    expect(obj).toEqual({ a: 123 });
    const num = f(123);
    expect(called).toBe(true);
    expect(num).toBe(123);
  });

  it('as callable and constructor from parent', () => {
    let called = false;
    let constructed = false;
    const fn = function(this: Deep, a: number) {
      if (this.prevBy == deep.method.symbol) {
        expect(this.prev).toBe(p.symbol);
        called = true;
        return a * this.data.x;
      } else if (this.prevBy == deep.construct.symbol) {
        expect(this.prev).toBe(f.symbol);
        constructed = true;
        return { a };
      } else {
        throw new Error('!prevBy');
      }
    };
    const f = new deep.Function(fn);
    const parent = { f, x: 234 };
    const p = new deep(parent);
    const obj = new parent.f(123);
    expect(constructed).toBe(true);
    expect(obj).not.toBeInstanceOf(Deep);
    expect(obj).toEqual({ a: 123 });
    const num = parent.f(123);
    expect(called).toBe(true);
    expect(num).toBe(123 * 234);
  });
});