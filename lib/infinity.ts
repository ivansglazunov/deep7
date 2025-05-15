import { _Value, _valueConstruct, _values, deep } from './deep';

deep.Infinity = new deep.Value();
deep.Infinity._values = new _Value<number>();
deep.Infinity._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (value !== Infinity && value !== -Infinity) throw new Error('!Infinity');
  }, args);
}
