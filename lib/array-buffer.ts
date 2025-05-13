import { deep, _Value } from './deep';

deep.ArrayBuffer = new deep.Binary();
deep.arrayBuffers = new _Value<ArrayBuffer>();
deep.ArrayBuffer._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (!(value instanceof ArrayBuffer)) throw new Error('!ArrayBuffer');
  const symbol = deep.arrayBuffers.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.arrayBuffers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 