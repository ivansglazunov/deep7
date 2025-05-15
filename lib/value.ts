import { _values, deep, _context } from './deep';

deep.Value = new deep(); 

export const _valueConstruct = (proxy, check, args) => {
  const Value = proxy;
  const value = args?.[0];
  check(value)
  const symbol = Value._values.byValue(value);
  const instance = _context._construct(Value, args, symbol);
  if (!symbol) Value._values.byValue(value, instance.symbol);
  instance.data = value;
  _values.set(instance.symbol, Value._values);
  return instance;
};