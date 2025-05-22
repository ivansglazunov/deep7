import { newDeep } from '.';

describe('context', () => {
  it('contexts initialized', () => {
    const deep = newDeep();
    expect(deep.Context.typed.size).toBeGreaterThan(30);
    expect(deep.String.name).toBe('String');
  });
});
