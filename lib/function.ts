import { deep, _Value, Deep, _values, _valueConstruct } from './deep';

deep.Function = new deep.Value();
deep.Function._values = new _Value<Function>();
deep.Function._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Function, (value) => {
    if (typeof value != 'function') throw Error('!Function')
}, args);
}
deep.Function._apply = (proxy: any, args: any[]): any => {
  if (typeof proxy.data != 'function') throw new Error(`!Function`);
  return proxy.data.apply(proxy, args);
}