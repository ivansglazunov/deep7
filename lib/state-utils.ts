// State management utilities for Deep Framework
// Provides functions for state extraction, comparison, and restoration

/**
 * Extracts all association IDs from a Deep instance, sorted by sequence number
 * @param deep The Deep instance to extract IDs from
 * @returns Array of IDs sorted by _i (sequence number)
 */
export function extractAllIds(deep: any): string[] {
  const ids: string[] = Array.from(deep._Deep._ids);
  // Sort by sequence number (_i)
  return ids.sort((a, b) => {
    const seqA = deep._Deep._getSequenceNumber(a);
    const seqB = deep._Deep._getSequenceNumber(b);
    return seqA - seqB;
  });
}

/**
 * Extracts full state information from a Deep instance
 * @param deep The Deep instance to extract state from
 * @returns Object containing all state data
 */
export function extractState(deep: any): {
  ids: string[];
  associations: { [id: string]: AssociationState };
} {
  const ids = extractAllIds(deep);
  const associations: { [id: string]: AssociationState } = {};
  
  for (const id of ids) {
    const instance = new deep(id);
    associations[id] = {
      _i: instance._i,
      _type: instance._type,
      _from: instance._from,
      _to: instance._to,
      _value: instance._value,
      _data: instance._data,
      _created_at: instance._created_at,
      _updated_at: instance._updated_at,
      contextKeys: Object.keys(instance._contain || {})
    };
  }
  
  return { ids, associations };
}

/**
 * Interface for association state
 */
export interface AssociationState {
  _i: number;
  _type?: string;
  _from?: string;
  _to?: string;
  _value?: any;
  _data?: any;
  _created_at: number;
  _updated_at: number;
  contextKeys: string[];
}

/**
 * Interface for state differences
 */
export interface StateDifference {
  type: 'missing_id' | 'extra_id' | 'property_diff' | 'context_diff';
  id: string;
  property?: string;
  value1?: any;
  value2?: any;
  message: string;
}

/**
 * Compares two Deep states and returns differences
 * @param deep1 First Deep instance
 * @param deep2 Second Deep instance  
 * @returns Object containing comparison results
 */
export function compareDeepStates(deep1: any, deep2: any): { 
  identical: boolean; 
  differences: StateDifference[] 
} {
  const differences: StateDifference[] = [];
  const state1 = extractState(deep1);
  const state2 = extractState(deep2);
  
  // Compare ID sets
  if (state1.ids.length !== state2.ids.length) {
    differences.push({
      type: 'property_diff',
      id: 'ROOT',
      property: 'id_count',
      value1: state1.ids.length,
      value2: state2.ids.length,
      message: `Different number of associations: ${state1.ids.length} vs ${state2.ids.length}`
    });
  }
  
  // Check for missing IDs in second state
  for (const id of state1.ids) {
    if (!state2.ids.includes(id)) {
      differences.push({
        type: 'missing_id',
        id,
        message: `ID ${id} exists in first but not second`
      });
      continue;
    }
    
    const assoc1 = state1.associations[id];
    const assoc2 = state2.associations[id];
    
    // Compare basic properties
    const propsToCompare = ['_i', '_type', '_from', '_to', '_value', '_created_at', '_updated_at'] as const;
    
    for (const prop of propsToCompare) {
      if (assoc1[prop] !== assoc2[prop]) {
        differences.push({
          type: 'property_diff',
          id,
          property: prop,
          value1: assoc1[prop],
          value2: assoc2[prop],
          message: `ID ${id}: ${prop} differs (${assoc1[prop]} vs ${assoc2[prop]})`
        });
      }
    }
    
    // Compare _data separately (it can be complex objects)
    try {
      const data1Json = JSON.stringify(assoc1._data);
      const data2Json = JSON.stringify(assoc2._data);
      if (data1Json !== data2Json) {
        differences.push({
          type: 'property_diff',
          id,
          property: '_data',
          value1: assoc1._data,
          value2: assoc2._data,
          message: `ID ${id}: _data differs`
        });
      }
    } catch (error: any) {
      // Handle circular references in _data comparison
      if (error.message.includes('circular')) {
        differences.push({
          type: 'property_diff',
          id,
          property: '_data',
          value1: '[Circular Object]',
          value2: '[Circular Object]',
          message: `ID ${id}: _data has circular references, cannot compare`
        });
      } else {
        differences.push({
          type: 'property_diff',
          id,
          property: '_data',
          value1: assoc1._data,
          value2: assoc2._data,
          message: `ID ${id}: _data comparison failed: ${error.message}`
        });
      }
    }
    
    // Compare context keys
    if (assoc1.contextKeys.length !== assoc2.contextKeys.length) {
      differences.push({
        type: 'context_diff',
        id,
        property: 'context_keys_count',
        value1: assoc1.contextKeys.length,
        value2: assoc2.contextKeys.length,
        message: `ID ${id}: context has different number of keys (${assoc1.contextKeys.length} vs ${assoc2.contextKeys.length})`
      });
    }
    
    for (const key of assoc1.contextKeys) {
      if (!assoc2.contextKeys.includes(key)) {
        differences.push({
          type: 'context_diff',
          id,
          property: key,
          message: `ID ${id}: context key '${key}' missing in second`
        });
      }
    }
    
    for (const key of assoc2.contextKeys) {
      if (!assoc1.contextKeys.includes(key)) {
        differences.push({
          type: 'context_diff',
          id,
          property: key,
          message: `ID ${id}: context key '${key}' extra in second`
        });
      }
    }
  }
  
  // Check for extra IDs in second state
  for (const id of state2.ids) {
    if (!state1.ids.includes(id)) {
      differences.push({
        type: 'extra_id',
        id,
        message: `ID ${id} exists in second but not first`
      });
    }
  }
  
  return {
    identical: differences.length === 0,
    differences
  };
}

/**
 * Creates a summary report of state differences
 * @param differences Array of differences
 * @returns String summary
 */
export function getDifferencesSummary(differences: StateDifference[]): string {
  if (differences.length === 0) {
    return 'States are identical';
  }
  
  const summary = [
    `Found ${differences.length} differences:`,
    ...differences.map(diff => `  - ${diff.message}`)
  ];
  
  return summary.join('\n');
}

/**
 * Validates that a list of IDs can be used for state restoration
 * @param ids Array of IDs to validate
 * @returns Validation result
 */
export function validateIds(ids: string[]): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  // Check for duplicates
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    errors.push(`Duplicate IDs found: ${ids.length} total, ${uniqueIds.size} unique`);
  }
  
  // Check for empty IDs
  const emptyIds = ids.filter(id => !id || typeof id !== 'string');
  if (emptyIds.length > 0) {
    errors.push(`Invalid IDs found: ${emptyIds.length} empty or non-string IDs`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 