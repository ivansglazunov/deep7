// Query system for Deep framework - provides declarative search capabilities over associative data
import Debug from './debug';

const debug = Debug('query');

// Field inversion mapping for query operations
// Maps each relation field to its inverse for query resolution
export const _invertFields = { 
  'type': 'typed', 'from': 'out', 'to': 'in', 'value': 'valued', 
  'typed': 'type', 'out': 'from', 'in': 'to', 'valued': 'value' 
} as const;

// Single relation fields that store one target reference
export const _oneRelationFields = { 
  'type': true, 'from': true, 'to': true, 'value': true 
} as const;

// Multiple relation fields that can reference many targets
export const _manyRelationFields = { 
  'typed': true, 'out': true, 'in': true, 'valued': true 
} as const;

// All supported relation fields for validation
export const _allRelationFields = {
  ...(_oneRelationFields as any),
  ...(_manyRelationFields as any)
} as const;

// Helper function to determine if field is valid relation field
export const _isValidRelationField = (field: string): boolean => {
  return _allRelationFields.hasOwnProperty(field);
};

/**
 * Create manyRelation method for Deep instances
 * Returns a reactive Set containing all values for the specified relation field
 */
export function newManyRelation(deep: any) {
  const ManyRelation = new deep.Method(function(this: any, fieldName: string) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    
    debug('🔍 manyRelation called:', { sourceId, fieldName });
    
    // Validate field name
    if (typeof fieldName !== 'string') {
      throw new Error('fieldName must be a string');
    }
    
    if (!_isValidRelationField(fieldName)) {
      debug('⚠️ Invalid field name:', fieldName, 'returning empty set');
      // Return empty trackable set for invalid fields
      return new deep.Set(new Set());
    }
    
    // Get current values for the field
    let currentValues: Set<string>;
    
    if (_oneRelationFields.hasOwnProperty(fieldName)) {
      // Single relation field (type, from, to, value)
      const singleValue = source[`_${fieldName}`]; // _type, _from, _to, _value
      currentValues = singleValue ? new Set([singleValue]) : new Set();
      debug('📝 Single relation field:', fieldName, ':', singleValue);
    } else if (_manyRelationFields.hasOwnProperty(fieldName)) {
      // Multiple relation field (typed, out, in, valued)
      currentValues = new Set(source[`_${fieldName}`]); // _typed, _out, _in, _valued (copy the Set)
      debug('📝 Multiple relation field:', fieldName, ':', Array.from(currentValues));
    } else {
      // Should not reach here due to validation above, but safety fallback
      currentValues = new Set();
    }
    
    // Create result Set with current values
    const resultSet = new deep.Set(currentValues);
    debug('✅ Created result set with size:', resultSet.size);
    
    // Set up reactive tracking
    setupManyRelationTracking(deep, source, fieldName, resultSet);
    
    return resultSet;
  });
  
  return ManyRelation;
}

/**
 * Set up reactive tracking for manyRelation results
 * Uses precise event subscriptions instead of global listeners
 */
function setupManyRelationTracking(deep: any, source: any, fieldName: string, resultSet: any) {
  debug('🔧 Setting up manyRelation tracking:', { sourceId: source._id, fieldName });
  
  // Store tracking info in result set state
  resultSet._state._manyRelationSource = source;
  resultSet._state._manyRelationField = fieldName;
  resultSet._state._manyRelationDisposers = [];
  
  if (_oneRelationFields.hasOwnProperty(fieldName)) {
    // For single relation fields, track setted/deleted events on the source
    setupSingleRelationTracking(deep, source, fieldName, resultSet);
  } else if (_manyRelationFields.hasOwnProperty(fieldName)) {
    // For multiple relation fields, track added/deleted events on the source
    setupMultipleRelationTracking(deep, source, fieldName, resultSet);
  }
}

/**
 * Set up tracking for single relation fields (type, from, to, value)
 */
function setupSingleRelationTracking(deep: any, source: any, fieldName: string, resultSet: any) {
  const eventMap = {
    'type': { setted: 'typeSetted', deleted: 'typeDeleted' },
    'from': { setted: 'fromSetted', deleted: 'fromDeleted' },
    'to': { setted: 'toSetted', deleted: 'toDeleted' },
    'value': { setted: 'valueSetted', deleted: 'valueDeleted' }
  };
  
  const events = eventMap[fieldName as keyof typeof eventMap];
  if (!events) return;
  
  debug('🔧 Setting up single relation tracking for:', fieldName);
  
  // Track setted events (field changed)
  const settedDisposer = source.on(deep.events[events.setted], (payload: any) => {
    debug('🔄 Single relation setted:', { field: fieldName, before: payload._before, after: payload._after });
    
    // Clear current data and set new value
    resultSet._data.clear();
    
    if (payload._after) {
      resultSet._data.add(payload._after);
      const afterElement = deep.detect(payload._after);
      resultSet.emit(deep.events.dataAdd, afterElement);
    }
    
    if (payload._before) {
      const beforeElement = deep.detect(payload._before);
      resultSet.emit(deep.events.dataDelete, beforeElement);
    }
    
    resultSet.emit(deep.events.dataChanged);
  });
  
  // Track deleted events (field removed)
  const deletedDisposer = source.on(deep.events[events.deleted], (payload: any) => {
    debug('🔄 Single relation deleted:', { field: fieldName, before: payload._before });
    
    if (payload._before && resultSet._data.has(payload._before)) {
      resultSet._data.delete(payload._before);
      const beforeElement = deep.detect(payload._before);
      resultSet.emit(deep.events.dataDelete, beforeElement);
      resultSet.emit(deep.events.dataChanged);
    }
  });
  
  resultSet._state._manyRelationDisposers.push(settedDisposer, deletedDisposer);
}

/**
 * Set up tracking for multiple relation fields (typed, out, in, valued)
 * 
 * Now we can use precise event tracking with source information:
 * - Multiple relation events (typedAdded, outAdded, etc.) now include source info in _after field
 * - We can subscribe directly to specific events on our source instead of global events
 * - This eliminates the need for global event filtering and improves performance significantly
 */
function setupMultipleRelationTracking(deep: any, source: any, fieldName: string, resultSet: any) {
  const eventMap = {
    'typed': { added: 'typedAdded', deleted: 'typedDeleted' },
    'out': { added: 'outAdded', deleted: 'outDeleted' },
    'in': { added: 'inAdded', deleted: 'inDeleted' },
    'valued': { added: 'valuedAdded', deleted: 'valuedDeleted' }
  };
  
  const events = eventMap[fieldName as keyof typeof eventMap];
  if (!events) return;
  
  debug('🔧 Setting up multiple relation tracking for:', fieldName);
  
  // Track added events (new element added to relation)
  const addedDisposer = source.on(deep.events[events.added], (payload: any) => {
    // payload._source = our source (the target of the relation)
    // payload._after = the element that now points to our source
    const sourceElementId = payload._after;
    
    if (!sourceElementId) return;
    
    debug('🔄 Multiple relation added:', { 
      field: fieldName, 
      target: payload._source, 
      sourceElement: sourceElementId,
      resultSetId: resultSet._id
    });
    
    if (!resultSet._data.has(sourceElementId)) {
      resultSet._data.add(sourceElementId);
      const addedElement = deep.detect(sourceElementId);
      debug('📤 Emitting dataAdd event for:', sourceElementId);
      resultSet.emit(deep.events.dataAdd, addedElement);
      resultSet.emit(deep.events.dataChanged);
    } else {
      debug('⚠️ Element already in set, skipping:', sourceElementId);
    }
  });
  
  // Track deleted events (element removed from relation)
  const deletedDisposer = source.on(deep.events[events.deleted], (payload: any) => {
    // payload._source = our source (the target of the relation)
    // payload._after = the element that no longer points to our source
    const sourceElementId = payload._after;
    
    if (!sourceElementId) return;
    
    debug('🔄 Multiple relation deleted:', { 
      field: fieldName, 
      target: payload._source, 
      sourceElement: sourceElementId,
      resultSetId: resultSet._id
    });
    
    if (resultSet._data.has(sourceElementId)) {
      resultSet._data.delete(sourceElementId);
      const removedElement = deep.detect(sourceElementId);
      debug('📤 Emitting dataDelete event for:', sourceElementId);
      resultSet.emit(deep.events.dataDelete, removedElement);
      resultSet.emit(deep.events.dataChanged);
    } else {
      debug('⚠️ Element not in set, skipping:', sourceElementId);
    }
  });
  
  debug('🔗 Created disposers for multiple relation tracking:', {
    field: fieldName,
    sourceId: source._id,
    resultSetId: resultSet._id,
    disposerCount: 2
  });
  
  resultSet._state._manyRelationDisposers.push(addedDisposer, deletedDisposer);
}

/**
 * Create mapByField method for Set instances
 * Inverts a set through a specified field using n-ary union operation
 */
function newMapByField(deep: any) {
  const MapByField = new deep.Method(function(this: any, fieldName: string) {
    const sourceSet = new deep(this._source);
    
    debug('🔧 Creating mapByField for field:', fieldName, 'on set:', sourceSet._id);
    
    // Validate that source is a Set
    if (!sourceSet.type || !sourceSet.type.is(deep.Set)) {
      throw new Error('mapByField can only be called on deep.Set instances');
    }
    
    // Validate field name
    if (!_isValidRelationField(fieldName)) {
      throw new Error(`Field ${fieldName} is not supported in mapByField operation`);
    }
    
    debug('📊 Source set size:', sourceSet._data.size);
    
    // Create array of manyRelation sets for each element in source set
    const relationSets: any[] = [];
    for (const elementSymbol of sourceSet._data) {
      const element = deep.detect(elementSymbol);
      const relationSet = element.manyRelation(fieldName);
      relationSets.push(relationSet);
      debug('📝 Element', elementSymbol, 'manyRelation(' + fieldName + ') size:', relationSet._data.size);
    }
    
    // Create a Set containing the _symbol of each relation set
    const setOfSets = new deep.Set(new Set(relationSets.map(set => set._symbol)));
    debug('📦 Created setOfSets with', setOfSets._data.size, 'relation sets');
    
    // Use n-ary Or operation to union all relation sets
    const result = new deep.Or(undefined, setOfSets);
    debug('✅ Created Or operation result:', result._id);
    
    // Set up tracking for changes to source set
    setupMapByFieldTracking(deep, sourceSet, fieldName, setOfSets, result);
    
    return result.to; // Return the result set from Or operation
  });
  
  return MapByField;
}

/**
 * Set up reactive tracking for mapByField results
 * Tracks changes to source set and updates the n-ary operation accordingly
 */
function setupMapByFieldTracking(deep: any, sourceSet: any, fieldName: string, setOfSets: any, orOperation: any) {
  debug('🔧 Setting up mapByField tracking for field:', fieldName);
  
  // Track additions to source set
  const addTracker = sourceSet.on(deep.events.dataAdd, (...addedElements: any[]) => {
    debug('🔄 Elements added to source set:', addedElements.length);
    
    for (const addedElement of addedElements) {
      // Create manyRelation set for new element
      const element = deep.detect(addedElement._symbol);
      const relationSet = element.manyRelation(fieldName);
      
      // Add the relation set to setOfSets
      setOfSets.add(relationSet);
      debug('📝 Added relation set for element:', addedElement._symbol);
      
      // Note: Destroy tracking for new elements is handled by the global destroyTracker
    }
  });
  
  // Track deletions from source set
  const deleteTracker = sourceSet.on(deep.events.dataDelete, (...deletedElements: any[]) => {
    debug('🔄 Elements deleted from source set:', deletedElements.length);
    
    for (const deletedElement of deletedElements) {
      // Find and remove the corresponding relation set from setOfSets
      const element = deep.detect(deletedElement._symbol);
      const relationSet = element.manyRelation(fieldName);
      
      // Remove the relation set from setOfSets
      setOfSets.delete(relationSet);
      debug('📝 Removed relation set for element:', deletedElement._symbol);
    }
  });
  
  // Track destruction events for elements in source set
  const destroyTracker = deep.on(deep.events.globalDestroyed, (payload: any) => {
    const destroyedId = payload._source;
    debug('🔄 Element destroyed globally:', destroyedId);
    
    // Check if destroyed element was in our source set
    if (sourceSet._data.has(destroyedId)) {
      debug('📝 Destroyed element was in source set, removing from setOfSets');
      
      // Find and remove the corresponding relation set from setOfSets
      const element = deep.detect(destroyedId);
      const relationSet = element.manyRelation(fieldName);
      
      // Remove the relation set from setOfSets
      // Or operation will automatically handle the recalculation
      setOfSets.delete(relationSet);
      debug('📝 Removed relation set for destroyed element:', destroyedId);
    }
  });
  
  // Store tracking info for cleanup
  const resultSet = orOperation.to;
  if (!resultSet._state._mapByFieldDisposers) {
    resultSet._state._mapByFieldDisposers = [];
  }
  resultSet._state._mapByFieldDisposers.push(addTracker, deleteTracker, destroyTracker);
  
  // Also store disposers in the Or operation for proper cleanup
  if (!orOperation._state._mapByFieldDisposers) {
    orOperation._state._mapByFieldDisposers = [];
  }
  orOperation._state._mapByFieldDisposers.push(addTracker, deleteTracker, destroyTracker);
  
  // Add public dispose method to result set for complete tracking cleanup
  resultSet._context.dispose = new deep.Method(function(this: any) {
    debug('🗑️ Disposing mapByField tracking');
    
    const self = new deep(this._source);
    
    // Dispose our mapByField trackers
    if (self._state._mapByFieldDisposers) {
      self._state._mapByFieldDisposers.forEach((disposer: any) => {
        if (typeof disposer === 'function') {
          disposer();
        }
      });
      self._state._mapByFieldDisposers = [];
    }
    
    // Dispose Or operation trackers by calling its _destruction method
    if (orOperation._context && typeof orOperation._context._destruction === 'function') {
      orOperation._context._destruction.call(orOperation);
    }
    
    debug('✅ mapByField tracking disposed');
  });
  
  debug('🔗 Set up mapByField tracking with', 3, 'disposers');
}

export function newQuery(deep: any) {
  debug('🔧 Initializing query system');
  
  // Add manyRelation method to Deep context
  deep._context.manyRelation = newManyRelation(deep);
  
  // Add mapByField method to Deep context (with validation inside)
  deep._context.mapByField = newMapByField(deep);
  
  // TODO: Implement remaining query methods
  // - queryField
  // - query
  
  debug('✅ Query system initialized');
} 