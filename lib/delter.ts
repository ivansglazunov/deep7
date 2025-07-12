export function newDelter(deep: any) {
  
  interface Delta {
    id: string;
    type: 'add' | 'delete' | 'update';
    payload: any;
  }

  const getDelta = (event: string, args: any[]): Delta => {
    const id = deep.Deep.newId();
    
    if (event === deep.Deep._Inserted) {
      return {
        id,
        type: 'add',
        payload: {
          index: args[0],
          value: args[1]
        }
      };
    } else if (event === deep.Deep._Deleted) {
      return {
        id,
        type: 'delete', 
        payload: {
          index: args[0],
          value: args[1]
        }
      };
    } else if (event === deep.Deep._Updated) {
      // For array updates, args is [index, field, newValue, oldValue]
      // For object updates, args is [target, field, newValue, oldValue]
      const isArrayUpdate = typeof args[0] === 'number';
      
      if (isArrayUpdate) {
        return {
          id,
          type: 'update',
          payload: {
            index: args[0],
            field: args[1],
            newValue: args[2],
            oldValue: args[3]
          }
        };
      } else {
        // Handle object updates
        return {
          id,
          type: 'update',
          payload: {
            target: args[0],
            field: args[1],
            newValue: args[2],
            oldValue: args[3]
          }
        };
      }
    } else {
      throw new Error(`Unsupported event type for getDelta: ${event}`);
    }
  };

  const setDelta = (instance: any, delta: Delta) => {
    if (delta.type === 'add') {
      if (instance.data && Array.isArray(instance.data)) {
        instance.push(delta.payload.value);
      } else if (instance.add) {
        instance.add(delta.payload.value);
      }
    } else if (delta.type === 'delete') {
      if (instance.delete) {
        instance.delete(delta.payload.value);
      }
    } else if (delta.type === 'update') {
      // For array updates, the payload will have target, field, newValue, oldValue
      // where field is the index
      if (delta.payload.field !== undefined && instance.set) {
        // If we have a field and the instance has a set method, use it
        instance.set(delta.payload.field, delta.payload.newValue);
      } 
      // Handle the case where we have an index (for backward compatibility)
      else if (typeof delta.payload.index === 'number' && instance.data && Array.isArray(instance.data)) {
        if (delta.payload.field === undefined) {
          // Replace the whole element
          instance.set(delta.payload.index, delta.payload.newValue);
        } else {
          // Update a property of the element
          const element = instance.data[delta.payload.index];
          if (element && typeof element === 'object') {
            if (element.set) {
              element.set(delta.payload.field, delta.payload.newValue);
            } else {
              element[delta.payload.field] = delta.payload.newValue;
            }
          }
        }
      } 
      // Handle object property updates (for non-array objects)
      else if (delta.payload.target !== undefined) {
        if (instance.set) {
          instance.set(delta.payload.target, delta.payload.field, delta.payload.newValue);
        } else if (instance.data && typeof instance.data === 'object') {
          instance.data[delta.payload.field] = delta.payload.newValue;
        }
      }
    } else {
      throw new Error(`Unsupported delta type: ${delta.type}`);
    }
  };

  const Delter = deep((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [watchedInstance] = args;
        
        if (!watchedInstance) {
          throw new Error('Delter constructor requires a deep instance to watch.');
        }

        const delter = target.new();
        
        const deltaArray = new deep.Array();
        delter.ref._deltas = deltaArray;
        
        delter.proxy.value = watchedInstance;
        
        return delter.proxy;
      }
      
      case deep.Deep._Getter: {
        const [key] = args;
        if (key === 'data') {
          return target.ref._deltas?.data;
        }
        return worker.super(source, target, stage, args);
      }
      
      case deep.Deep._Inserted:
      case deep.Deep._Deleted: 
      case deep.Deep._Updated: {
        if (target.proxy.value?.id) {
          const delta = getDelta(stage, args);
          target.ref._deltas?.add(delta);
        }
        
        return worker.super(source, target, stage, args);
      }
      
      case deep.Deep._Destructor: {
        if (target.ref._deltas) {
          target.ref._deltas.destroy();
          delete target.ref._deltas;
        }
        return worker.super(source, target, stage, args);
      }
      
      default: 
        return worker.super(source, target, stage, args);
    }
  });

  const DelterGetDelta = new deep.Function(function(event: string, args: any[]) {
    return getDelta(event, args);
  });

  const DelterSetDelta = new deep.Function(function(this: any, delta: Delta) {
    return setDelta(this, delta);
  });

  const DelterDeltas = new deep.Field(function (worker, source, target, stage, args) {
    switch (stage) {
      case deep.Deep._FieldGetter: {
        return target.ref._deltas;
      } default: return worker.super(source, target, stage, args);
    }
  });

  new deep.Inherit(deep, 'Delter', Delter);
  new deep.Inherit(deep, 'getDelta', DelterGetDelta);
  new deep.Inherit(deep, 'setDelta', DelterSetDelta);
  new deep.Inherit(Delter, 'deltas', DelterDeltas);
} 