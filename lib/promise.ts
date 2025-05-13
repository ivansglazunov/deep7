import { deep, _Value } from './deep';

deep.Promise = new deep.Value();
deep.promises = new _Value<Promise<any>>(WeakMap);
deep.Promise._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (value?.[Symbol.toStringTag] !== 'Promise') throw new Error(`!promise`);
  const symbol = deep.promises.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.promises.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 