import { deep, _Value, _valueConstruct } from './deep';

deep.ArrayBuffer = new deep.Binary();
deep.ArrayBuffer._values = new _Value<ArrayBuffer>();
deep.ArrayBuffer._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.ArrayBuffer, (value) => {
    if (!(value instanceof ArrayBuffer)) throw new Error('!ArrayBuffer');
}, args);
} 