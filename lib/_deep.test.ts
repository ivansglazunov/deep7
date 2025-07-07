import { _Data } from "./_data";
import { deep, Deep, DeepSet, Field, Method } from "./_deep";
import { z } from "zod";

describe('_deep', () => {
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
        } case Deep._Schema:{
          _log.push(`schema ${name} ${target.id}`);
          if (!worker.ref.schemaInput) _log.push(`schema define ${name} ${target.id}`);
          worker.ref.schemaInput = worker.ref.schemaInput || z.union([
            z.tuple([]),
            z.tuple([z.literal('x')]),
            z.tuple([z.string().uuid()]),
            z.tuple([z.function()]),
          ])
          return worker.ref.schema = worker.ref.schema || {
            [Deep._Apply]: worker.ref.schemaInput,
            [Deep._Constructor]: worker.ref.schemaInput
          };
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
      `schema a ${aId}`,
      `schema define a ${aId}`,
      `new a ${aId}`,
      `schema a ${aId}`,
      `schema a ${aId}`,
      `constructor a ${bId}`,
      `schema a ${aId}`,
      `getter a ${bId} id`,
      `getter a ${bId} x`,
      `schema a ${aId}`,
      `schema a ${aId}`,
      `setter a ${bId} x b`,
      `getter a ${bId} x`,
      `schema a ${aId}`,
      `apply a ${bId}`,
      `schema a ${aId}`,
      `schema a ${aId}`,
      `deleter a ${bId} x`,
      `schema a ${aId}`,
      `getter a ${bId} x`,
    ]);
    _log = [];
    const c = b(generateEffect('c'));
    expect(c instanceof Deep).toBe(true);
    const cId = c.id;
    expect(_log).toEqual([
      `schema a ${aId}`,
      `apply a ${bId}`,
      `schema a ${aId}`,
      `schema a ${aId}`,
      `constructor a ${cId}`,
      `schema a ${aId}`,
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
      `schema a ${aId}`,
      `apply a ${bId}`,
      `schema a ${aId}`,
      `schema a ${aId}`,
      `constructor a ${cId}`,
      `schema a ${aId}`,
      `getter a ${cId} id`,
      `schema c ${cId}`,
      `schema define c ${cId}`,
      `new c ${cId}`,
      `schema a ${aId}`,
      `new a ${cId}`,
      `schema a ${aId}`,
      `schema c ${cId}`,
      `constructor c ${dId}`,
      `schema a ${aId}`,
      `constructor a ${dId}`,
      `schema a ${aId}`,
      `getter c ${dId} id`,
      `getter a ${dId} id`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
      `schema a ${aId}`,
      `setter a ${cId} x c`,
      `schema c ${cId}`,
      `setter c ${dId} x d`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
      `schema c ${cId}`,
      `apply c ${dId}`,
      `schema a ${aId}`,
      `deleter a ${cId} x`,
      `schema a ${aId}`,
      `schema c ${cId}`,
      `deleter c ${dId} x`,
      `schema a ${aId}`,
      `deleter a ${dId} x`,
      `schema a ${aId}`,
      `getter a ${cId} x`,
      `getter c ${dId} x`,
    ]);
    _log = [];
    d._deep.destroy();
    expect(_log).toEqual([
      `getter c ${dId} _deep`,
      `getter a ${dId} _deep`,
      `schema c ${cId}`,
      `destructor c ${dId}`,
      `schema a ${aId}`,
      `destructor a ${dId}`,
      `schema a ${aId}`,
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
  });
  describe('DeepSet', () => {
    it('.ref._data Set', () => {
      expect(DeepSet._deep.ref._data).toBeInstanceOf(_Data);
    });
    it('.add', () => {
      console.log('add test');
      const a = new DeepSet((worker, source, target, stage, args, thisArg) => {
        return worker.super(source, target, stage, args, thisArg);
      });
    });
  });
  // describe('deep', () => {
    // it('new _Deep(...) no events', () => {
    //   const _log: string[] = [];
    //   const a = new _Deep('a', (deep, stage, args) => {
    //     switch (stage) {
    //       case _Deep._New:{
    //         _log.push(`new`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Constructor:{
    //         _log.push(`constructor`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Apply:{
    //         _log.push(`apply`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Destructor:{
    //         _log.push(`destructor`);
    //         return _Deep.effect(deep, stage, args);
    //       } default: return _Deep.effect(deep, stage, args);
    //     }
    //   });
    //   expect(a instanceof _Deep).toBe(true);
    //   expect(_log).toEqual([]);
    // });
    // it('_Deep.new(...) inner events', () => {
    //   const _log: string[] = [];
    //   let _count = 0;
    //   const a = _Deep.new(undefined, 'a', (deep, stage, args) => {
    //     _count++;
    //     switch (stage) {
    //       case _Deep._New:{
    //         _log.push(`new ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Constructor:{
    //         _log.push(`constructor ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Apply:{
    //         _log.push(`apply ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Destructor:{
    //         _log.push(`destructor ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } default: return _Deep.effect(deep, stage, args);
    //     }
    //   });
    //   expect(a instanceof _Deep).toBe(true);
    //   expect(_log).toEqual(['constructor a']);
    //   expect(_count).toEqual(1);
    //   const b = _Deep.new('a', 'b');
    //   expect(a instanceof _Deep).toBe(true);
    //   expect(_log).toEqual(['constructor a','constructor b']);
    //   expect(_count).toEqual(2);
    // });
    // it('new _Deep.new(...) new event', () => {
    //   const _log: string[] = [];
    //   let _count = 0;
    //   const a = _Deep.new(undefined, 'a', (deep, stage, args) => {
    //     _count++;
    //     switch (stage) {
    //       case _Deep._New:{
    //         _log.push(`new ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Constructor:{
    //         _log.push(`constructor ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Apply:{
    //         _log.push(`apply ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Destructor:{
    //         _log.push(`destructor ${deep.id}`);
    //         return _Deep.effect(deep, stage, args);
    //       } case _Deep._Getter:{
    //         _log.push(`getter ${deep.id} ${args[0]}`);
    //         return _Deep.effect(deep, stage, args);
    //       } default: return _Deep.effect(deep, stage, args);
    //     }
    //   }).deep;
    //   expect(a instanceof _Deep).toBe(true);
    //   expect(_log).toEqual(['constructor a']);
    //   expect(_count).toEqual(1);
    //   const b = new a();
    //   expect(a instanceof _Deep).toBe(true);
    //   const bId = b.id;
    //   expect(_log).toEqual(['constructor a', 'new a', `constructor ${bId}`, `getter ${bId} id`]);
    //   expect(_count).toEqual(4);
    // });
    // it('effect inheritance', () => {
    //   const _log: string[] = [];
    //   let aCount = 0;
    //   const a = _Deep.new(undefined, undefined, function(this, deep, stage, args) {
    //     aCount++;
    //     switch (stage) {
    //       case _Deep._New:{
    //         _log.push(`new a ${deep.id}`);
    //         return this.super(deep, stage, args);
    //       } case _Deep._Constructor:{
    //         _log.push(`constructor a ${deep.id}`);
    //         return this.super(deep, stage, args);
    //       } case _Deep._Apply:{
    //         _log.push(`apply a ${deep.id}`);
    //         return this.super(deep, stage, args);
    //       } case _Deep._Destructor:{
    //         _log.push(`destructor a ${deep.id}`);
    //         return this.super(deep, stage, args);
    //       } case _Deep._Getter:{
    //         _log.push(`getter a ${deep.id} ${args[0]}`);
    //         const [key] = args;
    //         switch (key) {
    //           case 'x': return 'y';
    //           default: return this.super(deep, stage, args);
    //         }
    //       } default: return this.super(deep, stage, args);
    //     }
    //   }).deep;
    //   const aId = a.id;
    //   expect(a instanceof _Deep).toBe(true);
    //   expect(a.x).toEqual('y');
    //   expect(_log).toEqual([
    //     `constructor a ${aId}`, `getter a ${aId} id`, `getter a ${aId} x`,
    //   ]);
    //   expect(aCount).toEqual(3);
    //   const b = new a();
    //   expect(a instanceof _Deep).toBe(true);
    //   const bId = b.id;
    //   expect(b.x).toEqual('y');
    //   expect(_log).toEqual([
    //     `constructor a ${aId}`, `getter a ${aId} id`, `getter a ${aId} x`,
    //     `new a ${aId}`, `constructor a ${bId}`, `getter a ${bId} id`, `getter a ${bId} x`,
    //   ]);
    //   expect(aCount).toEqual(7);
    //   let cCount = 0;
    //   const c = new b(function(this, deep, stage, args) {
    //     cCount++;
    //     switch (stage) {
    //       case _Deep._Getter:{
    //         _log.push(`getter c ${deep.id} ${args[0]}`);
    //         const [key] = args;
    //         switch (key) {
    //           case 'y': return 'z';
    //           default: return this.super(deep, stage, args);
    //         }
    //       } default: return this.super(deep, stage, args);
    //     }
    //   });
    //   const cId = c.id;
    //   expect(c instanceof _Deep).toBe(true);
    //   expect(c.y).toEqual('z');
    //   expect(aCount).toEqual(8);
    //   expect(cCount).toEqual(3);
    //   // expect(_log.length).toEqual(aCount+cCount);
    //   expect(_log).toEqual([
    //     `constructor a ${aId}`, `getter a ${aId} id`, `getter a ${aId} x`,
    //     `new a ${aId}`, `constructor a ${bId}`, `getter a ${bId} id`, `getter a ${bId} x`,
    //     `new a ${bId}`, `constructor a ${cId}`, `getter c ${cId} id`, `getter a ${cId} id`, `getter c ${cId} y`,
    //   ]);
    // })
  // });
});
