// Provides a mechanism (Function class) to create Deep instances that behave as callable functions, often used for defining custom constructors or behaviors.
import { _Data } from "./_data";

export function newFunction(deep) {
  const _Function = new deep();

  deep._datas.set(_Function._id, new _Data<Function>());

  _Function._context._constructor = function (currentConstructor, args: any[] = []) {
    const fn = args[0];
    if (typeof fn !== 'function') throw new Error('must got function but' + typeof fn);
    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = fn;
    return instance;
  };

  return _Function;
}