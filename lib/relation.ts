import { deep, _Value, Deep } from './deep';

export class _Relation {
  private _forward: Map<symbol, symbol>;
  private _backward: Map<symbol, Set<any>>;
  constructor() {
    this._forward = new Map();
    this._backward = new Map();
  }
  set(key: symbol, value: symbol) {
    const prevValue = this._forward.get(key);
    if (prevValue !== undefined && prevValue !== value) {
      const reverseSet = this._backward.get(prevValue);
      if (reverseSet) {
        reverseSet.delete(key);
        if (reverseSet.size === 0) {
          this._backward.delete(prevValue);
        }
      }
    }
    this._forward.set(key, value);
    if (!this._backward.has(value)) {
      const newSet = new Set();
      this._backward.set(value, newSet);
    }
    this.many(value).add(key);
    return true;
  }

  one(key: symbol): symbol | undefined {
    return this._forward.get(key);
  };

  has(key: symbol): boolean {
    return this._forward.has(key);
  };

  many(value: symbol): Set<symbol> {
    let newSet = this._backward.get(value);
    if (!newSet) {
      newSet = new Set();
      this._backward.set(value, newSet);
    }
    return newSet;
  }

  delete(key: symbol): boolean {
    if (!this._forward.has(key)) {
      return false;
    }
    const value = this._forward.get(key);
    this._forward.delete(key);
    if (value && this._backward.has(value)) {
      const reverseSet = this._backward.get(value);
      if (reverseSet) {
        reverseSet.delete(key);
        if (reverseSet.size === 0) {
          this._backward.delete(value);
        }
      }
    }
    return true;
  }
};

export const _relations = deep.relations = new Map<symbol, _Relation>();

deep.Relations = new deep(function(this: Deep) {
  const _relation = new _Relation();
  _relations.set(this.symbol, _relation);
  const one = function (this: Deep, value?: any) {
    if (arguments.length > 0) {
      if (value === undefined || value instanceof Deep && value.symbol == deep.undefined.symbol) {
        _relation.delete(this.symbol);
      } else {
        const v = new deep(value);
        _relation.set(this.symbol, v.symbol);
      }
    }
    return new deep(_relation.one(this.symbol));
  };
  const many = function (this: Deep) {
    return new deep(_relation.many(this.symbol));
  };
  return {
    _relation,
    one,
    many,
  };
});

// deep.Relations._apply = (proxy: any, args: any[]): any => {
//   return new deep.Relations();
// };
// deep.Relations._construct = (proxy: any, args: any[]): any => {
//   const fn = deep._construct(proxy, []);
//   _relations.set(fn.symbol, new _Relation());
//   return fn;
// };
// deep.Relations._apply = (proxy: any, args: any[]): any => {
  
// };

// deep.Relation = new deep();
// deep.Relation._apply = (proxy: any, args: any[]): any => {
//   return new deep.Relation(args[0]);
// };
// deep.Relation._construct = (proxy: any, args: any[]): any => {
//   const instance = deep._construct(proxy);
//   instance.data = args[0];
//   return instance;
// };;

// deep.One = new deep.Relation();
// deep.One._apply = (proxy: any, args: any[]): any => {
//   console.log('One._apply symbol', proxy.symbol);
//   const _relation = _relations.get(proxy.symbol) as _Relation;
//   if (!_relation) return undefined;
//   if (args.length > 0) {
//     const v = new deep(args[0]);
//     _relation.set(proxy.symbol, v.symbol);
//   }
//   const one = _relation.one(proxy.symbol);
//   return new deep(one);
// };

// deep.Many = new deep.Relation();
// deep.Many._apply = (proxy: any, args: any[]): any => {
//   const _relation = _relations.get(proxy.symbol) as _Relation;
//   if (!_relation) return undefined;
//   const many = _relation.many(proxy.symbol);
//   return new deep.Set(many);
// };
