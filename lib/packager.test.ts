import { _destroy, newDeep } from '.';
import { _delay } from './_promise';
import fs from 'fs';
import Debug from './debug';

const debug = Debug('packager:test');

async function space(deep, callback) {
  await callback(deep);
  return deep;
}

const cwd = process.cwd();

async function packagedUniversalTest({
  createStorage,
  watcherStorage,
  updaterStorage,
  updateStorage,
}) {
  // create of new package without name&version
  const deep1 = await space(newDeep(), async (deep) => {
    deep.storage = createStorage(deep, new deep.Array([]));
    const tool1 = new deep.Package('tool1');
    deep.packager = new deep.Packager({ storage: deep.storage, package: tool1 });
    const pckg = deep.packager.package;
    expect(deep.packager.package.packageName).toBe('tool1');
    expect(deep.packager.package.data).toEqual({ name: 'tool1', version: undefined });
    await deep.packager.mount();
  });

  // watcher exists
  const deep3 = await space(newDeep(), async (deep) => {
    deep.storage = watcherStorage(deep);
    deep.packager = new deep.Packager({ storage: deep.storage });
    await deep.packager.mount();
    console.log('deep.storage.memory.data', deep.storage.memory.data);
    console.log('deep.storage.patch.data.data', deep.storage.patch.data.data);
    console.log('deep.storage.memory.id', deep.storage.memory.id);
    expect(deep?.storage?.memory?.data?.name).toBe('tool1');
  });

  // add link to package
  const deep2 = await space(newDeep(), async (deep) => {
    deep.storage = updaterStorage(deep);
    deep.packager = new deep.Packager({ storage: deep.storage });
    await deep.packager.mount();
    console.log('deep.storage.memory.data', deep.storage.memory.data);
    console.log('START');
    deep.packager.package.a = deep();
    console.log('END');
    console.log('deep.packager.package.a:', deep.packager.package.a);
    console.log('deep.packager.package.a.path():', deep.packager.package.a.path());
    console.log('deep.packager.package.a.material:', deep.packager.package.a.material);
    console.log('deep.storage.memory.data', deep.storage.memory.data);
    console.log('deep.storage.memory.id', deep.storage.memory.id);
    expect(deep?.packager?.package?.packageName).toBe('tool1');
    expect(deep?.storage?.memory?.data?.name).toBe('tool1');
    expect(deep.packager.package.a.path()).toBe('tool1/a');
    await deep.packager.update();
  });

  // watcher can see package.a
  await space(deep3, async (deep) => {
    await updateStorage(deep);
    // Force reload from memory
    if (deep.storage.memory && deep.storage.memory.load) {
      await deep.storage.memory.load(deep.storage);
      console.log('force reloaded from memory');
    }
    console.log('deep.storage.memory.data', deep.storage.memory.data);
    console.log('deep.storage.memory.data.data', deep.storage.memory.data.data);
    console.log('deep.storage.patch.data.data', deep.storage.patch.data.data);
    console.log('deep.storage.memory.id', deep.storage.memory.id);
    deep.packager.package.logtree();
    console.log('deep.packager.children', deep.packager.children);
    console.log('deep.packager.children.size', deep.packager.children.size);
    console.log('deep.packager.children.first', deep.packager.children.first);
    expect(!!deep.packager.package.a).toBe(true);
  });

  // add link to package
  // const deep3 = await space(newDeep(), async (deep) => {
  //   deep.storage = watcherStorage(deep);
  //   deep.packager = new deep.Packager({ storage: deep.storage });
  //   await deep.packager.mount();
  //   deep.packager.package.a = deep();
  //   await deep.packager.update();
  //   console.log(deep.packager.storage.memory);
  //   console.log(deep.packager.storage.memory.data.data);
  //   return deep.packager;
  // });

  // // creater can create packager
  // const deep1 = await space(newDeep(), async (deep) => {
  //   const storage = createStorage(deep, new deep.Array([...testMaterials]));
  //   const packager = new deep.Packager({ storage });
    
  //   debug(`creater deep: ${deep.idShort} packager: ${packager.idShort}`);
    
  //   await packager.mount();
  //   expect(packager.isMounted).toBe(true);
  //   expect(packager.storage.state.package.updated_at).toBeDefined();
  //   expect(typeof packager.storage.state.package.updated_at).toBe('number');
    
  //   // Check package properties
  //   expect(packager.package).toBeDefined();
  //   expect(packager.package.name).toBeDefined();
    
  //   // Check data set contains dematerialized associations
  //   expect(packager.children).toBeDefined();
  //   expect(packager.children.data.length).toBeGreaterThan(0);
    
  //   // Check named associations are accessible via package
  //   expect(packager.package.testString).toBeDefined();
  //   expect(packager.package.testNumber).toBeDefined();
  //   expect(packager.package.testLink).toBeDefined();
    
  //   debug('packager.children.data:', packager.children.data.map(a => ({ id: a._id, path: a.path() })));
  // });
  
  // // watcher can watch
  // const deep2 = await space(newDeep(), async (deep) => {
  //   const storage = watcherStorage(deep);
  //   const packager = new deep.Packager({ storage });
    
  //   debug(`watcher deep: ${deep.idShort} packager: ${packager.idShort}`);
    
  //   await packager.mount();
  //   expect(packager.isMounted).toBe(true);
  //   expect(packager.storage.state.package.updated_at).toBeDefined();
  //   expect(typeof packager.storage.state.package.updated_at).toBe('number');
    
  //   // Should see the same data as creater
  //   expect(packager.children.data.length).toBeGreaterThan(0);
  //   expect(packager.package.testString).toBeDefined();
  //   expect(packager.package.testNumber).toBeDefined();
  //   expect(packager.package.testLink).toBeDefined();
  // });
  
  // // updater can update
  // const deep3 = await space(newDeep(), async (deep) => {
  //   const storage = updaterStorage(deep);
  //   const packager = new deep.Packager({ storage });
    
  //   debug(`updater deep: ${deep.idShort} packager: ${packager.idShort}`);
    
  //   await packager.mount();
  //   expect(packager.isMounted).toBe(true);
  //   expect(packager.storage.state.package.updated_at).toBeDefined();
  //   expect(typeof packager.storage.state.package.updated_at).toBe('number');
    
  //   // Initial state check
  //   expect(packager.children.data.length).toBeGreaterThan(0);
  //   const initialCount = packager.children.data.length;
    
  //   // Add new material
  //   const newMaterial = {
  //     id: 'addedString',
  //     string: 'Added String',
  //     created_at: Date.now(),
  //     updated_at: Date.now(),
  //   };
    
  //   packager.storage.patch.data.add(newMaterial);
    
  //   // Should have one more item
  //   expect(packager.children.data.length).toBe(initialCount + 1);
  //   expect(packager.package.addedString).toBeDefined();
  //   expect(packager.package.addedString.data).toBe('Added String');
  // });
  
  // // creater sees updates
  // await space(deep1, async (deep) => {
  //   await updateStorage(deep);
  //   const packager = deep._packager; // Assuming we store reference
  //   if (packager) {
  //     expect(packager.package.addedString).toBeDefined();
  //   }
  // });
  
  // // watcher sees updates  
  // await space(deep2, async (deep) => {
  //   await updateStorage(deep);
  //   const packager = deep._packager;
  //   if (packager) {
  //     expect(packager.package.addedString).toBeDefined();
  //   }
  // });
  
  // // updater can delete
  // await space(deep3, async (deep) => {
  //   const packager = deep._packager;
  //   if (packager) {
  //     const itemToDelete = packager.storage.patch.data.data.find((item) => item.id === 'testString');
  //     if (itemToDelete) {
  //       packager.storage.patch.data.delete(itemToDelete);
  //       expect(packager.package.testString).toBeUndefined();
  //     }
  //   }
  // });
}

afterAll(() => {
  _destroy();
});

describe.skip('packager', () => {
  it('deep.Package', () => {
    const deep = newDeep();
    const pckg = new deep.Package('test');
    expect(pckg.packageName).toBe('test');
    expect(pckg.packageVersion).toBeUndefined();
    pckg.packageVersion = '1.0.0';
    expect(pckg.packageVersion).toBe('1.0.0');
    pckg.logtree();
    deep.Global.logtree();
    expect(deep.Global.test.is(pckg)).toBe(true);
    deep.path('test').is(pckg);
  });
  describe('in-memory', () => {
    it('patch', async () => {
      let memory;
      await packagedUniversalTest({
        createStorage: (deep, data) => {
          const storage = new deep.Storage.InMemory.Patch({ data });
          memory = storage.memory;
          return storage;
        },
        watcherStorage: (deep) => {
          return new deep.Storage.InMemory.Patch({ memory });
        },
        updaterStorage: (deep) => {
          return new deep.Storage.InMemory.Patch({ memory });
        },
        updateStorage: async (deep) => {
          await deep.storage?.update();
        },
      });
    });
  });
});
