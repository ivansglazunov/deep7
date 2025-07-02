// Defines the 'Number' type within the Deep framework, allowing for Deep instances that specifically represent and handle numeric data.
import { _Data } from "./_data";

export function newNumber(deep) {
  const _Number = new deep();

  const _DataInstance = new _Data<number>();
  deep._datas.set(_Number._id, _DataInstance);

  _Number._contain._constructor = function (currentConstructor, args: any[] = []) {
    const num = args[0];
    if (typeof num !== 'number') throw new Error('must got number but ' + typeof num);
    const id = _DataInstance.byData(num);
    if (id) return deep(id);
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = num;
    return instance;
  };

  return _Number;
}