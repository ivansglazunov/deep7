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
        return new deep.String(valueToDetect);
      }
    } else if (type === 'number') {
      return new deep.Number(valueToDetect);
    } else if (type === 'boolean') {
      // TODO: Implement _Boolean type and uncomment
      // if (deep.Boolean) { // Assuming deep.Boolean after renaming
      //   return new deep.Boolean(valueToDetect);
      // }
      throw new Error("deep.Boolean type not found or not yet implemented for boolean detection.");
    } else if (valueToDetect instanceof Set) {
      return new deep.Set(valueToDetect); // Uses the Set constructor we defined
    } else if (Array.isArray(valueToDetect)) {
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
      return new deep.Function(valueToDetect);
    }
    
    throw new Error(`Type detection and wrapping for type '${type}' (value: ${valueToDetect}) not yet implemented or value is null/undefined.`);
  });

  return DetectMethod;
} 