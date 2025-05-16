import { Deep, deep } from '.';

describe('field', () => {
  it('getter setter deleter', () => {
    let testValue = undefined;
    const parent = new deep();
    parent.field = new deep.Field(function (this: Deep, parent, field, key, value) {
      if (this.prevBy == deep.getter.symbol) {
        return testValue;
      } else if (this.prevBy == deep.setter.symbol) {
        testValue = value;
        return true;
      } else if (this.prevBy == deep.deleter.symbol) {
        testValue = undefined;
        return true;
      }
    });
    expect(parent.field).toBe(undefined);
    expect(parent.field = 123).toBe(123);
    expect(testValue).toBe(123);
    expect(delete parent.field).toBe(true);
    expect(testValue).toBe(undefined);
  });
});