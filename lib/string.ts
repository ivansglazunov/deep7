// Defines the 'String' type within the Deep framework, allowing for Deep instances that specifically represent and handle string data.
import { _Data } from "./_data";

export function newString(deep) {
  const _String = new deep();

  deep._datas.set(_String._id, new _Data<string>());

  _String._context._constructor = function (currentConstructor, args: any[] = []) {
    const str = args[0];
    if (typeof str !== 'string') throw new Error('must got string but ' + typeof str);
    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = str;
    return instance;
  };

  return _String;
}