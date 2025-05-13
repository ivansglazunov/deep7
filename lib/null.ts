import { deep } from './deep';

deep.null = new deep.Value();
deep.null.data = null;
deep.null._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0] || null;
  if (value !== null) throw new Error(`!null`);
  const instance = proxy.globalContext._construct(proxy, args, deep.null?.symbol);
  instance.data = value;
  return instance;
} 