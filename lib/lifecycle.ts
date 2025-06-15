// Implements the Deep framework lifecycle system
// Provides lifecycle management with mounting/unmounting states and effects
// Similar to React useEffect but for Deep associations

export function newLifecycle(deep: any) {
  // Create basic lifecycle state types
  const Lifestate = new deep();
  deep.Lifestate = Lifestate;

  // Create specific lifecycle states
  deep.Constructed = new Lifestate();
  deep.Mounting = new Lifestate();
  deep.Mounted = new Lifestate();
  deep.Unmounting = new Lifestate();
  deep.Unmounted = new Lifestate();
  deep.Destroyed = new Lifestate();

  // Add lifecycle events to the events system
  const Lifechange = new deep.Event();
  deep.events.Lifechange = Lifechange;
  deep.events.Constructed = new Lifechange();
  deep.events.Mounting = new Lifechange();
  deep.events.Mounted = new Lifechange();
  deep.events.Unmounting = new Lifechange();
  deep.events.Unmounted = new Lifechange();
  deep.events.Destroyed = new Lifechange();

  // Global lifestate field - available on all Deep instances
  deep._context.lifestate = new deep.Field(function (this: any, key: any, value: any) {
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
        return source.lifestate.is(targetState);
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

  deep.isConstructed = createLifestateCheckField(deep.Constructed);
  deep.isMounting = createLifestateCheckField(deep.Mounting);
  deep.isMounted = createLifestateCheckField(deep.Mounted);
  deep.isUnmounting = createLifestateCheckField(deep.Unmounting);
  deep.isUnmounted = createLifestateCheckField(deep.Unmounted);

  // Main Lifecycle class
  const Lifecycle = new deep();
  deep.Lifecycle = Lifecycle;

  Lifecycle._context._constructor = function (this: any, constructor: any, args: any[] = []) {
    const effectArg = args[0];
    let effectDeepFunction: any;

    // Validate and convert effect function
    if (typeof effectArg === 'function') {
      effectDeepFunction = new deep.Function(effectArg);
    } else if (effectArg instanceof deep.Deep && effectArg.type.is(deep.Function)) {
      effectDeepFunction = effectArg;
    } else {
      throw new Error('Lifecycle constructor requires a function or Deep.Function as first argument');
    }

    // Create lifecycle instance
    const lifecycle = new deep();
    lifecycle._type = constructor._id;
    
    // Store effect function in state
    lifecycle._state._lifecycle_effect = effectDeepFunction;

    // Execute effect for the first time and get destruction function
    const result = effectDeepFunction._data.call(lifecycle, deep.Constructed);
    
    if (result && !(result instanceof deep.Deep) && typeof result.then === 'function') {
      lifecycle.promise = result;
    }

    return lifecycle;
  };

  Lifecycle._context._destruction = function (this: any) {
    if (this?._state?._lifecycle_effect?._data) {
      this._state._lifecycle_effect._data.call(this, deep.Destroyed);
    }
  };

  // Enhanced lifestate field for Lifecycle instances
  Lifecycle._context.lifestate = new deep.Field(function (this: any, key: any, value: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);

    if (this._reason === deep.reasons.getter._id) {
      // Return query result for outgoing lifecycle states
      return deep.query({ value: source, type: deep.Lifestate });
    } else if (this._reason === deep.reasons.setter._id) {
      // Validate that value is a Lifestate
      if (!(value instanceof deep.Deep) || !value.type.is(deep.Lifestate)) {
        throw new Error('Lifecycle lifestate setter accepts only Lifestate instances');
      }

      // Delete existing lifestate
      delete source.lifestate;

      // Create new lifestate instance
      const lifestate = new value();
      lifestate.value = source;

      if (source._state._lifecycle_effect) {
        const result = source._state._lifecycle_effect._data.call(source, value);
        
        // If result is a promise, store it
        if (result && !(result instanceof deep.Deep) && typeof result.then === 'function') {
          source.promise = result;
        }
        
        source.emit(deep.events[value.name]);
      }

      return lifestate;
    } else if (this._reason === deep.reasons.deleter._id) {
      // Delete all existing lifecycle states
      const existingStates = source.lifestate;
      if (existingStates) {
        for (const state of existingStates) {
          state.destroy();
        }
      }
      return true;
    }
  });

  // Convenient lifecycle transition fields
  const generateLifechangeMethod = (name: string, lifestate: any) => {
    deep[name] = new deep.Field(function (this: any, key: any, value: any) {
      const sourceId = this._source;
      const source = new deep(sourceId);
  
      if (this._reason === deep.reasons.getter._id) {
        // Create and return a native Promise
        const promise = source.promise = source.promise.then(() => {
          source.lifestate = lifestate;
        });
        return promise;
      } else if (this._reason === deep.reasons.setter._id) {
        throw new Error(`${name} field is read-only`);
      } else if (this._reason === deep.reasons.deleter._id) {
        throw new Error(`${name} field cannot be deleted`);
      }
    });
  };

  generateLifechangeMethod('constructed', deep.Constructed);
  generateLifechangeMethod('mount', deep.Mounting);
  generateLifechangeMethod('mounted', deep.Mounted);
  generateLifechangeMethod('unmount', deep.Unmounting);
  generateLifechangeMethod('unmounted', deep.Unmounted);
  generateLifechangeMethod('destroyed', deep.Destroyed);

  return Lifecycle;
} 