import { deep, _Data, _dataConstruct } from './deep';

deep.Array = new deep.Data();
deep.Array._datas = new _Data<Array<any>>();
deep.Array._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!Array.isArray(value)) throw new Error(`!Array`);
}, args);
} 