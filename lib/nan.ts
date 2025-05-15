import { _Value, _valueConstruct, _values, deep } from './deep';

deep.NaN = new deep.Value();
deep.NaN._values = new _Value<Map<any, any>>();
deep.NaN._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (!Number.isNaN(value)) throw new Error('!NaN');
  }, args);
} 