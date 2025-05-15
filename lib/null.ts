import { _Value, _valueConstruct, _values, deep } from './deep';

deep.null = new deep.Value();
deep.null._values = new _Value<Map<any, any>>();
deep.null._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (value !== null) throw new Error('!Null');
  }, args);
} 
