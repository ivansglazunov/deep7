import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.WeakMap = new deep.Data();
deep.WeakMap._datas = new _Data<WeakMap<any, any>>();
deep.WeakMap._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof WeakMap)) throw new Error('!WeakMap');
  }, args);
} 