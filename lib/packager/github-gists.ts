import jsan from 'jsan';
import Debug from '../debug';
import fs from 'fs';
import chokidar from 'chokidar';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';
import { Octokit } from 'octokit';
import _ from 'lodash';

const debug = Debug('packager');

export type Deep = any;

export const _watchers = new Set<any>();
export const _unwatch = () => {
  for (const watcher of _watchers) clearInterval(watcher);
}

export class _GithubGists extends _Memory {
  debug: any;
  _octokit: Octokit;
  _gist_id: string;
  _filename: string;
  constructor(octokit: Octokit, gist_id: string, filename: string) {
    super();
    this._octokit = octokit;
    this._gist_id = gist_id;
    this._filename = filename;
    this.debug = Debug(`packager:github-gists:${gist_id}/${filename}`);
  }
  updateDebounced = _.debounce(this.update, 500, {
    leading: false,
    maxWait: 100,
  }).bind(this);
  async update(): Promise<void> {
    this.debug('update', this.value);
    await this._octokit.rest.gists.update({
      gist_id: this._gist_id,
      files: {
        [this._filename]: {
          content: jsan.stringify(this.value),
        },
      },
    });
  }
  async save(object: SerializedPackage): Promise<void> {
    this.debug('save', object);
    this.value = object;
    await this.updateDebounced();
    for (const notify of this._notifies) await notify(object);
  }
  async load(): Promise<SerializedPackage> {
    this.debug('load');
    const gist = await this._octokit.rest.gists.get({ gist_id: this._gist_id });
    if (gist?.status != 200) throw new Error(`Gist ${this._gist_id} loading error`);
    const json = gist?.data?.files?.[this._filename]?.content;
    return this.value = jsan.parse(json || '{ data: [] }');
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  async notify(): Promise<void> {
    this.debug(`notifying`);
    const result = await this.load();
    for (const notify of this._notifies) await notify(result);
  }
  _watcher: any = null;
  async subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    if (!this._watcher) {
      this._watcher = setInterval(() => {
        this.notify();
      }, 1000);
      _watchers.add(this._watcher);
    }
    this._notifies.push(callback);
    return () => {
      this._notifies = this._notifies.filter((notify) => notify !== callback);
      if (this._notifies.length == 0) {
        _watchers.delete(this._watcher);
        clearInterval(this._watcher);
        this._watcher = null;
      }
    };
  }
  async upsert(link: SerializedLink): Promise<void> {
    this.debug('upsert', link.id);
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    await this.save(object);
  }
  async delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    await this.save(object);
  }
}

export function newPackagerGithubGists(deep: Deep) {
  const debug = Debug(`packager:github-gists:${deep._id}`);

  const GithubGist = deep.Storage.GithubGist = new deep.Storage();
  
  GithubGist.effect = async function (lifestate, args: [{
    octokit: Octokit;
    gist_id: string;
    filename: string;
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
      if (typeof args?.[0]?.gist_id != 'string') throw new Error('Gist ID is required');
      if (typeof args?.[0]?.octokit != 'object' || !(args?.[0]?.octokit instanceof Octokit)) throw new Error('Octokit is required');
      const {
        gist_id,
        octokit,
        filename,
        memory = new _GithubGists(octokit, gist_id, filename),
        query,
        subscribe = false,
        package: pckg,
        dependencies,
      } = args[0];
      storage.processMemory(memory);
      storage.processQuery(query);
      storage.processSubscribe(subscribe);
      if (storage.state._subscribe) throw new Error('Subscribe is not supported for GithubGist');
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
        // if (storage.state._subscribe) storage.state._memory_unsubscribe = await storage.memory.subscribe(async (object) => {
        //   debug('🔨 deep.Storage.Memory subscribe object', object);
        //   storage.deserializePackage(object);
        //   delete storage.errors;
        //   storage.patch(object);
        // }); 
        return preloaded;
      };

      const preloaded = await storage.state?._resubscribe();
      await storage.onQuery(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Updating) {
      debug('updating', storage._id);
      if (args[0]?.query) storage.processQuery(args[0]?.query);
      if (typeof args[0]?.subscribe == 'boolean') storage.processSubscribe(args[0].subscribe);
      if (storage.state._subscribe) throw new Error('Subscribe is not supported for GithubGist');
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
