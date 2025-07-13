import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { newDeep } from './deep';

describe('std', () => {
  let deep: any;

  beforeEach(() => {
    deep = newDeep();
  });

  afterEach(() => {
    deep.destroy();
  });

  describe('logging', () => {
    it('should have logging methods defined', () => {
      expect(deep.log).toBeDefined();
      expect(deep.warn).toBeDefined();
      expect(deep.error).toBeDefined();
      expect(deep.logs).toBeDefined();
      expect(deep.warnings).toBeDefined();
      expect(deep.errors).toBeDefined();
    });

    it('should log messages to logs array', () => {
      const obj = deep();
      obj.log('test message', 123);
      
      expect(obj.logs?.data).toEqual([['test message', 123]]);
    });

    it('should log warnings to warnings array', () => {
      const obj = deep();
      obj.warn('warning message', { key: 'value' });
      
      expect(obj.warnings?.data).toEqual([['warning message', { key: 'value' }]]);
    });

    it('should log errors to errors array', () => {
      const obj = deep();
      const error = new Error('error message');
      obj.error(error, 'additional info');
      
      expect(obj.errors?.data).toEqual([[error, 'additional info']]);
    });

    it('should maintain separate log arrays for different instances', () => {
      const obj1 = deep();
      const obj2 = deep();
      
      obj1.log('1 from obj1');
      obj1.log('2 from obj1');
      obj2.log('3 from obj2');
      
      expect(obj1.logs?.data).toEqual([['1 from obj1'], ['2 from obj1']]);
      expect(obj2.logs?.data).toEqual([['3 from obj2']]);
    });
  });

  describe('cleanup', () => {
    it('should clean up log arrays on destroy', () => {
      const obj = deep();
      const logs = obj.logs;
      expect(obj.ref.__logs).toBeDefined();
      obj.destroy();
      expect(obj.ref.__logs).toBeUndefined();
    });
  });
});
