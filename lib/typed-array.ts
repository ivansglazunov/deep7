import { deep, _Value } from './deep';
import { TypedArray } from './deep';

deep.TypedArray = new deep.Binary();
deep.typedArrays = new _Value<TypedArray>();
deep.TypedArray._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  // Проверяем, что это TypedArray (например Uint8Array, Int32Array и т.п.)
  const isTypedArray = ArrayBuffer.isView(value) && !(value instanceof DataView);
  if (!isTypedArray) throw new Error('!TypedArray');
  const symbol = deep.typedArrays.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.typedArrays.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 