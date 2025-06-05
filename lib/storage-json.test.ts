import dotenv from 'dotenv';
import fs from 'fs';
import jsan from 'jsan';
import { newDeep } from '.';
import { _delay } from './_promise';
import Debug from './debug';
import { _searchLostElements } from './storage';
import { newStorageJson, restoreDeep } from './storage-json';

dotenv.config();

const cwd = process.cwd();

const debug = Debug('storage:json:test');
describe('deep.StorageJson', () => {
  let destroyers: any[] = [];
  afterAll(() => {
    destroyers.forEach(destroyer => destroyer());
  });
  it('full cycle', async () => {
    if (fs.existsSync(`${cwd}/storage-json-test.deep7.json`)) fs.unlinkSync(`${cwd}/storage-json-test.deep7.json`);

    // Check basic local->storage sync
    const deep1 = newDeep();
    debug('🟢 deep1._id', deep1._id);
    const count1_0 = deep1._ids.size;
    const StorageJson = newStorageJson(deep1); // not in deep1 context
    const count1_1 = deep1._ids.size;
    expect(count1_0).toBe(count1_1 - 1);

    const storage1 = new StorageJson({
      path: `${cwd}/storage-json-test.deep7.json`,
    });
    destroyers.push(() => storage1.destroy());
    debug('🟢 storage1._id', storage1._id);

    // One problem - storage after restore is not typed and can't be used for sync
    const count1_2 = deep1._ids.size;
    expect(count1_1).toBe(count1_2 - 1);
    expect(storage1?.promise instanceof Promise).toBe(true);
    const count1_3 = deep1._ids.size;
    expect(count1_2).toBe(count1_3); // no new links added
    const ids1_1 = new Set(deep1._ids);

    await storage1.promise;

    const count1_4 = deep1._ids.size;
    const ids1_2 = new Set(deep1._ids);

    // Check no difference between links count before and after initial sync
    expect(Array.from(ids1_2.difference(ids1_1)).map(id => deep1(id)?.toPlain())).toEqual([]);
    expect(count1_3).toBe(count1_4); // no new links added

    // Check all links in remove _deep space
    const _deep1_1 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
    expect(_deep1_1.length).toBe(deep1._ids.size); // all synced

    const count1_5 = deep1._ids.size;

    // Check manual marking => sync
    const a = new deep1();
    debug('🟢 a._id', a._id);
    a.store(storage1, deep1.storageMarkers.typedTrue);

    const count1_6 = deep1._ids.size;
    expect(count1_6).toBe(count1_5 + 1); // only a is added to deep1

    await storage1.promise;

    // Check all links in remove _deep space
    const _deep1_2 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
    expect(_deep1_2.length).toBe(_deep1_1.length + 1); // all synced
    expect(_deep1_2.length).toBe(count1_6); // db and local synced by count

    // // Check full equal _i ordering
    // const sorted1_0 = _.sortBy(Array.from(deep1._ids).map(id => deep1(id)), (a) => a._i).map(a => a._id);
    // const sorted1_db = _.sortBy(_deep1_2, (a) => a._i).map(a => a.id);
    // expect(sorted1_db).toEqual(sorted1_0);

    // Check a synced becouse marked
    expect(_deep1_2.find(l => l._id === a._id)).toBeDefined(); // a is synced

    // Check restore->local sync only protected
    const { deep: deep2, storage: storage2 } = await restoreDeep({
      path: `${cwd}/storage-json-test.deep7.json`,
    });
    destroyers.push(() => storage2.destroy());
    debug('🟢 deep2._id', deep2._id);
    debug('🟢 storage2._id', storage2._id);
    expect(deep2._ids.has(a._id)).toBe(false); // a is not restored
    expect(deep2._ids.size).toBe(deep1._ids.size - 1); // -1 becouse a is not protected

    debug('StorageJson._id', StorageJson._id)
    expect(deep2._ids.has(StorageJson._id)).toBe(false); // -1 Storage is not restored
    expect(deep2._ids.has(storage1._id)).toBe(false); // -1 storage1 is not restored

    expect(deep2._ids.has(storage2.type._id)).toBe(true); // +1  Storage of storage2 only in deep2
    expect(deep2._ids.has(storage2._id)).toBe(true); // +1storage2 only in deep2

    debug('🟢 deep1 to deep2 diff', _searchLostElements(deep1, deep2));
    debug('🟢 deep2 to deep1 diff', _searchLostElements(deep2, deep1));

    // if storage does not have query, it not subscribe to remove changes
    // deep2 always just sync to remote without other query policy

    // Check remote->local restore and sync

    // Will restore a, and watch a and future typed links
    const { deep: deep3, storage: storage3 } = await restoreDeep({
      path: `${cwd}/storage-json-test.deep7.json`,
      query: (_link) => _link._id == a._id || _link._type == a._id,
    });
    destroyers.push(() => storage3.destroy());
    debug('🟢 deep3._id', deep3._id);
    debug('🟢 storage3._id', storage3._id);
    expect(deep3._id).toBe(deep1._id); // deep3 is the same as deep1
    expect(deep3._ids.has(a._id)).toBe(true); // a is restored

    expect(deep3._ids.has(StorageJson._id)).toBe(false); // -1 Storage is not restored
    expect(deep3._ids.has(storage1._id)).toBe(false); // -1 storage1 is not restored

    expect(deep3._ids.has(storage3.type._id)).toBe(true); // +1  Storage of storage3 only in deep3
    expect(deep3._ids.has(storage3._id)).toBe(true); // +1 storage3 only in deep3
    expect(deep3._ids.has(a._id)).toBe(true); // a is restored

    // Check local1->remove new a();
    const b = new a();
    debug('🟢 b._id', b._id);
    await storage1.promise;

    const _deep1_3 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
    expect(_deep1_3.find(l => l._id === b._id)).toBeDefined(); // b is synced
    
    // Check local1->remove->local3 b.from == deep;
    b.from = deep1;
    await storage1.promise;

    const _deep1_4 = jsan.parse(fs.readFileSync(`${cwd}/storage-json-test.deep7.json`, 'utf8'));
    const bFromDb1_4 = _deep1_4.find(l => l._id === b._id);
    debug('🟢 bFromDb1_4', bFromDb1_4);
    expect(bFromDb1_4?._from).toBe(deep1._id); // b is synced

    await _delay(3000);

    expect(deep2.id).toBe(deep1.id); // deep3 is the same as deep1
    expect(deep3.id).toBe(deep2.id); // deep3 is the same as deep1
    expect(deep3._ids.has(b._id)).toBe(true); // b is synced with subscription by query
    expect(deep3(b._id)?.from?.id).toBe(deep3._id); // b.from == deep3 == deep1

    // Check local1->remove->local3 b.from = deep.Function
    b.from = deep1.Function;
    await storage1.promise;
    await _delay(3000);

    expect(deep3.Function._id).toBe(deep1.Function._id); // deep3.Function == deep1.Function
    expect(deep3(b._id)?.from?.id).toBe(deep3.Function._id); // deep3 b.from == deep3.Function

    // Check change data conditional to storage4 query
    b.type = deep1;
    await storage1.promise;
    await _delay(5000);

    expect(deep3._ids.has(b._id)).toBe(false); // b is not a typed now, and can't be in subscription results
  }, 60000);
}); 