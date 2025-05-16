import { deep, _Data, _dataConstruct } from './deep';

deep.DataView = new deep.Binary();
deep.DataView._datas = new _Data<DataView>();
deep.DataView._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!(value instanceof DataView)) throw new Error('!DataView');
}, args);
} 