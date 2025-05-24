// Provides promise chaining mechanism for Deep instances
// Allows tracking and waiting for asynchronous operations completion

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
      // Return existing promise or create resolved promise
      if (state._promise) {
        return state._promise;
      } else {
        // Create immediately resolved promise if none exists
        state._promise = Promise.resolve(true);
        return state._promise;
      }
    } else if (this._reason == deep.reasons.setter._id) {
      // Chain new promise after previous one
      const previousPromise = state._promise || Promise.resolve();
      
      let newPromise: Promise<any>;
      
      if (promiseToSet && typeof promiseToSet.then === 'function') {
        // Chain the new promise after the previous one
        newPromise = previousPromise.then(() => {
          return promiseToSet;
        });
      } else {
        // If not a promise, create resolved promise with the value
        newPromise = previousPromise.then(() => promiseToSet);
      }
      
      // Store the chained promise
      state._promise = newPromise;
      
      // Add error handling to prevent unhandled rejections
      newPromise.catch((error) => {
        // Silent error handling to prevent unhandled rejections
      });
      
      return newPromise;
    } else if (this._reason == deep.reasons.deleter._id) {
      // Reset to resolved promise
      state._promise = Promise.resolve(true);
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
  
  // Promise is synchronously resolved if it was created as Promise.resolve()
  // For async promises, we can't determine synchronously, so assume pending
  try {
    // Check if it's a resolved promise by testing its state
    let isResolved = false;
    let isPending = true;
    
    currentPromise
      .then(() => { 
        isResolved = true; 
        isPending = false;
      })
      .catch(() => { 
        isResolved = true; 
        isPending = false;
      });
    
    // For synchronously resolved promises, isPending will be false immediately
    return isPending;
  } catch (error) {
    return false; // If there's an error checking, assume not pending
  }
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
  
  return {
    hasPromise: !!currentPromise,
    isPending: isPending(association),
    promise: currentPromise || null
  };
} 