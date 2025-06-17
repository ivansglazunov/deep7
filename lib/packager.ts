import Debug from './debug';
import jsan from 'jsan';
import isEqual from 'lodash/isEqual';

const debug = Debug('packager');

export type Deep = any;

export interface PackageStorageLink {
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

export interface PackageStorage {
  package?: {
    name?: string;
    version?: string;
  };
  data?: PackageStorageLink[];
}

export class _Memory {
  value: string;
  constructor({ value }: { value?: any } = {}) {
    this.value = value;
  }
  save(object: PackageStorage) {
    throw new Error('Not implemented');
  }
  load(): PackageStorage {
    throw new Error('Not implemented');
  }
  subscribe(pckg: any, callback: (object: PackageStorage) => void) {
    throw new Error('Not implemented');
  }
  upsert(link: PackageStorageLink) {
    throw new Error('Not implemented');
  }
  delete(link: PackageStorageLink) {
    throw new Error('Not implemented');
  }
}

export class _MemorySubscription extends _Memory {
  save(object: PackageStorage) {
    debug('🔨 _MemorySubscription save', object);
    this.value = jsan.stringify(object);
    this.notify();
  }
  load() {
    debug('🔨 _MemorySubscription load');
    return this.value ? jsan.parse(this.value) : { data: [] };
  }
  _notifies: ((object: PackageStorage) => void)[] = [];
  notify() {
    debug('🔨 _MemorySubscription notify');
    for (const notify of this._notifies) notify(this.load());
  }
  subscribe(pckg: any, callback: (object: PackageStorage) => void): () => void {
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
  upsert(link: PackageStorageLink) {
    debug('🔨 _MemorySubscription upsert', link.id);
    const object = this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    this.save(object);
  }
  delete(link: PackageStorageLink) {
    debug('🔨 _MemorySubscription delete', link.id);
    const object = this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    this.save(object);
  }
}

export function newPackages(deep: Deep) {
  const Package = deep.Package = new deep.Lifecycle()
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
    } else {
    }
  };

  const Storage = deep.Storage = new deep.Lifecycle();

  Storage.delta = new deep.Method(function(this, delta: PackageStorageLink) {
    const storage = deep(this._source);
    const memory = storage.state._memory;
    const link = dematerialize(delta);
    debug('🔨 delta', link._id);
  });

  Storage.patch = new deep.Method(function(this, patch: PackageStorage) {
    const storage = deep(this._source);
    debug('🔨 patch', patch?.data?.length);
    const prevIds: string[] = storage.state._prevIds = storage.state._prevIds || [];
    const nextIds = new Set<string>();
    if (patch?.data?.length) {
      for (const _link of patch.data) {
        nextIds.add(_link.id);
        storage.delta(_link);
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

  const _materializeId = (id: string, initialId = id, path = '') => {
    debug('🔨 _materializeId', id, path);
    const link = deep(id);
    const contexts = deep.query({ type: deep.Context, to: link });
    const context = contexts.first;
    debug('🔨 _materializeId context', context?._id, 'in', contexts.size);
    if (!context) {
      if (!path) {
        if (id == deep._id) {
          debug('🔨 _materializeId !context !path root', link._type, link._id);
          return '/';
        } else if (link._type == deep.Package._id) {
          debug('🔨 _materializeId !context !path package', link._id);
          return link.data.name;
        } else {
          debug('🔨 _materializeId !context !path root not found', link._type, link._id);
          return initialId;
        }
      } else {
        if (id == deep._id) {
          debug('🔨 _materializeId !context path root', link._type, link._id);
          return '/'+path;
        } else if (link._type == deep.Package._id) {
          debug('🔨 _materializeId !context path package', link._id);
          return link.data.name+'/'+path;
        } else {
          debug('🔨 _materializeId !context path root not found', link._type, link._id);
          return initialId;
        }
      }
    } else {
      debug('🔨 _materializeId context path', context._from, path);
      const nextPath = [context.data];
      if (path) nextPath.push(path);
      if (context._from == deep._id) {
        debug('🔨 _materializeId context path root', context._from, nextPath.join('/'));
        return '/'+nextPath.join('/');
      }
      // const pckg = deep(context._from);
      // if (pckg._type == Package._id) return pckg.data.name+'/'+nextPath.join('/');
      debug('🔨 _materializeId context path', context._from, nextPath.join('/'));
      return _materializeId(context._from, initialId, nextPath.join('/'));
    }
  }

  const materializeId = Storage.materializeId = new deep.Method(function(this, id: string) {
    const _id = _materializeId(id);
    debug('🔨 materializeId', id, '=>', _id);
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

  const _dematerializeId = (path: string) => {
    debug('🔨 _dematerializeId', path);
    if (path == '/') return deep._id;
    const parts = path.split('/');
    let pointer;
    for (const part of parts) {
      if (!pointer && part == '') pointer = deep;
      else {
        if (!pointer) {
          const pckg = _findPackageByName(part);
          if (!pckg) return undefined;
          pointer = pckg;
        } else {
          pointer = pointer[part];
        }
        if (!pointer) return undefined;
      }
    }
    return pointer?._id;
  }

  const dematerializeId = Storage.dematerializeId = new deep.Method(function(this, id: string) {
    const _id = _dematerializeId(id);
    debug('🔨 dematerializeId', id, '=>', _id);
    const result = _id || id;
    return result;
  });

  const materialize = Storage.materialize = new deep.Method(function(this, link: Deep) {
    debug('🔨 materialize', link._plain);
    const source = deep(this._source);

    const result: PackageStorageLink = {
      id: materializeId(link._id),
      _created_at: link._created_at,
      _updated_at: link._updated_at,
    };

    if (link._type) result._type = materializeId(link._type);
    if (link._from) result._from = materializeId(link._from);
    if (link._to) result._to = materializeId(link._to);
    if (link._value) result._value = materializeId(link._value);

    if (link._type == deep.String._id) result.string = link._data;
    if (link._type == deep.Number._id) result.number = link._data;
    if (link._type == deep.Function._id) result.function = link._data.toString();
    if (link._type == deep.Object._id) result.object = link._data;

    debug('🔨 materialized', result);
    return result;
  });

  const dematerialize = Storage.dematerialize = new deep.Method(function(this, _link: PackageStorageLink) {
    debug('🔨 dematerialize', _link);
    const source = deep(this._source);

    const link = deep(dematerializeId(_link.id));

    const type = _link._type ? dematerializeId(_link._type) : undefined;
    const from = _link._from ? dematerializeId(_link._from) : undefined;
    const to = _link._to ? dematerializeId(_link._to) : undefined;
    const value = _link._value ? dematerializeId(_link._value) : undefined;

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

    debug('🔨 dematerialized', link._plain);
    return link;
  });

  Storage.processMemory = new deep.Method(function(this, memory: _MemorySubscription) {
    const storage = new deep(this._source);
    if (!((memory as any) instanceof _Memory)) throw new Error('Memory must be an instance of _MemorySubscription');
    storage.state._memory = memory;
  });

  Storage.processQuery = new deep.Method(function(this, query: any) {
    const storage = new deep(this._source);
    if (query) {
      if ((!(query instanceof deep.Deep) || !query.type.is(deep.Set))) throw new Error('Query must be an instance of deep.Set as result of deep.query');
      storage.state._query = query;
      debug('🔨 Query strategy used');
    }
  });

  Storage.processPackage = new deep.Method(function(this, pckg: any) {
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

  Storage.materializePackage = new deep.Method(function(this) {
    const storage = new deep(this._source);
    debug('🔨 materializePackage', storage.state._package?._id, storage.state._package?.data);
    if (!storage.state._package) return undefined;
    return storage.state._package.data;
  });
  
  Storage.dematerializePackage = new deep.Method(function(this, pckg): Deep {
    const storage = new deep(this._source);
    if (!pckg) return;
    const pckgId = _findPackageByName(pckg.name);
    if (pckgId) return deep(pckgId);
    else {
      const pack = new deep.Package(pckg.name, pckg.version);
      debug('🔨 dematerializePackage', pack._id, pack.data);
      return pack;
    }
  });

  Storage.onQuery = new deep.Method(function(this) {
    const storage = new deep(this._source);
    if (storage.state._query) {
      debug('🔨 onQuery');
      for (const link of storage.state._query) {
        debug('🔨 onQuery already link', link._id);
        if (storage.state._onUpsert) storage.state._onUpsert(materialize(link));
      }
      storage.state._watchQuery_handler = (link: Deep) => {
        debug('🔨 onQuery watchQuery_handler', link._id);
        if (storage.state._onUpsert) storage.state._onUpsert(materialize(link));
      };
      storage.state._query.on(deep.events.dataAdd, (link: Deep) => {
        debug('🔨 onQuery dataAdd', link._id);
        storage.state._onUpsert(materialize(link));
        link.on(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      });
      storage.state._query.on(deep.events.dataDelete, (link: Deep) => {
        debug('🔨 onQuery dataDelete', link._id);
        storage.state._onDelete(materialize(link));
        link.off(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.off(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      });
    }
  });

  Storage.offQuery = new deep.Method(function(this) {
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

  Storage.onUpsert = new deep.Method(function(this, onUpsert: (link: Deep) => void) {
    const storage = new deep(this._source);
    if (typeof onUpsert !== 'function') throw new Error('onUpsert must be a function');
    storage.state._onUpsert = onUpsert;
    debug('🔨 onUpsert registered', onUpsert);
  });

  Storage.onDelete = new deep.Method(function(this, onDelete: (link: Deep) => void) {
    const storage = new deep(this._source);
    if (typeof onDelete !== 'function') throw new Error('onDelete must be a function');
    storage.state._onDelete = onDelete;
    debug('🔨 onDelete registered', onDelete);
  });

  Storage.onLoad = new deep.Method(function(this, onLoad: () => PackageStorage) {
    const storage = new deep(this._source);
    if (typeof onLoad !== 'function') throw new Error('onLoad must be a function');
    storage.state._onLoad = onLoad;
    debug('🔨 onLoad registered', onLoad);
  });

  Storage.load = new deep.Method(function(this) {
    const storage = new deep(this._source);
    const result = storage.state._onLoad();
    debug('🔨 load result', result);
    return result;
  });

  // state
  // ._memory _Memory
  const Memory = deep.Storage.Memory = new deep.Storage();
  Memory.effect = function (lifestate, args: [{
    memory?: _MemorySubscription;
    query?: any;
    package?: any;
  }] = [{}]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      debug('🔨 Constructed deep.Storage.Memory');
      if (typeof args[0] != 'object') throw new Error('Memory must be an plain options object');

      const { 
        memory = new _MemorySubscription(),
        query,
        package: pckg,
      } = args[0];

      storage.processMemory(memory);
      storage.processQuery(query);
      storage.processPackage(pckg);

      storage.onUpsert((link) => {
        memory.upsert(link);
      });
      storage.onDelete((link) => {
        memory.delete(link);
      });

      storage.onLoad(() => memory.load());
    } else if (lifestate == deep.Mounting) {
      debug('🔨 Mounting deep.Storage.Memory');

      storage.state._memory_unsubscribe = storage.state._memory.subscribe(storage.materializePackage(), (object) => {
        debug('🔨 deep.Storage.Memory subscribe object', object);
        storage.dematerializePackage(object.package);
        storage.patch(object);
      });

      storage.onQuery();

      storage.mounted();

    } else if (lifestate == deep.Mounted) {
      debug('🔨 Mounted deep.Storage.Memory');

    } else if (lifestate == deep.Unmounting) {
      debug('🔨 Unmounting deep.Storage.Memory');
      storage.state._memory_unsubscribe();

      storage.offQuery();

      storage.unmounted();

    } else if (lifestate == deep.Unmounted) {
      debug('🔨 Unmounted deep.Storage.Memory');
    }
  };
}
