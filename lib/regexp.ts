import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.RegExp = new deep.Data();
deep.RegExp._datas = new _Data<RegExp>();
deep.RegExp._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof RegExp)) throw new Error('!RegExp');
  }, args);
} 