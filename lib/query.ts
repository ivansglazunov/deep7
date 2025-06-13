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
  const elementDestroyTrackers = new Map<string, any>();
  
  // Set up destruction tracking for existing elements
  for (const elementSymbol of sourceSet._data) {
    const element = deep.detect(elementSymbol);
    const destroyTracker = element.on(deep.events.destroyed, (payload: any) => {
      debug('🔄 Element destroyed:', elementSymbol);
      
      // Find and remove the corresponding relation set from setOfSets
      const relationSet = element.manyRelation(fieldName);
      
      // Remove the relation set from setOfSets
      // Or operation will automatically handle the recalculation
      setOfSets.delete(relationSet);
      debug('📝 Removed relation set for destroyed element:', elementSymbol);
      
      // Clean up this tracker
      elementDestroyTrackers.delete(elementSymbol);
    });
    
    elementDestroyTrackers.set(elementSymbol, destroyTracker);
  }
  
  // Track additions to source set and set up destruction tracking for new elements
  const addTracker = sourceSet.on(deep.events.dataAdd, (...addedElements: any[]) => {
    debug('🔄 Elements added to source set:', addedElements.length);
    
    for (const addedElement of addedElements) {
      // Create manyRelation set for new element
      const element = deep.detect(addedElement._symbol);
      const relationSet = element.manyRelation(fieldName);
      
      // Add the relation set to setOfSets
      setOfSets.add(relationSet);
      debug('📝 Added relation set for element:', addedElement._symbol);
      
      // Set up destruction tracking for new element
      const destroyTracker = element.on(deep.events.destroyed, (payload: any) => {
        debug('🔄 Element destroyed:', addedElement._symbol);
        
        // Find and remove the corresponding relation set from setOfSets
        const relationSet = element.manyRelation(fieldName);
        
        // Remove the relation set from setOfSets
        setOfSets.delete(relationSet);
        debug('📝 Removed relation set for destroyed element:', addedElement._symbol);
        
        // Clean up this tracker
        elementDestroyTrackers.delete(addedElement._symbol);
      });
      
      elementDestroyTrackers.set(addedElement._symbol, destroyTracker);
    }
  });
  
  // Update delete tracker to also clean up destruction tracking for removed elements
  const deleteTracker = sourceSet.on(deep.events.dataDelete, (...deletedElements: any[]) => {
    debug('🔄 Elements deleted from source set:', deletedElements.length);
    
    for (const deletedElement of deletedElements) {
      // Find and remove the corresponding relation set from setOfSets
      const element = deep.detect(deletedElement._symbol);
      const relationSet = element.manyRelation(fieldName);
      
      // Remove the relation set from setOfSets
      setOfSets.delete(relationSet);
      debug('📝 Removed relation set for element:', deletedElement._symbol);
      
      // Clean up destruction tracking for removed element
      const destroyTracker = elementDestroyTrackers.get(deletedElement._symbol);
      if (destroyTracker && typeof destroyTracker === 'function') {
        destroyTracker();
        elementDestroyTrackers.delete(deletedElement._symbol);
      }
    }
  });
  
  // Store tracking info for cleanup
  const resultSet = orOperation.to;
  if (!resultSet._state._mapByFieldDisposers) {
    resultSet._state._mapByFieldDisposers = [];
  }
  resultSet._state._mapByFieldDisposers.push(addTracker, deleteTracker);
  
  // Also store disposers in the Or operation for proper cleanup
  if (!orOperation._state._mapByFieldDisposers) {
    orOperation._state._mapByFieldDisposers = [];
  }
  orOperation._state._mapByFieldDisposers.push(addTracker, deleteTracker);
  
  // Store reference to Or operation for manual cleanup
  resultSet._state._orOperation = orOperation;
  
  // Set up automatic cleanup when result set is destroyed
  const destructionTracker = resultSet.on(deep.events.destroyed, (payload: any) => {
    debug('🗑️ Auto-disposing mapByField tracking due to result set destruction');
    
    // Dispose our mapByField trackers
    if (resultSet._state._mapByFieldDisposers) {
      resultSet._state._mapByFieldDisposers.forEach((disposer: any) => {
        if (typeof disposer === 'function') {
          disposer();
        }
      });
      resultSet._state._mapByFieldDisposers = [];
    }
    
    // Clean up all element destruction trackers
    elementDestroyTrackers.forEach((disposer: any) => {
      if (typeof disposer === 'function') {
        disposer();
      }
    });
    elementDestroyTrackers.clear();
    
    // Dispose Or operation trackers by calling its _destruction method
    if (orOperation._context && typeof orOperation._context._destruction === 'function') {
      orOperation._context._destruction.call(orOperation);
    }
    
    debug('✅ mapByField tracking auto-disposed');
  });
  
  // Store the destruction tracker for potential manual cleanup
  resultSet._state._mapByFieldDisposers.push(destructionTracker);
  
  debug('🔗 Set up mapByField tracking with', 2, 'disposers (including auto-cleanup)');
}

/**
 * Create queryField method for executing field-based queries
 * Combines manyRelation and mapByField for searching by specific field
 */
function newQueryField(deep: any) {
  const QueryField = new deep.Method(function(this: any, fieldName: string, value: any) {
    debug('🔧 Creating queryField for field:', fieldName, 'with value:', value);
    
    // Validate field name
    if (!_isValidRelationField(fieldName)) {
      throw new Error(`Field ${fieldName} is not supported in query expression`);
    }
    
    // Handle nested query objects
    if (value && typeof value === 'object' && !(value instanceof deep.Deep) && !Array.isArray(value)) {
      debug('📝 Processing nested query object:', value);
      
      // Recursively process nested query
      const nestedResult = deep.query(value);
      
      // Use mapByField to invert the nested result through the inverted field
      // For queryField('type', {...}), we need to find who has type from nestedResult
      // So we use mapByField with the inverted field ('typed' for 'type')
      let invertedFieldName: string;
      if (_oneRelationFields.hasOwnProperty(fieldName)) {
        const fieldMap = {
          'type': 'typed',
          'from': 'out', 
          'to': 'in',
          'value': 'valued'
        };
        invertedFieldName = fieldMap[fieldName as keyof typeof fieldMap];
      } else {
        // For inverted fields, use the direct field
        const fieldMap = {
          'typed': 'type',
          'out': 'from',
          'in': 'to', 
          'valued': 'value'
        };
        invertedFieldName = fieldMap[fieldName as keyof typeof fieldMap];
      }
      
      const invertedResult = nestedResult.mapByField(invertedFieldName);
      
      debug('✅ Created nested queryField result:', invertedResult._id);
      return invertedResult;
    }
    
    // Handle simple Deep instance values
    let targetValue: any;
    if (value instanceof deep.Deep) {
      targetValue = value;
      debug('📝 Processing Deep instance value:', value._id);
    } else {
      // Handle other value types by detecting them first
      targetValue = deep.detect(value);
      debug('📝 Processing detected value:', targetValue._id);
    }
    
    // Determine which field to use for manyRelation
    // The logic is: queryField(fieldName, value) means "find all X where X.fieldName = value"
    // So we need to find who has the specified relation TO the value
    let relationField: string;
    
    if (_oneRelationFields.hasOwnProperty(fieldName)) {
      // For direct fields (type, from, to, value), use the inverted field
      // queryField('type', X) → "find all who have type = X" → X.manyRelation('typed')
      const fieldMap = {
        'type': 'typed',
        'from': 'out', 
        'to': 'in',
        'value': 'valued'
      };
      relationField = fieldMap[fieldName as keyof typeof fieldMap];
      debug('📝 Using inverted field:', relationField, 'for direct field:', fieldName);
    } else {
      // For inverted fields, the logic depends on the specific field
      if (fieldName === 'typed') {
        // queryField('typed', a) → "find all who are type for a" → a.manyRelation('type')
        relationField = 'type';
        debug('📝 Using direct field type for typed query');
      } else {
        // For other inverted fields (out, in, valued), use them directly
        // queryField('valued', str1) → "find all who have valued = str1" → str1.manyRelation('valued')
        relationField = fieldName;
        debug('📝 Using inverted field directly:', relationField);
      }
    }
    
    // Use manyRelation to get all elements related through this field
    const result = targetValue.manyRelation(relationField);
    
    debug('✅ Created queryField result:', result._id);
    return result;
  });
  
  return QueryField;
}

/**
 * Create query method for executing complex queries
 * Applies queryField for each field and combines results using And operation
 */
function newQueryMethod(deep: any) {
  const Query = new deep.Method(function(this: any, queryExpression: any) {
    debug('🔧 Creating query for expression:', queryExpression);
    
    if (!queryExpression || typeof queryExpression !== 'object' || Array.isArray(queryExpression)) {
      throw new Error('Query expression must be a non-null object');
    }
    
    const fieldNames = Object.keys(queryExpression);
    if (fieldNames.length === 0) {
      throw new Error('Query expression cannot be empty');
    }
    
    debug('📝 Processing query fields:', fieldNames);
    
    // Apply queryField for each field in the expression
    const parsedExp: { [fieldName: string]: any } = {};
    const resultSets: any[] = [];
    
    for (const fieldName of fieldNames) {
      const fieldValue = queryExpression[fieldName];
      debug('🔍 Processing field:', fieldName, 'with value:', fieldValue);
      
      // Use queryField to get the result set for this field
      const fieldResult = deep.queryField(fieldName, fieldValue);
      parsedExp[fieldName] = fieldResult;
      resultSets.push(fieldResult);
      
      debug('✅ Field result for', fieldName, ':', fieldResult._id, 'size:', fieldResult.size);
    }
    
    debug('📝 Collected', resultSets.length, 'result sets for And operation');
    
    // Create And operation to combine all field results
    // new deep.And(undefined, new deep.Set(...Object.values(parsedExp)))
    const resultSetsSet = new deep.Set(new Set(resultSets.map((rs: any) => rs._symbol)));
    const andOperation = new deep.And(undefined, resultSetsSet);
    
    // Get the result from And operation (.to field contains the actual result)
    const andResult = andOperation.to;
    
    // Store the parsed expression in the result's state for debugging/inspection
    andResult._state._queryExpression = queryExpression;
    andResult._state._parsedExp = parsedExp;
    andResult._state._andOperation = andOperation;
    
    debug('✅ Created query result:', andResult._id, 'with And operation');
    return andResult;
  });
  
  return Query;
}

export function newQuery(deep: any) {
  debug('🔧 Initializing query system');
  
  // Add manyRelation method to Deep context (with validation inside)
  deep._context.manyRelation = newManyRelation(deep);
  
  // Add mapByField method to Deep context (with validation inside)
  deep._context.mapByField = newMapByField(deep);
  
  // Add queryField method to Deep context
  deep._context.queryField = newQueryField(deep);
  
  // Add query method to Deep context
  deep._context.query = newQueryMethod(deep);
  
  debug('✅ Query system initialized');
} 