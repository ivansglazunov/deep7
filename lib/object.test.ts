import { newDeep } from '.';

describe('object', () => {
  it('new deep.Object(!object) error', () => {
    const deep = newDeep();
    expect(() => new deep.Object('abc')).toThrow('must provide a Object instance to new deep.Object()');
  });
  it('new deep.Object({ num: 123 })', () => {
    const deep = newDeep();
    const object = new deep.Object({ num: 123 });
    expect(object._data).toEqual({ num: 123 });
  });
  it('deep instance denied', () => {
    const deep = newDeep();
    expect(() => new deep.Object({ num: deep.Field })).toThrow(`Object contains a Deep instance: ${deep.Field._id} at path .num, only _id or _symbol values are allowed in Objects.`);
    expect(() => new deep.Object({ inside: { num: deep.Field } })).toThrow(`Object contains a Deep instance: ${deep.Field._id} at path .inside.num, only _id or _symbol values are allowed in Objects.`);
  });
});
