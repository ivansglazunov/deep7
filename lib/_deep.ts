import { v4 as uuidv4 } from 'uuid';
import { Relation as _Relation } from './relation';
import { _Data as _Data } from './_data';
import { z } from 'zod';

interface Effect {
  (worker: Deep, source: Deep, target: Deep,stage, args: any[], thisArg?: any): any;
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
    if (!!this.__id) throw new Error(`deep.id:once`);
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

  get schema() {
    return this.use(this, this, Deep._Schema, []);
  }
  validate(stage: any, input: any) {
    const schema = this.schema;
    if (schema?.[stage]) {
      return schema?.[stage].parse(input);
    }
  }

  static inherit: { [key: string]: Deep } = {};
  static effects: { [key: string]: Effect } = {};
  static schemas: { [key: string]: any } = {};
  static effect: Effect = (worker, source, target, event, args) => {
    switch (event) {
      case Deep._Apply:
      case Deep._New: {
        const [input] = args;
        if (!args.length) return target.new(undefined, args).proxy;
        if (typeof input == 'string') return target.new(input, args).proxy;
        else if(typeof input == 'function') {
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
          case 'toString': return () => `${target.id}`;
          case 'valueOf': return () => `${target.id}`;
        //   case '_deep': return deep;
        //   // case 'instance': return deep.instance;
        //   // case 'stack': return deep.stack;
        //   // case 'type': {
        //   //   const field = _Deep._inherit[key];
        //   //   if (!field) throw new Error(`deep.getter:${key}!`);
        //   //   return field.effect(deep, FieldGetter, [field, key]);
        //   // }
          default: {
            const inherited = Deep.inherit[key];
            if (inherited) {
              return inherited._deep.use(inherited._deep, target, Deep._FieldGetter, [key]);
            } else return;
          };
        }
        return;
      } case Deep._Setter: {
        const [key, value] = args;
        const inherited = Deep.inherit[key];
        if (inherited) {
          inherited._deep.use(inherited._deep, target, Deep._FieldSetter, [key, value]);
        } else {
          if (value instanceof Deep) {
            Deep.inherit[key] = value;
          }
        }
        // switch (key) {
        //   case 'id': deep.id = value;
        //   // case 'type': {
        //   //   const field = _inherit[key];
        //   //   if (!field) throw new Error(`deep.setter:${key}!`);
        //   //   return field.effect(deep, FieldSetter, [field, key, value]);
        //   // }
        //   default: return;
        // }
        return;
      } case Deep._Deleter: {
        const [key] = args;
        const inherited = Deep.inherit[key];
        if (inherited) {
          inherited._deep.use(inherited._deep, target ,Deep._FieldDeleter, [key]);
        }
      //   switch (key) {
      //     // case 'type': {
      //     //   const field = _inherit[key];
      //     //   if (!field) throw new Error(`deep.deleter:${key}!`);
      //     //   return field.effect(deep, FieldDeleter, [field, key]);
      //     // }
      //     default: return;
      //   }
        return;
      } case Deep._Schema: {
        const args = z.union([
          z.tuple([]),
          z.tuple([z.string().uuid()]),
          z.tuple([z.function()]),
        ])
        return {
          [Deep._Apply]: args,
          [Deep._Constructor]: args,
        };
      } default: return; // not inherit other event cases
    }
  };
  use(source: Deep, target: Deep, stage: any, args: any[], _this?: any): any {
    let current = Deep.effects[this.id];
    if (current) {
      if (stage != Deep._Schema && stage != Deep._Getter) {
        this.validate(stage, args);
      }
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
        if (stage != Deep._Schema && stage != Deep._Getter) {
          typeDeep.validate(stage, args);
        }
        return typeEffect(typeDeep, source, target, stage, args, _this);
      }
      type = Deep.getForward('type', type);
    }
    if (stage != Deep._Schema && stage != Deep._Getter) {
      this.validate(stage, args);
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
        return deep.use(deep, deep,Deep._Apply, args, _this);
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

  static setForward(name: string, key: string, value: string) {
    const relation = Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
    if (!Deep._relations.all.has(key)) {
      console.log(Deep._relations.all);
      throw new Error(`Relation.setRelation:${name}:${key}:!key`);
    }
    if (!Deep._relations.all.has(value)) {
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
    if (!relation) throw new Error(`Relation.getRelation:${name}:!relation`);
    return relation.forwards[key];
  };

  static getBackward(name: string, key: string) {
    const relation = Deep._relations[name];
    if (!relation) throw new Error(`Relation.getRelation:${name}:!relation`);
    return relation.backwards[key];
  };

  [key:string]: any;
}

export const deep = new Deep().proxy;

export const New = new deep(Deep._New);
export const Constructor = new deep(Deep._Constructor);
export const Apply = new deep(Deep._Apply);
export const Destructor = new deep(Deep._Destructor);
export const Getter = new deep(Deep._Getter);
export const Setter = new deep(Deep._Setter);
export const Deleter = new deep(Deep._Deleter);
export const FieldGetter = new deep(Deep._FieldGetter);
export const FieldSetter = new deep(Deep._FieldSetter);
export const FieldDeleter = new deep(Deep._FieldDeleter);

export const Field = new deep();
export const Method = new deep();

const RelationIdField = new Field(function(worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New:{
      const [options] = args;
      Deep._relations[options.name] = Deep._relations[options.name] || { forwards: {}, backwards: {} };
      const instance = target.new();
      instance.ref.options = options;
      return instance.proxy;
    } case Deep._Constructor:{
      return;
    } case Deep._FieldGetter:{
      const name = source.ref.options.name;
      return Deep.getForward(name, target.id);
    } case Deep._FieldSetter:{
      const name = source.ref.options.name;
      let [key, value] = args;
      if (value instanceof Deep) value = value.id;
      if (!Deep._relations.all.has(value)) throw new Error(`Relation.FieldSetter:${value}:!value`);
      const prev = Deep.unsetForward(name, target.id);
      Deep.setForward(name, target.id, value);
      return;
    } case Deep._FieldDeleter:{
      const name = source.ref.options.name;
      const def = source.ref.options.default;
      const prev = Deep.unsetForward(name, target.id);
      if (def) Deep.setForward(name, target.id, def);
      return;
    } case Deep._Schema: {
      source.ref.schemaInput = source.ref.schemaInput || z.tuple([z.object({
        name: z.string(),
        default: z.union([z.string().uuid(), z.undefined()]),
      })]);
      source.ref.schemaSet = source.ref.schemaSet || z.union([
        z.tuple([z.string(), z.instanceof(Deep)]),
        z.tuple([z.string(), z.string().uuid()]),
      ]);
      return source.ref.schema = source.ref.schema || {
        [Deep._Apply]: source.ref.schemaInput,
        [Deep._New]: source.ref.schemaInput,
        [Deep._FieldSetter]: source.ref.schemaSet,
      };
    } default: return worker.super(source, target, stage, args);
  }
});
deep.type_id = RelationIdField({ name: 'type',default: deep.id });
deep.from_id = RelationIdField({ name: 'from', default: undefined });
deep.to_id = RelationIdField({ name: 'to', default: undefined });
deep.value_id = RelationIdField({ name: 'value', default: undefined });


const RelationField = new Field(function(worker, source, target, stage, args) {
  switch (stage) {
    case Deep._Apply:
    case Deep._New:{
      const [options] = args;
      const instance = target.new();
      instance.ref.options = options;
      return instance.proxy;
    } case Deep._Constructor:{
      return;
    } case Deep._FieldGetter:{
      const id = target.proxy[source.ref.options.id_field];
      return id ? new Deep(id) : undefined;
    } case Deep._FieldSetter:{
      let [key, value] = args;
      if (value instanceof Deep) value = value.id;
      return target.proxy[source.ref.options.id_field] = value;
    } case Deep._FieldDeleter:{
      return delete target.proxy[source.ref.options.id_field];
    } case Deep._Schema: {
      source.ref.schemaInput = source.ref.schemaInput || z.tuple([z.object({
        id_field: z.string(),
      })]);
      source.ref.schemaSet = source.ref.schemaSet || z.union([
        z.tuple([z.string(), z.instanceof(Deep)]),
        z.tuple([z.string(), z.string().uuid()]),
      ]);
      return source.ref.schema = source.ref.schema || {
        [Deep._Apply]: source.ref.schemaInput,
        [Deep._New]: source.ref.schemaInput,
        [Deep._FieldSetter]: source.ref.schemaSet,
      };
    } default: return worker.super(source, target, stage, args);
  }
});
deep.type = RelationField({ id_field: 'type_id' });
deep.from = RelationField({ id_field: 'from_id' });
deep.to = RelationField({ id_field: 'to_id' });
deep.value = RelationField({ id_field: 'value_id' });

export const DeepData = new deep((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const data = target.new();
      data.ref._data = data.ref._data || new _Data();
      return data.proxy;
    } case Deep._Schema: {
      console.log('deep data schema');
      source.ref.schemaInput = source.ref.schemaInput || z.tuple([z.function()]);
      return source.ref.schema = source.ref.schema || {
        [Deep._Apply]: source.ref.schemaInput,
        [Deep._New]: source.ref.schemaInput,
      };
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

export const DeepSet = new DeepData((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const data = target.new();
      const type = data.type;
      const _data = data.ref._data;
      if (!_data) throw new Error(`DeepSet.new:${data.id}:!.type.ref._data`);
      return data.proxy;
    } case Deep._Schema: {
      console.log('deep set schema');
      source.ref.schemaInput = source.ref.schemaInput || z.union([
        z.tuple([]),
        z.tuple([z.function()]),
      ]);
      return source.ref.schema = source.ref.schema || {
        [Deep._Apply]: source.ref.schemaInput,
        [Deep._New]: source.ref.schemaInput,
      };
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

deep.add = Method((worker, source, target, stage, args, thisArg) => {
  switch (stage) {
    case Deep._Apply:
    case Deep._New: {
      const data = thisArg?._deep?.ref?._data;
      if (!data) throw new Error(`DeepSet.add:${thisArg?.id}:!data`);
      data.add(args[0])
      return thisArg;
    } default: return worker.super(source, target, stage, args, thisArg);
  }
});

// const Relation = new deep((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       const [name] = args;
//       const instance = deep.new(deep.effect, args);
//       instance.ref.name = name;
//       Deep._relations[name] = Deep._relations[name] || { forwards: {}, backwards: {} };
//       Deep._inherit[name] = instance;
//       return instance.proxy;
//     }
//     case Getter: {
//       const [field, key] = args;
//       const name = field.ref.name;
//       if (!name) throw new Error(`Relation.FieldGetter:${name}!`);
//       const relation = Deep._relations[name];
//       if (!relation) throw new Error(`Relation.FieldGetter:${name}!`);
//       const forward = relation.forwards[deep.id];
//       return forward;
//     }
//     case Setter: {
//       const [field, key, value] = args;
//       const name = field.ref.name;
//       if (!name) throw new Error(`Relation.FieldSetter:${name}!`);
//       const relation = Deep._relations[name];
//       if (!relation) throw new Error(`Relation.FieldSetter:${name}!`);
//       Deep.setForward(name, deep.id, value);
//     }
//     case Constructor: return deep;
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _relations = {
//   all: new Set(),
//   // type: {
//   //   forwards: { [id]: id },
//   //   backwards: { [id]: new Set() },
//   // },
//   // ...
// };

// let Event, Instance, Properties, Inheritance, Collection;
// let New, Constructor, Apply, Destructor;
// let Getter, Setter, Deleter;
// let Method, Field;
// let FieldGetter, FieldSetter, FieldDeleter;
// let Inserted, Deleted, Updated;
// let query;

// const deep = new Deep(effect).deep;

// Event = new deep();

// Instance = new Event();
// Properties = new Event();
// Inheritance = new Event();
// Collection = new Event();

// New = new Instance();
// Constructor = new Instance();
// Apply = new Instance();
// Destructor = new Instance();

// Getter = new Properties();
// Setter = new Properties();
// Deleter = new Properties();

// FieldGetter = new Inheritance();
// FieldSetter = new Inheritance();
// FieldDeleter = new Inheritance();

// Inserted = new Collection();
// Deleted = new Collection();
// Updated = new Collection();

// /**
//  * y = new x(...args)
//  *   New args
//  *     Constructor args
//  *       deep.super(deep, Constructor, args)
//  *         super Constructor args
//  * y.destroy(...args)
//  *   Destructor args
//  */

// const Relation = new deep((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       const [name] = args;
//       const instance = deep.new(deep.effect, args);
//       instance.ref.name = name;
//       _relations[name] = _relations[name] || { forwards: {}, backwards: {} };
//       _inherit[name] = instance;
//       return instance.proxy;
//     }
//     case FieldGetter: {
//       const [field, key] = args;
//       const name = field.ref.name;
//       if (!name) throw new Error(`Relation.FieldGetter:${name}!`);
//       const relation = _relations[name];
//       if (!relation) throw new Error(`Relation.FieldGetter:${name}!`);
//       const forward = relation.forwards[deep.id];
//       return forward;
//     }
//     case FieldSetter: {
//       const [field, key, value] = args;
//       const name = field.ref.name;
//       if (!name) throw new Error(`Relation.FieldSetter:${name}!`);
//       const relation = _relations[name];
//       if (!relation) throw new Error(`Relation.FieldSetter:${name}!`);
//       _setRelation(name, deep.id, value);
//     }
//     case Constructor: return deep;
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const Type = new Relation('type');
// const From = new Relation('from');
// const To = new Relation('to');
// const Value = new Relation('value');

// const Data = new deep();

// const _Functions = new _Data();
// const DataFunction = new Data((deep, stage, args, _this) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       if (deep.id == DataFunction.id) return deep.new(deep.effect, args).proxy;
//       const f: any = _Functions.byId(deep.id);
//       if (typeof f == 'function') return new f(...args);
//       return;
//     }
//     case Constructor: {
//       const [_data] = args;
//       let id = _Functions.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Functions.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Apply: {
//       const f = _Functions.byId(deep.id);
//       if (typeof f != 'function') return;
//       return f.apply(_this, args);
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Functions.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Maps = new _Data();
// const DataMap = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Maps.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Maps.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Maps.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Sets = new _Data();
// const DataSet = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Sets.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Sets.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Sets.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Objects = new _Data();
// const DataObject = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Objects.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Objects.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Objects.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Arrays = new _Data();
// const DataArray = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Arrays.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Arrays.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Arrays.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Strings = new _Data();
// const DataString = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Strings.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Strings.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Strings.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// const _Numbers = new _Data();
// const DataNumber = new Data((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       let [_data] = args;
//       let id = _Numbers.byData(_data);
//       if (!id) {
//         id = deep.id;
//         _Numbers.byData(_data, id);
//       }
//       deep.super = deep.effect;
//       return deep;
//     }
//     case Getter: {
//       const [key] = args;
//       switch (key) {
//         case 'id': return deep.id;
//         case 'data': return _Numbers.byId(deep.id);
//         default: return deep.super(deep, stage, args);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// Method = new deep((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       return deep;
//     }
//     case Apply: {
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// Field = new deep((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     case Constructor: {
//       return deep;
//     }
//     case Apply: {
//       const [operation, key, value] = args;
//       switch (operation) {
//         case Getter: {
//           return;
//         }
//         case Setter: {
//           return;
//         }
//         case Deleter: {
//           return;
//         }
//         default: throw new Error(`Field.Apply:${operation}`);
//       }
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });

// query = new deep((deep, stage, args) => {
//   switch (stage) {
//     case undefined:
//     case New: {
//       return deep.new(deep.effect, args).proxy;
//     }
//     default: return deep.super(deep, stage, args); // inherit other stage cases
//   }
// });


// return {
//   deep,
//   New, Constructor,
//   Getter, Setter, Deleter,
//   Method, Field,
//   DataFunction, DataMap, DataSet, DataObject, DataArray, DataString, DataNumber,
//   _relations, _effects,
// };
// }