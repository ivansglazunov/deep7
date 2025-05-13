import { deep, _Value } from './deep';

deep.WeakMap = new deep.Value();
deep.weakMaps = new _Value<WeakMap<any, any>>();
deep.WeakMap._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof WeakMap)) throw new Error(`!weakMap`);
  const symbol = deep.weakMaps.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.weakMaps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 