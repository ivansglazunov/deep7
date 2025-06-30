import { _destroy, newDeep } from '.';
import { _delay } from './_promise';
import fs from 'fs';
import Debug from './debug';

// сторедж поддерживает актуальный patch на основании данных из удаленного ресурса
// уже на его основе можно поддерживать диапозон ассоциаций в надстройке packager

const debug = Debug('storage:test');

async function space(deep, callback) {
  await callback(deep);
  return deep;
};

const cwd = process.cwd();

async function universalTest({
  createrStorage,
  watcherStorage,
  updaterStorage,
  updateStorage,
}) {
  // creater can create
  const deep1 = await space(newDeep(), async (deep) => {
    deep.storage = createrStorage(deep, new deep.Array([]));
    debug(`creater deep: ${deep.idShort} storage: ${deep.storage.idShort}`);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.state.package.updated_at).toBeDefined();
    expect(typeof deep.storage.state.package.updated_at).toBe('number');
    deep.storage.patch.data.add({ id: 1, value: 'A' });
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // watcher can watch
  const deep2 = await space(newDeep(), async (deep) => {
    deep.storage = watcherStorage(deep);
    debug(`watcher deep: ${deep.idShort} storage: ${deep.storage.idShort}`);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.state.package.updated_at).toBeDefined();
    expect(typeof deep.storage.state.package.updated_at).toBe('number');
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // updater can update
  const deep3 = await space(newDeep(), async (deep) => {
    deep.storage = updaterStorage(deep);
    debug(`updater deep: ${deep.idShort} storage: ${deep.storage.idShort}`);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.state.package.updated_at).toBeDefined();
    expect(typeof deep.storage.state.package.updated_at).toBe('number');
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
    const beforeUpdate = deep.storage.state.package.updated_at;
    deep.storage.patch.data.add({ id: 2, value: 'B' });
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }, { id: 2, value: 'B' }]);
    // package.updated_at should be updated after data modification for some storage types
  });
  // creater see updates
  await space(deep1, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }, { id: 2, value: 'B' }]);
  });
  // watcher see updated
  await space(deep2, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }, { id: 2, value: 'B' }]);
  });
  // updater can delete
  await space(deep3, async (deep) => {
    const el = deep.storage.patch.data.data.find((el) => el.id == 1);
    deep.storage.patch.data.delete(el);
    expect(deep.storage.patch.data.data).toEqual([{ id: 2, value: 'B' }]);
  });
  // creater see updated
  await space(deep1, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([{ id: 2, value: 'B' }]);
  });
  // watcher see updated
  await space(deep2, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([{ id: 2, value: 'B' }]);
  });
  
  // Test deletion and recreation scenario for tracking remote removals
  // Store the initial updated_at times for comparison
  let deep1UpdatedAt, deep2UpdatedAt, deep3UpdatedAt;
  await space(deep1, async (deep) => {
    deep1UpdatedAt = deep.storage.state.package.updated_at;
  });
  await space(deep2, async (deep) => {
    deep2UpdatedAt = deep.storage.state.package.updated_at;
  });
  await space(deep3, async (deep) => {
    deep3UpdatedAt = deep.storage.state.package.updated_at;
  });
  
  // updater deletes the remaining element
  await space(deep3, async (deep) => {
    const el = deep.storage.patch.data.data.find((el) => el.id == 2);
    deep.storage.patch.data.delete(el);
    expect(deep.storage.patch.data.data).toEqual([]);
    // package.updated_at should be updated after deletion for storage that support it
    expect(deep.storage.state.package.updated_at).toBeGreaterThanOrEqual(deep3UpdatedAt);
  });
  
  // All storages should see the deletion
  await space(deep1, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([]);
  });
  
  await space(deep2, async (deep) => {
    await updateStorage(deep);
    expect(deep.storage.patch.data.data).toEqual([]);
  });
};

afterAll(() => {
  _destroy();
});

describe('storage', () => {
  describe('in-memory', () => {
    it('patch', async () => {
      let memory;
      await universalTest({
        createrStorage: (deep, data = []) => {
          const storage = new deep.Storage.InMemory.Patch({ data });
          memory = storage.memory;
          return storage;
        },
        watcherStorage: (deep) => {
          return new deep.Storage.InMemory.Patch({
            memory,
          });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.InMemory.Patch({
            memory,
          });
        },
        updateStorage: async (deep) => {
          await deep.storage.update();
        },
      });
    });
    it('subscription', async () => {
      let memory;
      await universalTest({
        createrStorage: (deep, data = []) => {
          const storage = new deep.Storage.InMemory.Subscription({ data });
          memory = storage.memory;
          return storage;
        },
        watcherStorage: (deep) => {
          return new deep.Storage.InMemory.Subscription({
            memory,
          });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.InMemory.Subscription({
            memory,
          });
        },
        updateStorage: async (deep) => {
          await _delay(100);
        },
      });
    }, 120000);
  });
  describe('fs-json', () => {
    it('sync', async () => {
      try { fs.unlinkSync(`${cwd}/storage.fs-json-sync.deep7.json`) } catch (e) {}
      await universalTest({
        createrStorage: (deep, data = []) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/storage.fs-json-sync.deep7.json`,
          });
        },
        watcherStorage: (deep) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/storage.fs-json-sync.deep7.json`,
          });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/storage.fs-json-sync.deep7.json`,
          });
        },
        updateStorage: async (deep) => {
          await _delay(500);
        },
      });
    }, 120000);
    it('async', async () => {
      try { fs.unlinkSync(`${cwd}/storage.fs-json-async.deep7.json`) } catch (e) {}
      await universalTest({
        createrStorage: (deep, data = []) => {
          return new deep.Storage.FsJsonAsync({
            path: `${cwd}/storage.fs-json-async.deep7.json`,
          });
        },
        watcherStorage: (deep) => {
          return new deep.Storage.FsJsonAsync({
            path: `${cwd}/storage.fs-json-async.deep7.json`,
          });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.FsJsonAsync({
            path: `${cwd}/storage.fs-json-async.deep7.json`,
          });
        },
        updateStorage: async (deep) => {
          await _delay(1000);
          await deep.storage.load(); // Explicitly reload from file
          await _delay(1000);
        },
      });
    }, 180000);
  });
});
