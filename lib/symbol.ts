import { deep, _Data, _all, _datas, _dataConstruct } from './deep';

deep.Symbol = new deep.Data();
deep.Symbol._datas = new _Data<symbol>();
deep.Symbol._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'symbol') throw new Error('!Symbol');
  }, args);
}