import { _datas, deep, _context } from './deep';

deep.Data = new deep(); 

export const _dataConstruct = (proxy, check, args) => {
  const Data = proxy;
  const data = args?.[0];
  check(data)
  const symbol = Data._datas.byData(data);
  const instance = _context._construct(Data, args, symbol);
  if (!symbol) Data._datas.byData(data, instance.symbol);
  instance.data = data;
  _datas.set(instance.symbol, Data._datas);
  return instance;
};