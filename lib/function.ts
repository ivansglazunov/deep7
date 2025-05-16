import { deep, _Data, Deep, _datas, _dataConstruct, _create, apply, construct, method } from './deep';

const _Function = deep.Function = new deep.Data();
deep.Function._datas = new _Data<Function>();
deep.Function._construct = (proxy: any, args: any[]): any => {
  if (proxy.symbol != _Function.symbol) {
    if (typeof proxy.data != 'function') throw new Error(`!Function`);
  
    const instance = _create();
    instance.prev = proxy.symbol;
    instance.prevBy = construct.symbol;
    instance.context = proxy.context;
    instance.data = proxy.data;
    
    return proxy.data.apply(instance, args);
  }
  return _dataConstruct(proxy, (value) => {
    if (typeof value != 'function') throw Error('!Function')
  }, args);
}
deep.Function._apply = (thisArg: any, proxy: any, args: any[]): any => {
  if (typeof proxy.data != 'function') throw new Error(`!Function`);

  const instance = new deep(thisArg);
  instance.prev = instance.symbol;
  instance.prevBy = thisArg ? method.symbol : apply.symbol;
  return proxy.data.apply(instance, args);
}