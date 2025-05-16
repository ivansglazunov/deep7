import { Deep, deep } from '.';

describe('links', () => {
  it('type', () => {
    expect(deep.type).toBeInstanceOf(Deep);
    expect(deep.type.symbol).toBe(deep.deep.symbol);
    expect(deep.type.is(deep)).toBe(true);
    expect(deep.Relation.type.is(deep.Function)).toBe(true);
  });
  it('value', () => {
    const A = new deep();
    const B = new deep();
    const C = new deep('abc');

    A.value = B;
    B.value = C;

    expect(A.value.is(B)).toBe(true);
    expect(A.value.value.is(C)).toBe(true);
    expect(A.value.value.data).toBe('abc');
    expect(A()).toBe('abc');

    const D = new deep('def');
    B.value = D;
    expect(A()).toBe('def');
    
    delete A.value;
    expect(A()).toBe(undefined);
    A.value = B;
    expect(A()).toBe('def');
  });
});