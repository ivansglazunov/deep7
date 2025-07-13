import './polyfill';
import { v4 as uuidv4 } from 'uuid';
import { Relation as _Relation } from './relation';
import { _Data as _Data } from './_data';
import { newDelter } from './delter';
import { newArray, newArrayPush, newArrayAdd, newArrayHas, newArrayDelete, newArraySet } from './array';
import { newSet, newSetAdd, newSetHas, newSetDelete, newSetSet } from './set';
import { newString } from './string';
import { newPatcher } from './patcher';
import { newQuery, newQueryField, newQueryManyRelation } from './query';

export function newDeep() {
  // We must know all relation fields to be able to use them in deep sets in future
  const oneRelationFields = ['type', 'from', 'to', 'value'];
  const manyRelationFields = ['typed', 'out', 'in', 'valued'];
  const validFields = ['id', 'type', 'from', 'to', 'value', 'typed', 'out', 'in', 'valued'];
  const fieldInvert = {
    type: 'typed',
    from: 'out',
    to: 'in',
    value: 'valued',
    typed: 'type',
    out: 'from',
    in: 'to',
    valued: 'value',
  };

  function isPlainObject(obj) {
    if (obj === null || typeof obj !== 'object' || obj.nodeType || (obj.constructor && !Object.prototype.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf'))) {
      return false;
    }
    return true;
  }

  // Effects are functions that are called when some event happens
  // We make that as analog of React useEffect but for everything
  // It's help to drop dependencies to event emitter model
  type EffectHandler = (worker: Deep, source: Deep, target: Deep, stage, args: any[], thisArg?: any) => any;

  interface IEffectAsObject {
    [key: string]: EffectHandler;
  }

  type Effect = EffectHandler | IEffectAsObject;

  // Just for easy reading
  type Id = string;

  const _all = new Set();

  // We are is Deep, Deep is everything and nothing
  // Deep is a class that is a base for all deep instances
  class Deep extends Function {
    static Deep = Deep; // access to Deep class from any deep instance
    get _deep(): Deep { return this; } // access to Deep class instance from instance and proxified instance

    // Promise queue management
    private static _promiseQueues: { [id: string]: Promise<any> } = {};

    get promise(): Promise<void> {
      // If no queue exists, create a resolved promise
      if (!Deep._promiseQueues[this.id]) {
        Deep._promiseQueues[this.id] = Promise.resolve();
      }
      return Deep._promiseQueues[this.id];
    }

    set promise(value: () => any) {
      if (typeof value !== 'function') {
        throw new Error('deep.promise: Expected a function');
      }

      // Create a new task that will be chained to the end of the queue
      const task = async () => {
        try {
          const result = value();
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          console.error('Error in promise task:', error);
          // Continue with the next task even if current one fails
        }
      };

      // Chain the new task to the end of the queue
      if (!Deep._promiseQueues[this.id]) {
        // If no queue exists, start with the task
        Deep._promiseQueues[this.id] = task();
      } else {
        // Otherwise chain it to the end of the queue
        Deep._promiseQueues[this.id] = Deep._promiseQueues[this.id]
          .then(() => task())
          .catch(error => {
            console.error('Error in promise queue:', error);
            // Continue with the next task even if current one fails
          });
      }
    }

    static oneRelationFields = oneRelationFields;
    static manyRelationFields = manyRelationFields;
    static validFields = validFields;
    static fieldInvert = fieldInvert;

    // cross stages unsafe inside effect cross event memory
    static _refs = new Map<Id, any>(); // global memory
    get ref(): any { // easy access from instance
      let ref = Deep._refs.get(this.id);
      if (!ref) Deep._refs.set(this.id, ref = {}); // create if not exists
      return ref;
    }

    // id management
    static newId(): Id { return uuidv4(); } // only way to generate new id
    private __id: undefined | Id; // private id field
    get _id(): undefined | Id { return this.__id; } // no action way to get id
    get id(): Id { return this.__id || (this.id = Deep.newId()); } // get or generate id
    set id(id: Id) {
      if (id == this.__id) return;
      if (!!this.__id) throw new Error(`deep.id:once (${this.__id} = ${id})`); // id can be set only once per instance
      if (typeof id != 'string') throw new Error(`deep.id:string`); // id is string only
      this.__id = id;
    }

    // comparators
    is(deepOrId: Deep | Id): boolean {
      if (typeof deepOrId == 'string') return deepOrId == this.id;
      if (deepOrId instanceof Deep) return deepOrId.id == this.id;
      return false;
    }
    typeof(deepOrId: Deep | Id): boolean {
      let id;
      if (typeof deepOrId == 'string') id = deepOrId;
      else if (deepOrId instanceof Deep) id = deepOrId.id;
      else throw new Error(`deep.typeof:${deepOrId}`);

      let type_id = this.type_id; // Начинаем с типа this
      while (type_id) {
        if (type_id == id) return true; // Если нашли deepOrId в иерархии типов this
        const next_type_id = Deep.getForward('type', type_id);
        if (next_type_id == type_id) break; // Избегаем бесконечного цикла
        type_id = next_type_id;
      }
      return false;
    }

    // We need to connect anything to deep's as properties atomically
    // But without query engine we can't do it, and temporary solution needed as simple object
    static _unsafeInherit: { [id: Id]: Deep } = {};

    // promise queue management
    private static _promises: { [id: string]: Array<(...args: any[]) => any> } = {};

    // effect management
    static effects: { [id: string]: Effect } = {}; // effects defined by id
    static effect: EffectHandler = (worker, source, target, event, args) => {
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
          else if (typeof input == 'function' || isPlainObject(input)) {
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
            case 'Deep': return Deep;
            case 'proxy': return target.proxy;

            case 'asDeep': return asDeep;

            case 'id': return target.id;
            case 'ref': return target.ref;

            case 'is': return (deepOrId: Deep | Id) => target.is(deepOrId);
            case 'typeof': return (deepOrId: Deep | Id) => target.typeof(deepOrId);

            case 'promise': return target.promise;

            case '_collections': return target.ref._collections || new Set();
            case '_sources': return target._sources;
            case '_targets': return target._targets;

            case 'data': { // We must access data, not only from data owned deeps
              if (!Deep._relations.all.has(target.id)) return undefined;
              if (target.value_id) return target.proxy.value.data; // but from all deeps that related to target by value relation vector
              return undefined;
            } case 'destroy': return () => target.destroy();

            case 'toString': return () => `${target.id}`;
            case 'valueOf': return () => `${target.id}`;

            default: {
              if (Deep._Inherit) { // activates only after query support is implemented
                const inherited = target.inherit; // inherited can be undefined if destructed
                if (inherited && key in inherited) {
                  const field = inherited[key]?._deep;
                  if (field) {
                    if (field.typeof(DeepField.id)) return field.use(field, target, Deep._FieldGetter, [key]);
                    else return inherited[key];
                    // if (field.type_id == DeepFunction.id) return inherited[key];
                    // return field.use(field, target, Deep._FieldGetter, [key]);
                  }
                }
              } else {
                const inherited = Deep._unsafeInherit[key];
                if (inherited && inherited._deep) {
                  if (inherited._deep.typeof(DeepField.id)) return inherited._deep.use(inherited._deep, target, Deep._FieldGetter, [key]);
                  return inherited;
                } else return;
                //   const field = inherited._deep;
                //   if (field) {
                //     if (field.type_id == Field.id) return field.use(field, target, Deep._FieldGetter, [key]);
                //     return inherited;
                //   }
                // }
              }
              return;
            }
          }
        } case Deep._Setter: {
          const [key, value] = args;
          if (key == 'promise') return target.promise = value;
          if (Deep._Inherit) { // activates only after query support is implemented
            const inherited = target.inherit;  // inherited can be undefined if destructed
            if (inherited && key in inherited) {
              return inherited[key]._deep.use(inherited[key]._deep, target, Deep._FieldSetter, [key, value]);
            }
            const _inherited = target._inherit;
            if (value instanceof Deep) {
              new DeepInherit(target.proxy, key, value.proxy)
            } else throw new Error(`deep.setter:${key}:!Deep`);
          } else {
            const inherited = Deep._unsafeInherit[key];
            if (inherited) inherited._deep.use(inherited._deep, target, Deep._FieldSetter, [key, value]);
            else Deep._unsafeInherit[key] = value;
          }
          return;
        } case Deep._Deleter: {
          const [key] = args;
          if (Deep._Inherit) {
            const inherited = target.inherit;
            if (inherited && key in inherited) inherited[key]._deep.use(inherited[key]._deep, target, Deep._FieldDeleter, [key]);
            return;
          } else {
            const inherited = Deep._unsafeInherit[key];
            if (inherited) inherited._deep.use(inherited._deep, target, Deep._FieldDeleter, [key]);
          }
          return;
        } case Deep._Change: {
          const [name, newValue, oldValue] = args;
          if (name == 'type' && target._inherit) target.inherit = target._inherit;
          const collections = target.ref._collections;
          if (collections) {
            for (const collectionId of collections) {
              const collection = new Deep(collectionId);
              collection.use(target, collection, Deep._Updated, [target, ...args]);
            }
          }
          return;
        } default: return; // not inherit other event cases
      }
    };
    use(source: Deep, target: Deep, stage: any, args: any[], _this?: any): any {
      const current = Deep.effects[this.id];
      if (current) {
        if (typeof current === 'function') {
          return current(this, source, target, stage, args, _this);
        } else {
          const handler = current[stage];
          if (typeof handler === 'function') {
            return handler(this, source, target, stage, args, _this);
          }
        }
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
          if (typeof typeEffect === 'function') {
            return typeEffect(typeDeep, source, target, stage, args, _this);
          } else {
            const handler = typeEffect[stage];
            if (typeof handler === 'function') {
              return handler(typeDeep, source, target, stage, args, _this);
            }
          }
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
      let _id;
      if (id) _id = this.id = id;
      else _id = this.id;
      if (!Deep._relations._all.has(_id)) Deep._relations.all.add(_id);
      // this._stack = new Error().stack?.split('\n').slice(1).join('\n');
    }
    private destructor(args) {
      this.super(this, this, Deep._Destructor, args); // call destructor of deep up by typing vector
      Deep._refs.delete(this.id); // delete from refs memory
      Deep._relations.all.delete(this.id); // forgot deep existing

      if (this?.type_id) {
        Deep._relations.type.backwards?.[this?.type_id]?.delete(this.id);
        Deep._relations.type.forwards[this.id] = undefined;
      }

      if (this?.from_id) {
        Deep._relations.from.backwards?.[this?.from_id]?.delete(this.id);
        Deep._relations.from.forwards[this.id] = undefined;
      }

      if (this?.to_id) {
        Deep._relations.to.backwards?.[this?.to_id]?.delete(this.id);
        Deep._relations.to.forwards[this.id] = undefined;
      }

      if (this?.value_id) {
        Deep._relations.value.backwards?.[this?.value_id]?.delete(this.id);
        Deep._relations.value.forwards[this.id] = undefined;
      }

      delete Deep.effects[this.id]; // delete effect if exists
      delete Deep._many[this.id]; // delete many cached set if exists
      delete Deep._inherits[this.id]; // delete inherit object if exists
    }
    public destroy(...args: []) { this.destructor(args); } // destroy deep up by typing vector and unsafe memory

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
    static _Inherit: undefined | Id;

    static _relations: any = {
      _all: _all,
      all: _all,
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

    get type_id(): Id | undefined { return Deep.getForward('type', this.id); }
    get from_id(): Id | undefined { return Deep.getForward('from', this.id); }
    get to_id(): Id | undefined { return Deep.getForward('to', this.id); }
    get value_id(): Id | undefined { return Deep.getForward('value', this.id); }

    // We need to percieve deep as a set { deep }, and store it
    static _many: { [id: Id]: string } = {}; // many relation sets for deduplication

    // Inherit system management
    static _inherits: { [id: Id]: any } = {}; // inherit objects storage

    // Deep static method Deep.superInherit(instance.id) getForward by type, if that have inherit object - return it, otherwise return deep.superInherit(type_id)
    static superInherit(instanceId: string): any {
      const typeId = Deep.getForward('type', instanceId);
      if (!typeId) return undefined;
      if (Deep._inherits[typeId]) return Deep._inherits[typeId];
      if (instanceId == typeId) Deep.setInherit(instanceId, {});
      else return Deep.superInherit(typeId);
    }

    get _inherit(): any { return Deep._inherits[this.id]; }
    // Deep instance getter - deep.inherit returns self inherit or call deep.superInherit(this.id)
    get inherit(): any { return Deep._inherits[this.id] || Deep.superInherit(this.id); }

    // Deep instance setter - deep.inherit, if value undefined - drop inherit object from Deep._inherits, if value is object - set it as inherit object
    set inherit(value: any) { Deep.setInherit(this.id, value); }
    static setInherit(id: Id, value: any) {
      if (value === undefined) {
        delete Deep._inherits[id];
      } else if (value && typeof value === 'object') {
        Deep._inherits[id] = value;
        if (id != deep.id) {
          const superInherit = Deep.superInherit(id);
          if (value != superInherit) Object.setPrototypeOf(value, superInherit);
        }
      } else {
        throw new Error(`Deep.inherit:!object`);
      }
    }

    [key: string]: any;
  }

  // Utility to normalise an id or Deep into Deep instance (internal use)
  function asDeep(input: any): Deep | undefined {
    if (input instanceof Deep) return input._deep;
    if (input && typeof input === 'object' && input._deep instanceof Deep) return input._deep;
    if (typeof input === 'string' && Deep._relations._all.has(input)) return new Deep(input);
    return undefined;
  }

  const deep = new Deep().proxy;

  const New = new deep(Deep._New);
  const Constructor = new deep(Deep._Constructor);
  const Apply = new deep(Deep._Apply);
  const Destructor = new deep(Deep._Destructor);
  const Getter = new deep(Deep._Getter);
  const Setter = new deep(Deep._Setter);
  const Deleter = new deep(Deep._Deleter);
  const Inserted = new deep(Deep._Inserted);
  const Updated = new deep(Deep._Updated);
  const Deleted = new deep(Deep._Deleted);
  const Change = new deep(Deep._Change);
  const CollectionInserted = new deep(Deep._CollectionInserted);
  const CollectionDeleted = new deep(Deep._CollectionDeleted);
  const CollectionUpdate = new deep(Deep._CollectionUpdate);
  const FieldGetter = new deep(Deep._FieldGetter);
  const FieldSetter = new deep(Deep._FieldSetter);
  const FieldDeleter = new deep(Deep._FieldDeleter);

  const DeepField = new deep();

  const RelationIdField = new DeepField(function (worker, source, target, stage, args) {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const [options] = args;
        Deep._relations[options.name] = Deep._relations[options.name] || { forwards: {}, backwards: {} };
        const instance = target.new();
        instance.ref.options = options;
        return instance.proxy;
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
  Deep._unsafeInherit.type_id = RelationIdField({ name: 'type', default: deep.id });
  Deep._unsafeInherit.from_id = RelationIdField({ name: 'from', default: undefined });
  Deep._unsafeInherit.to_id = RelationIdField({ name: 'to', default: undefined });
  Deep._unsafeInherit.value_id = RelationIdField({ name: 'value', default: undefined });

  const RelationField = new DeepField(function (worker, source, target, stage, args) {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const [options] = args;
        const instance = target.new();
        instance.ref.options = options;
        return instance.proxy;
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
  Deep._unsafeInherit.type = RelationField({ id_field: 'type_id' });
  Deep._unsafeInherit.from = RelationField({ id_field: 'from_id' });
  Deep._unsafeInherit.to = RelationField({ id_field: 'to_id' });
  Deep._unsafeInherit.value = RelationField({ id_field: 'value_id' });

  const DeepData = Deep._unsafeInherit.Data = new deep((worker, source, target, stage, args, thisArg) => {
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
            // const _data = Deep._refs.get(target.type_id)?._data; // TODO: use it
            const type = target.proxy.type;
            const _data = type.ref._data;
            if (!_data) {
              throw new Error(`deep.Data.data:!target.proxy.type.ref._data`);
            }

            return _data.byId(target.id);
          } default: return worker.super(source, target, stage, args, thisArg);
        }
      } case Deep._Destructor: {
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.Set.new:!.type.ref._data`);
        _data.byId(target.id, undefined);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  const DeepFunction = Deep._unsafeInherit.Function = new DeepData((worker, source, target, stage, args, thisArg) => {
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
        if (!_data) throw new Error(`deep.Function.new:!.type.ref._data`);

        let id: string | undefined = undefined;
        if (typeof input == 'string') id = input;
        else if (typeof input == 'function') id = _data.byData(input);

        const data = target.new(id);
        const exists = _data.byId(data.id);
        if (typeof exists != 'function') {
          if (typeof input == 'function') _data.byId(data.id, input);
          else throw new Error(`deep.Function.new:!function`);
        }

        return data.proxy;
      } case Deep._Destructor: {
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.Set.new:!.type.ref._data`);
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

  const DeepSet = newSet(deep, DeepData);

  // We need to be able to add to deep sets with effect events and deep inputs
  const DeepSetAdd = newSetAdd(deep);
  const DeepSetHas = newSetHas(deep);
  const DeepSetDelete = newSetDelete(deep);
  const DeepSetSet = newSetSet(deep);

  // Temporarily we need be able to use set methods natively from deep sets
  Deep._unsafeInherit.add = DeepSetAdd;
  Deep._unsafeInherit.has = DeepSetHas;
  Deep._unsafeInherit.delete = DeepSetDelete;

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

  // And all relations must be deep set too
  const allId = Deep.newId(); // manually create set
  Deep._relations.all.add(allId);
  Deep.setForward('type', allId, DeepSet.id);
  DeepSet.ref._data.byId(allId, Deep._relations.all); // for prevent recursive calls
  Deep._relations.all = new DeepSet(allId);

  // We must be able to create many (backward) relations from any deep instance
  const RelationManyField = new DeepField(function (worker, source, target, stage, args) {
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
  Deep._unsafeInherit.typed = RelationManyField({ name: 'type' }); // deeps who relate to it by type
  Deep._unsafeInherit.out = RelationManyField({ name: 'from' }); // deeps who relate to it by from
  Deep._unsafeInherit.in = RelationManyField({ name: 'to' }); // deeps who relate to it by to
  Deep._unsafeInherit.valued = RelationManyField({ name: 'value' }); // deeps who relate to it by value

  const DeepSetInterspection = new DeepData((worker, source, target, stage, args, thisArg) => {
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

        if (resultSet.has(elementArg)) target.use(source, target, Deep._Updated, [target, ...args]);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  const DeepSetDifference = new deep((worker, source, target, stage, args, thisArg) => {
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

        if (resultSet.has(elementId)) target.use(source, target, Deep._Updated, [target, ...args]);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  const DeepSetUnion = new deep((worker, source, target, stage, args, thisArg) => {
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

        if (resultSet.has(elementId)) target.use(source, target, Deep._Updated, [target, ...args]);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  const DeepSetAnd = new deep((worker, source, target, stage, args, thisArg) => {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const deepSets = args;
        if (deepSets.length < 2) throw new Error(`deep.SetAnd requires at least two DeepSet`);

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

  // For query engine we need to be able to query many relation fields
  // For it we use sequence deep => deep set { deep } => .filter by field => .map by field
  // First, we need this sets methods

  // Let's create self many getter
  const DeepManyField = new DeepField((worker, source, target, stage, args) => {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        return target.new().proxy;
      } case Deep._FieldGetter: {
        let manyId = Deep._many[target.id];
        let many;
        if (!manyId) {
          many = new DeepSet(new Set([target.id]));
          manyId = many.id;
          Deep._many[target.id] = manyId;
        }
        return many || new Deep(manyId).proxy;
      }
      case Deep._FieldSetter:
      case Deep._FieldDeleter: {
        throw new Error(`deep.ManyField:readonly`);
      } default: return worker.super(source, target, stage, args);
    }
  });

  // Now, we can use many relation fields as deep.many => deep set { deep }
  Deep._unsafeInherit.many = DeepManyField;

  // Let's create deep set map
  // new DeepSetMapSet(deepSet, (value, key, collection) => any) => deep set { any }
  const DeepSetMapSet = new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const [source, handler] = args;
        const map = target.new();
        map.ref._source = source;
        map.ref._handler = handler;
        map.ref._hash = new Map(); // we must remember convertation of key to next
        const proxy = map.proxy;
        const set = proxy.value = new DeepSet(); // create result set
        if (!(source instanceof Deep) || source.type_id !== DeepSet.id) throw new Error(`deep.SetMap:!source`);
        for (const element of source.data) {
          const item = asDeep(element);
          const next = handler(item?.proxy, item?.proxy, source?.proxy);
          map.ref._hash.set(element, asDeep(next)?.id);
          set.add(next);
        }
        map.defineSource(source.id); // watch source deep set
        return proxy;
      } case Deep._Destructor: {
        for (const sourceId of target._sources) {
          target.undefineSource(sourceId); // unwatch source deep sets
        }
        target?.proxy?.value?.destroy(); // destroy result set
        return worker.super(source, target, stage, args);
      } case Deep._SourceInserted: {
        const [key] = args;
        const item = asDeep(key);
        const itemId = item?.id;
        if (!itemId) return;
        const handled = target.ref._handler(item.proxy, item.proxy, target.ref._source?.proxy);
        target.proxy.value.add(handled);
        target.ref._hash.set(itemId, asDeep(handled)?.id);
        return;
      } case Deep._SourceDeleted: {
        const [key] = args;
        const item = asDeep(key);
        const itemId = item?.id;
        if (!itemId) return;
        const old = target.ref._hash.get(itemId);
        if (old) target.proxy.value.delete(old);
        target.ref._hash.delete(itemId);
        return;
      } case Deep._SourceUpdated: {
        const [value, field, prev, next] = args;
        const itemId = value?.id;
        if (!itemId) return;
        const old = target.ref._hash.get(itemId);
        if (old) target.proxy.value.delete(old);
        const handled = target.ref._handler(value.proxy, value.proxy, target.ref._source?.proxy);
        target.ref._hash.set(itemId, asDeep(handled)?.id);
        target.proxy.value.add(handled);
        return;
      } default: return worker.super(source, target, stage, args);
    }
  });

  // Let's create deep set filter
  // new DeepSetFilterSet(deepSet, (value, key, collection) => boolean) => deep set { any }
  const DeepSetFilterSet = new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const [sourceSet, filterHandler] = args;
        if (sourceSet?.type_id !== DeepSet.id) throw new Error(`sourceSet must be a DeepSet`);
        if (typeof filterHandler !== 'function') throw new Error(`filterHandler must be a function`);

        const filter = target.new();
        filter.ref._source = sourceSet;
        filter.ref._handler = filterHandler;
        const proxy = filter.proxy;

        const filteredData = new Set<string>();
        for (const elementId of sourceSet.data) {
          const element = asDeep(elementId);
          if (element && filterHandler(element.proxy)) filteredData.add(elementId);
          if (element) Deep.defineCollection(element, filter.id);
        }

        proxy.value = new DeepSet(filteredData);
        filter.defineSource(sourceSet.id);
        return proxy;
      }
      case Deep._Destructor: {
        for (const sourceId of target._sources) {
          target.undefineSource(sourceId);
        }
        const data = target.ref._source?.data;
        if (data) {
          for (const elementId of data) {
            const element = asDeep(elementId);
            if (element) Deep.undefineCollection(element, target.id);
          }
        }
        target?.proxy?.value?.destroy();
        return worker.super(source, target, stage, args);
      }
      case Deep._SourceInserted: {
        const [elementId] = args;
        const element = asDeep(elementId);
        if (!element) return;

        Deep.defineCollection(element, target.id);
        if (target.ref._handler(element.proxy)) target.proxy.value.add(elementId);
        return;
      }
      case Deep._SourceDeleted: {
        const [elementId] = args;
        const element = asDeep(elementId);
        if (!element) return;

        Deep.undefineCollection(element, target.id);
        if (target.proxy.value.has(elementId)) target.proxy.value.delete(elementId);
        return;
      }
      case Deep._SourceUpdated: {
        const [element] = args;
        const elementId = element?.id;
        if (!elementId) return;

        const shouldBeIn = target.ref._handler(element.proxy);
        const isIn = target.proxy.value.has(elementId);

        if (shouldBeIn && !isIn) target.proxy.value.add(elementId);
        else if (!shouldBeIn && isIn) target.proxy.value.delete(elementId);
        return;
      }
      default: return worker.super(source, target, stage, args);
    }
  });

  
  const DeepString = newString(deep);

  const DeepArray = newArray(deep);
  const DeepArrayPush = newArrayPush(deep);
  const DeepArrayAdd = newArrayAdd(deep);
  const DeepArrayHas = newArrayHas(deep);
  const DeepArrayDelete = newArrayDelete(deep);
  const DeepArraySet = newArraySet(deep);

  const DeepQueryManyRelation = newQueryManyRelation(deep);
  const DeepQueryField = newQueryField(deep);
  const DeepQuery = newQuery(deep);
  
  // Add query functions to deep prototype
  
  const DeepInherit = new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case Deep._Apply:
      case Deep._New: {
        const [from, value, to] = args;

        if (!(from instanceof Deep)) throw new Error(`deep.Inherit:!from`);
        if (!(to instanceof Deep)) throw new Error(`deep.Inherit:!to`);

        // nameValueStringOrDeepString can be a string or a DeepString
        let nameValue: Deep;
        if (typeof value === 'string') nameValue = new DeepString(value);
        else if (value instanceof Deep && value.type_id === DeepString.id) nameValue = value;
        else throw new Error(`deep.Inherit:!value`);

        const inherit = target.new();
        const proxy = inherit.proxy;
        proxy.from = from;
        proxy.to = to;
        proxy.value = nameValue;

        const _from = from._deep;
        if (!_from._inherit) _from.inherit = {};
        _from.inherit[nameValue.data] = to;

        return proxy;
      }
      case Deep._Destructor: {
        const from = target.proxy.from;
        const value = target.proxy.value;

        if (from) {
          const _from = from._deep;
          const _inherit = _from._inherit;
          if (_inherit && value.data in _inherit) {
            delete _inherit[value.data];
            if (!Object.keys(_inherit).length) _from.inherit = undefined;
          }
        }

        return worker.super(source, target, stage, args);
      }
      default: return worker.super(source, target, stage, args);
    }
  });

  // Set the DeepInherit reference so the global effect can use it
  deep._deep.inherit = {};

  new DeepInherit(deep, 'Inherit', DeepInherit);

  new DeepInherit(deep, 'Data', DeepData);
  new DeepInherit(deep, 'Function', DeepFunction);
  new DeepInherit(deep, 'String', DeepString);
  new DeepInherit(deep, 'Field', DeepField);

  new DeepInherit(deep, 'type_id', Deep._unsafeInherit.type_id);
  new DeepInherit(deep, 'from_id', Deep._unsafeInherit.from_id);
  new DeepInherit(deep, 'to_id', Deep._unsafeInherit.to_id);
  new DeepInherit(deep, 'value_id', Deep._unsafeInherit.value_id);

  new DeepInherit(deep, 'type', Deep._unsafeInherit.type);
  new DeepInherit(deep, 'from', Deep._unsafeInherit.from);
  new DeepInherit(deep, 'to', Deep._unsafeInherit.to);
  new DeepInherit(deep, 'value', Deep._unsafeInherit.value);

  new DeepInherit(deep, 'typed', Deep._unsafeInherit.typed);
  new DeepInherit(deep, 'out', Deep._unsafeInherit.out);
  new DeepInherit(deep, 'in', Deep._unsafeInherit.in);
  new DeepInherit(deep, 'valued', Deep._unsafeInherit.valued);

  new DeepInherit(deep, 'many', Deep._unsafeInherit.many);

  new DeepInherit(deep, 'Set', DeepSet);
  new DeepInherit(deep, 'SetMapSet', DeepSetMapSet);
  new DeepInherit(deep, 'SetFilterSet', DeepSetFilterSet);

  // Register Set methods
  new DeepInherit(DeepSet, 'add', Deep._unsafeInherit.add);
  new DeepInherit(DeepSet, 'has', Deep._unsafeInherit.has);
  new DeepInherit(DeepSet, 'delete', Deep._unsafeInherit.delete);
  new DeepInherit(DeepSet, 'set', DeepSetSet);

  new DeepInherit(deep, 'SetInterspection', DeepSetInterspection);
  new DeepInherit(deep, 'SetDifference', DeepSetDifference);
  new DeepInherit(deep, 'SetUnion', DeepSetUnion);

  new DeepInherit(deep, 'SetAnd', DeepSetAnd);

  new DeepInherit(deep, 'QueryManyRelation', DeepQueryManyRelation);
  new DeepInherit(deep, 'QueryField', DeepQueryField);
  new DeepInherit(deep, 'Query', DeepQuery);

  new DeepInherit(deep, 'Array', DeepArray);
  new DeepInherit(DeepArray, 'push', DeepArrayPush);
  new DeepInherit(DeepArray, 'add', DeepArrayAdd);
  new DeepInherit(DeepArray, 'has', DeepArrayHas);
  new DeepInherit(DeepArray, 'delete', DeepArrayDelete);
  new DeepInherit(DeepArray, 'set', DeepArraySet);

  const DeepAdd = new DeepFunction(function (this) {
    let value = this.value;
    const value_type_id = value.type_id;
    while (value_type_id != DeepSet.id && value_type_id != DeepArray.id) {
      if (!value) return;
      value = value.value;
    }
    return value.add(...arguments);
  });
  const DeepHas = new DeepFunction(function (this) {
    let value = this.value;
    const value_type_id = value.type_id;
    while (value_type_id != DeepSet.id && value_type_id != DeepArray.id) {
      if (!value) return;
      value = value.value;
    }
    return value.has(...arguments);
  });
  const DeepDelete = new DeepFunction(function (this) {
    let value = this.value;
    const value_type_id = value.type_id;
    while (value_type_id != DeepSet.id && value_type_id != DeepArray.id) {
      if (!value) return;
      value = value.value;
    }
    return value.delete(...arguments);
  });

  new DeepInherit(deep, 'add', DeepAdd);
  new DeepInherit(deep, 'has', DeepHas);
  new DeepInherit(deep, 'delete', DeepDelete);

  Deep._Inherit = DeepInherit.id;

  newDelter(deep);
  newPatcher(deep);

  return deep;
}
