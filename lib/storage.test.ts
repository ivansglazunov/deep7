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
    deep.storage.patch.data.add({ id: 1, value: 'A' });
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // watcher can watch
  const deep2 = await space(newDeep(), async (deep) => {
    deep.storage = watcherStorage(deep);
    debug(`watcher deep: ${deep.idShort} storage: ${deep.storage.idShort}`);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // updater can update
  const deep3 = await space(newDeep(), async (deep) => {
    deep.storage = updaterStorage(deep);
    debug(`updater deep: ${deep.idShort} storage: ${deep.storage.idShort}`);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
    deep.storage.patch.data.add({ id: 2, value: 'B' });
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }, { id: 2, value: 'B' }]);
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
    });
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
    });
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
          await _delay(500);
        },
      });
    }, 120000);
  });
});
