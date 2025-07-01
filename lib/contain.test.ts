import { newDeep } from '.';

describe('contain', () => {
  it('initialized', () => {
    const deep = newDeep();
    expect(deep.Contain.typed.size).toBeGreaterThan(30);
    expect(deep.String.name).toBe('String');
    expect(deep.String.typed.size).toBeGreaterThan(1);
    const one = deep.Method.in.data.values().next().value;
    expect(typeof one).toBe('string');
    const contextType = deep._Type.one(one);
    expect(contextType).toBe(deep.Contain._id);
    expect((new deep(contextType)).state._name).toBe('Contain');
    const contextValue = deep._Value.one(one);
    const contextValueTyped = deep._Type.one(contextValue);
    expect((new deep(contextValueTyped)).state._name).toBe('String');
    const contextValueDeep = new deep(contextValue);
    expect(contextValueDeep._data).toBe('Method');
    expect(deep.Method.in.data.size).toBe(1); 
    const a = deep();
    const str = new deep.String('testValue');
    expect(str.name).toBe(undefined);
    a.testField = str;
    expect(a.testField instanceof deep.Deep).toBe(true);
    expect(a.testField.name).toBe('testField');
    expect(a.testField.data).toBe('testValue');
    expect(str.name).toBe('testField');
    for (const outed of Array.from(deep._From.many(a._id))) {
      if (deep._Type.one(outed) === deep.Contain._id) {
        const context = new deep(outed);
        context.destroy();
      }
    }
    expect(a.testField).toBe(undefined);
    expect(str.name).toBe(undefined);
  });
  it('duplicated', () => {
    const deep = newDeep();
    const X = deep();
    const Y = deep();
    const Z = deep();
    const R = deep();
    X.A = Y;
    Y.A = Z;
    expect(X.A.A.A).toBe(undefined);
    expect(Z.A).toBe(undefined);
    X.A.A.A = R;
    expect(X.A._id).toBe(Y._id);
    expect(Y._contain.A._id).toBe(Z._id);
    expect(Y.A._id).toBe(Z._id);
    expect(X.A.A._id).toBe(Z._id);
    expect(X.A.A.A._id).toBe(R._id);
  });
  it('delete operator support', () => {
    const deep = newDeep();
    const a = deep();
    const b = deep();
    
    // Set property
    a.b = b;
    
    // Check that property exists and identity works
    expect(a.b instanceof deep.Deep).toBe(true);
    expect(a.b.is(a.b)).toBe(true);
    expect(a.b.is(b)).toBe(true); // Correct way to compare Deep objects
    
    // Delete property should return true and actually remove the property
    const deleteResult = delete a.b;
    expect(deleteResult).toBe(true);
    
    // Property should be undefined after deletion
    expect(a.b).toBe(undefined);
  });
  
  it('user scenario: const a = deep(); a.b = deep(); a.b.is(a.b) // true; delete a.b; a.b // undefined', () => {
    const deep = newDeep();
    
    // Exact user scenario
    const a = deep();
    a.b = deep();
    expect(a.b.is(a.b)).toBe(true);
    delete a.b;
    expect(a.b).toBe(undefined);
    
    // Test multiple deletions
    const c = deep();
    c.d = deep();
    expect(c.d.is(c.d)).toBe(true); // Should be true before delete
    const deleteResult = delete c.d;
    expect(deleteResult).toBe(true);
    expect(c.d).toBe(undefined); // Should be undefined after delete
  });
});
