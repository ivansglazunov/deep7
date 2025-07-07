import { _Data } from './_data';

it('Data', () => {
  const data = new _Data();
  expect(data.byId('abc')).toBe(undefined);
  expect(data.byData(123, 'abc')).toBe('abc');
  expect(data.byData(123)).toBe('abc');
  expect(() => data.byData(123, 'def')).toThrow();
  expect(() => data.byId('abc', 234)).toThrow();
});
