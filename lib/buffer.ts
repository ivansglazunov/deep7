import { deep, _Value } from './deep';

// For Buffer check if Buffer exists (Node.js)
const isBufferAvailable = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';

deep.Buffer = new deep.Binary();
deep.buffers = new _Value<Buffer>();
deep.Buffer._construct = (proxy: any, args: any[]): any => {
  const value = args?.[0];
  if (!isBufferAvailable || !Buffer.isBuffer(value)) throw new Error('!Buffer');
  const symbol = deep.buffers.byValue(value);
  const instance = proxy.globalContext._construct(proxy, args, symbol);
  if (!symbol) deep.buffers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
} 