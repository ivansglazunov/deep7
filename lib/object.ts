import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Object = new deep.Value();
deep.Object._values = new _Value<Object>();
deep.Object._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Object, (value) => {
    if (typeof value != 'object') throw new Error('!Object');
  }, args);
} 