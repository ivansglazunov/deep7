import { deep, _Value, _values, _valueConstruct } from './deep';

deep.WeakSet = new deep.Value();
deep.WeakSet._values = new _Value<WeakSet<any>>();
deep.WeakSet._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof WeakSet)) throw new Error('!WeakSet');
  }, args);
}