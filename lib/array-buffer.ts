import { deep, _Data, _dataConstruct } from './deep';

deep.ArrayBuffer = new deep.Binary();
deep.ArrayBuffer._datas = new _Data<ArrayBuffer>();
deep.ArrayBuffer._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!(value instanceof ArrayBuffer)) throw new Error('!ArrayBuffer');
}, args);
} 