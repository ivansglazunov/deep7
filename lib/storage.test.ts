import { _destroy, newDeep } from '.';
import { _delay } from './_promise';
import fs from 'fs';

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
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    deep.storage.patch.data.add({ id: 1, value: 'A' });
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // watcher can watch
  const deep2 = await space(newDeep(), async (deep) => {
    deep.storage = watcherStorage(deep);
    await deep.storage.mount();
    expect(deep.storage.isMounted).toBe(true);
    expect(deep.storage.patch.data.data).toEqual([{ id: 1, value: 'A' }]);
  });
  // updater can update
  const deep3 = await space(newDeep(), async (deep) => {
    deep.storage = updaterStorage(deep);
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
          await _delay(20);
        },
      });
    });
  });
  describe('fs-json', () => {
    it('sync', async () => {
      fs.unlinkSync(`${cwd}/fs-json-sync.deep7.json`);
      await universalTest({
        createrStorage: (deep, data = []) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/fs-json-sync.deep7.json`,
          });
        },
        watcherStorage: (deep) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/fs-json-sync.deep7.json`,
          });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.FsJsonSync({
            path: `${cwd}/fs-json-sync.deep7.json`,
          });
        },
        updateStorage: async (deep) => {
          await _delay(20);
        },
      });
    });
  });
});
