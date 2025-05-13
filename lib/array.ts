import { deep, _Value } from './deep';

deep.Array = new deep.Value();
deep.arrays = new _Value<Array<any>>();
deep.Array._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (!Array.isArray(value)) throw new Error(`!array`);
  const symbol = deep.arrays.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.arrays.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 