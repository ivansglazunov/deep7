import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Map = new deep.Data();
deep.Map._datas = new _Data<Map<any, any>>();
deep.Map._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Map)) throw new Error('!Map');
  }, args);
}