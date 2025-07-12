export function newPatcher(deep: any) {

  function diffAndEmit(patcher: any, oldData: any[], newData: any[], idField: string = 'id') {
    const oldDataMap = new Map(oldData.map(item => [item[idField], item]));
    const newDataMap = new Map(newData.map(item => [item[idField], item]));
    const isChanged = patcher.ref._isChanged || ((oldItem: any, newItem: any) => {
      return JSON.stringify(oldItem) !== JSON.stringify(newItem);
    });

    const resultArray = patcher.value;

    for (const [id, oldItem] of oldDataMap.entries()) {
      if (!newDataMap.has(id)) {
        resultArray.delete(oldItem);
      }
    }

    for (const [id, newItem] of newDataMap.entries()) {
      const oldItem = oldDataMap.get(id);
      if (!oldItem) {
        resultArray.add(newItem);
      } else {
        if (isChanged(oldItem, newItem)) {
          const targetArray = resultArray.data;
          const indexToUpdate = targetArray.findIndex(item => item[idField] === id);
          if (indexToUpdate > -1) {
            targetArray[indexToUpdate] = newItem;
            resultArray._deep.use(resultArray._deep, resultArray._deep, deep.Deep._Updated, [newItem, idField, newItem, oldItem]);
          }
        }
      }
    }
  }

  const Patcher = deep((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [initialData, options = {}] = args;
        
        const patcher = target.new();
        
        let resultArray;
        if (initialData instanceof deep.Deep && initialData.type_id === deep.Array.id) {
          resultArray = initialData;
        } else if (Array.isArray(initialData)) {
          resultArray = new deep.Array([...initialData]);
        } else if (initialData === undefined) {
          resultArray = new deep.Array();
        } else {
          throw new Error('Patcher constructor expects initial data to be undefined, Array, or deep.Array');
        }
        
        patcher.proxy.value = resultArray;
        
        patcher.ref._idField = options.idField || 'id';
        patcher.ref._isChanged = options.isChanged;
        
        return patcher.proxy;
      }
      
      default: 
        return worker.super(source, target, stage, args);
    }
  });

  const PatcherPatch = new deep.Function(function(this: any, newData: any[]) {
    if (!Array.isArray(newData)) {
      throw new Error('Patcher.patch() expects an array');
    }
    
    const currentData = this.value.data || [];
    const idField = this.ref._idField || 'id';
    
    diffAndEmit(this, currentData, newData, idField);
    
    return this;
  });

  new deep.Inherit(deep, 'Patcher', Patcher);
  new deep.Inherit(Patcher, 'patch', PatcherPatch);
} 