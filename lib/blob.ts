import { deep, _Value, _valueConstruct } from './deep';

deep.Blob = new deep.Binary();
deep.Blob._values = new _Value<Blob>();
deep.Blob._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Blob, (value) => {
    if (typeof Blob === 'undefined' || !(value instanceof Blob)) throw new Error('!Blob');
}, args);
} 