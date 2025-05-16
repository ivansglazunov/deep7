import { deep, _Data, _dataConstruct } from './deep';

const isBufferAvailable = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';

deep.Buffer = new deep.Binary();
deep.Buffer._datas = new _Data<Buffer>();
deep.Buffer._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!isBufferAvailable || !Buffer.isBuffer(value)) throw new Error('!Buffer');
  }, args);
} 