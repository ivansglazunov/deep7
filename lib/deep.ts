// Implements the high-level, user-facing Deep class, providing a proxied interface for dynamic property access, construction, function application, and an event system. Instances created via newDeep() are the primary interaction points for the framework user.

import { _initDeep } from "./";
import { newAlive } from "./alive";
import { newArray } from "./array";
import { newBackward } from "./backwards";
import { newContain } from './contain';
import { newDetect } from "./detect";
import { newEvents } from "./events";
import { newField } from "./field";
import { newFunction } from './function';
import { newIs, newTypeof, newTypeofs } from "./is";
import { newLifecycle } from "./lifecycle";
import { newLinks } from "./links";
import { newMethod } from "./method";
import { newMethods } from "./methods";
import { newNary } from "./nary";
import { newNumber } from "./number";
import { newObject } from "./object";
import { newPackager } from "./packager";
import { newPackagerMemoryAsync } from "./packager/memory-async";
import { newPackagerMemorySync } from "./packager/memory-sync";
import { newPackagerFsJsonSync } from "./packager/fs-json-sync";
import { newIsPromising, newPromise } from './promise';
import { newQuery } from "./query";
import { newReasons } from "./reasons";
import { newSet } from "./set";
import { newState } from './state';
import { newString } from "./string";
import { newTracking } from "./tracking";


export function initDeep(options: {
  _Deep?: any;
} = {}) {
  const _Deep = options._Deep || _initDeep();

  class Deep extends _Deep {
    [key: string | number | symbol]: any;

    static Deep = Deep;
    public Deep = Deep;

    static deep: Deep | undefined;
    get deep() {
      if (!Deep.deep) Deep.deep = this._deep._proxify;
      return Deep.deep;
    }

    constructor(id?: string) {
      super(id);
    }

    *[Symbol.iterator]() {
      // This is the default iterator if no specific iterator is provided in _contain.
      // By default, a generic Deep instance is not iterable over a sequence of values.
      // It yields nothing.
      return;
    }

    _construct(target: any, _deep: Deep, deep: Deep, args: any[] = []) {
      const _data = this._data;
      if (typeof _data === 'function') {
        return new _data(...args);
      } else if (_deep._contain._constructor) {
        const _instance = new Deep(_deep._id);
        const instance = _instance._proxify;
        instance._source = _deep._id;
        // Call the _construction callback if it exists on the instance
        if (instance && instance._contain && typeof instance._contain._construction === 'function') {
          instance._reason = deep.reasons.construction._id;
          instance._contain._construction.call(instance, args);
        }
        return _deep._contain._constructor(instance, args);
      } else if (args[0] instanceof Deep) {
        return args[0];
      } else {
        const _instance = new Deep(...args);
        const instance = _instance._proxify;

        if (!args[0]) {
          instance.__type = _deep._id;
        }
        instance._source = _deep._id;

        // Call the _construction callback if it exists on the instance
        if (instance._contain && typeof instance._contain._construction === 'function') {
          instance._reason = deep.reasons.construction._id;
          instance._contain._construction.call(instance);
        }

        // Emit any pending events after creating new association
        this._emitPendingEvents(deep);

        const proxified = instance._proxify;

        return proxified;
      }
    }

    // Helper method to emit pending events
    _emitPendingEvents(deep: any) {
      if (deep._Deep._pendingEvents && deep._Deep._pendingEvents.length > 0) {
        // Check if events are initialized by checking if the events context exists
        try {
          if (deep._contain && deep._contain.events && deep._contain.events._contain && deep._contain.events._contain.globalConstructed) {
            const eventsToEmit = [...deep._Deep._pendingEvents];
            deep._Deep._pendingEvents = []; // Clear pending events

            for (const pendingEvent of eventsToEmit) {
              if (pendingEvent.type === 'globalConstructed') {
                deep._emit(deep.events.globalConstructed._id, pendingEvent.data);
              } else if (pendingEvent.type === 'globalDestroyed') {
                deep._emit(deep.events.globalDestroyed._id, pendingEvent.data);
              }
            }
          }
        } catch (error) {
          // Events not yet initialized, keep pending events for later
        }
      }
    }

    static _toId(maybeId: any) {
      if (typeof maybeId === 'string') {
        return maybeId;
      } else if (maybeId instanceof Deep) {
        return maybeId._id;
      } else throw new Error('maybeId is not a string or Deep instance');
    }

    _apply(thisArg: any, target: any, _deep: Deep, proxy: Deep, args: any[] = []) {
      const _data = this._data;
      if (this._contain._apply) {
        const _instance = new Deep(this._id);
        const instance = _instance._proxify;
        if (thisArg) instance._source = Deep._toId(thisArg);
        instance._reason = proxy.reasons.apply._id;
        return this._contain._apply.apply(instance, args);
      } else if (typeof _data === 'function') {
        return _data.apply(thisArg, args);
      } else if (!_deep._type) {
        return this._construct(target, _deep, proxy, args);
      } else {
        throw new Error('this._data is not a function');
      }
    }

    _getter(target: any, key: string | symbol, source: any, _deep: Deep, proxy: Deep) {
      const getter = this._contain[key];
      if (getter instanceof Deep && (getter as any)?._contain?._getter) {
        return (getter as any)?._contain?._getter(getter, key, source);
      } else {
        return getter;
      }
    }

    _setter(target: any, key: string | symbol, value: any, source: any, _deep: Deep, proxy: Deep) {
      const setter = this._contain[key];
      if (setter instanceof Deep && (setter as any)?._contain?._setter) {
        return (setter as any)?._contain?._setter(setter, key, value, source);
      } else {
        return setter;
      }
    }

    _deleter(target: any, key: string | symbol, _deep: Deep, proxy: Deep) {
      const deleter = this._contain[key];
      if (deleter instanceof Deep && (deleter as any)?._contain?._deleter) {
        return (deleter as any)?._contain?._deleter(deleter, key, target);
      } else {
        return deleter;
      }
    }

    _haser(target: any, key: string | symbol, _deep: Deep, proxy: Deep) {
      return _deep._contain[key] !== undefined;
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
      // CASCADING DELETION: Find and destroy all elements that have this instance as their type
      // This ensures that when a type is destroyed, all its instances are also destroyed
      const typedElements = this._typed; // Get all elements that have this as their type
      if (typedElements && typedElements.size > 0) {
        // Create array to avoid modifying set during iteration
        const elementsToDestroy = Array.from(typedElements);
        for (const elementId of elementsToDestroy) {
          try {
            // Create Deep instance and destroy it
            const element = new Deep(elementId as string);
            element.destroy();
          } catch (error) {
            // Continue destroying other elements even if one fails
            // console.warn(`Failed to destroy element ${elementId}:`, error);
          }
        }
      }

      // Emit local destroyed event on the association before cleanup
      if (this._contain && this._contain.events && this._contain.events.destroyed) {
        const proxy = this._proxify;
        const payload = new proxy.constructor(this._id);
        payload._reason = proxy.events.destroyed._id;
        payload._source = this._id;
        proxy._emit(proxy.events.destroyed._id, payload);
      }

      // Call the _destruction callback if it exists on the instance
      if (this._contain && typeof this._contain._destruction === 'function') {
        const _self = new Deep(this._id);
        const self = _self._proxify;
        self._source = this._id;
        self._reason = this.reasons.destruction._id;
        this._contain._destruction.call(self);
      }

      const proxy = this._proxify;
      delete proxy.type;
      delete proxy.from;
      delete proxy.to;
      delete proxy.value;
      if (this._data) delete proxy.data;
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
            if (!(_deep._contain && typeof _deep._contain === 'object' && _deep._contain !== null && _deep._contain[key] !== undefined) && !(key in target)) {
              return undefined;
            }
            // Otherwise, let it fall through. If it was 'key in target' but has no value or specific getter below, it might still throw.
          }

          if (_deep._contain && typeof _deep._contain === 'object' && _deep._contain !== null && _deep._contain[key] !== undefined) {
            const getted = _deep._getter(target, key, receiver, _deep, proxy);
            return getted;
          } else if (key in _deep) { // This checks own properties and prototype chain of _deep itself.
            return _deep[key];
          } else {
            // Special handling for Jest/React/Library problematic string keys
            if (typeof key === 'string' && (
              key === '$$typeof' || 
              key.includes('Symbol(') ||
              key === 'nodeType' ||
              key === 'nodeName' ||
              key === 'tagName' ||
              key === 'ownerDocument' ||
              key === 'parentNode' ||
              key === 'childNodes' ||
              key === 'firstChild' ||
              key === 'lastChild' ||
              key === 'attributes' ||
              key === 'style' ||
              key.startsWith('on') || // event handlers
              key === 'innerHTML' ||
              key === 'textContent' ||
              key === 'className' ||
              key === 'id' ||
              key.includes('@@') || // Immutable.js and other libraries
              key.includes('__') || // Various library internal properties
              key.startsWith('Symbol.') || // Symbol keys as strings
              key === 'valueOf' ||
              key === 'toString' ||
              key === 'constructor' ||
              key === 'prototype'
            )) {
              return undefined; // Return undefined silently for external library properties
            }
            // DEBUG: Log other problematic keys for investigation
            if (typeof key === 'string' && (key.includes('$$') || key.includes('typeof'))) {
              console.log(`🚨 DEBUG: Problematic key access:`, {
                key: key,
                keyType: typeof key,
                keyString: key.toString(),
                deepId: _deep._id,
                stackTrace: new Error().stack?.split('\n').slice(1, 4)
              });
            }
            // If it's a string key that wasn't handled by symbols and isn't in _deep or _contain
            throw new Error(`${key.toString()} getter is not in a context or property of ${_deep._id}`);
          }
        },
        set: (target, key, value, receiver) => {
          if (_deep._contain[key]) {
            const setted = _deep._setter(target, key, value, receiver, _deep, proxy);
            return setted;
          } else if (key in _deep) {
            _deep[key] = value;
            return true;
          } else {
            if (_deep?._contain.Contain) {
              if (!(value instanceof _Deep)) throw new Error(`Only deep's can be set as context`);
              const contain = new _deep._contain.Contain();
              contain.from = _deep._id;
              contain.to = value;
              contain.value = contain.detect(key);
              return true;
            }
            throw new Error(`${key.toString()} setter is not in a context or property of ${_deep._id}`);
          }
        },
        deleteProperty: (target, key) => {
          if (_deep._contain && typeof _deep._contain === 'object' && _deep._contain !== null && _deep._contain[key] !== undefined) {
            return _deep._deleter(target, key, _deep, proxy);
          } else if (key in target) { // Check if key is a direct property of the target (_deep instance)
            // Allow deletion of direct properties if no context deleter exists, symmetric with 'set'
            return delete target[key]; // Standard JavaScript deletion
          } else {
            throw new Error(`${key.toString()} deleter is not in a context or property of ${_deep._id}`);
          }
        },
        has: (target, key) => {
          if (_deep._contain[key]) {
            return _deep._haser(target, key, _deep, proxy);
          } else {
            return key in _deep;
          }
        },
        ownKeys: (target) => {
          return [...new Set([
            ...Reflect.ownKeys(target),
            ...Object.keys(target._contain),
          ])];
        },
        getOwnPropertyDescriptor: (target, key) => {
          const targetDesc = Reflect.getOwnPropertyDescriptor(target, key);
          return targetDesc ? targetDesc : target._contain[key] ? {
            enumerable: true,
            configurable: true,
            value: target._contain[key]
          } : undefined;
        }
      });
      return proxy;
    }

    // potential unsafe if newDeep call not ended

    get title() {
      const proxy = this._proxify;
      return `${
        `${this._id}`
      } ${
        this._type ? `(${proxy.type.name  || this._type})` : 'deep'
      }`;
    }

    error(error: any) {
      this._emit(this.events.error._id, error);
    }
  }
  return Deep;
}

export function newDeep(options: {
  existingIds?: string[];
  Deep?: any;
  _Deep?: any;
} = {}) {
  const Deep = options.Deep || initDeep({
    _Deep: options._Deep
  });

  // IMPORTANT: Set existing IDs BEFORE creating any instances
  if (options.existingIds) {
    Deep._setExistingIds(options.existingIds);
  }

  // Enable initial associations protection mechanism
  Deep._enableProtection();

  const _deep = new Deep(); // _deep is the raw instance

  const deep = _deep._proxify; // NOW proxify it. deep (proxy) will see _genericMethods.

  // Store reference to deep proxy for event emission from _Deep instances
  _deep._Deep._deepProxy = deep;

  newReasons(deep);

  deep._contain.Function = newFunction(deep);
  deep._contain.Field = newField(deep);
  deep._contain.Method = newMethod(deep);
  deep._contain.Alive = newAlive(deep);

  newMethods(deep);
  newEvents(deep); // Add event methods with value propagation

  // Emit any pending events that were deferred during construction
  if (_deep._Deep._pendingEvents && _deep._Deep._pendingEvents.length > 0) {
    for (const pendingEvent of _deep._Deep._pendingEvents) {
      if (pendingEvent.type === 'globalConstructed') {
        deep._emit(deep.events.globalConstructed._id, pendingEvent.data);
      } else if (pendingEvent.type === 'globalDestroyed') {
        deep._emit(deep.events.globalDestroyed._id, pendingEvent.data);
      }
    }
    _deep._Deep._pendingEvents = []; // Clear pending events
  }

  deep._contain.is = newIs(deep);
  deep._contain.typeof = newTypeof(deep);
  deep._contain.typeofs = newTypeofs(deep);

  // Initialize all link fields at once
  newLinks(deep);

  // Initialize state field for high-level state access
  deep._contain.state = newState(deep);

  newPromise(deep);  // Use existing promise system
  deep._contain.isPromising = newIsPromising(deep);  // Add isPromising field

  deep._contain.String = newString(deep);
  deep._contain.Number = newNumber(deep);
  newTracking(deep); // Initialize tracking BEFORE Set and Array
  deep._contain.Object = newObject(deep);
  deep._contain.Set = newSet(deep);
  deep._contain.Array = newArray(deep);
  deep._contain.detect = newDetect(deep);

  // Initialize n-ary operations
  newNary(deep);

  // Add backward reference accessors
  deep._contain.typed = newBackward(deep, _deep._Type, deep.reasons.typed._id);
  deep._contain.in = newBackward(deep, _deep._To, deep.reasons.in._id);
  deep._contain.out = newBackward(deep, _deep._From, deep.reasons.out._id);
  deep._contain.valued = newBackward(deep, _deep._Value, deep.reasons.valued._id);

  // Initialize storage system
  // newStorages(deep);
  // newStorage(deep);  // New core storage system
  // newHasyxEvents(deep);  // Hasyx associative events system

  newContain(deep);

  // Initialize query system
  newQuery(deep);

  // Initialize lifecycle system
  newLifecycle(deep);

  newPackager(deep);
  newPackagerMemorySync(deep);
  newPackagerMemoryAsync(deep);
  newPackagerFsJsonSync(deep);

  deep._Deep._ids = new deep.Set(deep._Deep._ids);

  // Activate freeze for initial associations
  _deep._Deep.__freezeInitialAssociations = true;

  // Enable crutch fields after full initialization
  _deep._Deep.__crutchFields = true;

  return deep;
}