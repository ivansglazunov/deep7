import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Promise = new deep.Data();
deep.Promise._datas = new _Data<Promise<any>>(WeakMap);
deep.Promise._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (value?.[Symbol.toStringTag] !== 'Promise') throw new Error('!Promise');
  }, args);
} 
