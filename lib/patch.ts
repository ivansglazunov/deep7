import _ from 'lodash';
import Debug from './debug';

export function newPatch(deep) {
  const debug = Debug('patch');

  const Patch = new deep.Lifecycle();
  Patch.name = 'Patch';

  Patch._contain.data = new deep.Field(function(this: any) {
    if (this._reason === deep.reasons.getter._id) {
      const patch = new deep(this._source);
      return patch._state.data;
    } else throw new Error('Patch data read-only');
  });

  Patch.effect = async function(this: any, lifestate: any, args: any[]) {
    try {
      const patch = this;
      if (lifestate === deep.Constructed) {
        const options = args[0] || {};
        debug('Constructed');
        
        // Set up isChanged function
        if (options.isChanged !== undefined) {
          if (typeof options.isChanged !== 'function') {
            // Throw error without try-catch to allow proper error propagation
            const error = new Error('isChanged must be a function');
            console.error(error);
            throw error;
          }
          patch._state.isChanged = options.isChanged;
        } else {
          // Default to isEqual from lodash
          patch._state.isChanged = (oldItem: any, newItem: any) => !_.isEqual(oldItem, newItem);
        }
        
        if (options.data instanceof deep.Deep && options.data.type.is(deep.Array)) {
          patch._state.data = options.data;
        } else if (options.data) {
          throw new Error('Patch constructor expects { data: [...] } an deep.Array.');
        } else {
          patch._state.data = new deep.Array([]);
        }
        patch._state.idField = options.idField || 'id';
      } else if (lifestate === deep.Mounting) {
        debug('Mounting');
        const mountOptions = args[0];
        const idField = patch._state.idField;

        let newData;
        if (mountOptions && typeof(mountOptions.data) !== 'undefined') {
          debug('mountOptions.data');
          if (mountOptions.data instanceof deep.Deep && mountOptions.data.type.is(deep.Array)) {
            debug('mountOptions.data is deep.Array', mountOptions.data.data.length);
              newData = mountOptions.data.data;
          } else if (Array.isArray(mountOptions.data)) {
            debug('mountOptions.data is array', mountOptions.data.length);
              newData = mountOptions.data;
          } else {
            debug('mountOptions.data is not array or deep.Array', mountOptions.data);
            throw new Error('Patch mount expects { data: [...] } an array or deep.Array.');
          }

          diffAndEmit(patch, patch._state.data.data, newData, idField);
        }

        patch.mounted();
      } else if (lifestate === deep.Updating) {
        debug('Updating');
        const updateOptions = args[0];
        if (updateOptions && typeof(updateOptions.data) !== 'undefined') {
          debug('updateOptions.data');
          const idField = patch._state.idField;
          
          let newData;
          if (updateOptions.data instanceof deep.Deep && updateOptions.data.type.is(deep.Array)) {
            debug('updateOptions.data is deep.Array', updateOptions.data.data.length);
              newData = updateOptions.data.data;
          } else if (Array.isArray(updateOptions.data)) {
            debug('updateOptions.data is array', updateOptions.data.length);
              newData = updateOptions.data;
          } else {
            throw new Error('Patch update expects { data: [...] } an array or deep.Array.');
          }

          diffAndEmit(patch, patch._state.data.data, newData, idField);
        }
        await patch.mounted();
      } else if (lifestate === deep.Unmounting) {
        debug('Unmounting');
        await patch.unmounted();
      }
    } catch(e) {
      console.error(e);
      throw e; // Re-throw the error to let the test catch it
    }
  };

  function diffAndEmit(patch: any, oldData: any[], newData: any[], idField: string) {
    debug('diffAndEmit', oldData.length, newData.length);
    const oldDataMap = new Map(oldData.map(item => [item[idField], item]));
    const newDataMap = new Map(newData.map(item => [item[idField], item]));
    const isChanged = patch._state.isChanged;

    debug('prepared', oldDataMap.size, newDataMap.size);
 
    // Deletions
    for (const [id, oldItem] of oldDataMap.entries()) {
      debug('diffAndEmit delete', id);
      if (!newDataMap.has(id)) {
        patch._state.data.delete(oldItem);
      }
    }
  
    // Additions and Updates
    for (const [id, newItem] of newDataMap.entries()) {
      debug('diffAndEmit addition&updating', id);
      const oldItem = oldDataMap.get(id);
      if (!oldItem) {
        debug('diffAndEmit add', id);
        patch._state.data.add(newItem);
      } else {
        if (isChanged(oldItem, newItem)) {
          debug('diffAndEmit update', id);
          const targetArray = patch._state.data._data;
          const indexToUpdate = targetArray.findIndex(item => item[idField] === id);
          if (indexToUpdate > -1) {
            patch._state.data.set(indexToUpdate, newItem);
          }
        }
      }
    }
  }

  deep.Patch = Patch;
  return Patch;
} 