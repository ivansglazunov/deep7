import { deep, _Data, _dataConstruct } from './deep';

deep.Blob = new deep.Binary();
deep.Blob._datas = new _Data<Blob>();
deep.Blob._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof Blob === 'undefined' || !(value instanceof Blob)) throw new Error('!Blob');
}, args);
} 