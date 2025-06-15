import { newDeep } from '.';

describe('lifecycle', () => {
  it('should create lifecycle types', () => {
    const deep = newDeep();
    
    expect(deep.Lifestate).toBeDefined();
    expect(deep.Mounting).toBeDefined();
    expect(deep.Mounted).toBeDefined();
    expect(deep.Unmounting).toBeDefined();
    expect(deep.Unmounted).toBeDefined();
    
    // Check type relationships
    expect(deep.Mounting.type.is(deep.Lifestate)).toBe(true);
    expect(deep.Mounted.type.is(deep.Lifestate)).toBe(true);
    expect(deep.Unmounting.type.is(deep.Lifestate)).toBe(true);
    expect(deep.Unmounted.type.is(deep.Lifestate)).toBe(true);
  });

  it('should create lifecycle events', () => {
    const deep = newDeep();
    
    expect(deep.events.Mounting).toBeDefined();
    expect(deep.events.Mounted).toBeDefined();
    expect(deep.events.Unmounting).toBeDefined();
    expect(deep.events.Unmounted).toBeDefined();
    
    // Check event relationships
    expect(deep.events.Mounting.type.is(deep.events.Lifechange)).toBe(true);
    expect(deep.events.Mounted.type.is(deep.events.Lifechange)).toBe(true);
    expect(deep.events.Unmounting.type.is(deep.events.Lifechange)).toBe(true);
    expect(deep.events.Unmounted.type.is(deep.events.Lifechange)).toBe(true);
  });

  it('should return Mounted for existing associations', () => {
    const deep = newDeep();
    const association = new deep();
    expect(association.lifestate.is(deep.Mounted)).toBe(true);
  });

  it('should check mounted state for existing associations', () => {
    const deep = newDeep();
    const association = new deep();
    expect(association.isMounted).toBe(true);
    expect(association.isUnmounted).toBe(false);
    expect(association.isMounting).toBe(false);
    expect(association.isUnmounting).toBe(false);
  });

  it('should create lifecycle instance', () => {
    const deep = newDeep();
    const effect = () => () => {};
    const lifecycle = new deep.Lifecycle(effect);
    expect(lifecycle.type.is(deep.Lifecycle)).toBe(true);
    expect(lifecycle._state._lifecycle_effect).toBeDefined();
  });

  it('should handle effect with cleanup function', () => {
    const deep = newDeep();
    let effectCalled = false;
    const effect = () => {
      effectCalled = true;
      return () => console.log('cleanup');
    };
    
    const lifecycle = new deep.Lifecycle(effect);
    expect(effectCalled).toBe(true);
    expect(lifecycle._state._lifecycle_destruction).toBeDefined();
  });

  it('should throw error for invalid effect argument', () => {
    const deep = newDeep();
    expect(() => new deep.Lifecycle('invalid')).toThrow('function');
    expect(() => new deep.Lifecycle(123)).toThrow('function');
  });

  it('should throw error when setting lifestate on non-lifecycle associations', () => {
    const deep = newDeep();
    const association = new deep();
    
    expect(() => {
      association.lifestate = deep.Mounting;
    }).toThrow('not available');
  });

  it('should handle lifecycle constructor', () => {
    const deep = newDeep();
    let effectCalled = false;
    let cleanupCalled = false;
    
    const effect = () => {
      effectCalled = true;
      return () => {
        cleanupCalled = true;
      };
    };
    
    const lifecycle = new deep.Lifecycle(effect);
    expect(effectCalled).toBe(true);
    expect(lifecycle._state._lifecycle_effect).toBeDefined();
    expect(lifecycle._state._lifecycle_destruction).toBeDefined();
  });

  it('should handle Lifecycle.lifestate getter', () => {
    const deep = newDeep();
    const lifecycle = new deep.Lifecycle(() => {});
    
    // Lifecycle instances should have lifestate field
    expect(lifecycle.lifestate).toBeDefined();
  });

  it('should throw error for non-boolean values in lifecycle state setters', () => {
    const deep = newDeep();
    const association = new deep();
    
    expect(() => {
      association.isMounted = 'invalid';
    }).toThrow('boolean');
  });

  it('full lifecycle', async () => {
    const deep = newDeep();
    let statuses = {
      insideCounstructed: false,
      insideMounting: false,
      insideMounted: false,
      insideUnmounting: false,
      insideUnmounted: false,
      insideDestroyed: false,
    };
    const lifecycle = new deep.Lifecycle(async (lifestate) => {
      statuses.insideCounstructed = true;
      if (lifestate == deep.Mounting) {
        statuses.insideMounting = true;
      }
      if (lifestate == deep.Mounted) {
        statuses.insideMounted = true;
      }
      if (lifestate == deep.Unmounting) {
        statuses.insideUnmounting = true;
      }
      if (lifestate == deep.Unmounted) {
        statuses.insideUnmounted = true;
      }
      if (lifestate == deep.Destroyed) {
        statuses.insideDestroyed = true;
      }
    });
    await lifecycle.mount;
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(false);
    expect(statuses.insideUnmounting).toBe(false);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);
    await lifecycle.mounted;
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(false);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);
    await lifecycle.unmount;
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);
    await lifecycle.unmounted;
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(true);
    expect(statuses.insideDestroyed).toBe(false);
    lifecycle.destroy();
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(true);
    expect(statuses.insideDestroyed).toBe(true);
  });
}); 