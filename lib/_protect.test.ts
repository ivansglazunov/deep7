import { newDeep } from '.';
import { _initDeep } from './_deep';

describe('_protect', () => {
  it('initial associations are protected after newDeep', () => {
    const deep = newDeep();
    
    // Protection should be enabled and active
    expect(deep._isProtectionEnabled()).toBe(true);
    expect(deep._isProtectionActive()).toBe(true);
    
    // Get the count of initial associations
    const initialCount = deep._getInitialAssociationsCount();
    expect(initialCount).toBeGreaterThan(0);
    
    // Try to modify the deep instance itself (should be protected)
    expect(() => {
      deep._type = 'some-new-type';
    }).toThrow('Initial association');
    
    expect(() => {
      deep._from = 'some-from';
    }).toThrow('Initial association');
    
    expect(() => {
      deep._to = 'some-to';
    }).toThrow('Initial association');
    
    expect(() => {
      deep._value = 'some-value';
    }).toThrow('Initial association');
    
    expect(() => {
      deep.destroy();
    }).toThrow('Initial association');
  });

  it('new associations created after newDeep are not protected', () => {
    const deep = newDeep();
    
    // Create new association after initialization
    const newAssociation = new deep();
    
    // This should work without errors
    newAssociation._type = deep._id;
    newAssociation._from = deep._id;
    newAssociation._to = deep._id;
    newAssociation._value = deep._id;
    
    // This should also work
    newAssociation.destroy();
    
    expect(true).toBe(true); // Test passes if no exceptions thrown
  });

  it('protection can be disabled globally', () => {
    const _Deep = _initDeep();
    
    // Create deep without protection
    const deep1 = new _Deep();
    
    // Protection should be disabled by default
    expect(_Deep._isProtectionEnabled()).toBe(false);
    expect(_Deep._isProtectionActive()).toBe(false);
    
    // Should be able to modify basic properties without setting type (avoid context issues)
    deep1._from = 'test-from';
    expect(deep1._from).toBe('test-from');
    
    // Enable protection but don't freeze yet
    _Deep._enableProtection();
    
    const deep2 = new _Deep();
    expect(_Deep._isProtectionEnabled()).toBe(true);
    expect(_Deep._isProtectionActive()).toBe(false);
    
    // Should still be able to modify since freeze is not active
    deep2._from = 'test-from-2';
    expect(deep2._from).toBe('test-from-2');
    
    // Now activate freeze
    _Deep.__freezeInitialAssociations = true;
    
    // deep2 should now be protected
    expect(() => {
      deep2._to = 'test-to';
    }).toThrow('Initial association');
    
    // Clean up
    _Deep._disableProtection();
    deep1.destroy();
    deep2.destroy();
  });

  it('individual associations can be unfrozen', () => {
    const deep = newDeep();
    
    // Initially protected
    expect(() => {
      deep._from = 'new-from';
    }).toThrow('Initial association');
    
    // Unfreeze this specific association
    deep._unfreezeAssociation(deep._id);
    
    // Now should be able to modify
    deep._from = 'new-from';
    expect(deep._from).toBe('new-from');
  });

  it('isAssociationFrozen works correctly', () => {
    const deep = newDeep();
    
    // Deep instance should be frozen
    expect(deep._isAssociationFrozen(deep._id)).toBe(true);
    
    // New association should not be frozen
    const newAssoc = new deep();
    expect(deep._isAssociationFrozen(newAssoc._id)).toBe(false);
    
    // After unfreezing
    deep._unfreezeAssociation(deep._id);
    expect(deep._isAssociationFrozen(deep._id)).toBe(false);
  });

  it('protection system counts initial associations correctly', () => {
    const initialCount = newDeep()._getInitialAssociationsCount();
    
    // Should have consistent count across multiple instances
    const secondCount = newDeep()._getInitialAssociationsCount();
    expect(secondCount).toBe(initialCount);
    
    // Count should be greater than 0 (at least the main deep instance)
    expect(initialCount).toBeGreaterThan(0);
  });

  it('system associations like Function, Field, etc. are protected', () => {
    const deep = newDeep();
    
    // System types should be protected
    expect(() => {
      deep.Function._type = 'modified';
    }).toThrow('Initial association');
    
    expect(() => {
      deep.Field._from = deep._id;
    }).toThrow('Initial association');
    
    expect(() => {
      deep.reasons.construction._value = 'modified';
    }).toThrow('Initial association');
  });

  it('error messages are clear and helpful', () => {
    const deep = newDeep();
    
    try {
      deep._type = 'test';
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error.message).toContain('Initial association');
      expect(error.message).toContain(deep._id);
      expect(error.message).toContain('frozen');
      expect(error.message).toContain('cannot be modified');
    }
  });

  it('protection works during data setting', () => {
    const deep = newDeep();
    
    // Try to set data on a system type that has data handler
    expect(() => {
      if (deep.String && deep.String._type) {
        deep.String._data = 'test-data';
      }
    }).toThrow('Initial association');
  });

  it('_protected getter returns correct status', () => {
    const deep = newDeep();
    
    // Deep instance should be protected
    expect(deep._protected).toBe(true);
    
    // New association should not be protected
    const newAssoc = new deep();
    expect(newAssoc._protected).toBe(false);
    
    // After unfreezing main deep should not be protected
    deep._unfreezeAssociation(deep._id);
    expect(deep._protected).toBe(false);
    
    // System associations should be protected
    expect(deep.Function._protected).toBe(true);
    expect(deep.String._protected).toBe(true);
  });
}); 