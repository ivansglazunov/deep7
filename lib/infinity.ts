import { deep } from './deep';

deep.Infinity = new deep.Value();
deep.Infinity._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0] || Infinity;
  if (value !== Infinity && value !== -Infinity) throw new Error(`!Infinity`);
  const instance = proxy.globalContext._construct(proxy, args, value === Infinity ? _plusInfinity?.symbol : _minusInfinity?.symbol);
  instance.data = value;
  return instance;
}
export const _plusInfinity = deep._plusInfinity = new deep.Infinity(Infinity);
export const _minusInfinity = deep._minusInfinity = new deep.Infinity(-Infinity); 