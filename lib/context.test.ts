import { newDeep } from '.';

describe('context', () => {
  it('contexts initialized', () => {
    const deep = newDeep();
    expect(deep.Context.typed.size).toBeGreaterThan(30);
    expect(deep.String.name).toBe('String');
    expect(deep.String.typed.size).toBeGreaterThan(1);
    const one = deep.Method.in.data.values().next().value;
    expect(typeof one).toBe('string');
    const contextType = deep._Type.one(one);
    expect(contextType).toBe(deep.Context._id);
    expect((new deep(contextType)).state._name).toBe('Context');
    const contextValue = deep._Value.one(one);
    const contextValueTyped = deep._Type.one(contextValue);
    expect((new deep(contextValueTyped)).state._name).toBe('String');
    const contextValueDeep = new deep(contextValue);
    expect(contextValueDeep._data).toBe('Method');
    expect(deep.Method.in.data.size).toBe(1); 
  });
});
