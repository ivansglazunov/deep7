import { _Data } from "./_data";
import { z } from "zod";

export function newString(deep) {
  const String = new deep();

  deep._datas.set(String._id, new _Data<String>());

  String._context._constructor = function (currentConstructor, args: any[] = []) {
    const str = args[0];
    if (typeof str !== 'string') throw new Error('must got string but ' + typeof str);
    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = str;
    return instance;
  };

  return String;
}