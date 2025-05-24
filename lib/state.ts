// High-level state access for Deep Framework
// Provides clean interface to instance state without low-level _getState usage

/**
 * Creates the state field for high-level state access
 * @param deep The Deep factory instance
 */
export function newState(deep: any) {
  const StateField = new deep.Field(function(this: any, key: any, value: any) {
    const ownerId = this._source;
    
    if (this._reason == deep.reasons.getter._id) {
      // Return the state object for this instance
      return deep._getState(ownerId);
    } else if (this._reason == deep.reasons.setter._id) {
      // Setting state is not allowed - state should be modified directly
      throw new Error('Cannot set entire state object. Modify state properties directly via instance.state.property = value');
    } else if (this._reason == deep.reasons.deleter._id) {
      // Clear the entire state
      const state = deep._getState(ownerId);
      for (const prop in state) {
        delete state[prop];
      }
      return true;
    }
  });
  
  return StateField;
} 