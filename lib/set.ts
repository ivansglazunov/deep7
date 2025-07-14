export function newSet(deep: any, DeepData: any) {
  const DeepSet = new DeepData((worker, source, target, stage, args, thisArg) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [input] = args;
        const _data = target.ref._data;
        if (!_data) throw new Error(`deep.Set.new:!.type.ref._data`);

        let id: string | undefined = undefined;
        let initialSet: Set<any> | undefined;

        if (typeof input == 'undefined') {
          id = deep.Deep.newId();
          _data.byId(id, new Set());
        } else if (typeof input == 'string' && deep.Deep._relations.all.has(input)) {
          id = input;
        } else if (input instanceof Set) {
          initialSet = input;
          id = _data.byData(input);
          if (!id) {
            id = deep.Deep.newId();
            _data.byId(id, input);
          }
        } else throw new Error(`deep.Set.new:!input`);

        const data = target.new(id);

        if (initialSet) {
          for (const element of initialSet) {
            const deepElement = deep.asDeep(element);
            if (deepElement) {
              deep.Deep.defineCollection(deepElement, data.id);
            }
          }
        }

        return data.proxy;
      } case deep.Deep._Inserted: {
        const [elementArg] = args;
        const element = deep.asDeep(elementArg);

        if (element) {
          element._deep.use(target, element._deep, deep.Deep._CollectionInserted, [target]);
          deep.Deep.defineCollection(element._deep, target.id);
        }

        const targets = deep.Deep._targets[target.id];
        if (targets) {
          for (const id of targets) {
            const targetDeep = new deep.Deep(id);
            targetDeep.use(targetDeep, targetDeep, deep.Deep._SourceInserted, args);
          }
        }

        return worker.super(source, target, stage, args, thisArg);
      } case deep.Deep._Deleted: {
        const [elementArg] = args;
        const elementDel = deep.asDeep(elementArg);
        const elementId = elementDel ? elementDel.id : elementArg;

        if (elementDel) {
          elementDel._deep.use(target, elementDel._deep, deep.Deep._CollectionDeleted, [target]);
          deep.Deep.undefineCollection(elementDel._deep, target.id);
        }

        const targets = deep.Deep._targets[target.id];
        if (targets) {
          for (const id of targets) {
            const targetDeep = new deep.Deep(id);
            targetDeep.use(targetDeep, targetDeep, deep.Deep._SourceDeleted, [elementArg]);
          }
        }

        return worker.super(source, target, stage, args, thisArg);
      } case deep.Deep._Updated: {
        const [newValue, key, newVal, oldVal] = args;
        const elementUpd = deep.asDeep(newValue);
        const elementId = elementUpd ? elementUpd.id : newValue;

        const targets = deep.Deep._targets[target.id];
        if (targets) {
          for (const id of targets) {
            const targetDeep = new deep.Deep(id);
            targetDeep.use(targetDeep, targetDeep, deep.Deep._SourceUpdated, [elementUpd || newValue, key, newVal, oldVal]);
          }
        }
        return worker.super(source, target, stage, args, thisArg);
      } case deep.Deep._Destructor: {
        const data = target.proxy.data;
        if (data) {
          for (const element of data) {
            const deepElement = deep.asDeep(element);
            if (deepElement) {
              deep.Deep.undefineCollection(deepElement, target.id);
            }
          }
        }
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.Set.new:!.type.ref._data`);
        _data.byId(target.id, undefined);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  return DeepSet;
}

export function newSetAdd(deep: any) {
  return deep.Function(function (this: any, value: any) {
    const data = this.data;
    if (!(data instanceof Set)) throw new Error(`deep.Set.add:!data`);

    const el = deep.asDeep(value);
    const id_to_add = el ? el.id : value;

    if (!data.has(id_to_add)) {
      data.add(id_to_add);
      this._deep.use(this._deep, this._deep, deep.Deep._Inserted, [value, value]);
    }

    return this;
  });
}

export function newSetHas(deep: any) {
  return deep.Function(function (this: any, value: any) {
    const data = this.data;
    if (!(data instanceof Set)) throw new Error(`deep.Set.has:!data`);
    
    const el = deep.asDeep(value);
    const id_to_check = el ? el.id : value;
    
    return data.has(id_to_check);
  });
}

export function newSetDelete(deep: any) {
  return deep.Function(function (this: any, value: any) {
    const data = this.data;
    if (!(data instanceof Set)) throw new Error(`deep.Set.delete:!data`);
    
    const el = deep.asDeep(value);
    const id_to_delete = el ? el.id : value;
    
    if (data.has(id_to_delete)) {
      data.delete(id_to_delete);
      this._deep.use(this._deep, this._deep, deep.Deep._Deleted, [value, value]);
      return true;
    }
    
    return false;
  });
}

export function newSetSet(deep: any) {
  return deep.Function(function (this: any, oldValue: any, newValue: any) {
    const data = this.data;
    if (!(data instanceof Set)) throw new Error(`deep.Set.set:!data`);
    
    const oldElement = deep.asDeep(oldValue);
    const oldId = oldElement ? oldElement.id : oldValue;
    
    if (!data.has(oldId)) {
      return false;
    }
    
    const newElement = deep.asDeep(newValue);
    const newId = newElement ? newElement.id : newValue;
    
    // Remove old value
    data.delete(oldId);
    if (oldElement) {
      deep.Deep.undefineCollection(oldElement, this.id);
    }
    
    // Add new value
    data.add(newId);
    if (newElement) {
      deep.Deep.defineCollection(newElement, this.id);
    }
    
    this._deep.use(this._deep, this._deep, deep.Deep._Updated, [newValue, [], newValue, oldValue]);
    
    return true;
  });
}
