import { newDeep } from '.';
import { StorageLocalDump, newStorageLocal } from './storage-local';
import { StorageDump, StorageLink, defaultMarking } from './storage';
import { _delay } from './_promise';
import Debug from './debug';
import { _generateDump, _applySubscription } from './storage';

const debug = Debug('storage:local:test');

describe('DEBUG', () => {
  it('should test simple restoration scenario', async () => {
    const debug = require('debug')('deep7:storage:local:test');
    
    // 1. Create first deep instance
    const deep1 = newDeep();
    const storage1 = new deep1.Storage();
    
    // 2. Create simple associations
    const A = new deep1();
    const b = new A();
    
    debug('Created A._id: %s, b._id: %s', A._id, b._id);
    debug('b._type: %s (should be A._id)', b._type);
    expect(b._type).toBe(A._id);
    
    // 3. Mark for storage
    A.store(storage1, deep1.storageMarkers.typedTrue);
    b.store(storage1, deep1.storageMarkers.oneTrue);
    
    debug('Marked for storage');
    expect(A.isStored(storage1)).toBe(true);
    expect(b.isStored(storage1)).toBe(true);
    
    // 4. Generate dump
    const dump = _generateDump(deep1, storage1);
    debug('Generated dump with %d links', dump.links.length);
    
    const bLink = dump.links.find(link => link._id === b._id);
    const ALink = dump.links.find(link => link._id === A._id);
    
    debug('bLink: %o', bLink);
    debug('ALink: %o', ALink);
    
    expect(bLink).toBeDefined();
    expect(bLink?._type).toBe(A._id);
    expect(ALink).toBeDefined();
    expect(ALink?._type).toBe(deep1._id);
    
    // 5. Create second deep instance for restoration
    const existingIds = Array.from(deep1._ids) as string[];
    const deep2 = newDeep({ existingIds });
    const storage2 = new deep2.Storage();
    
    debug('Created deep2 with %d existing IDs', existingIds.length);
    
    // 6. Apply dump
    debug('Applying dump to deep2');
    _applySubscription(deep2, dump, storage2);
    
    // 7. Check restoration
    const restoredA = new deep2(A._id);
    const restoredB = new deep2(b._id);
    
    debug('restoredA._id: %s, restoredA._type: %s', restoredA._id, restoredA._type);
    debug('restoredB._id: %s, restoredB._type: %s', restoredB._id, restoredB._type);
    
    expect(restoredA._id).toBe(A._id);
    expect(restoredB._id).toBe(b._id);
    expect(restoredB._type).toBe(A._id); // This should work
    
    debug('✅ Simple restoration test passed');
  }, 10000);

  it('should test complete synchronization lifecycle', async () => {
    debug('=== COMPLETE SYNCHRONIZATION LIFECYCLE TEST ===');
    
    // 1. Создаем первый newDeep и добавляем ассоциации ДО defaultMarking
    debug('1. Creating first newDeep with associations BEFORE defaultMarking');
    const deep1 = newDeep();
    
    const A = new deep1();
    const b = new A();
    const c = new A();
    
    debug('Created associations: A=%s, b=%s, c=%s', A._id, b._id, c._id);
    debug('b.type=%s, c.type=%s', b._type, c._type);
    
    // 2. Применяем defaultMarking - должно включить A, b, c
    debug('2. Applying defaultMarking - should include A, b, c');
    const storage1 = new deep1.Storage();
    defaultMarking(deep1, storage1);
    
    // Проверяем что все ассоциации помечены для хранения
    expect(A.isStored(storage1)).toBe(true);
    expect(b.isStored(storage1)).toBe(true);
    expect(c.isStored(storage1)).toBe(true);
    debug('✅ All associations marked for storage after defaultMarking');
    
    // 3. Первичная синхронизация - создаем StorageLocal
    debug('3. Primary synchronization - creating StorageLocal');
    const localDump1 = new StorageLocalDump();
    localDump1._defaultIntervalMaxCount = 5;
    
    // ДИАГНОСТИКА: проверяем что помечено для хранения
    debug('=== DIAGNOSTIC: Checking storage markers ===');
    debug('A.isStored(storage1): %s', A.isStored(storage1));
    debug('b.isStored(storage1): %s', b.isStored(storage1));
    debug('c.isStored(storage1): %s', c.isStored(storage1));
    debug('deep1.isStored(storage1): %s', deep1.isStored(storage1));
    
    // Проверяем что generateDump видит
    const testDump = storage1.state.generateDump();
    debug('Test generateDump result: %d links', testDump.links.length);
    debug('Test dump links:', testDump.links.map(l => ({ _id: l._id, _type: l._type })));
    
    // ДИАГНОСТИКА: проверяем типы ассоциаций
    debug('=== DIAGNOSTIC: Association types ===');
    debug('A._type: %s, deep1._id: %s', A._type, deep1._id);
    debug('b._type: %s, deep1._id: %s', b._type, deep1._id);
    debug('c._type: %s, deep1._id: %s', c._type, deep1._id);
    debug('deep1._type: %s, deep1._id: %s', deep1._type, deep1._id);
    debug('A._type === deep1._id: %s', A._type === deep1._id);
    debug('b._type === deep1._id: %s', b._type === deep1._id);
    debug('c._type === deep1._id: %s', c._type === deep1._id);
    debug('deep1._type === deep1._id: %s', deep1._type === deep1._id);
    
    const storageLocal1 = new deep1.StorageLocal({
      storageLocalDump: localDump1,
      strategy: 'subscription',
      storage: storage1
    });
    
    // Ждем завершения первичной синхронизации
    await storage1.promise;
    await _delay(200);
    
    debug('Initial dump links count: %d', localDump1.dump.links.length);
    expect(localDump1.dump.links.length).toBeGreaterThan(0);
    debug('✅ Primary synchronization completed');
    
    // 4. Добавляем новые ассоциации после первичной синхронизации
    debug('4. Adding new associations after primary sync');
    const d = new A();
    d.store(storage1, deep1.storageMarkers.oneTrue);
    
    // Ждем синхронизации
    await storage1.promise;
    await _delay(300);
    
    const linksAfterNewAssoc = localDump1.dump.links.length;
    debug('Links count after adding d: %d', linksAfterNewAssoc);
    expect(localDump1.dump.links.some(link => link._id === d._id)).toBe(true);
    debug('✅ New association d synchronized to local storage');
    
    // 5. Сохраняем dump для восстановления
    debug('5. Saving dump for restoration');
    
    // Проверяем маркировку перед сохранением
    debug('Before saving dump:');
    debug('b.isStored(storage1): %s', b.isStored(storage1));
    debug('c.isStored(storage1): %s', c.isStored(storage1));
    debug('b._type: %s', b._type);
    debug('c._type: %s', c._type);
    debug('localDump1.dump.links.length: %d', localDump1.dump.links.length);
    
    // Генерируем полный дамп из storage вместо использования localDump1.dump
    const { _generateDump } = require('./storage');
    
    // Диагностика: проверяем маркировку в каталоге хранения
    debug('=== STORAGE MARKERS DIAGNOSTIC ===');
    const allMarkers = deep1._getAllStorageMarkers();
    debug('Total associations with storage markers: %d', allMarkers.size);
    
    for (const [assocId, storageMap] of allMarkers) {
      if (storageMap.has(storage1._id)) {
        const assoc = new deep1(assocId);
        debug('Association %s: type=%s, isStored=%s', 
          assocId === A._id ? 'A' : assocId === b._id ? 'b' : assocId === c._id ? 'c' : assocId.slice(0, 8),
          assoc._type,
          assoc.isStored(storage1)
        );
        
        if (assocId === b._id || assocId === c._id) {
          debug('FOUND %s in storage markers!', assocId === b._id ? 'b' : 'c');
        }
      }
    }
    debug('=== END DIAGNOSTIC ===');
    
    const fullDump = _generateDump(deep1, storage1);
    debug('Generated full dump with %d links', fullDump.links.length);
    
    // Проверяем что b и c есть в полном дампе
    const bLinkInFull = fullDump.links.find(link => link._id === b._id);
    const cLinkInFull = fullDump.links.find(link => link._id === c._id);
    debug('b link in full dump: %o', bLinkInFull);
    debug('c link in full dump: %o', cLinkInFull);
    
    const savedDump = JSON.parse(JSON.stringify(fullDump));
    const savedIds = Array.from(deep1._ids) as string[];
    debug('Saved %d associations, %d links', savedIds.length, savedDump.links.length);
    
    // Уничтожаем первый deep
    storageLocal1.destroy();
    debug('✅ First deep destroyed');
    
    // 6. Восстановление из хранилища
    debug('6. Restoring from storage');
    const deep2 = newDeep({ existingIds: savedIds });
    const storage2 = new deep2.Storage();
    
    // Применяем dump
    const { _applySubscription } = require('./storage');
    debug('Applying dump with %d links to deep2', savedDump.links.length);
    debug('Dump links: %o', savedDump.links.map(link => ({ _id: link._id, _type: link._type })));
    
    // Найдем ссылки для наших ассоциаций
    const bLink = savedDump.links.find(link => link._id === b._id);
    const cLink = savedDump.links.find(link => link._id === c._id);
    debug('b link in dump: %o', bLink);
    debug('c link in dump: %o', cLink);
    
    _applySubscription(deep2, savedDump, storage2);
    
    // Проверяем восстановление
    const restoredA = new deep2(A._id);
    const restoredB = new deep2(b._id);
    const restoredC = new deep2(c._id);
    const restoredD = new deep2(d._id);
    
    debug('After restoration:');
    debug('restoredA._id: %s, restoredA._type: %s', restoredA._id, restoredA._type);
    debug('restoredB._id: %s, restoredB._type: %s', restoredB._id, restoredB._type);
    debug('restoredC._id: %s, restoredC._type: %s', restoredC._id, restoredC._type);
    debug('restoredD._id: %s, restoredD._type: %s', restoredD._id, restoredD._type);
    
    expect(restoredA._id).toBe(A._id);
    expect(restoredB._type).toBe(A._id);
    expect(restoredC._type).toBe(A._id);
    expect(restoredD._type).toBe(A._id);
    debug('✅ All associations restored correctly');
    
    // 7. Создаем новый StorageLocal для восстановленного deep
    debug('7. Creating StorageLocal for restored deep');
    const localDump2 = new StorageLocalDump(savedDump);
    localDump2._defaultIntervalMaxCount = 5;
    
    const storageLocal2 = new deep2.StorageLocal({
      dump: savedDump,
      storageLocalDump: localDump2,
      strategy: 'subscription',
      storage: storage2
    });
    
    await storage2.promise;
    await _delay(200);
    
    debug('✅ StorageLocal created for restored deep');
    
    // 8. Тестируем local -> storage колебания
    debug('8. Testing local -> storage oscillations');
    const initialLinksCount = localDump2.dump.links.length;
    
    // Диагностика: проверяем маркировку restoredA
    debug('restoredA.isStored(storage2): %s', restoredA.isStored(storage2));
    debug('restoredA._type: %s', restoredA._type);
    
    // Создаем новую ассоциацию в deep2 и помечаем для хранения
    // Это должно синхронизироваться в localDump через Storage Alive функцию
    const testAssoc = new deep2(); // Используем случайный ID
    testAssoc.type = restoredA; // Используем уже восстановленный тип A
    testAssoc.store(storage2, deep2.storageMarkers.oneTrue);
    
    await storage2.promise;
    await _delay(300);
    
    // Проверяем что изменение попало в storage
    expect(testAssoc.isStored(storage2)).toBe(true);
    
    // Проверяем что изменение попало в local storage
    expect(localDump2.dump.links.some(link => link._id === testAssoc._id)).toBe(true);
    debug('✅ Local -> storage oscillation works');
    
    // 9. Тестируем storage -> local колебания
    debug('9. Testing storage -> local oscillations');
    const e = new restoredA();
    e.store(storage2, deep2.storageMarkers.oneTrue);
    
    await storage2.promise;
    await _delay(300);
    
    // Проверяем что изменение попало в local storage
    expect(localDump2.dump.links.some(link => link._id === e._id)).toBe(true);
    debug('✅ Storage -> local oscillation works');
    
    // 10. Финальная проверка: забываем deep и восстанавливаемся снова
    debug('10. Final test: forget deep and restore again');
    const finalDump = JSON.parse(JSON.stringify(localDump2.dump));
    const finalIds = Array.from(deep2._ids) as string[];
    
    storageLocal2.destroy();
    
    // Создаем третий deep из финального состояния
    const deep3 = newDeep({ existingIds: finalIds });
    const storage3 = new deep3.Storage();
    
    _applySubscription(deep3, finalDump, storage3);
    
    // Проверяем что все колебания сохранились
    const finalTestAssoc = new deep3(testAssoc._id); // Используем ID созданной ассоциации
    const finalE = new deep3(e._id);
    
    expect(finalTestAssoc._type).toBe(A._id); // Проверяем тип вместо данных
    expect(finalE._type).toBe(A._id);
    expect(finalTestAssoc.isStored(storage3)).toBe(true);
    expect(finalE.isStored(storage3)).toBe(true);
    
    debug('✅ All oscillations preserved after restoration');
    debug('=== COMPLETE SYNCHRONIZATION LIFECYCLE TEST PASSED ===');
  }, 30000);
});

describe('Phase 3: Local Storage Implementation', () => {
  describe('StorageLocalDump Class', () => {
    describe('Basic Operations', () => {
      it('should create empty StorageLocalDump', () => {
        const localDump = new StorageLocalDump();
        
        expect(localDump.dump).toEqual({ links: [] });
        expect(localDump._saveDaly).toBe(100);
        expect(localDump._loadDelay).toBe(50);
        expect(localDump._insertDelay).toBe(30);
        expect(localDump._deleteDelay).toBe(30);
        expect(localDump._updateDelay).toBe(30);
        expect(localDump._subscribeInterval).toBe(200);
        expect(localDump._defaultIntervalMaxCount).toBe(30);
      });

      it('should create StorageLocalDump with custom defaultIntervalMaxCount', () => {
        const localDump = new StorageLocalDump(undefined, 10);
        
        expect(localDump._defaultIntervalMaxCount).toBe(10);
      });

      it('should create StorageLocalDump with initial dump and custom maxCount', () => {
        const initialDump: StorageDump = {
          links: [{
            _id: 'test-id',
            _type: 'test-type',
            _created_at: 123,
            _updated_at: 456,
            _i: 1
          }]
        };
        
        const localDump = new StorageLocalDump(initialDump, 5);
        
        expect(localDump.dump).toEqual(initialDump);
        expect(localDump._defaultIntervalMaxCount).toBe(5);
      });

      it('should create StorageLocalDump with initial dump', () => {
        const initialDump: StorageDump = {
          links: [{
            _id: 'test-id',
            _type: 'test-type',
            _created_at: 123,
            _updated_at: 456,
            _i: 1
          }]
        };
        
        const localDump = new StorageLocalDump(initialDump);
        
        expect(localDump.dump).toEqual(initialDump);
      });

      it('should allow configuring delays', () => {
        const localDump = new StorageLocalDump();
        
        localDump._saveDaly = 200;
        localDump._loadDelay = 100;
        localDump._insertDelay = 50;
        localDump._deleteDelay = 75;
        localDump._updateDelay = 25;
        localDump._subscribeInterval = 300;
        
        expect(localDump._saveDaly).toBe(200);
        expect(localDump._loadDelay).toBe(100);
        expect(localDump._insertDelay).toBe(50);
        expect(localDump._deleteDelay).toBe(75);
        expect(localDump._updateDelay).toBe(25);
        expect(localDump._subscribeInterval).toBe(300);
      });

      it('should auto-stop polling after maxCount intervals', async () => {
        const localDump = new StorageLocalDump(undefined, 3); // Set low maxCount for testing
        localDump._subscribeInterval = 20; // Fast interval for testing
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await localDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Wait for auto-stop (3 intervals * 20ms + buffer)
        await _delay(100);
        
        // Timer should be auto-stopped
        expect(localDump['_subscriptionTimer']).toBeUndefined();
        expect(localDump['_intervalCount']).toBe(0); // Reset after stop
      });
    });

    describe('save() and load() operations', () => {
      it('should save and load dump with delays', async () => {
        const localDump = new StorageLocalDump();
        localDump._saveDaly = 10;
        localDump._loadDelay = 5;
        
        const testDump: StorageDump = {
          links: [{
            _id: 'save-test',
            _type: 'test-type',
            _created_at: 100,
            _updated_at: 200,
            _i: 1
          }]
        };
        
        const startTime = Date.now();
        await localDump.save(testDump);
        const saveTime = Date.now() - startTime;
        
        expect(saveTime).toBeGreaterThanOrEqual(10);
        expect(localDump.dump).toEqual(testDump);
        
        const loadStartTime = Date.now();
        const loadedDump = await localDump.load();
        const loadTime = Date.now() - loadStartTime;
        
        expect(loadTime).toBeGreaterThanOrEqual(5);
        expect(loadedDump).toEqual(testDump);
      });
    });

    describe('insert() operation', () => {
      it('should insert link with delay', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 10;
        
        const testLink: StorageLink = {
          _id: 'insert-test',
          _type: 'test-type',
          _created_at: 300,
          _updated_at: 400,
          _i: 2
        };
        
        const startTime = Date.now();
        await localDump.insert(testLink);
        const insertTime = Date.now() - startTime;
        
        expect(insertTime).toBeGreaterThanOrEqual(10);
        expect(localDump.dump.links).toHaveLength(1);
        expect(localDump.dump.links[0]).toEqual(testLink);
      });

      it('should throw error when inserting duplicate link', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'duplicate-test',
          _type: 'test-type',
          _created_at: 500,
          _updated_at: 600,
          _i: 3
        };
        
        await localDump.insert(testLink);
        
        await expect(localDump.insert(testLink)).rejects.toThrow('Link with id duplicate-test already exists');
      });

      it('should call _onDelta callback on insert', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        
        const deltaCallback = jest.fn();
        localDump._onDelta = deltaCallback;
        
        const testLink: StorageLink = {
          _id: 'delta-insert-test',
          _type: 'test-type',
          _created_at: 700,
          _updated_at: 800,
          _i: 4
        };
        
        await localDump.insert(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'insert',
          link: testLink
        });
      });
    });

    describe('delete() operation', () => {
      it('should delete link with delay', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._deleteDelay = 10;
        
        const testLink: StorageLink = {
          _id: 'delete-test',
          _type: 'test-type',
          _created_at: 900,
          _updated_at: 1000,
          _i: 5
        };
        
        await localDump.insert(testLink);
        expect(localDump.dump.links).toHaveLength(1);
        
        const startTime = Date.now();
        await localDump.delete(testLink);
        const deleteTime = Date.now() - startTime;
        
        expect(deleteTime).toBeGreaterThanOrEqual(10);
        expect(localDump.dump.links).toHaveLength(0);
      });

      it('should throw error when deleting non-existent link', async () => {
        const localDump = new StorageLocalDump();
        localDump._deleteDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'non-existent',
          _type: 'test-type',
          _created_at: 1100,
          _updated_at: 1200,
          _i: 6
        };
        
        await expect(localDump.delete(testLink)).rejects.toThrow('Link with id non-existent not found');
      });

      it('should call _onDelta callback on delete', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._deleteDelay = 1;
        
        const deltaCallback = jest.fn();
        localDump._onDelta = deltaCallback;
        
        const testLink: StorageLink = {
          _id: 'delta-delete-test',
          _type: 'test-type',
          _created_at: 1300,
          _updated_at: 1400,
          _i: 7
        };
        
        await localDump.insert(testLink);
        deltaCallback.mockClear(); // Clear insert call
        
        await localDump.delete(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'delete',
          id: 'delta-delete-test'
        });
      });
    });

    describe('update() operation', () => {
      it('should update link with delay', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._updateDelay = 10;
        
        const originalLink: StorageLink = {
          _id: 'update-test',
          _type: 'test-type',
          _created_at: 1500,
          _updated_at: 1600,
          _i: 8
        };
        
        await localDump.insert(originalLink);
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 1700,
          _string: 'updated-value'
        };
        
        const startTime = Date.now();
        await localDump.update(updatedLink);
        const updateTime = Date.now() - startTime;
        
        expect(updateTime).toBeGreaterThanOrEqual(10);
        expect(localDump.dump.links).toHaveLength(1);
        expect(localDump.dump.links[0]).toEqual(updatedLink);
      });

      it('should throw error when updating non-existent link', async () => {
        const localDump = new StorageLocalDump();
        localDump._updateDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'non-existent-update',
          _type: 'test-type',
          _created_at: 1800,
          _updated_at: 1900,
          _i: 9
        };
        
        await expect(localDump.update(testLink)).rejects.toThrow('Link with id non-existent-update not found');
      });

      it('should call _onDelta callback on update', async () => {
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._updateDelay = 1;
        
        const deltaCallback = jest.fn();
        localDump._onDelta = deltaCallback;
        
        const originalLink: StorageLink = {
          _id: 'delta-update-test',
          _type: 'test-type',
          _created_at: 2000,
          _updated_at: 2100,
          _i: 10
        };
        
        await localDump.insert(originalLink);
        deltaCallback.mockClear(); // Clear insert call
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 2200,
          _string: 'delta-updated'
        };
        
        await localDump.update(updatedLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'update',
          id: 'delta-update-test',
          link: updatedLink
        });
      });
    });

    describe('subscribe() operation', () => {
      it('should subscribe to changes and receive notifications', async () => {
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 50;
        localDump._insertDelay = 1;
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await localDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Wait for initial polling setup
        await _delay(10);
        
        // Insert a link to trigger change
        const testLink: StorageLink = {
          _id: 'subscribe-test',
          _type: 'test-type',
          _created_at: 2300,
          _updated_at: 2400,
          _i: 11
        };
        
        await localDump.insert(testLink);
        
        // Wait for subscription to detect change
        await _delay(100);
        
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[notifications.length - 1].links).toHaveLength(1);
        expect(notifications[notifications.length - 1].links[0]._id).toBe('subscribe-test');
        
        unsubscribe();
      });

      it('should stop notifications after unsubscribe', async () => {
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 30;
        localDump._insertDelay = 1;
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await localDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        await _delay(10);
        
        // Insert first link
        const testLink1: StorageLink = {
          _id: 'unsubscribe-test-1',
          _type: 'test-type',
          _created_at: 2500,
          _updated_at: 2600,
          _i: 12
        };
        
        await localDump.insert(testLink1);
        await _delay(50);
        
        const notificationsBeforeUnsubscribe = notifications.length;
        
        // Unsubscribe
        unsubscribe();
        
        // Insert second link after unsubscribe
        const testLink2: StorageLink = {
          _id: 'unsubscribe-test-2',
          _type: 'test-type',
          _created_at: 2700,
          _updated_at: 2800,
          _i: 13
        };
        
        await localDump.insert(testLink2);
        await _delay(50);
        
        // Should not receive new notifications
        expect(notifications.length).toBe(notificationsBeforeUnsubscribe);
      });

      it('should handle multiple subscribers', async () => {
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 30;
        localDump._insertDelay = 1;
        
        const notifications1: StorageDump[] = [];
        const notifications2: StorageDump[] = [];
        
        const unsubscribe1 = await localDump.subscribe((dump) => {
          notifications1.push(dump);
        });
        
        const unsubscribe2 = await localDump.subscribe((dump) => {
          notifications2.push(dump);
        });
        
        await _delay(10);
        
        const testLink: StorageLink = {
          _id: 'multi-subscribe-test',
          _type: 'test-type',
          _created_at: 2900,
          _updated_at: 3000,
          _i: 14
        };
        
        await localDump.insert(testLink);
        await _delay(50);
        
        expect(notifications1.length).toBeGreaterThan(0);
        expect(notifications2.length).toBeGreaterThan(0);
        expect(notifications1.length).toBe(notifications2.length);
        
        unsubscribe1();
        unsubscribe2();
      });
    });

    describe('destroy() operation', () => {
      it('should cleanup resources on destroy', async () => {
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 30;
        
        // Set up subscription to create timer
        const unsubscribe = await localDump.subscribe(() => {});
        await _delay(10);
        
        // Verify timer is active (private property, but we can test behavior)
        expect(localDump['_subscriptionTimer']).toBeDefined();
        
        // Destroy should cleanup everything
        localDump.destroy();
        
        // Timer should be cleared
        expect(localDump['_subscriptionTimer']).toBeUndefined();
        expect(localDump['_subscriptionCallbacks'].size).toBe(0);
      });
    });
  });

  describe('StorageLocal Function', () => {
    describe('Basic Creation and Integration', () => {
      it('should create StorageLocal with subscription strategy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        expect(storageLocal).toBeDefined();
        expect(storageLocal._type).toBe(deep.Storage._id);
        
        // Wait for initialization
        await storageLocal.promise;
      });

      it('should create StorageLocal with delta strategy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'delta'
        });
        
        expect(storageLocal).toBeDefined();
        expect(storageLocal._type).toBe(deep.Storage._id);
        
        // Wait for initialization
        await storageLocal.promise;
      });

      it('should throw error for invalid storageLocalDump parameter', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        expect(() => {
          new deep.StorageLocal({
            storageLocalDump: 'invalid',
            strategy: 'subscription'
          });
        }).toThrow('storageLocalDump must be a StorageLocalDump instance');
      });

      it('should throw error for unknown strategy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        
        expect(() => {
          new deep.StorageLocal({
            storageLocalDump: localDump,
            strategy: 'unknown' as any
          });
        }).toThrow('Unknown strategy: unknown');
      });
    });

    describe('Initial Dump Handling', () => {
      it('should apply provided dump on creation', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Create association to include in dump
        const association = new deep();
        association.type = deep.String;
        association.data = 'test-value';
        
        const initialDump: StorageDump = {
          links: [{
            _id: association._id,
            _type: deep.String._id,
            _created_at: association._created_at,
            _updated_at: association._updated_at,
            _i: association._i,
            _string: 'test-value'
          }]
        };
        
        const localDump = new StorageLocalDump();
        
        const storageLocal = new deep.StorageLocal({
          dump: initialDump,
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        // Wait for initialization
        await storageLocal.promise;
        
        // Check that association was restored
        const restoredAssociation = new deep(association._id);
        expect(restoredAssociation._type).toBe(deep.String._id);
        expect(restoredAssociation.data).toBe('test-value');
      });

      it('should generate and save initial dump when no dump provided', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Create some associations before creating storage
        const association = new deep();
        association.type = deep.String;
        association.data = 'initial-value';
        association.store(storage, deep.storageMarkers.oneTrue);
        
        const localDump = new StorageLocalDump();
        localDump._saveDaly = 10; // Reduce delay for testing
        
        // ВАЖНО: StorageLocal должен работать с тем же deep экземпляром
        // где уже есть данные, передаем существующий storage
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription',
          storage: storage // Pass existing storage instead of creating new one
        });
        
        // Wait for initialization and save
        await storageLocal.promise;
        
        // Check that dump was saved to localDump
        expect(localDump.dump.links.length).toBeGreaterThan(0);
      });
    });

    describe('Local to Storage Synchronization', () => {
      it('should sync insert operations to storage', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 10;
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        await storageLocal.promise;
        
        // Store type first (required for dependencies)
        deep.String.store(storageLocal, deep.storageMarkers.typedTrue);
        
        // Create and store association
        const association = new deep();
        association.type = deep.String;
        association.data = 'sync-test';
        association.store(storageLocal, deep.storageMarkers.oneTrue);
        
        // Wait for sync
        await storageLocal.promise;
        
        // Check that link was added to localDump
        const foundLink = localDump.dump.links.find(l => l._id === association._id);
        expect(foundLink).toBeDefined();
        expect(foundLink?._type).toBe(deep.String._id);
        expect(foundLink?._string).toBe('sync-test');
      });

      it('should sync delete operations to storage', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._deleteDelay = 10;
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        await storageLocal.promise;
        
        // Store type first (required for dependencies)
        deep.String.store(storageLocal, deep.storageMarkers.typedTrue);
        
        // Create and store association
        const association = new deep();
        association.type = deep.String;
        association.data = 'delete-test';
        association.store(storageLocal, deep.storageMarkers.oneTrue);
        
        await storageLocal.promise;
        
        // Verify it was added
        expect(localDump.dump.links.find(l => l._id === association._id)).toBeDefined();
        
        // Destroy association
        association.destroy();
        
        await storageLocal.promise;
        
        // Check that link was removed from localDump
        expect(localDump.dump.links.find(l => l._id === association._id)).toBeUndefined();
      });

      it('should sync update operations to storage', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        localDump._updateDelay = 10;
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        await storageLocal.promise;
        
        // Store type first (required for dependencies)
        deep.String.store(storageLocal, deep.storageMarkers.typedTrue);
        
        // Create and store association
        const association = new deep();
        association.type = deep.String;
        association.data = 'original-value';
        association.store(storageLocal, deep.storageMarkers.oneTrue);
        
        await storageLocal.promise;
        
        // Update data
        association.data = 'updated-value';
        
        await storageLocal.promise;
        
        // Check that link was updated in localDump
        const foundLink = localDump.dump.links.find(l => l._id === association._id);
        expect(foundLink).toBeDefined();
        expect(foundLink?._string).toBe('updated-value');
      });
    });

    describe('Storage to Local Synchronization', () => {
      it('should sync external changes via subscription strategy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Store type first (required for dependencies)
        deep.String.store(storage, deep.storageMarkers.typedTrue);
        
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 30;
        localDump._insertDelay = 1;
        
        // ВАЖНО: передаем существующий storage в StorageLocal
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription',
          storage: storage  // Используем тот же storage где уже помечены зависимости
        });
        
        await storageLocal.promise;
        await _delay(50); // Wait for subscription setup
        
        // Simulate external change by directly modifying localDump
        const externalLink: StorageLink = {
          _id: 'external-change',
          _type: deep.String._id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 100,
          _string: 'external-value'
        };
        
        await localDump.insert(externalLink);
        await _delay(50); // Wait for subscription to detect change
        
        // Check that association was created in deep
        const externalAssociation = new deep('external-change');
        expect(externalAssociation._type).toBe(deep.String._id);
        expect(externalAssociation.data).toBe('external-value');
      });

      it('should sync external changes via delta strategy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Store type first (required for dependencies)
        deep.String.store(storage, deep.storageMarkers.typedTrue);
        
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        
        // ВАЖНО: передаем существующий storage в StorageLocal
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'delta',
          storage: storage  // Используем тот же storage где уже помечены зависимости
        });
        
        await storageLocal.promise;
        
        // Simulate external delta change
        const externalLink: StorageLink = {
          _id: 'delta-external',
          _type: deep.String._id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _i: 101,
          _string: 'delta-value'
        };
        
        // This should trigger the delta callback
        await localDump.insert(externalLink);
        
        // Check that association was created in deep
        const externalAssociation = new deep('delta-external');
        expect(externalAssociation._type).toBe(deep.String._id);
        expect(externalAssociation.data).toBe('delta-value');
      });
    });

    describe('Recursion Prevention', () => {
      it('should prevent recursion using __isStorageEvent', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        localDump._insertDelay = 1;
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        await storageLocal.promise;
        
        // Store type first (required for dependencies)
        deep.String.store(storageLocal, deep.storageMarkers.typedTrue);
        
        const initialLinkCount = localDump.dump.links.length;
        
        // Create association - this should trigger sync to localDump
        const association = new deep();
        association.type = deep.String;
        association.data = 'recursion-test';
        association.store(storageLocal, deep.storageMarkers.oneTrue);
        
        await storageLocal.promise;
        
        // Should have exactly one more link (no recursion)
        expect(localDump.dump.links.length).toBe(initialLinkCount + 1);
        
        // Find the new link
        const newLink = localDump.dump.links.find(l => l._id === association._id);
        expect(newLink).toBeDefined();
        expect(newLink?._string).toBe('recursion-test');
      });
    });

    describe('Cleanup and Destruction', () => {
      it('should cleanup subscriptions on destroy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        localDump._subscribeInterval = 30;
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'subscription'
        });
        
        await storageLocal.promise;
        await _delay(50); // Wait for subscription setup
        
        // Verify subscription is active
        expect(localDump['_subscriptionCallbacks'].size).toBeGreaterThan(0);
        
        // Destroy storage
        storageLocal.destroy();
        
        // Subscription should be cleaned up
        expect(localDump['_subscriptionCallbacks'].size).toBe(0);
      });

      it('should cleanup delta callbacks on destroy', async () => {
        const deep = newDeep();
        
        // Create storage and apply default marking
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        const localDump = new StorageLocalDump();
        
        const storageLocal = new deep.StorageLocal({
          storageLocalDump: localDump,
          strategy: 'delta'
        });
        
        await storageLocal.promise;
        
        // Verify delta callback is set
        expect(localDump._onDelta).toBeDefined();
        
        // Destroy storage
        storageLocal.destroy();
        
        // Delta callback should be cleaned up
        expect(localDump._onDelta).toBeUndefined();
      });
    });
  });
}); 