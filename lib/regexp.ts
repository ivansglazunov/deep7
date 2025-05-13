import { deep, _Value } from './deep';

deep.RegExp = new deep.Value();
deep.regExps = new _Value<RegExp>();
deep.RegExp._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof RegExp)) throw new Error(`!RegExp`);
  const symbol = deep.regExps.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.regExps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 