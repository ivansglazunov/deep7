import { _Data, _dataConstruct, _datas, deep } from './deep';

deep.null = new deep.Data();
deep.null._datas = new _Data<Map<any, any>>();
deep.null._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (value !== null) throw new Error('!Null');
  }, args);
} 
