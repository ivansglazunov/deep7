import { deep, _Value, _values, _valueConstruct } from './deep';
import { TypedArray } from './deep';

deep.TypedArray = new deep.Binary();
deep.TypedArray._values = new _Value<TypedArray>();
deep.TypedArray._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (!ArrayBuffer.isView(value) || value instanceof DataView) throw new Error('!TypedArray');
  }, args);
}