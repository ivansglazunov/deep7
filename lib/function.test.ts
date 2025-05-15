import { deep } from "./";

describe('deep.Function', () => {
  it('as callable', () => {
    const f = new deep.Function(() => 123);
    expect(f()).toBe(123);
  });
  it('as constructor', () => {
    // const X = new deep.Function((...args) => {
    //   console.log('X', args);
    // });
    // const x = new X();
    // expect(x.data).toBe(X);
    // expect(x.symbol).toBe(X.symbol);
    // expect(x.prev).toBe(X.symbol);
    // expect(x.prevBy).toBe(deep.construct);
  });
});