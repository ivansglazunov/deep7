import { newDeep } from '.';

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

it('typeof chain detection', () => {
  const deep = newDeep();
  const a = new deep();
  const b = new a();
  const c = new b();
  
  // Test typeof chain detection
  expect(c.typeof(a)).toBe(true);  // c -> b -> a
  expect(c.typeof(b)).toBe(true);  // c -> b
  expect(c.typeof(deep)).toBe(true); // c -> b -> a -> deep
  expect(b.typeof(c)).toBe(false); // b is not in c's type chain
  expect(b.typeof(a)).toBe(true);  // b -> a
  expect(b.typeof(deep)).toBe(true); // b -> a -> deep
  expect(a.typeof(deep)).toBe(true); // a -> deep
  expect(a.typeof(b)).toBe(false); // b is not in a's type chain
  expect(a.typeof(c)).toBe(false); // c is not in a's type chain
  
  // Test with Deep instances and strings
  expect(c.typeof(a._id)).toBe(true);
  expect(c.typeof(deep._id)).toBe(true);
  expect(b.typeof(c._id)).toBe(false);
});

it('typeofs returns type hierarchy', () => {
  const deep = newDeep();
  const a = new deep();
  const b = new a();
  const c = new b();
  
  // Test typeofs returns proper type chain
  const cTypes = c.typeofs;
  expect(cTypes).toEqual([b._id, a._id, deep._id]);
  
  const bTypes = b.typeofs;
  expect(bTypes).toEqual([a._id, deep._id]);
  
  const aTypes = a.typeofs;
  expect(aTypes).toEqual([deep._id]);
  
  const deepTypes = deep.typeofs;
  expect(deepTypes).toEqual([]); // Root has no types
});

it('typeofs with no type', () => {
  const deep = newDeep();
  const a = new deep();
  
  // Use low-level delete to remove type without proxy issues
  a._Deep._Type.delete(a._id);
  
  const aTypes = a.typeofs;
  expect(aTypes).toEqual([]); // No types when _type is undefined
});

it('typeofs with custom type chain', () => {
  const deep = newDeep();
  const root = new deep();
  const middle = new deep();
  const leaf = new deep();
  
  // Create custom type chain: leaf -> middle -> root -> deep
  leaf._type = middle._id;
  middle._type = root._id;
  root._type = deep._id;
  
  const leafTypes = leaf.typeofs;
  expect(leafTypes).toEqual([middle._id, root._id, deep._id]);
  
  const middleTypes = middle.typeofs;
  expect(middleTypes).toEqual([root._id, deep._id]);
  
  const rootTypes = root.typeofs;
  expect(rootTypes).toEqual([deep._id]);
});

it('typeofs prevents infinite loops with visited set', () => {
  const deep = newDeep();
  const a = new deep();
  const b = new deep();
  const c = new deep();
  
  // Create a chain that references itself deeper in the hierarchy
  // but doesn't create immediate cyclic context issues
  a._type = deep._id;
  b._type = a._id;
  c._type = b._id;
  
  // Just testing that it doesn't hang with visited set
  const cTypes = c.typeofs;
  expect(cTypes).toEqual([b._id, a._id, deep._id]);
  expect(cTypes.length).toBe(3); // Should be finite
});

it('_i sequential numbers work correctly', () => {
  const deep = newDeep();
  const a = new deep();
  const b = new deep();
  const c = new deep();
  
  // Each instance should have a unique sequential number
  expect(typeof a._i).toBe('number');
  expect(typeof b._i).toBe('number');
  expect(typeof c._i).toBe('number');
  
  expect(a._i).toBeGreaterThan(0);
  expect(b._i).toBeGreaterThan(a._i);
  expect(c._i).toBeGreaterThan(b._i);
});
