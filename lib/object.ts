import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Object = new deep.Data();
deep.Object._datas = new _Data<Object>();
deep.Object._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object') throw new Error('!Object');
  }, args);
} 