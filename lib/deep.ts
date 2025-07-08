import { v4 as uuidv4 } from 'uuid';
import { Relation as _Relation } from './relation';
import { _Data as _Data } from './_data';

interface Effect {
  (worker: Deep, source: Deep, target: Deep, stage, args: any[], thisArg?: any): any;
}

export class Deep extends Function {
  static Deep = Deep; // access to Deep class
  get _deep(): Deep { return this; } // universal access to Deep class instance from in and out association

  // cross stages references
  static Refs = new Map<string, any>();
  get ref(): any {
    let ref = Deep.Refs.get(this.id);
    if (!ref) Deep.Refs.set(this.id, ref = {});
    return ref;
  }

  // id management
  static newId(): string { return uuidv4(); }
  private __id: undefined | string;
  get _id(): undefined | string { return this.__id; }
  get id(): string {
    if (!this.__id) this.id = Deep.newId();
    return this.__id as string;
  }
  set id(id: string) {
    if (id == this.__id) return;
    if (!!this.__id) throw new Error(`deep.id:once (${this.__id} = ${id})`);
    if (typeof id != 'string') throw new Error(`deep.id:string`);
    this.__id = id;
  }

  // comparator
  is(deepOrId: Deep | string): boolean {
    if (typeof deepOrId == 'string') return deepOrId == this.id;
    if (deepOrId instanceof Deep) return deepOrId.id == this.id;
    return false;
  }

  // effect management

  static inherit: { [key: string]: Deep } = {};
  static effects: { [key: string]: Effect } = {};
  static schemas: { [key: string]: any } = {};
  static effect: Effect = (worker, source, target, event, args) => {
    switch (event) {
      case Deep._Inserted:
      case Deep._Updated:
      case Deep._Deleted: {
        const backwards = Deep.getBackward('value', target.id);
        if (backwards) {
          for (const id of backwards) {
            const deep = new Deep(id);
            deep.use(source, deep, event, args);
          }
        }
        return;
      }
      case Deep._Apply:
      case Deep._New: {
        const [input] = args;
        if (!args.length) return target.new(undefined, args).proxy;
        if (typeof input == 'string') return target.new(input, args).proxy;
        else if (typeof input == 'function') {
          const isntance = target.new(undefined, args);
          isntance.effect = input;
          return isntance.proxy;
        }
        else throw new Error(`deep.effect:${event}:!input`);
      } case Deep._Constructor: {
        return;
      } case Deep._Destructor: {
        return;
      } case Deep._Getter: {
        const [key] = args;
        switch (key) {
          case '_deep': return target._deep;
          case 'id': return target.id;
          case 'ref': return target.ref;
          case '_collections': return target.ref._collections || new Set();
          case 'data': return undefined;
          case 'destroy': return () => target.destroy();
          case 'toString': return () => `${target.id}`;
          case 'valueOf': return () => `${target.id}`;
          default: {
            const inherited = Deep.inherit[key];
            if (inherited) {
              if (inherited._deep.type_id == DeepFunction.id) return inherited;
              return inherited._deep.use(inherited._deep, target, Deep._FieldGetter, [key]);
            } else return;
          }
        }
        return;
      } case Deep._Setter: {
        const [key, value] = args;
        if (key === 'effect') {
          target.effect = value;
          return;
        }
        const inherited = Deep.inherit[key];
        if (inherited) {
          inherited._deep.use(inherited._deep, target, Deep._FieldSetter, [key, value]);
        } else {
          if (value instanceof Deep) {
            Deep.inherit[key] = value;
          }
        }
        return;
      } case Deep._Deleter: {
        const [key] = args;
        const inherited = Deep.inherit[key];
        if (inherited) {
          inherited._deep.use(inherited._deep, target, Deep._FieldDeleter, [key]);
        }
        return;
      } case Deep._Change: {
        const collections = target.ref._collections;
        if (collections) {
          for (const collectionId of collections) {
            const collection = new Deep(collectionId);
            collection.use(target, collection, Deep._CollectionUpdate, args);
          }
        }
        return;
      } default: return; // not inherit other event cases
    }
  };
  use(source: Deep, target: Deep, stage: any, args: any[], _this?: any): any {
    let current = Deep.effects[this.id];
    if (current) {
      return current(this, source, target, stage, args, _this);
    }
    return this.super(source, target, stage, args, _this);
  }
  get effect(): Effect {
    return Deep.effects[this.id];
  }
  set effect(effect: Effect) { Deep.effects[this.id] = effect; }
  super(source: Deep, target: Deep, stage: any, args: any[], _this?: any): any {
    let type = Deep.getForward('type', this.id);
    while (type) {
      const typeEffect = Deep.effects[type];
      if (typeEffect) {
        const typeDeep = new Deep(type);
        return typeEffect(typeDeep, source, target, stage, args, _this);
      }
      type = Deep.getForward('type', type);
    }
    return Deep.effect(deep, source, target, stage, args, _this);
  }

  static new(type_id?: string, id?: string, args: any[] = []) {
    const instance = new Deep(id);
    if (type_id) Deep.setForward('type', instance.id, type_id);
    // const schema = instance.use(instance, Deep._Schema, args);
    // if (schema?.[Deep._Constructor]?._def?.args) schema?.[Deep._Constructor].parse(args);
    instance.use(instance, instance, Deep._Constructor, args);
    return instance;
  }
  new(id?: string, args: any[] = []) {
    return Deep.new(this.id, id, args);
  }

  // _deep instance constructor, just new association, no effects
  private _stack: any;
  get stack(): any { return this._stack; }
  constructor(id?: string) {
    super();
    if (id) this.id = id;
    Deep._relations.all.add(this.id);
    this._stack = new Error().stack?.split('\n').slice(1).join('\n');
  }
  private destructor(args) {
    this.super(this, this, Deep._Destructor, args);
    Deep.Refs.delete(this.id);
    Deep._relations.all.delete(this.id);
    delete Deep.effects[this.id];
  }
  public destroy(...args: []) {
    this.destructor(args);
  }

  get proxy(): any {
    const deep = this;
    const proxy = new Proxy(deep, {
      construct(target, args: any[] = []) {
        return deep.use(deep, deep, Deep._New, args);
      },
      apply(target, _this, args: any[] = []) {
        return deep.use(deep, deep, Deep._Apply, args, _this);
      },
      get(target, key, receiver) {
        return deep.super(deep, deep, Deep._Getter, [key]);
      },
      set(target, key, value, receiver) {
        deep.super(deep, deep, Deep._Setter, [key, value]);
        return true;
      },
      deleteProperty(target, key) {
        deep.super(deep, deep, Deep._Deleter, [key]);
        return true;
      },
    });
    return proxy;
  }

  static _Schema = Deep.newId();

  static _New = Deep.newId();
  static _Constructor = Deep.newId();
  static _Apply = Deep.newId();
  static _Destructor = Deep.newId();
  static _Getter = Deep.newId();
  static _Setter = Deep.newId();
  static _Deleter = Deep.newId();
  static _Inserted = Deep.newId();
  static _Updated = Deep.newId();
  static _Deleted = Deep.newId();
  static _Change = Deep.newId();
  static _CollectionInserted = Deep.newId();
  static _CollectionDeleted = Deep.newId();
  static _CollectionUpdate = Deep.newId();
  static _FieldGetter = Deep.newId();
  static _FieldSetter = Deep.newId();
  static _FieldDeleter = Deep.newId();
  static _FieldApply = Deep.newId();

  static _relations = {
    all: new Set(),
    type: {
      forwards: {},
      backwards: {},
    },
  };

  static Backwards = Set;
  static BackwardsDeepSets = new Map<Set<any>, Deep>();

  static setForward(name: string, key: string, value: string) {
    const relation = Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
    if (!Deep._relations.all.has(key)) {
      console.log(Deep._relations.all);
      throw new Error(`Relation.setRelation:${name}:${key}:!key`);
    }
    if (value && !Deep._relations.all.has(value)) {
      console.log(Deep._relations.all);
      throw new Error(`Relation.setRelation:${name}:${value}:!value`);
    }
    relation.forwards[key] = value;
    let backwards = relation.backwards[value];
    if (!backwards) backwards = relation.backwards[value] = new Deep.Backwards();
    backwards.add(key);
  };

  static unsetForward(name: string, key: string) {
    const relation = Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
    const prev = relation.forwards[key];
    delete relation.forwards[key];
    let backwards = relation.backwards[prev];
    if (backwards) backwards.delete(key);
    return prev;
  };

  static getForward(name: string, key: string) {
    const relation = Deep._relations[name];
    if (!relation) return undefined;
    return relation.forwards[key];
  };

  static getBackward(name: string, key: string) {
    const relation = Deep._relations[name];
    if (!relation) return undefined;
    return relation.backwards[key];
  };

  static defineCollection(target: Deep, collectionId: string) {
    target.ref._collections = target.ref._collections || new Set();
    target.ref._collections.add(collectionId);
  }

  static undefineCollection(target: Deep, collectionId: string) {
    if (target.ref._collections) {
      target.ref._collections.delete(collectionId);
    }
  }

  get type_id(): string { return Deep.getForward('type', this.id); }
  get from_id(): string { return Deep.getForward('from', this.id); }
  get to_id(): string { return Deep.getForward('to', this.id); }
  get value_id(): string { return Deep.getForward('value', this.id); }

  [key: string]: any;
}

export const deep = new Deep().proxy;

export const New = new deep(Deep._New);
export const Constructor = new deep(Deep._Constructor);
export const Apply = new deep(Deep._Apply);
export const Destructor = new deep(Deep._Destructor);
export const Getter = new deep(Deep._Getter);
export const Setter = new deep(Deep._Setter);
export const Deleter = new deep(Deep._Deleter);
export const Inserted = new deep(Deep._Inserted);
export const Updated = new deep(Deep._Updated);
export const Deleted = new deep(Deep._Deleted);
export const Change = new deep(Deep._Change);
export const CollectionInserted = new deep(Deep._CollectionInserted);
export const CollectionDeleted = new deep(Deep._CollectionDeleted);
export const CollectionUpdate = new deep(Deep._CollectionUpdate);
export const FieldGetter = new deep(Deep._FieldGetter);
export const FieldSetter = new deep(Deep._FieldSetter);
export const FieldDeleter = new deep(Deep._FieldDeleter);

export const Field = new deep();
export const Method = new deep();

const RelationIdField = new Field(function (worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [options] = args;
      Deep._relations[options.name] = Deep._relations[options.name] || { forwards: {}, backwards: {} };
      const instance = target.new();
      instance.ref.options = options;
      return instance.proxy;
    } case Deep._Constructor: {
      return;
    } case Deep._FieldGetter: {
      const name = source.ref.options.name;
      return Deep.getForward(name, target.id);
    } case Deep._FieldSetter: {
      const name = source.ref.options.name;
      let [key, value] = args;
      if (value instanceof Deep) value = value.id;
      if (value && !Deep._relations.all.has(value)) throw new Error(`Relation.FieldSetter:${name}:${value}:!value`);
      const prev = Deep.unsetForward(name, target.id);
      if (value) Deep.setForward(name, target.id, value);
      target.use(target, target, Deep._Change, [name, value, prev]);
      return;
    } case Deep._FieldDeleter: {
      const name = source.ref.options.name;
      const def = source.ref.options.default;
      const prev = Deep.unsetForward(name, target.id);
      if (def) Deep.setForward(name, target.id, def);
      return;

    } default: return worker.super(source, target, stage, args);
  }
});
deep.type_id = RelationIdField({ name: 'type', default: deep.id });
deep.from_id = RelationIdField({ name: 'from', default: undefined });
deep.to_id = RelationIdField({ name: 'to', default: undefined });
deep.value_id = RelationIdField({ name: 'value', default: undefined });

const RelationField = new Field(function (worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [options] = args;
      const instance = target.new();
      instance.ref.options = options;
      return instance.proxy;
    } case Deep._Constructor: {
      return;
    } case Deep._FieldGetter: {
      const id = target.proxy[source.ref.options.id_field];
      return id ? (new Deep(id)).proxy : undefined;
    } case Deep._FieldSetter: {
      let [key, value] = args;
      if (value instanceof Deep) value = value.id;
      return target.proxy[source.ref.options.id_field] = value;
    } case Deep._FieldDeleter: {
      return delete target.proxy[source.ref.options.id_field];

    } default: return worker.super(source, target, stage, args);
  }
});
deep.type = RelationField({ id_field: 'type_id' });
deep.from = RelationField({ id_field: 'from_id' });
deep.to = RelationField({ id_field: 'to_id' });
deep.value = RelationField({ id_field: 'value_id' });

const RelationManyField = new Field(function (worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [options] = args;
      const instance = target.new();
      instance.ref.options = options;
      return instance.proxy;
    } case Deep._Constructor: {
      return;
    } case Deep._FieldGetter: {
      const name = source.ref.options.name;
      const backwards = Deep.getBackward(name, target.id);
      if (!backwards) return undefined;
      let deepSet = Deep.BackwardsDeepSets.get(backwards);
      if (!deepSet) {
        const newDeepSet = new DeepSet();
        for (const item of backwards) newDeepSet.add(item);
        Deep.BackwardsDeepSets.set(backwards, newDeepSet);
        deepSet = newDeepSet;
      }
      return deepSet;
    } default: return worker.super(source, target, stage, args);
  }
});
deep.typed = RelationManyField({ name: 'type' });
deep.out = RelationManyField({ name: 'from' });
deep.in = RelationManyField({ name: 'to' });
deep.valued = RelationManyField({ name: 'value' });

export const DeepData = new deep((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const data = worker.super(source, target, stage, args, thisArg);
      data.ref._data = data.ref._data || new _Data();
      return data;
    } case Deep._Getter: {
      const [key] = args;
      switch (key) {
        case 'data': {
          const type = target.proxy.type;
          const _data = type.ref._data;
          if (!_data) throw new Error(`DeepData.data:!target.proxy.type.ref._data`);

          return _data.byId(target.id);
        } default: return worker.super(source, target, stage, args, thisArg);
      }
    } case Deep._Deleted: {
      const [elementId] = args;
      if (typeof elementId === 'string') {
        const element = new Deep(elementId);
        element.use(target, element, Deep._CollectionDeleted, [target.id]);
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._CollectionUpdate: {
      return worker.super(source, target, Deep._Updated, args, thisArg);
    } case Deep._Destructor: {
      const type = target.proxy.type;
      const _data = type.ref._data;
      if (!_data) throw new Error(`DeepSet.new:!.type.ref._data`);
      _data.byId(target.id, undefined);
      return;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepFunction = new DeepData((worker, source, target, stage, args, thisArg) => {
  if (target.type_id == worker.id) {
    switch (stage) {
      case Deep._Apply: return target.proxy.data.apply(thisArg, args);
      case Deep._New: return new target.proxy.data(...args);
    }
  }
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [input] = args;

      const _data = target.ref._data;
      if (!_data) throw new Error(`DeepFunction.new:!.type.ref._data`);

      let id: string | undefined = undefined;
      if (typeof input == 'string') id = input;
      else if (typeof input == 'function') id = _data.byData(input);

      const data = target.new(id);
      const exists = _data.byId(data.id);
      if (typeof exists != 'function') {
        if (typeof input == 'function') _data.byId(data.id, input);
        else throw new Error(`DeepFunction.new:!function`);
      }

      return data.proxy;
    } case Deep._Destructor: {
      const type = target.proxy.type;
      const _data = type.ref._data;
      if (!_data) throw new Error(`DeepSet.new:!.type.ref._data`);
      _data.byId(target.id, undefined);
      return;
    } case Deep._Getter: {
      const [key] = args;
      switch (key) {
        case 'call': return target.proxy.data.call;
        case 'apply': return target.proxy.data.apply;
        default: return worker.super(source, target, stage, args, thisArg);
      }
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepSet = new DeepData((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [input] = args;

      const _data = target.ref._data;
      if (!_data) throw new Error(`DeepSet.new:!.type.ref._data`);

      let id: string | undefined = undefined;
      if (typeof input == 'string') id = input;
      else if (typeof input == 'object') id = _data.byData(input);

      const data = target.new(id);
      const exists = _data.byId(data.id);
      if (typeof exists != 'object') {
        if (typeof input == 'object') _data.byId(data.id, input);
        else _data.byId(data.id, new Set());
      }

      return data.proxy;
    } case Deep._Inserted: {
      const [elementId] = args;
      if (typeof elementId === 'string') {
        const element = new Deep(elementId);
        element.use(target, element, Deep._CollectionInserted, [target.id]);
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._Deleted: {
      const [elementId] = args;
      if (typeof elementId === 'string') {
        const element = new Deep(elementId);
        element.use(target, element, Deep._CollectionDeleted, [target.id]);
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._Destructor: {
      const type = target.proxy.type;
      const _data = type.ref._data;
      if (!_data) throw new Error(`DeepSet.new:!.type.ref._data`);
      _data.byId(target.id, undefined);
      return;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

deep.add = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.add:!data`);

  let el: Deep | undefined;
  let id_to_add: any = value;

  if (value instanceof Deep) {
    el = value;
    id_to_add = el.id;
  } else if (typeof value === 'string' && Deep._relations.all.has(value)) {
    el = new Deep(value);
    id_to_add = el.id;
  }

  if (!data.has(id_to_add)) {
    data.add(id_to_add);
    if (el) {
      Deep.defineCollection(el, this.id);
    }
    this._deep.use(this._deep, this._deep, Deep._Inserted, [id_to_add]);
  }

  return this;
});

deep.has = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.add:!data`);
  return data.has(value);
});

deep.delete = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.delete:!data`);

  let el: Deep | undefined;
  let id_to_delete: any = value;

  if (value instanceof Deep) {
    el = value;
    id_to_delete = el.id;
  } else if (typeof value === 'string' && Deep._relations.all.has(value)) {
    el = new Deep(value);
    id_to_delete = el.id;
  }

  const deleted = data.delete(id_to_delete);
  if (deleted) {
    if (el) {
      Deep.undefineCollection(el, this.id);
    }
    this._deep.use(this._deep, this._deep, Deep._Deleted, [id_to_delete]);
  }
  return deleted;
}); 