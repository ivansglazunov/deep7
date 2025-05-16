import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Number = new deep.Data();
deep.Number._datas = new _Data<number>();
deep.Number._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'number' || !Number.isFinite(value)) throw new Error('!Number');
  }, args);
}
