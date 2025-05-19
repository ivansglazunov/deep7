// Provides a mechanism (Field class) for defining custom properties on Deep instances with specialized getter, setter, and deleter logic.
import { _Data } from "./_data";
import { z } from "zod";

export function newField(deep) {
  const Field = new deep();

  Field._context._constructor = function (currentConstructor, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn._type != deep.Function._id) throw new Error('field must be a function but got ' + fn._type);
    } else {
      throw new Error('must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance._type = FieldInstance._id;
    instance._value = fn._id;
    return instance;
  };

  const FieldInstance = new deep();
  Field._context.FieldInstance = FieldInstance;
  FieldInstance._type = Field._id;
  FieldInstance._context._getter = function (this: any, getter, key, source) {
    const fn = getter._getData(getter._value).byId(getter._value);
    const instance = new deep(getter._id);
    instance._source = source._id;
    instance._reason = deep.reasons.getter._id;
    return fn.call(instance, key);
  };
  FieldInstance._context._setter = function (this: any, setter, key, value, source) {
    const fn = setter._getData(setter._value).byId(setter._value);
    const instance = new deep(setter._id);
    instance._source = source._id;
    instance._reason = deep.reasons.setter._id;
    return fn.call(instance, key, value);
  };
  FieldInstance._context._deleter = function (this: any, deleter, key, source) {
    const fn = deleter._getData(deleter._value).byId(deleter._value);
    const instance = new deep(deleter._id);
    instance._source = source._id;
    instance._reason = deep.reasons.deleter._id;
    return fn.call(instance, key);
  };
  return Field;
}