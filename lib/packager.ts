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
  dependencies?: Record<string, string>;
  data?: SerializedLink[];
}

export class _Memory {
  value?: SerializedPackage;
  debug?: any;
  constructor({ value }: { value?: SerializedPackage } = {}) {
    this.value = value;
    this.debug = Debug(`packager:memory`);
  }
  save(object: SerializedPackage): Promise<void> {
    this.debug('save', object);
    throw new Error('Not implemented');
  }
  load(): Promise<SerializedPackage> {
    this.debug('load');
    throw new Error('Not implemented');
  }
  subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    this.debug('subscribe', callback);
    throw new Error('Not implemented');
  }
  upsert(link: SerializedLink): Promise<void> {
    this.debug('upsert', link.id);
    throw new Error('Not implemented');
  }
  delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    throw new Error('Not implemented');
  }
}

export function newPackager(deep: Deep) {
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
        if (_type == deep.Contain._id) {
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
  Storage.delta = new deep.Method(function (this, delta: SerializedLink) {
    const storage = deep(this._source);
    const link = storage.deserialize(delta);
    debug('🔨 delta', link?._id);
  });

  const _serializeId = (id: string, storage: any, initialId = id, path = '') => {
    debug('🔨 _serializeId', id, path);
    const link = deep(id);
    const _in = deep._To.many(link._id);
    let context;
    for (const _inId of _in) {
      const _type = deep._Type.one(_inId);
      if (_type == deep.Contain._id) {
        context = deep(_inId);
        // debug('🔨 _serializeId context founded', context?._id, 'in', _in.size);
        break;
      }
    }
    if (!context) {
      if (!path) {
        if (id == deep._id) {
          // debug('🔨 _serializeId !context !path root', link._type, link._id);
          return '/';
        } else if (link._type == deep.Package._id) {
          // debug('🔨 _serializeId !context !path package', link._id);
          return link.data.name;
        } else {
          // debug('🔨 _serializeId !context !path root not found', link._type, link._id);
          return initialId;
        }
      } else {
        if (id == deep._id) {
          // debug('🔨 _serializeId !context path root', link._type, link._id);
          return '/' + path;
        } else if (link._type == deep.Package._id) {
          // debug('🔨 _serializeId !context path package', link._id);
          return link.data.name + '/' + path;
        } else {
          // debug('🔨 _serializeId !context path root not found', link._type, link._id);
          return initialId;
        }
      }
    } else {
      // debug('🔨 _serializeId context path', context._from, path);
      const nextPath = [context.data];
      if (path) nextPath.push(path);
      if (context._from == deep._id) {
        // debug('🔨 _serializeId context path root', context._from, nextPath.join('/'));
        return '/' + nextPath.join('/');
      }
      // const pckg = deep(context._from);
      // if (pckg._type == Package._id) return pckg.data.name+'/'+nextPath.join('/');
      // debug('🔨 _serializeId context path', context._from, nextPath.join('/'));
      return _serializeId(context._from, storage, initialId, nextPath.join('/'));
    }
  }

  Storage.serializeId = new deep.Method(function (this, id: string) {
    const storage = deep(this._source);
    const _id = _serializeId(id, storage);
    debug('🔨 serializeId', id, '=>', _id, `${_id == id ? 'path by context not found' : 'path by context found'}`);
    return _id;
  });

  // Simple semver comparison function
  const _compareSemver = (version: string, pattern: string): boolean => {
    debug('🔨 _compareSemver', version, 'vs', pattern);
    
    // Handle exact match
    if (version === pattern) return true;
    
    // Handle caret (^) - compatible within same major version
    if (pattern.startsWith('^')) {
      const patternVersion = pattern.slice(1);
      const [vMajor, vMinor, vPatch] = version.split('.').map(Number);
      const [pMajor, pMinor, pPatch] = patternVersion.split('.').map(Number);
      
      if (vMajor !== pMajor) return false;
      if (vMinor > pMinor) return true;
      if (vMinor === pMinor && vPatch >= pPatch) return true;
      return false;
    }
    
    // Handle tilde (~) - compatible within same minor version
    if (pattern.startsWith('~')) {
      const patternVersion = pattern.slice(1);
      const [vMajor, vMinor, vPatch] = version.split('.').map(Number);
      const [pMajor, pMinor, pPatch] = patternVersion.split('.').map(Number);
      
      if (vMajor !== pMajor || vMinor !== pMinor) return false;
      return vPatch >= pPatch;
    }
    
    // Handle >= operator
    if (pattern.startsWith('>=')) {
      const patternVersion = pattern.slice(2);
      const [vMajor, vMinor, vPatch] = version.split('.').map(Number);
      const [pMajor, pMinor, pPatch] = patternVersion.split('.').map(Number);
      
      if (vMajor > pMajor) return true;
      if (vMajor === pMajor && vMinor > pMinor) return true;
      if (vMajor === pMajor && vMinor === pMinor && vPatch >= pPatch) return true;
      return false;
    }
    
    // Default to exact match
    return version === pattern;
  };

  const _findPackageByName = (name: string) => {
    const _packages = deep._Type.many(deep.Package._id);
    let founded;
    for (const pckgId of _packages) {
      const pckg = deep(pckgId);
      if (pckg?.value?.data?.name == name) {
        founded = pckg;
        break;
      }
    }
    debug('🔨 _findPackageByName', name, '=>', founded?._id, 'in', _packages.size);
    return founded;
  }

  const _findPackageByNameAndVersion = (name: string, versionPattern: string | Deep) => {
    debug('🔨 _findPackageByNameAndVersion', name, versionPattern);
    
    // Check resolvers first (higher priority)
    if (versionPattern instanceof deep.Deep && versionPattern.type.is(deep.Package)) {
      return versionPattern;
    }
    
    // Search by version pattern
    const packages = Package.typed.data;
    let founded;
    for (const pckgId of packages) {
      const pckg = deep(pckgId);
      if (pckg?.value?.data?.name == name && _compareSemver(pckg.value.data.version, versionPattern)) {
        founded = pckg;
        break;
      }
    }
    debug('🔨 _findPackageByNameAndVersion', name, versionPattern, '=>', founded?._id, 'in', packages.size);
    return founded;
  }

  // / => deep._id
  // /test => deep.test._id
  // abc => (package with name abc)._id
  // abc/test => (package with name abc).test._id
  // not/founded => not/founded
  // uuid => uuid
  const _deserializeId = (path: string, dependencies?: Record<string, string>): string | undefined => {
    debug('🔨 _deserializeId', path, dependencies);
    if (path == '/') return deep._id;
    const parts = path.split('/');
    let pointer;
    for (const part of parts) {
      debug('🔨 _deserializeId part', part);
      if (!pointer && part == '') {
        debug('🔨 _deserializeId part is deep', part);
        pointer = deep;
        continue;
      }
      if (!pointer) {
        debug('🔨 _deserializeId !pointer', part);
        let pckg;
        // Use dependencies and resolvers for package resolution
        if (dependencies && dependencies[part]) {
          pckg = _findPackageByNameAndVersion(part, dependencies[part]);
          debug('🔨 _deserializeId by name and version', part, dependencies[part], pckg?._id);
        } else {
          pckg = _findPackageByName(part);
          debug('🔨 _deserializeId by name', part, pckg?._id);
        }
        debug('🔨 _deserializeId pckg', pckg?._id);
        if (!pckg) return undefined;
        pointer = pckg;
      } else {
        const next = pointer?._contain?.[part];
        debug('🔨 _deserializeId pointer[part]', pointer?._id, part, next ? 'found' : 'not found');
        pointer = next;
      }
      if (!pointer) return undefined;
    }
    debug('🔨 _deserializeId return pointer?._id', pointer?._id);
    return pointer?._id;
  }

  Storage.deserializeId = new deep.Method(function (this, path: string) {
    const storage = deep(this._source);
    const dependencies = storage.state._dependencies;
    const dedserializedDeps = { ...dependencies };
    if (storage?.package?.data) dedserializedDeps[storage.package.data.name] = storage.package.data.version;
    const _id = _deserializeId(path, dedserializedDeps);
    debug('🔨 deserializeId', path, '=>', _id, 'with dependencies', dependencies);
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
      if (split.length != 2 || split[0] != pckg.data.name) {
        return storage.error(`Failed to deserialize (${_link.id}), .id (${_link.id}) not founded.`)
      } else {
        if (split[0] != pckg.data.name) {
          return storage.error(`Failed to deserialize (${_link.id}), .id (${_link.id}) not founded.`)
        }
      }

      // restore exists link already created in contexts
      if (linkId == _link.id) {
        link = deep(); // create new link if not exists
        debug('🔨 deserialize', _link.id, '=>', link._id, 'in context', pckg._id, `(${split[0]}) as ${split[1]}`);
        const context = new deep.Contain();
        context._from = pckg._id;
        context._to = link._id;
        context.value = new deep.String(split[1]);
        // pckg._contain[split[1]] = link;
      } else {
        link = deep(linkId); // use exists link
        if (pckg?._contain?.[split[1]]) {
          debug(`🔨 storage.deserialize pckg context ${split[1]} already exists`, pckg?._contain?.[split[1]]._id);
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

    debug('🔨 deserialized', link._id);
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

  const _checkAvailabilityToDelta = (storage, _link: SerializedLink, makeErrors: boolean = false): boolean => {
    let errors = false;
    if (_link._type) {
      const typeId = storage.deserializeId(_link._type);
      if (!deep._ids.has(typeId)) {
        errors = true;
        if (makeErrors) storage.error(`Failed to deserialize (${_link.id}), .type (${_link._type}) not founded.`)
      }
    }
    if (_link._from) {
      const fromId = storage.deserializeId(_link._from);
      if (!deep._ids.has(fromId)) {
        errors = true;
        if (makeErrors) storage.error(`Failed to deserialize (${_link.id}), .from (${_link._from}) not founded.`)
      }
    }
    if (_link._to) {
      const toId = storage.deserializeId(_link._to);
      if (!deep._ids.has(toId)) {
        errors = true;
        if (makeErrors) storage.error(`Failed to deserialize (${_link.id}), .to (${_link._to}) not founded.`)
      }
    }
    if (_link._value) {
      const valueId = storage.deserializeId(_link._value);
      if (!deep._ids.has(valueId)) {
        errors = true;
        if (makeErrors) storage.error(`Failed to deserialize (${_link.id}), .value (${_link._value}) not founded.`)
      }
    }
    return !errors;
  }

  Storage._contain.ids = new deep.Field(function (this) {
    const storage = deep(this._source);
    return new deep.Set(new Set(storage?.state?._ids || []));
    // TODO make ids field is deep.Set with tracking support
  });

  Storage.patch = new deep.Method(function (this, patch: SerializedPackage) {
    const storage = deep(this._source);
    debug('🔨 patch', patch?.data?.length);

    const prevIds: string[] = storage.state._ids = storage.state._ids || [];
    const nextIds = new Set<string>();
    const waitingList: SerializedLink[] = [];

    if (patch?.data?.length) {
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
        for (const _link of waitingList) {
          _checkAvailabilityToDelta(storage, _link, true);
          nextIds.add(_link.id);
        }
        debug('🔨 patch failed to resolve all dependencies', waitingList);
      }
    }

    for (const prevId of prevIds) {
      if (!nextIds.has(prevId)) {
        const link = deep(prevId);
        if (link) link.destroy();
      }
    }
    storage.state._ids = Array.from(nextIds);
  });

  Storage.serializePackage = new deep.Method(function (this) {
    const storage = new deep(this._source);
    debug('🔨 serializePackage', storage.state._package?._id, storage.state._package?.data);
    if (!storage.state._package) return undefined;
    const result = { ...storage.state._package.data };
    // // Add dependencies from storage state (higher priority) or package dependencies
    // if (storage.state._dependencies || storage.state._package.state._dependencies) {
    //   result.dependencies = { ...storage.state._package.state._dependencies, ...storage.state._dependencies };
    // }
    return result;
  });

  Storage.package = new deep.Field(function (this) {
    const storage = new deep(this._source);
    return storage.state._package;
  });

  Storage.deserializePackage = new deep.Method(function (this, pckg: SerializedPackage): Deep {
    const storage = new deep(this._source);
    if (!pckg?.package) return;
    const _package = pckg.package as SerializedPackage["package"];
    if (!_package?.name) return;
    const pckgDeep = _package?.version ? _findPackageByNameAndVersion(_package.name, _package.version) : _findPackageByName(_package.name);
    if (pckgDeep) {
      debug('🔨 deserializePackage existing', pckgDeep._id, pckgDeep.data, 'based on', pckg);
      storage.state._package = pckgDeep;
      // Set dependencies from serialized package if present
      if (pckg.dependencies) {
        storage.state._dependencies = { ...storage.state._dependencies, ...pckg.dependencies };
      }
      return pckgDeep;
    } else {
      const pack = new deep.Package(_package?.name, _package?.version);
      debug('🔨 deserializePackage new', pack._id, pack.data);
      storage.state._package = pack;
      // Set dependencies from serialized package if present
      if (pckg.dependencies) {
        storage.state._dependencies = { ...storage.state._dependencies, ...pckg.dependencies };
      }
      return pack;
    }
  });

  Storage.processMemory = new deep.Method(function (this, memory: _Memory) {
    const storage = new deep(this._source);
    if (!((memory as any) instanceof _Memory)) throw new Error('Memory must be an instance of _MemorySubscription');
    if (storage.state._memory != memory) storage.state._memory = memory;
  });
  Storage.memory = new deep.Field(function (this) {
    const storage = new deep(this._source);
    return storage.state._memory;
  });

  Storage.processQuery = new deep.Method(function (this, query: any) {
    const storage = new deep(this._source);
    if (query) {
      if ((!(query instanceof deep.Deep) || !query.type.is(deep.Set))) throw new Error('Query must be an instance of deep.Set as result of deep.query');
      if (storage.state._query != query) storage.state._query = query;
      debug('🔨 Query strategy used');
    }
  });

  Storage.processSubscribe = new deep.Method(function (this, subscribe: boolean) {
    const storage = new deep(this._source);
    if (storage.state._subscribe != subscribe) storage.state._subscribe = subscribe;
  });

  Storage.processPackage = new deep.Method(function (this, pckg: any) {
    const storage = new deep(this._source);
    if (pckg) {
      if ((!(pckg instanceof deep.Deep) || !pckg.type.is(deep.Package))) throw new Error('Package must be an instance of deep.Package');
      if (storage.state._query) throw new Error('Query and package cannot be used together');
      storage.state._package = pckg;
      storage.state._query = deep.query({
        in: { // only if link has context
          type: deep.Contain,
          from: pckg, // inside package
          value: { // only if context has string name
            type: deep.String,
          },
        }
      });
      debug('🔨 Package strategy used');
    }
  });

  Storage.processDependencies = new deep.Method(function (this, dependencies: Record<string, Deep | string>) {
    const storage = new deep(this._source);
    if (storage.state._dependencies != dependencies) storage.state._dependencies = dependencies;
    debug('🔨 processDependencies', dependencies);
  });

  Storage.processUtilization = new deep.Method(function (this) {
    const storage = new deep(this._source);
    debug('🔨 processUtilization');
    if (storage.package) {
      storage.package.unmount();
    }
  });

  Storage.errors = new deep.Field(function (this) {
    const storage = new deep(this._source);
    storage.state.errors = storage.state.errors || [];
    if (this._reason == deep.reasons.getter._id) {
      return storage.state.errors;
    } else if (this._reason == deep.reasons.setter._id) {
      return storage.state.errors = [];
    } else if (this._reason == deep.reasons.deleter._id) {
      storage.state.errors = [];
      return true;
    }
  });

  Storage.onQuery = new deep.Method(async function (this, preloaded: Deep) {
    const storage = new deep(this._source);
    if (storage.state._query) {
      debug('🔨 onQuery');
      if (storage.state._processedQuery && storage.state._processedQuery != storage.state._query) {
        // TODO find deleted in preloaded
      }
      storage.state._processedQuery = storage.state._query;
      
      // Add all upsert operations to storage.promise chain to prevent race conditions
      for (const link of storage.state._query) {
        debug('🔨 onQuery already link', link._id);
        if (storage.state._onUpsert) {
          // Add operation to promise chain instead of awaiting directly
          // storage.promise = storage.promise.then(async () => {
            debug('🔨 onQuery executing upsert in chain', link._id);
            await storage.state._onUpsert(storage.serialize(link));
          // });
        }
      }
      
      storage.state._watchQuery_handler = async (link: Deep) => {
        debug('🔨 onQuery watchQuery_handler', link._id);
        if (storage.state._onUpsert) {
          // Add to promise chain for consistency
          // storage.promise = storage.promise.then(async () => {
            debug('🔨 onQuery executing upsert in chain', link._id);
            await storage.state._onUpsert(storage.serialize(link));
          // });
        }
      };
      storage.state._query.on(deep.events.dataAdd, async (link: Deep) => {
        debug('🔨 onQuery dataAdd', link._id);
        // Add to promise chain
        // storage.promise = storage.promise.then(async () => {
          await storage.state._onUpsert(storage.serialize(link));
        // });
        link.on(deep.events.typeSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.fromSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.toSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.valueSetted._id, storage.state._watchQuery_handler);
        link.on(deep.events.dataChanged._id, storage.state._watchQuery_handler);
      });
      storage.state._query.on(deep.events.dataDelete, async (link: Deep) => {
        debug('🔨 onQuery dataDelete', link._id);
        // Add to promise chain
        // storage.promise = storage.promise.then(async () => {
          await storage.state._onDelete(storage.serialize(link));
        // });
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

  Storage.load = new deep.Method(async function (this) {
    const storage = new deep(this._source);
    const result = await storage.state._onLoad();
    storage.state._loaded = result;
    debug('🔨 load result', result);
    return result;
  });

  Storage.loaded = new deep.Field(function (this) {
    const storage = new deep(this._source);
    if (this._reason != deep.reasons.getter._id) return;
    return storage.state._loaded;
  });

  Storage.definePackage = new deep.Method(function (this, loadedPackage: SerializedPackage) {
    const storage = new deep(this._source);
    const serializedPackage = storage.serializePackage();
    debug('🔨 definePackage', 'serialized', serializedPackage, 'loaded.package', loadedPackage);
    if (serializedPackage) {
      if (loadedPackage?.package && loadedPackage?.package?.name != serializedPackage?.name) {
        throw new Error(`Package mismatch: ${loadedPackage?.package?.name} != ${serializedPackage?.name}`);
      } else {
        debug('🔨 definePackage', 'serializedPackage', serializedPackage);
        return { ...loadedPackage, package: { ...serializedPackage } };
      }
    }
    return loadedPackage;
  });
}
