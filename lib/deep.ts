// Implements the high-level, user-facing Deep class, providing a proxied interface for dynamic property access, construction, function application, and an event system. Instances created via newDeep() are the primary interaction points for the framework user.
import { v4 as uuidv4 } from 'uuid';

import { _initDeep } from "./";
import { newField } from "./field";
import { newFunction } from './function';
import { newIs } from "./is";
import { newData, newFrom, newTo, newType, newVal, newValue } from "./links";
import { newMethod } from "./method";
import { newNumber } from "./number";
import { newString } from "./string";
import { newSet } from "./set";
import { newDetect } from "./detect";
import { newMethods } from "./methods";
import { newBackward } from "./backwards";
import { newEvents } from "./events";
import { newReasons } from "./reasons";
import { newAlive } from "./alive";


export function initDeep(options: {
  reasonConstructId?: string;
  _Deep?: any;
} = {}) {
  const reasonConstructId = options.reasonConstructId || uuidv4();
  const _Deep = options._Deep || _initDeep();

  class Deep extends _Deep {
    [key: string | number | symbol]: any;

    static Deep = Deep;
    public Deep = Deep;

    constructor(id?: string) {
      super(id);
    }

    *[Symbol.iterator]() {
      // This is the default iterator if no specific iterator is provided in _context.
      // By default, a generic Deep instance is not iterable over a sequence of values.
      // It yields nothing.
      return;
    }

    _construct(target: any, _deep: Deep, deep: Deep, args: any[] = []) {
      const _data = this._data;
      if (typeof _data === 'function') {
        return new _data(...args);
      } else if (args[0] instanceof Deep) {
        return args[0];
      } else if (_deep._context._constructor) {
        const _instance = new Deep(_deep._id);
        const instance = _instance._proxify;
        instance._source = _deep._id;
        instance._reason = reasonConstructId;
        // Call the _construction callback if it exists on the instance
        if (instance && instance._context && typeof instance._context._construction === 'function') {
          instance._reason = deep.reasons.construction._id;
          instance._context._construction.call(instance);
          instance._reason = reasonConstructId;
        }
        return _deep._context._constructor(instance, args);
      } else {
        const _instance = new Deep(...args);
        const instance = _instance._proxify;
        if (!args[0]) instance._type = _deep._id;
        instance._source = _deep._id;
        instance._reason = reasonConstructId;
        
        // Call the _construction callback if it exists on the instance
        if (instance._context && typeof instance._context._construction === 'function') {
          instance._reason = deep.reasons.construction._id;
          instance._context._construction.call(instance);
          instance._reason = reasonConstructId;
        }
        
        return instance._proxify;
      }
    }

    _apply(thisArg: any, target: any, _deep: Deep, proxy: Deep, args: any[] = []) {
      const _data = this._data;
      if (this._context._apply) {
        const _instance = new Deep(this._id);
        const instance = _instance._proxify;
        if (thisArg) instance._source = thisArg;
        instance._reason = proxy.reasons.apply._id;
        return this._context._apply.apply(instance, args);
      } else if (typeof _data === 'function') {
        return _data.apply(thisArg, args);
      } else if (!_deep._type) {
        return this._construct(target, _deep, proxy, args);
      } else {
        throw new Error('this._data is not a function');
      }
    }

    _getter(target: any, key: string | symbol, source: any, _deep: Deep, proxy: Deep) {
      const getter = this._context[key];
      if (getter instanceof Deep && (getter as any)?._context?._getter) {
        return (getter as any)?._context?._getter(getter, key, source);
      } else {
        return getter;
      }
    }

    _setter(target: any, key: string | symbol, value: any, source: any, _deep: Deep, proxy: Deep) {
      const setter = this._context[key];
      if (setter instanceof Deep && (setter as any)?._context?._setter) {
        return (setter as any)?._context?._setter(setter, key, value, source);
      } else {
        return setter;
      }
    }

    _deleter(target: any, key: string | symbol, _deep: Deep, proxy: Deep) {
      const deleter = this._context[key];
      if (deleter instanceof Deep && (deleter as any)?._context?._deleter) {
        return (deleter as any)?._context?._deleter(deleter, key, target);
      } else {
        return deleter;
      }
    }

    _haser(target: any, key: string | symbol, _deep: Deep, proxy: Deep) {
      return _deep._context[key] !== undefined;
    }

    // <events>
    _on(eventType: string, handler: Function) {
      return this._events.on(this._id, eventType, handler);
    }
    _once(eventType: string, handler: Function) {
      return this._events.once(this._id, eventType, handler);
    }
    _off(eventType: string, handler: Function) {
      return this._events.off(this._id, eventType, handler);
    }
    _emit(eventType: string, ...args: any[]) {
      this._events.emit(this._id, eventType, ...args);
    }
    // </events>

    // Call destruction callback and perform cleanup
    destroy() {
      // Call the _destruction callback if it exists on the instance
      if (this._context && typeof this._context._destruction === 'function') {
        const _self = new Deep(this._id);
        const self = _self._proxify;
        self._source = this._id;
        self._reason = this.reasons.destruction._id;
        this._context._destruction.call(self);
      }
      
      // Call the parent class destroy method to clean up all associations
      super.destroy();
    }

    get _proxify() {
      const _deep = this;
      const proxy: any = new Proxy(this, {
        construct(target, args: any[] = []) {
          return _deep._construct(target, _deep, proxy, args);
        },
        apply(target, thisArg, args: any[] = []) {
          return _deep._apply(thisArg, target, _deep, proxy, args);
        },
        get: (target, key, receiver) => {
          if (key === Symbol.toPrimitive) {
            return (hint: string) => {
              if (hint === 'number') {
                return NaN;
              }
              return _deep._id; // For 'string' or 'default' hint
            };
          }
          // Gracefully handle common symbols used by Jest/React if not explicitly defined
          if (
            typeof key === 'symbol' && 
            (
              key.toString() === 'Symbol(Symbol.toPrimitive)' || // Already handled, but good to list
              key.toString() === 'Symbol(Symbol.toStringTag)' ||
              key.toString() === 'Symbol(react.element)' || // $$typeof often refers to this
              key.toString() === 'Symbol(jest.asymmetricMatcher)'
            )
          ) {
            // If it's one of these symbols, and it's NOT explicitly in our context 
            // AND not a direct property of the target (which 'key in target' checks, including prototype chain for defined values)
            // then return undefined to prevent Jest/React from erroring.
            if (!(_deep._context && typeof _deep._context === 'object' && _deep._context !== null && _deep._context[key] !== undefined) && !(key in target)) {
                return undefined;
            }
            // Otherwise, let it fall through. If it was 'key in target' but has no value or specific getter below, it might still throw.
          }

          if (_deep._context && typeof _deep._context === 'object' && _deep._context !== null && _deep._context[key] !== undefined) {
            const getted = _deep._getter(target, key, receiver, _deep, proxy);
            return getted;
          } else if (key in _deep) { // This checks own properties and prototype chain of _deep itself.
            return _deep[key];
          } else {
            // If it's a string key that wasn't handled by symbols and isn't in _deep or _context
            throw new Error(`${key.toString()} getter is not in a context or property of ${_deep._id}`);
          }
        },
        set: (target, key, value, receiver) => {
          if (_deep._context[key]) {
            const setted = _deep._setter(target, key, value, receiver, _deep, proxy);
            return setted;
          } else if (key in _deep) {
            return _deep[key] = value;
          } else {
            throw new Error(`${key.toString()} setter is not in a context or property of ${_deep._id}`);
          }
        },
        deleteProperty: (target, key) => {
          if (_deep._context && typeof _deep._context === 'object' && _deep._context !== null && _deep._context[key] !== undefined) {
            return _deep._deleter(target, key, _deep, proxy);
          } else if (key in target) { // Check if key is a direct property of the target (_deep instance)
            // Allow deletion of direct properties if no context deleter exists, symmetric with 'set'
            return delete target[key]; // Standard JavaScript deletion
          } else {
            throw new Error(`${key.toString()} deleter is not in a context or property of ${_deep._id}`);
          }
        },
        has: (target, key) => {
          if (_deep._context[key]) {
            return _deep._haser(target, key, _deep, proxy);
          } else {
            return key in _deep;
          }
        },
        ownKeys: (target) => {
          return [...new Set([
            ...Reflect.ownKeys(target),
            ...Object.keys(target._context),
          ])];
        },
        getOwnPropertyDescriptor: (target, key) => {
          const targetDesc = Reflect.getOwnPropertyDescriptor(target, key);
          return targetDesc ? targetDesc : target._context[key] ? {
            enumerable: true,
            configurable: true,
            value: target._context[key]
          } : undefined;
        }
      });
      return proxy;
    }
  }
  return Deep;
}

export function newDeep(options: {
  reasonConstructId?: string;
  Deep?: any;
  _Deep?: any;
} = {}) {
  const reasonConstructId = options.reasonConstructId || uuidv4();
  const Deep = options.Deep || initDeep({
    reasonConstructId,
    _Deep: options._Deep
  });
  const _deep = new Deep(); // _deep is the raw instance

  const deep = _deep._proxify; // NOW proxify it. deep (proxy) will see _genericMethods.

  newReasons(deep, reasonConstructId);

  deep._context.Function = newFunction(deep);
  deep._context.Field = newField(deep);
  deep._context.Method = newMethod(deep);
  deep._context.Alive = newAlive(deep);

  newMethods(deep);
  newEvents(deep); // Add event methods with value propagation

  deep._context.is = newIs(deep);
  deep._context.type = newType(deep);
  deep._context.from = newFrom(deep);
  deep._context.to = newTo(deep);
  deep._context.value = newValue(deep);
  deep._context.val = newVal(deep);
  deep._context.data = newData(deep);
  deep._context.String = newString(deep);
  deep._context.Number = newNumber(deep);
  deep._context.Set = newSet(deep);
  deep._context.detect = newDetect(deep);
  
  // Add backward reference accessors
  deep._context.typed = newBackward(deep, _deep._Type, deep.reasons.typed._id);
  deep._context.in = newBackward(deep, _deep._To, deep.reasons.in._id);
  deep._context.out = newBackward(deep, _deep._From, deep.reasons.out._id);
  deep._context.valued = newBackward(deep, _deep._Value, deep.reasons.valued._id);
  
  return deep;
}