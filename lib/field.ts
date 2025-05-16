import { _create, deep, Deep } from './';

const _Field = deep.Field = new deep.Function(function (this: Deep, handler: (this: Deep, value) => any) {
  const field = new deep.Function(handler);
  field.context = _Field.context;
  return field;
});
deep.Field._getter = function (this: Deep, target, field, key: any) {
  if (this.symbol == _Field.symbol) return this;
  const instance = _create();
  instance.prev = target.symbol;
  instance.prevBy = deep.getter.symbol;
  instance.context = target.context;
  instance.data = target.data;
  return field.data.apply(instance, [target, field, key]);
}
deep.Field._setter = function (this: Deep, target, field, key: any, value: any) {
  if (this.symbol == _Field.symbol) return this;
  const instance = _create();
  instance.prev = target.symbol;
  instance.prevBy = deep.setter.symbol;
  instance.context = target.context;
  instance.data = target.data;
  return field.data.apply(instance, [target, field, key, value]);
}
deep.Field._deleter = function (this: Deep, target, field, key: any) {
  if (this.symbol == _Field.symbol) return this;
  const instance = _create();
  instance.prev = target.symbol;
  instance.prevBy = deep.deleter.symbol;
  instance.context = target.context;
  instance.data = target.data;
  return field.data.apply(instance, [target, field, key]);
}