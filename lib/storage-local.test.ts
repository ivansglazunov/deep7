import { newDeep } from '.';
import { StorageLocalDump, newStorageLocal } from './storage-local';
import { StorageDump, StorageLink, defaultMarking } from './storage';
import { _delay } from './_promise';
import Debug from './debug';

const debug = Debug('storage:local:test');

describe('DEBUG', () => {
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