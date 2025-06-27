import jsan from 'jsan';
import Debug from '../debug';
import fs, { link } from 'fs';
import chokidar from 'chokidar';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';
import { Hasyx } from 'hasyx';

export type Deep = any;

export const _watchers = new Set<any>();
export const _unwatch = () => {
  for (const watcher of _watchers) watcher.unsubscribe();
}

export function hasyxLinkToSerializedLink(hasyxLink: any): SerializedLink {
  const serializedLink: any = {
    id: hasyxLink.id,
    _created_at: hasyxLink.created_at,
    _updated_at: hasyxLink.updated_at,
  };
  if (hasyxLink.type_id) serializedLink.type_id = hasyxLink.type_id;
  if (hasyxLink.from_id) serializedLink.from_id = hasyxLink.from_id;
  if (hasyxLink.to_id) serializedLink.to_id = hasyxLink.to_id;
  if (hasyxLink.value_id) serializedLink.value_id = hasyxLink.value_id;
  if (hasyxLink.string) serializedLink.string = hasyxLink.string;
  if (hasyxLink.number) serializedLink.number = hasyxLink.number;
  if (hasyxLink.function) serializedLink.function = hasyxLink.function;
  if (hasyxLink.object) serializedLink.object = hasyxLink.object;
  return serializedLink;
}

export function serializedLinkToHasyxLink(serializedLink: SerializedLink, hasyx: Hasyx): any {
  return {
    id: serializedLink.id, // Important to target the existing user by PK for constraint to hit
    _deep: hasyx.user.id,
    type_id: serializedLink.type_id,
    from_id: serializedLink.from_id,
    to_id: serializedLink.to_id,
    value_id: serializedLink.value_id,
    string: serializedLink.string,
    number: serializedLink.number,
    function: serializedLink.function,
    object: serializedLink.object,
    created_at: serializedLink._created_at,
    updated_at: serializedLink._updated_at,
  };
}

export class _Hasyx extends _Memory {
  debug: any;
  _hasyx: Hasyx;
  _query: any;
  constructor(hasyx: Hasyx, query?: any) {
    super();
    this._hasyx = hasyx;
    this._query = query;
    this.debug = Debug(`packager:_hasyx`);
  }
  async save(object: SerializedPackage): Promise<void> {
    this.debug('save', object);
    const upsert = object?.data?.map((link) => serializedLinkToHasyxLink(link, this._hasyx));
    try {
      const updatedUser = await this._hasyx.insert({
        table: 'deep_links',
        objects: upsert,
        on_conflict: {
          constraint: 'links_pkey', // Using primary key for the update part of upsert
          update_columns: ['type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'updated_at']
        },
        returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at']
      });
    } catch(e) {
      console.error('save error', e);
    }
    this.value = object;
    this.notify();
  }
  async load(): Promise<SerializedPackage> {
    this.debug('load');
    const result = await this._hasyx.select({
      table: 'deep_links',
      where: this._query,
      returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at'],
    });
    return this.value = { data: result.map(hasyxLinkToSerializedLink) };
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
    this.debug('subscribe');
    if (!this._watcher) {
      this._watcher = this._hasyx!.subscribe({
        table: 'deep_links',
        where: {
          _deep: { _eq: this._hasyx.user.id },
          _and: this._query,
        },
        returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at'],
      }).subscribe({
        next: (result) => {
          this.debug('subscribe next', result);
          this.value = { data: result.map(hasyxLinkToSerializedLink) };
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
      this.debug('unsubscribe');
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
    const upsert = serializedLinkToHasyxLink(link, this._hasyx);
    try {
      const updatedUser = await this._hasyx.insert({
        table: 'deep_links',
        object: upsert,
        on_conflict: {
          constraint: 'links_pkey', // Using primary key for the update part of upsert
          update_columns: ['type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'updated_at']
        },
        returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at']
      });
    } catch(e) {
      console.error('upserted error', e);
    }
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    this.notify();
  }
  async delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    await this._hasyx.delete({
      table: 'deep_links',
      where: {
        _deep: this._hasyx.user.id,
        id: { _eq: link.id },
      }
    });
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    this.notify();
  }
}

export function newPackagerHasyx(deep: Deep) {
  const debug = Debug(`packager:hasyx:${deep._id}`);

  const __Hasyx = deep.Storage.Hasyx = new deep.Storage();

  __Hasyx.effect = async function (lifestate, args: [{
    query?: any;
    hasyx: Hasyx;
    memory?: _Memory;
    data?: any;
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
      if (!args?.[0]?.query) throw new Error('query is required');
      const {
        hasyx,
        query,
        memory = new _Hasyx(hasyx, query),
        data,
        subscribe = true,
        package: pckg,
        dependencies,
      } = args[0];
      storage.processMemory(memory);
      storage.processData(data);
      storage.processSubscribe(subscribe);
      storage.processPackage(pckg);
      storage.processDependencies(dependencies);

      storage.onUpsert((link) => memory.upsert(link));
      storage.onDelete((link) => memory.delete(link));
      storage.onLoad(() => memory.load());

    } else if (lifestate == deep.Mounting) {
      debug('mounting', storage._id);
      storage.state._resubscribe = async () => {
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
      await storage.refreshData(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Updating) {
      debug('updating', storage._id);
      if (args[0]?.data) storage.processData(args[0]?.data);
      if (typeof args[0]?.subscribe == 'boolean') storage.processSubscribe(args[0].subscribe);
      if (args[0]?.package) storage.processPackage(args[0].package);
      if (args[0]?.dependencies) storage.processDependencies(args[0]?.dependencies);
      if (args[0]?.query) storage.state._memory.query = args[0]?.query;

      const preloaded = await storage.state?._resubscribe();
      await storage.refreshData(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Mounted) {
      debug('mounted', storage._id);

    } else if (lifestate == deep.Unmounting) {
      debug('unmounting', storage._id);
      if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();
      storage.forgotData();
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