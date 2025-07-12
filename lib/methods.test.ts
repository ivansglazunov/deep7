import { deep, Deep, DeepSet, DeepFunction, DeepArray } from "./deep";

const data: any = {
  deep: {
    forIn: undefined,
    forOf: undefined,

    add: undefined, 
    push: undefined,
    has: undefined, 
    delete: undefined, 
    get: undefined, 
    set: undefined, 

    mapString: undefined, 
    mapNumber: undefined, 
    mapSet: undefined, 
    mapMap: undefined, 
    mapObject: undefined, 
    mapProxy: undefined, 
    mapArray: undefined, 
    map: undefined,

    filterString: undefined, 
    filterNumber: undefined, 
    filterSet: undefined, 
    filterMap: undefined, 
    filterObject: undefined, 
    filterProxy: undefined, 
    filterArray: undefined, 
    filter: undefined,

    sortString: undefined, 
    sortNumber: undefined, 
    sortSet: undefined, 
    sortMap: undefined, 
    sortObject: undefined, 
    sortProxy: undefined, 
    sortArray: undefined, 
    sort: undefined,

    reduceString: undefined, 
    reduceNumber: undefined, 
    reduceSet: undefined, 
    reduceMap: undefined, 
    reduceObject: undefined, 
    reduceProxy: undefined, 
    reduceArray: undefined, 
    reduce: undefined,

    forEach: undefined,
    every: undefined,
    some: undefined,
    find: undefined,
    findIndex: undefined,
    findKey: undefined,
    includes: undefined,
    contains: undefined,
  },
  set: {},
  map: {},
  array: {},
  object: {},
  proxy: {},
  string: {},
  number: {},
  contains: {},
};

const deepMethods = Object.keys(data.deep);

function othersMethods(name: string) {
  deepMethods.forEach(method => {
    if (!data[name][method]) {
      data[name][method] = '⚫️';
    }
  });
};

describe('Universal Methods Testing', () => {
  describe('deep', () => {
    it('add method', () => {
      data.deep.add = '🔴';
      const a = deep();
      const set = new DeepSet();
      a.value = set;
      a.add('test');
      expect(a.value.has('test')).toBe(true);
      data.deep.add = '🟢';
    });

    it('has method', () => {
      data.deep.has = '🔴';
      const a = deep();
      const set = new DeepSet();
      a.value = set;
      a.add('test');
      expect(a.has('test')).toBe(true);
      expect(a.has('notexist')).toBe(false);
      data.deep.has = '🟢';
    });

    it('delete method', () => {
      data.deep.delete = '🔴';
      const a = deep();
      const set = new DeepSet();
      a.value = set;
      a.add('test');
      expect(a.has('test')).toBe(true);
      const result = a.delete('test');
      expect(result).toBe(true);
      expect(a.has('test')).toBe(false);
      data.deep.delete = '🟢';
    });
    afterAll(() => othersMethods('deep'));
  });

  describe('set', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('set'));
  });

  describe('map', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('map'));
  });

  describe('array', () => {
    it('push/add/has/delete methods with event log', () => {
      data.array.push = '🔴';
      data.array.add = '🔴';
      data.array.has = '🔴';
      data.array.delete = '🔴';
      let _log: string[] = [];
      const effect = (worker, source, target, stage, args) => {
        switch (stage) {
          case Deep._Inserted: _log.push(`inserted:${args[0]}`); break;
          case Deep._Deleted: _log.push(`deleted:${args[0]}`); break;
          case Deep._Updated: _log.push(`updated:${args[0]}`); break;
        }
        return worker.super(source, target, stage, args);
      };
      const Container = deep(effect);
      const container = new Container();
      const arr = new DeepArray();
      container.value = arr;
      // push
      const len = arr.push('a');
      expect(len).toBe(1);
      expect(arr.data[0]).toBe('a');
      data.array.push = '🟢';
      // add
      arr.add('b');
      expect(arr.data[1]).toBe('b');
      data.array.add = '🟢';
      // has
      expect(arr.has('a')).toBe(true);
      expect(arr.has('c')).toBe(false);
      data.array.has = '🟢';
      // delete
      expect(arr.delete('a')).toBe(true);
      expect(arr.has('a')).toBe(false);
      data.array.delete = '🟢';
      // event log
      expect(_log).toEqual([
        'inserted:0',
        'inserted:1',
        'deleted:0'
      ]);
    });
    afterAll(() => othersMethods('array'));
  });

  describe('object', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('object'));
  });

  describe('proxy', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('proxy'));
  });

  describe('string', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('string'));
  });

  describe('number', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('number'));
  });

  describe('contains', () => {
    it('no support', () => {});
    afterAll(() => othersMethods('contains'));
  });

  afterAll(() => {
    const types = Object.keys(data);
    const methods = deepMethods;
    
    let output = '\n📊 Universal Methods Implementation Matrix:\n';
    output += '🟢 - Implemented & Tested | 🔴 - Failed Test | ⚫️ - Not Implemented\n\n';

    let header = '                  ';
    types.forEach(type => {
      header += `${type.padEnd(8)}`;
    });
    output += header + '\n';
    output += '─'.repeat(header.length) + '\n';

    methods.forEach(method => {
      let row = `${method.padEnd(18)} `;
      types.forEach(type => {
        const status = data[type][method] || '⚫️';
        row += `${status.padEnd(8)}`;
      });
      output += row + '\n';
    });
    
    output += '\n';
    console.log(output);
  });
}); 