import dotenv from 'dotenv';
import fs from 'fs';
import jsan from 'jsan';
import { newDeep } from '.';
import Debug from './debug';
import { _delay } from './_promise';
// import { _searchLostElements } from './storage';
// import { newStorageJson, restoreDeep } from './storage-json';

dotenv.config();

const cwd = process.cwd();

const debug = Debug('storage:json:test');

describe.skip('deep.StorageJson', () => {
  // let destroyers: any[] = [];
  
  // afterAll(() => {
  //   destroyers.forEach(destroyer => destroyer());
  // });
  
  // it('full cycle', async () => {
  //   if (fs.existsSync(`${cwd}/storage-json-test.deep7.json`)) {
  //     fs.unlinkSync(`${cwd}/storage-json-test.deep7.json`);
  //   }

  //   // Check basic local->storage sync
  //   const deep1 = newDeep();
  //   debug('🟢 deep1._id', deep1._id);
  //   const count1_0 = deep1._ids.size;
  //   const StorageJson = newStorageJson(deep1);
  //   const count1_1 = deep1._ids.size;
  //   expect(count1_0).toBe(count1_1 - 1);

  //   const storage1 = new StorageJson({
  //     path: `${cwd}/storage-json-test.deep7.json`,
  //   });
  //   destroyers.push(() => storage1.destroy());
  //   debug('🟢 storage1._id', storage1._id);

  //   const count1_2 = deep1._ids.size;
  //   expect(count1_1).toBe(count1_2 - 1);
  //   expect(storage1?.promise instanceof Promise).toBe(true);
  //   const count1_3 = deep1._ids.size;
  //   expect(count1_2).toBe(count1_3);
  //   const ids1_1 = new Set(deep1._ids);

  //   await storage1.promise;

  //   const count1_4 = deep1._ids.size;
  //   const ids1_2 = new Set(deep1._ids);

  //   // expect(Array.from(ids1_2.difference(ids1_1)).map(id => deep1(id)?._plain)).toEqual([]);
  //   expect(count1_3).toBe(count1_4);

  //   const _deep1_1 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
  //   expect(_deep1_1.length).toBe(deep1._ids.size);

  //   const count1_5 = deep1._ids.size;

  //   // Check manual marking => sync
  //   const a = new deep1();
  //   debug('🟢 a._id', a._id);
  //   a.store(storage1, deep1.storageMarkers.typedTrue);

  //   const count1_6 = deep1._ids.size;
  //   expect(count1_6).toBe(count1_5 + 1);

  //   await storage1.promise;

  //   const _deep1_2 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
  //   expect(_deep1_2.length).toBe(_deep1_1.length + 1);
  //   expect(_deep1_2.length).toBe(count1_6);
  //   expect(_deep1_2.find(l => l._id === a._id)).toBeDefined();

  //   // Check restore->local sync only protected
  //   const { deep: deep2, storage: storage2 } = await restoreDeep({
  //     path: `${cwd}/storage-json-test.deep7.json`,
  //   });
  //   destroyers.push(() => storage2.destroy());
  //   debug('🟢 deep2._id', deep2._id);
  //   debug('🟢 storage2._id', storage2._id);
  //   expect(deep2._ids.has(a._id)).toBe(false);
  //   expect(deep2._ids.size).toBe(deep1._ids.size - 1);

  //   debug('StorageJson._id', StorageJson._id);
  //   expect(deep2._ids.has(StorageJson._id)).toBe(false);
  //   expect(deep2._ids.has(storage1._id)).toBe(false);

  //   expect(deep2._ids.has(storage2.type._id)).toBe(true);
  //   expect(deep2._ids.has(storage2._id)).toBe(true);

  //   debug('🟢 deep1 to deep2 diff', _searchLostElements(deep1, deep2));
  //   debug('🟢 deep2 to deep1 diff', _searchLostElements(deep2, deep1));

  //   // Check remote->local restore and sync with query
  //   const { deep: deep3, storage: storage3 } = await restoreDeep({
  //     path: `${cwd}/storage-json-test.deep7.json`,
  //     query: (_link) => _link._id == a._id || _link.type_id == a._id,
  //   });
  //   destroyers.push(() => storage3.destroy());
  //   debug('🟢 deep3._id', deep3._id);
  //   debug('🟢 storage3._id', storage3._id);
  //   expect(deep3._id).toBe(deep1._id);
  //   expect(deep3._ids.has(a._id)).toBe(true);

  //   expect(deep3._ids.has(StorageJson._id)).toBe(false);
  //   expect(deep3._ids.has(storage1._id)).toBe(false);

  //   expect(deep3._ids.has(storage3.type._id)).toBe(true);
  //   expect(deep3._ids.has(storage3._id)).toBe(true);
  //   expect(deep3._ids.has(a._id)).toBe(true);

  //   // Check local1->remote new association
  //   const b = new a();
  //   debug('🟢 b._id', b._id);
  //   await storage1.promise;

  //   const _deep1_3 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
  //   expect(_deep1_3.find(l => l._id === b._id)).toBeDefined();
    
  //   // Check local1->remote->local3 with real file watching
  //   b.from = deep1;
  //   await storage1.promise;

  //   const _deep1_4 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
  //   const bFromDb1_4 = _deep1_4.find(l => l._id === b._id);
  //   expect(bFromDb1_4?.from_id).toBe(deep1._id);

  //   await _delay(3000);

  //   expect(deep3._ids.has(b._id)).toBe(true);
  //   expect(deep3(b._id)?.from?._id).toBe(deep3._id);

  //   // Check another change
  //   b.from = deep1.Function;
  //   await storage1.promise;
    
  //   await _delay(3000);

  //   expect(deep3.Function._id).toBe(deep1.Function._id);
  //   expect(deep3(b._id)?.from?._id).toBe(deep3.Function._id);

  //   // Check type change that removes from query
  //   b.type = deep1;
  //   await storage1.promise;
    
  //   await _delay(3000);

  //   expect(deep3._ids.has(b._id)).toBe(false);
  // }, 120000);
}); 