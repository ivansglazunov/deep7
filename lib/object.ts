import { deep, _Value } from './deep';

deep.Object = new deep.Value();
deep.objects = new _Value<Object>();
deep.Object._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'object') throw new Error(`!object`);
  const symbol = deep.objects.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.objects.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 