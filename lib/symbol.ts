import { deep, _Value, _all, _values, _valueConstruct } from './deep';

deep.Symbol = new deep.Value();
deep.Symbol._values = new _Value<symbol>();
deep.Symbol._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Symbol, (value) => {
    if (typeof value != 'symbol') throw new Error('!Symbol');
  }, args);
}