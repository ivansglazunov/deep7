import { deep } from './deep';

deep.NaN = new deep.Value();
deep.NaN.data = NaN;
deep.NaN._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0] || NaN;
  if (!Number.isNaN(value)) throw new Error(`!NaN`);
  const instance = proxy.globalContext._construct(proxy, args, deep.NaN?.symbol);
  instance.data = value;
  return instance;
} 