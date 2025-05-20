// Provides utility functions for type checking and assertions related to Deep instances and their properties.

export function newIs(deep) {
  const Is = new deep.Method(function(this: any, value: any) {
    let v;
    if (value instanceof deep.Deep) v = value;
    else v = new deep(value);
    return this._source._id === v._id;
  });

  return Is;
}