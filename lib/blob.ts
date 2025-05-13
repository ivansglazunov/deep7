import { deep, _Value } from './deep';

deep.Blob = new deep.Binary();
deep.blobs = new _Value<Blob>();
deep.Blob._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  // Blob существует в браузере, в Node.js начиная с 15 версии
  if (typeof Blob === 'undefined' || !(value instanceof Blob)) throw new Error('!Blob');
  const symbol = deep.blobs.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.blobs.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 