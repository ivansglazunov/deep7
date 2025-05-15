import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Map = new deep.Value();
deep.Map._values = new _Value<Map<any, any>>();
deep.Map._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Map)) throw new Error('!Map');
  }, args);
}