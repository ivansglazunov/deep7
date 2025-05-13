import { deep, _Value } from './deep';

deep.Date = new deep.Value();
deep.dates = new _Value<Date>();
deep.Date._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Date)) throw new Error(`!date`);
  const symbol = deep.dates.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.dates.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 