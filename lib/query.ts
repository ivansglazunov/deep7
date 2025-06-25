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
      debug('📝 Multiple relation field:', fieldName, ':', currentValues.size);
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
 * Create queryField method for executing field-based queries
 * Combines manyRelation and mapByField for searching by specific field
 */
function newQueryField(deep: any) {
  const QueryField = new deep.Method(function (this: any, fieldName: string, fieldValue: any) {
    const self = new deep(this._source);
    
    if (typeof fieldName !== 'string') {
      throw new Error('Field name must be a string');
    }
    
    // Validate field name
    if (!_isValidRelationField(fieldName)) {
      throw new Error(`Field ${fieldName} is not supported in query expression`);
    }
    
    // ПРАВИЛЬНАЯ АКСИОМА queryField из QUERY2.md:
    // queryField('type', A) → A.manyRelation(invertedFieldName) → A.manyRelation('typed') → {a1, a2}
    // queryField('typed', a1) → a1.manyRelation(invertedFieldName) → a1.manyRelation('type') → {A}
    // queryField('value', str) → str.manyRelation(invertedFieldName) → str.manyRelation('valued') → {d1, d2}
    // queryField('valued', str) → str.manyRelation(invertedFieldName) → str.manyRelation('value') → {D}
    // queryField('out', b1) → b1.manyRelation(invertedFieldName) → b1.manyRelation('from') → {a1}
    
    // Инвертируем поле согласно аксиомам
    const fieldInversions: { [key: string]: string } = {
          'type': 'typed',
      'typed': 'type',
          'from': 'out', 
      'out': 'from',
          'to': 'in',
          'in': 'to', 
      'value': 'valued',
          'valued': 'value'
        };
    
    const relationField = fieldInversions[fieldName];
    if (!relationField) {
      throw new Error(`Unknown field for inversion: ${fieldName}`);
    }

    // Если fieldValue это Deep instance, используем его напрямую
    if (fieldValue instanceof deep.Deep) {
      debug('🔍 queryField: fieldValue is Deep instance:', fieldValue._id);
      return fieldValue.manyRelation(relationField);
    }
    // Если fieldValue это строка, создаем Deep instance
    else if (typeof fieldValue === 'string') {
      debug('🔍 queryField: fieldValue is a string, creating deep instance:', fieldValue);
      const deepInstance = new deep(fieldValue);
      return deepInstance.manyRelation(relationField);
    }
    // Если fieldValue это plain object, выполняем рекурсивный запрос
    else if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
      debug('🔍 queryField: fieldValue is plain object for field:', fieldName, 'object:', Object.keys(fieldValue));
      // Рекурсивно вызываем deep.query для вложенного объекта
      const nestedResult = deep.query(fieldValue);
      debug('🔍 queryField: nested query result size:', nestedResult.size);
      
      // Применяем mapByField к результату вложенного запроса
      const mappedResult = nestedResult.mapByField(relationField);
      debug('🔍 queryField: mapped result size:', mappedResult.size);
      return mappedResult;
    }
    else { // ЭТАП 1 и 2 поддерживает только Deep instances или plain objects
      debug('❌ queryField: invalid fieldValue type:', typeof fieldValue, 'isArray:', Array.isArray(fieldValue), 'fieldValue:', fieldValue);
      throw new Error('queryField can only be called with Deep instances, strings or plain objects');
    }
  });
  
  return QueryField;
}

/**
 * Create query method for executing complex queries
 * Applies queryField for each field and combines results using And operation
 */
function newQueryMethod(deep: any) {
  const QueryMethod = new deep.Method(function (this: any, criteria: any) {
    const self = new deep(this._source);
    
    if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
      throw new Error('Query criteria must be an plain object');
    }

    // Извлекаем операторы из критериев
    const { _not, _or, _and, ...mainCriteria } = criteria;
    
    // Валидация операторов
    if (_not !== undefined) {
      if (typeof _not !== 'object' || _not === null || _not instanceof deep.Deep) {
        throw new Error('_not operator must contain plain objects');
      }
    }
    
    if (_or !== undefined) {
      if (!Array.isArray(_or)) {
        debug('❌ _or validation failed: not an array:', typeof _or, _or);
        throw new Error('_or operator must be an array of plain objects');
      }
      for (let i = 0; i < _or.length; i++) {
        if (typeof _or[i] !== 'object' || _or[i] === null || Array.isArray(_or[i]) || _or[i] instanceof deep.Deep) {
          debug('❌ _or[' + i + '] validation failed:', {
            type: typeof _or[i],
            isNull: _or[i] === null,
            isArray: Array.isArray(_or[i]),
            isDeep: _or[i] instanceof deep.Deep,
            value: _or[i]
          });
          throw new Error(`_or[${i}] must be a plain object`);
        }
        // Валидация что это plain object
        // Plain object может содержать Deep instances как значения - это валидно
        debug('✅ _or[' + i + '] is valid plain object');
      }
    }
    
    if (_and !== undefined) {
      if (typeof _and !== 'object' || _and === null || Array.isArray(_and) || _and instanceof deep.Deep) {
        throw new Error('_and operator must be a plain object');
      }
    }

    // Собираем результаты queryField для основных критериев
    const queryFieldResults: any[] = [];
    
    for (const [field, value] of Object.entries(mainCriteria)) {
      const fieldResult = deep.queryField(field, value);
      queryFieldResults.push(fieldResult);
    }

    // Обрабатываем _or оператор
    if (_or && _or.length > 0) {
      debug('🔄 Processing _or operator with', _or.length, 'conditions');
      
      // Выполняем запрос для каждого условия в _or
      const orResults: any[] = [];
      for (let i = 0; i < _or.length; i++) {
        const orCondition = _or[i];
        if (Array.isArray(orCondition)) {
          throw new Error(`_or[${i}] is an array, but must be a plain object. Got: ${JSON.stringify(orCondition)}`);
        }
        const orResult = deep.query(orCondition);
        orResults.push(orResult);
        debug('📝 _or condition result size:', orResult.size);
      }
      
      // Создаем deep.Or операцию для объединения всех _or результатов
      const orSetOfSets = new deep.Set(new Set(orResults.map(result => result._symbol)));
      const orOperation = new deep.Or(undefined, orSetOfSets);
      queryFieldResults.push(orOperation.to);
      
      debug('✅ _or operation created, result size:', orOperation.to.size);
    }
    
    // Обрабатываем _and оператор
    if (_and) {
      debug('🔄 Processing _and operator');
      
      // Выполняем запрос для _and условия
      const andResult = deep.query(_and);
      queryFieldResults.push(andResult);
      
      debug('✅ _and operation result size:', andResult.size);
    }

    // Создаем финальный результат через And операцию
    let mainResult: any;
    if (queryFieldResults.length === 0) {
      // Если критериев нет, результатом является множество всех существующих ID
      mainResult = deep._ids;
    } else if (queryFieldResults.length === 1) {
      mainResult = queryFieldResults[0];
    } else {
      // Создаем And операцию для всех критериев (основные + _or + _and)
      const setOfSets = new Set(queryFieldResults.map(result => result._symbol));
      const andSetOfSets = new deep.Set(setOfSets);
      const andOperation = new deep.And(undefined, andSetOfSets);
      mainResult = andOperation.to;
      
      debug('✅ Final And operation created, result size:', mainResult.size);
    }

    // Если нет _not оператора, возвращаем основной результат
    if (!_not) {
      return mainResult;
    }

    // Обрабатываем _not оператор
    debug('🔄 Processing _not operator');
    
    // Выполняем запрос для _not критериев
    const notResult = deep.query(_not);
    
    // Создаем deep.Set содержащий _symbol результата _not запроса
    const excludeSetOfSets = new deep.Set(new Set([notResult._symbol]));
    
    // Применяем deep.Not операцию: mainResult - notResult
    const notOperation = new deep.Not(mainResult, excludeSetOfSets);
    
    debug('✅ _not operation applied, final result size:', notOperation.to.size);
    
    return notOperation.to;
  });

  return QueryMethod;
}

export function newQuery(deep: any) {
  debug('🔧 Initializing query system');
  
  // Add manyRelation method to Deep context (with validation inside)
  deep._contain.manyRelation = newManyRelation(deep);
  
  // Add mapByField method to Deep context (with validation inside)
  deep._contain.mapByField = newMapByField(deep);
  
  // Add queryField method to Deep context
  deep._contain.queryField = newQueryField(deep);
  
  // Add query method to Deep context
  deep._contain.query = newQueryMethod(deep);
  
  debug('✅ Query system initialized');
} 