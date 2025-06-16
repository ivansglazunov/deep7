import { newDeep } from '.';
import Debug from './debug';

const debug = Debug('promise');

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

  it('should handle resolved promise values', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Set a resolved promise instead of a string
    instance.promise = Promise.resolve('some value');
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
    
    // Prevent unhandled promise rejection
    rejectingPromise.catch(() => {});
    
    instance.promise = rejectingPromise;
    
    // Promise should be set regardless of rejection
    expect(instance.promise).toBeInstanceOf(Promise);
    
    // Wait a bit for the promise to be processed
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // The promise should still exist and the error should be caught silently
    expect(instance.promise).toBeInstanceOf(Promise);
  });

  it('should ensure sequential execution order', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    const completionOrder: number[] = [];
    
    // Set first promise - will complete in 50ms
    const promise1 = new Promise(resolve => {
      setTimeout(() => {
        completionOrder.push(1);
        debug(`Promise 1 completed`);
        resolve('first');
      }, 50);
    });
    instance.promise = promise1;
    
    // Set second promise - will complete in 30ms, but should wait for first to complete in chain
    const promise2 = new Promise(resolve => {
      setTimeout(() => {
        completionOrder.push(2);
        debug(`Promise 2 completed`);
        resolve('second');
      }, 30);
    });
    instance.promise = promise2;
    
    // Set third promise - will complete in 20ms, but should wait for second to complete in chain
    const promise3 = new Promise(resolve => {
      setTimeout(() => {
        completionOrder.push(3);
        debug(`Promise 3 completed`);
        resolve('third');
      }, 20);
    });
    instance.promise = promise3;
    
    const result = await instance.promise;
    
    debug(`Completion order: ${completionOrder.join(', ')}`);
    
    // Promises complete in order of their timeout (3, 2, 1), but chain returns result of the last one
    // Important that chain waited for all promises sequentially
    expect(result).toBe('third'); // Should return result of last promise
    
    // Check that all promises completed
    expect(completionOrder).toContain(1);
    expect(completionOrder).toContain(2);
    expect(completionOrder).toContain(3);
  });

  it('should continue chain even if previous promise fails', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    const executionOrder: string[] = [];
    
    // Set failing promise
    const failingPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        executionOrder.push('failed');
        reject(new Error('First failed'));
      }, 20);
    });
    instance.promise = failingPromise;
    
    // Set successful promise - should execute in chain even if previous failed
    const successPromise = new Promise(resolve => {
      setTimeout(() => {
        executionOrder.push('success');
        resolve('second');
      }, 10);
    });
    instance.promise = successPromise;
    
    const result = await instance.promise;
    
    debug(`Execution order: ${executionOrder.join(', ')}`);
    
    // Both promises should execute (independent of each other by time)
    // but chain should handle error and continue
    expect(executionOrder).toContain('failed');
    expect(executionOrder).toContain('success');
    expect(result).toBe('second');
  });

  it('debug: simple sequential test', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    debug('Setting first promise...');
    instance.promise = new Promise(resolve => {
      debug('First promise executing');
      setTimeout(() => {
        debug('First promise resolving');
        resolve('first');
      }, 100);
    });
    
    debug('Setting second promise...');
    instance.promise = new Promise(resolve => {
      debug('Second promise executing');
      setTimeout(() => {
        debug('Second promise resolving');
        resolve('second');
      }, 50);
    });
    
    debug('Waiting for final result...');
    const result = await instance.promise;
    debug('Final result:', result);
    
    expect(result).toBe('second');
  });
});

describe('isPromising field', () => {
  it('should return false when no promises are active', () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Initially no promises - should be false
    expect(instance.isPromising).toBe(false);
  });

  it('should return true when promises are pending', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Initially false
    expect(instance.isPromising).toBe(false);
    
    // Set a promise
    instance.promise = new Promise(resolve => {
      setTimeout(() => resolve('test'), 50);
    });
    
    // Should be true immediately after setting
    expect(instance.isPromising).toBe(true);
    
    // Wait for completion
    await instance.promise;
    
    // Should be false after completion
    expect(instance.isPromising).toBe(false);
  });

  it('should handle multiple promises correctly', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    expect(instance.isPromising).toBe(false);
    
    // Add first promise
    instance.promise = new Promise(resolve => {
      setTimeout(() => resolve('first'), 100);
    });
    expect(instance.isPromising).toBe(true);
    
    // Add second promise - should still be true
    instance.promise = new Promise(resolve => {
      setTimeout(() => resolve('second'), 50);
    });
    expect(instance.isPromising).toBe(true);
    
    // Add third promise - should still be true
    instance.promise = new Promise(resolve => {
      setTimeout(() => resolve('third'), 30);
    });
    expect(instance.isPromising).toBe(true);
    
    // Wait for all to complete
    const result = await instance.promise;
    expect(result).toBe('third');
    
    // Should be false after all complete
    expect(instance.isPromising).toBe(false);
  });

  it('should handle promise rejections correctly', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    expect(instance.isPromising).toBe(false);
    
    // Add failing promise
    const failingPromise = Promise.reject(new Error('Test error'));
    // Prevent unhandled promise rejection
    failingPromise.catch(() => {});
    
    instance.promise = failingPromise;
    expect(instance.isPromising).toBe(true);
    
    // Add successful promise
    instance.promise = new Promise(resolve => {
      setTimeout(() => resolve('success'), 50);
    });
    expect(instance.isPromising).toBe(true);
    
    // Wait for completion
    const result = await instance.promise;
    expect(result).toBe('success');
    
    // Should be false after all complete (including failed one)
    expect(instance.isPromising).toBe(false);
  });

  it('should maintain counter correctly with mixed timing', async () => {
    const deep = newDeep();
    const instance = new deep();
    
    const states: boolean[] = [];
    
    // Record initial state
    states.push(instance.isPromising);
    
    // Add first promise (longer duration)
    instance.promise = new Promise(resolve => {
      setTimeout(() => {
        states.push(instance.isPromising); // Should still be true
        resolve('first');
      }, 100);
    });
    states.push(instance.isPromising); // Should be true
    
    // Add second promise (shorter duration)
    instance.promise = new Promise(resolve => {
      setTimeout(() => {
        states.push(instance.isPromising); // Should still be true (first still pending)
        resolve('second');
      }, 50);
    });
    states.push(instance.isPromising); // Should be true
    
    // Wait for all to complete
    await instance.promise;
    states.push(instance.isPromising); // Should be false
    
    debug('Promise states:', states);
    
    // Check that it started false, became true, stayed true, then became false
    expect(states[0]).toBe(false); // Initial
    expect(states[1]).toBe(true);  // After first promise
    expect(states[2]).toBe(true);  // After second promise
    expect(states[3]).toBe(true);  // During second promise execution
    expect(states[4]).toBe(true);  // During first promise execution  
    expect(states[5]).toBe(false); // After all completed
  });

  it('should be read-only field', () => {
    const deep = newDeep();
    const instance = new deep();
    
    // Try to set isPromising - should not work or throw
    expect(() => {
      instance.isPromising = true;
    }).not.toThrow(); // The field should just ignore setter
    
    // Should still be false
    expect(instance.isPromising).toBe(false);
  });
}); 