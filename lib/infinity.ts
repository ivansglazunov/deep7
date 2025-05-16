import { _Data, _dataConstruct, _datas, deep } from './deep';

deep.Infinity = new deep.Data();
deep.Infinity._datas = new _Data<number>();
deep.Infinity._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (value !== Infinity && value !== -Infinity) throw new Error('!Infinity');
  }, args);
}
