import { newDeep } from '..';
import { _delay } from '../_promise';
import fs from 'fs';
import { _unwatch } from './fs-json-sync';

const cwd = process.cwd();

beforeAll(async () => {
  fs.rmSync(`${cwd}/fs-json-sync.tools1.deep7.json`, { recursive: true, force: true });
  fs.rmSync(`${cwd}/fs-json-sync.tools2.deep7.json`, { recursive: true, force: true });
  fs.rmSync(`${cwd}/fs-json-sync.tools3.deep7.json`, { recursive: true, force: true });
  fs.rmSync(`${cwd}/fs-json-sync.personal1.deep7.json`, { recursive: true, force: true });
});

afterAll(async () => {
  _unwatch();
});

it('packager:fs-json-sync', async () => {
  // <deep1>
  // some who make tools
  const { deep1, storage1_tools1, storage1_tools2, storage1_tools3 } = await (async () => {
    const deep1 = newDeep();

    // for example I created three sets of tools
    const tools1 = new deep1.Package('tools1', '0.0.0');
    const tools2 = new deep1.Package('tools2', '0.0.0');
    const tools3 = new deep1.Package('tools3', '0.0.0');

    // and fill it with some things... as A B C
    tools1.A = new deep1();
    tools2.B = new deep1();
    tools3.C = new deep1();

    // next i sync tools with some storages
    const storage1_tools1 = new deep1.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools1.deep7.json`,
      package: tools1,
    });
    expect(storage1_tools1.package.is(tools1)).toBe(true); // package is available in storage, because we send it to storage
    await storage1_tools1.mount(); // launch mounting = enable storage syncing

    const storage1_tools2 = new deep1.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools2.deep7.json`,
      package: tools2,
    });
    await storage1_tools2.mount(); // any initial errors will be throw here and unmount storage

    const storage1_tools3 = new deep1.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools3.deep7.json`,
      package: tools3,
    });
    await storage1_tools3.mount(); // one memory is { package: { name, version }, data: L[], deps: { name: semver } }

    // let's check that everything is ok
    await (async () => {

      // no errors
      expect(storage1_tools1.errors).toEqual([]);
      expect(storage1_tools2.errors).toEqual([]);
      expect(storage1_tools3.errors).toEqual([]);

      // and data in memory is correct
      // we use .load() for double loade from storage into local memory
      expect((await storage1_tools1.load()).data).toEqual([
        storage1_tools1.serialize(tools1.A),
      ]);
      expect((await storage1_tools2.load()).data).toEqual([
        storage1_tools2.serialize(tools2.B),
      ]);
      expect((await storage1_tools3.load()).data).toEqual([
        storage1_tools3.serialize(tools3.C),
      ]);
    })();

    return { deep1, storage1_tools1, storage1_tools2, storage1_tools3 };
  })();
  // </deep1>

  // <deep2>
  // some who use tools
  const { deep2, storage2_tools1, storage2_tools2, storage2_tools3, storage2_personal1, a2, b2, c2 } = await (async () => {
    const deep2 = newDeep();

    // next i sync tools from stores
    const storage2_tools1 = new deep2.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools1.deep7.json`,
    });
    await storage2_tools1.mount(); // after mounting is fully done, we already synced with store
    const { A: A2 } = storage2_tools1.package; // .package from storage available if storage contain package or we send package to storage

    const storage2_tools2 = new deep2.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools2.deep7.json`,
      subscribe: false,
    });
    storage2_tools2.mount(); // and we can just launch mounting
    await storage2_tools2.promise; // and wait for lifestate to be fully changed
    const { B: B2 } = storage2_tools2.package;

    const storage2_tools3 = new deep2.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools3.deep7.json`,
    });
    await storage2_tools3.mount();
    const { C: C2 } = storage2_tools3.package;

    const a2 = new A2;
    a2.value = new deep2.String('aaa');
    const b2 = new B2;
    b2.value = new deep2.String('bbb');
    const c2 = new C2;
    c2.value = new deep2.String('ccc');

    const storage2_personal1 = new deep2.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.personal1.deep7.json`,
      data: deep2.query({
        _or: [
          { type: A2 },
          { type: B2 },
          { type: C2 },
        ],
      }),
    });
    await storage2_personal1.mount();

    await (async () => {
      expect(storage2_tools1.errors).toEqual([]);
      expect(storage2_tools2.errors).toEqual([]);
      expect(storage2_tools3.errors).toEqual([]);
      expect(storage2_personal1.errors).toEqual([]);

      expect((await storage2_personal1.load()).data).toEqual([
        storage2_personal1.serialize(a2),
        storage2_personal1.serialize(b2),
        storage2_personal1.serialize(c2),
      ]);
    })();

    return { deep2, storage2_tools1, storage2_tools2, storage2_tools3, storage2_personal1, a2, b2, c2 };
  })();
  // </deep2>

  // <deep3>
  // some who continue personal experience
  const { deep3, storage3_personal1 } = await (async () => {
    const deep3 = newDeep();

    const storage3_personal1 = new deep3.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.personal1.deep7.json`,
    });
    await storage3_personal1.mount();

    const a3 = deep3(a2._id);
    const b3 = deep3(b2._id);
    const c3 = deep3(c2._id);

    await (async () => {
      // wow! we can see all storage syncing errors here
      expect(storage3_personal1.errors).toEqual([
        `Failed to deserialize (${a2._id}), .type (tools1/A) not founded.`,
        `Failed to deserialize (${a2._id}), .value (${a2.value_id}) not founded.`,
        `Failed to deserialize (${b2._id}), .type (tools2/B) not founded.`,
        `Failed to deserialize (${b2._id}), .value (${b2.value_id}) not founded.`,
        `Failed to deserialize (${c2._id}), .type (tools3/C) not founded.`,
        `Failed to deserialize (${c2._id}), .value (${c2.value_id}) not founded.`,
      ]);

      // but storage still active and sync with source
      expect(storage3_personal1.isMounted).toBe(true);

      // but all recoverable things othervi recovered
      expect(deep3._ids.has(a2._id)).toBe(true);
      expect(deep3._ids.has(b2._id)).toBe(true);
      expect(deep3._ids.has(c2._id)).toBe(true);

      // of course without failed parts
      expect(a3.type_id).toBe(undefined);
      expect(b3.type_id).toBe(undefined);
      expect(c3.type_id).toBe(undefined);

      // of course we can see everything in storage result
      expect(storage3_personal1.ids.size).toBe(3);
    })();

    return { deep3, storage3_personal1 };
  })();
  // </deep3>

  // <deep2>
  // some who feel, need to fill store with values...
  // for now we don't recreate deep2 and storages for example
  await (async () => {
    // deep2 already exists, we dont need to recreate

    const { A: A2 } = storage2_tools1.package;
    const { B: B2 } = storage2_tools2.package;
    const { C: C2 } = storage2_tools3.package;

    // we already now what thinkg we whant to sync
    const data = deep2.query({
      _or: [
        { type: A2 },
        { type: B2 },
        { type: C2 },
        // but we want values of it too
        { valued: { _or: [
          { type: A2 },
          { type: B2 },
          { type: C2 },
        ] } },
      ],
    });

    await storage2_personal1.update({
      data,
    });

    await (async () => {
      // synced? fully!
      expect(storage2_personal1.ids.size).toBe(6);
      // in storage2 in deep2 we have tools1-3 and no errors:
      expect(storage2_personal1.errors).toEqual([]);
      // in deep3 tools1-3 are not loaded from storages, so we have errors:
      // await storage3_personal1.update();
      await _delay(100); // await for watch sync to storage3
      expect(storage3_personal1.ids.size).toBe(6);
      expect(storage3_personal1.errors).toEqual([
        `Failed to deserialize (${a2._id}), .type (tools1/A) not founded.`,
        `Failed to deserialize (${b2._id}), .type (tools2/B) not founded.`,
        `Failed to deserialize (${c2._id}), .type (tools3/C) not founded.`,
      ]);

      expect((await storage2_personal1.load()).data).toEqual([
        storage2_personal1.serialize(a2),
        storage2_personal1.serialize(b2),
        storage2_personal1.serialize(c2),
        storage2_personal1.serialize(a2.value),
        storage2_personal1.serialize(b2.value),
        storage2_personal1.serialize(c2.value),
      ]);
    })();

    return {};
  })();
  // </deep2>

  // <deep3>
  // ok, return here, lets load storages for fix errors
  await (async () => {

    // sync from existed tools storages
    const storage3_tools1 = new deep3.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools1.deep7.json`,
    });
    await storage3_tools1.mount(); // and await mounting

    const storage3_tools2 = new deep3.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools2.deep7.json`,
      subscribe: false,
    });
    await storage3_tools2.mount();

    const storage3_tools3 = new deep3.Storage.FsJsonSync({
      path: `${cwd}/fs-json-sync.tools3.deep7.json`,
    });
    await storage3_tools3.mount();

    await (async () => {
      // lets manually update and check errors after
      await storage3_personal1.update();
      expect(storage3_personal1.errors).toEqual([]); // no errors!
    })();

    return {};
  })();
  // </deep3>
});
