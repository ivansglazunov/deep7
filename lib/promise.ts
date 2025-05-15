import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Promise = new deep.Value();
deep.Promise._values = new _Value<Promise<any>>(WeakMap);
deep.Promise._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (value?.[Symbol.toStringTag] !== 'Promise') throw new Error('!Promise');
  }, args);
} 
