import { jest } from '@jest/globals';
import { newDeep } from '.';
import dotenv from 'dotenv';
import { _delay } from './_promise';

dotenv.config();

describe('deep', () => {
  it('Deep', () => {
    const deep = newDeep();
    
    // <_Deep>
    expect('_id' in deep).toBe(true);
    expect('_created_at' in deep).toBe(true);
    expect('_updated_at' in deep).toBe(true);
    expect('type_id' in deep).toBe(true);
    expect('_typed' in deep).toBe(true);
    expect('from_id' in deep).toBe(true);
    expect('_out' in deep).toBe(true);
    expect('to_id' in deep).toBe(true);
    expect('_in' in deep).toBe(true);
    expect('_data' in deep).toBe(true);
    expect('_contain' in deep).toBe(true);
    // </_Deep>

    // <Deep>
    expect('_apply' in deep).toBe(true);
    expect('_construct' in deep).toBe(true);
    expect('_getter' in deep).toBe(true);
    expect('_setter' in deep).toBe(true);
    expect('_deleter' in deep).toBe(true);
    expect('_haser' in deep).toBe(true);
    expect('_proxify' in deep).toBe(true);
    // </Deep>

    const a = new deep();
    const b = new a();
    const c = new b();
    expect(c.type_id).toBe(b._id);
    expect(new deep(c.type_id)._id).toBe(c.type_id);
    expect(b.type_id).toBe(a._id);
    expect(new deep(b.type_id)._id).toBe(b.type_id);
  });

  describe('proxify', () => {
    it('new deep()', () => {
      const deep = newDeep();
      const a = new deep();
      expect(a.type_id).toBe(deep._id);
    });
    it('deep() == new deep()', () => {
      const deep = newDeep();
      const a = deep();
      expect(a.type_id).toBe(deep._id);
    });
    it('get deep.undefinedField', () => {
      const deep = newDeep();
      expect(deep.undefinedField).toBe(undefined);
    });
    it(`can't set not deeped deep.undefinedField`, () => {
      const deep = newDeep();
      expect(() => deep.undefinedField = true).toThrow(`Only deep's can be set as context`);
    });
    it('deep._contain[key]', () => {
      const deep = newDeep();
      deep._contain.undefinedField = new deep();
      expect(deep.undefinedField).toBe(deep._contain.undefinedField);
    });
    it('deep._contain[key]._constructor', () => {
      const deep = newDeep();

      const Constructor = new deep();
      Constructor._contain._constructor = function (currentConstructor, args: any[] = []) {
        const instance = new deep();
        expect(currentConstructor._id).toBe(Constructor._id);
        instance.type_id = currentConstructor._id;
        instance.from_id = currentConstructor._id;
        instance.to_id = currentConstructor._id;
        return instance;
      };
      const instance = new Constructor();
      expect(instance.type_id).toBe(Constructor._id);
      expect(instance.from_id).toBe(Constructor._id);
      expect(instance.to_id).toBe(Constructor._id);
    });
    it('deep._contain[key]._apply', () => {
      const deep = newDeep();

      const Function = new deep();
      Function._contain._apply = function (this: any) {
        expect(this._id).toBe(Function._id);
        return 123;
      };
      const result = Function();
      expect(result).toBe(123);
    });
    it('deep._contain[key]._getter', () => {
      const deep = newDeep();
      
      const Getter = new deep();
      Getter._contain._getter = function (currentGetter, key, source) {
        expect(currentGetter._id).toBe(getter._id);
        expect(currentGetter.type_id).toBe(Getter._id);
        expect(key).toBe('definedGetter');
        expect(source._id).toBe(deep._id);
        return 123;
      };
      const getter = new Getter();
      deep._contain.definedGetter = getter;
      expect(deep.definedGetter).toBe(123);
    });
    it('deep._contain[key]._setter', () => {
      const deep = newDeep();
      
      const Setter = new deep();
      Setter._contain._setter = function (currentSetter, key, value, source) {
        expect(currentSetter._id).toBe(setter._id);
        expect(currentSetter.type_id).toBe(Setter._id);
        expect(key).toBe('definedSetter');
        expect(source._id).toBe(deep._id);
        if (value === 123) throw new Error('demo error');
        return 123;
      };
      const setter = new Setter();
      deep._contain.definedSetter = setter;
      expect(() => deep.definedSetter = 123).toThrow(`demo error`);
      expect(deep.definedSetter = 234).toBe(234);
    });
    it('deep._contain[key]._deleter', () => {
      const deep = newDeep();
      
      const Deleter = new deep();
      let deleted = false;
      Deleter._contain._deleter = function (currentDeleter, key, source) {
        expect(currentDeleter._id).toBe(deleter._id);
        expect(currentDeleter.type_id).toBe(Deleter._id);
        expect(key).toBe('definedDeleter');
        expect(source._id).toBe(deep._id);
        deleted = true;
        return true;
      };
      const deleter = new Deleter();
      deep._contain.definedDeleter = deleter;
      expect(delete deep.definedDeleter).toBe(true);
      expect(deep.definedDeleter).toBe(deleter);
      expect(deleted).toBe(true);
    });
  });

  describe('events integration', () => {
    it('should register, emit, and receive events on a deep instance', () => {
      const deep = newDeep();
      const a = new deep();
      const mockHandler = jest.fn();

      a._on('testEvent', mockHandler);
      a._emit('testEvent', 'payload1', 123);

      expect(mockHandler).toHaveBeenCalledWith('payload1', 123);
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('_once should register a handler that is called only once', () => {
      const deep = newDeep();
      const a = new deep();
      const mockHandler = jest.fn();

      a._once('onceEvent', mockHandler);
      a._emit('onceEvent', 'first');
      a._emit('onceEvent', 'second');

      expect(mockHandler).toHaveBeenCalledWith('first');
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('_off should remove a specific event handler', () => {
      const deep = newDeep();
      const a = new deep();
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();

      a._on('offEvent', mockHandler1);
      a._on('offEvent', mockHandler2);

      const removed = a._off('offEvent', mockHandler1);
      expect(removed).toBe(true);

      a._emit('offEvent', 'data');

      expect(mockHandler1).not.toHaveBeenCalled();
      expect(mockHandler2).toHaveBeenCalledWith('data');
    });

    it('_off should return false if handler was not registered', () => {
      const deep = newDeep();
      const a = new deep();
      const mockHandler = jest.fn();

      const removed = a._off('offEvent', mockHandler);
      expect(removed).toBe(false);
    });

    it('destroying a deep instance should remove its event handlers', () => {
      const deep = newDeep();
      const a = new deep();
      const mockHandler = jest.fn();

      a._on('destroyTest', mockHandler);
      a.destroy(); // Assuming Deep instance has a destroy method that calls _deep.destroy()
      a._emit('destroyTest', 'payloadAfterDestroy');

      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('events on one instance should not affect another instance', () => {
      const deep = newDeep();
      const a = new deep();
      const b = new deep();
      const handlerA = jest.fn();
      const handlerB = jest.fn();

      a._on('sharedEvent', handlerA);
      b._on('sharedEvent', handlerB);

      a._emit('sharedEvent', 'forA');
      expect(handlerA).toHaveBeenCalledWith('forA');
      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).not.toHaveBeenCalled();

      b._emit('sharedEvent', 'forB');
      expect(handlerB).toHaveBeenCalledWith('forB');
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(handlerA).toHaveBeenCalledTimes(1); // Still 1 for handlerA
    });
  });

  describe('Symbol.iterator', () => {
    it('a default deep instance should be iterable but yield no items', () => {
      const deep = newDeep();
      const instance = new deep();
      let itemCount = 0;
      for (const item of instance) {
        itemCount++;
      }
      expect(itemCount).toBe(0);
      // Also check that it is indeed iterable
      expect(typeof instance[Symbol.iterator]).toBe('function');
    });
  });

  it('deep.deep', () => {
    const deep = newDeep();
    expect(deep.deep._id).toBe(deep._id);
    expect(deep.Deep.deep._id).toBe(deep._id);
  });

  describe('securly', () => {
    it('deep() for all _ids', () => {
      const deep = newDeep();
      for (const id of deep._ids) {
        const d = deep(id);
      }
    });
    it('.data for all _ids', () => {
      const deep = newDeep();
      for (const id of deep._ids) {
        const d = deep(id);
        const data = d.data;
      }
    });
  });

  it('deep.error', () => {
    const deep = newDeep();
    const a = new deep();
    let counter = 0;
    a.on(deep.events.error, (error) => {
      expect(error).toBe('test error');
      counter++;
    });
    a.error('test error');
    a.error('test error');
    a.destroy();
    a.error('test error');
    expect(counter).toBe(2);
  });
});
