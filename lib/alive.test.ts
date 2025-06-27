import { newDeep } from '.';

describe('alive', () => {
  it('new deep.Alive(!function&!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.Alive(123)).toThrow('must got function or string id but got number');
  });

  it('lifecycle hooks are called correctly', () => {
    const deep = newDeep();
    let constructed = false;
    let destructed = false;

    const aliveInstance = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        constructed = true;
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        destructed = true;
        return true;
      } else {
        throw new Error('unknown alive reason');
      }
    });

    expect(aliveInstance.type_id).toBe(deep.Alive.AliveInstance._id);

    // Creating an instance should trigger construction
    const being = new aliveInstance();
    expect(constructed).toBe(true);
    expect(destructed).toBe(false);

    // Destroying the instance should trigger destruction
    being.destroy();
    expect(destructed).toBe(true);
  });

  it('should not call construction multiple times for same instance', () => {
    const deep = newDeep();
    let constructionCallCount = 0;
    let destructionCallCount = 0;

    const aliveInstance = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        constructionCallCount++;
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        destructionCallCount++;
        return true;
      } else {
        throw new Error('unknown alive reason');
      }
    });

    // Create instance first time
    const being1 = new aliveInstance();
    expect(constructionCallCount).toBe(1);
    expect(destructionCallCount).toBe(0);

    // Create instance with same ID (simulating restoration scenario)
    const being2 = new deep(being1._id);
    expect(being2.type_id).toBe(aliveInstance._id);
    
    // Construction should not be called again due to state protection
    expect(constructionCallCount).toBe(1); // Still 1, not 2
    expect(destructionCallCount).toBe(0);

    // Destroy should work normally
    being1.destroy();
    expect(destructionCallCount).toBe(1);
  });

  it('should handle multiple instances of same alive type correctly', () => {
    const deep = newDeep();
    let constructionCallCount = 0;

    const aliveInstance = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        constructionCallCount++;
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        return true;
      } else {
        throw new Error('unknown alive reason');
      }
    });

    // Create multiple different instances
    const being1 = new aliveInstance();
    const being2 = new aliveInstance();
    const being3 = new aliveInstance();

    // Each instance should trigger construction once
    expect(constructionCallCount).toBe(3);
    expect(being1._id).not.toBe(being2._id);
    expect(being2._id).not.toBe(being3._id);

    // Re-accessing existing instances should not trigger construction
    const being1Again = new deep(being1._id);
    const being2Again = new deep(being2._id);
    
    expect(constructionCallCount).toBe(3); // Still 3, no additional calls
    expect(being1Again._id).toBe(being1._id);
    expect(being2Again._id).toBe(being2._id);
  });

  it('should work correctly with storage restoration scenario', () => {
    const deep = newDeep();
    let constructionCallCount = 0;
    let aliveCallLog: string[] = [];

    // Create a Storage-like alive instance
    const StorageLike = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        constructionCallCount++;
        aliveCallLog.push(`construction:${this._id}`);
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        aliveCallLog.push(`destruction:${this._id}`);
        return true;
      } else {
        throw new Error('unknown alive reason');
      }
    });

    // Simulate initial creation (like in newDeep)
    const storage1 = new StorageLike();
    expect(constructionCallCount).toBe(1);
    expect(aliveCallLog).toEqual([`construction:${storage1._id}`]);

    // Simulate storage restoration scenario (like in _applyDelta)
    // This should NOT trigger construction again
    const storage1Restored = new deep(storage1._id);
    expect(storage1Restored.type_id).toBe(StorageLike._id);
    expect(constructionCallCount).toBe(1); // Still 1, not 2
    expect(aliveCallLog).toEqual([`construction:${storage1._id}`]); // No additional calls

    // Create a completely new storage instance
    const storage2 = new StorageLike();
    expect(constructionCallCount).toBe(2);
    expect(aliveCallLog).toEqual([
      `construction:${storage1._id}`,
      `construction:${storage2._id}`
    ]);

    // Cleanup
    storage1.destroy();
    storage2.destroy();
    expect(aliveCallLog).toEqual([
      `construction:${storage1._id}`,
      `construction:${storage2._id}`,
      `destruction:${storage1._id}`,
      `destruction:${storage2._id}`
    ]);
  });

  it('should handle alive function not found gracefully during restoration', () => {
    const deep = newDeep();
    
    // Create alive instance normally
    const aliveInstance = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        return true;
      }
    });

    const being = new aliveInstance();
    const beingId = being._id;
    const aliveInstanceId = aliveInstance._id;

    // Simulate scenario where we access existing instance multiple times
    // (like during storage restoration when same ID is referenced multiple times)
    
    // First access - should work fine
    const reference1 = new deep(beingId);
    expect(reference1._id).toBe(beingId);
    expect(reference1.type_id).toBe(aliveInstanceId);
    
    // Second access - should not trigger construction again
    const reference2 = new deep(beingId);
    expect(reference2._id).toBe(beingId);
    expect(reference2.type_id).toBe(aliveInstanceId);
    
    // Both references should be the same instance
    expect(reference1._id).toBe(reference2._id);
    
    // This demonstrates that state protection works - no errors thrown
    expect(() => {
      const reference3 = new deep(beingId);
      expect(reference3.type_id).toBe(aliveInstanceId);
    }).not.toThrow();
  });
}); 