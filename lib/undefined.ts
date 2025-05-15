import { _Value, _valueConstruct, _values, deep } from './deep';

deep.undefined = new deep.Value();
deep.undefined._values = new _Value<undefined>();
deep.undefined._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.undefined, (value) => {
    if (typeof value != 'undefined') throw new Error('!Undefined');
  }, args);
} 