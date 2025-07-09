import { _Data } from "./_data";
import {
  deep, Deep, DeepSetAnd, DeepSetDifference, DeepFunction, DeepSetInterspection, DeepSet, DeepSetMapSet, DeepSetUnion, Field, Method,
  // DeepInterspection, DeepDifference, DeepUnion, DeepQueryManyRelation, DeepAnd, DeepMapByField, DeepQueryField, DeepQuery, DeepFilter, DeepMap,
} from "./deep";

// We will check possibilities in order its defined in deep.ts
describe('deep', () => {
  it('new Deep()', () => {
    const a = new Deep(); // only way to create a Deep instance without type
    expect(a instanceof Deep).toBe(true); // any new Deep() should be a Deep instance
    expect(typeof a.id).toEqual('string'); // id is a string always
    expect(a.effect).toBeUndefined(); // by default effect is undefined
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
          // _log.push(`default ${name} ${target.id} ${stage}`);
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
    expect(a === a.id).toBe(false);
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
    // Now, we still can't be able to use Inheritance management
    Deep.inherit.test = field; // use global inherit object
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
  it('deep.many', () => {
    const a = deep();
    const manySet = a.many;

    // Test creation and content
    expect(manySet).toBeInstanceOf(Deep);
    expect(manySet.type_id).toBe(DeepSet.id);
    expect(manySet.data.size).toBe(1);
    expect(manySet.has(a.id)).toBe(true);

    // Test caching
    const manySet2 = a.many;
    expect(manySet2.id).toBe(manySet.id);

    // Test destruction cleanup
    const aId = a.id;
    expect(Deep._many[aId]).toBe(manySet.id);
    a.destroy();
    expect(Deep._many[aId]).toBeUndefined();
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
    it('typed', () => {
      const a = deep();
      const b = deep();
      expect(b.typed).toBeInstanceOf(Deep);
      expect(b.typed.data.size).toBe(0);
      expect(b.typed.has(a.id)).toBeFalsy();
      a.type_id = b.id;
      expect(b.typed).toBeInstanceOf(Deep);
      expect(b.typed.data.size).toBe(1);
      expect(b.typed.has(a.id)).toBeTruthy();
    });
    it('CollectionUpdate', () => {
      let listener_log: any[] = [];
      const listener = deep((worker, source, target, stage, args) => {
        listener_log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      });

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
      expect(updateEvent.args[0]?.id).toEqual(a.id);
      expect(updateEvent.args[1]).toEqual('from');
      expect(updateEvent.args[2]?.id).toEqual(b.id);
      expect(updateEvent.args[3]).toEqual(old_from_id);
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
    it('collection effects', () => {
      let _log: any[] = [];
      const a = deep();
      const loggerSet = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case Deep._Inserted: {
            const [key, value] = args;
            _log.push(`loggerSet inserted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Updated: {
            const [value, key, next, prev] = args;
            _log.push(`loggerSet updated ${value.id} ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Deleted: {
            const [key, value] = args;
            _log.push(`loggerSet deleted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Change: {
            const [key, next, prev] = args;
            _log.push(`loggerSet change ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } default: {
            // _log.push(`loggerSet default ${stage} ${args}`);
            return worker.super(source, target, stage, args);
          }
        }
      });
      const deepSet = new DeepSet();
      loggerSet.value = deepSet;
      _log.push(`set value setted`);
      const loggerItem = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case Deep._CollectionInserted: {
            const [item] = args;
            _log.push(`loggerItem collection inserted ${item?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._CollectionDeleted: {
            const [item] = args;
            _log.push(`loggerItem collection deleted ${item?.id}`);
            return worker.super(source, target, stage, args);
          } default: return worker.super(source, target, stage, args);
        }
      });
      deepSet.add(loggerItem);
      _log.push(`item added`);
      loggerItem.from = a;
      _log.push(`item from setted`);
      deepSet.delete(loggerItem);
      _log.push(`item deleted`);
      expect(_log).toEqual([
          `loggerSet change value: ${deepSet.id} undefined`,
        `set value setted`,
            `loggerItem collection inserted ${deepSet.id}`,
          `loggerSet inserted ${loggerItem.id}: ${loggerItem.id}`,
        `item added`,
            `loggerItem collection inserted ${a.out.id}`,
          `loggerSet updated ${loggerItem.id} from: ${a.id} undefined`,
        `item from setted`,
          `loggerItem collection deleted ${deepSet.id}`,
            `loggerSet deleted ${loggerItem.id}: ${loggerItem.id}`,
        `item deleted`,
      ]);
    });
    it('destroy effects', () => {
      let _log: any[] = [];
      const a = deep();
      const loggerSet = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case Deep._Inserted: {
            const [key, value] = args;
            _log.push(`loggerSet inserted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Updated: {
            const [value, key, next, prev] = args;
            _log.push(`loggerSet updated ${value.id} ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Deleted: {
            const [key, value] = args;
            _log.push(`loggerSet deleted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._Change: {
            const [key, next, prev] = args;
            _log.push(`loggerSet change ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } default: {
            // _log.push(`loggerSet default ${stage} ${args}`);
            return worker.super(source, target, stage, args);
          }
        }
      });
      const deepSet = new DeepSet();
      loggerSet.value = deepSet;
      _log.push(`set value setted`);
      const loggerItem = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case Deep._CollectionInserted: {
            const [item] = args;
            _log.push(`loggerItem collection inserted ${item.id}`);
            return worker.super(source, target, stage, args);
          } case Deep._CollectionDeleted: {
            const [item] = args;
            _log.push(`loggerItem collection deleted ${item.id}`);
            return worker.super(source, target, stage, args);
          } default: return worker.super(source, target, stage, args);
        }
      });
      deepSet.add(loggerItem);
      _log.push(`item added`);
      loggerItem.from = a;
      _log.push(`item from setted`);
      loggerItem.destroy();
      _log.push(`item destroyed`);
      expect(_log).toEqual([
          `loggerSet change value: ${deepSet.id} undefined`,
        `set value setted`,
            `loggerItem collection inserted ${deepSet.id}`,
          `loggerSet inserted ${loggerItem.id}: ${loggerItem.id}`,
        `item added`,
            `loggerItem collection inserted ${a.out.id}`,
          `loggerSet updated ${loggerItem.id} from: ${a.id} undefined`,
        `item from setted`,
          `loggerItem collection deleted ${deep.typed.id}`,
          `loggerItem collection deleted ${deepSet.id}`,
            `loggerSet deleted ${loggerItem.id}: ${loggerItem.id}`,
          `loggerItem collection deleted ${a.out.id}`,
        `item destroyed`,
      ]);
    });
  });
  describe('nary', () => {
    it('DeepSetInterspection', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
      const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));

      const intersection = new DeepSetInterspection(deepSetX, deepSetY);
      
      expect(intersection.value).toBeInstanceOf(Deep);
      expect(intersection.value.type_id).toBe(DeepSet.id);
      expect(intersection.value.data.size).toBe(2);
      expect(intersection.value.has(b.id)).toBe(true);
      expect(intersection.value.has(c.id)).toBe(true);

      expect(intersection._sources.size).toBe(2);
      expect(intersection._sources.has(deepSetX.id)).toBe(true);
      expect(intersection._sources.has(deepSetY.id)).toBe(true);

      expect(deepSetX._targets.size).toBe(1);
      expect(deepSetX._targets.has(intersection.id)).toBe(true);
      expect(deepSetY._targets.size).toBe(1);
      expect(deepSetY._targets.has(intersection.id)).toBe(true);

      deepSetX.add(d.id);
      expect(intersection.value.data.size).toBe(3);
      expect(intersection.value.has(d.id)).toBe(true);

      deepSetY.delete(c.id);
      expect(intersection.value.data.size).toBe(2);
      expect(intersection.value.has(c.id)).toBe(false);

      // Restore and check for symmetry
      deepSetY.add(c.id);
      expect(intersection.value.data.size).toBe(3);
      expect(intersection.value.has(c.id)).toBe(true);

      deepSetX.delete(b.id);
      expect(intersection.value.data.size).toBe(2);
      expect(intersection.value.has(b.id)).toBe(false);

      intersection.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(intersection._sources.size).toBe(0);

      // Check if it's no longer reactive
      const sizeBefore = intersection.value.data.size;
      deepSetX.add(b.id);
      expect(intersection.value.data.size).toBe(sizeBefore);
    });
    it('DeepSetDifference', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
      const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));

      const difference = new DeepSetDifference(deepSetX, deepSetY);
      
      expect(difference.value).toBeInstanceOf(Deep);
      expect(difference.value.type_id).toBe(DeepSet.id);
      expect(difference.value.data.size).toBe(1);
      expect(difference.value.has(a.id)).toBe(true);
      expect(difference.value.has(b.id)).toBe(false);
      expect(difference.value.has(c.id)).toBe(false);
      expect(difference.value.has(d.id)).toBe(false);

      expect(difference._sources.size).toBe(2);
      expect(difference._sources.has(deepSetX.id)).toBe(true);
      expect(difference._sources.has(deepSetY.id)).toBe(true);

      expect(deepSetX._targets.size).toBe(1);
      expect(deepSetX._targets.has(difference.id)).toBe(true);
      expect(deepSetY._targets.size).toBe(1);
      expect(deepSetY._targets.has(difference.id)).toBe(true);

      const e = deep();
      deepSetX.add(e.id);
      expect(difference.value.data.size).toBe(2);
      expect(difference.value.has(e.id)).toBe(true);

      // Adding an element to the second set should remove it from the difference
      deepSetY.add(a.id);
      expect(difference.value.data.size).toBe(1);
      expect(difference.value.has(a.id)).toBe(false);
  
      deepSetY.delete(b.id);
      expect(difference.value.data.size).toBe(2);
      expect(difference.value.has(b.id)).toBe(true);
  
      deepSetX.delete(e.id);
      expect(difference.value.data.size).toBe(1);
      expect(difference.value.has(e.id)).toBe(false);
  
      difference.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(difference._sources.size).toBe(0);

      // Check if it's no longer reactive
      const sizeBefore = difference.value.data.size;
      deepSetX.add(a.id);
      expect(difference.value.data.size).toBe(sizeBefore);
    });
    it('DeepSetUnion', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
      const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));

      const union = new DeepSetUnion(deepSetX, deepSetY);
      
      expect(union.value).toBeInstanceOf(Deep);
      expect(union.value.type_id).toBe(DeepSet.id);
      expect(union.value.data.size).toBe(4);
      expect(union.value.has(a.id)).toBe(true);
      expect(union.value.has(b.id)).toBe(true);
      expect(union.value.has(c.id)).toBe(true);
      expect(union.value.has(d.id)).toBe(true);

      expect(union._sources.size).toBe(2);
      expect(union._sources.has(deepSetX.id)).toBe(true);
      expect(union._sources.has(deepSetY.id)).toBe(true);

      expect(deepSetX._targets.size).toBe(1);
      expect(deepSetX._targets.has(union.id)).toBe(true);
      expect(deepSetY._targets.size).toBe(1);
      expect(deepSetY._targets.has(union.id)).toBe(true);

      const e = deep();
      deepSetX.add(e.id);
      expect(union.value.data.size).toBe(5);
      expect(union.value.has(e.id)).toBe(true);

      deepSetY.delete(d.id);
      expect(union.value.data.size).toBe(4);
      expect(union.value.has(d.id)).toBe(false);

      deepSetX.delete(b.id);
      expect(union.value.data.size).toBe(4);
      expect(union.value.has(b.id)).toBe(true);

      deepSetY.delete(b.id);
      expect(union.value.data.size).toBe(3);
      expect(union.value.has(b.id)).toBe(false);

      union.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(union._sources.size).toBe(0);

      // Check if it's no longer reactive
      const sizeBefore = union.value.data.size;
      deepSetX.add(b.id);
      expect(union.value.data.size).toBe(sizeBefore);
    });
    it('DeepSetAnd', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();
      const e = deep();
      const f = deep();

      const deepSetX = new DeepSet(new Set([a.id, b.id, c.id, d.id]));
      const deepSetY = new DeepSet(new Set([b.id, c.id, d.id, e.id]));
      const deepSetZ = new DeepSet(new Set([c.id, d.id, e.id, f.id]));

      const and = new DeepSetAnd(deepSetX, deepSetY, deepSetZ);
      
      expect(and.value).toBeInstanceOf(Deep);
      expect(and.value.type_id).toBe(DeepSet.id);
      expect(and.value.data.size).toBe(2);
      expect(and.value.has(c.id)).toBe(true);
      expect(and.value.has(d.id)).toBe(true);

      // Add element to some sets, but not all
      const g = deep();
      deepSetX.add(g.id);
      expect(and.value.data.size).toBe(2);
      deepSetY.add(g.id);
      expect(and.value.data.size).toBe(2);

      // Add element to the final set, making it appear in the result
      deepSetZ.add(g.id);
      expect(and.value.data.size).toBe(3);
      expect(and.value.has(g.id)).toBe(true);

      // Remove element from one set, should disappear from result
      deepSetY.delete(d.id);
      expect(and.value.data.size).toBe(2);
      expect(and.value.has(d.id)).toBe(false);

      and.destroy();
      
      // Check if it's no longer reactive
      const sizeBefore = and.value.data.size;
      deepSetY.add(c.id);
      deepSetZ.add(c.id);
      expect(and.value.data.size).toBe(sizeBefore);
    });
  });
  it('DeepSetMapSet', () => {
    const A = deep();
    const B = deep();
    const C = deep();
    const a = new A();
    const b = new B();
    const c = new C();
    const sourceSet = new DeepSet(new Set([a.id, b.id, c.id]));
    const mapper = (value) => value.type;

    const mappedSet = new DeepSetMapSet(sourceSet, mapper);
    const mappedSetValueData = mappedSet.value.data;

    // Initial state
    expect(mappedSet.value).toBeInstanceOf(Deep);
    expect(mappedSet.value.type_id).toBe(DeepSet.id);
    expect(mappedSet.value.data.size).toBe(3);
    expect(mappedSet.value.has(A.id)).toBe(true);
    expect(mappedSet.value.has(B.id)).toBe(true);
    expect(mappedSet.value.has(C.id)).toBe(true);
    expect(mappedSet.value.has(a.id)).toBe(false);

    // Reactivity on Add
    const D = deep();
    const d = new D();
    sourceSet.add(d);
    expect(mappedSet.value.data.size).toBe(4);
    expect(mappedSet.value.has(D.id)).toBe(true);

    // Reactivity on Delete
    sourceSet.delete(a);
    expect(mappedSet.value.data.size).toBe(3);
    expect(mappedSet.value.has(A.id)).toBe(false);

    // Reactivity on Update
    b.type = C;
    expect(mappedSet.value.data.size).toBe(2);
    expect(mappedSet.value.has(B.id)).toBe(false);
    expect(mappedSet.value.has(C.id)).toBe(true);

    // Destroy
    mappedSet.destroy();
    expect(sourceSet._targets.has(mappedSet.id)).toBe(false);
    expect(mappedSet.value.data).toBe(undefined);
    const e = new deep();
    sourceSet.add(e);
    expect(mappedSetValueData.size).toBe(2);
  });
  it.skip('RelationManyField returns DeepSet', () => {
    const a = deep();
    const b = deep();
    a.type_id = b.id;

    // Check internal representation first
    const backwards = Deep.getBackward('type', b.id);
    expect(backwards).toBeInstanceOf(Deep);
    expect(backwards.type_id).toBe(DeepSet.id);
    expect(backwards.has(a.id)).toBe(true);

    // Check the public-facing accessor
    const typedSet = b.typed;
    expect(typedSet).toBeInstanceOf(Deep);
    expect(typedSet.type_id).toBe(DeepSet.id);
    expect(typedSet.has(a.id)).toBe(true);
  });
  // it('Deep.getBackward returns DeepSet after migration', () => {
  //   // Test that getBackward always returns a DeepSet
  //   const testId = 'test-id-' + Math.random();
    
  //   // First call should create new DeepSet
  //   const backwards1 = Deep.getBackward('test-relation', testId);
  //   expect(backwards1).toBeInstanceOf(Deep);
  //   expect(backwards1.type_id).toBe(DeepSet.id);
    
  //   // Second call should return the same DeepSet
  //   const backwards2 = Deep.getBackward('test-relation', testId);
  //   expect(backwards2).toBe(backwards1);
  //   expect(backwards2.id).toBe(backwards1.id);
  // });
  // it('Deep._relations backwards are all DeepSets', () => {
  //   // Create some relations to test migration
  //   const a = deep();
  //   const b = deep();
  //   const c = deep();
    
  //   a.type_id = b.id;
  //   c.type_id = b.id;
    
  //   // Check that getBackward returns DeepSets (this triggers conversion)
  //   for (const relationName in Deep._relations) {
  //     const relation = Deep._relations[relationName];
  //     if (relation && relation.backwards) {
  //       for (const id in relation.backwards) {
  //         // Use getBackward to get the converted version
  //         const backwards = Deep.getBackward(relationName, id);
  //         if (backwards) {
  //           expect(backwards).toBeInstanceOf(Deep);
  //           expect(backwards.type_id).toBe(DeepSet.id);
  //         }
  //       }
  //     }
  //   }
  // });
  // it('Deep.setForward creates DeepSet backwards', () => {
  //   const elementId = Deep.newId();
  //   const targetId = Deep.newId();
    
  //   // Add both IDs to all relations to avoid validation errors
  //   Deep._relations.all.add(elementId);
  //   Deep._relations.all.add(targetId);
    
  //   // Set forward relation
  //   Deep.setForward('test-relation-new', elementId, targetId);
    
  //   // Check that backwards was created as DeepSet
  //   const backwards = Deep.getBackward('test-relation-new', targetId);
  //   expect(backwards).toBeInstanceOf(Deep);
  //   expect(backwards.type_id).toBe(DeepSet.id);
  //   expect(backwards.has(elementId)).toBe(true);
    
  //   // Clean up
  //   Deep._relations.all.delete(elementId);
  //   Deep._relations.all.delete(targetId);
  // });
  // it('Deep.unsetForward keeps backwards sets', () => {
  //   const elementId = Deep.newId();
  //   const targetId = Deep.newId();
    
  //   // Add both IDs to all relations to avoid validation errors
  //   Deep._relations.all.add(elementId);
  //   Deep._relations.all.add(targetId);
    
  //   // Set forward relation
  //   Deep.setForward('test-relation-keep', elementId, targetId);
    
  //   // Get backwards reference
  //   const backwards = Deep.getBackward('test-relation-keep', targetId);
  //   expect(backwards.has(elementId)).toBe(true);
    
  //   // Unset forward relation
  //   Deep.unsetForward('test-relation-keep', elementId);
    
  //   // Check that backwards set still exists but element is removed
  //   const backwardsAfter = Deep.getBackward('test-relation-keep', targetId);
  //   expect(backwardsAfter).toBe(backwards); // Same DeepSet instance
  //   expect(backwardsAfter.has(elementId)).toBe(false);
    
  //   // Clean up
  //   Deep._relations.all.delete(elementId);
  //   Deep._relations.all.delete(targetId);
  // });
  // it('RelationManyField reactivity test', () => {
  //   const a = deep();
  //   const b = deep();
  //   const c = deep();
    
  //   // Set up initial relation
  //   a.type_id = b.id;
    
  //   // Get typed set
  //   const typedSet = b.typed;
  //   expect(typedSet.data.size).toBe(1);
  //   expect(typedSet.has(a.id)).toBe(true);
    
  //   // Add another relation
  //   c.type_id = b.id;
  //   expect(typedSet.data.size).toBe(2);
  //   expect(typedSet.has(c.id)).toBe(true);
    
  //   // Remove a relation
  //   delete a.type_id;
  //   expect(typedSet.data.size).toBe(1);
  //   expect(typedSet.has(a.id)).toBe(false);
  //   expect(typedSet.has(c.id)).toBe(true);
  // });
  // describe('DeepInterspection', () => {
  //   it('should create and maintain an intersection of two DeepSets', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
  //     const d = deep();

  //     const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
  //     const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));

  //     const intersection = new DeepInterspection(deepSetX, deepSetY);
      
  //     expect(intersection.value).toBeInstanceOf(Deep);
  //     expect(intersection.value.type_id).toBe(DeepSet.id);
  //     expect(intersection.value.data.size).toBe(2);
  //     expect(intersection.value.has(b.id)).toBe(true);
  //     expect(intersection.value.has(c.id)).toBe(true);

  //     expect(Object.keys(intersection._sources).length).toBe(2);
  //     expect(intersection._sources[deepSetX.id]).toBe(deepSetX);
  //     expect(intersection._sources[deepSetY.id]).toBe(deepSetY);

  //     expect(Object.keys(deepSetX._targets).length).toBe(1);
  //     expect(deepSetX._targets[intersection.id].id).toBe(intersection.id);
  //     expect(Object.keys(deepSetY._targets).length).toBe(1);
  //     expect(deepSetY._targets[intersection.id].id).toBe(intersection.id);

  //     deepSetX.add(d.id);
  //     expect(intersection.value.data.size).toBe(3);
  //     expect(intersection.value.has(d.id)).toBe(true);

  //     deepSetY.delete(c.id);
  //     expect(intersection.value.data.size).toBe(2);
  //     expect(intersection.value.has(c.id)).toBe(false);

  //     intersection.destroy();
  //     expect(Object.keys(deepSetX._targets).length).toBe(0);
  //     expect(Object.keys(deepSetY._targets).length).toBe(0);
  //   });
  // });
  // describe('DeepQueryManyRelation', () => {
  //   it('should create and maintain a reactive relation query', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
      
  //     // Set up relations
  //     a.type_id = b.id;
  //     c.type_id = b.id;
      
  //     // Create query for 'typed' field of b
  //     const typedQuery = new DeepQueryManyRelation(b, 'typed');
      
  //     expect(typedQuery.value).toBeInstanceOf(Deep);
  //     expect(typedQuery.value.type_id).toBe(DeepSet.id);
  //     expect(typedQuery.value.data.size).toBe(2);
  //     expect(typedQuery.value.has(a.id)).toBe(true);
  //     expect(typedQuery.value.has(c.id)).toBe(true);
      
  //     // Test single relation field
  //     const typeQuery = new DeepQueryManyRelation(a, 'type');
  //     expect(typeQuery.value.data.size).toBe(1);
  //     expect(typeQuery.value.has(b.id)).toBe(true);
      
  //     // Test dynamic updates
  //     const d = deep();
  //     d.type_id = b.id;
  //     expect(typedQuery.value.data.size).toBe(3);
  //     expect(typedQuery.value.has(d.id)).toBe(true);
      
  //     // Test removal (now works with reactive DeepFilter/DeepMap)
  //     delete a.type_id;
  //     expect(typedQuery.value.data.size).toBe(2);
  //     expect(typedQuery.value.has(a.id)).toBe(false);
      
  //     // Test single field change (now works with reactive DeepFilter/DeepMap)
  //     a.type_id = c.id;
  //     expect(typeQuery.value.data.size).toBe(1);
  //     expect(typeQuery.value.has(c.id)).toBe(true);
  //     expect(typeQuery.value.has(b.id)).toBe(false);
      
  //     typedQuery.destroy();
  //     typeQuery.destroy();
  //   });
  // });
  // describe('DeepAnd', () => {
  //   it('should create and maintain an n-ary intersection of DeepSets', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
  //     const d = deep();
  //     const e = deep();

  //     const deepSetX = new DeepSet(new Set([a.id, b.id, c.id]));
  //     const deepSetY = new DeepSet(new Set([b.id, c.id, d.id]));
  //     const deepSetZ = new DeepSet(new Set([c.id, d.id, e.id]));

  //     const and = new DeepAnd(deepSetX, deepSetY, deepSetZ);
      
  //     expect(and.value).toBeInstanceOf(Deep);
  //     expect(and.value.type_id).toBe(DeepSet.id);
  //     expect(and.value.data.size).toBe(1);
  //     expect(and.value.has(c.id)).toBe(true);
  //     expect(and.value.has(a.id)).toBe(false);
  //     expect(and.value.has(b.id)).toBe(false);
  //     expect(and.value.has(d.id)).toBe(false);
  //     expect(and.value.has(e.id)).toBe(false);

  //     expect(Object.keys(and._sources).length).toBe(3);
  //     expect(and._sources[deepSetX.id]).toBe(deepSetX);
  //     expect(and._sources[deepSetY.id]).toBe(deepSetY);
  //     expect(and._sources[deepSetZ.id]).toBe(deepSetZ);

  //     // Test dynamic updates
  //     // Adding d to X makes X = [a, b, c, d], Y = [b, c, d], Z = [c, d, e]
  //     // Intersection should be [c, d]
  //     deepSetX.add(d.id);
  //     expect(and.value.data.size).toBe(2);
  //     expect(and.value.has(c.id)).toBe(true);
  //     expect(and.value.has(d.id)).toBe(true);

  //     // Adding e to Y makes X = [a, b, c, d], Y = [b, c, d, e], Z = [c, d, e]
  //     // Intersection should be [c, d] because e is not in X
  //     deepSetY.add(e.id);
  //     expect(and.value.data.size).toBe(2);
  //     expect(and.value.has(c.id)).toBe(true);
  //     expect(and.value.has(d.id)).toBe(true);
  //     expect(and.value.has(e.id)).toBe(false);

  //     // Adding e to X makes X = [a, b, c, d, e], Y = [b, c, d, e], Z = [c, d, e]
  //     // Intersection should be [c, d, e]
  //     deepSetX.add(e.id);
  //     expect(and.value.data.size).toBe(3);
  //     expect(and.value.has(c.id)).toBe(true);
  //     expect(and.value.has(d.id)).toBe(true);
  //     expect(and.value.has(e.id)).toBe(true);

  //     and.destroy();
  //     expect(Object.keys(deepSetX._targets).length).toBe(0);
  //     expect(Object.keys(deepSetY._targets).length).toBe(0);
  //     expect(Object.keys(deepSetZ._targets).length).toBe(0);
  //   });
  //   it('debug DeepAnd with simple case', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();

  //     const deepSetX = new DeepSet(new Set([a.id, b.id]));
  //     const deepSetY = new DeepSet(new Set([b.id, c.id]));

  //     const and = new DeepAnd(deepSetX, deepSetY);
      
  //     console.log('Initial state:');
  //     console.log('and.value.data.size:', and.value.data.size);
  //     console.log('and.value.has(b.id):', and.value.has(b.id));
      
  //     expect(and.value.data.size).toBe(1);
  //     expect(and.value.has(b.id)).toBe(true);

  //     // Add c to X
  //     deepSetX.add(c.id);
  //     console.log('After adding c to X:');
  //     console.log('and.value.data.size:', and.value.data.size);
  //     console.log('and.value.has(b.id):', and.value.has(b.id));
  //     console.log('and.value.has(c.id):', and.value.has(c.id));
      
  //     expect(and.value.data.size).toBe(2);
  //     expect(and.value.has(b.id)).toBe(true);
  //     expect(and.value.has(c.id)).toBe(true);

  //     and.destroy();
  //   });
  // });
  // describe('DeepMapByField', () => {
  //   it('should map elements by their relation fields', () => {
  //     const typeA = deep();
  //     const typeB = deep();
  //     const a1 = deep();
  //     const a2 = deep();
  //     const b1 = deep();
  //     const b2 = deep();
      
  //     // Set up relations
  //     a1.type_id = typeA.id;
  //     a2.type_id = typeA.id;
  //     b1.type_id = typeB.id;
  //     b2.type_id = typeB.id;
      
  //     // Create set of elements
  //     const elementSet = new DeepSet(new Set([a1.id, a2.id, b1.id, b2.id]));
      
  //     // Map by type field
  //     const mapByType = new DeepMapByField(elementSet, 'type');
      
  //     expect(mapByType.value).toBeInstanceOf(Deep);
  //     expect(mapByType.value.type_id).toBe(DeepSet.id);
  //     expect(mapByType.value.data.size).toBe(2);
  //     expect(mapByType.value.has(typeA.id)).toBe(true);
  //     expect(mapByType.value.has(typeB.id)).toBe(true);
      
  //     // Test dynamic updates - add new element with existing type
  //     const a3 = deep();
  //     a3.type_id = typeA.id;
  //     elementSet.add(a3.id);
      
  //     expect(mapByType.value.data.size).toBe(2); // Should still be 2, same types
  //     expect(mapByType.value.has(typeA.id)).toBe(true);
  //     expect(mapByType.value.has(typeB.id)).toBe(true);
      
  //     // Test dynamic updates - add new element with new type
  //     const typeC = deep();
  //     const c1 = deep();
  //     c1.type_id = typeC.id;
  //     elementSet.add(c1.id);
      
  //     expect(mapByType.value.data.size).toBe(3);
  //     expect(mapByType.value.has(typeA.id)).toBe(true);
  //     expect(mapByType.value.has(typeB.id)).toBe(true);
  //     expect(mapByType.value.has(typeC.id)).toBe(true);
      
  //     // Test removal
  //     elementSet.delete(a1.id);
  //     elementSet.delete(a2.id);
  //     elementSet.delete(a3.id);
      
  //     expect(mapByType.value.data.size).toBe(2);
  //     expect(mapByType.value.has(typeA.id)).toBe(false);
  //     expect(mapByType.value.has(typeB.id)).toBe(true);
  //     expect(mapByType.value.has(typeC.id)).toBe(true);
      
  //     mapByType.destroy();
  //     expect(Object.keys(elementSet._targets).length).toBe(0);
  //   });
  // });
  // describe('DeepQueryField', () => {
  //   it('should handle id field queries', () => {
  //     const element = deep();
      
  //     // Test with Deep instance
  //     const queryById = new DeepQueryField('id', element);
  //     expect(queryById.value).toBeInstanceOf(Deep);
  //     expect(queryById.value.type_id).toBe(DeepSet.id);
  //     expect(queryById.value.data.size).toBe(1);
  //     expect(queryById.value.has(element.id)).toBe(true);
      
  //     // Test with string id
  //     const queryByIdString = new DeepQueryField('id', element.id);
  //     expect(queryByIdString.value).toBeInstanceOf(Deep);
  //     expect(queryByIdString.value.type_id).toBe(DeepSet.id);
  //     expect(queryByIdString.value.data.size).toBe(1);
  //     expect(queryByIdString.value.has(element.id)).toBe(true);
      
  //     queryById.destroy();
  //     queryByIdString.destroy();
  //   });
    
  //   it('should handle relation field queries with field inversion', () => {
  //     const typeA = deep();
  //     const a1 = deep();
  //     const a2 = deep();
      
  //     // Set up relations
  //     a1.type_id = typeA.id;
  //     a2.type_id = typeA.id;
      
  //     // Query by type field - should return elements that have this type
  //     const queryByType = new DeepQueryField('type', typeA);
  //     expect(queryByType.value).toBeInstanceOf(Deep);
  //     expect(queryByType.value.type_id).toBe(DeepSet.id);
  //     // Note: This test may fail due to RelationManyField reactivity issues
  //     // but the basic structure should work
      
  //     // Query by typed field - should return types of elements that are typed by this element
  //     const queryByTyped = new DeepQueryField('typed', a1);
  //     expect(queryByTyped.value).toBeInstanceOf(Deep);
  //     expect(queryByTyped.value.type_id).toBe(DeepSet.id);
      
  //     queryByType.destroy();
  //     queryByTyped.destroy();
  //   });
    
  //   it('should handle string field values', () => {
  //     const typeA = deep();
  //     const a1 = deep();
  //     a1.type_id = typeA.id;
      
  //     // Check that relation is established correctly
  //     console.log('Deep.inherit["typed"]:', Deep.inherit['typed']);
  //     console.log('typeA.typed:', typeA.typed);
  //     if (typeA.typed) {
  //       console.log('typeA.typed.data:', typeA.typed.data);
  //       console.log('typeA.typed.has(a1.id):', typeA.typed.has(a1.id));
  //     }
      
  //     // Query by type field with string id
  //     const queryByTypeString = new DeepQueryField('type', typeA.id);
  //     expect(queryByTypeString.value).toBeInstanceOf(Deep);
  //     expect(queryByTypeString.value.type_id).toBe(DeepSet.id);
      
  //     // Debug the relation query
  //     const relationQuery = new DeepQueryManyRelation(typeA, 'typed');
  //     console.log('relationQuery.value:', relationQuery.value);
  //     console.log('typeA.typed:', typeA.typed);
      
  //     expect(queryByTypeString.value).toBeInstanceOf(Deep);
  //   });
  // });
  // describe('DeepQuery', () => {
  //   it('should handle single field queries', () => {
  //     const element = deep();
      
  //     // Test id query
  //     const queryById = new DeepQuery({ id: element.id });
  //     expect(queryById.value).toBeInstanceOf(Deep);
  //     expect(queryById.value.type_id).toBe(DeepSet.id);
  //     expect(queryById.value.data.size).toBe(1);
  //     expect(queryById.value.has(element.id)).toBe(true);
      
  //     queryById.destroy();
  //   });
    
  //   it('should handle multiple field queries with intersection', () => {
  //     const typeA = deep();
  //     const fromB = deep();
  //     const a1 = deep();
  //     const a2 = deep();
      
  //     // Set up relations
  //     a1.type_id = typeA.id;
  //     a1.from_id = fromB.id;
  //     a2.type_id = typeA.id;
  //     // a2 doesn't have from_id = fromB.id
      
  //     // Query with multiple criteria - should intersect results
  //     const query = new DeepQuery({ 
  //       type: typeA.id,
  //       from: fromB.id 
  //     });
      
  //     expect(query.value).toBeInstanceOf(Deep);
  //     expect(query.value.type_id).toBe(DeepSet.id);
  //     // Should only return a1, not a2 (due to intersection)
      
  //     query.destroy();
  //   });
    
  //   it('should handle empty criteria', () => {
  //     const query = new DeepQuery({});
  //     expect(query.value).toBeInstanceOf(Deep);
  //     expect(query.value.type_id).toBe(DeepSet.id);
  //     expect(query.value.data.size).toBe(0);
      
  //     query.destroy();
  //   });
    
  //   it('should reject advanced operators for now', () => {
  //     expect(() => {
  //       new DeepQuery({ _or: [{ type: 'test' }] });
  //     }).toThrow('Advanced query operators not yet implemented');
      
  //     expect(() => {
  //       new DeepQuery({ _and: { type: 'test' } });
  //     }).toThrow('Advanced query operators not yet implemented');
      
  //     expect(() => {
  //       new DeepQuery({ _not: { type: 'test' } });
  //     }).toThrow('Advanced query operators not yet implemented');
      
  //     expect(() => {
  //       new DeepQuery({ order_by: { type: 'asc' } });
  //     }).toThrow('Advanced query operators not yet implemented');
  //   });
  // });
  // describe('DeepFilter', () => {
  //   it('should create and maintain a reactive filtered set', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
  //     const typeA = deep();
  //     const typeB = deep();
      
  //     // Set up relations
  //     a.type_id = typeA.id;
  //     b.type_id = typeB.id;
  //     c.type_id = typeA.id;
      
  //     // Create source set
  //     const sourceSet = new DeepSet(new Set([a.id, b.id, c.id]));
      
  //     // Filter by type
  //     const filteredSet = sourceSet.filter(el => el.type_id === typeA.id);
      
  //     expect(filteredSet.value).toBeInstanceOf(Deep);
  //     expect(filteredSet.value.type_id).toBe(DeepSet.id);
  //     expect(filteredSet.value.data.size).toBe(2);
  //     expect(filteredSet.value.has(a.id)).toBe(true);
  //     expect(filteredSet.value.has(b.id)).toBe(false);
  //     expect(filteredSet.value.has(c.id)).toBe(true);
      
  //     // Test dynamic updates - add new element that passes filter
  //     const d = deep();
  //     d.type_id = typeA.id;
  //     sourceSet.add(d.id);
      
  //     expect(filteredSet.value.data.size).toBe(3);
  //     expect(filteredSet.value.has(d.id)).toBe(true);
      
  //     // Test dynamic updates - add new element that doesn't pass filter
  //     const e = deep();
  //     e.type_id = typeB.id;
  //     sourceSet.add(e.id);
      
  //     expect(filteredSet.value.data.size).toBe(3);
  //     expect(filteredSet.value.has(e.id)).toBe(false);
      
  //     // Test removal
  //     sourceSet.delete(a.id);
  //     expect(filteredSet.value.data.size).toBe(2);
  //     expect(filteredSet.value.has(a.id)).toBe(false);
  //     expect(filteredSet.value.has(c.id)).toBe(true);
  //     expect(filteredSet.value.has(d.id)).toBe(true);
      
  //     // Test update - change element type so it no longer passes filter
  //     c.type_id = typeB.id;
  //     expect(filteredSet.value.data.size).toBe(1);
  //     expect(filteredSet.value.has(c.id)).toBe(false);
  //     expect(filteredSet.value.has(d.id)).toBe(true);
      
  //     // Test update - change element type so it now passes filter
  //     e.type_id = typeA.id;
  //     expect(filteredSet.value.data.size).toBe(2);
  //     expect(filteredSet.value.has(e.id)).toBe(true);
  //     expect(filteredSet.value.has(d.id)).toBe(true);
      
  //     filteredSet.destroy();
  //     expect(Object.keys(sourceSet._targets).length).toBe(0);
  //   });
    
  //   it('should react to element property changes', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
  //     const typeA = deep();
  //     const typeB = deep();
      
  //     // Set up relations
  //     a.type_id = typeA.id;
  //     b.type_id = typeB.id;
  //     c.type_id = typeA.id;
      
  //     // Create source set
  //     const sourceSet = new DeepSet(new Set([a.id, b.id, c.id]));
      
  //     // Filter by type
  //     const filteredSet = sourceSet.filter(el => el.type_id === typeA.id);
      
  //     expect(filteredSet.value.data.size).toBe(2);
  //     expect(filteredSet.value.has(a.id)).toBe(true);
  //     expect(filteredSet.value.has(b.id)).toBe(false);
  //     expect(filteredSet.value.has(c.id)).toBe(true);
      
  //     // Test update - change element type so it no longer passes filter
  //     c.type_id = typeB.id;
  //     expect(filteredSet.value.data.size).toBe(1);
  //     expect(filteredSet.value.has(c.id)).toBe(false);
  //     expect(filteredSet.value.has(a.id)).toBe(true);
      
  //     // Test update - change element type so it now passes filter
  //     b.type_id = typeA.id;
  //     expect(filteredSet.value.data.size).toBe(2);
  //     expect(filteredSet.value.has(b.id)).toBe(true);
  //     expect(filteredSet.value.has(a.id)).toBe(true);
      
  //     filteredSet.destroy();
  //   });
  // });
  // describe('DeepMap', () => {
  //   it('should create and maintain a reactive mapped set', () => {
  //     const a = deep();
  //     const b = deep();
  //     const c = deep();
  //     const typeA = deep();
  //     const typeB = deep();
      
  //     // Set up relations
  //     a.type_id = typeA.id;
  //     b.type_id = typeB.id;
  //     c.type_id = typeA.id;
      
  //     // Create source set
  //     const sourceSet = new DeepSet(new Set([a.id, b.id, c.id]));
      
  //     // Map to types
  //     const mappedSet = sourceSet.map(el => el.type_id);
      
  //     expect(mappedSet.value).toBeInstanceOf(Deep);
  //     expect(mappedSet.value.type_id).toBe(DeepSet.id);
  //     expect(mappedSet.value.data.size).toBe(2);
  //     expect(mappedSet.value.has(typeA.id)).toBe(true);
  //     expect(mappedSet.value.has(typeB.id)).toBe(true);
      
  //     // Test dynamic updates - add new element with existing type
  //     const d = deep();
  //     d.type_id = typeA.id;
  //     sourceSet.add(d.id);
      
  //     expect(mappedSet.value.data.size).toBe(2); // Should still be 2, same types
  //     expect(mappedSet.value.has(typeA.id)).toBe(true);
  //     expect(mappedSet.value.has(typeB.id)).toBe(true);
      
  //     // Test dynamic updates - add new element with new type
  //     const typeC = deep();
  //     const e = deep();
  //     e.type_id = typeC.id;
  //     sourceSet.add(e.id);
      
  //     expect(mappedSet.value.data.size).toBe(3);
  //     expect(mappedSet.value.has(typeA.id)).toBe(true);
  //     expect(mappedSet.value.has(typeB.id)).toBe(true);
  //     expect(mappedSet.value.has(typeC.id)).toBe(true);
      
  //     // Test removal - remove all elements with typeA
  //     sourceSet.delete(a.id);
  //     sourceSet.delete(c.id);
  //     sourceSet.delete(d.id);
      
  //     expect(mappedSet.value.data.size).toBe(2);
  //     expect(mappedSet.value.has(typeA.id)).toBe(false);
  //     expect(mappedSet.value.has(typeB.id)).toBe(true);
  //     expect(mappedSet.value.has(typeC.id)).toBe(true);
      
  //     // Test update - change element type
  //     b.type_id = typeA.id;
  //     expect(mappedSet.value.data.size).toBe(2);
  //     expect(mappedSet.value.has(typeA.id)).toBe(true);
  //     expect(mappedSet.value.has(typeB.id)).toBe(false);
  //     expect(mappedSet.value.has(typeC.id)).toBe(true);
      
  //     mappedSet.destroy();
  //     expect(Object.keys(sourceSet._targets).length).toBe(0);
  //   });
  // });
});
