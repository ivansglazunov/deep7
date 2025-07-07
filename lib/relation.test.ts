import { v4 as uuidv4 } from 'uuid';

import { Relation } from './relation';

it('Relation', () => {
  const relation = new Relation();
  
  const i1 = uuidv4();
  const i2 = uuidv4();
  const i3 = uuidv4();

  expect(relation.one(i1)).toBe(undefined);
  expect(relation.one(i2)).toBe(undefined);
  expect(relation.one(i3)).toBe(undefined);

  relation.set(i1, i2);

  expect(relation.one(i1)).toBe(i2);
  expect(relation.one(i2)).toBe(undefined);
  expect(relation.one(i3)).toBe(undefined);

  expect(relation.many(i2).size).toBe(1);
  expect(relation.many(i2).has(i1)).toBe(true);

  relation.set(i1, i3);

  expect(relation.one(i1)).toBe(i3);
  expect(relation.one(i2)).toBe(undefined);
  expect(relation.one(i3)).toBe(undefined);

  expect(relation.many(i2).size).toBe(0);
  expect(relation.many(i2).has(i1)).toBe(false);

  expect(relation.many(i3).size).toBe(1);
  expect(relation.many(i3).has(i1)).toBe(true);

  relation.delete(i1);

  expect(relation.one(i1)).toBe(undefined);
  expect(relation.one(i2)).toBe(undefined);
  expect(relation.one(i3)).toBe(undefined);
});