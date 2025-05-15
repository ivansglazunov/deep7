import { deep, _Value, _valueConstruct } from './deep';

deep.Array = new deep.Value();
deep.Array._values = new _Value<Array<any>>();
deep.Array._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, (value) => {
    if (!Array.isArray(value)) throw new Error(`!Array`);
}, args);
} 