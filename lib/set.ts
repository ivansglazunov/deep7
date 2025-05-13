import { deep, _Value } from './deep';

deep.Set = new deep.Value();
deep.sets = new _Value<Set<any>>();
deep.Set._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Set)) throw new Error(`!set`);
  const symbol = deep.sets.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.sets.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 