import { _Data } from '.';

describe('_data', () => {
  it('_Data', () => {
    const data = new _Data();
    data.byData(123);
    expect(data.byData(123)).toBe(undefined);
    expect(data.byData(123, 'abc')).toBe('abc');
    expect(data.byData(123)).toBe('abc');
    expect(data.byId('abc')).toBe(123);
    expect(data.byId('def')).toBe(undefined);
    expect(data.byId('abc', 456)).toBe(456);
    expect(data.byId('abc')).toBe(456);
    expect(data.byData(456)).toBe('abc');
    expect(data.byData(123)).toBe(undefined);
  });
});
