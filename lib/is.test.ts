import { Deep, deep } from './';

describe('is', () => {
  it('deep is deep', () => {
    const A = new deep();
    const B = new A();
    expect(deep.is(deep)).toBe(true);
    expect(A.is(deep)).toBe(false);
    expect(A.is(A)).toBe(true);
    expect(A.is(B)).toBe(false);
    expect(B.is(B)).toBe(true);
  });
  it('deep is data', () => {
    const A = new deep();
    const B = new deep(123);
    const C = new deep('abc');
    expect(B.is(123)).toBe(true);
    expect(B.is(234)).toBe(false);
    expect(B.is('abc')).toBe(false);
    expect(C.is(123)).toBe(false);
    expect(C.is(234)).toBe(false);
    expect(C.is('abc')).toBe(true);
  });
});
