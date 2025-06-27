import Debug from "./debug";
import fs from 'fs';
import jsan from 'jsan';

export function newStorage(deep) {
  const debug = Debug('storage');

  deep.Storage = new deep.Lifecycle();

  deep.Storage.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug('Constructed', args);
      if (typeof args[0] !== 'object') throw new Error('deep.Storage constructor requires options arg');
      const options = args[0];
      storage.state.options = options;

      let array = options?.array;
      let patch = options?.patch;
      if (!array && !patch) array = new deep.Array([]);
      if (!patch) patch = new deep.Patch({ data: array });

      storage.state.patch = patch;

    } else if (lifestate === deep.Mounting) {
      debug('Mounting', args);
      await storage.state.patch.mount();
      await storage.mounted();

    } else if (lifestate === deep.Updating) {
      debug('Updating', args);
      await storage.mounted();

    } else if (lifestate === deep.Unmounting) {
      debug('Unmounting', args);
      await storage.state.patch.unmount();
      storage.state.patch.destroy();
      await storage.unmounted();
    }
  };
}

export function newStorageInMemory(deep) {
  const debug = Debug('storage:in-memory');

  deep.Storage.InMemory = new deep.Storage();
  deep.Storage.InMemory.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug('Constructed', args);
      await storage.type.type.effect.call(storage, lifestate, args);

    } else if (lifestate === deep.Mounting) {
      debug('Mounting', args);
      await storage.type.type.effect.call(storage, lifestate, args);

    } else if (lifestate === deep.Updating) {
      debug('Updating', args);
      await storage.type.type.effect.call(storage, lifestate, args);

    } else if (lifestate === deep.Unmounting) {
      debug('Unmounting', args);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};

/**
 * deep.Storage.FsJsonSync({
 *  path: string;
 *  chokidar?: {};
 * });
 */
export function newStorageFsJsonSync(deep) {
  const debug = Debug('storage:fs-json-sync');

  deep.Storage.FsJsonSync = new deep.Storage();
  deep.Storage.FsJsonSync.effect = async function(this: any, lifestate: any, args: any[]) {
    const storage = this;
    if (lifestate === deep.Constructed) {
      debug('Constructed', args);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Mounting) {
      debug('Mounting', args);
      if (fs.existsSync(storage.state.options.path)) {
        const data = jsan.parse(fs.readFileSync(storage.state.options.path, 'utf8'));
        storage.state.patch.update({ data });
      }
      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Updating) {
      debug('Updating', args);
      if (fs.existsSync(storage.state.options.path)) {
        const data = jsan.parse(fs.readFileSync(storage.state.options.path, 'utf8'));
        storage.state.patch.update({ data });
      }
      await storage.type.type.effect.call(storage, lifestate, args);
    }
    else if (lifestate === deep.Unmounting) {
      debug('Unmounting', args);
      await storage.type.type.effect.call(storage, lifestate, args);
    }
  };
};
