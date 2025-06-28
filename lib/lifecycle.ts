// Implements the Deep framework lifecycle system
// Provides lifecycle management with mounting/unmounting states and effects
// Similar to React useEffect but for Deep associations

import Debug from './debug';
import { isRealPromise } from './promise';

const debug = Debug('lifecycle');

export function newLifecycle(deep: any) {
  // Create basic lifecycle state types
  const Lifestate = new deep();
  deep.Lifestate = Lifestate;

  // Create specific lifecycle states
  deep.Constructed = new Lifestate();
  deep.Mounting = new Lifestate();
  deep.Mounted = new Lifestate();
  deep.Updating = new Lifestate();
  deep.Unmounting = new Lifestate();
  deep.Unmounted = new Lifestate();
  deep.Destroyed = new Lifestate();

  // Add lifecycle events to the events system
  const Lifechange = new deep.Event();
  deep.events.Lifechange = Lifechange;
  deep.events.Constructed = new Lifechange();
  deep.events.Mounting = new Lifechange();
  deep.events.Mounted = new Lifechange();
  deep.events.Updating = new Lifechange();
  deep.events.Unmounting = new Lifechange();
  deep.events.Unmounted = new Lifechange();
  deep.events.Destroyed = new Lifechange();

  const allowedLifechanges = {
    [deep.Constructed._id]: [deep.Mounting._id],
    [deep.Mounting._id]: [deep.Mounted._id, deep.Unmounting._id],
    [deep.Mounted._id]: [deep.Updating._id,deep.Unmounting._id],
    [deep.Updating._id]: [deep.Mounted._id, deep.Unmounting._id],
    [deep.Unmounting._id]: [deep.Unmounted._id],
    [deep.Unmounted._id]: [deep.Mounting._id, deep.Destroyed._id],
    [deep.Destroyed._id]: [],
  };

  // Global lifestate field - available on all Deep instances
  deep._contain.lifestate = new deep.Field(function (this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);

    if (this._reason === deep.reasons.getter._id) {
      // Check if association exists in deep._ids
      const safeIds = deep._ids instanceof deep.Deep ? deep._ids._data : deep._ids;
      if (safeIds.has(sourceId)) {
        return deep.Mounted;
      } else {
        return deep.Unmounted;
      }
    } else if (this._reason === deep.reasons.setter._id) {
      // Not available for non-lifecycle associations
      throw new Error('Setting lifestate is not available for non-lifecycle associations');
    } else if (this._reason === deep.reasons.deleter._id) {
      // Not available for non-lifecycle associations  
      throw new Error('Deleting lifestate is not available for non-lifecycle associations');
    }
  });

  // Create lifecycle state check fields
  const createLifestateCheckField = (targetState: any) => {
    return new deep.Field(function (this: any, key: any, value: any) {
      const sourceId = this._source;
      const source = new deep(sourceId);

      if (this._reason === deep.reasons.getter._id) {
        return !!source.lifestate?.type?.is(targetState);
      } else if (this._reason === deep.reasons.setter._id) {
        if (typeof value === 'boolean') {
          if (value) {
            source.lifestate = targetState;
          }
          // If false, do nothing (leave unchanged)
        } else {
          throw new Error('Lifecycle state setter accepts only boolean values');
        }
        return value;
      } else if (this._reason === deep.reasons.deleter._id) {
        delete source.lifestate;
        return true;
      }
    });
  };

  deep.isMounting = createLifestateCheckField(deep.Mounting);
  deep.isMounted = createLifestateCheckField(deep.Mounted);
  deep.isUpdating = createLifestateCheckField(deep.Updating);
  deep.isUnmounting = createLifestateCheckField(deep.Unmounting);
  deep.isUnmounted = createLifestateCheckField(deep.Unmounted);

  // Main Lifecycle class
  const Lifecycle = new deep();
  deep.Lifecycle = Lifecycle;

  Lifecycle._contain.effect = new deep.Field(function (this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);

    if (this._reason === deep.reasons.getter._id) {
      return source._state._lifecycle_effect || source.type._state._lifecycle_effect;
    } else if (this._reason === deep.reasons.setter._id) {
      let effect: any;
      if (typeof value === 'function') {
        effect = new deep.Function(value);
      } else if (value instanceof deep.Deep && value.type.is(deep.Function)) {
        effect = value;
      } else {
        throw new Error('Lifecycle constructor requires a function or Deep.Function as first argument');
      }
      source._state._lifecycle_effect = effect;
      return effect;
    } else if (this._reason === deep.reasons.deleter._id) {
      const effect = source.effect;
      if (effect) effect.destroy();
      return true;
    }
  });

  Lifecycle._contain._constructor = function (this: any, constructor: any, args: any[] = []) {
    const lifecycle = new deep();
    lifecycle.type_id = constructor._id;
    const effect = constructor.effect;
    if (effect) {
      const maybePromise = effect.call(lifecycle, deep.Constructed, args);
      if (isRealPromise(maybePromise)) {
        maybePromise.catch(error => {
          lifecycle.error(error);
          console.error(error);
        });
      }
    }
    return lifecycle;
  };

  Lifecycle._contain._destruction = function (this: any) {
    delete this.lifestate;
    if (this.effect) {
      const maybePromise = this.effect.call(this, deep.Destroyed);
      if (isRealPromise(maybePromise)) {
        maybePromise.catch(error => {
          this.error(error);
          console.error(error);
        });
      }
    }
  };

  // Enhanced lifestate field for Lifecycle instances
  Lifecycle._contain.lifestate = new deep.Field(function (this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);

    if (this._reason === deep.reasons.getter._id) {
      // Return query result for outgoing lifecycle states
      const results = deep.query({ value: source, type: { type: deep.Lifestate } })
      const result = results.first;
      return result || undefined;
    } else if (this._reason === deep.reasons.setter._id) {
      // Validate that value is a Lifestate
      if (!(value instanceof deep.Deep) || !value.type.is(deep.Lifestate)) {
        throw new Error('Lifecycle lifestate setter accepts only Lifestate instances');
      }
      const beforeLifestate = source.lifestate;
      if (!!beforeLifestate && !allowedLifechanges[beforeLifestate.type_id].includes(value._id)) {
        throw new Error(`Cannot transition from ${beforeLifestate.type.name} to ${value.name}`);
      }

      // Delete existing lifestate
      delete source.lifestate;

      // Create new lifestate instance with proper type setup
      const lifestate = new value();
      lifestate.value = source;
      // Note: type is automatically set when creating instance of 'value' (e.g. new deep.Mounting())

      return lifestate;
    } else if (this._reason === deep.reasons.deleter._id) {
      // Delete all existing lifecycle states
      const lifestate = source.lifestate;
      if (lifestate) lifestate.destroy();
      return true;
    }
  });

  // Convenient lifecycle transition fields
  const generateLifechangeMethod = (name: string, lifestate: any) => {
    deep[name] = new deep.Method(function (this: any, ...args: any[]) {
      const sourceId = this._source;
      const source = new deep(sourceId);
      
      // Create new promise and pass it to setter for proper counting
      const beforeLifestate = source.lifestate;
      if (!!beforeLifestate && !allowedLifechanges[beforeLifestate.type_id].includes(lifestate._id)) {
        throw new Error(`Cannot transition from ${beforeLifestate.type.name} to ${lifestate.name}`);
      }
      
      source.lifestate = lifestate;

      const effect = source.effect;
      if (effect) {
        const result = effect.call(source, lifestate, args);
        
        if (isRealPromise(result)) {
          result.catch(error => {
            source.error(error);
            console.error(error);
          });
        }
        
        // If result is a promise, pass it to the promise system
        if (result && !(result instanceof deep.Deep) && isRealPromise(result)) {
          source.promise = result;
        }
        source.emit(deep.events[lifestate.name]);
      }

      return source.promise;
    });
  };

  generateLifechangeMethod('constructed', deep.Constructed);
  generateLifechangeMethod('mount', deep.Mounting);
  generateLifechangeMethod('mounted', deep.Mounted);
  generateLifechangeMethod('update', deep.Updating);
  generateLifechangeMethod('unmount', deep.Unmounting);
  generateLifechangeMethod('unmounted', deep.Unmounted);
  generateLifechangeMethod('destroyed', deep.Destroyed);

  Lifecycle.error = new deep.Method(function (this: any, message: string) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    source.error(message);
  });

  return Lifecycle;
} 