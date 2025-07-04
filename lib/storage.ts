import Debug from "./debug";
import fs from 'fs';
import _ from 'lodash';
import jsan from 'jsan';
import chokidar from 'chokidar';
import { _destroyers } from "./_deep";
import { v4 as uuidv4 } from 'uuid';

// Control some data flow between storage and deep instance. Storage can be also deep instance.
// Results is just something, not a deep instance.

// If data not sended on mount - use only load, not save.
// If data sended on mount - use save on mount.

export function newStorage(deep) {
  const debug = Debug('storage');

  deep.Storage = new deep.Lifecycle();

  function isChanged(oldItem, newItem) {
    if (!_.isEqual(oldItem, newItem) && oldItem.updated_at < newItem.updated_at) return true;
  }

  deep.Storage.options = new deep.Field(function(this: any) {
    if (this._reason === deep.reasons.getter._id) {
      const storage = deep(this._source);
      return storage.state.options;
    } else throw new Error('deep.Storage.options is read-only');
  });

  deep.Storage.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);

      const options = storage.state.options = args[0] || {};

      let data = options?.data;
      let patch = options?.patch;
      let customIsChanged = options?.isChanged;

      if (data && patch) throw new Error('data and patch cannot be used together');
      if (!data && !patch) data = new deep.Array([]);
      if (!patch) patch = new deep.Patch({
        data: data,
        isChanged: customIsChanged || isChanged,
      });
      
      storage.patch = patch;
      storage.state.package = {
        updated_at: Date.now(),
      };
      
    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);
      
      // Базовый Storage не должен вызывать storage.mounted()
      // Это делают конкретные реализации в конце их логики mounting

    } else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

    } else if (lifestate === deep.Mounted) {
      debug(`mounted: ${storage.idShort} ready`);
      // Storage is now fully mounted and ready

    } else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      storage?.state?.off();
      await storage.patch.unmount();
      storage.patch.destroy();
      await storage.unmounted();
    }
  };
}

export class InMemoryPatch {
  id: string = uuidv4();
  debug;
  constructor() {
    this.debug = Debug(`storage:in-memory-patch: ${this.id}`);
  }
  data: any = { data: [], updated_at: Date.now(), created_at: Date.now() };
  async load(storage) {
    this.debug('load');
    await storage.patch.update({ data: this.data.data });
    
    // Восстановить все поля из this.data в storage.state.package
    for (const key in this.data) {
      if (key !== 'data') { // исключаем массив данных
        storage.state.package[key] = this.data[key];
      }
    }
  }
  async save(storage) {
    this.debug('save');
    this.debug('save - before:', this.data.data.length, 'items');
    this.debug('save - storage.patch.data.data:', storage.patch.data.data.length, 'items');
    // Modify existing array in place instead of recreating it
    this.data.data.length = 0;
    this.data.data.push(...storage.patch.data.data);
    this.data.updated_at = Date.now();
    
    // Синхронизировать все поля storage.state.package в this.data
    for (const key in storage.state.package) {
      this.data[key] = storage.state.package[key];
    }
    
    storage.state.package.updated_at = this.data.updated_at;
    this.debug('save - after:', this.data.data.length, 'items');
  }
}

export function newStorageInMemory(deep) {
  const debug = Debug('storage:in-memory');
  deep.Storage.InMemory = new deep.Storage();
  deep.Storage.InMemory.memory = new deep.Field(function(this: any) {
    if (this._reason === deep.reasons.getter._id) {
      const storage = deep(this._source);
      return storage.options.memory;
    } else throw new Error('Memory is read-only');
  });
}

export function newStorageInMemoryPatch(deep) {
  const debug = Debug('storage:in-memory-patch');

  const _Patch = deep.Storage.InMemory.Patch = new deep.Storage.InMemory();
  deep.Storage.InMemory.Patch.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      storage.type.type.type.effect.call(storage, lifestate, args);

      if (!(storage.options.memory instanceof InMemoryPatch)) {
        debug(`constructed: ${storage.idShort} new InMemoryPatch`);
        storage.options.memory = new InMemoryPatch();
      } else {
        debug(`constructed: ${storage.idShort} InMemoryPatch already exists`);
      }

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        debug(`constructed: ${storage.idShort} repatch`);
        const offSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => {
          debug(`constructed: ${storage.idShort} dataSet - calling save`);
          storage.memory.save(storage);
        });
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => {
          debug(`constructed: ${storage.idShort} dataAdd - calling save`);
          storage.memory.save(storage);
        });
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => {
          debug(`constructed: ${storage.idShort} dataDelete - calling save`);
          storage.memory.save(storage);
        });
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
        };
      };

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      await storage.state.repatch();
      
      // First save the initial data from patch to memory, then load
      if (storage.options.data) await storage.memory.save(storage);
      await storage.memory.load(storage);
      
      await storage.type.type.type.effect.call(storage, lifestate, args);

      storage.mounted();

    } else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      const options = args[0] || {};
      if (options.memory instanceof InMemoryPatch) {
        storage.options.memory = options.memory;
        await storage.state.repatch();
      }
      await storage.memory.load(storage);

      await storage.type.type.type.effect.call(storage, lifestate, args);
      storage.mounted();

    } else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.type.effect.call(storage, lifestate, args);
      await storage.unmounted();
    }
  };
};

export class InMemorySubscription {
  id: string = uuidv4();
  debug;
  constructor() {
    this.debug = Debug(`storage:in-memory-patch: ${this.id}`);
  }
  data: any = { data: [], updated_at: Date.now()};
  subscribers: Set<(payload: any) => void> = new Set();
  async subscribe(callback: (payload: any) => void) {
    this.subscribers.add(callback);
    callback(this.data);
    return () => this.subscribers.delete(callback);
  }
  async save(storage) {
    this.debug('save');
    this.data.data = [...storage.patch.data.data];
    this.data.updated_at = Date.now();
    storage.state.package.updated_at = this.data.updated_at;
    for (const subscriber of this.subscribers) {
      subscriber(this.data);
    }
  }
}

export function newStorageInMemorySubscription(deep) {
  const debug = Debug('storage:in-memory:subscription');

  deep.Storage.InMemory.Subscription = new deep.Storage.InMemory();
  deep.Storage.InMemory.Subscription.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      storage.type.type.type.effect.call(storage, lifestate, args);

      if (!(storage.options.memory instanceof InMemorySubscription)) {
        debug(`constructed: ${storage.idShort} new InMemorySubscription`);
        storage.options.memory = new InMemorySubscription();
      } else {
        debug(`constructed: ${storage.idShort} InMemorySubscription already exists`);
      }

      storage.state.debouncedUpdate = _.debounce(async (payload: any) => {
        debug(`constructed: ${storage.idShort} subscribe debounce`, payload);
        await storage.patch.update({ data: payload.data });
        // Note: updated_at is set in save() method instead
      }, 10, { leading: true })

      storage.state.repatch = () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => storage.memory.save(storage));
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => storage.memory.save(storage));
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => storage.memory.save(storage));
  
        const offSubscription = storage.memory.subscribe(_.debounce(async (payload: any) => {
          debug(`constructed: ${storage.idShort} subscribe`, payload);
          await storage.state.debouncedUpdate(payload);
        }, 10, { leading: true }));

        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
          offSubscription();
        };
      };
    }
    else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      storage.state.repatch();
      await storage.type.type.type.effect.call(storage, lifestate, args);
      storage.mounted();
    }
    else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      if (args[0].memory instanceof InMemorySubscription) {
        storage.options.memory = args[0].memory;
        storage.state.repatch();
      }

      await storage.type.type.type.effect.call(storage, lifestate, args);
      storage.mounted();
    }
    else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.type.effect.call(storage, lifestate, args);
      await storage.unmounted();
    }
  };
};

export class _Chokidar {
  debug;
  path: string;
  chokidar: any;
  storages: Set<any> = new Set();
  off: () => void;
  constructor(path: string) {
    this.path = path;
    this.debug = Debug(`chokidar: ${path}`);

    this.chokidar = chokidar.watch(path, {});

    this.off = () => {
      this.debug(`closing chokidar`);
      this.chokidar.close();
      _destroyers.delete(this.off);
    };
    _destroyers.add(this.off);
  
    this.chokidar
      .on('change', () => {
        this.debug(`change event - triggering load for ${this.storages.size} storages`);
        this.load();
      })
      .on('add', () => {
        this.debug(`add event - triggering load for ${this.storages.size} storages`);
        this.load();
      })
      .on('error', error => this.debug(`error`, error))
      .on('ready', () => {
        this.debug(`ready - ${this.storages.size} storages registered`);
        this.load();
      });
  }
  load() {
    this.debug(`load() called for ${this.storages.size} storages`);
    for (const storage of this.storages) {
      this.debug(`calling load() on storage ${storage.idShort}`);
      storage.load();
    }
  }
  save() {
    this.debug(`save() called for ${this.storages.size} storages`);
    for (const storage of this.storages) {
      this.debug(`calling save() on storage ${storage.idShort}`);
      storage.save();
    }
  }
}

export const _chokidars = new Map<string, () => void>(); // by paths
export function _chokidar(storage): () => void {
  let choki;
  if (!_chokidars.has(storage.options.path)) {
    choki = new _Chokidar(storage.options.path);
    _chokidars.set(storage.options.path, choki);
  } else {
    choki = _chokidars.get(storage.options.path);
  }
  choki.storages.add(storage);
  return () => {
    choki.storages.delete(storage);
    if (choki.storages.size === 0) {
      choki.off();
      _chokidars.delete(storage.options.path);
    }
  };
}

export function newStorageFsJsonSync(deep) {
  const debug = Debug('storage:fs-json-sync');

  deep.Storage.FsJsonSync = new deep.Storage();

  deep.Storage.FsJsonSync.load = new deep.Method(async function(this: any) {
    const storage = deep(this._source);
    debug(`load: ${storage.idShort}`, storage.options.path);
    if (fs.existsSync(storage.options.path)) {
      const fileContent = jsan.parse(fs.readFileSync(storage.options.path, 'utf8')) || { data: [] };
      const { data, ...pckg } = fileContent;
      debug(`load: ${storage.idShort} loaded`, data);
      await storage.patch.update({ data });
      storage.state.package = pckg;
    }
  });

  deep.Storage.FsJsonSync.save = new deep.Method(async function(this: any) {
    const storage = deep(this._source);
    debug(`save: ${storage.idShort}`, storage.patch.data.data);
    const updated_at = Date.now();
    fs.writeFileSync(storage.options.path, jsan.stringify({
      data: storage.patch.data.data,
      updated_at: updated_at,
    }), 'utf8');
    storage.state.package.updated_at = updated_at;
  });

  deep.Storage.FsJsonSync.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      storage.type.type.effect.call(storage, lifestate, args);

      if (typeof storage.options.path !== 'string') throw new Error('deep.Storage.FsJsonSync requires path option');

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => storage.save());
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => storage.save());
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => storage.save());
  
        const offWatcher = _chokidar(storage);
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
          offWatcher();
        };
      }

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      await storage.state.repatch();
      await storage.load();

      await storage.type.type.effect.call(storage, lifestate, args);
      storage.mounted();
    
    } else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      let repatch = false;
      if (args[0].path) {
        storage.options.path = args[0].path;
        repatch = true;
      }
      if (repatch) {
        await storage.state.repatch();
      }
      await storage.load();

      await storage.type.type.effect.call(storage, lifestate, args);
      storage.mounted();

    } else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

export function newStorageFsJsonAsync(deep) {
  const debug = Debug('storage:fs-json-async');

  deep.Storage.FsJsonAsync = new deep.Storage();

  deep.Storage.FsJsonAsync.load = new deep.Method(async function(this: any) {
    const storage = deep(this._source);
    debug(`load: ${storage.idShort}`, storage.options.path);
    try {
      const fileContent = jsan.parse(await fs.promises.readFile(storage.options.path, 'utf8')) || { data: [] };
      const { data, ...pckg } = fileContent;
      debug(`load: ${storage.idShort} loaded`, data);
      await storage.patch.update({ data });
      storage.state.package = pckg;
    } catch (e) {
      storage.error(e);
    }
  });

  deep.Storage.FsJsonAsync.save = new deep.Method(async function(this: any) {
    const storage = deep(this._source);
    debug(`save: ${storage.idShort}`, storage.patch.data.data);
    try {
      const updated_at = Date.now();
      await fs.promises.writeFile(storage.options.path, jsan.stringify({
        data: storage.patch.data.data,
        updated_at: updated_at,
      }), 'utf8');
      storage.state.package.updated_at = updated_at;
    } catch (e) {
      storage.error(e);
    }
  });

  deep.Storage.FsJsonAsync.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      storage.type.type.effect.call(storage, lifestate, args);

      if (typeof storage.options.path !== 'string') throw new Error('deep.Storage.FsJsonAsync requires path option');

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => storage.save());
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => storage.save());
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => storage.save());
  
        const offWatcher = _chokidar(storage);
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
          offWatcher();
        };
      };

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      await storage.state.repatch();
      await storage.load();

      await storage.type.type.effect.call(storage, lifestate, args);
      storage.mounted();
    
    } else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      let repatch = false;
      if (args[0].path) {
        storage.options.path = args[0].path;
        repatch = true;
      }
      if (repatch) {
        await storage.state.repatch();
      }
      await storage.load();

      await storage.type.type.effect.call(storage, lifestate, args);
      storage.mounted();
    
    }else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

export function newStorageGithubGists(deep) {
  const debug = Debug('storage:github-gists');

  async function load(storage) {
    debug(`github-gists: ${storage.idShort} load`, storage.options.path);
    const gist = await storage.options.octokit.rest.gists.get({ gist_id: storage.options.gist_id });
    if (gist?.status != 200) throw new Error(`Gist ${storage.options.gist_id} loading error`);
    const json = gist?.data?.files?.[storage.options.filename]?.content;
    const fileContent = jsan.parse(json || '{ data: [] }');
    const { data, ...pckg } = fileContent;
    await storage.patch.update({ data });
    storage.state.package = pckg;
  }

  async function save(storage) {
    debug(`github-gists: ${storage.idShort} save`, storage.patch.data.data);
    const updated_at = Date.now();
    await storage.options.octokit.rest.gists.update({
      gist_id: storage.options.gist_id,
      files: {
        [storage.options.filename]: {
          content: jsan.stringify({ 
            data: storage.patch.data.data,
            updated_at: updated_at,
          }),
        },
      },
    });
    storage.state.package.updated_at = updated_at;
  }

  deep.Storage.GithubGists = new deep.Storage();
  deep.Storage.GithubGists.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      storage.type.type.effect.call(storage, lifestate, args);

      if (typeof storage.options.gist_id !== 'string') throw new Error('deep.Storage.GithubGists requires gist_id option');
      if (typeof storage.options.octokit !== 'object') throw new Error('deep.Storage.GithubGists requires octokit option');
      if (typeof storage.options.filename !== 'string') throw new Error('deep.Storage.GithubGists requires filename option');

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => save(storage));
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => save(storage));
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => save(storage));
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
        };
      }

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      await storage.state.repatch();
      await load(storage);

      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      let repatch = false;
      if (args[0].gist_id) {
        storage.options.gist_id = args[0].gist_id;
        repatch = true;
      }
      if (args[0].octokit) {
        storage.options.octokit = args[0].octokit;
        repatch = true;
      }
      if (args[0].filename) {
        storage.options.filename = args[0].filename;
        repatch = true;
      }
      if (repatch) {
        await storage.state.repatch();
      }
      await load(storage);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

export function newStorageWsClient(deep) {
  const debug = Debug('storage:ws-client');

  /**
   * load => patch <=
   * add =>
   * delete =>
   * set =>
   */

  async function send(storage, data) {
    debug(`ws-client: ${storage.idShort} send`, data);
    storage.options.ws.send(jsan.stringify(data));
  }

  deep.Storage.WsClient = new deep.Storage();
  deep.Storage.WsClient.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);

      if (typeof storage.options.ws !== 'object') throw new Error('deep.Storage.WsClient requires ws option');

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, (...args: any) => {
          const delta = deep.getDelta(deep.events.dataSet, args);
          delta.updated_at = Date.now();
          storage.state.package.updated_at = delta.updated_at;
          send(storage, delta);
        });
        const offAdd = storage.patch.data.on(deep.events.dataAdd, (...args: any) => {
          const delta = deep.getDelta(deep.events.dataAdd, args);
          delta.updated_at = Date.now();
          storage.state.package.updated_at = delta.updated_at;
          send(storage, delta);
        });
        const offDelete = storage.patch.data.on(deep.events.dataDelete, (...args: any) => {
          const delta = deep.getDelta(deep.events.dataDelete, args);
          delta.updated_at = Date.now();
          storage.state.package.updated_at = delta.updated_at;
          send(storage, delta);
        });

        const listener = async (message: any) => {
          const data = jsan.parse(message.toString());
          debug(`ws-client: ${storage.idShort} message`, data);
          if (data.type === 'patch' || data.type === 'load') {
            await storage.patch.update({ data: data.payload });
            storage.state.package.updated_at = data.updated_at || Date.now();
            if (data.type === 'load') send(storage, {
              type: 'patch',
              payload: storage.patch.data.data,
              updated_at: storage.state.package.updated_at,
            });
          } else if (data.type === 'add' || data.type === 'delete' || data.type === 'set') {
            deep.setDelta(storage.patch.data, data.payload);
            storage.state.package.updated_at = data.updated_at || Date.now();
          }
        };
        storage.options.ws.on('message', listener);

        const offWs = () => storage.options.ws.removeListener('message', listener);
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
          offWs();
        };
      }

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();

      send(storage, {
        type: 'load',
        payload: storage.patch.data.data,
        updated_at: storage.state.package.updated_at,
      });

      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      let repatch = false;
      if (args[0].ws) {
        storage.options.ws = args[0].ws;
        repatch = true;
      }
      if (repatch) {
        await storage.state.repatch();
      }
      send(storage, {
        type: 'load',
        payload: storage.patch.data.data,
        updated_at: storage.state.package.updated_at,
      });

      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

export function newStorageHasyxSubscription(deep) {
  const debug = Debug('storage:hasyx-subscription');

  deep.Storage.HasyxSubscription = new deep.Storage();
  deep.Storage.HasyxSubscription.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);

      if (typeof storage.options.hasyx !== 'object') throw new Error('deep.Storage.HasyxSubscription requires hasyx option');
      if (typeof storage.options.table !== 'string') storage.options.table = 'deep_links';
      if (typeof storage.options.query !== 'object') throw new Error('deep.Storage.HasyxSubscription requires hasyx.query option');

      storage.state.repatch = async () => {
        storage?.state?.off && storage?.state?.off();

        const offSet = storage.patch.data.on(deep.events.dataSet, async (payload: any) => {
          const mutation = {
            table: storage.options.table,
            object: payload,
            on_conflict: {
              constraint: 'links_pkey',
              update_columns: ['type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'updated_at'],
              where: {
                id: { _eq: payload.id },
                updated_at: { _lt: payload.updated_at },
              },
            },
          };
          debug(`hasyx-subscription: ${storage.idShort} set`, mutation);
          await storage.options.hasyx.insert(mutation);
          storage.state.package.updated_at = Date.now();
        });
        const offAdd = storage.patch.data.on(deep.events.dataAdd, async (payload: any) => {
          const mutation = {
            table: storage.options.table,
            object: payload,
            on_conflict: {
              constraint: 'links_pkey',
              update_columns: ['type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'updated_at'],
              where: {
                id: { _eq: payload.id },
                updated_at: { _lt: payload.updated_at },
              },
            },
          };
          debug(`hasyx-subscription: ${storage.idShort} add`, mutation);
          await storage.options.hasyx.insert(mutation);
          storage.state.package.updated_at = Date.now();
        });
        const offDelete = storage.patch.data.on(deep.events.dataDelete, async (payload: any) => {
          const mutation = {
            table: storage.options.table,
            where: {
              id: { _eq: payload.id },
            },
          };
          debug(`hasyx-subscription: ${storage.idShort} delete`, mutation);
          await storage.options.hasyx.delete(mutation);
          storage.state.package.updated_at = Date.now();
        });
  
        const subscription = storage.options.hasyx.subscribe(storage.options.query);
        const sub = subscription.subscribe((payload: any) => {
          debug(`hasyx-subscription: ${storage.idShort} subscribe`, payload);
          storage.patch.update({ data: payload });
          // For hasyx implementation, we use the time when update was received, not json.updated_at
          storage.state.package.updated_at = Date.now();
        });
        const offSubscription = () => {
          sub.unsubscribe();
          _destroyers.delete(offSubscription);
        };
        _destroyers.add(offSubscription);
  
        storage.state.off = () => {
          offSet();
          offAdd();
          offDelete();
          offSubscription();
        };
      };

    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${storage.idShort}`);

      await storage.patch.mount();
      await storage.state.repatch();

      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Updating) {
      debug(`updating: ${storage.idShort}`);

      let repatch = false;
      if (args[0].hasyx) {
        storage.options.hasyx = args[0].hasyx;
        repatch = true;
      }
      if (args[0].table) {
        storage.options.table = args[0].table;
        repatch = true;
      }
      if (args[0].query) {
        storage.options.query = args[0].query;
        repatch = true;
      }
      if (repatch) {
        await storage.state.repatch();
      }
      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${storage.idShort}`);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

export function newStorages(deep) {
  newStorage(deep);
  newStorageInMemory(deep);
  newStorageInMemoryPatch(deep);
  newStorageInMemorySubscription(deep);
  newStorageFsJsonSync(deep);
  newStorageFsJsonAsync(deep);
  newStorageGithubGists(deep);
  newStorageWsClient(deep);
  newStorageHasyxSubscription(deep);
};
