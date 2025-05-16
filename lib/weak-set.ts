import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.WeakSet = new deep.Data();
deep.WeakSet._datas = new _Data<WeakSet<any>>();
deep.WeakSet._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof WeakSet)) throw new Error('!WeakSet');
  }, args);
}