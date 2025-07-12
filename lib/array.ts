export function newArray(deep: any, DeepData: any) {
  const DeepArray = new DeepData((worker, source, target, stage, args, thisArg) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [input] = args;

        const _data = target.ref._data;
        if (!_data) throw new Error(`deep.Array.new:!.type.ref._data`);

        let id: string | undefined = undefined;
        let initialArray: any[] | undefined;

        if (typeof input == 'undefined') {
          id = deep.Deep.newId();
          _data.byId(id, []);
        } else if (typeof input == 'string' && deep.Deep._relations.all.has(input)) {
          id = input;
        } else if (Array.isArray(input)) {
          initialArray = input;
          id = _data.byData(input);
          if (!id) {
            id = deep.Deep.newId();
            _data.byId(id, input);
          }
        } else throw new Error(`deep.Array.new:!input`);

        const data = target.new(id);

        if (initialArray) {
          for (let i = 0; i < initialArray.length; i++) {
            const element = deep.asDeep(initialArray[i]);
            if (element) {
              deep.Deep.defineCollection(element, data.id);
            }
          }
        }

        return data.proxy;
      } case deep.Deep._Inserted: {
        const [index, elementArg] = args;
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
        const [index, elementArg] = args;
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
            targetDeep.use(targetDeep, targetDeep, deep.Deep._SourceDeleted, args);
          }
        }

        return worker.super(source, target, stage, args, thisArg);
      } case deep.Deep._Destructor: {
        const data = target.proxy.data;
        if (data) {
          for (let i = 0; i < data.length; i++) {
            const element = deep.asDeep(data[i]);
            if (element) {
              deep.Deep.undefineCollection(element, target.id);
            }
          }
        }
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.Array.new:!.type.ref._data`);
        _data.byId(target.id, undefined);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  return DeepArray;
}

export function newArrayPush(deep: any, DeepFunction: any) {
  return DeepFunction(function (this: any, ...values: any[]) {
    const data = this.data;
    if (!Array.isArray(data)) throw new Error(`deep.Array.push:!data`);

    const result = data.push(...values);
    this._deep.use(this._deep, this._deep, deep.Deep._Inserted, [data.length - 1, values[0]]);
    return result;
  });
}

export function newArrayAdd(deep: any, DeepFunction: any) {
  return DeepFunction(function (this: any, value: any) {
    const data = this.data;
    if (!Array.isArray(data)) throw new Error(`deep.Array.add:!data`);

    data.push(value);
    this._deep.use(this._deep, this._deep, deep.Deep._Inserted, [data.length - 1, value]);
    return this;
  });
}

export function newArrayHas(deep: any, DeepFunction: any) {
  return DeepFunction(function (this: any, value: any) {
    const data = this.data;
    if (!Array.isArray(data)) throw new Error(`deep.Array.has:!data`);
    return data.findIndex((el: any) => el === value) !== -1;
  });
}

export function newArrayDelete(deep: any, DeepFunction: any) {
  return DeepFunction(function (this: any, value: any) {
    const data = this.data;
    if (!Array.isArray(data)) throw new Error(`deep.Array.delete:!data`);

    const idx = data.findIndex((el: any) => el === value);
    if (idx !== -1) {
      data.splice(idx, 1);
      this._deep.use(this._deep, this._deep, deep.Deep._Deleted, [idx, value]);
      return true;
    }
    return false;
  });
}

export function newArraySet(deep: any, DeepFunction: any) {
  return DeepFunction(function (this: any, index: number, value: any) {
    const data = this.data;
    if (!Array.isArray(data)) throw new Error(`deep.Array.set:!data`);
    
    if (index < 0 || index >= data.length) {
      throw new Error(`deep.Array.set:index out of bounds: ${index}`);
    }
    
    const oldValue = data[index];
    const oldElement = deep.asDeep(oldValue);
    const newElement = deep.asDeep(value);
    
    data[index] = value;
    
    if (oldElement) {
      deep.Deep.undefineCollection(oldElement, this.id);
    }
    
    if (newElement) {
      deep.Deep.defineCollection(newElement, this.id);
    }
    
    this._deep.use(this._deep, this._deep, deep.Deep._Updated, [value, index, value, oldValue]);
    
    return this;
  });
}
