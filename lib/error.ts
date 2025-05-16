import { deep, _Data, _datas, _dataConstruct } from './deep';

deep.Error = new deep.Data();
deep.Error._datas = new _Data<Error>();
deep.Error._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'object' || !(value instanceof Error))throw new Error('!Error')
}, args);
}