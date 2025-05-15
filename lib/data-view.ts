import { deep, _Value, _valueConstruct } from './deep';

deep.DataView = new deep.Binary();
deep.DataView._values = new _Value<DataView>();
deep.DataView._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (!(value instanceof DataView)) throw new Error('!DataView');
}, args);
} 