import { _initDeep } from "./";
import { newField } from "./field";
import { newFunction } from './function';
import { newIs } from "./is";
import { newData, newFrom, newTo, newType, newVal, newValue } from "./links";
import { newMethod } from "./method";
import { newNumber } from "./number";
import { newString } from "./string";

export enum _Reason {
  Construct = 'construct',
  Apply = 'apply',
  Getter = 'getter',
  Setter = 'setter',
  Deleter = 'deleter',
}

export function initDeep() {
  const _Deep = _initDeep();

  class Deep extends _Deep {
    static Deep = Deep;
    public Deep = Deep;

    constructor(id?: string) {
      super(id);
    }

    _construct(target: any, _deep: Deep, deep: Deep, args: any[] = []) {
      const _data = this._data;
      if (typeof _data === 'function') {
        return new _data(...args);
      } else if (args[0] instanceof Deep) {
        return args[0];
      } else if (_deep._context._constructor) {
        const instance = new Deep(_deep._id);
        instance._source = _deep._id;
        instance._reason = _Reason.Construct;
        return _deep._context._constructor(deep, args);
      } else {
        const instance = new Deep(...args);
        if (!args[0]) instance._type = _deep._id;
        instance._source = _deep._id;
        instance._reason = _Reason.Construct;
        return instance._proxify;
      }
    }

    _apply(thisArg: any, target: any, _deep: Deep, proxy: Deep, args: any[] = []) {
      const _data = this._data;
      if (this._context._apply) {
        const instance = new Deep(this._id);
        instance._source = thisArg;
        instance._reason = _Reason.Apply;
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
          if (_deep._context[key]) {
            return _deep._deleter(target, key, _deep, proxy);
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

export function newDeep() {
  const Deep = initDeep();
  const _deep = new Deep();
  const deep = _deep._proxify;
  deep._context.Function = newFunction(deep);
  deep._context.Field = newField(deep);
  deep._context.Method = newMethod(deep);

  deep._context.is = newIs(deep);
  deep._context.type = newType(deep);
  deep._context.from = newFrom(deep);
  deep._context.to = newTo(deep);
  deep._context.value = newValue(deep);
  deep._context.val = newVal(deep);
  deep._context.data = newData(deep);
  deep._context.String = newString(deep);
  deep._context.Number = newNumber(deep);
  return deep;
}