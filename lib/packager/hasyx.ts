import jsan from 'jsan';
import Debug from '../debug';
import fs from 'fs';
import chokidar from 'chokidar';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';
import { Hasyx } from 'hasyx';

export type Deep = any;

export const _watchers = new Set<any>();
export const _unwatch = () => {
  for (const watcher of _watchers) watcher.close();
}

export class _Hasyx extends _Memory {
  debug: any;
  _hasyx: Hasyx;
  _query: any;
  constructor(hasyx: Hasyx, query?: any) {
    super();
    this._hasyx = hasyx;
    this._query = query;
    this.debug = Debug(`packager:hasyx`);
  }
  async load(): Promise<SerializedPackage> {
    this.debug('load');
    const result = await this._hasyx.select(this._query);
    return this.value = { data: result };
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  async notify(): Promise<void> {
    this.debug(`notifying`);
    const object = this.value;
    if (object) {
      for (const notify of this._notifies) await notify(object);
    }
  }
  _watcher: any = null;
  async subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    if (!this._watcher) {
      this._watcher = this._hasyx!.subscribe({
        table: 'links',
        where: this._query,
        returning: ['id', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'object', 'created_at', 'updated_at'],
        pollingInterval: 1000,
        ws: true
      }).subscribe({
        next: (result) => {
          this.debug('subscribe next', result);
          this.value = { data: result };
          this.notify();
        },
        error: (err) => {
          this.debug('subscribe error', err);
        }
      });

      _watchers.add(this._watcher);
    }
    this._notifies.push(callback);
    return () => {
      this._notifies = this._notifies.filter((notify) => notify !== callback);
      if (this._notifies.length == 0) {
        _watchers.delete(this._watcher);
        this._watcher.unsubscribe();
        this._watcher = null;
      }
    };
  }
  async upsert(link: SerializedLink): Promise<void> {
    this.debug('upsert', link.id);
    const updatedUser = await this._hasyx.upsert({
      table: 'links',
      object: { 
        id: link.id, // Important to target the existing user by PK for constraint to hit
        _type: link._type,
        _from: link._from,
        _to: link._to,
        _value: link._value,
        string: link.string,
        number: link.number,
        function: link.function,
        object: link.object,
        created_at: link._created_at,
        updated_at: link._updated_at,
      },
      on_conflict: {
        constraint: 'links_pkey', // Using primary key for the update part of upsert
        update_columns: ['_type', '_from', '_to', '_value', 'string', 'number', 'function', 'object', 'updated_at']
      },
      returning: ['id', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'object', 'created_at', 'updated_at']
    });
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    this.notify();
  }
  async delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    await this._hasyx.delete({
      table: 'links',
      where: {
        id: { _eq: link.id },
      }
    });
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    this.notify();
  }
}

export function newPackagerFsJsonAsync(deep: Deep) {
  const debug = Debug(`packager:fs-json-async:${deep._id}`);

  const FsJsonAsync = deep.Storage.FsJsonAsync = new deep.Storage();
  
  FsJsonAsync.effect = async function (lifestate, args: [{
    hasyxQuery?: any;
    hasyx: Hasyx;
    memory?: _Memory;
    query?: any;
    subscribe?: boolean;
    package?: any;
    dependencies?: Record<string, string>;
  }]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      storage.state.errors = [];
      this.on(deep.events.error, (error) => {
        if (!storage.state.errors.includes(error)) storage.state.errors.push(error);
      });
      debug('constructed', storage._id);
      if (typeof args?.[0] != 'object') throw new Error('Memory must be an plain options object');
      if (!args?.[0]?.hasyx) throw new Error('Hasyx instance is required');
      if (!args?.[0]?.hasyxQuery) throw new Error('hasyxQuery is required');
      const {
        hasyx,
        hasyxQuery,
        memory = new _Hasyx(hasyx, hasyxQuery),
        query,
        subscribe = true,
        package: pckg,
        dependencies,
      } = args[0];
      storage.processMemory(memory);
      storage.processQuery(query);
      storage.processSubscribe(subscribe);
      storage.processPackage(pckg);
      storage.processDependencies(dependencies);

      storage.onUpsert((link) => memory.upsert(link));
      storage.onDelete((link) => memory.delete(link));
      storage.onLoad(() => memory.load());

    } else if (lifestate == deep.Mounting) {
      debug('mounting', storage._id);
      storage.state._resubscribe = async() => {
        if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();
        const preloaded = await storage.memory.load();
        const redefined = storage.definePackage(preloaded);
        await storage.memory.save({ ...preloaded, ...redefined });
        storage.deserializePackage(redefined);
        delete storage.errors;
        storage.patch(redefined);
        if (storage.state._subscribe) storage.state._memory_unsubscribe = await storage.memory.subscribe(async (object) => {
          debug('🔨 deep.Storage.Memory subscribe object', object);
          storage.deserializePackage(object);
          delete storage.errors;
          storage.patch(object);
        }); 
        return preloaded;
      };

      const preloaded = await storage.state?._resubscribe();
      await storage.onQuery(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Updating) {
      debug('updating', storage._id);
      if (args[0]?.query) storage.processQuery(args[0]?.query);
      if (typeof args[0]?.subscribe == 'boolean') storage.processSubscribe(args[0].subscribe);
      if (args[0]?.package) storage.processPackage(args[0].package);
      if (args[0]?.dependencies) storage.processDependencies(args[0]?.dependencies);

      const preloaded = await storage.state?._resubscribe();
      await storage.onQuery(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Mounted) {
      debug('mounted', storage._id);

    } else if (lifestate == deep.Unmounting) {
      debug('unmounting', storage._id);
      if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();
      storage.offQuery();
      storage.processUtilization(); // TODO check
      storage.unmounted();
    } else if (lifestate == deep.Unmounted) {
      debug('unmounted', storage._id);
    } else if (lifestate == deep.Destroyed) {
      debug('destroyed', storage._id);
      storage.processUtilization(); // TODO check
    }
  };
} 