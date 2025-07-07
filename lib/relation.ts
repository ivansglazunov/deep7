// Implements the underlying _Relation class responsible for managing bidirectional, one-to-many relationships between Deep instances (e.g., for type_id, from_id, to_id, value_id links).

export type Forward = Map<string, string>;
export type Backwards = Set<string>;
export type Backward = Map<string, Backwards>;

export class Relation {
  public forward: Forward;
  public backward: Backward;

  Map = Map;
  Set = Set;
  
  constructor() {
    this.forward = new this.Map();
    this.backward = new this.Map();
  }
  
  set(key: string, value: string) {
    const prevValue = this.forward.get(key);
    if (prevValue !== undefined && prevValue !== value) {
      const reverseSet = this.backward.get(prevValue);
      if (reverseSet) {
        reverseSet.delete(key);
        if (reverseSet.size === 0) {
          this.backward.delete(prevValue);
        }
      }
    }
    this.forward.set(key, value);
    if (!this.backward.has(value)) {
      const newSet: Backwards = new this.Set();
      this.backward.set(value, newSet);
    }
    this.many(value).add(key);
    return true;
  }

  one(key: string): string | undefined {
    return this.forward.get(key);
  };

  has(key: string): boolean {
    return this.forward.has(key);
  };

  many(value: string): Set<string> {
    let newSet = this.backward.get(value);
    if (!newSet) {
      newSet = new this.Set();
      this.backward.set(value, newSet);
    }
    return newSet;
  }

  delete(key: string): boolean {
    if (!this.forward.has(key)) {
      return false;
    }
    const value = this.forward.get(key);
    this.forward.delete(key);
    if (value && this.backward.has(value)) {
      const reverseSet = this.backward.get(value);
      if (reverseSet) {
        reverseSet.delete(key);
        if (reverseSet.size === 0) {
          this.backward.delete(value);
        }
      }
    }
    return true;
  }
  get size(): number {
    return this.forward.size;
  }
};
