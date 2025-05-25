// Provides promise chaining mechanism for Deep instances
// Allows tracking and waiting for asynchronous operations completion

/**
 * Validates that a value is a real Promise object, not a Deep instance
 * @param value The value to validate
 * @returns true if it's a real Promise
 */
function isRealPromise(value: any): boolean {
  // Check if it's null or undefined
  if (value == null) return false;
  
  // Check if it has then method
  if (typeof value.then !== 'function') return false;
  
  // CRITICAL: Ensure it's NOT a Deep instance
  if (value._id !== undefined || value._source !== undefined || value._reason !== undefined) {
    throw new Error(`CRITICAL: Attempted to set Deep instance as promise! Deep instances cannot be promises. Received Deep instance with id: ${value._id}`);
  }
  
  // Check if it's actually a Promise constructor instance
  if (value instanceof Promise) return true;
  
  // Check if it has Promise-like interface (thenable with catch and finally)
  if (typeof value.catch === 'function' && typeof value.finally === 'function') {
    return true;
  }
  
  // If it has then but not catch/finally, it might be a thenable but not a real Promise
  throw new Error(`CRITICAL: Value has 'then' method but is not a real Promise object. Type: ${typeof value}, Constructor: ${value.constructor?.name}`);
}

/**
 * Creates the promise field for Deep instances
 * @param deep The Deep factory
 * @returns The promise field
 */
export function newPromise(deep: any) {
  const PromiseField = new deep.Field(function(this: any, key: any, promiseToSet: any) {
    const ownerId = this._source;
    const state = this._getState(ownerId);

    if (this._reason == deep.reasons.getter._id) {
      // Return existing promise or create resolved promise by default
      if (!state._promise) {
        // Create a resolved promise with value true when none exists
        state._promise = Promise.resolve(true);
      }
      
      // VALIDATION: Ensure we're returning a real Promise
      if (!isRealPromise(state._promise)) {
        throw new Error(`CRITICAL: Promise field contains non-Promise value! Type: ${typeof state._promise}, Constructor: ${state._promise?.constructor?.name}`);
      }
      
      return state._promise;
    } else if (this._reason == deep.reasons.setter._id) {
      // CRITICAL VALIDATION: Ensure we're only setting real Promises
      if (promiseToSet !== undefined && promiseToSet !== null) {
        if (!isRealPromise(promiseToSet)) {
          throw new Error(`CRITICAL: Attempted to set non-Promise as promise! Only real Promise objects allowed. Received: ${typeof promiseToSet}, Constructor: ${promiseToSet?.constructor?.name}`);
        }
      }
      
      // Collect all promises and wait for all to complete
      if (!state._allPromises) {
        state._allPromises = [];
      }
      
      // Reset promise tracking flags for new promise
      state._promiseResolved = false;
      state._promiseTracked = false;
      
      let newPromise: Promise<any>;
      
      if (promiseToSet && isRealPromise(promiseToSet)) {
        // Add the new promise to the collection
        state._allPromises.push(promiseToSet);
        
        // Create a promise that waits for all promises to complete
        newPromise = Promise.all(state._allPromises).then(results => {
          // Return the result of the last promise
          return results[results.length - 1];
        });
      } else {
        // If not a promise, create resolved promise with the value
        const resolvedPromise = Promise.resolve(promiseToSet);
        state._allPromises.push(resolvedPromise);
        newPromise = Promise.all(state._allPromises).then(results => {
          return results[results.length - 1];
        });
      }
      
      // Store the combined promise
      state._promise = newPromise;
      
      // Add error handling to prevent unhandled rejections
      newPromise.catch((error) => {
        // Silent error handling to prevent unhandled rejections
      });
      
      return newPromise;
    } else if (this._reason == deep.reasons.deleter._id) {
      // Clear the promise and all promise collection - next getter will create new resolved promise
      delete state._promise;
      delete state._allPromises;
      return true;
    }
  });

  return PromiseField;
}

/**
 * Helper function to check if all promises in an association are resolved
 * @param association The association to check
 * @returns Promise that resolves when all operations are complete
 */
export async function waitForCompletion(association: any): Promise<boolean> {
  const state = association._getState(association._id);
  const currentPromise = state._promise;
  
  if (!currentPromise) {
    return true; // No promises, already complete
  }
  
  // Validate the stored promise
  if (!isRealPromise(currentPromise)) {
    throw new Error(`CRITICAL: Stored promise is not a real Promise! Type: ${typeof currentPromise}`);
  }
  
  try {
    await currentPromise;
    return true;
  } catch (error) {
    // Promise chain failed, return false
    return false;
  }
}

/**
 * Helper function to check if promises are currently pending
 * @param association The association to check
 * @returns true if operations are still pending
 */
export function isPending(association: any): boolean {
  const state = association._getState(association._id);
  const currentPromise = state._promise;
  
  if (!currentPromise) {
    return false; // No promise means no pending operations
  }
  
  // Validate the stored promise
  if (!isRealPromise(currentPromise)) {
    throw new Error(`CRITICAL: Stored promise is not a real Promise! Type: ${typeof currentPromise}`);
  }
  
  // Check if promise has completion marker
  if (state._promiseResolved === true) {
    return false; // Already resolved
  }
  
  // Attach completion tracking to the promise if not already done
  if (!state._promiseTracked) {
    state._promiseTracked = true;
    
    currentPromise
      .then(() => { 
        state._promiseResolved = true; 
      })
      .catch(() => { 
        state._promiseResolved = true; // Failed promises are also "resolved" for tracking
      });
  }
  
  // Return true if promise exists and is not marked as resolved
  return !state._promiseResolved;
}

/**
 * Helper function to get current promise status
 * @param association The association to check
 * @returns Object with promise status information
 */
export function getPromiseStatus(association: any): {
  hasPromise: boolean;
  isPending: boolean;
  promise: Promise<any> | null;
} {
  const state = association._getState(association._id);
  const currentPromise = state._promise;
  
  if (currentPromise && !isRealPromise(currentPromise)) {
    throw new Error(`CRITICAL: Stored promise is not a real Promise! Type: ${typeof currentPromise}`);
  }
  
  return {
    hasPromise: !!currentPromise,
    isPending: isPending(association),
    promise: currentPromise || null
  };
} 