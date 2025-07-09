import { _Data } from "./_data";
import {
  deep, Deep, DeepSetAnd, DeepSetDifference, DeepFunction, DeepSetInterspection, DeepSet, DeepSetFilterSet, DeepSetMapSet, DeepSetUnion, Field, Method,
  DeepQueryManyRelation, DeepQueryField,
  DeepQuery,
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
          `loggerItem collection deleted ${Deep._relations.all.id}`,
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
  it('DeepSetFilterSet', () => {
    const typeA = deep();
    const typeB = deep();
    const a1 = new typeA();
    const a2 = new typeA();
    const b1 = new typeB();
    const sourceSet = new DeepSet(new Set([a1.id, a2.id, b1.id]));
    const filterer = (el) => el.type_id === typeA.id;

    const filteredSet = new DeepSetFilterSet(sourceSet, filterer);

    // Initial state
    expect(filteredSet.value.data.size).toBe(2);
    expect(filteredSet.value.has(a1.id)).toBe(true);
    expect(filteredSet.value.has(a2.id)).toBe(true);
    expect(filteredSet.value.has(b1.id)).toBe(false);

    // Reactivity on Add
    const a3 = new typeA();
    sourceSet.add(a3);
    expect(filteredSet.value.data.size).toBe(3);
    expect(filteredSet.value.has(a3.id)).toBe(true);

    const b2 = new typeB();
    sourceSet.add(b2);
    expect(filteredSet.value.data.size).toBe(3);
    expect(filteredSet.value.has(b2.id)).toBe(false);

    // Reactivity on Delete
    sourceSet.delete(a1.id);
    expect(filteredSet.value.data.size).toBe(2);
    expect(filteredSet.value.has(a1.id)).toBe(false);

    // Reactivity on Update
    a2.type = typeB;
    expect(filteredSet.value.data.size).toBe(1);
    expect(filteredSet.value.has(a2.id)).toBe(false);

    b1.type = typeA;
    expect(filteredSet.value.data.size).toBe(2);
    expect(filteredSet.value.has(b1.id)).toBe(true);

    // Destroy
    const filteredSetValueData = filteredSet.value.data;
    filteredSet.destroy();
    expect(sourceSet._targets.has(filteredSet.id)).toBe(false);
    expect(filteredSet.value.data).toBe(undefined);
    const e = new deep();
    sourceSet.add(e);
    expect(filteredSetValueData.size).toBe(2);
  });
  it('DeepQueryManyRelation', () => {
    // Test one-to-one relation
    const A_one = deep();
    const a_one = new A_one();
    const B_one = deep();
    
    const typesQuery = new DeepQueryManyRelation(a_one, 'type');
    
    // Initial state for one-to-one
    expect(typesQuery.value).toBeInstanceOf(Deep);
    expect(typesQuery.value.type_id).toBe(DeepSet.id);
    expect(typesQuery.value.data.size).toBe(1);
    expect(typesQuery.value.has(A_one.id)).toBe(true);
    
    // Reactivity for one-to-one
    a_one.type = B_one;
    expect(typesQuery.value.data.size).toBe(1);
    expect(typesQuery.value.has(A_one.id)).toBe(false);
    expect(typesQuery.value.has(B_one.id)).toBe(true);
    
    typesQuery.destroy();
    
    // Test one-to-many relation
    const C_many = deep();
    const c1_many = new C_many();
    const c2_many = new C_many();
    
    const typedQuery = new DeepQueryManyRelation(C_many, 'typed');
    
    // Initial state for one-to-many
    expect(typedQuery.value).toBeInstanceOf(Deep);
    expect(typedQuery.value.type_id).toBe(DeepSet.id);
    expect(typedQuery.value.data.size).toBe(2);
    expect(typedQuery.value.has(c1_many.id)).toBe(true);
    expect(typedQuery.value.has(c2_many.id)).toBe(true);
    
    // Reactivity for one-to-many
    const c3_many = new C_many();
    expect(typedQuery.value.data.size).toBe(3);
    expect(typedQuery.value.has(c3_many.id)).toBe(true);
  });
  it('DeepQueryField', () => {
    const A = deep(), B = deep(), C = deep();
    const a = new A(), b = new B(), c = new C(), z = new A();
    
    const typeA = new DeepQueryField(A, 'type');
  
    // initial results
    expect(typeA.data.size).toBe(2);
    expect(typeA.data.has(a.id)).toBe(true);
    expect(typeA.data.has(b.id)).toBe(false);
    expect(typeA.data.has(c.id)).toBe(false);
    expect(typeA.data.has(z.id)).toBe(true);

    // reactivity on update
    z.type = C;
    expect(typeA.data.size).toBe(1);
    expect(typeA.data.has(a.id)).toBe(true);
    expect(typeA.data.has(b.id)).toBe(false);
    expect(typeA.data.has(c.id)).toBe(false);
    expect(typeA.data.has(z.id)).toBe(false);
    
    c.type = A;
    expect(typeA.data.size).toBe(2);
    expect(typeA.data.has(a.id)).toBe(true);
    expect(typeA.data.has(b.id)).toBe(false);
    expect(typeA.data.has(c.id)).toBe(true);
    expect(typeA.data.has(z.id)).toBe(false);

    typeA.destroy();
    expect(typeA.data).toBe(undefined);
  });
  it('DeepQuery', () => {
    const A = deep(), B = deep(), C = deep();
    const a = new A(), b = new B(), c = new C(), z = new A();
    z.from = a; c.from = a; b.from = z;
    
    const query_type_A = new DeepQuery({ type: A });
    expect(query_type_A.value.data.size).toBe(2);
    expect(query_type_A.value.data.has(a.id)).toBe(true);
    expect(query_type_A.value.data.has(b.id)).toBe(false);
    expect(query_type_A.value.data.has(c.id)).toBe(false);
    expect(query_type_A.value.data.has(z.id)).toBe(true);

    const query_from_a = new DeepQuery({ from: a });
    expect(query_from_a.value.data.size).toBe(2);
    expect(query_from_a.value.data.has(a.id)).toBe(false);
    expect(query_from_a.value.data.has(b.id)).toBe(false);
    expect(query_from_a.value.data.has(c.id)).toBe(true);
    expect(query_from_a.value.data.has(z.id)).toBe(true);

    const query_all = new DeepQuery({});
    expect(query_all.value.data.size).toBe(Deep._relations.all.data.size);
  
  });
});
