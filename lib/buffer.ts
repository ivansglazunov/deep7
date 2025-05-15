import { deep, _Value, _valueConstruct } from './deep';

// For Buffer check if Buffer exists (Node.js)
const isBufferAvailable = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';

deep.Buffer = new deep.Binary();
deep.Buffer._values = new _Value<Buffer>();
deep.Buffer._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (!isBufferAvailable || !Buffer.isBuffer(value)) throw new Error('!Buffer');
  }, args);
} 