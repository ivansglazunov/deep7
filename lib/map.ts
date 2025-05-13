import { deep, _Value } from './deep';

deep.Map = new deep.Value();
deep.maps = new _Value<Map<any, any>>();
deep.Map._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Map)) throw new Error(`!map`);
  const symbol = deep.maps.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.maps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 