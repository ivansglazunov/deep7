import { deep, _Data, _dataConstruct } from './deep';

deep.String = new deep.Data();
deep.String._datas = new _Data<string>();
deep.String._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'string') throw new Error('!String');
  }, args);
}