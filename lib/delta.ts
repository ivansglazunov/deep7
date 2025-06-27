import { isRealPromise } from './promise';

/**
 * @fileoverview
 * This file provides delta generation and application functionalities.
 * Supported events: dataAdd, dataDelete, dataSet.
 * Throws an error for other event types.
 */

/**
 * Interface for the Delta object. It represents a change in a deep.Array.
 */
export interface Delta {
  id?: any;
  type: 'add' | 'delete' | 'set';
  payload: any;
}

export function newDelta(deep: any) {
  /**
   * Generates a serializable delta object from a deep event.
   * @param {any} event - The deep event object (e.g., deep.events.dataAdd).
   * @param {any[]} args - The arguments emitted with the event.
   * @returns {Delta} A serializable delta object.
   */
  deep._contain.getDelta = new deep.Method(function(this: any, event: any, args: any[]): Delta {
    const eventId = event._id;
    if (eventId === deep.events.dataAdd._id) {
      return {
        type: 'add',
        payload: {
          items: args.map(d => d._symbol),
        }
      };
    } else if (eventId === deep.events.dataDelete._id) {
      return {
        type: 'delete',
        payload: {
          items: args.map(d => d._symbol),
        }
      };
    } else if (eventId === deep.events.dataSet._id) {
      const detectedValue = args[0];
      return {
        type: 'set',
        payload: {
          index: detectedValue._field,
          value: detectedValue._after,
        }
      };
    } else {
      throw new Error(`Unsupported event type for getDelta: ${event.name || eventId}`);
    }
  });

  /**
   * Applies a delta to a deep instance.
   * @param {any} instance - The deep instance to apply the delta to.
   * @param {Delta} delta - The delta to apply.
   */
  deep._contain.setDelta = new deep.Method(function(this: any, instance: any, delta: Delta) {
    if (delta.type === 'add') {
      instance.add(...delta.payload.items);
    } else if (delta.type === 'delete') {
      instance.delete(...delta.payload.items);
    } else if (delta.type === 'set') {
      instance.set(delta.payload.index, delta.payload.value);
    } else {
      throw new Error(`Unsupported delta type: ${delta.type}`);
    }
  });

  const Delter = new deep.Lifecycle();

  Delter.effect = async function(this: any, lifestate: any, args: any[]) {
    const delter = this;
    if (lifestate === deep.Constructed) {
      const watchedInstance = args[0];
      if (!watchedInstance) {
        throw new Error('Delter constructor requires a deep instance to watch.');
      }
      delter.state._watch = watchedInstance;
      delter.state.data = new deep.Array();
      delter.state.handlers = {};
    } else if (lifestate === deep.Mounting) {
      const watched = delter.state._watch;
      const handlers = {};

      const handler = (event, eventArgs) => {
        const delta = deep.getDelta(event, eventArgs);
        delta.id = (new deep())._id;
        delter.state.data.add(delta);
      };

      const addHandler = (...eventArgs) => handler(deep.events.dataAdd, eventArgs);
      const deleteHandler = (...eventArgs) => handler(deep.events.dataDelete, eventArgs);
      const setHandler = (...eventArgs) => handler(deep.events.dataSet, [eventArgs[0]]);

      handlers['dataAdd'] = watched.on(deep.events.dataAdd, addHandler);
      handlers['dataDelete'] = watched.on(deep.events.dataDelete, deleteHandler);
      handlers['dataSet'] = watched.on(deep.events.dataSet, setHandler);
      
      delter.state.handlers = handlers;

      await delter.mounted();
    } else if (lifestate === deep.Unmounting) {
      const handlers = delter.state.handlers;
      if (handlers.dataAdd) handlers.dataAdd();
      if (handlers.dataDelete) handlers.dataDelete();
      if (handlers.dataSet) handlers.dataSet();
      delter.state.handlers = {};
      await delter.unmounted();
    }
  };
  
  deep.Delter = Delter;
  return Delter;
} 