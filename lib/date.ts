import { deep, _Value, _valueConstruct } from './deep';

deep.Date = new deep.Value();
deep.Date._values = new _Value<Date>();
deep.Date._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Date, (value) => {
    if (typeof value != 'object' || !(value instanceof Date)) throw new Error(`!Date`);
  }, args);
} 