// Provides promise chaining mechanism for Deep instances
// Allows tracking and waiting for asynchronous operations completion

import Debug from './debug';
const debug = Debug('promise');

/**
 * Validates that a value is a real Promise object, not a Deep instance
 * @param value The value to validate
 * @returns true if it's a real Promise
 */
export function isRealPromise(value: any): boolean {
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
  const PromiseField = new deep.Field(function (this: any, key: any, promiseToSet: any) {
    const ownerId = this._source;
    const owner = new deep(ownerId);
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
      if (!isRealPromise(promiseToSet)) {
        throw new Error(`CRITICAL: Promise field requires a real Promise! Got: ${typeof promiseToSet}, Constructor: ${promiseToSet?.constructor?.name}`);
      }

      state._pendingPromises = state._pendingPromises || 0;
      state._pendingPromises++;

      const currentPromise = state._promise || Promise.resolve(true);
      
      state._promise = currentPromise.then(async () => {
        try {
          const result = await (promiseToSet.finally((result) => {
            state._pendingPromises = Math.max(0, state._pendingPromises - 1);
            return result;
          }));
          return result;
        } catch (error: any) {
          state._pendingPromises = Math.max(0, state._pendingPromises - 1);
          throw error;
        }
      });

      return promiseToSet;
    } else if (this._reason == deep.reasons.deleter._id) {
      // Clear the promise - next getter will create new resolved promise
      delete state._promise;
      return true;
    }
  });

  deep._contain.promise = PromiseField;
  deep._contain.then = PromiseField;
}

/**
 * Creates the isPromising field for Deep instances
 * @param deep The Deep factory
 * @returns The isPromising field
 */
export function newIsPromising(deep: any) {
  const IsPromisingField = new deep.Field(function (this: any, key: any, value: any) {
    const ownerId = this._source;
    const state = this._getState(ownerId);

    if (this._reason == deep.reasons.getter._id) {
      // Return true if there are pending promises, false otherwise
      const pendingCount = state._pendingPromises || 0;
      const isPromising = pendingCount > 0;
      return isPromising;
    } else if (this._reason == deep.reasons.setter._id) {
      // isPromising is read-only field - ignore setter but return true to avoid proxy error
      return true;
    } else if (this._reason == deep.reasons.deleter._id) {
      // isPromising is read-only field - ignore deleter but return true to avoid proxy error
      return true;
    }
    
    return false;
  });

  return IsPromisingField;
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

 