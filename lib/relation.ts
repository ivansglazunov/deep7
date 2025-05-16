import { deep, _Data, Deep } from './deep';

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

deep.Relation = new deep(function(this: Deep) {
  const _relation = new _Relation()
  const Rel = new deep(_relation);
  _relations.set(this.symbol, _relation);
  Rel.One = () => (
    new deep.Field(function (this: Deep, parent, field, key, value) {
      if (this.prevBy == deep.getter.symbol) {
        return new deep(_relation.one(parent.symbol));
      } else if (this.prevBy == deep.setter.symbol) { 
        const _value = value instanceof Deep ? value : new deep(value);
        _relation.set(parent.symbol, _value.symbol);
        return true;
      } else if (this.prevBy == deep.deleter.symbol) {
        _relation.delete(parent.symbol);
        return true;
      }
    })
  );
  Rel.Many = () => (
    new deep.Field(function (this: Deep, parent, field, key, value) {
      if (this.prevBy == deep.getter.symbol) {
        return new deep(_relation.many(parent.symbol));
      } else if (this.prevBy == deep.setter.symbol) {
        throw new Error('not supported');
      } else if (this.prevBy == deep.deleter.symbol) {
        throw new Error('not supported');
      }
    })
  );
  return Rel;
});