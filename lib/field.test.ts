import { newDeep } from '.';

describe('field', () => {
  it('new deep.Field(!function&!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.Field(123)).toThrow('must got function or string id but got number');
  });
  it('deep.field = new Field', () => {
    const deep = newDeep();
    let _value: any = 123;
    const field = new deep.Field(function (this: any, key: any, value: any) {
      if (this._reason == deep.reasons.getter._id) {
        return _value;
      } else if (this._reason == deep.reasons.setter._id) {
        return _value = value;
      } else if (this._reason == deep.reasons.deleter._id) {
        _value = undefined;
        return true;
      } else throw new Error('unknown field reason');
    });
    deep._contain.field = field;
    expect(deep.field).toBe(123);
    expect(deep.field = 234).toBe(234);
    expect(deep.field).toBe(234);
    expect(delete deep.field).toBe(true);
    expect(deep.field).toBe(undefined);
    expect(deep.field = 345).toBe(345);
    expect(deep.field).toBe(345);
  });
});
