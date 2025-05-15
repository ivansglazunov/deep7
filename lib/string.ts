import { deep, _Value, _values, _valueConstruct } from './deep';

deep.String = new deep.Value();
deep.String._values = new _Value<string>();
deep.String._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.String, (value) => {
    if (typeof value != 'string') throw new Error('!String');
  }, args);
}