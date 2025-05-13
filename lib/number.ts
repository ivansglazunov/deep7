import { deep, _Value } from './deep';

deep.Number = new deep.Value();
export const _numbers = deep._numbers = new _Value<number>();
deep.Number._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (typeof value != 'number' || !Number.isFinite(value)) throw new Error(`!number`);
  const symbol = _numbers.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) _numbers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 