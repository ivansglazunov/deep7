// Provides utility functions for type checking and assertions related to Deep instances and their properties.

export function _isPlainObject(value) {
  return value !== null &&
    typeof value === 'object' &&
    [null, Object.prototype].includes(Object.getPrototypeOf(value));
}

export function newIs(deep) {
  const Is = new deep.Method(function (this: any, value: any) {
    let v;
    if (value instanceof deep.Deep) v = value;
    else v = new deep(value);
    return this._source === v._id;
  });

  return Is;
}

export function newTypeof(deep) {
  const Typeof = new deep.Method(function (this: any, target: any) {
    const currentInstance = new deep(this._source);
    const currentTypeChain = currentInstance.typeofs;
    const targetId = target instanceof deep.Deep ? target._id : target;
    return currentTypeChain.includes(targetId);
  });

  return Typeof;
}

export function newTypeofs(deep) {
  const Typeofs = new deep.Field(function (this: any) {
    if (this._reason === deep.reasons.getter._id) {
      const result: string[] = [];
      let current = new deep(this._source);
      const visited = new Set<string>();

      while (current.type_id && !visited.has(current.type_id)) {
        visited.add(current.type_id);
        result.push(current.type_id);
        current = new deep(current.type_id);
      }

      return result;
    }
  });

  return Typeofs;
}