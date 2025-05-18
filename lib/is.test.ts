import { _Reason, newDeep } from '.';

it('is', () => {
  const deep = newDeep();
  const a = new deep();
  const b = new a();
  const c = new b();
  expect(deep.is(deep)).toBe(true);
  expect(a.is(deep)).toBe(false);
  expect(b.is(a)).toBe(false);
  expect(c.is(b)).toBe(false);
  expect(a.is(a)).toBe(true);
  expect(b.is(a)).toBe(false);
  expect(c.is(a)).toBe(false);
  expect(b.is(b)).toBe(true);
  expect(c.is(c)).toBe(true);
});
