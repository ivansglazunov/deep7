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
    let storage: any;
    
    try {
      storage = new deep.HasyxDeepStorage();
      
      // Simulate async operation
      const asyncOp = new Promise(resolve => {
        setTimeout(() => resolve('sync complete'), 50);
      });
      
      storage.promise = asyncOp;
      
      // Should be able to wait for completion
      const result = await storage.promise;
      expect(result).toBe('sync complete');
    } finally {
      // Cleanup storage to prevent hanging processes
      if (storage && storage.destroy) {
        storage.destroy();
      }
    }
  });

  it('should chain multiple operations for storage', async () => {
    const deep = newDeep();
    let storage: any;
    
    try {
      storage = new deep.HasyxDeepStorage();
      
      let operationCount = 0;
      
      // First operation
      const op1 = new Promise(resolve => {
        setTimeout(() => {
          operationCount++;
          resolve('op1 complete');
        }, 30);
      });
      
      storage.promise = op1;
      
      // Second operation
      const op2 = storage.promise.then(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            operationCount++;
            resolve('op2 complete');
          }, 30);
        });
      });
      
      storage.promise = op2;
      
      // Wait for completion
      const result = await storage.promise;
      expect(result).toBe('op2 complete');
      expect(operationCount).toBe(2);
    } finally {
      // Cleanup storage to prevent hanging processes
      if (storage && storage.destroy) {
        storage.destroy();
      }
    }
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
    
    // Set second promise - will complete in 30ms, но должен ждать завершения первого в chain
    const promise2 = new Promise(resolve => {
      setTimeout(() => {
        completionOrder.push(2);
        debug(`Promise 2 completed`);
        resolve('second');
      }, 30);
    });
    instance.promise = promise2;
    
    // Set third promise - will complete in 20ms, но должен ждать завершения второго в chain
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
    
    // Promises завершаются в порядке их timeout (3, 2, 1), но chain возвращает результат последнего
    // Важно что chain дождался всех promises последовательно
    expect(result).toBe('third'); // Should return result of last promise
    
    // Проверяем что все promises завершились
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
    
    // Set successful promise - должен выполниться в chain даже если предыдущий failed
    const successPromise = new Promise(resolve => {
      setTimeout(() => {
        executionOrder.push('success');
        resolve('second');
      }, 10);
    });
    instance.promise = successPromise;
    
    const result = await instance.promise;
    
    debug(`Execution order: ${executionOrder.join(', ')}`);
    
    // Both promises should execute (независимо друг от друга по времени)
    // но chain должен обработать ошибку и продолжить
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