import { deep, _Data, _datas, _dataConstruct } from './deep';
import { TypedArray } from './deep';

deep.TypedArray = new deep.Binary();
deep.TypedArray._datas = new _Data<TypedArray>();
deep.TypedArray._construct = (proxy: any, args: any[]): any => {
  return _dataConstruct(proxy, (value) => {
    if (!ArrayBuffer.isView(value) || value instanceof DataView) throw new Error('!TypedArray');
  }, args);
}