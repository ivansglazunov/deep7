import jsan from 'jsan';
import Debug from '../debug';
import fs from 'fs';
import chokidar from 'chokidar';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';

export type Deep = any;

export const _watchers = new Set<any>();
export const _unwatch = () => {
  for (const watcher of _watchers) watcher.close();
}

export class _FsJsonSync extends _Memory {
  debug: any;
  _path: string;
  _chokidar: any = {};
  constructor(path: string) {
    super();
    this._path = path;
    this.debug = Debug(`packager:_fs-json-sync:${path}`);
  }
  async save(object: SerializedPackage): Promise<void> {
    this.debug('save', object);
    fs.writeFileSync(this._path, jsan.stringify(object));
    this.notify();
  }
  _loaded?: any;
  async load(): Promise<SerializedPackage> {
    this.debug('load');
    this._loaded = fs.existsSync(this._path) ? jsan.parse(fs.readFileSync(this._path, 'utf8')) : { data: [] };
    return this._loaded;
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  async notify(): Promise<void> {
    this.debug(`notifying`);
    await this.load().then(async result => {
      for (const notify of this._notifies) await notify(result);
    });
  }
  _watcher: any = null;
  async subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    if (!this._watcher) {
      this._watcher = chokidar.watch(this._path, this._chokidar);

      this._watcher
        .on('change', () => {
          this.debug('change');
          this.notify();
        })
        .on('add', () => {
          this.debug('add');
          this.notify();
        })
        .on('error', error => {
          this.debug(`Watcher error for: ${this._path}`, error);
        })
        .on('ready', () => this.debug(`Chokidar ready for: ${this._path}`));

      _watchers.add(this._watcher);
    }
    this._notifies.push(callback);
    return () => {
      this._notifies = this._notifies.filter((notify) => notify !== callback);
      if (this._notifies.length == 0) {
        _watchers.delete(this._watcher);
        this._watcher.close();
        this._watcher = null;
      }
    };
  }
  async upsert(link: SerializedLink): Promise<void> {
    this.debug('upsert', link.id);
    const object: any = await this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    await this.save(object);
  }
  async delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    const object: any = await this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    await this.save(object);
  }
}

export function newPackagerFsJsonSync(deep: Deep) {
  const debug = Debug(`packager:fs-json-sync:${deep._id}`);

  const FsJsonSync = deep.Storage.FsJsonSync = new deep.Storage();

  FsJsonSync.effect = async function (lifestate, args: [{
    path: string;
    memory?: _Memory;
    data?: any;
    subscribe?: boolean;
    package?: any;
    dependencies?: Record<string, string>;
    chokidar?: any;
  }]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      storage.state.errors = [];
      this.on(deep.events.error, (error) => {
        if (!storage.state.errors.includes(error)) storage.state.errors.push(error);
      });
      debug('constructed', storage._id);
      if (typeof args?.[0] != 'object') throw new Error('Memory must be an plain options object');
      if (typeof args?.[0]?.path != 'string') throw new Error('Path is required');
      const {
        path,
        memory = new _FsJsonSync(path),
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
      if (typeof args?.[0]?.chokidar == 'object') storage.state._memory._chokidar = args[0]?.chokidar;

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
      if (typeof args?.[0]?.chokidar == 'object') storage.state._memory._chokidar = args[0]?.chokidar;

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
