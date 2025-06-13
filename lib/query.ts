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
      if (singleValue) {
        // Ensure we extract _id from any Deep instance
        const valueId = (singleValue instanceof deep.Deep) ? singleValue._id : singleValue;
        currentValues = new Set([valueId]);
      } else {
        currentValues = new Set();
      }
      debug('📝 Single relation field:', fieldName, ':', singleValue);
    } else if (_manyRelationFields.hasOwnProperty(fieldName)) {
      // Multiple relation field (typed, out, in, valued)
      const sourceSet = source[`_${fieldName}`]; // _typed, _out, _in, _valued
      if (sourceSet && sourceSet.size > 0) {
        // Ensure we extract _id from any Deep instances
        currentValues = new Set();
        for (const item of sourceSet) {
          const itemId = (item instanceof deep.Deep) ? item._id : item;
          currentValues.add(itemId);
        }
      } else {
        currentValues = new Set();
      }
      debug('📝 Multiple relation field:', fieldName, ':', Array.from(currentValues));
    } else {
      // Should not reach here due to validation above, but safety fallback
      currentValues = new Set();
    }
    
    // Create result Set with current values
    // Ensure we only pass _id values, not Deep instances
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
    
    // Use reactive deep.Set.map to get manyRelation results for each element
    // This creates a reactive deep.Set containing _symbols of manyRelation sets
    const setOfSets = sourceSet.map((elementSymbol: any) => {
      const element = deep.detect(elementSymbol);
      const relationSet = element.manyRelation(fieldName);
      debug('📝 Element', elementSymbol, 'manyRelation(' + fieldName + ') mapped to set:', relationSet._id);
      return relationSet; // This will be converted to relationSet._symbol by deep.Set.map
    });
    
    debug('📦 Created reactive setOfSets with', setOfSets._data.size, 'relation sets');
    
    // Use n-ary Or operation to union all relation sets reactively
    // The Or operation is already reactive and will update automatically
    const orOperation = new deep.Or(undefined, setOfSets);
    debug('✅ Created reactive Or operation:', orOperation._id);
    
    // Return the result set from Or operation
    // This is already reactive through the setOfSets → orOperation chain
    return orOperation.to;
  });
  
  return MapByField;
}

/**
 * mapByField now uses reactive deep.Set.map + deep.Or
 * No manual tracking needed - reactivity is handled automatically
 */

/**
 * Create queryField method for executing field-based queries
 * Combines manyRelation and mapByField for searching by specific field
 */
function newQueryField(deep: any) {
  const QueryField = new deep.Method(function(this: any, fieldName: string, value: any) {
    debug('🔧 Creating queryField for field:', fieldName, 'with value:', typeof value);
    
    // Validate field name
    if (!_isValidRelationField(fieldName)) {
      throw new Error(`Field ${fieldName} is not supported in query expression`);
    }
    
    // STAGE 1: Only accept Deep instance values
    if (!(value instanceof deep.Deep)) {
      throw new Error('In STAGE 1, queryField only accepts Deep instance values. Plain objects will be supported in STAGE 2.');
    }
    
    debug('📝 Processing Deep instance value:', value._id);
    
    // AКСИОМА queryField: 
    // queryField('type', A) → "find all who have type = A" → A.manyRelation('typed')
    // queryField('typed', a1) → "find all who have a1 as instance" → a1.manyRelation('type')
    // queryField('from', a1) → "find all who have from = a1" → a1.manyRelation('out')
    // queryField('out', b1) → "find all who have b1 as from" → b1.manyRelation('from')
    // etc.
    
    const invertedField = _invertFields[fieldName];
    if (!invertedField) {
      throw new Error(`No inverted field found for ${fieldName}`);
    }
    
    debug('📝 Using manyRelation with inverted field:', invertedField, 'for field:', fieldName);
    
    // Use manyRelation with the inverted field name
    const result = value.manyRelation(invertedField);
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
      debug('🔍 fieldValue._id:', fieldValue._id || 'no _id');
      debug('🔍 About to call queryField...');
      
      // Use queryField to get the result set for this field
      debug('📞 Calling deep.queryField for:', fieldName, 'value._id:', fieldValue._id || fieldValue);
      debug('📞 deep._context.queryField exists?', typeof deep._context.queryField !== 'undefined');
      debug('📞 deep.queryField exists?', typeof deep.queryField !== 'undefined');
      
      const fieldResult = deep.queryField(fieldName, fieldValue);
      parsedExp[fieldName] = fieldResult;
      resultSets.push(fieldResult);
      
      debug('✅ Field result for', fieldName, ':', fieldResult._id, 'size:', fieldResult.size, 'data:', fieldResult._data);
    }
    
    debug('📝 Collected', resultSets.length, 'result sets for And operation');
    
    // Create And operation to combine all field results
    // resultSets contains deep.Set instances
    // And expects a deep.Set containing _symbols of deep.Set instances
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