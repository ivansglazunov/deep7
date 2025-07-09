import { v4 as uuidv4 } from 'uuid';
import { Relation as _Relation } from './relation';
import { _Data as _Data } from './_data';

// We must know all relation fields to be able to use them in deep sets in future
const oneRelationFields = ['type', 'from', 'to', 'value'];
const manyRelationFields = ['typed', 'out', 'in', 'valued'];
const validFields = ['id', 'type', 'from', 'to', 'value', 'typed', 'out', 'in', 'valued'];

// Effects are functions that are called when some event happens
// We make that as analog of React useEffect but for everything
// It's help to drop dependencies to event emitter model
interface Effect {
  (worker: Deep, source: Deep, target: Deep, stage, args: any[], thisArg?: any): any;
}

// We are is Deep, Deep is everything and nothing
// Deep is a class that is a base for all deep instances
export class Deep extends Function {
  static Deep = Deep; // access to Deep class from any deep instance
  get _deep(): Deep { return this; } // access to Deep class instance from instance and proxified instance

  // cross stages unsafe inside effect cross event memory
  static Refs = new Map<string, any>(); // global memory
  get ref(): any { // easy access from instance
    let ref = Deep.Refs.get(this.id);
    if (!ref) Deep.Refs.set(this.id, ref = {}); // create if not exists
    return ref;
  }

  // id management
  static newId(): string { return uuidv4(); } // only way to generate new id
  private __id: undefined | string; // private id field
  get _id(): undefined | string { return this.__id; } // no action way to get id
  get id(): string { return this.__id || (this.id = Deep.newId()); } // get or generate id
  set id(id: string) {
    if (id == this.__id) return;
    if (!!this.__id) throw new Error(`deep.id:once (${this.__id} = ${id})`); // id can be set only once per instance
    if (typeof id != 'string') throw new Error(`deep.id:string`); // id is string only
    this.__id = id;
  }

  // comparator
  is(deepOrId: Deep | string): boolean {
    if (typeof deepOrId == 'string') return deepOrId == this.id;
    if (deepOrId instanceof Deep) return deepOrId.id == this.id;
    return false;
  }

  // We need to connect anything to deep's as properties atomically
  // But without query engine we can't do it, and temporary solution needed as simple object
  static inherit: { [key: string]: Deep } = {};

  // effect management
  static effects: { [id: string]: Effect } = {}; // effects defined by id
  static effect: Effect = (worker, source, target, event, args) => {
    switch (event) {

      // Because of this, all typed from root deep must call super for this events, if it is handled
      case Deep._Inserted:
      case Deep._Updated:
      case Deep._Deleted: {
        // We need to propagate events to all deep's up by value relation vector
        const valued = Deep._relations.value.backwards[target.id]; // get backwards value set, manually for prevent recursive calls
        if (valued) { // if backwards value set exists
          const valuedSet = valued instanceof Deep ? valued.data : valued; // use its data property
          if (valuedSet) { // if backwards value set is not empty
            for (const id of valuedSet) { // for each id in backwards value set
              const deep = new Deep(id); // create new deep instance
              deep.use(source, deep, event, args); // use effect on it
            }
          }
        }
        return;
      }

      // Apply and New use equally by default from deep root
      case Deep._Apply: // deep(...)
      case Deep._New: { // new deep(...)
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
        const collections = target.ref._collections;
        if (collections) {
          for (const collectionId of collections) {
            const collection = new Deep(collectionId);
            collection.proxy.delete(target);
          }
        }
        return;
      } case Deep._Getter: {
        const [key] = args;
        switch (key) {
          case '_deep': return target._deep;
          case 'id': return target.id;
          case 'ref': return target.ref;
          case '_collections': return target.ref._collections || new Set();
          case '_sources': return target._sources;
          case '_targets': return target._targets;
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
      } case Deep._Setter: {
        const [key, value] = args;
        const inherited = Deep.inherit[key];
        if (inherited) inherited._deep.use(inherited._deep, target, Deep._FieldSetter, [key, value]);
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
            collection.use(target, collection, Deep._Updated, args);
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
    // this._stack = new Error().stack?.split('\n').slice(1).join('\n');
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
  static _SourceInserted = Deep.newId();
  static _SourceUpdated = Deep.newId();
  static _SourceDeleted = Deep.newId();

  static _relations: any = {
    all: new Set(),
    // type: {
    //   forwards: {},
    //   backwards: {},
    // },
  };

  static _sources: { [id: string]: Set<string> } = {};
  static _targets: { [id: string]: Set<string> } = {};

  static Backwards = Set;
  static makeBackward(prev) {
    if (Deep.Backwards == Set) return prev || new Set();
    else return prev instanceof Deep ? prev : new Deep.Backwards(prev || new Set());
  }

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
    let backwards = relation.backwards[value] = Deep.makeBackward(relation.backwards[value]);
    backwards.add(key);
  };

  static unsetForward(name: string, key: string) {
    const relation = Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
    const prev = relation.forwards[key];
    delete relation.forwards[key];
    let backwards = relation.backwards[prev];
    if (backwards) {
      backwards.delete(key);
      // Don't delete the backwards set - keep it for future use
    }
    return prev;
  };

  static getForward(name: string, key: string) {
    const relation = Deep._relations[name];
    if (!relation) return undefined;
    return relation.forwards[key];
  };

  static getBackward(name: string, key: string) {
    const relation = Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
    return Deep.makeBackward(relation.backwards[key]);
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

  defineSource(sourceId: string) {
    if (!sourceId) return;
    Deep._sources[this.id] = Deep._sources[this.id] || new Set();
    Deep._sources[this.id].add(sourceId);
    Deep._targets[sourceId] = Deep._targets[sourceId] || new Set();
    Deep._targets[sourceId].add(this.id);
  }

  undefineSource(sourceId: string) {
    if (!sourceId) return;
    if (Deep._sources[this.id]) Deep._sources[this.id].delete(sourceId);
    if (Deep._targets[sourceId]) Deep._targets[sourceId].delete(this.id);
  }

  get _sources() {
    return Deep._sources[this.id] || (Deep._sources[this.id] = new Set());
  }
  get _targets() {
    return Deep._targets[this.id] || (Deep._targets[this.id] = new Set());
  }

  get type_id(): string { return Deep.getForward('type', this.id); }
  get from_id(): string { return Deep.getForward('from', this.id); }
  get to_id(): string { return Deep.getForward('to', this.id); }
  get value_id(): string { return Deep.getForward('value', this.id); }

  [key: string]: any;
}

// Utility to normalise an id or Deep into Deep instance (internal use)
function asDeep(input: any): Deep | undefined {
  if (input instanceof Deep) return input._deep;
  if (input && typeof input === 'object' && input._deep instanceof Deep) return input._deep;
  if (typeof input === 'string' && Deep._relations.all.has(input)) return new Deep(input);
  return undefined;
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
      target.use(target, target, Deep._Change, [name, asDeep(value), asDeep(prev)]);
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
Deep.inherit.type_id = RelationIdField({ name: 'type', default: deep.id });
Deep.inherit.from_id = RelationIdField({ name: 'from', default: undefined });
Deep.inherit.to_id = RelationIdField({ name: 'to', default: undefined });
Deep.inherit.value_id = RelationIdField({ name: 'value', default: undefined });

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
Deep.inherit.type = RelationField({ id_field: 'type_id' });
Deep.inherit.from = RelationField({ id_field: 'from_id' });
Deep.inherit.to = RelationField({ id_field: 'to_id' });
Deep.inherit.value = RelationField({ id_field: 'value_id' });

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
    if (thisArg) {
      return target.proxy.data.apply(thisArg, args);
    }
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

      if (typeof input == 'undefined') {
        id = Deep.newId();
        _data.byId(id, new Set());
      } else if (typeof input == 'string' && Deep._relations.all.has(input)) {
        id = input;
      } else if (input instanceof Set) {
        id = _data.byData(input);
        if (!id) {
          id = Deep.newId();
          _data.byId(id, input);
        }
      } else throw new Error(`DeepSet.new:!input`);

      const data = target.new(id);

      return data.proxy;
    } case Deep._Inserted: {
      const [elementArg] = args;

      const element = asDeep(elementArg);
      
      if (element) {
        element._deep.use(target, element._deep, Deep._CollectionInserted, [target]);
        Deep.defineCollection(element._deep, target.id);
      }

      const targets = Deep._targets[target.id];
      if (targets) {
        for (const id of targets) {
          const target = new Deep(id);
          target.use(target, target, Deep._SourceInserted, args);
        }
      }

      return worker.super(source, target, stage, args, thisArg);
    } case Deep._Updated: {
      const targets = Deep._targets[target.id];
      if (targets) {
        for (const id of targets) {
          const target = new Deep(id);
          target.use(target, target, Deep._SourceUpdated, args);
        }
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._Deleted: {
      const [elementArg] = args;
      const elementDel = asDeep(elementArg);
      const elementId = elementDel ? elementDel.id : elementArg;

      if (elementDel) {
        elementDel._deep.use(target, elementDel._deep, Deep._CollectionDeleted, [target]);
        Deep.undefineCollection(elementDel._deep, target.id);
      }

      // update reactive targets
      const targets = Deep._targets[target.id];
      if (targets) {
        for (const id of targets) {
          const target = new Deep(id);
          target.use(target, target, Deep._SourceDeleted, args);
        }
      }

      const resultSet = target.proxy.value;
      if (resultSet && resultSet.has(elementId)) {
        resultSet.delete(elementId);
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

// We need to be able to add to deep sets with effect events and deep inputs
const DeepSetAdd = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.add:!data`);

  const el = asDeep(value); // TODO use universal wrapper against asDeep
  const id_to_add = el ? el.id : value;

  if (!data.has(id_to_add)) {
    data.add(id_to_add);
    this._deep.use(this._deep, this._deep, Deep._Inserted, [value, value]);
  }

  return this;
});

// We need to be able to check if deep set has an element with effect events and deep inputs
const DeepSetHas = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.add:!data`);
  return data.has(value);
});

// We need to be able to delete from deep sets with effect events and deep inputs
const DeepSetDelete = DeepFunction(function (this, value) {
  const data = this.data;
  if (!(data instanceof Set)) throw new Error(`DeepSet.delete:!data`);

  const el = asDeep(value); // TODO use universal wrapper against asDeep
  const id_to_delete = el ? el.id : value;

  const deleted = data.delete(id_to_delete);
  if (deleted) this._deep.use(this._deep, this._deep, Deep._Deleted, [value, value]);

  return deleted;
});

// Temporarily we need be able to use set methods natively from deep sets
Deep.inherit.add = DeepSetAdd;
Deep.inherit.has = DeepSetHas;
Deep.inherit.delete = DeepSetDelete;

// Now, we can use sets, and must use it everywhere
// For prevent recursive calls, we need to wrap backwards sets to DeepSet manually
Deep._relations.type.backwards[DeepSet.id] = new DeepSet(Deep._relations.type.backwards[DeepSet.id]);
Deep.Backwards = DeepSet; // now we can use DeepSet everywhere as a backwards set
for (let name of oneRelationFields) { // and apply it to all one relation fields
  const backward = Deep._relations[name].backwards; // they are backwards sets
  for (let id in backward) { // each backward id
    if (!(backward[id] instanceof Deep)) { // if already not a Deep
      backward[id] = new DeepSet(backward[id]); // make it a DeepSet
    }
  }
}

// We must be able to create many (backward) relations from any deep instance
const RelationManyField = new Field(function (worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [options] = args;
      const instance = target.new(); // typed of RelationManyField deep instance
      instance.ref.options = options; // for unsafe inside usage
      return instance.proxy; // return proxified deep instance
    } case Deep._FieldGetter: {
      const name = source.ref.options.name; // unsafe inside usage
      return Deep.getBackward(name, target.id); // already always deep set
    } default: return worker.super(source, target, stage, args);
  }
});

// Now, we can create many (backward) relations from any deep instance
Deep.inherit.typed = RelationManyField({ name: 'type' }); // deeps who relate to it by type
Deep.inherit.out = RelationManyField({ name: 'from' }); // deeps who relate to it by from
Deep.inherit.in = RelationManyField({ name: 'to' }); // deeps who relate to it by to
Deep.inherit.valued = RelationManyField({ name: 'value' }); // deeps who relate to it by value

// For nary operations we need garaunteed native support for Set methods
import './polyfill';

export const DeepSetInterspection = new DeepData((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [sourceA, sourceB] = args;
      if (sourceA?.type_id !== DeepSet.id) throw new Error(`sourceA must be a DeepSet, but got ${sourceA?.type_id} from ${sourceA?.id}`);
      if (sourceB?.type_id !== DeepSet.id) throw new Error(`sourceB must be a DeepSet, but got ${sourceB?.type_id} from ${sourceB?.id}`);
      
      const intersectionData = (sourceA.data as any).intersection(sourceB.data);
      const resultSet = new DeepSet(intersectionData);

      const inspection = target.new();
      const proxy = inspection.proxy;
      proxy.value = resultSet;
      inspection.defineSource(sourceA.id);
      inspection.defineSource(sourceB.id);

      return proxy;
    } case Deep._Destructor: {
      for (const sourceId of target._sources) target.undefineSource(sourceId);
      return worker.super(source, target, stage, args, thisArg);

    } case Deep._SourceInserted: {
      const [elementArg] = args;
      const element = asDeep(elementArg);
      const elementId = element?.id;
      const resultSet = target.proxy.value;
      if (!resultSet) return;

      let inAllSources = true;
      for (const sourceId of target._sources) {
        const source = new Deep(sourceId).proxy;
        if (!source.has(elementId)) {
          inAllSources = false;
          break;
        }
      }

      if (inAllSources) resultSet.add(elementId);
      return;
    } case Deep._SourceDeleted: {
      const [elementArg] = args;
      const element = asDeep(elementArg);
      const elementId = element?.id;
      const resultSet = target.proxy.value;
      if (!resultSet) return;

      if (resultSet.has(elementId)) resultSet.delete(elementId);
      return;
    } case Deep._SourceUpdated: {
      const [elementArg, ...rest] = args;
      const resultSet = target.proxy.value;
      if (!resultSet) return;
      
      if (resultSet.has(elementArg)) target.use(source, target, Deep._Updated, args);
      return;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepSetDifference = new deep((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [sourceA, sourceB] = args;
      if (sourceA?.type_id !== DeepSet.id) throw new Error(`sourceA must be a DeepSet, but got ${sourceA?.type_id} from ${sourceA?.id}`);
      if (sourceB?.type_id !== DeepSet.id) throw new Error(`sourceB must be a DeepSet, but got ${sourceB?.type_id} from ${sourceB?.id}`);
      
      const differenceData = (sourceA.data as any).difference(sourceB.data);
      const resultSet = new DeepSet(differenceData);

      const difference = target.new();
      const proxy = difference.proxy;
      proxy.value = resultSet;
      // The order of defineSource matters for difference calculation
      difference.defineSource(sourceA.id);
      difference.defineSource(sourceB.id);
      
      return proxy;
    } case Deep._Destructor: {
      for (const sourceId of target._sources) {
        target.undefineSource(sourceId);
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._SourceInserted:
    case Deep._SourceDeleted: {
      const [elementArg] = args;
      const element = asDeep(elementArg);
      const elementId = element?.id;
      const resultSet = target.proxy.value;
      if (!resultSet) return;

      const [firstSourceId, secondSourceId] = target._sources;
      if (!firstSourceId || !secondSourceId) return;
      
      const firstSource = new Deep(firstSourceId).proxy;
      const secondSource = new Deep(secondSourceId).proxy;
      
      const shouldContain = firstSource.has(elementId) && !secondSource.has(elementId);
      
      if (shouldContain && !resultSet.has(elementId)) {
        resultSet.add(elementId);
      } else if (!shouldContain && resultSet.has(elementId)) {
        resultSet.delete(elementId);
      }
      return;
    } case Deep._SourceUpdated: {
      const [elementArg, ...rest] = args;
      const resultSet = target.proxy.value;
      if (!resultSet) return;
      
      const element = asDeep(elementArg);
      const elementId = element?.id;
      
      if (resultSet.has(elementId)) target.use(source, target, Deep._Updated, args);
      return;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepSetUnion = new deep((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const [sourceA, sourceB] = args;
      if (sourceA?.type_id !== DeepSet.id) throw new Error(`sourceA must be a DeepSet, but got ${sourceA?.type_id} from ${sourceA?.id}`);
      if (sourceB?.type_id !== DeepSet.id) throw new Error(`sourceB must be a DeepSet, but got ${sourceB?.type_id} from ${sourceB?.id}`);
      
      const unionData = (sourceA.data as any).union(sourceB.data);
      const resultSet = new DeepSet(unionData);

      const union = target.new();
      const proxy = union.proxy;
      proxy.value = resultSet;
      union.defineSource(sourceA.id);
      union.defineSource(sourceB.id);
      return proxy;
    } case Deep._Destructor: {
      for (const sourceId of target._sources) {
        target.undefineSource(sourceId);
      }
      return worker.super(source, target, stage, args, thisArg);
    } case Deep._SourceInserted: {
      const [elementArg] = args;
      const element = asDeep(elementArg);
      const elementId = element?.id;
      const resultSet = target.proxy.value;
      if (!resultSet) return;

      if (!resultSet.has(elementId)) {
        resultSet.add(elementId);
      }
      return;
    } case Deep._SourceDeleted: {
      const [elementArg] = args;
      const element = asDeep(elementArg);
      const elementId = element ? element.id : elementArg;
      const resultSet = target.proxy.value;
      if (!resultSet) return;

      if (!resultSet.has(elementId)) return;

      let stillInAnySource = false;
      for (const sourceId of target._sources) {
        const source = new Deep(sourceId).proxy;
        if (source.has(elementId)) {
          stillInAnySource = true;
          break;
        }
      }
      
      if (!stillInAnySource) {
        resultSet.delete(elementId);
      }
      return;
    } case Deep._SourceUpdated: {
      const [elementArg, ...rest] = args;
      const resultSet = target.proxy.value;
      if (!resultSet) return;
      
      const element = asDeep(elementArg);
      const elementId = element?.id;
      
      if (resultSet.has(elementId)) target.use(source, target, Deep._Updated, args);
      return;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepSetAnd = new deep((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const deepSets = args;
      if (deepSets.length < 2) throw new Error(`DeepSetAnd requires at least two DeepSet`);
      
      for (const deepSet of deepSets) {
        if (!deepSet || deepSet.type_id !== DeepSet.id) {
          throw new Error(`All arguments must be DeepSets, but got ${deepSet?.type_id} from ${deepSet?.id}`);
        }
      }
      
      const and = target.new();
      const proxy = and.proxy;
      
      const inspections: Deep[] = [];
      and.ref._inspections = inspections;

      let currentSet = deepSets[0];
      for (let i = 1; i < deepSets.length; i++) {
        const nextSet = deepSets[i];
        const inspection = new DeepSetInterspection(currentSet, nextSet);
        inspections.push(inspection);
        currentSet = inspection.value;
      }
      
      proxy.value = currentSet;
      
      return proxy;
    } case Deep._Destructor: {
      const inspections = target.ref._inspections || [];
      for (const inspection of inspections) {
        inspection.destroy();
      }
      return worker.super(source, target, stage, args, thisArg);
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

// export const DeepQueryManyRelation = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [sourceDeep, fieldName] = args;
//       if (!sourceDeep || !(sourceDeep instanceof Deep)) throw new Error(`sourceDeep must be a Deep instance`);
//       if (typeof fieldName !== 'string') throw new Error(`fieldName must be a string`);
      
//       // Validate field name
//       if (!validFields.includes(fieldName)) throw new Error(`Invalid field name: ${fieldName}`);
      
//       const queryManyRelation = target.new();
//       const proxy = queryManyRelation.proxy;
      
//       // Store source and field for tracking
//       queryManyRelation.ref._sourceDeep = sourceDeep;
//       queryManyRelation.ref._fieldName = fieldName;
      
//       if (oneRelationFields.includes(fieldName)) {
//         // Single relation field (type, from, to, value)
//         // Get the field value directly
//         const fieldValue = sourceDeep[`${fieldName}_id`];
        
//         let resultSet: Deep;
//         if (fieldValue) {
//           resultSet = new DeepSet(new Set([fieldValue]));
//         } else {
//           resultSet = new DeepSet(new Set());
//         }
        
//         proxy.value = resultSet;
        
//       } else if (manyRelationFields.includes(fieldName)) {
//         // Multiple relation field (typed, out, in, valued) - use existing RelationManyField
//         // This already returns a reactive DeepSet
//         console.log('DeepQueryManyRelation: manyRelationFields case');
//         console.log('fieldName:', fieldName);
//         console.log('sourceDeep.id:', sourceDeep.id);
//         console.log('sourceDeep[fieldName]:', sourceDeep[fieldName]);
//         proxy.value = sourceDeep[fieldName];
//         console.log('proxy.value after assignment:', proxy.value);
//       } else {
//         proxy.value = new DeepSet(new Set());
//       }
      
//       return proxy;
//     } case Deep._Destructor: {
//       // Clean up filter and map if they exist
//       if (target.ref._filteredSet) {
//         target.ref._filteredSet.destroy();
//       }
//       if (target.ref._mappedSet) {
//         target.ref._mappedSet.destroy();
//       }
      
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// export const DeepMapByField = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [sourceSet, fieldName] = args;
//       if (!sourceSet || sourceSet.type_id !== DeepSet.id) {
//         throw new Error(`sourceSet must be a DeepSet, but got ${sourceSet?.type_id} from ${sourceSet?.id}`);
//       }
//       if (typeof fieldName !== 'string') throw new Error(`fieldName must be a string`);
      
//       // Validate field name
//       if (!validFields.includes(fieldName)) throw new Error(`Invalid field name: ${fieldName}`);
      
//       const mapByField = target.new();
//       const proxy = mapByField.proxy;
      
//       // Store parameters for tracking
//       mapByField.ref._sourceSet = sourceSet;
//       mapByField.ref._fieldName = fieldName;
      
//       // Calculate initial mapping: for each element in sourceSet, get its relation field
//       const allElements = new Set<string>();
//       for (const elementId of sourceSet.data) {
//         const element = new Deep(elementId);
        
//         if (oneRelationFields.includes(fieldName)) {
//           // Single relation field
//           const singleValue = element[`${fieldName}_id`];
//           if (singleValue) {
//             allElements.add(singleValue);
//           }
//         } else if (manyRelationFields.includes(fieldName)) {
//           // Multiple relation field - get backward relations
//           const backwardField = element[fieldName];
//           if (backwardField && backwardField.data) {
//             for (const item of backwardField.data) {
//               allElements.add(item);
//             }
//           }
//         }
//       }
      
//       const resultSet = new DeepSet(allElements);
//       proxy.value = resultSet;
      
//       // Set up tracking
//       mapByField.defineSource(sourceSet);
      
//       return proxy;
//     } case Deep._Destructor: {
//       for (const sourceId in target._sources) {
//         target.undefineSource(target._sources[sourceId]);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceInserted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const fieldName = target.ref._fieldName;
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       // Subscribe to new element changes
//       Deep.defineCollection(element, target.id);
      
//       if (oneRelationFields.includes(fieldName)) {
//         // Single relation field
//         const singleValue = element[`${fieldName}_id`];
//         if (singleValue && !resultSet.has(singleValue)) {
//           resultSet.add(singleValue);
//         }
//       } else if (manyRelationFields.includes(fieldName)) {
//         // Multiple relation field - get backward relations
//         const backwardField = element[fieldName];
//         if (backwardField && backwardField.data) {
//           for (const item of backwardField.data) {
//             if (!resultSet.has(item)) {
//               resultSet.add(item);
//             }
//           }
//         }
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceDeleted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       // Unsubscribe from deleted element changes
//       const elementProxyDel = elementArg as any;
//       const elementDel: Deep | undefined = elementArg instanceof Deep ? elementArg as Deep : (elementProxyDel && elementProxyDel._deep ? elementProxyDel._deep : undefined);
//       const removedId = elementDel ? elementDel.id : elementArg;
//       if (elementDel) {
//         elementDel._deep.use(target, elementDel._deep, Deep._CollectionDeleted, [target]);
//         Deep.undefineCollection(elementDel._deep, target.id);
//       }
      
//       const fieldName = target.ref._fieldName;
//       const sourceSet = target.ref._sourceSet;

//       // element was removed, so simply remove from result if present
//       if (resultSet.has(removedId)) {
//         resultSet.delete(removedId);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceUpdated: {
//       const [elementArg, ...rest] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       if (resultSet.has(elementId)) target.use(source, target, Deep._Updated, args);
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// export const DeepQueryField = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [fieldName, fieldValue] = args;
//       if (typeof fieldName !== 'string') throw new Error(`fieldName must be a string`);
      
//       // Validate field name
//       if (!validFields.includes(fieldName)) throw new Error(`Invalid field name: ${fieldName}`);
      
//       const queryField = target.new();
//       const proxy = queryField.proxy;
      
//       // Handle 'id' field specially
//       if (fieldName === 'id') {
//         let targetElement: Deep;
        
//         if (fieldValue instanceof Deep) {
//           targetElement = fieldValue;
//         } else if (typeof fieldValue === 'string') {
//           targetElement = new Deep(fieldValue);
//         } else {
//           throw new Error('id field can only be called with Deep instances or strings');
//         }
        
//         const resultSet = new DeepSet(new Set([targetElement.id]));
//         proxy.value = resultSet;
//         return proxy;
//       }
      
//       // Field inversions for relation fields
//       const fieldInversions: { [key: string]: string } = {
//         'type': 'typed',
//         'typed': 'type',
//         'from': 'out',
//         'out': 'from',
//         'to': 'in',
//         'in': 'to',
//         'value': 'valued',
//         'valued': 'value'
//       };
      
//       const relationField = fieldInversions[fieldName];
//       if (!relationField) {
//         throw new Error(`Unknown field for inversion: ${fieldName}`);
//       }
      
//       // Handle Deep instance
//       if (fieldValue instanceof Deep) {
//         const relationQuery = new DeepQueryManyRelation(fieldValue, relationField);
//         proxy.value = relationQuery.value;
        
//         // Store for cleanup
//         queryField.ref._relationQuery = relationQuery;
        
//         return proxy;
//       }
//       // Handle string
//       else if (typeof fieldValue === 'string') {
//         // For string values, we need to check if it's a valid Deep ID
//         if (!Deep._relations.all.has(fieldValue)) {
//           throw new Error(`String value ${fieldValue} is not a valid Deep ID`);
//         }
        
//         const deepInstance = new Deep(fieldValue);
//         const relationQuery = new DeepQueryManyRelation(deepInstance, relationField);
//         proxy.value = relationQuery.value;
        
//         // Store for cleanup
//         queryField.ref._relationQuery = relationQuery;
        
//         return proxy;
//       }
//       // Handle plain object (recursive query)
//       else if (fieldValue && typeof fieldValue === 'object' && !Array.isArray(fieldValue)) {
//         // For now, throw error as we haven't implemented DeepQuery yet
//         throw new Error('Plain object queries not yet implemented');
//       }
//       else {
//         throw new Error('queryField can only be called with Deep instances, strings or plain objects');
//       }
//     } case Deep._Destructor: {
//       // Clean up relation query if it exists
//       if (target.ref._relationQuery) {
//         target.ref._relationQuery.destroy();
//       }
      
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// export const DeepQuery = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [criteria] = args;
//       if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) {
//         throw new Error('Query criteria must be a plain object');
//       }
      
//       const query = target.new();
//       const proxy = query.proxy;
      
//       // Extract operators and order_by from criteria (not implemented yet)
//       const { _not, _or, _and, order_by, ...mainCriteria } = criteria;
      
//       if (_not || _or || _and || order_by) {
//         throw new Error('Advanced query operators not yet implemented');
//       }
      
//       // Collect queryField results for main criteria
//       const queryFieldResults: Deep[] = [];
      
//       for (const [field, value] of Object.entries(mainCriteria)) {
//         const fieldResult = new DeepQueryField(field, value);
//         if (fieldResult.value) {
//           queryFieldResults.push(fieldResult.value);
//         }
//         // Store for cleanup
//         query.ref._queryFields = query.ref._queryFields || [];
//         query.ref._queryFields.push(fieldResult);
//       }
      
//       // If no criteria, return empty set
//       if (queryFieldResults.length === 0) {
//         const resultSet = new DeepSet(new Set());
//         proxy.value = resultSet;
//         return proxy;
//       }
      
//       // If single criteria, return that result
//       if (queryFieldResults.length === 1) {
//         proxy.value = queryFieldResults[0];
//         return proxy;
//       }
      
//       // Multiple criteria - use And operation to intersect all results
//       const andOperation = new DeepAnd(...queryFieldResults);
//       proxy.value = andOperation.value;
      
//       // Store for cleanup
//       query.ref._andOperation = andOperation;
      
//       return proxy;
//     } case Deep._Destructor: {
//       // Clean up query fields if they exist
//       if (target.ref._queryFields) {
//         for (const queryField of target.ref._queryFields) {
//           queryField.destroy();
//         }
//       }
      
//       // Clean up and operation if it exists
//       if (target.ref._andOperation) {
//         target.ref._andOperation.destroy();
//       }
      
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// // Utility to normalise an id or Deep into Deep instance (internal use)
// function asDeep(obj: any): Deep | undefined {
//   if (obj instanceof Deep) return obj;
//   if (typeof obj === 'string') return new Deep(obj);
//   return undefined;
// }

// export const DeepFilter = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [sourceSet, filterFunction] = args;
//       if (!sourceSet || sourceSet.type_id !== DeepSet.id) {
//         throw new Error(`sourceSet must be a DeepSet, but got ${sourceSet?.type_id} from ${sourceSet?.id}`);
//       }
//       if (typeof filterFunction !== 'function') {
//         throw new Error(`filterFunction must be a function`);
//       }
      
//       const filter = target.new();
//       const proxy = filter.proxy;
      
//       // Store parameters for tracking
//       filter.ref._sourceSet = sourceSet;
//       filter.ref._filterFunction = filterFunction;
      
//       // Calculate initial filtered set
//       const filteredElements = new Set<string>();
//       for (const elementId of sourceSet.data) {
//         const element = new Deep(elementId);
//         if (filterFunction(element)) {
//           filteredElements.add(elementId);
//         }
//         // Subscribe to element changes by adding filter as a virtual collection
//         Deep.defineCollection(element._deep, filter.id);
//       }
      
//       const resultSet = new DeepSet(filteredElements);
//       proxy.value = resultSet;
      
//       // Set up tracking
//       filter.defineSource(sourceSet);
      
//       return proxy;
//     } case Deep._Destructor: {
//       // Clean up element subscriptions
//       const sourceSet = target.ref._sourceSet;
//       if (sourceSet && sourceSet.data) {
//         for (const elementId of sourceSet.data) {
//           const element = new Deep(elementId);
//           Deep.undefineCollection(element._deep, target.id);
//         }
//       }
      
//       for (const sourceId in target._sources) {
//         target.undefineSource(target._sources[sourceId]);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceInserted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const filterFunction = target.ref._filterFunction;
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       // Subscribe to new element changes
//       Deep.defineCollection(element._deep, target.id);
      
//       if (resultSet && filterFunction && filterFunction(element) && !resultSet.has(elementId)) {
//         resultSet.add(elementId);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceDeleted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       // Unsubscribe from deleted element changes
//       const elementProxyDel = elementArg as any;
//       const elementDel: Deep | undefined = elementArg instanceof Deep ? elementArg as Deep : (elementProxyDel && elementProxyDel._deep ? elementProxyDel._deep : undefined);
//       const removedId = elementDel ? elementDel.id : elementArg;
//       if (elementDel) {
//         elementDel._deep.use(target, elementDel._deep, Deep._CollectionDeleted, [target]);
//         Deep.undefineCollection(elementDel._deep, target.id);
//       }
      
//       const filterFunction = target.ref._filterFunction;
//       const sourceSet = target.ref._sourceSet;
      
//       // element was removed, so simply remove from result if present
//       if (resultSet.has(removedId)) {
//         resultSet.delete(removedId);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceUpdated: {
//       const [elementArg, ...rest] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const filterFunction = target.ref._filterFunction;
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       const shouldBeIncluded = filterFunction(element);
//       const isCurrentlyIncluded = resultSet.has(elementId);
      
//       if (shouldBeIncluded && !isCurrentlyIncluded) {
//         resultSet.add(elementId);
//       } else if (!shouldBeIncluded && isCurrentlyIncluded) {
//         resultSet.delete(elementId);
//       }
      
//       if (resultSet.has(elementId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._Updated: {
//       // This handles when an element in the source set changes
//       const [elementArg, ...rest] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const filterFunction = target.ref._filterFunction;
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       const shouldBeIncluded = filterFunction(element);
//       const isCurrentlyIncluded = resultSet.has(elementId);
      
//       if (shouldBeIncluded && !isCurrentlyIncluded) {
//         resultSet.add(elementId);
//       } else if (!shouldBeIncluded && isCurrentlyIncluded) {
//         resultSet.delete(elementId);
//       }
      
//       if (resultSet.has(elementId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._CollectionUpdate: {
//       // This handles when an element in the source set has its properties changed
//       const elementId = source.id; // The element that changed is the source
//       const [fieldName, newValue, oldValue] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const filterFunction = target.ref._filterFunction;
//       const element = new Deep(elementId);
      
//       const shouldBeIncluded = filterFunction(element);
//       const isCurrentlyIncluded = resultSet.has(elementId);
      
//       if (shouldBeIncluded && !isCurrentlyIncluded) {
//         resultSet.add(elementId);
//       } else if (!shouldBeIncluded && isCurrentlyIncluded) {
//         resultSet.delete(elementId);
//       }
      
//       if (resultSet.has(elementId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// export const DeepMap = new DeepData((worker, source, target, stage, args, thisArg) => {
//   switch (stage) {
//     case Deep._Apply:
//     case Deep._New: {
//       const [sourceSet, mapFunction] = args;
//       if (!sourceSet || sourceSet.type_id !== DeepSet.id) {
//         throw new Error(`sourceSet must be a DeepSet, but got ${sourceSet?.type_id} from ${sourceSet?.id}`);
//       }
//       if (typeof mapFunction !== 'function') {
//         throw new Error(`mapFunction must be a function`);
//       }
      
//       const map = target.new();
//       const proxy = map.proxy;
      
//       // Store parameters for tracking
//       map.ref._sourceSet = sourceSet;
//       map.ref._mapFunction = mapFunction;
      
//       // Calculate initial mapped set
//       const mappedElements = new Set<string>();
//       for (const elementId of sourceSet.data) {
//         const element = new Deep(elementId);
//         const mappedValue = mapFunction(element);
        
//         if (mappedValue instanceof Deep) {
//           mappedElements.add(mappedValue.id);
//         } else if (typeof mappedValue === 'string' && Deep._relations.all.has(mappedValue)) {
//           mappedElements.add(mappedValue);
//         }
        
//         // Subscribe to element changes by adding map as a virtual collection
//         Deep.defineCollection(element._deep, map.id);
//       }
      
//       const resultSet = new DeepSet(mappedElements);
//       proxy.value = resultSet;
      
//       // Set up tracking
//       map.defineSource(sourceSet);
      
//       return proxy;
//     } case Deep._Destructor: {
//       // Clean up element subscriptions
//       const sourceSet = target.ref._sourceSet;
//       if (sourceSet && sourceSet.data) {
//         for (const elementId of sourceSet.data) {
//           const element = new Deep(elementId);
//           Deep.undefineCollection(element._deep, target.id);
//         }
//       }
      
//       for (const sourceId in target._sources) {
//         target.undefineSource(target._sources[sourceId]);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceInserted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const mapFunction = target.ref._mapFunction;
//       const element = elementArg instanceof Deep ? elementArg : new Deep(elementArg);
//       const elementId = element?.id;
      
//       // Subscribe to new element changes
//       Deep.defineCollection(element._deep, target.id);
      
//       const mappedValue = mapFunction(element);
      
//       if (mappedValue instanceof Deep) {
//         if (!resultSet.has(mappedValue.id)) {
//           resultSet.add(mappedValue.id);
//         }
//       } else if (typeof mappedValue === 'string' && Deep._relations.all.has(mappedValue)) {
//         if (!resultSet.has(mappedValue)) {
//           resultSet.add(mappedValue);
//         }
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceDeleted: {
//       const [elementArg] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       // Unsubscribe from deleted element changes
//       const elementProxyDel = elementArg as any;
//       const elementDel: Deep | undefined = elementArg instanceof Deep ? elementArg as Deep : (elementProxyDel && elementProxyDel._deep ? elementProxyDel._deep : undefined);
//       const removedId = elementDel ? elementDel.id : elementArg;
//       if (elementDel) {
//         elementDel._deep.use(target, elementDel._deep, Deep._CollectionDeleted, [target]);
//         Deep.undefineCollection(elementDel._deep, target.id);
//       }
      
//       const mapFunction = target.ref._mapFunction;
//       const sourceSet = target.ref._sourceSet;
      
//       // When element is removed, we need to recalculate which mapped values should be removed
//       const element = elementDel || new Deep(elementArg);
//       const mappedValue = mapFunction(element);
      
//       let mappedValueId: string | undefined;
//       if (mappedValue instanceof Deep) {
//         mappedValueId = mappedValue.id;
//       } else if (typeof mappedValue === 'string' && Deep._relations.all.has(mappedValue)) {
//         mappedValueId = mappedValue;
//       }
      
//       if (mappedValueId && resultSet.has(mappedValueId)) {
//         resultSet.delete(mappedValueId);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._SourceUpdated: {
//       const [elementArg, ...rest] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const mapFunction = target.ref._mapFunction;
//       const sourceSet = target.ref._sourceSet;
      
//       // Recalculate mapping for the updated element
//       const element = new Deep(elementArg);
//       const newMappedValue = mapFunction(element);
      
//       let newMappedValueId: string | undefined;
//       if (newMappedValue instanceof Deep) {
//         newMappedValueId = newMappedValue.id;
//       } else if (typeof newMappedValue === 'string' && Deep._relations.all.has(newMappedValue)) {
//         newMappedValueId = newMappedValue;
//       }
      
//       // Add new mapped value if it doesn't exist
//       if (newMappedValueId && !resultSet.has(newMappedValueId)) {
//         resultSet.add(newMappedValueId);
//       }
      
//       // Note: We don't remove old mapped values here because they might be produced by other elements
//       // Full recalculation would be needed for that, but it's expensive
      
//       if (newMappedValueId && resultSet.has(newMappedValueId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._Updated: {
//       // This handles when an element in the source set changes
//       const [elementArg, ...rest] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const mapFunction = target.ref._mapFunction;
//       const sourceSet = target.ref._sourceSet;
      
//       // Recalculate mapping for the updated element
//       const element = new Deep(elementArg);
//       const newMappedValue = mapFunction(element);
      
//       let newMappedValueId: string | undefined;
//       if (newMappedValue instanceof Deep) {
//         newMappedValueId = newMappedValue.id;
//       } else if (typeof newMappedValue === 'string' && Deep._relations.all.has(newMappedValue)) {
//         newMappedValueId = newMappedValue;
//       }
      
//       // Add new mapped value if it doesn't exist
//       if (newMappedValueId && !resultSet.has(newMappedValueId)) {
//         resultSet.add(newMappedValueId);
//       }
      
//       // Note: We don't remove old mapped values here because they might be produced by other elements
//       // Full recalculation would be needed for that, but it's expensive
      
//       if (newMappedValueId && resultSet.has(newMappedValueId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } case Deep._CollectionUpdate: {
//       // This handles when an element in the source set has its properties changed
//       const elementId = source.id; // The element that changed is the source
//       const [fieldName, newValue, oldValue] = args;
//       const resultSet = target.proxy.value;
//       if (!resultSet) return;
      
//       const mapFunction = target.ref._mapFunction;
//       const sourceSet = target.ref._sourceSet;
      
//       // Recalculate mapping for the updated element
//       const element = new Deep(elementId);
//       const newMappedValue = mapFunction(element);
      
//       let newMappedValueId: string | undefined;
//       if (newMappedValue instanceof Deep) {
//         newMappedValueId = newMappedValue.id;
//       } else if (typeof newMappedValue === 'string' && Deep._relations.all.has(newMappedValue)) {
//         newMappedValueId = newMappedValue;
//       }
      
//       // Add new mapped value if it doesn't exist
//       if (newMappedValueId && !resultSet.has(newMappedValueId)) {
//         resultSet.add(newMappedValueId);
//       }
      
//       // Note: We don't remove old mapped values here because they might be produced by other elements
//       // Full recalculation would be needed for that, but it's expensive
      
//       if (newMappedValueId && resultSet.has(newMappedValueId)) {
//         target.use(source, target, Deep._Updated, args);
//       }
//       return worker.super(source, target, stage, args, thisArg);
//     } default: return worker.super(source, target, stage, args, thisArg);
//   }
// });

// deep.filter = DeepFunction(function (this, filterFunction) {
//   if (this.type_id !== DeepSet.id) {
//     throw new Error(`filter can only be called on DeepSet instances`);
//   }
//   return new DeepFilter(this, filterFunction);
// });

// deep.map = DeepFunction(function (this, mapFunction) {
//   if (this.type_id !== DeepSet.id) {
//     throw new Error(`map can only be called on DeepSet instances`);
//   }
//   return new DeepMap(this, mapFunction);
// });

// // Add relation fields to Deep.inherit so they are available on all Deep instances
// Deep.inherit['typed'] = deep.typed;
// Deep.inherit['out'] = deep.out;
// Deep.inherit['in'] = deep.in;
// Deep.inherit['valued'] = deep.valued;

