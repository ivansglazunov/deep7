import { Deep, deep } from './';

deep.is = new deep.Function(function(this: Deep, value: any) {
  if (value instanceof Deep) return value.symbol === this.symbol;
  else return new deep(value).symbol === this.symbol;
});
