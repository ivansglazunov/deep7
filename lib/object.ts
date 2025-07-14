export function newObject(deep: any, DeepData: any) {
  const DeepObject = new DeepData((worker, source, target, stage, args, thisArg) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [input] = args;
        const _data = target.ref._data;
        if (!_data) throw new Error(`deep.Object.new:!.type.ref._data`);

        let id: string | undefined = undefined;
        let initial: Record<string, any> | undefined;

        if (typeof input === 'undefined') {
          id = deep.Deep.newId();
          _data.byId(id, {});
        } else if (typeof input === 'string' && deep.Deep._relations.all.has(input)) {
          id = input;
        } else if (typeof input === 'object' && !Array.isArray(input)) {
          initial = input;
          id = _data.byData(input);
          if (!id) {
            id = deep.Deep.newId();
            _data.byId(id, input);
          }
        } else {
          throw new Error(`deep.Object.new:!input`);
        }

        const data = target.new(id);

        if (initial) {
          for (const key of Object.keys(initial)) {
            const elDeep = deep.asDeep(initial[key]);
            if (elDeep) {
              deep.Deep.defineCollection(elDeep, data.id);
            }
          }
        }
        return data.proxy;
      }
      case deep.Deep._Inserted: {
        const [key, valueArg] = args;
        const element = deep.asDeep(valueArg);
        if (element) {
          element._deep.use(target, element._deep, deep.Deep._CollectionInserted, [target]);
          deep.Deep.defineCollection(element._deep, target.id);
        }
        return worker.super(source, target, stage, args, thisArg);
      }
      case deep.Deep._Deleted: {
        const [key, valueArg] = args;
        const elementDel = deep.asDeep(valueArg);
        if (elementDel) {
          elementDel._deep.use(target, elementDel._deep, deep.Deep._CollectionDeleted, [target]);
          deep.Deep.undefineCollection(elementDel._deep, target.id);
        }
        return worker.super(source, target, stage, args, thisArg);
      }
      case deep.Deep._Updated: {
        const [newValArg, path, newVal, oldVal] = args;
        const elementUpd = deep.asDeep(newValArg);
        const elementId = elementUpd ? elementUpd.id : newValArg;
        // Determine key under which element resides
        let keyName: string | undefined;
        const dataObj = target.proxy.data;
        if (dataObj && elementId != null) {
          for (const k of Object.keys(dataObj)) {
            const v = dataObj[k];
            if (v === elementId) { keyName = k; break; }
            const vDeep = deep.asDeep(v);
            if (vDeep && vDeep.id === elementId) { keyName = k; break; }
          }
        }
        const combinedPath = keyName !== undefined
          ? (Array.isArray(path) ? [keyName, ...path] : [keyName, path])
          : path;
        const targets = deep.Deep._targets[target.id];
        if (targets) {
          for (const id of targets) {
            const targetDeep = new deep.Deep(id);
            targetDeep.use(targetDeep, targetDeep, deep.Deep._SourceUpdated, [elementUpd || newValArg, combinedPath, newVal, oldVal]);
          }
        }
        return worker.super(source, target, stage, args, thisArg);
      }
      case deep.Deep._Destructor: {
        const data = target.proxy.data;
        if (data) {
          for (const k of Object.keys(data)) {
            const elDeep = deep.asDeep(data[k]);
            if (elDeep) deep.Deep.undefineCollection(elDeep, target.id);
          }
        }
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.Object.new:!.type.ref._data`);
        _data.byId(target.id, undefined);
        return;
      }
      default:
        return worker.super(source, target, stage, args, thisArg);
    }
  });

  return DeepObject;
}

export function newObjectGet(deep: any) {
  return deep.Function(function(this: any, key: string) {
    const data = this.data;
    if (typeof data !== 'object') throw new Error(`deep.Object.get:!data`);
    const value = data[key];
    const el = deep.asDeep(value);
    return el ? el.proxy : value;
  });
}

export function newObjectHas(deep: any) {
  return deep.Function(function(this: any, key: string) {
    const data = this.data;
    if (typeof data !== 'object') throw new Error(`deep.Object.has:!data`);
    return Object.prototype.hasOwnProperty.call(data, key);
  });
}

export function newObjectDelete(deep: any) {
  return deep.Function(function(this: any, key: string) {
    const data = this.data;
    if (typeof data !== 'object') throw new Error(`deep.Object.delete:!data`);
    if (!Object.prototype.hasOwnProperty.call(data, key)) return false;
    const oldValue = data[key];
    delete data[key];
    this._deep.use(this._deep, this._deep, deep.Deep._Deleted, [key, oldValue]);
    return true;
  });
}

export function newObjectSet(deep: any) {
  return deep.Function(function(this: any, key: string, value: any) {
    const data = this.data;
    if (typeof data !== 'object') throw new Error(`deep.Object.set:!data`);
    const oldValue = data[key];
    const oldElement = deep.asDeep(oldValue);
    const newElement = deep.asDeep(value);
    const isUpdate = Object.prototype.hasOwnProperty.call(data, key);

    data[key] = newElement ? newElement.id : value;

    if (oldElement) deep.Deep.undefineCollection(oldElement, this.id);
    if (newElement) deep.Deep.defineCollection(newElement, this.id);

    if (isUpdate) {
      this._deep.use(this._deep, this._deep, deep.Deep._Updated, [value, [key], value, oldValue]);
    } else {
      this._deep.use(this._deep, this._deep, deep.Deep._Inserted, [key, value]);
    }
    return this;
  });
}
