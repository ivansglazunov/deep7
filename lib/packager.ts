import Debug from './debug';
import jsan from 'jsan';
import isEqual from 'lodash/isEqual';

const debug = Debug('packager');

export type Deep = any;

export interface SerializedLink {
  id: string;
  _type?: string; // optional - can be NULL when id != _deep
  _from?: string;
  _to?: string;
  _value?: string;
  string?: string;
  number?: number;
  object?: any;
  function?: string;
  _created_at: number;
  _updated_at: number;
}

export interface SerializedPackage {
  package?: {
    name?: string;
    version?: string;
  };
  data?: SerializedLink[];
}

export class _Memory {
  value: string;
  constructor({ value }: { value?: any } = {}) {
    this.value = value;
  }
  save(object: SerializedPackage) {
    throw new Error('Not implemented');
  }
  load(): SerializedPackage {
    throw new Error('Not implemented');
  }
  subscribe(pckg: any, callback: (object: SerializedPackage) => void) {
    throw new Error('Not implemented');
  }
  upsert(link: SerializedLink) {
    throw new Error('Not implemented');
  }
  delete(link: SerializedLink) {
    throw new Error('Not implemented');
  }
}

export class _MemorySubscription extends _Memory {
  save(object: SerializedPackage) {
    debug('🔨 _MemorySubscription save', object);
    this.value = jsan.stringify(object);
    this.notify();
  }
  load() {
    debug('🔨 _MemorySubscription load');
    return this.value ? jsan.parse(this.value) : { data: [] };
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  notify() {
    debug('🔨 _MemorySubscription notify');
    for (const notify of this._notifies) notify(this.load());
  }
  subscribe(pckg: any, callback: (object: SerializedPackage) => void): () => void {
    debug('🔨 _MemorySubscription subscribe', callback);
    this._notifies.push(callback);
    const loaded = this.load();
    if (pckg) {
      if (loaded.package && loaded.package.name != pckg.name) {
        throw new Error(`Package mismatch: ${loaded.package.name} != ${pckg.name}`);
      } else {
        loaded.package = { ...pckg };
        this.save(loaded);
      }
    }
    callback(loaded);
    return () => {
      this._notifies = this._notifies.filter((notify) => notify !== callback);
    };
  }
  upsert(link: SerializedLink) {
    debug('🔨 _MemorySubscription upsert', link.id);
    const object = this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    this.save(object);
  }
  delete(link: SerializedLink) {
    debug('🔨 _MemorySubscription delete', link.id);
    const object = this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    this.save(object);
  }
}

export function newPackages(deep: Deep) {
  const Package = deep.Package = new deep.Lifecycle();

  const debug = Debug(`packager:${deep._id}`);

  Package.effect = function (lifestate, arg = []) {
    const pack = this;
    if (lifestate == deep.Constructed) {
      const name = arg[0];
      const version = arg[1] || '0.0.0';
      if (typeof name !== 'string') {
        throw new Error('Package name must be a string');
      }
      if (typeof version !== 'string') {
        throw new Error('Package version must be a string');
      }
      debug('🔨 Constructed deep.Package', 'name:', name, 'version:', version);
      pack.value = new deep.Object({
        name,
        version,
      });
      debug('🔨 Constructed deep.Package', name);
    } else if (lifestate == deep.Unmounting) {
      const _out = deep._From.many(pack._id);
      debug('🔨 Unmounting deep.Package', pack._id, 'out', _out.size);
      for (const _outId of _out) {
        const _type = deep._Type.one(_outId);
        if (_type == deep.Context._id) {
          const context = deep(_outId);
          debug(`🔨 Unmounting deep.Package context ${context?._id} (${context.data}) and its to ${context._to}`);
          context.to.destroy();
          context.destroy();
          break;
        }
      }
      pack.value = undefined;
    }
  };

  const Storage = deep.Storage = new deep.Lifecycle();

  // apply one delta from memory to deep
  // soft strategy
  Storage.delta = new deep.Method(function (this, delta: SerializedLink) {
    const storage = deep(this._source);
    const link = storage.deserialize(delta);
    debug('🔨 delta', link?._id);
  });

  const _serializeId = (id: string, initialId = id, path = '') => {
    debug('🔨 _serializeId', id, path);
    const link = deep(id);
    const _in = deep._To.many(link._id);
    let context;
    for (const _inId of _in) {
      const _type = deep._Type.one(_inId);
      if (_type == deep.Context._id) {
        context = deep(_inId);
        debug('🔨 _serializeId context founded', context?._id, 'in', _in.size);
        break;
      }
    }
    if (!context) {
      if (!path) {
        if (id == deep._id) {
          debug('🔨 _serializeId !context !path root', link._type, link._id);
          return '/';
        } else if (link._type == deep.Package._id) {
          debug('🔨 _serializeId !context !path package', link._id);
          return link.data.name;
        } else {
          debug('🔨 _serializeId !context !path root not found', link._type, link._id);
          return initialId;
        }
      } else {
        if (id == deep._id) {
          debug('🔨 _serializeId !context path root', link._type, link._id);
          return '/' + path;
        } else if (link._type == deep.Package._id) {
          debug('🔨 _serializeId !context path package', link._id);
          return link.data.name + '/' + path;
        } else {
          debug('🔨 _serializeId !context path root not found', link._type, link._id);
          return initialId;
        }
      }
    } else {
      debug('🔨 _serializeId context path', context._from, path);
      const nextPath = [context.data];
      if (path) nextPath.push(path);
      if (context._from == deep._id) {
        debug('🔨 _serializeId context path root', context._from, nextPath.join('/'));
        return '/' + nextPath.join('/');
      }
      // const pckg = deep(context._from);
      // if (pckg._type == Package._id) return pckg.data.name+'/'+nextPath.join('/');
      debug('🔨 _serializeId context path', context._from, nextPath.join('/'));
      return _serializeId(context._from, initialId, nextPath.join('/'));
    }
  }

  Storage.serializeId = new deep.Method(function (this, id: string) {
    const _id = _serializeId(id);
    debug('🔨 serializeId', id, '=>', _id, `${_id == id ? 'path by context not found' : 'path by context found'}`);
    return _id;
  });

  const _findPackageByName = (name: string) => {
    const packages = Package.typed.data;
    let founded;
    for (const pckgId of packages) {
      const pckg = deep(pckgId);
      if (pckg.value.data.name == name) {
        founded = pckg;
        break;
      }
    }
    debug('🔨 _findPackageByName', name, '=>', founded?._id, 'in', packages.size);
    return founded;
  }

  // / => deep._id
  // /test => deep.test._id
  // abc => (package with name abc)._id
  // abc/test => (package with name abc).test._id
  // not/founded => not/founded
  // uuid => uuid
  const _deserializeId = (path: string): string | undefined => {
    debug('🔨 _deserializeId', path);
    if (path == '/') return deep._id;
    const parts = path.split('/');
    let pointer;
    for (const part of parts) {
      if (!pointer && part == '') {
        pointer = deep;
        continue;
      }
      if (!pointer) {
        const pckg = _findPackageByName(part);
        if (!pckg) return undefined;
        pointer = pckg;
      } else {
        pointer = pointer?._context?.[part];
      }
      if (!pointer) return undefined;
    }
    return pointer?._id;
  }

  Storage.deserializeId = new deep.Method(function (this, path: string) {
    const _id = _deserializeId(path);
    debug('🔨 deserializeId', path, '=>', _id);
    const result = _id || path;
    return result;
  });

  Storage.deserialize = new deep.Method(function (this, _link: SerializedLink) {
    debug('🔨 storage.deserialize', _link);
    const storage = deep(this._source);
    const pckg = storage.package;
    
    const linkId = storage.deserializeId(_link.id);
    let link;
    if (!!pckg) {
      debug('🔨 storage.deserialize pckg', pckg._id);
      const split = _link.id.split('/');

      // check package name and package existence
      debug(`🔨 storage.deserialize pckg split`, split);
      if (split.length != 2) {
        storage.state._errors.push(`[soft] Failed to resolve dependencies for link ${_link.id}`);
        return;
      } else {
        if (split[0] != pckg.data.name) {
          storage.state._errors.push(`[soft] Failed to resolve package ${split[0]} for link ${_link.id}`);
          return;
        }
      }

      // restore exists link already created in contexts
      if (linkId == _link.id) {
        link = deep(); // create new link if not exists
        debug('🔨 deserialize', _link.id, '=>', link._id, 'in context', pckg._id, `(${split[0]}) as ${split[1]}`);
        const context = new deep.Context();
        context._from = pckg._id;
        context._to = link._id;
        context.value = new deep.String(split[1]);
        // pckg._context[split[1]] = link;
      } else {
        link = deep(linkId); // use exists link
        if (pckg?._context?.[split[1]]) {
          debug(`🔨 storage.deserialize pckg context ${split[1]} already exists`, pckg?._context?.[split[1]]._id);
        }
      }
    } else {
      link = deep(linkId);
      debug('🔨 storage.deserialize no pckg', linkId);
    }

    const type = _link._type ? storage.deserializeId(_link._type) : undefined;
    const from = _link._from ? storage.deserializeId(_link._from) : undefined;
    const to = _link._to ? storage.deserializeId(_link._to) : undefined;
    const value = _link._value ? storage.deserializeId(_link._value) : undefined;

    if (link._type != type) link._type = type;
    if (link._from != from) link._from = from;
    if (link._to != to) link._to = to;
    if (link._value != value) link._value = value;

    if (link._type == deep.String._id && link._data != _link.string) link._data = _link.string;
    if (link._type == deep.Number._id && link._data != _link.number) link._data = _link.number;
    if (link._type == deep.Function._id && link._data.toString() != _link.function) link._data = eval(_link.function as string);
    if (link._type == deep.Object._id && !isEqual(link._data, _link.object)) link._data = _link.object;

    if (!link._created_at) link._created_at = _link._created_at;
    if (link._updated_at != _link._updated_at) link._updated_at = _link._updated_at;

    debug('🔨 deserialized', link._plain);
    return link;
  });

  Storage.serialize = new deep.Method(function (this, link: Deep) {
    debug('🔨 serialize', link._plain);
    const storage = deep(this._source);

    const result: SerializedLink = {
      id: storage.serializeId(link._id),
      _created_at: link._created_at,
      _updated_at: link._updated_at,
    };

    if (link._type) result._type = storage.serializeId(link._type);
    if (link._from) result._from = storage.serializeId(link._from);
    if (link._to) result._to = storage.serializeId(link._to);
    if (link._value) result._value = storage.serializeId(link._value);

    if (link._type == deep.String._id) result.string = link._data;
    if (link._type == deep.Number._id) result.number = link._data;
    if (link._type == deep.Function._id) result.function = link._data.toString();
    if (link._type == deep.Object._id) result.object = link._data;

    debug('🔨 serialized', result);
    return result;
  });

  const _checkAvailabilityToDelta = (storage, _link: SerializedLink): boolean => {
    if (_link._type) {
      const typeId = storage.deserializeId(_link._type);
      if (!deep._ids.has(typeId)) return false;
    }
    if (_link._from) {
      const fromId = storage.deserializeId(_link._from);
      if (!deep._ids.has(fromId)) return false;
    }
    if (_link._to) {
      const toId = storage.deserializeId(_link._to);
      if (!deep._ids.has(toId)) return false;
    }
    if (_link._value) {
      const valueId = storage.deserializeId(_link._value);
      if (!deep._ids.has(valueId)) return false;
    }
    return true;
  }

  Storage.patch = new deep.Method(function (this, patch: SerializedPackage) {
    const storage = deep(this._source);
    debug('🔨 patch', patch?.data?.length);
    storage.state._errors = [];

    const prevIds: string[] = storage.state._prevIds = storage.state._prevIds || [];
    const nextIds = new Set<string>();
    const waitingList: SerializedLink[] = [];

    if (patch?.data?.length) {
      // prepare order
      // based on mode throw or not errors based on prepared exists links

      for (const _link of patch.data) {
        if (_checkAvailabilityToDelta(storage, _link)) {
          nextIds.add(_link.id);
          storage.delta(_link);
        } else {
          waitingList.push(_link);
        }
      }

      let wasProductive = true;
      while (waitingList.length > 0 && wasProductive) {
        wasProductive = false;
        const remaining = [...waitingList];
        waitingList.length = 0; // clear
        for (const _link of remaining) {
          if (_checkAvailabilityToDelta(storage, _link)) {
            nextIds.add(_link.id);
            storage.delta(_link);
            wasProductive = true;
          } else {
            waitingList.push(_link);
          }
        }
      }

      if (waitingList.length > 0) {
        if (storage.state._mode == 'strict') {
          for (const _link of waitingList) {
            storage.state._errors.push(`[strict] Failed to resolve dependencies for link ${_link.id}`);
          }
          debug('🔨 patch failed to resolve all dependencies', waitingList);
          return;
        } else {
          for (const _link of waitingList) {
            nextIds.add(_link.id);
            storage.delta(_link);
          }
        }
      }
    }

    for (const prevId of prevIds) {
      if (!nextIds.has(prevId)) {
        const link = deep(prevId);
        if (link) link.destroy();
      }
    }
    storage.state._prevIds = Array.from(nextIds);
  });

  Storage.serializePackage = new deep.Method(function (this) {
    const storage = new deep(this._source);
    debug('🔨 serializePackage', storage.state._package?._id, storage.state._package?.data);
    if (!storage.state._package) return undefined;
    return storage.state._package.data;
  });

  Storage.package = new deep.Field(function (this) {
    const storage = new deep(this._source);
    return storage.state._package;
  });

  Storage.deserializePackage = new deep.Method(function (this, pckg): Deep {
    const storage = new deep(this._source);
    if (!pckg) return;
    const pckgId = _findPackageByName(pckg.name);
    if (pckgId) return deep(pckgId);
    else {
      const pack = new deep.Package(pckg.name, pckg.version);
      debug('🔨 deserializePackage', pack._id, pack.data);
      storage.state._package = pack;
      return pack;
    }
  });

  Storage.processMemory = new deep.Method(function (this, memory: _MemorySubscription) {
    const storage = new deep(this._source);
    if (!((memory as any) instanceof _Memory)) throw new Error('Memory must be an instance of _MemorySubscription');
    storage.state._memory = memory;
  });

  Storage.processQuery = new deep.Method(function (this, query: any) {
    const storage = new deep(this._source);
    if (query) {
      if ((!(query instanceof deep.Deep) || !query.type.is(deep.Set))) throw new Error('Query must be an instance of deep.Set as result of deep.query');
      storage.state._query = query;
      debug('🔨 Query strategy used');
    }
  });

  Storage.processSubscribe = new deep.Method(function (this, subscribe: boolean) {
    const storage = new deep(this._source);
    storage.state._subscribe = subscribe;
  });

  Storage.processPackage = new deep.Method(function (this, pckg: any) {
    const storage = new deep(this._source);
    if (pckg) {
      if ((!(pckg instanceof deep.Deep) || !pckg.type.is(deep.Package))) throw new Error('Package must be an instance of deep.Package');
      if (storage.state._query) throw new Error('Query and package cannot be used together');
      storage.state._package = pckg;
      storage.state._query = deep.query({
        in: { // only if link has context
          type: deep.Context,
          from: pckg, // inside package
          value: { // only if context has string name
            type: deep.String,
          },
        }
      });
      debug('🔨 Package strategy used');
    }
  });

  Storage.processMode = new deep.Method(function (this, mode: string = 'soft') {
    const storage = new deep(this._source);
    storage.state._mode = mode;
    debug('🔨 processMode', mode);
  });

  Storage.processUtilization = new deep.Method(function (this) {
    const storage = new deep(this._source);
    debug('🔨 processUtilization');
    if (storage.package) {
      storage.package.unmount();
    }
  });

  Storage.onQuery = new deep.Method(function (this) {
    const storage = new deep(this._source);
    if (storage.state._query) {
      debug('🔨 onQuery');
      for (const link of storage.state._query) {
        debug('🔨 onQuery already link', link._id);
        if (storage.state._onUpsert) storage.state._onUpsert(storage.serialize(link));
      }
      storage.state._watchQuery_handler = (link: Deep) => {
        debug('🔨 onQuery watchQuery_handler', link._id);
        if (storage.state._onUpsert) storage.state._onUpsert(storage.serialize(link));
      };
      storage.state._query.on(deep.events.dataAdd, (link: Deep) => {
        debug('🔨 onQuery dataAdd', link._id);
        storage.state._onUpsert(storage.serialize(link));
        link.on(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      });
      storage.state._query.on(deep.events.dataDelete, (link: Deep) => {
        debug('🔨 onQuery dataDelete', link._id);
        storage.state._onDelete(storage.serialize(link));
        link.off(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      });
    }
  });

  Storage.offQuery = new deep.Method(function (this) {
    const storage = new deep(this._source);
    if (storage.state._query && storage.state._watchQuery_handler) {
      debug('🔨 offQuery');
      for (const link of storage.state._query) {
        debug('🔨 offQuery link', link._id);
        link.on(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      }
    }
  });

  Storage.onUpsert = new deep.Method(function (this, onUpsert: (link: Deep) => void) {
    const storage = new deep(this._source);
    if (typeof onUpsert !== 'function') throw new Error('onUpsert must be a function');
    storage.state._onUpsert = onUpsert;
    debug('🔨 onUpsert registered', onUpsert);
  });

  Storage.onDelete = new deep.Method(function (this, onDelete: (link: Deep) => void) {
    const storage = new deep(this._source);
    if (typeof onDelete !== 'function') throw new Error('onDelete must be a function');
    storage.state._onDelete = onDelete;
    debug('🔨 onDelete registered', onDelete);
  });

  Storage.onLoad = new deep.Method(function (this, onLoad: () => SerializedPackage) {
    const storage = new deep(this._source);
    if (typeof onLoad !== 'function') throw new Error('onLoad must be a function');
    storage.state._onLoad = onLoad;
    debug('🔨 onLoad registered', onLoad);
  });

  Storage.load = new deep.Method(function (this) {
    const storage = new deep(this._source);
    const result = storage.state._onLoad();
    debug('🔨 load result', result);
    return result;
  });

  // state
  // ._memory _Memory
  const Memory = deep.Storage.Memory = new deep.Storage();
  Memory.effect = function (lifestate, args: [{
    mode?: string;
    memory?: _MemorySubscription;
    query?: any;
    subscribe?: boolean;
    package?: any;
  }] = [{}]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      debug('🔨 Constructed deep.Storage.Memory', storage._id, 'in deep', deep._id);
      if (typeof args[0] != 'object') throw new Error('Memory must be an plain options object');

      const {
        mode = 'soft',
        memory = new _MemorySubscription(),
        query,
        subscribe = true,
        package: pckg,
      } = args[0];

      storage.processMode(mode);
      storage.processMemory(memory);
      storage.processQuery(query);
      storage.processSubscribe(subscribe);
      storage.processPackage(pckg);

      storage.onUpsert((link) => {
        memory.upsert(link);
      });
      storage.onDelete((link) => {
        memory.delete(link);
      });

      storage.onLoad(() => memory.load());
    } else if (lifestate == deep.Mounting) {
      debug('🔨 Mounting deep.Storage.Memory', storage._id, 'in deep', deep._id);

      if (storage.state._subscribe) {
        storage.state._memory_unsubscribe = storage.state._memory.subscribe(storage.serializePackage(), (object) => {
          debug('🔨 deep.Storage.Memory subscribe object', object);
          storage.deserializePackage(object.package);
          storage.patch(object);
        });
      } else {
        const object = storage.state._memory.load();
        debug('🔨 deep.Storage.Memory load object', object);
        storage.deserializePackage(object.package);
        storage.patch(object);
      }

      storage.onQuery();

      if (!storage?.state?._errors?.length) storage.mounted();
      else storage.unmount();

    } else if (lifestate == deep.Mounted) {
      debug('🔨 Mounted deep.Storage.Memory', storage._id, 'in deep', deep._id);

    } else if (lifestate == deep.Unmounting) {
      debug('🔨 Unmounting deep.Storage.Memory', storage._id, 'in deep', deep._id);
      if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();

      storage.offQuery();
      storage.processUtilization();

      storage.unmounted();

    } else if (lifestate == deep.Unmounted) {
      debug('🔨 Unmounted deep.Storage.Memory', storage._id, 'in deep', deep._id);
    } else if (lifestate == deep.Destroyed) {
      debug('🔨 Destroyed deep.Storage.Memory', storage._id, 'in deep', deep._id);
      storage.processUtilization();
    }
  };
}
