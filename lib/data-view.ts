import { deep, _Value } from './deep';

deep.DataView = new deep.Binary();
deep.dataViews = new _Value<DataView>();
deep.DataView._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (!(value instanceof DataView)) throw new Error('!DataView');
  const symbol = deep.dataViews.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.dataViews.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 