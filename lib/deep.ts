import { _initDeep, _Relation } from "./";
import { newField } from "./field";
import { newFrom, newTo, newType, newValue } from "./links";
import { newFunction } from './function';
import { newMethod } from "./method";
import { newIs } from "./is";
import { newString } from "./string";
import { newNumber } from "./number";

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
          if (_deep._context[key]) {
            const getted = _deep._getter(target, key, receiver, _deep, proxy);
            return getted;
          } else if (key in _deep) {
            return _deep[key];
          } else {
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
  deep._context.String = newString(deep);
  deep._context.Number = newNumber(deep);
  return deep;
}