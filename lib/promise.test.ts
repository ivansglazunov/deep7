import { newDeep } from '.';

describe('promise field', () => {
  it('should create resolved promise when none exists', () => {
    const deep = newDeep();
    const instance = new deep();
    
    const promise = instance.promise;
    expect(promise).toBeInstanceOf(Promise);
    
    // Should be resolved immediately
    return promise.then(result => {
      expect(result).toBe(true);
    });
  });

  it('should chain promises when setting new ones', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    let completed = false;
    
    // Set first promise
    const promise1 = new Promise(resolve => {
      setTimeout(() => {
        completed = true;
        resolve('first');
      }, 50);
    });
    instance.promise = promise1;
    
    // Should be able to wait for completion
    await instance.promise;
    expect(completed).toBe(true);
  });

  it('should handle non-promise values', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    instance.promise = 'some value';
    const result = await instance.promise;
    expect(result).toBe('some value');
  });

  it('should reset to resolved promise when deleted', () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Set a promise
    instance.promise = new Promise(resolve => setTimeout(() => resolve('test'), 100));
    
    // Delete it
    delete instance.promise;
    
    // Should be resolved immediately
    const promise = instance.promise;
    return promise.then(result => {
      expect(result).toBe(true);
    });
  });

  it('should handle promise rejections gracefully', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Set a rejecting promise
    const rejectingPromise = Promise.reject(new Error('Test error'));
    instance.promise = rejectingPromise;
    
    // Promise should be set regardless of rejection
    expect(instance.promise).toBeInstanceOf(Promise);
    
    // Wait a bit for the promise to be processed
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // The promise should still exist and the error should be caught silently
    expect(instance.promise).toBeInstanceOf(Promise);
  });

  it('should work with HasyxDeepStorage for async tracking', async () => {
    const deep = newDeep();
    const storage = new deep.HasyxDeepStorage();
    
    // Simulate async operation
    const asyncOp = new Promise(resolve => {
      setTimeout(() => resolve('sync complete'), 50);
    });
    
    storage.promise = asyncOp;
    
    // Should be able to wait for completion
    const result = await storage.promise;
    expect(result).toBe('sync complete');
  });

  it('should chain multiple operations for storage', async () => {
    const deep = newDeep();
    const storage = new deep.HasyxDeepStorage();
    
    let operation1Done = false;
    let operation2Done = false;
    
    // Set first operation
    storage.promise = new Promise(resolve => {
      setTimeout(() => {
        operation1Done = true;
        resolve('op1');
      }, 30);
    });
    
    // Set second operation
    storage.promise = new Promise(resolve => {
      setTimeout(() => {
        operation2Done = true;
        resolve('op2');
      }, 20);
    });
    
    // Wait for operations
    await storage.promise;
    
    // Both operations should complete
    expect(operation1Done).toBe(true);
    expect(operation2Done).toBe(true);
  });
}); 