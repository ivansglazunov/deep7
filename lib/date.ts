import { deep, _Data, _dataConstruct } from './deep';

deep.Date = new deep.Data();
deep.Date._datas = new _Data<Date>();
deep.Date._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Date)) throw new Error(`!Date`);
  }, args);
} 