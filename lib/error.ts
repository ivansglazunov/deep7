import { deep, _Value } from './deep';

deep.Error = new deep.Value();
deep.errors = new _Value<Error>();
deep.Error._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Error)) throw new Error(`!error`);
  const symbol = deep.errors.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.errors.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 