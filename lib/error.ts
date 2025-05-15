import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Error = new deep.Value();
deep.Error._values = new _Value<Error>();
deep.Error._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Error))throw new Error('!Error')
}, args);
}