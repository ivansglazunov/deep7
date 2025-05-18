import { v4 as uuidv4 } from 'uuid';

import { _Relation } from '.';

describe('_relation', () => {
  it('_Relation', () => {
    const _relation = new _Relation();
    
    const i1 = uuidv4();
    const i2 = uuidv4();
    const i3 = uuidv4();

    expect(_relation.one(i1)).toBe(undefined);
    expect(_relation.one(i2)).toBe(undefined);
    expect(_relation.one(i3)).toBe(undefined);

    _relation.set(i1, i2);

    expect(_relation.one(i1)).toBe(i2);
    expect(_relation.one(i2)).toBe(undefined);
    expect(_relation.one(i3)).toBe(undefined);

    expect(_relation.many(i2).size).toBe(1);
    expect(_relation.many(i2).has(i1)).toBe(true);

    _relation.set(i1, i3);

    expect(_relation.one(i1)).toBe(i3);
    expect(_relation.one(i2)).toBe(undefined);
    expect(_relation.one(i3)).toBe(undefined);

    expect(_relation.many(i2).size).toBe(0);
    expect(_relation.many(i2).has(i1)).toBe(false);

    expect(_relation.many(i3).size).toBe(1);
    expect(_relation.many(i3).has(i1)).toBe(true);

    _relation.delete(i1);

    expect(_relation.one(i1)).toBe(undefined);
    expect(_relation.one(i2)).toBe(undefined);
    expect(_relation.one(i3)).toBe(undefined);
  });
});
