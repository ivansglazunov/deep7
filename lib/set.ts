import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Set = new deep.Value();
deep.Set._values = new _Value<Set<any>>();
deep.Set._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Set)) throw new Error('!Set');
  }, args);
}