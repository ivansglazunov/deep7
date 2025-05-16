import { deep } from './deep';

deep.Boolean = new deep.Data();
deep.Boolean._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0] || false;
  if (typeof value != 'boolean') throw new Error(`!Boolean`);
  const instance = proxy.globalContext._construct(proxy, args, value ? deep.true?.symbol : deep.false?.symbol);
  instance.data = value;
  return instance;
}
deep.false = new deep.Boolean(false);
deep.true = new deep.Boolean(true); 