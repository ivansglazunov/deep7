import { newDeep } from '.';

describe('material', () => {
  it('deep.path() should return "/"', () => {
    const deep = newDeep();
    expect(deep.path()).toBe('/');
  });

  it('deep.a.path() should return "/a"', () => {
    const deep = newDeep();
    deep.a = new deep();
    expect(deep.a.path()).toBe('/a');
  });

  it('deep.a.b.path() should return "/a/b"', () => {
    const deep = newDeep();
    deep.a = new deep();
    const b = deep.a.b = new deep();
    expect(b.path()).toBe('/a/b');
  });

  it('deep.path("/a/b") should resolve to deep.a.b', () => {
    const deep = newDeep();
    deep.a = new deep();
    const b = deep.a.b = new deep();
    expect(deep.path('/a/b')._id).toBe(b._id);
  });

  it('deep.path("/nonexistent") should return undefined', () => {
    const deep = newDeep();
    expect(deep.path('/nonexistent')).toBe(undefined);
  });

  it('deep.path(id) should resolve existing association by ID', () => {
    const deep = newDeep();
    const association = new deep();
    expect(deep.path(association._id)._id).toBe(association._id);
  });

  it('deep.path(id) should return undefined for non-existing ID', () => {
    const deep = newDeep();
    expect(deep.path('non-existing-id')).toBe(undefined);
  });

  it('deep.path with ID-based path should resolve correctly', () => {
    const deep = newDeep();
    const parent = new deep();
    parent._contain.child = new deep();
    
    const child = parent._contain.child;
    expect(deep.path(`${parent._id}/child`)._id).toBe(child._id);
  });

  it('deep.Root should be a Lifecycle', () => {
    const deep = newDeep();
    expect(deep.Root.type.is(deep.Lifecycle)).toBe(true);
  });

  it('deep.Root should have state.roots Map', () => {
    const deep = newDeep();
    expect(deep.Root.state.roots).toBeInstanceOf(Map);
  });

  it('deep.Root constructor should require string and Deep instance', () => {
    const deep = newDeep();
    const testDeep = new deep();
    
    expect(() => new deep.Root()).toThrow('Root constructor requires a string as first argument');
    expect(() => new deep.Root('test')).toThrow('Root constructor requires a Deep instance as second argument');
    expect(() => new deep.Root('test', 'not-deep')).toThrow('Root constructor requires a Deep instance as second argument');
    
    const root = new deep.Root('test', testDeep);
    expect(root.value.data).toBe('test');
    expect(root.to._id).toBe(testDeep._id);
    expect(deep.Root.state.roots.get('test')).toBe(testDeep._id);
  });

  it('Root paths should work correctly', () => {
    const deep = newDeep();
    const a = new deep();
    new deep.Root('testRoot', a);
    
    const b = a.b = new deep();
    const c = b.c = new deep();
    
    expect(c.path()).toBe('testRoot/b/c');
    expect(deep.path('testRoot/b/c')._id).toBe(c._id);
  });

  it('association.material should return Material object', () => {
    const deep = newDeep();
    deep.test = new deep();
    const material = deep.test.material;
    
    expect(material).toBeDefined();
    expect(material.id).toBe('/test');
    expect(typeof material.created_at).toBe('number');
    expect(typeof material.updated_at).toBe('number');
  });

  it('material should include type, from, to, value paths', () => {
    const deep = newDeep();
    
    // Create material first, then verify references
    const material1 = {
      id: '/TestType',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const material2 = {
      id: '/TestFrom',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const material3 = {
      id: '/TestTo',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const material4 = {
      id: '/TestValue',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    // Create all associations first
    deep.dematerial(material1);
    deep.dematerial(material2);
    deep.dematerial(material3);
    deep.dematerial(material4);
    
    // Now create main link
    const linkMaterial = {
      id: '/testLink',
      type_id: '/TestType',
      from_id: '/TestFrom', 
      to_id: '/TestTo',
      value_id: '/TestValue',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(linkMaterial);
    const generatedMaterial = association.material;
    
    // Verify that references are correctly resolved
    expect(association.type.path()).toBe('/TestType');
    expect(association.from.path()).toBe('/TestFrom');
    expect(association.to.path()).toBe('/TestTo');
    expect(association.value.path()).toBe('/TestValue');
    
    // Material should contain the resolved references
    expect(generatedMaterial.type_id).toBe('/TestType');
    expect(generatedMaterial.from_id).toBe('/TestFrom');
    expect(generatedMaterial.to_id).toBe('/TestTo');
    expect(generatedMaterial.value_id).toBe('/TestValue');
  });

  it('material should include data based on type', () => {
    const deep = newDeep();
    
    // String data
    const str = new deep.String('test string');
    deep.testString = str;
    expect(deep.testString.material.string).toBe('test string');
    
    // Number data
    const num = new deep.Number(42);
    deep.testNumber = num;
    expect(deep.testNumber.material.number).toBe(42);
    
    // Object data  
    const obj = new deep.Object({ key: 'value' });
    deep.testObject = obj;
    expect(deep.testObject.material.object).toEqual({ key: 'value' });
    
    // Function data
    const func = new deep.Function(() => 'test');
    deep.testFunction = func;
    expect(deep.testFunction.material.function).toBe('() => \'test\'');
  });

  it('deep.dematerial should parse Material and create association', () => {
    const deep = newDeep();
    
    const material = {
      id: '/testDematerial',
      string: 'test data',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    expect(association).toBeDefined();
    expect(association.path()).toBe('/testDematerial');
    expect(association.data).toBe('test data');
    expect(association.type.is(deep.String)).toBe(true);
  });

  it('deep.dematerial should resolve type, from, to, value references', () => {
    const deep = newDeep();
    
    // Create referenced associations
    deep.TestType = new deep();
    deep.TestFrom = new deep(); 
    deep.TestTo = new deep();
    deep.TestValue = new deep();
    
    const material = {
      id: '/testLink',
      type_id: '/TestType',
      from_id: '/TestFrom', 
      to_id: '/TestTo',
      value_id: '/TestValue',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    expect(association.type._id).toBe(deep.TestType._id);
    expect(association.from._id).toBe(deep.TestFrom._id);
    expect(association.to._id).toBe(deep.TestTo._id);
    expect(association.value._id).toBe(deep.TestValue._id);
  });

  it('deep.dematerial should create nested contexts automatically', () => {
    const deep = newDeep();
    
    const material = {
      id: '/auto/nested/path',
      string: 'nested data',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    expect(association.path()).toBe('/auto/nested/path');
    expect(deep.path('/auto/nested/path')._id).toBe(association._id);
    expect(deep.auto.nested.path._id).toBe(association._id);
  });

  it('deep.dematerial should work with Root paths', () => {
    const deep = newDeep();
    
    const material = {
      id: 'rootPath/test',
      number: 123,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    expect(association.data).toBe(123);
    expect(association.path()).toBe('rootPath/test');
  });

  it('deep.dematerial should handle validation errors', () => {
    const deep = newDeep();
    
    expect(() => deep.dematerial(null)).toThrow('Material must be an object');
    expect(() => deep.dematerial({})).toThrow('Material must have an id');
    expect(() => deep.dematerial('not object')).toThrow('Material must be an object');
  });

  it('Root destruction should clean up roots map', () => {
    const deep = newDeep();
    const testAssociation = new deep();
    
    const root = new deep.Root('cleanupTest', testAssociation);
    expect(deep.Root.state.roots.has('cleanupTest')).toBe(true);
    
    root.destroy();
    expect(deep.Root.state.roots.has('cleanupTest')).toBe(false);
  });

  it('complex path resolution should work', () => {
    const deep = newDeep();
    
    // Create complex nested structure
    deep.level1 = new deep();
    deep.level1.level2 = new deep();
    deep.level1.level2.level3 = new deep();
    
    const target = deep.level1.level2.level3;
    expect(target.path()).toBe('/level1/level2/level3');
    expect(deep.path('/level1/level2/level3')._id).toBe(target._id);
  });

  it('material round-trip should preserve data', () => {
    const deep = newDeep();
    
    // Create complex association
    deep.source = new deep.String('original data');
    
    // Get material
    const material = deep.source.material;
    
    // Create new association from material  
    const recreated = deep.dematerial({
      ...material,
      id: '/recreated'
    });
    
    expect(recreated.data).toBe('original data');
    expect(recreated.path()).toBe('/recreated');
  });
}); 