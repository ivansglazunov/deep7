import isEqual from 'lodash/isEqual.js';

export function newPatch(deep) {
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
          patch._state.isChanged = (oldItem: any, newItem: any) => !isEqual(oldItem, newItem);
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
        const mountOptions = args[0];
        const idField = patch._state.idField;

        let newData;
        if (mountOptions && typeof(mountOptions.data) !== 'undefined') {

          if (mountOptions.data instanceof deep.Deep && mountOptions.data.type.is(deep.Array)) {
              newData = mountOptions.data.data;
          } else if (Array.isArray(mountOptions.data)) {
              newData = mountOptions.data;
          } else {
              throw new Error('Patch mount expects { data: [...] } an array ordeep.Array.');
          }

          diffAndEmit(patch, patch._state.data.data, newData, idField);
        }

        await patch.mounted();
      } else if (lifestate === deep.Updating) {
        const updateOptions = args[0];
        if (updateOptions && typeof(updateOptions.data) !== 'undefined') {
          const idField = patch._state.idField;
          
          let newData;
          if (updateOptions.data instanceof deep.Deep && updateOptions.data.type.is(deep.Array)) {
              newData = updateOptions.data.data;
          } else if (Array.isArray(updateOptions.data)) {
              newData = updateOptions.data;
          } else {
              throw new Error('Patch update expects { data: [...] } an array or deep.Array.');
          }

          diffAndEmit(patch, patch._state.data.data, newData, idField);
        }
        await patch.mounted();
      }
    } catch(e) {
      console.error(e);
      throw e; // Re-throw the error to let the test catch it
    }
  };

  function diffAndEmit(patch: any, oldData: any[], newData: any[], idField: string) {
    const oldDataMap = new Map(oldData.map(item => [item[idField], item]));
    const newDataMap = new Map(newData.map(item => [item[idField], item]));
    const isChanged = patch._state.isChanged;
 
    // Deletions
    for (const [id, oldItem] of oldDataMap.entries()) {
      if (!newDataMap.has(id)) {
        patch._state.data.delete(oldItem);
      }
    }
  
    // Additions and Updates
    for (const [id, newItem] of newDataMap.entries()) {
      const oldItem = oldDataMap.get(id);
      if (!oldItem) {
        patch._state.data.add(newItem);
      } else {
        if (isChanged(oldItem, newItem)) {
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