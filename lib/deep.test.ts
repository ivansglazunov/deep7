import { _Data } from "./_data";
import { deep, Deep, DeepFunction, DeepSet, Field, Method, DeepInterspection } from "./deep";

describe('deep', () => {
  it('new Deep()', () => {
    const a = new Deep();
    expect(a instanceof Deep).toBe(true);
    expect(typeof a.id).toEqual('string');
    expect(a.effect).toBeUndefined();
  });
  it('new Deep().proxy', () => {
    const a = new Deep().proxy;
    expect(a instanceof Deep).toBe(true);
    expect(typeof a.id).toEqual('string');
  });
  it('ƒ effect', () => {
    let _log: string[] = [];
    const generateEffect = (name: string) => function(worker, source, target, stage, args) {
      switch (stage) {
        case Deep._New:{
          _log.push(`new ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case Deep._Constructor:{
          _log.push(`constructor ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case Deep._Apply:{
          _log.push(`apply ${name} ${target.id}`);
          const [input] = args;
          switch (input) {
            case 'x': return target.ref._x;
            default: return worker.super(source, target, stage, args);
          }
        } case Deep._Destructor:{
          _log.push(`destructor ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case Deep._Getter:{
          const [key] = args;
          _log.push(`getter ${name} ${target.id} ${key}`);
          switch (key) {
            case 'x': return target.ref._x;
            default: return worker.super(source, target, stage, args);
          }
        } case Deep._Setter:{
          const [key, value] = args;
          _log.push(`setter ${name} ${target.id} ${key} ${value}`);
          switch (key) {
            case 'x': target.ref._x = value; return;
            default: return worker.super(source, target, stage, args);
          }
        } case Deep._Deleter:{
          const [key] = args;
          _log.push(`deleter ${name} ${target.id} ${key}`);
          switch (key) {
            case 'x': delete target.ref._x;
            default: return worker.super(source, target, stage, args);
          }
        } default: {
          _log.push(`default ${name} ${target.id} ${stage}`);
          return worker.super(source, target, stage, args);
        }
      }
    }
    const a = deep(generateEffect('a'));
    expect(a instanceof Deep).toBe(true);
    expect(_log).toEqual([]);
    const b = new a();
    expect(b instanceof Deep).toBe(true);
    const aId = a.id;
    const bId = b.id;
    const aX1 = a.x;
    const bX1 = b.x;
    expect(aX1).toEqual(undefined);
    expect(bX1).toEqual(undefined);
    a.x = 'a';
    b.x = 'b';
    const aX2 = a.x;
    const bX2 = b.x;
    expect(aX2).toEqual(undefined);
    expect(bX2).toEqual('b');
    expect(b('x')).toEqual('b');
    delete a.x;
    delete b.x;
    const aX3 = a.x;
    const bX3 = b.x;
    expect(aX3).toEqual(undefined);
    expect(bX3).toEqual(undefined);
    expect(_log).toEqual([
      `new a ${aId}`,
      `constructor a ${bId}`,
      `getter a ${bId} id`,
      `getter a ${bId} x`,
      `setter a ${bId} x b`,
      `getter a ${bId} x`,
      `apply a ${bId}`,
      `deleter a ${bId} x`,
      `getter a ${bId} x`,
    ]);
    _log = [];
    const c = b(generateEffect('c'));
    expect(c instanceof Deep).toBe(true);
    const cId = c.id;
    expect(_log).toEqual([
      `apply a ${bId}`,
      `constructor a ${cId}`,
      `getter a ${cId} id`,
    ]);
    const d = new c();
    expect(d instanceof Deep).toBe(true);
    const dId = d.id;
    const cX1 = c.x;
    const dX1 = d.x;
    expect(cX1).toEqual(undefined);
    expect(dX1).toEqual(undefined);
    c.x = 'c';
    d.x = 'd';
    const cX2 = c.x;
    const dX2 = d.x
    expect(cX2).toEqual('c');
    expect(dX2).toEqual('d');
    expect(d('x')).toEqual('d');
    delete c.x;
    delete d.x;
    const cX3 = c.x;
    const dX3 = d.x;
    expect(cX3).toEqual(undefined);
    expect(dX3).toEqual(undefined);
    expect(_log).toEqual([
      `apply a ${bId}`,
      `constructor a ${cId}`,
      `getter a ${cId} id`,
      `new c ${cId}`,
      `new a ${cId}`,
      `constructor c ${dId}`,
      `constructor a ${dId}`,
      `getter c ${dId} id`,
      `getter a ${dId} id`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
      `setter a ${cId} x c`,
      `setter c ${dId} x d`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
      `apply c ${dId}`,
      `deleter a ${cId} x`,
      `deleter c ${dId} x`,
      `deleter a ${dId} x`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
    ]);
    _log = [];
    d._deep.destroy();
    expect(_log).toEqual([
      `getter c ${dId} _deep`,
      `getter a ${dId} _deep`,
      `destructor c ${dId}`,
      `destructor a ${dId}`,
    ]);
  });
  it('toString compare with _deep', () => {
    const a = deep();
    expect(a == a.id).toBe(true);
    // let cased = false;
    // switch (a.id) {
    //   case a: cased = true;
    // }
    // expect(cased).toBe(true);
  });
  it('Field ƒ effect', () => {
    const a = deep();
    let _log: string[] = [];
    const field = Field((worker, source, target, stage, args) => {
      switch (stage) {
        case Deep._FieldGetter:{
          _log.push(`getter`);
          return target.ref._test;
        } case Deep._FieldSetter:{
          _log.push(`setter`);
          const [key, value] = args;
          target.ref._test = value;
          return;
        } case Deep._FieldDeleter:{
          _log.push(`deleter`);
          delete target.ref._test;
          return;
        } default: return worker.super(source, target, stage, args);
      }
    });
    a.test = field;
    expect(a.test).toBe(undefined);
    a.test = 'x';
    expect(a.test).toBe('x');
    expect(_log).toEqual([
      'getter',
      `setter`,
      'getter',
    ]);
    _log = [];
    delete a.test;
    expect(a.test).toBe(undefined);
    expect(_log).toEqual([
      `deleter`,
      'getter',
    ]);
  });
  it(`Method ƒ effect`, () => {
    const a = deep();
    let _log: string[] = [];
    const method = Method((worker, source, target, stage, args, thisArg) => {
      switch (stage) {
        case Deep._FieldGetter:{
          return worker.proxy;
        } case Deep._Apply:{
          _log.push(`apply ${thisArg?.id}`);
          return thisArg?.id;
        } default: return worker.super(source, target, stage, args, thisArg);
      }
    });
    Deep.inherit.getTestId = method;
    expect(method()).toBe(undefined);
    expect(a.getTestId()).toBe(a.id);
    delete Deep.inherit.getTestId;
  });
  it('double', () => {
    const a = new Deep();
    const b = new Deep(a.id);
    expect(a.id).toBe(b.id);
  });
  describe('Relation', () => {
    it('type_id', () => {
      const a = deep();
      const b = deep();
      expect(a.type_id).toBe(deep.id);
      a.type_id = b;
      expect(a.type_id).toBe(b.id);
      delete a.type_id;
      expect(a.type_id).toBe(deep.id);
    });
    it('type', () => {
      const a = deep();
      const b = deep();
      const type = a.type;
      expect(a.type?.id).toBe(deep.id);
      a.type = b;
      expect(a.type?.id).toBe(b.id);
      delete a.type;
      expect(a.type?.id).toBe(deep.id);
    });
    it('from_id', () => {
      const a = deep();
      const b = deep();
      expect(a.from_id).toBe(undefined);
      a.from_id = b;
      expect(a.from_id).toBe(b.id);
      delete a.from_id;
      expect(a.from_id).toBe(undefined);
    });
    it('from', () => {
      const a = deep();
      const b = deep();
      expect(a.from?.id).toBe(undefined);
      a.from = b;
      expect(a.from?.id).toBe(b.id);
      delete a.from;
      expect(a.from?.id).toBe(undefined);
    });
    it('to_id', () => {
      const a = deep();
      const b = deep();
      expect(a.to_id).toBe(undefined);
      a.to_id = b;
      expect(a.to_id).toBe(b.id);
      delete a.to_id;
      expect(a.to_id).toBe(undefined);
    });
    it('to', () => {
      const a = deep();
      const b = deep();
      expect(a.to?.id).toBe(undefined);
      a.to = b;
      expect(a.to?.id).toBe(b.id);
      delete a.to;
      expect(a.to?.id).toBe(undefined);
    });
    it('value_id', () => {
      const a = deep();
      const b = deep();
      expect(a.value_id).toBe(undefined);
      a.value_id = b;
      expect(a.value_id).toBe(b.id);
      delete a.value_id;
      expect(a.value_id).toBe(undefined);
    });
    it('value', () => {
      const a = deep();
      const b = deep();
      expect(a.value?.id).toBe(undefined);
      a.value = b;
      expect(a.value?.id).toBe(b.id);
      delete a.value;
      expect(a.value?.id).toBe(undefined);
    });
    it('RelationMany', () => {
      const a = deep();
      const b = deep();
      a.type_id = b.id;
      expect(b.typed).toBeInstanceOf(Deep);
      expect(b.typed.has(a.id)).toBeTruthy();
    });
    it('CollectionUpdate', () => {
      const listener = deep();
      let listener_log: any[] = [];
      listener.effect = (worker, source, target, stage, args) => {
        listener_log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      };

      const deepSet = new DeepSet();
      listener.value = deepSet;

      const a = deep();
      deepSet.add(a);
      
      const b = deep();
      const old_from_id = a.from_id;
      listener_log = []; // reset log
      a.from_id = b.id;

      expect(listener_log.length).toBe(1);
      const updateEvent = listener_log.find(e => e.stage === Deep._Updated);
      expect(updateEvent).toBeDefined();
      expect(updateEvent.sourceId).toBe(a.id);
      expect(updateEvent.targetId).toBe(listener.id);
      expect(updateEvent.args).toEqual(['from', b.id, old_from_id]);
    });
  });
  describe('DeepFunction', () => {
    it('.ref._data Function', () => {
      expect(DeepFunction._deep.ref._data).toBeInstanceOf(_Data);
      const a = new DeepFunction(function(this, a, b, c) {
        if (this instanceof Deep) return this.id;
        if (this?.x) return this.x + a + b + c;
        return a + b + c;
      });
      expect(a.data).toBeInstanceOf(Function);
      const b = new DeepFunction(a.id);
      expect(b.data).toBe(a.data);
      expect(a(1,2,3)).toBe(6);
      const o = { x: 4, a };
      expect(o.a(1, 2, 3)).toBe(10);
      expect(a.call(b, 1, 2, 3)).toBe(b.id);
      a.destroy();
      expect(a.data).toBeUndefined();
      expect(b.data).toBeUndefined();
    });
  });
  describe('DeepSet', () => {
    it('.ref._data Set', () => {
      expect(DeepSet._deep.ref._data).toBeInstanceOf(_Data);
      const deepSet1 = new DeepSet();
      expect(deepSet1.data).toBeInstanceOf(Set);
      const deepSet2 = new DeepSet(deepSet1.id);
      expect(deepSet2.data).toBe(deepSet1.data);
      deepSet1.destroy();
      expect(deepSet1.data).toBeUndefined();
      expect(deepSet2.data).toBeUndefined();
    });
    it('.add .has .delete', () => {
      const a = new DeepSet();
      expect(a.data).toBeInstanceOf(Set);
      expect(a.has(123)).toBe(false);
      expect(a.data.size).toBe(0);
      a.add(123);
      expect(a.data.size).toBe(1);
      expect(a.data.has(123)).toBe(true);
      a.add(123);
      expect(a.data.size).toBe(1);
      expect(a.data.has(123)).toBe(true);
      expect(a.has(123)).toBe(true);
      expect(a.delete(123)).toBe(true);
      expect(a.data.size).toBe(0);
      expect(a.data.has(123)).toBe(false);
      expect(a.has(123)).toBe(false);
      expect(a.delete(123)).toBe(false);
    });
    it('effect events', () => {
      let _log: any[] = [];
      const listener = deep((worker, source, target, stage, args) => {
        _log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      });

      const deepSet = new DeepSet();
      listener.value = deepSet;

      const el = deep();
      let el_log: any[] = [];
      el.effect = (worker, source, target, stage, args) => {
        el_log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      };

      _log = [];
      el_log = [];
      deepSet.add(el);
      expect(_log.length).toBe(1);
      expect(_log[0].stage).toBe(Deep._Inserted);
      expect(_log[0].sourceId).toBe(deepSet.id);
      expect(_log[0].targetId).toBe(listener.id);
      expect(_log[0].args).toEqual([el.id]);
      expect(el_log.length).toBe(1);
      expect(el_log[0].stage).toBe(Deep._CollectionInserted);
      expect(el_log[0].sourceId).toBe(deepSet.id);
      expect(el_log[0].targetId).toBe(el.id);
      expect(el_log[0].args).toEqual([deepSet.id]);
      expect(el._collections.has(deepSet.id)).toBe(true);

      _log = [];
      el_log = [];
      deepSet.add(el.id);
      expect(_log.length).toBe(0);
      expect(el_log.length).toBe(0);

      _log = [];
      el_log = [];
      deepSet.delete(el);
      expect(_log.find(e => e.stage === Deep._Deleted)).toBeDefined();
      expect(el_log.find(e => e.stage === Deep._CollectionDeleted)).toBeDefined();
      expect(el._collections.has(deepSet.id)).toBe(false);

      const a = deep();
      let a_log: any[] = [];
      a.effect = (worker, source, target, stage, args) => {
        a_log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      }
      const b = deep();
      const old_type_id = a.type_id;
      a.type_id = b.id;
      expect(a_log.length).toBe(1);
      expect(a_log[0].stage).toBe(Deep._Change);
      expect(a_log[0].args).toEqual(['type', b.id, old_type_id]);
    });
  });
  it('RelationManyField returns DeepSet', () => {
    const a = deep();
    const b = deep();
    a.type_id = b.id;

    // Check internal representation first
    const backwards = Deep.getBackward('type', b.id);
    expect(backwards).toBeInstanceOf(Set);
    expect(backwards.has(a.id)).toBe(true);

    // Check the public-facing accessor
    const typedSet = b.typed;
    expect(typedSet).toBeInstanceOf(Deep);
    expect(typedSet.type_id).toBe(DeepSet.id);
    expect(typedSet.has(a.id)).toBe(true);
  });
  describe('DeepInterspection', () => {
    it('should create and maintain an intersection of two DeepSets', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
      const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));

      const intersection = new DeepInterspection(deepSetX, deepSetY);
      
      expect(intersection.value).toBeInstanceOf(Deep);
      expect(intersection.value.type_id).toBe(DeepSet.id);
      expect(intersection.value.data.size).toBe(2);
      expect(intersection.value.has(b.id)).toBe(true);
      expect(intersection.value.has(c.id)).toBe(true);

      expect(Object.keys(intersection._sources).length).toBe(2);
      expect(intersection._sources[deepSetX.id]).toBe(deepSetX);
      expect(intersection._sources[deepSetY.id]).toBe(deepSetY);

      expect(Object.keys(deepSetX._targets).length).toBe(1);
      expect(deepSetX._targets[intersection.id].id).toBe(intersection.id);
      expect(Object.keys(deepSetY._targets).length).toBe(1);
      expect(deepSetY._targets[intersection.id].id).toBe(intersection.id);

      deepSetX.add(d.id);
      expect(intersection.value.data.size).toBe(3);
      expect(intersection.value.has(d.id)).toBe(true);

      deepSetY.delete(c.id);
      expect(intersection.value.data.size).toBe(2);
      expect(intersection.value.has(c.id)).toBe(false);

      intersection.destroy();
      expect(Object.keys(deepSetX._targets).length).toBe(0);
      expect(Object.keys(deepSetY._targets).length).toBe(0);
    });
  });
});
