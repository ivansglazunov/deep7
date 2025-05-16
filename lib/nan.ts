import { _Data, _dataConstruct, _datas, deep } from './deep';

deep.NaN = new deep.Data();
deep.NaN._datas = new _Data<Map<any, any>>();
deep.NaN._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!Number.isNaN(value)) throw new Error('!NaN');
  }, args);
} 