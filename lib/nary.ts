import Debug from './debug';

const debug = Debug('nary');

/**
 * N-ary set operations for Deep framework
 * 
 * N-ary operations architecture:
 * - .from: reference to environment - the set from which elements are taken
 *   * For And/Or operations: ignored (intersection/union doesn't depend on environment)
 *   * For Not operation: critical - this is the set from which elements are excluded
 * 
 * - .value: reference to deep.Set containing symbols of other deep.Set instances for operations
 *   * Contains _symbol's of sets participating in the operation
 *   * When .value changes (adding/removing sets) the result is recalculated
 *   * Each element in .value._data must be a _symbol of a deep.Set instance
 * 
 * - .to: reference to deep.Set with the result of n-ary operation
 *   * Automatically updated when .value changes or when content of sets in .value changes
 *   * Contains _symbol's of elements satisfying the operation condition
 * 
 * Tracking architecture:
 * - Subscription to .value changes (dataAdd/dataDelete) - adding/removing sets from operation
 * - Subscription to content changes of each set in .value (dataAdd/dataDelete of elements)
 * - All subscriptions are stored in state.offs and automatically cleaned up in destructor
 * 
 * Uses functions from set.ts:
 * - _intersectionShouldContain(element, sets): checks if element belongs to intersection
 * - _unionShouldContain(element, sets): checks if element belongs to union  
 * - _differenceShouldContain(element, fromSet, excludeSets): checks if element belongs to difference
 * - _applyElementChange(resultSet, element, shouldContain, event, deep): applies change to result
 */

import { _intersectionShouldContain, _unionShouldContain, _differenceShouldContain, _applyElementChange } from './set';

export function newNary(deep: any) {
  // Create the base Nary type
  deep._context.Nary = new deep();

  // Create And operation as instance of Nary
  const And = deep._context.And = new deep.Nary();

  /**
   * And._context._constructor - constructor for And operation (n-ary intersection)
   * 
   * @param instance - And operation instance (created automatically)
   * @param args - constructor arguments:
   *   args[0] (fromEnv): deep.Set - environment (not used for And, can be undefined)
   *   args[1] (valueSetOfSets): deep.Set - set containing _symbol's of other deep.Set instances for intersection
   * 
   * Creates:
   * - and.from = fromEnv (if provided)
   * - and.value = valueSetOfSets (set of sets for operation)
   * - and.to = new deep.Set with intersection result
   * 
   * Sets up tracking:
   * - On and.value changes (adding/removing sets)
   * - On content changes of each set in and.value
   */
  And._context._constructor = function(instance: any, args: any[] = []) {
    debug('🔨 Creating And instance with args:', args.length);

    // args[0] - fromEnv: deep.Set | undefined - environment (not used for And)
    const fromEnv = args[0];
    // args[1] - valueSetOfSets: deep.Set - set containing _symbol's of deep.Set instances for intersection
    const valueSetOfSets = args[1];

    // Validate fromEnv parameter (optional for And operation)
    if (fromEnv !== undefined) {
      debug('📍 Validating fromEnv:', fromEnv);
      if (!(fromEnv instanceof deep.Deep)) {
        throw new Error('fromEnv must be a Deep instance');
      }
    }

    // Validate valueSetOfSets parameter (required)
    debug('📍 Validating valueSetOfSets:', typeof valueSetOfSets);
    if (!valueSetOfSets) {
      throw new Error('valueSetOfSets is required');
    }
    if (!(valueSetOfSets instanceof deep.Deep)) {
      throw new Error('valueSetOfSets must be a Deep instance');
    }
    if (!valueSetOfSets.type || !valueSetOfSets.type.is(deep.Set)) {
      throw new Error('valueSetOfSets must be a deep.Set');
    }
    debug('✅ valueSetOfSets validation passed');

    // Validate that each element in valueSetOfSets._data is a _symbol of deep.Set
    for (const setElement of valueSetOfSets._data) {
      const setInstance = deep.detect(setElement);
      if (!setInstance.type || !setInstance.type.is(deep.Set)) {
        throw new Error('All elements in valueSetOfSets must be deep.Set instances');
      }
    }

    // Create new And instance with proper type
    const and = new deep();
    and.type = deep.And;
    debug('✅ Set and.type to And');

    // Set from link if provided (optional for And)
    if (fromEnv !== undefined) {
      and.from = fromEnv;
      debug('✅ Set and.from to:', fromEnv._id);
    }

    // Set value link to the set of sets for operation
    and.value = valueSetOfSets;
    debug('✅ Set and.value to:', valueSetOfSets._id);

    // Create result set and link it via .to
    const resultSet = new deep.Set(new Set());
    and.to = resultSet;
    debug('✅ Set and.to to:', resultSet._id);

    // Primary calculation - compute intersection of all sets in valueSetOfSets
    // sourceSets: Array<symbol> - array of _symbol's of sets from valueSetOfSets._data
    const sourceSets = Array.from(valueSetOfSets._data) as any[];
    debug('🔧 sourceSets count:', sourceSets.length);
    
    // originalDeepInstances: Array<deep.Set> - array of Deep instances of sets for tracking
    // Store references to Deep instances for consistent change tracking
    const originalDeepInstances: any[] = [];
    for (const setSymbol of sourceSets) {
      // deep.detect(setSymbol) returns existing Deep instance for given symbol
      const deepInstance = deep.detect(setSymbol);
      originalDeepInstances.push(deepInstance);
    }
    
    // Calculate intersection using the symbols (native Sets)
    if (sourceSets.length === 0) {
      // Empty intersection - no sets to intersect
      resultSet._data = new Set();
    } else {
      // Get all unique elements from all source sets
      const allElements = new Set();
      for (const setSymbol of sourceSets) {
        // setSymbol is a native Set, iterate over its elements
        for (const element of setSymbol) {
          allElements.add(element);
        }
      }
      
      // Filter elements that exist in ALL sets (intersection logic)
      const intersection = new Set();
      for (const element of allElements) {
        // _intersectionShouldContain checks that element exists in all sets
        if (_intersectionShouldContain(element, originalDeepInstances)) {
          intersection.add(element);
        }
      }
      
      // Set calculated intersection as result
      resultSet._data = intersection;
    }
    
    debug('📊 Initial intersection calculated, result size:', resultSet._data.size);

    // Set up tracking state for event subscriptions
    const state = and._getState(and._id);
    state.offs = []; // Array to store all event disposers for cleanup
    debug('🔧 Set up tracking state');

    /**
     * Track changes to valueSetOfSets (adding/removing sets from operation)
     * 
     * valueAddTracker - handler for adding sets to operation
     * Triggers when: valueSetOfSets.add(newSet)
     * addedSets: Array<deep.Set> - added sets
     */
    const valueAddTracker = valueSetOfSets.on(deep.events.dataAdd, (...addedSets: any[]) => {
      debug('🔄 Set added to valueSetOfSets:', addedSets.length);
      
      // Update originalDeepInstances to include new sets for tracking
      for (const addedSet of addedSets) {
        // addedSet._symbol is the _symbol of the added set
        const deepInstance = deep.detect(addedSet._symbol);
        originalDeepInstances.push(deepInstance);
      }
      
      // Recalculate intersection with new sets included
      // Collect all elements from all sets (including new ones)
      const allElements = new Set();
      for (const setSymbol of Array.from(valueSetOfSets._data) as any[]) {
        for (const element of setSymbol) {
          allElements.add(element);
        }
      }
      
      // Check each element for membership in new intersection
      for (const element of allElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _intersectionShouldContain(elementInstance._symbol, originalDeepInstances);
        _applyElementChange(resultSet, elementInstance, shouldContain, deep.events.dataAdd, deep);
      }
      
      // Re-setup tracking for all source sets (including new ones)
      setupSourceSetTracking();
    });
    valueAddTracker._isValueTracker = true; // Mark as value tracker for cleanup
    state.offs.push(valueAddTracker);

    /**
     * valueRemoveTracker - handler for removing sets from operation
     * Triggers when: valueSetOfSets.delete(existingSet)
     * removedSets: Array<deep.Set> - removed sets
     */
    const valueRemoveTracker = valueSetOfSets.on(deep.events.dataDelete, (...removedSets: any[]) => {
      debug('🔄 Set removed from valueSetOfSets:', removedSets.length);
      
      // Update originalDeepInstances to remove deleted sets from tracking
      for (const removedSet of removedSets) {
        const removedSymbol = removedSet._symbol;
        const index = originalDeepInstances.findIndex(inst => inst._symbol === removedSymbol);
        if (index !== -1) {
          originalDeepInstances.splice(index, 1);
        }
      }
      
      // Recalculate intersection with sets removed
      // Collect all elements from remaining sets
      const allElements = new Set();
      for (const setSymbol of Array.from(valueSetOfSets._data) as any[]) {
        for (const element of setSymbol) {
          allElements.add(element);
        }
      }
      
      // Check each element for membership in new intersection
      for (const element of allElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _intersectionShouldContain(elementInstance._symbol, originalDeepInstances);
        _applyElementChange(resultSet, elementInstance, shouldContain, deep.events.dataDelete, deep);
      }
      
      // Re-setup tracking for remaining source sets
      setupSourceSetTracking();
    });
    state.offs.push(valueRemoveTracker);

    /**
     * setupSourceSetTracking - setup tracking for changes in source sets
     * 
     * Sets up handlers on each set in originalDeepInstances:
     * - dataAdd: when an element is added to a set
     * - dataDelete: when an element is removed from a set
     * 
     * On each change, recalculates whether the changed element should be in result
     */
    function setupSourceSetTracking() {
      debug('🔧 Setting up source set tracking');
      
      // Clear existing source set trackers to avoid duplicates
      const currentOffs = state.offs || [];
      const sourceTrackers = currentOffs.filter((off: any) => off._isSourceTracker);
      sourceTrackers.forEach((off: any) => off()); // Dispose old trackers
      state.offs = currentOffs.filter((off: any) => !off._isSourceTracker); // Keep only non-source trackers

      // Set up new source set trackers using originalDeepInstances
      debug('🔧 Tracking', originalDeepInstances.length, 'source sets');
      
      for (const sourceSet of originalDeepInstances) {
        debug('🔧 Setting up tracker for sourceSet:', sourceSet._id);
        
        /**
         * addTracker - handler for adding elements to source set
         * Triggers when: sourceSet.add(element)
         * changedElements: Array<deep> - added elements
         */
        const addTracker = sourceSet.on(deep.events.dataAdd, (...changedElements: any[]) => {
          debug('🔄 Element added to source set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all source sets at the time of event processing
            const currentSourceSets = originalDeepInstances;
            // Check if element should be in intersection result
            const shouldContain = _intersectionShouldContain(changedElement._symbol, currentSourceSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataAdd, deep);
          }
        });
        addTracker._isSourceTracker = true; // Mark for cleanup
        state.offs.push(addTracker);

        /**
         * deleteTracker - handler for removing elements from source set
         * Triggers when: sourceSet.delete(element)
         * changedElements: Array<deep> - removed elements
         */
        const deleteTracker = sourceSet.on(deep.events.dataDelete, (...changedElements: any[]) => {
          debug('🔄 Element deleted from source set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all source sets at the time of event processing
            const currentSourceSets = originalDeepInstances;
            // Check if element should still be in intersection result
            const shouldContain = _intersectionShouldContain(changedElement._symbol, currentSourceSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataDelete, deep);
          }
        });
        deleteTracker._isSourceTracker = true; // Mark for cleanup
        state.offs.push(deleteTracker);
      }
    }

    // Set up global destruction tracking
    const globalDestroyTracker = deep.on(deep.events.globalDestroyed, (payload: any) => {
      const destroyedId = payload._source;
      debug('🔄 Element destroyed globally in And operation:', destroyedId);
      
      // Check if destroyed element is in our result
      if (resultSet._data.has(destroyedId)) {
        debug('📝 Destroyed element was in And result, removing:', destroyedId);
        
        // Remove the destroyed element from result
        resultSet._data.delete(destroyedId);
        const destroyedElement = deep.detect(destroyedId);
        resultSet.emit(deep.events.dataDelete, destroyedElement);
        resultSet.emit(deep.events.dataChanged);
      }
    });
    state.offs.push(globalDestroyTracker);

    // Initial setup of source set tracking
    setupSourceSetTracking();

    debug('✅ And instance created successfully with tracking');
    return and;
  };

  /**
   * And._context._destruction - destructor for And operation
   * 
   * Called automatically when: and.destroy()
   * Cleans up all event subscriptions to prevent memory leaks
   */
  And._context._destruction = function(this: any) {
    const and = this;
    if (!and || !and._id) {
      debug('🗑️ Destroying And instance: invalid instance');
      return;
    }
    debug('🗑️ Destroying And instance:', and._id);
    
    // Clean up all event subscriptions stored in state.offs
    const state = and._getState(and._id);
    if (state.offs) {
      debug('🗑️ Cleaning up', state.offs.length, 'event subscriptions');
      for (const off of state.offs) {
        if (typeof off === 'function') {
          off(); // Call disposer function
        }
      }
      state.offs = []; // Clear the array
    }
  };

  // Create Or operation as instance of Nary
  const Or = deep._context.Or = new deep.Nary();

  /**
   * Or._context._constructor - constructor for Or operation (n-ary union)
   * 
   * @param instance - Or operation instance (created automatically)
   * @param args - constructor arguments:
   *   args[0] (fromEnv): deep.Set - environment (not used for Or, can be undefined)
   *   args[1] (valueSetOfSets): deep.Set - set containing _symbol's of other deep.Set instances for union
   * 
   * Creates:
   * - or.from = fromEnv (if provided)
   * - or.value = valueSetOfSets (set of sets for operation)
   * - or.to = new deep.Set with union result
   * 
   * Sets up tracking:
   * - On or.value changes (adding/removing sets)
   * - On content changes of each set in or.value
   */
  Or._context._constructor = function(instance: any, args: any[] = []) {
    debug('🔨 Creating Or instance with args:', args?.length);

    // args[0] - fromEnv: deep.Set | undefined - environment (not used for Or)
    const fromEnv = args[0];
    // args[1] - valueSetOfSets: deep.Set - set containing _symbol's of deep.Set instances for union
    const valueSetOfSets = args[1];

    // Validate fromEnv parameter (optional for Or operation)
    if (fromEnv !== undefined) {
      debug('📍 Validating fromEnv:', typeof fromEnv);
      if (!(fromEnv instanceof deep.Deep)) {
        throw new Error('fromEnv must be a Deep instance');
      }
    }

    // Validate valueSetOfSets parameter (required)
    debug('📍 Validating valueSetOfSets:', typeof valueSetOfSets);
    if (!valueSetOfSets) {
      throw new Error('valueSetOfSets is required');
    }
    if (!(valueSetOfSets instanceof deep.Deep)) {
      throw new Error('valueSetOfSets must be a Deep instance');
    }
    if (!valueSetOfSets.type || !valueSetOfSets.type.is(deep.Set)) {
      throw new Error('valueSetOfSets must be a deep.Set');
    }
    debug('✅ valueSetOfSets validation passed');

    // Validate that each element in valueSetOfSets._data is a _symbol of deep.Set
    for (const setElement of valueSetOfSets._data) {
      const setInstance = deep.detect(setElement);
      if (!setInstance.type || !setInstance.type.is(deep.Set)) {
        throw new Error('All elements in valueSetOfSets must be deep.Set instances');
      }
    }

    // Create new Or instance with proper type
    const or = new deep();
    or.type = deep.Or;
    debug('✅ Set or.type to Or');

    // Set from link if provided (optional for Or)
    if (fromEnv !== undefined) {
      or.from = fromEnv;
      debug('✅ Set or.from to:', fromEnv._id);
    }

    // Set value link to the set of sets for operation
    or.value = valueSetOfSets;
    debug('✅ Set or.value to:', valueSetOfSets._id);

    // Create result set and link it via .to
    const resultSet = new deep.Set(new Set());
    or.to = resultSet;
    debug('✅ Set or.to to:', resultSet._id);

    // Primary calculation - compute union of all sets in valueSetOfSets
    // sourceSets: Array<symbol> - array of _symbol's of sets from valueSetOfSets._data
    const sourceSets = Array.from(valueSetOfSets._data) as any[];
    debug('🔧 sourceSets count:', sourceSets.length);
    
    // originalDeepInstances: Array<deep.Set> - array of Deep instances of sets for tracking
    // Store references to Deep instances for consistent change tracking
    const originalDeepInstances: any[] = [];
    for (const setSymbol of sourceSets) {
      // deep.detect(setSymbol) returns existing Deep instance for given symbol
      const deepInstance = deep.detect(setSymbol);
      originalDeepInstances.push(deepInstance);
    }
    
    // Calculate union using the symbols (native Sets)
    if (sourceSets.length === 0) {
      // Empty union - no sets to unite
      resultSet._data = new Set();
    } else {
      // Get all unique elements from all source sets
      const allElements = new Set();
      for (const setSymbol of sourceSets) {
        // setSymbol is a native Set, iterate over its elements
        for (const element of setSymbol) {
          allElements.add(element);
        }
      }
      
      // Filter elements that exist in AT LEAST ONE set (union logic)
      const union = new Set();
      for (const element of allElements) {
        // _unionShouldContain checks that element exists in at least one set
        if (_unionShouldContain(element, originalDeepInstances)) {
          union.add(element);
        }
      }
      
      // Set calculated union as result
      resultSet._data = union;
    }
    
    debug('📊 Initial union calculated, result size:', resultSet._data.size);

    // Set up tracking state for event subscriptions
    const state = or._getState(or._id);
    state.offs = []; // Array to store all event disposers for cleanup
    debug('🔧 Set up tracking state');

    /**
     * Track changes to valueSetOfSets (adding/removing sets from operation)
     * 
     * valueAddTracker - handler for adding sets to operation
     * Triggers when: valueSetOfSets.add(newSet)
     * addedSets: Array<deep.Set> - added sets
     */
    const valueAddTracker = valueSetOfSets.on(deep.events.dataAdd, (...addedSets: any[]) => {
      debug('🔄 Set added to valueSetOfSets:', addedSets.length);
      
      // Update originalDeepInstances to include new sets for tracking
      for (const addedSet of addedSets) {
        // addedSet._symbol is the _symbol of the added set
        const deepInstance = deep.detect(addedSet._symbol);
        originalDeepInstances.push(deepInstance);
      }
      
      // Recalculate union with new sets included
      // Collect all elements from all sets (including new ones)
      const allElements = new Set();
      for (const setSymbol of Array.from(valueSetOfSets._data) as any[]) {
        for (const element of setSymbol) {
          allElements.add(element);
        }
      }
      
      // Check each element for membership in new union
      for (const element of allElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _unionShouldContain(elementInstance._symbol, originalDeepInstances);
        _applyElementChange(resultSet, elementInstance, shouldContain, deep.events.dataAdd, deep);
      }
      
      // Re-setup tracking for all source sets (including new ones)
      setupSourceSetTracking();
    });
    valueAddTracker._isValueTracker = true; // Mark as value tracker for cleanup
    state.offs.push(valueAddTracker);

    /**
     * valueRemoveTracker - handler for removing sets from operation
     * Triggers when: valueSetOfSets.delete(existingSet)
     * removedSets: Array<deep.Set> - removed sets
     */
    const valueRemoveTracker = valueSetOfSets.on(deep.events.dataDelete, (...removedSets: any[]) => {
      debug('🔄 Set removed from valueSetOfSets:', removedSets.length);
      
      // Update originalDeepInstances to remove deleted sets from tracking
      for (const removedSet of removedSets) {
        const removedSymbol = removedSet._symbol;
        const index = originalDeepInstances.findIndex(inst => inst._symbol === removedSymbol);
        if (index !== -1) {
          originalDeepInstances.splice(index, 1);
        }
      }
      
      // Recalculate union with sets removed
      // Get all elements currently in result to check which ones should be removed
      const currentResultElements = Array.from(resultSet._data);
      
      // Collect all elements from remaining sets
      const allRemainingElements = new Set();
      for (const setSymbol of Array.from(valueSetOfSets._data) as any[]) {
        for (const element of setSymbol) {
          allRemainingElements.add(element);
        }
      }
      
      // Check each element currently in result
      for (const element of currentResultElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _unionShouldContain(elementInstance._symbol, originalDeepInstances);
        
        if (!shouldContain) {
          // Element should be removed from result
          _applyElementChange(resultSet, elementInstance, false, deep.events.dataDelete, deep);
        }
      }
      
      // Re-setup tracking for remaining source sets
      setupSourceSetTracking();
    });
    state.offs.push(valueRemoveTracker);

    /**
     * setupSourceSetTracking - setup tracking for changes in source sets
     * 
     * Sets up handlers on each set in originalDeepInstances:
     * - dataAdd: when an element is added to a set
     * - dataDelete: when an element is removed from a set
     * 
     * On each change, recalculates whether the changed element should be in result
     */
    function setupSourceSetTracking() {
      debug('🔧 Setting up source set tracking');
      
      // Clear existing source set trackers to avoid duplicates
      const currentOffs = state.offs || [];
      const sourceTrackers = currentOffs.filter((off: any) => off._isSourceTracker);
      sourceTrackers.forEach((off: any) => off()); // Dispose old trackers
      state.offs = currentOffs.filter((off: any) => !off._isSourceTracker); // Keep only non-source trackers

      // Set up new source set trackers using originalDeepInstances
      debug('🔧 Tracking', originalDeepInstances.length, 'source sets');
      
      for (const sourceSet of originalDeepInstances) {
        debug('🔧 Setting up tracker for sourceSet:', sourceSet._id);
        
        /**
         * addTracker - handler for adding elements to source set
         * Triggers when: sourceSet.add(element)
         * changedElements: Array<deep> - added elements
         */
        const addTracker = sourceSet.on(deep.events.dataAdd, (...changedElements: any[]) => {
          debug('🔄 Element added to source set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all source sets at the time of event processing
            const currentSourceSets = originalDeepInstances;
            // Check if element should be in union result
            const shouldContain = _unionShouldContain(changedElement._symbol, currentSourceSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataAdd, deep);
          }
        });
        addTracker._isSourceTracker = true; // Mark for cleanup
        state.offs.push(addTracker);

        /**
         * deleteTracker - handler for removing elements from source set
         * Triggers when: sourceSet.delete(element)
         * changedElements: Array<deep> - removed elements
         */
        const deleteTracker = sourceSet.on(deep.events.dataDelete, (...changedElements: any[]) => {
          debug('🔄 Element deleted from source set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all source sets at the time of event processing
            const currentSourceSets = originalDeepInstances;
            // Check if element should still be in union result
            const shouldContain = _unionShouldContain(changedElement._symbol, currentSourceSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataDelete, deep);
          }
        });
        deleteTracker._isSourceTracker = true; // Mark for cleanup
        state.offs.push(deleteTracker);
      }
    }

    // Set up global destruction tracking
    const globalDestroyTracker = deep.on(deep.events.globalDestroyed, (payload: any) => {
      const destroyedId = payload._source;
      debug('🔄 Element destroyed globally in Or operation:', destroyedId);
      
      // Check if destroyed element is in our result
      if (resultSet._data.has(destroyedId)) {
        debug('📝 Destroyed element was in Or result, removing:', destroyedId);
        
        // Remove the destroyed element from result
        resultSet._data.delete(destroyedId);
        const destroyedElement = deep.detect(destroyedId);
        resultSet.emit(deep.events.dataDelete, destroyedElement);
        resultSet.emit(deep.events.dataChanged);
      }
    });
    state.offs.push(globalDestroyTracker);

    // Initial setup of source set tracking
    setupSourceSetTracking();

    debug('✅ Or instance created successfully with tracking');
    return or;
  };

  /**
   * Or._context._destruction - destructor for Or operation
   * 
   * Called automatically when: or.destroy()
   * Cleans up all event subscriptions to prevent memory leaks
   */
  Or._context._destruction = function(this: any) {
    const or = this;
    if (!or || !or._id) {
      debug('🗑️ Destroying Or instance: invalid instance');
      return;
    }
    debug('🗑️ Destroying Or instance:', or._id);
    
    // Clean up all event subscriptions stored in state.offs
    const state = or._getState(or._id);
    if (state.offs) {
      debug('🗑️ Cleaning up', state.offs.length, 'event subscriptions');
      for (const off of state.offs) {
        if (typeof off === 'function') {
          off(); // Call disposer function
        }
      }
      state.offs = []; // Clear the array
    }
  };

  // Create Not operation as instance of Nary
  const Not = deep._context.Not = new deep.Nary();

  /**
   * Not._context._constructor - constructor for Not operation (n-ary difference)
   * 
   * @param instance - Not operation instance (created automatically)
   * @param args - constructor arguments:
   *   args[0] (fromEnv): deep.Set - environment set (source of elements) - REQUIRED for Not
   *   args[1] (valueSetOfSets): deep.Set - set containing _symbol's of other deep.Set instances to exclude
   * 
   * Creates:
   * - not.from = fromEnv (environment set - source of elements)
   * - not.value = valueSetOfSets (set of sets to exclude)
   * - not.to = new deep.Set with difference result (fromEnv \ union(valueSetOfSets))
   * 
   * Sets up tracking:
   * - On not.from changes (adding/removing elements from environment)
   * - On not.value changes (adding/removing sets to exclude)
   * - On content changes of each set in not.value
   */
  Not._context._constructor = function(instance: any, args: any[] = []) {
    debug('🔨 Creating Not instance with args:', args);

    // args[0] - fromEnv: deep.Set - environment set (REQUIRED for Not operation)
    const fromEnv = args[0];
    // args[1] - valueSetOfSets: deep.Set - set containing _symbol's of deep.Set instances to exclude
    const valueSetOfSets = args[1];

    // Validate fromEnv parameter (required for Not operation)
    debug('📍 Validating fromEnv:', fromEnv);
    if (!fromEnv) {
      throw new Error('fromEnv is required for Not operation');
    }
    if (!(fromEnv instanceof deep.Deep)) {
      throw new Error('fromEnv must be a Deep instance');
    }
    if (!fromEnv.type || !fromEnv.type.is(deep.Set)) {
      throw new Error('fromEnv must be a deep.Set');
    }
    debug('✅ fromEnv validation passed');

    // Validate valueSetOfSets parameter (required)
    debug('📍 Validating valueSetOfSets:', valueSetOfSets);
    if (!valueSetOfSets) {
      throw new Error('valueSetOfSets is required');
    }
    if (!(valueSetOfSets instanceof deep.Deep)) {
      throw new Error('valueSetOfSets must be a Deep instance');
    }
    if (!valueSetOfSets.type || !valueSetOfSets.type.is(deep.Set)) {
      throw new Error('valueSetOfSets must be a deep.Set');
    }
    debug('✅ valueSetOfSets validation passed');

    // Validate that each element in valueSetOfSets._data is a _symbol of deep.Set
    for (const setElement of valueSetOfSets._data) {
      const setInstance = deep.detect(setElement);
      if (!setInstance.type || !setInstance.type.is(deep.Set)) {
        throw new Error('All elements in valueSetOfSets must be deep.Set instances');
      }
    }

    // Create new Not instance with proper type
    const not = new deep();
    not.type = deep.Not;
    debug('✅ Set not.type to Not');

    // Set from link (required for Not)
    not.from = fromEnv;
    debug('✅ Set not.from to:', fromEnv._id);

    // Set value link to the set of sets for exclusion
    not.value = valueSetOfSets;
    debug('✅ Set not.value to:', valueSetOfSets._id);

    // Create result set and link it via .to
    const resultSet = new deep.Set(new Set());
    not.to = resultSet;
    debug('✅ Set not.to to:', resultSet._id);

    // Primary calculation - compute difference: fromEnv \ union(valueSetOfSets)
    // excludeSets: Array<symbol> - array of _symbol's of sets from valueSetOfSets._data
    const excludeSets = Array.from(valueSetOfSets._data) as any[];
    debug('🔧 excludeSets count:', excludeSets.length);
    
    // originalExcludeInstances: Array<deep.Set> - array of Deep instances of exclude sets for tracking
    // Store references to Deep instances for consistent change tracking
    const originalExcludeInstances: any[] = [];
    for (const setSymbol of excludeSets) {
      // deep.detect(setSymbol) returns existing Deep instance for given symbol
      const deepInstance = deep.detect(setSymbol);
      originalExcludeInstances.push(deepInstance);
    }
    
    // Calculate difference using the symbols (native Sets)
    // Get all elements from fromEnv
    const fromElements = Array.from(fromEnv._data);
    
    // Filter elements that should NOT be excluded (difference logic)
    const difference = new Set();
    for (const element of fromElements) {
      // _differenceShouldContain checks that element exists in fromEnv but not in any exclude set
      if (_differenceShouldContain(element, fromEnv, originalExcludeInstances)) {
        difference.add(element);
      }
    }
    
    // Set calculated difference as result
    resultSet._data = difference;
    
    debug('📊 Initial difference calculated, result size:', resultSet._data.size);

    // Set up tracking state for event subscriptions
    const state = not._getState(not._id);
    state.offs = []; // Array to store all event disposers for cleanup
    debug('🔧 Set up tracking state');

    /**
     * Track changes to fromEnv (adding/removing elements from environment)
     * 
     * fromAddTracker - handler for adding elements to environment
     * Triggers when: fromEnv.add(newElement)
     * addedElements: Array<deep> - added elements
     */
    const fromAddTracker = fromEnv.on(deep.events.dataAdd, (...addedElements: any[]) => {
      debug('🔄 Element added to fromEnv:', addedElements.length);
      
      // Check each added element for membership in result
      for (const addedElement of addedElements) {
        const shouldContain = _differenceShouldContain(addedElement._symbol, fromEnv, originalExcludeInstances);
        _applyElementChange(resultSet, addedElement, shouldContain, deep.events.dataAdd, deep);
      }
    });
    fromAddTracker._isFromTracker = true; // Mark as from tracker for cleanup
    state.offs.push(fromAddTracker);

    /**
     * fromDeleteTracker - handler for removing elements from environment
     * Triggers when: fromEnv.delete(existingElement)
     * removedElements: Array<deep> - removed elements
     */
    const fromDeleteTracker = fromEnv.on(deep.events.dataDelete, (...removedElements: any[]) => {
      debug('🔄 Element removed from fromEnv:', removedElements.length);
      
      // Elements removed from fromEnv should definitely be removed from result
      for (const removedElement of removedElements) {
        _applyElementChange(resultSet, removedElement, false, deep.events.dataDelete, deep);
      }
    });
    fromDeleteTracker._isFromTracker = true; // Mark as from tracker for cleanup
    state.offs.push(fromDeleteTracker);

    /**
     * Track changes to valueSetOfSets (adding/removing sets from exclusion)
     * 
     * valueAddTracker - handler for adding sets to exclusion
     * Triggers when: valueSetOfSets.add(newSet)
     * addedSets: Array<deep.Set> - added sets
     */
    const valueAddTracker = valueSetOfSets.on(deep.events.dataAdd, (...addedSets: any[]) => {
      debug('🔄 Set added to valueSetOfSets:', addedSets.length);
      
      // Update originalExcludeInstances to include new sets for tracking
      for (const addedSet of addedSets) {
        // addedSet._symbol is the _symbol of the added set
        const deepInstance = deep.detect(addedSet._symbol);
        originalExcludeInstances.push(deepInstance);
      }
      
      // Recalculate difference with new exclude sets
      // Check all elements currently in result - some might need to be removed
      const currentResultElements = Array.from(resultSet._data);
      
      for (const element of currentResultElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _differenceShouldContain(elementInstance._symbol, fromEnv, originalExcludeInstances);
        
        if (!shouldContain) {
          // Element should be removed from result (now excluded)
          _applyElementChange(resultSet, elementInstance, false, deep.events.dataDelete, deep);
        }
      }
      
      // Re-setup tracking for all exclude sets (including new ones)
      setupExcludeSetTracking();
    });
    valueAddTracker._isValueTracker = true; // Mark as value tracker for cleanup
    state.offs.push(valueAddTracker);

    /**
     * valueRemoveTracker - handler for removing sets from exclusion
     * Triggers when: valueSetOfSets.delete(existingSet)
     * removedSets: Array<deep.Set> - removed sets
     */
    const valueRemoveTracker = valueSetOfSets.on(deep.events.dataDelete, (...removedSets: any[]) => {
      debug('🔄 Set removed from valueSetOfSets:', removedSets.length);
      
      // Update originalExcludeInstances to remove deleted sets from tracking
      for (const removedSet of removedSets) {
        const removedSymbol = removedSet._symbol;
        const index = originalExcludeInstances.findIndex(inst => inst._symbol === removedSymbol);
        if (index !== -1) {
          originalExcludeInstances.splice(index, 1);
        }
      }
      
      // Recalculate difference with sets removed from exclusion
      // Check all elements from fromEnv - some might now be included
      const fromElements = Array.from(fromEnv._data);
      
      for (const element of fromElements) {
        const elementInstance = deep.detect(element);
        const shouldContain = _differenceShouldContain(elementInstance._symbol, fromEnv, originalExcludeInstances);
        
        // Apply change to result set (might add previously excluded elements)
        _applyElementChange(resultSet, elementInstance, shouldContain, deep.events.dataAdd, deep);
      }
      
      // Re-setup tracking for remaining exclude sets
      setupExcludeSetTracking();
    });
    state.offs.push(valueRemoveTracker);

    /**
     * setupExcludeSetTracking - setup tracking for changes in exclude sets
     * 
     * Sets up handlers on each set in originalExcludeInstances:
     * - dataAdd: when an element is added to an exclude set
     * - dataDelete: when an element is removed from an exclude set
     * 
     * On each change, recalculates whether the changed element should be in result
     */
    function setupExcludeSetTracking() {
      debug('🔧 Setting up exclude set tracking');
      
      // Clear existing exclude set trackers to avoid duplicates
      const currentOffs = state.offs || [];
      const excludeTrackers = currentOffs.filter((off: any) => off._isExcludeTracker);
      excludeTrackers.forEach((off: any) => off()); // Dispose old trackers
      state.offs = currentOffs.filter((off: any) => !off._isExcludeTracker); // Keep only non-exclude trackers

      // Set up new exclude set trackers using originalExcludeInstances
      debug('🔧 Tracking', originalExcludeInstances.length, 'exclude sets');
      
      for (const excludeSet of originalExcludeInstances) {
        debug('🔧 Setting up tracker for excludeSet:', excludeSet._id);
        
        /**
         * addTracker - handler for adding elements to exclude set
         * Triggers when: excludeSet.add(element)
         * changedElements: Array<deep> - added elements
         */
        const addTracker = excludeSet.on(deep.events.dataAdd, (...changedElements: any[]) => {
          debug('🔄 Element added to exclude set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all exclude sets at the time of event processing
            const currentExcludeSets = originalExcludeInstances;
            // Check if element should be in difference result (might be removed now)
            const shouldContain = _differenceShouldContain(changedElement._symbol, fromEnv, currentExcludeSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataDelete, deep);
          }
        });
        addTracker._isExcludeTracker = true; // Mark for cleanup
        state.offs.push(addTracker);

        /**
         * deleteTracker - handler for removing elements from exclude set
         * Triggers when: excludeSet.delete(element)
         * changedElements: Array<deep> - removed elements
         */
        const deleteTracker = excludeSet.on(deep.events.dataDelete, (...changedElements: any[]) => {
          debug('🔄 Element deleted from exclude set:', changedElements.length, 'elements:', changedElements.map(e => e._symbol));
          for (const changedElement of changedElements) {
            debug('🔄 Processing element:', changedElement._symbol);
            // Get current state of all exclude sets at the time of event processing
            const currentExcludeSets = originalExcludeInstances;
            // Check if element should now be in difference result (might be added back)
            const shouldContain = _differenceShouldContain(changedElement._symbol, fromEnv, currentExcludeSets);
            debug('🔄 Should contain in result:', shouldContain);
            // Apply change to result set
            _applyElementChange(resultSet, changedElement, shouldContain, deep.events.dataAdd, deep);
          }
        });
        deleteTracker._isExcludeTracker = true; // Mark for cleanup
        state.offs.push(deleteTracker);
      }
    }

    // Set up global destruction tracking
    const globalDestroyTracker = deep.on(deep.events.globalDestroyed, (payload: any) => {
      const destroyedId = payload._source;
      debug('🔄 Element destroyed globally in Not operation:', destroyedId);
      
      // Check if destroyed element is in our result
      if (resultSet._data.has(destroyedId)) {
        debug('📝 Destroyed element was in Not result, removing:', destroyedId);
        
        // Remove the destroyed element from result
        resultSet._data.delete(destroyedId);
        const destroyedElement = deep.detect(destroyedId);
        resultSet.emit(deep.events.dataDelete, destroyedElement);
        resultSet.emit(deep.events.dataChanged);
      }
    });
    state.offs.push(globalDestroyTracker);

    // Initial setup of exclude set tracking
    setupExcludeSetTracking();

    debug('✅ Not instance created successfully with tracking');
    return not;
  };

  /**
   * Not._context._destruction - destructor for Not operation
   * 
   * Called automatically when: not.destroy()
   * Cleans up all event subscriptions to prevent memory leaks
   */
  Not._context._destruction = function(this: any) {
    const not = this;
    if (!not || !not._id) {
      debug('🗑️ Destroying Not instance: invalid instance');
      return;
    }
    debug('🗑️ Destroying Not instance:', not._id);
    
    // Clean up all event subscriptions stored in state.offs
    const state = not._getState(not._id);
    if (state.offs) {
      debug('🗑️ Cleaning up', state.offs.length, 'event subscriptions');
      for (const off of state.offs) {
        if (typeof off === 'function') {
          off(); // Call disposer function
        }
      }
      state.offs = []; // Clear the array
    }
  };
}