// Defines the 'String' type within the Deep framework, allowing for Deep instances that specifically represent and handle string data.
import { _Data } from "./_data";

export function newString(deep) {
  const _String = new deep();

  const _DataInstance = new _Data<string>();
  deep._datas.set(_String._id, _DataInstance);

  _String._contain._constructor = function (currentConstructor, args: any[] = []) {
    const str = args[0];
    if (typeof str !== 'string') throw new Error('must got string but ' + typeof str);

    const id = _DataInstance.byData(str);
    if (id) return deep(id);
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = str;
    return instance;
  };

  return _String;
}