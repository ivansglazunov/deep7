import { _Data } from "./_data";
import { z } from "zod";

export function newFunction(deep) {
  const Function = new deep();

  deep._datas.set(Function._id, new _Data<Function>());

  Function._context._constructor = function (currentConstructor, args: any[] = []) {
    const fn = args[0];
    if (typeof fn !== 'function') throw new Error('must got function but' + typeof fn);
    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = fn;
    return instance;
  };

  return Function;
}