import { deep, _Value, _all } from './deep';

deep.Symbol = new deep.Value();
deep.symbols = new _Value<symbol>();
deep.Symbol._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'symbol') throw new Error(`!symbol`);
  const symbol = _all.has(value) ? value : deep.symbols.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.symbols.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 