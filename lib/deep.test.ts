import { _Data } from "./_data";
import { newDeep } from "./deep";

const deep = newDeep();

// We will check possibilities in order its defined in deep.ts
describe('deep', () => {
  it('new deep.Deep()', () => {
    const a = new deep.Deep(); // only way to create a deep.Deep instance without type
    expect(a instanceof deep.Deep).toBe(true); // any new deep.Deep() should be a deep.Deep instance
    expect(typeof a.id).toEqual('string'); // id is a string always
    expect(a.effect).toBeUndefined(); // by default effect is undefined
  });
  it('new deep.Deep().proxy', () => {
    const a = new deep.Deep().proxy;
    expect(a instanceof deep.Deep).toBe(true);
    expect(typeof a.id).toEqual('string');
  });
  it('typeof inheritance chain', () => {
    const a = deep();
    const b = a();
    const c = b();
    
    expect(c._deep.typeof(a)).toBe(true); // c наследует от b, который наследует от a
    expect(b._deep.typeof(c)).toBe(false); // b не наследует от c
    expect(b._deep.typeof(a)).toBe(true); // b наследует от a
    expect(a._deep.typeof(b)).toBe(false); // a не наследует от b
    expect(a._deep.typeof(a)).toBe(false); // a не наследует от самого себя
    
    // Проверка с id вместо deep.Deep instance
    expect(c._deep.typeof(a.id)).toBe(true);
    expect(b._deep.typeof(c.id)).toBe(false);
    
    // Проверка с несуществующим id
    expect(() => c._deep.typeof({})).toThrow('deep.typeof:');
  });
  it('ƒ effect', () => {
    let _log: string[] = [];
    const generateEffect = (name: string) => function(worker, source, target, stage, args) {
      switch (stage) {
        case deep.Deep._New:{
          _log.push(`new ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case deep.Deep._Constructor:{
          _log.push(`constructor ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case deep.Deep._Apply:{
          _log.push(`apply ${name} ${target.id}`);
          const [input] = args;
          switch (input) {
            case 'x': return target.ref._x;
            default: return worker.super(source, target, stage, args);
          }
        } case deep.Deep._Destructor:{
          _log.push(`destructor ${name} ${target.id}`);
          return worker.super(source, target, stage, args);
        } case deep.Deep._Getter:{
          const [key] = args;
          _log.push(`getter ${name} ${target.id} ${key}`);
          switch (key) {
            case 'x': return target.ref._x;
            default: return worker.super(source, target, stage, args);
          }
        } case deep.Deep._Setter:{
          const [key, value] = args;
          _log.push(`setter ${name} ${target.id} ${key} ${value}`);
          switch (key) {
            case 'x': target.ref._x = value; return;
            default: return worker.super(source, target, stage, args);
          }
        } case deep.Deep._Deleter:{
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
    const A = deep(generateEffect('a'));
    const a = A();
    const AId = A.id;
    const aId = a.id;
    expect(a instanceof deep.Deep).toBe(true);
    expect(_log).toEqual([
      `apply a ${AId}`,
      `constructor a ${aId}`,
      `getter a ${aId} id`,
    ]);
    _log = [];
    const b = new a();
    expect(b instanceof deep.Deep).toBe(true);
    const bId = b.id;
    const aX1 = a.x;
    const bX1 = b.x;
    expect(aX1).toEqual(undefined);
    expect(bX1).toEqual(undefined);
    a.x = 'a';
    b.x = 'b';
    const aX2 = a.x;
    const bX2 = b.x;
    expect(aX2).toEqual('a');
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
      `getter a ${aId} x`,
      `getter a ${bId} x`,
      `setter a ${aId} x a`,
      `setter a ${bId} x b`,
      `getter a ${aId} x`,
      `getter a ${bId} x`,
      `apply a ${bId}`,
      `deleter a ${aId} x`,
      `deleter a ${bId} x`,
      `getter a ${aId} x`,
      `getter a ${bId} x`,
    ]);
    _log = [];
    const c = b(generateEffect('c'));
    expect(c instanceof deep.Deep).toBe(true);
    const cId = c.id;
    expect(_log).toEqual([
      `apply a ${bId}`,
      `constructor a ${cId}`,
      `getter a ${cId} id`,
    ]);
    const d = new c();
    expect(d instanceof deep.Deep).toBe(true);
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
  it('deep.Field ƒ effect', () => {
    const a = deep();
    let _log: string[] = [];
    const field = deep.Field((worker, source, target, stage, args) => {
      switch (stage) {
        case deep.Deep._FieldGetter:{
          _log.push(`getter`);
          return target.ref._test;
        } case deep.Deep._FieldSetter:{
          _log.push(`setter`);
          const [key, value] = args;
          target.ref._test = value;
          return;
        } case deep.Deep._FieldDeleter:{
          _log.push(`deleter`);
          delete target.ref._test;
          // delete deep.Deep._unsafeInherit.test;
          delete a._deep.inherit.test; // only testing delete from inherit system
          return;
        } default: return worker.super(source, target, stage, args);
      }
    });
    // Now, we still can't be able to use Inheritance management
    deep.test = field; // use global inherit object
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
    ]);
  });
  it('double', () => {
    const a = new deep.Deep();
    const b = new deep.Deep(a.id);
    expect(a.id).toBe(b.id);
  });
  it('deep.many', () => {
    const a = deep();
    const manySet = a.many;

    // Test creation and content
    expect(manySet).toBeInstanceOf(deep.Deep);
    expect(manySet.type_id).toBe(deep.Set.id);
    expect(manySet.data.size).toBe(1);
    expect(manySet.has(a.id)).toBe(true);

    // Test caching
    const manySet2 = a.many;
    expect(manySet2.id).toBe(manySet.id);

    // Test destruction cleanup
    const aId = a.id;
    expect(deep.Deep._many[aId]).toBe(manySet.id);
    a.destroy();
    expect(deep.Deep._many[aId]).toBeUndefined();
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
      expect(b.typed).toBeInstanceOf(deep.Deep);
      expect(b.typed.data.size).toBe(0);
      expect(b.typed.has(a.id)).toBeFalsy();
      a.type_id = b.id;
      expect(b.typed).toBeInstanceOf(deep.Deep);
      expect(b.typed.data.size).toBe(1);
      expect(b.typed.has(a.id)).toBeTruthy();
      
      // Test edge cases
      // Multiple instances of same type
      const c = deep();
      const d = deep();
      c.type = b;
      d.type = b;
      expect(b.typed.data.size).toBe(3);
      expect(b.typed.has(c.id)).toBe(true);
      expect(b.typed.has(d.id)).toBe(true);
      
      // Change type removes from typed
      c.type = d;
      expect(b.typed.data.size).toBe(2);
      expect(b.typed.has(c.id)).toBe(false);
      expect(d.typed.data.size).toBe(1);
      expect(d.typed.has(c.id)).toBe(true);
      
      // Delete type removes from typed
      delete a.type_id;
      expect(b.typed.data.size).toBe(1);
      expect(b.typed.has(a.id)).toBe(false);
      
      // Chain of types
      const e = deep();
      const f = deep();
      e.type = f;
      f.type = b;
      expect(b.typed.data.size).toBe(2); // d and f
      expect(f.typed.data.size).toBe(1); // e
      expect(b.typed.has(f.id)).toBe(true);
      expect(f.typed.has(e.id)).toBe(true);
    });
    it('CollectionUpdate', () => {
      let listener_log: any[] = [];
      const listener = deep((worker, source, target, stage, args) => {
        listener_log.push({ stage, sourceId: source.id, targetId: target.id, args });
        return worker.super(source, target, stage, args);
      });

      const deepSet = new deep.Set();
      listener.value = deepSet;

      const a = deep();
      deepSet.add(a);
      
      const b = deep();
      const old_from_id = a.from_id;
      listener_log = []; // reset log
      a.from_id = b.id;

      expect(listener_log.length).toBe(1);
      const updateEvent = listener_log.find(e => e.stage === deep.Deep._Updated);
      expect(updateEvent).toBeDefined();
      expect(updateEvent.sourceId).toBe(a.id);
      expect(updateEvent.targetId).toBe(listener.id);
      expect(updateEvent.args[0]?.id).toEqual(a.id);
      expect(updateEvent.args[1]).toEqual('from');
      expect(updateEvent.args[2]?.id).toEqual(b.id);
      expect(updateEvent.args[3]).toEqual(old_from_id);
    });
  });
  describe('deep.Function', () => {
    it('.ref._data Function', () => {
      expect(deep.Function._deep.ref._data).toBeInstanceOf(_Data);
      const a = new deep.Function(function(this, a, b, c) {
        if (this instanceof deep.Deep) return this.id;
        if (this?.x) return this.x + a + b + c;
        return a + b + c;
      });
      expect(a.data).toBeInstanceOf(Function);
      const b = new deep.Function(a.id);
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
  describe('deep.String', () => {
    it('.ref._data String', () => {
      expect(deep.String._deep.ref._data).toBeInstanceOf(_Data);
      
      // Test basic string creation
      const a = new deep.String('hello');
      expect(a.data).toBe('hello');
      expect(typeof a.data).toBe('string');
      
      // Test deduplication - same string should have same id
      const b = new deep.String('hello');
      expect(b.id).toBe(a.id);
      expect(b.data).toBe(a.data);
      expect(b.data).toBe('hello');
      
      // Test different string gets different id
      const c = new deep.String('world');
      expect(c.id).not.toBe(a.id);
      expect(c.data).toBe('world');
      expect(c.data).not.toBe(a.data);
      
      // Test empty string
      const d = new deep.String('');
      expect(d.data).toBe('');
      expect(d.id).not.toBe(a.id);
      expect(d.id).not.toBe(c.id);
      
      // Test same empty string deduplication
      const e = new deep.String('');
      expect(e.id).toBe(d.id);
      expect(e.data).toBe(d.data);
      
      // Test error on non-string input
      expect(() => new deep.String(123)).toThrow('deep.String.new:!string');
      expect(() => new deep.String(null)).toThrow('deep.String.new:!string');
      expect(() => new deep.String(undefined)).toThrow('deep.String.new:!string');
      expect(() => new deep.String({})).toThrow('deep.String.new:!string');
      
      // Test destroy
      const originalData = a.data;
      a.destroy();
      expect(a.data).toBeUndefined();
      expect(b.data).toBeUndefined(); // both should be undefined since they shared same data
      
      // Test that new string with same value gets new id after destroy
      const f = new deep.String('hello');
      expect(f.data).toBe('hello');
      expect(f.id).not.toBe(a.id); // should be different id since original was destroyed
    });
    
    it('value relation with deep', () => {
      // Test a.value = deep.String('x'), a.data returns 'x'
      const a = deep();
      const str = new deep.String('x');
      a.value = str;
      expect(a.data).toBe('x');
      
      // Test with different string
      const str2 = new deep.String('test string');
      const b = deep();
      b.value = str2;
      expect(b.data).toBe('test string');
      
      // Test with empty string
      const str3 = new deep.String('');
      const c = deep();
      c.value = str3;
      expect(c.data).toBe('');
      
      // Test deduplication in value relation
      const d = deep();
      const str4 = new deep.String('x'); // same as str
      d.value = str4;
      expect(d.data).toBe('x');
      expect(str4.id).toBe(str.id); // should be same id due to deduplication
      
      // Test multiple deeps with same string value
      const e = deep();
      e.value = str; // reuse same string instance
      expect(e.data).toBe('x');
      expect(a.value_id).toBe(e.value_id); // should point to same string instance
      
      // Test that using deduplicated string also works
      const f = deep();
      f.value = str4; // str4 has same id as str due to deduplication
      expect(f.data).toBe('x');
      expect(a.value_id).toBe(f.value_id); // should point to same string instance
    });
  });
  describe('deep.Set', () => {
    it('.ref._data Set', () => {
      expect(deep.Set._deep.ref._data).toBeInstanceOf(_Data);
      const deepSet1 = new deep.Set();
      expect(deepSet1.data).toBeInstanceOf(Set);
      const deepSet2 = new deep.Set(deepSet1.id);
      expect(deepSet2.data).toBe(deepSet1.data);
      deepSet1.destroy();
      expect(deepSet1.data).toBeUndefined();
      expect(deepSet2.data).toBeUndefined();
    });
    it('.add .has .delete', () => {
      const a = new deep.Set();
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
      
      // Test edge cases
      // Add multiple different elements
      a.add(1);
      a.add(2);
      a.add(3);
      expect(a.data.size).toBe(3);
      expect(a.has(1)).toBe(true);
      expect(a.has(2)).toBe(true);
      expect(a.has(3)).toBe(true);
      
      // Add deep.Deep instances
      const x = deep();
      const y = deep();
      a.add(x);
      a.add(y);
      expect(a.data.size).toBe(5);
      expect(a.has(x.id)).toBe(true);
      expect(a.has(y.id)).toBe(true);
      
      // Delete specific elements
      expect(a.delete(2)).toBe(true);
      expect(a.data.size).toBe(4);
      expect(a.has(2)).toBe(false);
      
      // Delete deep.Deep instances
      expect(a.delete(x)).toBe(true);
      expect(a.data.size).toBe(3);
      expect(a.has(x.id)).toBe(false);
      
      // Delete non-existent elements
      expect(a.delete(999)).toBe(false);
      expect(a.data.size).toBe(3);
      
      // Clear by deleting all
      a.delete(1);
      a.delete(3);
      a.delete(y);
      expect(a.data.size).toBe(0);
      expect(a.has(1)).toBe(false);
      expect(a.has(3)).toBe(false);
      expect(a.has(y.id)).toBe(false);
    });
    it('collection effects', () => {
      let _log: any[] = [];
      const a = deep();
      const loggerSet = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case deep.Deep._Inserted: {
            const [key, value] = args;
            _log.push(`loggerSet inserted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Updated: {
            const [value, key, next, prev] = args;
            _log.push(`loggerSet updated ${value.id} ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Deleted: {
            const [key, value] = args;
            _log.push(`loggerSet deleted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Change: {
            const [key, next, prev] = args;
            _log.push(`loggerSet change ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } default: {
            // _log.push(`loggerSet default ${stage} ${args}`);
            return worker.super(source, target, stage, args);
          }
        }
      });
      const deepSet = new deep.Set();
      loggerSet.value = deepSet;
      _log.push(`set value setted`);
      const loggerItem = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case deep.Deep._CollectionInserted: {
            const [item] = args;
            _log.push(`loggerItem collection inserted ${item?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._CollectionDeleted: {
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
          case deep.Deep._Inserted: {
            const [key, value] = args;
            _log.push(`loggerSet inserted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Updated: {
            const [value, key, next, prev] = args;
            _log.push(`loggerSet updated ${value.id} ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Deleted: {
            const [key, value] = args;
            _log.push(`loggerSet deleted ${key?.id}: ${value?.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._Change: {
            const [key, next, prev] = args;
            _log.push(`loggerSet change ${key}: ${next?.id} ${prev?.id}`);
            return worker.super(source, target, stage, args);
          } default: {
            // _log.push(`loggerSet default ${stage} ${args}`);
            return worker.super(source, target, stage, args);
          }
        }
      });
      const deepSet = new deep.Set();
      loggerSet.value = deepSet;
      _log.push(`set value setted`);
      const loggerItem = new deep((worker, source, target, stage, args) => {
        switch (stage) {
          case deep.Deep._CollectionInserted: {
            const [item] = args;
            _log.push(`loggerItem collection inserted ${item.id}`);
            return worker.super(source, target, stage, args);
          } case deep.Deep._CollectionDeleted: {
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
          `loggerItem collection deleted ${deep.Deep._relations.all.id}`,
          `loggerItem collection deleted ${deep.typed.id}`,
          `loggerItem collection deleted ${deepSet.id}`,
            `loggerSet deleted ${loggerItem.id}: ${loggerItem.id}`,
          `loggerItem collection deleted ${a.out.id}`,
        `item destroyed`,
      ]);
    });
  });
  describe('nary', () => {
    it('deep.SetInterspection', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new deep.Set(new Set([a.id, b.id, c.id]));
      const deepSetY = new deep.Set(new Set([b.id, c.id, d.id]));

      const intersection = new deep.SetInterspection(deepSetX, deepSetY);
      
      expect(intersection.value).toBeInstanceOf(deep.Deep);
      expect(intersection.value.type_id).toBe(deep.Set.id);
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

      // Test edge cases
      // Empty intersection
      deepSetX.delete(b.id);
      deepSetX.delete(c.id);
      expect(intersection.value.data.size).toBe(1); // d is still in both sets
      
      // Single element intersection
      deepSetX.add(b.id);
      expect(intersection.value.data.size).toBe(2); // b and d
      expect(intersection.value.has(b.id)).toBe(true);
      
      // Full intersection restoration
      deepSetX.add(c.id);
      expect(intersection.value.data.size).toBe(3); // b, c, d
      expect(intersection.value.has(c.id)).toBe(true);
      
      // Test with identical sets
      deepSetX.add(d.id); // d already there
      expect(intersection.value.data.size).toBe(3); // still b, c, d
      expect(intersection.value.has(d.id)).toBe(true);

      const sizeBefore = intersection.value?.data.size;
      const interspectionValue = intersection.value;
      intersection.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(intersection._sources.size).toBe(0);
      expect(intersection.value).toBe(undefined);

      // Check if it's no longer reactive
      deepSetX.add(b.id);
      expect(interspectionValue?.data.size).toBe(sizeBefore);
    });
    it('deep.SetDifference', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new deep.Set(new Set([a.id, b.id, c.id]));
      const deepSetY = new deep.Set(new Set([b.id, c.id, d.id]));

      const difference = new deep.SetDifference(deepSetX, deepSetY);
      
      expect(difference.value).toBeInstanceOf(deep.Deep);
      expect(difference.value.type_id).toBe(deep.Set.id);
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
      
      // Test edge cases
      // Empty difference when sets are identical
      deepSetX.add(a.id);
      deepSetX.add(c.id);
      expect(difference.value.data.size).toBe(1); // deepSetY might not have a.id and c.id at this point
      
      // Make sets more similar
      deepSetY.add(a.id);
      deepSetY.add(c.id);
      expect(difference.value.data.size).toBe(1); // Still might have b.id difference
      
      // Single element difference
      deepSetX.delete(a.id);
      deepSetX.delete(c.id);
      expect(difference.value.data.size).toBe(1);
      expect(difference.value.has(b.id)).toBe(true);
  
      const sizeBefore = difference.value.data.size;
      const differenceValue = difference.value;
      difference.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(difference._sources.size).toBe(0);

      // Check if it's no longer reactive
      deepSetX.add(a.id);
      expect(differenceValue?.data.size).toBe(sizeBefore);
    });
    it('deep.SetUnion', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();

      const deepSetX = new deep.Set(new Set([a.id, b.id, c.id]));
      const deepSetY = new deep.Set(new Set([b.id, c.id, d.id]));

      const union = new deep.SetUnion(deepSetX, deepSetY);
      
      expect(union.value).toBeInstanceOf(deep.Deep);
      expect(union.value.type_id).toBe(deep.Set.id);
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
      
      // Test edge cases
      // Empty union when both sets are empty
      deepSetX.delete(a.id);
      deepSetX.delete(c.id);
      deepSetX.delete(e.id);
      deepSetY.delete(c.id);
      deepSetY.delete(d.id);
      expect(union.value.data.size).toBe(0);
      
      // Single element union
      deepSetX.add(a.id);
      expect(union.value.data.size).toBe(1);
      expect(union.value.has(a.id)).toBe(true);
      
      // Overlapping elements
      deepSetY.add(a.id);
      expect(union.value.data.size).toBe(1);
      expect(union.value.has(a.id)).toBe(true);
      
      // Different elements
      deepSetY.add(b.id);
      expect(union.value.data.size).toBe(2);
      expect(union.value.has(b.id)).toBe(true);

      const sizeBefore = union.value.data.size;
      const unionValue = union.value;
      union.destroy();
      expect(deepSetX._targets.size).toBe(0);
      expect(deepSetY._targets.size).toBe(0);
      expect(union._sources.size).toBe(0);

      // Check if it's no longer reactive
      deepSetX.add(b.id);
      expect(unionValue?.data.size).toBe(sizeBefore);
    });
    it('deep.SetAnd', () => {
      const a = deep();
      const b = deep();
      const c = deep();
      const d = deep();
      const e = deep();
      const f = deep();

      const deepSetX = new deep.Set(new Set([a.id, b.id, c.id, d.id]));
      const deepSetY = new deep.Set(new Set([b.id, c.id, d.id, e.id]));
      const deepSetZ = new deep.Set(new Set([c.id, d.id, e.id, f.id]));

      const and = new deep.SetAnd(deepSetX, deepSetY, deepSetZ);
      
      expect(and.value).toBeInstanceOf(deep.Deep);
      expect(and.value.type_id).toBe(deep.Set.id);
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
      
      // Test edge cases
      // Empty result when no common elements
      deepSetX.delete(c.id);
      deepSetX.delete(g.id);
      expect(and.value.data.size).toBe(0);
      
      // Single element result
      deepSetX.add(c.id);
      expect(and.value.data.size).toBe(1);
      expect(and.value.has(c.id)).toBe(true);
      
      // Test with many sets having same elements
      deepSetX.add(g.id);
      deepSetY.add(g.id);
      deepSetZ.add(g.id);
      expect(and.value.data.size).toBe(2);
      expect(and.value.has(g.id)).toBe(true);
      expect(and.value.has(c.id)).toBe(true);
      
      // Test partial removal
      deepSetZ.delete(g.id);
      expect(and.value.data.size).toBe(1);
      expect(and.value.has(g.id)).toBe(false);
      expect(and.value.has(c.id)).toBe(true);

      const sizeBefore = and.value.data.size;
      const andValue = and.value;
      and.destroy();
      
      deepSetY.add(c.id);
      deepSetZ.add(c.id);
      expect(andValue?.data.size).toBe(sizeBefore);
    });
  });
  it('deep.SetMapSet', () => {
    const A = deep();
    const B = deep();
    const C = deep();
    const a = new A();
    const b = new B();
    const c = new C();
    const sourceSet = new deep.Set(new Set([a.id, b.id, c.id]));
    const mapper = (value) => value.type;

    const mappedSet = new deep.SetMapSet(sourceSet, mapper);
    const mappedSetValueData = mappedSet.value.data;

    // Initial state
    expect(mappedSet.value).toBeInstanceOf(deep.Deep);
    expect(mappedSet.value.type_id).toBe(deep.Set.id);
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
    
    // Test edge cases
    // Empty source set
    sourceSet.delete(a.id);
    sourceSet.delete(b.id);
    sourceSet.delete(c.id);
    sourceSet.delete(d.id);
    expect(mappedSet.value.data.size).toBe(0);
    
    // Single element mapping
    sourceSet.add(a.id);
    expect(mappedSet.value.data.size).toBe(1);
    expect(mappedSet.value.has(A.id)).toBe(true);
    
    // Duplicate mapping (multiple items with same type)
    const a2 = new A();
    sourceSet.add(a2.id);
    expect(mappedSet.value.data.size).toBe(1);
    expect(mappedSet.value.has(A.id)).toBe(true);
    
    // Different types
    sourceSet.add(b.id);
    expect(mappedSet.value.data.size).toBe(2);
    expect(mappedSet.value.has(C.id)).toBe(true); // b.type was changed to C earlier
    
    // Multiple operations in sequence
    sourceSet.delete(a.id);
    expect(mappedSet.value.has(A.id)).toBe(false); // a2 was never added to sourceSet, so A is gone
    sourceSet.delete(a2.id);
    expect(mappedSet.value.has(A.id)).toBe(false); // still gone

    // Destroy
    mappedSet.destroy();
    expect(sourceSet._targets.has(mappedSet.id)).toBe(false);
    expect(mappedSet.value).toBe(undefined);
    const e = new deep();
    sourceSet.add(e);
    expect(mappedSetValueData.size).toBe(1);
  });
  it('deep.SetFilterSet', () => {
    const typeA = deep();
    const typeB = deep();
    const a1 = new typeA();
    const a2 = new typeA();
    const b1 = new typeB();
    const sourceSet = new deep.Set(new Set([a1.id, a2.id, b1.id]));
    const filterer = (el) => el.type_id === typeA.id;

    const filteredSet = new deep.SetFilterSet(sourceSet, filterer);

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
    
    // Test edge cases
    // Empty source set
    sourceSet.delete(a3.id);
    sourceSet.delete(b2.id);
    sourceSet.delete(a2.id);
    sourceSet.delete(b1.id);
    expect(filteredSet.value.data.size).toBe(0);
    
    // Single element matching filter
    sourceSet.add(a1.id);
    expect(filteredSet.value.data.size).toBe(1);
    expect(filteredSet.value.has(a1.id)).toBe(true);
    
    // Multiple elements, only some match
    sourceSet.add(a2.id);
    sourceSet.add(b2.id);
    expect(filteredSet.value.data.size).toBe(1); // a2 is typeB, b2 is typeB
    expect(filteredSet.value.has(a2.id)).toBe(false);
    expect(filteredSet.value.has(b2.id)).toBe(false);
    
    // Change type to match filter
    a2.type = typeA;
    expect(filteredSet.value.data.size).toBe(2);
    expect(filteredSet.value.has(a2.id)).toBe(true);
    
    // All elements match filter
    b2.type = typeA;
    expect(filteredSet.value.data.size).toBe(3);
    expect(filteredSet.value.has(b2.id)).toBe(true);

    // Destroy
    const filteredSetValueData = filteredSet.value.data;
    filteredSet.destroy();
    expect(sourceSet._targets.has(filteredSet.id)).toBe(false);
    expect(filteredSet.value).toBe(undefined);
    const e = new deep();
    sourceSet.add(e);
    expect(filteredSetValueData.size).toBe(3);
  });
  it('deep.QueryManyRelation', () => {
    // Test one-to-one relation
    const A_one = deep();
    const a_one = new A_one();
    const B_one = deep();
    
    const typesQuery = new deep.QueryManyRelation(a_one, 'type');
    
    // Initial state for one-to-one
    expect(typesQuery.value).toBeInstanceOf(deep.Deep);
    expect(typesQuery.value.type_id).toBe(deep.Set.id);
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
    
    const typedQuery = new deep.QueryManyRelation(C_many, 'typed');
    
    // Initial state for one-to-many
    expect(typedQuery.value).toBeInstanceOf(deep.Deep);
    expect(typedQuery.value.type_id).toBe(deep.Set.id);
    expect(typedQuery.value.data.size).toBe(2);
    expect(typedQuery.value.has(c1_many.id)).toBe(true);
    expect(typedQuery.value.has(c2_many.id)).toBe(true);
    
    // Reactivity for one-to-many
    const c3_many = new C_many();
    expect(typedQuery.value.data.size).toBe(3);
    expect(typedQuery.value.has(c3_many.id)).toBe(true);
    
    // Basic destroy test
    typedQuery.destroy();
  });
  it('deep.QueryField', () => {
    const A = deep(), B = deep(), C = deep();
    const a = new A(), b = new B(), c = new C(), z = new A();
    
    const typeA = new deep.QueryField(A, 'type');
  
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
    
    // Test edge cases
    // Empty query result
    a.type = B;
    c.type = B;
    expect(typeA.data.size).toBe(0);
    
    // Single element result
    a.type = A;
    expect(typeA.data.size).toBe(1);
    expect(typeA.data.has(a.id)).toBe(true);
    
    // Basic destroy test
    typeA.destroy();
    expect(typeA.data).toBe(undefined);
  });
  it('deep.Query', () => {
    const A = deep(), B = deep(), C = deep();
    const a = new A(), b = new B(), c = new C(), z = new A();
    z.from = a; c.from = a; b.from = z;
    
    const query_type_A = new deep.Query({ type: A });
    expect(query_type_A.value.data.size).toBe(2);
    expect(query_type_A.value.data.has(a.id)).toBe(true);
    expect(query_type_A.value.data.has(b.id)).toBe(false);
    expect(query_type_A.value.data.has(c.id)).toBe(false);
    expect(query_type_A.value.data.has(z.id)).toBe(true);

    const query_from_a = new deep.Query({ from: a });
    expect(query_from_a.value.data.size).toBe(2);
    expect(query_from_a.value.data.has(a.id)).toBe(false);
    expect(query_from_a.value.data.has(b.id)).toBe(false);
    expect(query_from_a.value.data.has(c.id)).toBe(true);
    expect(query_from_a.value.data.has(z.id)).toBe(true);

    const query_all = new deep.Query({});
    expect(query_all.value.data.size).toBe(deep.Deep._relations.all.data.size);

    // Test multiple criteria (AND logic)
    const query_typeA_fromA = new deep.Query({ type: A, from: a });
    expect(query_typeA_fromA.value.data.size).toBe(1);
    expect(query_typeA_fromA.value.has(z.id)).toBe(true);
    
    // Test reactivity on relation change
    z.type = B;
    expect(query_type_A.value.data.size).toBe(1);
    expect(query_type_A.value.has(z.id)).toBe(false);
    expect(query_typeA_fromA.value.data.size).toBe(0);

    // Test reactivity on new instance creation
    const a2 = new A();
    expect(query_type_A.value.data.size).toBe(2);
    expect(query_type_A.value.has(a2.id)).toBe(true);

    // Test scoped query
    const selection = new deep.Set(new Set([a.id, b.id, c.id]));
    const scoped_query = new deep.Query({ type: B }, selection);
    expect(scoped_query.value.data.size).toBe(1);
    expect(scoped_query.value.has(b.id)).toBe(true);
    
    // Test edge cases
    // Empty query result
    const query_empty = new deep.Query({ type: deep() });
    expect(query_empty.value.data.size).toBe(0);
    
    // Single element result
    const F = deep();
    const f = new F();
    const query_single = new deep.Query({ type: F });
    expect(query_single.value.data.size).toBe(1);
    expect(query_single.value.has(f.id)).toBe(true);
    
    // Complex relations
    const G = deep();
    const g1 = new G();
    const g2 = new G();
    g1.from = g2;
    g2.to = g1;
    
    const query_complex = new deep.Query({ type: G, from: g2 });
    expect(query_complex.value.data.size).toBe(1);
    expect(query_complex.value.has(g1.id)).toBe(true);
    expect(query_complex.value.has(g2.id)).toBe(false);
    
    // Change relation affecting query
    g1.from = f;
    expect(query_complex.value.data.size).toBe(0);
    expect(query_complex.value.has(g1.id)).toBe(false);
    
    // Multiple criteria with no results
    const query_none = new deep.Query({ type: A, from: G });
    expect(query_none.value.data.size).toBe(0);
    
    // Test with value relation
    const H = deep();
    const h1 = new H();
    const h2 = new H();
    h1.value = h2;
    
    const query_value = new deep.Query({ type: H, value: h2 });
    expect(query_value.value.data.size).toBe(1);
    expect(query_value.value.has(h1.id)).toBe(true);
    
    // Change value relation
    h1.value = h1;
    expect(query_value.value.data.size).toBe(0);
    
    // Scoped query with no matches
    const scope_empty = new deep.Set(new Set([a.id]));
    const scoped_empty = new deep.Query({ type: B }, scope_empty);
    expect(scoped_empty.value.data.size).toBe(0);
    
    // Clean up
    query_empty.destroy();
    query_single.destroy();
    query_complex.destroy();
    query_none.destroy();
    query_value.destroy();
    scoped_empty.destroy();

    // Test destroy
    const queryToDestroy = new deep.Query({ type: C });
    expect(queryToDestroy.value.data.size).toBe(1);
    
    const queryToDestroyValue = queryToDestroy.value;
    queryToDestroy.destroy();
    
    expect(queryToDestroy.value).toBe(undefined);
    expect(queryToDestroyValue.type_id).toBe(undefined);
    expect(queryToDestroyValue.data).toBe(undefined);
    const c2 = new C();
  });
  describe('deep.Inherit', () => {
    it('_inherits', () => {
      const A = deep();
      const B = deep();
      const a = new A();
      const b = new B();
      
      // Test basic inherit functionality
      expect(a._deep.inherit).toBe(deep._deep.inherit);
      expect(a._deep._inherit).toBe(undefined);
      expect(deep.Deep._inherits[a.id]).toBe(undefined);
      
      // Test deep.Inherit creation with string name
      const inherit1 = new deep.Inherit(A, 'testProperty', b);
      expect(A._deep._inherit).toBeDefined();
      expect(a._deep._inherit).toBeUndefined();
      expect(a._deep.inherit).toBe(A._deep._inherit);
      expect(A._deep.inherit.testProperty).toBe(b);
      expect(deep.Deep._inherits[A.id]).toBeDefined();
      expect(deep.Deep._inherits[a.id]).toBeUndefined();
      expect(deep.Deep._inherits[A.id].testProperty).toBe(b);
      
      // Test deep.Inherit creation with deep.String name
      const propName = new deep.String('anotherProperty');
      const inherit2 = new deep.Inherit(A, propName, b);
      expect(A._deep.inherit.anotherProperty).toBe(b);
      expect(a._deep.inherit.anotherProperty).toBe(b);
      
      // Test superInherit chain
      const C = deep();
      const c = new C();
      c.type = A;
      expect(c._deep.inherit).toBe(a._deep.inherit); // should inherit from type
      expect(deep.Deep.superInherit(c.id)).toBe(a._deep.inherit);
      
      // Test direct inherit vs super inherit
      const D = deep();
      const d = new D();
      d.type = c;
      expect(d._deep.inherit).toBe(a._deep.inherit); // should chain through c to a
      
      // Set direct inherit for d
      d._deep.inherit = { directProperty: 'test' };
      expect(d._deep.inherit.directProperty).toBe('test');
      expect(deep.Deep._inherits[d.id].directProperty).toBe('test');
      
      // Test inherit destruction
      inherit1.destroy();
      expect(a._deep.inherit.testProperty).toBeUndefined();
      expect(a._deep.inherit.anotherProperty).toBe(b); // should still exist
      
      inherit2.destroy();
      expect(a._deep.inherit.testProperty).toBeUndefined(); // should be removed when empty
      expect(a._deep.inherit.anotherProperty).toBeUndefined(); // should be removed when empty
      expect(deep.Deep._inherits[a.id]).toBeUndefined();
      
      // Test setting inherit to undefined
      d._deep.inherit = { tempProperty: 'temp' };
      expect(d._deep.inherit.tempProperty).toBe('temp');
      d._deep.inherit = undefined;
      expect(deep.Deep._inherits[d.id]).toBeUndefined();
      
      // Test error cases
      expect(() => new deep.Inherit('not a deep', 'prop', b)).toThrow('deep.Inherit:!from');
      expect(() => new deep.Inherit(a, 'prop', 'not a deep')).toThrow('deep.Inherit:!to');
      expect(() => new deep.Inherit(a, 123, b)).toThrow('deep.Inherit:!value');
    });
  });

  describe('promise queue', () => {
    it('should handle empty queue', async () => {
      const a = deep();
      await a.promise; // Should resolve immediately for empty queue
      expect(true).toBe(true); // If we get here, the test passes
    });

    it('should execute promises in sequence', async () => {
      const d = deep();
      const log: string[] = [];
      
      // Helper function to create a promise that logs when it starts and completes
      const createTask = (letter: string, delay: number) => {
        return () => new Promise<void>(resolve => {
          log.push(`start ${letter}`);
          setTimeout(() => {
            log.push(`end ${letter}`);
            resolve();
          }, delay);
        });
      };
      
      // Array to track all tasks
      const tasks: Promise<void>[] = [];
      
      // Schedule promises with delays
      d.promise = createTask('A', 100);
      tasks.push(d.promise);
      
      d.promise = createTask('B', 50);
      tasks.push(d.promise);
      
      d.promise = createTask('C', 10);
      tasks.push(d.promise);
      
      // Add a final task that will run after all others
      const finalTask = d.promise.then(() => {
        log.push('all done');
      });
      tasks.push(finalTask);
      
      // Add more promises
      d.promise = createTask('D', 5);
      tasks.push(d.promise);
      
      d.promise = createTask('E', 5);
      tasks.push(d.promise);
      
      // Wait for all tasks to complete
      await Promise.all(tasks);
      
      // Check execution order - each task should complete before the next starts
      expect(log).toEqual([
        'start A', 'end A',
        'start B', 'end B',
        'start C', 'end C',
        'all done',
        'start D', 'end D',
        'start E', 'end E'
      ]);
    });

    it('should log errors to instance errors when promise throws', async () => {
      const d = deep();
      
      let _error1;
      // Create a failing promise
      d.promise = () => {
        _error1 = new Error('Test error');
        throw _error1;
      };
      
      // Wait for the promise to complete
      try {
        await d.promise;
      } catch (error) {
        // Expected error
      }
      
      // Verify the error was logged to the instance's error log
      expect(d.errors?.data).toEqual([[_error1]]);
      
      let _error2;
      // Test with an async function that rejects
      d.promise = async () => {
        _error2 = new Error('Async error');
        throw _error2;
      };
      
      // Wait for the promise to complete
      try {
        await d.promise;
      } catch (error) {
        // Expected error
      }
      
      // Verify both errors are in the log
      expect(d.errors?.data).toEqual([[_error1], [_error2]]);
    });
  });
});
