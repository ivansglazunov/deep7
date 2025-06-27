// Provides a mechanism (Field class) for defining custom properties on Deep instances with specialized getter, setter, and deleter logic.

export function newField(deep) {
  const Field = new deep();

  Field._contain._constructor = function (currentConstructor, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn.type_id != deep.Function._id) throw new Error('field must be a function but got ' + typeof _fn);
    } else {
      throw new Error('field must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance.type_id = FieldInstance._id;
    instance.value_id = fn._id;
    return instance;
  };

  const FieldInstance = new deep();
  Field._contain.FieldInstance = FieldInstance;
  FieldInstance.type_id = Field._id;
  FieldInstance._contain._getter = function (this: any, getter, key, source) {
    const fn = getter._getDataInstance(getter.value_id).byId(getter.value_id);
    const instance = new deep(getter._id);
    const sourceId = typeof source.__id === 'string' ? source.__id
      : typeof source._id === 'string' ? source._id
        : (() => {
          console.error(`🚨 CRITICAL ANOMALY: Cannot extract string ID from source in field getter:`, {
            source, __id: source.__id, _id: source._id, __id_type: typeof source.__id, _id_type: typeof source._id
          });
          throw new Error(`Cannot extract valid string ID from source in field getter`);
        })();
    instance._source = sourceId;
    instance._reason = deep.reasons.getter._id;
    return fn.call(instance, key);
  };
  FieldInstance._contain._setter = function (this: any, setter, key, value, source) {
    const fn = setter._getDataInstance(setter.value_id).byId(setter.value_id);
    const instance = new deep(setter._id);
    const sourceId = typeof source.__id === 'string' ? source.__id
      : typeof source._id === 'string' ? source._id
        : (() => {
          console.error(`🚨 CRITICAL ANOMALY: Cannot extract string ID from source in field setter:`, {
            source, __id: source.__id, _id: source._id, __id_type: typeof source.__id, _id_type: typeof source._id
          });
          throw new Error(`Cannot extract valid string ID from source in field setter`);
        })();
    instance._source = sourceId;
    instance._reason = deep.reasons.setter._id;
    return fn.call(instance, key, value);
  };
  FieldInstance._contain._deleter = function (this: any, deleter, key, source) {
    const fn = deleter?._getDataInstance(deleter.value_id)?.byId(deleter.value_id);
    const instance = new deep(deleter._id);
    const sourceId = typeof source.__id === 'string' ? source.__id
      : typeof source._id === 'string' ? source._id
        : (() => {
          console.error(`🚨 CRITICAL ANOMALY: Cannot extract string ID from source in field deleter:`, {
            source, __id: source.__id, _id: source._id, __id_type: typeof source.__id, _id_type: typeof source._id
          });
          throw new Error(`Cannot extract valid string ID from source in field deleter`);
        })();
    instance._source = sourceId;
    instance._reason = deep.reasons.deleter._id;
    if (fn) return fn.call(instance, key);
    else return true;
  };
  return Field;
}