export function newDetect(deep: any) {
  const DetectMethod = new deep.Method(function(this: any, valueToDetect: any) {
    // this._source will be the deep instance a detect was called on.
    // this._reason will be 'apply'.

    if (valueToDetect instanceof deep.Deep) {
      return valueToDetect; // Already a Deep instance
    }

    const type = typeof valueToDetect;

    if (type === 'string') {
      if (deep._ids.has(valueToDetect)) {
        return new deep(valueToDetect);
      } else {
        // Check if there's already a deep.String instance with this data
        const stringDataHandler = deep._datas.get(deep.String._id);
        if (stringDataHandler) {
          const existingId = stringDataHandler.byData(valueToDetect);
          if (existingId) {
            return new deep(existingId);
          }
        }
        return new deep.String(valueToDetect);
      }
    } else if (type === 'number') {
      // Check if there's already a deep.Number instance with this data
      const numberDataHandler = deep._datas.get(deep.Number._id);
      if (numberDataHandler) {
        const existingId = numberDataHandler.byData(valueToDetect);
        if (existingId) {
          return new deep(existingId);
        }
      }
      return new deep.Number(valueToDetect);
    } else if (type === 'boolean') {
      // For now, return primitive boolean values as-is wrapped in a generic deep instance
      const boolInstance = new deep();
      // Since _symbol is a getter that returns _data || _id, we'll set a special property
      // This is a temporary solution until we have proper Boolean type
      Object.defineProperty(boolInstance, '_symbol', { value: valueToDetect, writable: false });
      return boolInstance;
    } else if (valueToDetect === null) {
      // For now, return null value as-is wrapped in a generic deep instance  
      const nullInstance = new deep();
      // Since _symbol is a getter that returns _data || _id, we'll set a special property
      // This is a temporary solution until we have proper Null type
      Object.defineProperty(nullInstance, '_symbol', { value: null, writable: false });
      return nullInstance;
    } else if (valueToDetect instanceof Set) {
      return new deep.Set(valueToDetect); // Constructor will handle existing instance detection
    } else if (Array.isArray(valueToDetect)) {
      // Check if there's already a deep.Array instance with this data
      const arrayDataHandler = deep._datas.get(deep.Array._id);
      if (arrayDataHandler) {
        const existingId = arrayDataHandler.byData(valueToDetect);
        if (existingId) {
          return new deep(existingId);
        }
      }
      // TODO: Implement Array type (e.g., deep.Array) and uncomment
      // if (deep.Array) {
      //   return new deep.Array(valueToDetect);
      // }
      throw new Error('Array detection and wrapping not yet implemented (deep.Array missing).');
    } else if (type === 'object' && valueToDetect !== null) {
      // TODO: Implement Object type (e.g., deep.Object) and uncomment
      // if (deep.Object) {
      //  return new deep.Object(valueToDetect);
      // }
      throw new Error('Object detection and wrapping not yet implemented (deep.Object missing).');
    } else if (type === 'function') {
      // Check if there's already a deep.Function instance with this data
      const functionDataHandler = deep._datas.get(deep.Function._id);
      if (functionDataHandler) {
        const existingId = functionDataHandler.byData(valueToDetect);
        if (existingId) {
          return new deep(existingId);
        }
      }
      return new deep.Function(valueToDetect);
    }
    
    throw new Error(`Type detection and wrapping for type '${type}' (value: ${valueToDetect}) not yet implemented or value is null/undefined.`);
  });

  return DetectMethod;
} 