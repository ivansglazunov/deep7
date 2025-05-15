import { deep, _Value, _values, _valueConstruct } from './deep';

deep.WeakMap = new deep.Value();
deep.WeakMap._values = new _Value<WeakMap<any, any>>();
deep.WeakMap._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.WeakMap, (value) => {
    if (typeof value != 'object' || !(value instanceof WeakMap)) throw new Error('!WeakMap');
  }, args);
} 