import { _Data } from "./_data";
import { z } from "zod";

export function newNumber(deep) {
  const Number = new deep();

  deep._datas.set(Number._id, new _Data<Number>());

  Number._context._constructor = function (currentConstructor, args: any[] = []) {
    const num = args[0];
    if (typeof num !== 'number') throw new Error('must got number but ' + typeof num);
    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = num;
    return instance;
  };

  return Number;
}