import { newDeep } from '.';

describe('deep', () => {
  it('Deep', () => {
    const deep = newDeep();
    
    // <_Deep>
    expect('_id' in deep).toBe(true);
    expect('_created_at' in deep).toBe(true);
    expect('_updated_at' in deep).toBe(true);
    expect('_type' in deep).toBe(true);
    expect('_typed' in deep).toBe(true);
    expect('_from' in deep).toBe(true);
    expect('_out' in deep).toBe(true);
    expect('_to' in deep).toBe(true);
    expect('_in' in deep).toBe(true);
    expect('_data' in deep).toBe(true);
    expect('_context' in deep).toBe(true);
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
    expect(c._type).toBe(b._id);
    expect(new deep(c._type)._id).toBe(c._type);
    expect(b._type).toBe(a._id);
    expect(new deep(b._type)._id).toBe(b._type);
  });

  describe('proxify', () => {
    it('new deep()', () => {
      const deep = newDeep();
      const a = new deep();
      expect(a._type).toBe(deep._id);
    });
    it('deep() == new deep()', () => {
      const deep = newDeep();
      const a = deep();
      expect(a._type).toBe(deep._id);
    });
    it('get deep.undefinedField', () => {
      const deep = newDeep();
      expect(() => deep.undefinedField).toThrow(`undefinedField getter is not in a context or property of ${deep._id}`);
    });
    it('set deep.undefinedField', () => {
      const deep = newDeep();
      expect(() => deep.undefinedField = true).toThrow(`undefinedField setter is not in a context or property of ${deep._id}`);
    });
    it('deep._context[key]', () => {
      const deep = newDeep();
      deep._context.undefinedField = new deep();
      expect(deep.undefinedField).toBe(deep._context.undefinedField);
    });
    it('deep._context[key]._constructor', () => {
      const deep = newDeep();

      const Constructor = new deep();
      Constructor._context._constructor = function (currentConstructor, args: any[] = []) {
        const instance = new deep();
        expect(currentConstructor._id).toBe(Constructor._id);
        instance._type = currentConstructor._id;
        instance._from = currentConstructor._id;
        instance._to = currentConstructor._id;
        return instance;
      };
      const instance = new Constructor();
      expect(instance._type).toBe(Constructor._id);
      expect(instance._from).toBe(Constructor._id);
      expect(instance._to).toBe(Constructor._id);
    });
    it('deep._context[key]._apply', () => {
      const deep = newDeep();

      const Function = new deep();
      Function._context._apply = function (this: any) {
        expect(this._id).toBe(Function._id);
        return 123;
      };
      const result = Function();
      expect(result).toBe(123);
    });
    it('deep._context[key]._getter', () => {
      const deep = newDeep();
      
      const Getter = new deep();
      Getter._context._getter = function (currentGetter, key, source) {
        expect(currentGetter._id).toBe(getter._id);
        expect(currentGetter._type).toBe(Getter._id);
        expect(key).toBe('definedGetter');
        expect(source._id).toBe(deep._id);
        return 123;
      };
      const getter = new Getter();
      deep._context.definedGetter = getter;
      expect(deep.definedGetter).toBe(123);
    });
    it('deep._context[key]._setter', () => {
      const deep = newDeep();
      
      const Setter = new deep();
      Setter._context._setter = function (currentSetter, key, value, source) {
        expect(currentSetter._id).toBe(setter._id);
        expect(currentSetter._type).toBe(Setter._id);
        expect(key).toBe('definedSetter');
        expect(source._id).toBe(deep._id);
        if (value === 123) throw new Error('demo error');
        return 123;
      };
      const setter = new Setter();
      deep._context.definedSetter = setter;
      expect(() => deep.definedSetter = 123).toThrow(`demo error`);
      expect(deep.definedSetter = 234).toBe(234);
    });
    it('deep._context[key]._deleter', () => {
      const deep = newDeep();
      
      const Deleter = new deep();
      let deleted = false;
      Deleter._context._deleter = function (currentDeleter, key, source) {
        expect(currentDeleter._id).toBe(deleter._id);
        expect(currentDeleter._type).toBe(Deleter._id);
        expect(key).toBe('definedDeleter');
        expect(source._id).toBe(deep._id);
        deleted = true;
        return true;
      };
      const deleter = new Deleter();
      deep._context.definedDeleter = deleter;
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
});
