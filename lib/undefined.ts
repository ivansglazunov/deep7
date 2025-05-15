import { _Value, _valueConstruct, _values, deep } from './deep';

deep.Undefined = new deep.Value();
deep.Undefined._values = new _Value<undefined>();
deep.Undefined._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'undefined') throw new Error('!Undefined');
  }, args);
} 
deep.undefined = new deep(undefined);