import { deep, _Value, _values, _valueConstruct } from './deep';

deep.RegExp = new deep.Value();
deep.RegExp._values = new _Value<RegExp>();
deep.RegExp._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof RegExp)) throw new Error('!RegExp');
  }, args);
} 