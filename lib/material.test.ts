import { newDeep } from '.';

describe('material', () => {
  it('deep.Global should exist', () => {
    const deep = newDeep();
    expect(deep.Global).toBeDefined();
    expect(deep.Global._id).toBeDefined();
  });

  it('deep.globals should return query for global contexts', () => {
    const deep = newDeep();
    expect(deep.globals).toBeDefined();
    expect(typeof deep.globals[Symbol.iterator]).toBe('function');
  });

  it('deep.path() should return / for root', () => {
    const deep = newDeep();
    expect(deep.path()).toBe('/');
  });

  it('deep.path should resolve context paths', () => {
    const deep = newDeep();
    deep.a = new deep();
    deep.a.b = new deep();
    deep.a.b.c = new deep();
    
    expect(deep.a.path()).toBe('/a');
    expect(deep.a.b.path()).toBe('/a/b');
    expect(deep.a.b.c.path()).toBe('/a/b/c');
  });

  it('deep.path should resolve by path string', () => {
    const deep = newDeep();
    deep.x = new deep();
    deep.x.y = new deep();
    
    expect(deep.path('/x')._id).toBe(deep.x._id);
    expect(deep.path('/x/y')._id).toBe(deep.x.y._id);
  });

  it('deep.path should resolve global paths', () => {
    const deep = newDeep();
    const testEntity = new deep();
    deep.Global.globalTest = testEntity;
    
    expect(deep.path('globalTest')._id).toBe(testEntity._id);
  });

  it('deep.material should return Material object', () => {
    const deep = newDeep();
    deep.test = new deep.String('hello');
    
    const material = deep.test.material;
    expect(material).toBeDefined();
    expect(material.id).toBe('/test');
    expect(material.type_id).toBe('/String');
    expect(material.string).toBe('hello');
    expect(typeof material.created_at).toBe('number');
    expect(typeof material.updated_at).toBe('number');
  });

  it('material should include type, from, to, value paths', () => {
    const deep = newDeep();
    const association = new deep();
    
    // Create type, from, to, value with proper paths
    deep.TestType = new deep.String('TestType');
    deep.TestFrom = new deep.String('TestFrom');
    deep.TestTo = new deep.String('TestTo');
    deep.TestValue = new deep.String('TestValue');
    
    association.type_id = deep.TestType._id;
    association.from_id = deep.TestFrom._id;
    association.to_id = deep.TestTo._id;
    association.value_id = deep.TestValue._id;
    
    deep.testAssociation = association;
    
    const material = association.material;
    expect(material.id).toBe('/testAssociation');
    expect(material.type_id).toBe('/TestType');
    expect(material.from_id).toBe('/TestFrom');
    expect(material.to_id).toBe('/TestTo');
    expect(material.value_id).toBe('/TestValue');
  });

  it('deep.dematerial should create associations from Material', () => {
    const deep = newDeep();
    
    const material = {
      id: '/created/test',
      type_id: '/String',
      string: 'test data',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    
    expect(association).toBeDefined();
    expect(association.path()).toBe('/created/test');
    expect(association.type_id).toBe(deep.String._id);
    expect(association._data).toBe('test data');
    expect(deep.path('/created/test')._id).toBe(association._id);
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
    
    expect(association).toBeDefined();
    expect(deep.path('/auto/nested/path')._id).toBe(association._id);
    expect(deep.auto).toBeDefined();
    expect(deep.auto.nested).toBeDefined();
    expect(deep.auto.nested.path).toBeDefined();
  });

  it('deep.dematerial should work with global paths', () => {
    const deep = newDeep();
    
    const material = {
      id: 'globalPath/test',
      string: 'global data',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    const association = deep.dematerial(material);
    
    expect(association).toBeDefined();
    expect(association.path()).toBe('globalPath/test');
    expect(deep.path('globalPath/test')._id).toBe(association._id);
  });

  it('deep.dematerial should handle different data types', () => {
    const deep = newDeep();
    
    const materials = [
      { id: '/string/test', string: 'text', created_at: Date.now(), updated_at: Date.now() },
      { id: '/number/test', number: 42, created_at: Date.now(), updated_at: Date.now() },
      { id: '/object/test', object: { key: 'value' }, created_at: Date.now(), updated_at: Date.now() },
      { id: '/function/test', function: 'function() { return 123; }', created_at: Date.now(), updated_at: Date.now() }
    ];
    
    for (const material of materials) {
      const association = deep.dematerial(material);
      expect(association).toBeDefined();
      
      if (material.string) {
        expect(association.type_id).toBe(deep.String._id);
        expect(association._data).toBe(material.string);
      }
      if (material.number) {
        expect(association.type_id).toBe(deep.Number._id);
        expect(association._data).toBe(material.number);
      }
      if (material.object) {
        expect(association.type_id).toBe(deep.Object._id);
        expect(association._data).toEqual(material.object);
      }
      if (material.function) {
        expect(association.type_id).toBe(deep.Function._id);
        expect(typeof association._data).toBe('function');
        expect(association._data()).toBe(123);
      }
    }
  });

  it('deep.dematerial should validate input', () => {
    const deep = newDeep();
    
    expect(() => deep.dematerial(null)).toThrow('Material must be an object');
    expect(() => deep.dematerial(undefined)).toThrow('Material must be an object');
    expect(() => deep.dematerial('string')).toThrow('Material must be an object');
    expect(() => deep.dematerial({})).toThrow('Material must have an id');
  });

  it('serialization and deserialization should be symmetric', () => {
    const deep = newDeep();
    
    // Create complex structure
    deep.app = new deep();
    deep.app.user = new deep.Object({ name: 'John', age: 30 });
    deep.app.config = new deep.String('production');
    
    // Serialize
    const userMaterial = deep.app.user.material;
    const configMaterial = deep.app.config.material;
    
    // Create new deep and deserialize
    const deep2 = newDeep();
    const restoredUser = deep2.dematerial(userMaterial);
    const restoredConfig = deep2.dematerial(configMaterial);
    
    // Verify
    expect(restoredUser.path()).toBe('/app/user');
    expect(restoredUser._data).toEqual({ name: 'John', age: 30 });
    expect(restoredConfig.path()).toBe('/app/config');
    expect(restoredConfig._data).toBe('production');
  });
}); 