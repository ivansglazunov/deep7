// Implements the underlying _Relation class responsible for managing bidirectional, one-to-many relationships between Deep instances (e.g., for _type, _from, _to, _value links).

export type _Forward = Map<string, string>;
export type _Backwards = Set<string>;
export type _Backward = Map<string, _Backwards>;

export class _Relation {
  public _forward: _Forward;
  public _backward: _Backward;
  
  constructor() {
    this._forward = new Map();
    this._backward = new Map();
  }
  
  set(key: string, value: string) {
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
      const newSet: _Backwards = new Set();
      this._backward.set(value, newSet);
    }
    this.many(value).add(key);
    return true;
  }

  one(key: string): string | undefined {
    return this._forward.get(key);
  };

  has(key: string): boolean {
    return this._forward.has(key);
  };

  many(value: string): Set<string> {
    let newSet = this._backward.get(value);
    if (!newSet) {
      newSet = new Set();
      this._backward.set(value, newSet);
    }
    return newSet;
  }

  delete(key: string): boolean {
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
  get size(): number {
    return this._forward.size;
  }
};
