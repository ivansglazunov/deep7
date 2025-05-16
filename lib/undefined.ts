import { _Data, _dataConstruct, _datas, deep } from './deep';

deep.Undefined = new deep.Data();
deep.Undefined._datas = new _Data<undefined>();
deep.Undefined._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'undefined') throw new Error('!Undefined');
  }, args);
} 
deep.undefined = new deep(undefined);