import { deep, _Value } from './deep';

deep.WeakSet = new deep.Value();
deep.weakSets = new _Value<WeakSet<any>>();
deep.WeakSet._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof WeakSet)) throw new Error(`!weakSet`);
  const symbol = deep.weakSets.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.weakSets.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 