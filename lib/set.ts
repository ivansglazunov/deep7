import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Set = new deep.Data();
deep.Set._datas = new _Data<Set<any>>();
deep.Set._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Set)) throw new Error('!Set');
  }, args);
}