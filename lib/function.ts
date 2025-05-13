import { deep, _Value } from './deep';

deep.Function = new deep.Value();
deep.functions = new _Value<Function>();
deep.Function._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'function') throw new Error(`!function`);
  const symbol = deep.functions.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.functions.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 