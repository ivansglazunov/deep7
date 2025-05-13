import { deep } from './deep';

deep.undefined = new deep.Value();
deep.undefined.data = undefined;
deep.undefined._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0] || undefined;
  if (typeof value != 'undefined') throw new Error(`!undefined`);
  const instance = proxy.globalContext._construct(proxy, args, deep.undefined?.symbol);
  instance.data = value;
  return instance;
} 