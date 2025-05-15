import { deep, _Value, _values, _valueConstruct } from './deep';

deep.Number = new deep.Value();
deep.Number._values = new _Value<number>();
deep.Number._construct = (proxy: any, args: any[]): any => {
  return _valueConstruct(proxy, deep.Number, (value) => {
    if (typeof value != 'number' || !Number.isFinite(value)) throw new Error('!Number');
  }, args);
}
