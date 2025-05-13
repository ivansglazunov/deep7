import { deep, _Value } from './deep';

deep.String = new deep.Value();
deep.strings = new _Value<string>();
deep.String._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'string') throw new Error(`!string`);
  const symbol = deep.strings.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.strings.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 