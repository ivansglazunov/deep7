// Provides a mechanism (Function class) to create Deep instances that behave as callable functions, often used for defining custom constructors or behaviors.
import { _Data } from "./_data";

export function newFunction(deep) {
  const _Function = new deep();

  const _DataInstance = new _Data<Function>();
  deep._datas.set(_Function._id, _DataInstance);

  _Function._contain._constructor = function (currentConstructor, args: any[] = []) {
    const fn = args[0];
    if (typeof fn !== 'function') throw new Error('must got function but' + typeof fn);
    const id = _DataInstance.byData(fn);
    if (id) return deep(id);
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = fn;
    return instance;
  };

  return _Function;
}