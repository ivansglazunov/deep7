import Debug from '../debug';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';
import jsan from 'jsan';

const _delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type Deep = any;

export class _MemoryAsync extends _Memory {
  debug = Debug('packager:memory-async');
  async save(object: SerializedPackage) {
    this.debug('save', object);
    await _delay(2);
    this.value = jsan.stringify(object);
    await _delay(6);
    await this.notify();
  }
  async load() {
    this.debug('load');
    await _delay(2);
    return this.value ? jsan.parse(this.value) : { data: [] };
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  async notify() {
    this.debug('notify');
    await this.load().then(async result => {
      for (const notify of this._notifies) await notify(result);
    });
  }
  async subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    this.debug('subscribe', callback);
    if (callback) this._notifies.push(callback);
    if (callback) callback(await this.load());
    return () => {
      this._notifies = this._notifies.filter((notify) => notify !== callback);
    };
  }
  async upsert(link: SerializedLink) {
    this.debug('upsert', link.id);
    const object = await this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    await this.save(object);
  }
  async delete(link: SerializedLink) {
    this.debug('delete', link.id);
    const object = await this.load();
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    await this.save(object);
  }
}

export function newPackagerMemoryAsync(deep: Deep) {
  const debug = Debug(`packager:memory-async:${deep._id}`);

  const MemoryAsync = deep.Storage.MemoryAsync = new deep.Storage();
  
  MemoryAsync.effect = async function (lifestate, args: [{
    memory?: _Memory;
    query?: any;
    subscribe?: boolean;
    package?: any;
    dependencies?: Record<string, string>;
  }] = [{}]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      storage.state.errors = [];
      this.on(deep.events.error, (error) => {
        if (!storage.state.errors.includes(error)) storage.state.errors.push(error);
      });
      debug('constructed', storage._id);
      if (typeof args[0] != 'object') throw new Error('Memory must be an plain options object');
      const {
        memory = new _MemoryAsync(),
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
        const preloaded = await storage.state._memory.load();
        const redefined = storage.definePackage(preloaded);
        await storage.state._memory.save({ ...preloaded, ...redefined });
        storage.deserializePackage(redefined);
        storage.patch(redefined);
        if (storage.state._subscribe) storage.state._memory_unsubscribe = await storage.state._memory.subscribe(async (object) => {
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
