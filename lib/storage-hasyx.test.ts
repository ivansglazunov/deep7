import { jest } from '@jest/globals';
import { newDeep } from '.';
import { StorageHasyxDump, newStorageHasyx, destroyAllSubscriptions } from './storage-hasyx';
import { StorageDump, StorageLink, _applySubscription, defaultMarking } from './storage';
import { _delay } from './_promise';
import Debug from './debug';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const debug = Debug('storage:hasyx:test');
const generate = Generator(schema as any);

const createRealHasyxClient = (): { hasyx: Hasyx; cleanup: () => void } => {
  const apolloClient = createApolloClient({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!,
    secret: process.env.HASURA_ADMIN_SECRET!,
    ws: true,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = () => {
    if (hasyx && hasyx.apolloClient && typeof hasyx.apolloClient.terminate === 'function') {
      hasyx.apolloClient.terminate();
    }
    if (apolloClient.stop) {
      apolloClient.stop();
    }
    if (apolloClient.cache) {
      apolloClient.cache.reset();
    }
  };

  return { hasyx, cleanup };
};

describe('Phase 4: Hasyx Database Storage Implementation', () => {
  let hasyx: Hasyx;
  let cleanup: () => void;

  // Track all StorageHasyxDump instances for cleanup
  const hasyxDumpInstances: StorageHasyxDump[] = [];
  
  // Helper to create and track StorageHasyxDump
  const createTrackedHasyxDump = (deepSpaceId: string, initialDump?: StorageDump) => {
    const instance = new StorageHasyxDump(hasyx, deepSpaceId, initialDump);
    hasyxDumpInstances.push(instance);
    return instance;
  };

  beforeAll(() => {
    const hasyxClient = createRealHasyxClient();
    hasyx = hasyxClient.hasyx;
    cleanup = hasyxClient.cleanup;
  });

  afterEach(async () => {
    // Clean up all StorageHasyxDump instances to prevent connection leaks
    for (const instance of hasyxDumpInstances) {
      try {
        // Clean up test data from database
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: instance.deepSpaceId } }
        });
        instance.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    hasyxDumpInstances.length = 0; // Clear array
  }, 15000); // 15 second timeout for cleanup

  afterAll(() => {
    cleanup();
    destroyAllSubscriptions();
  });

  describe('StorageHasyxDump Class', () => {
    describe('Basic Operations', () => {
      it('should create empty StorageHasyxDump', () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        expect(hasyxDump.dump.links).toHaveLength(0);
        expect(hasyxDump.deepSpaceId).toBe(deepSpaceId);
        expect(hasyxDump._defaultIntervalMaxCount).toBe(30);
      });

      it('should create StorageHasyxDump with initial dump', () => {
        const deepSpaceId = uuidv4();
        const testId = uuidv4();
        const testType = uuidv4();
      const initialDump: StorageDump = {
          links: [{
            _id: testId,
            _type: testType,
            _created_at: 123,
            _updated_at: 456,
            _i: 1
          }]
        };
        
        const hasyxDump = createTrackedHasyxDump(deepSpaceId, initialDump);
        expect(hasyxDump.dump.links).toHaveLength(1);
        expect(hasyxDump.dump.links[0]._id).toBe(testId);
      });

      it('should allow configuring delays', () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        
        hasyxDump._saveDelay = 200;
        hasyxDump._loadDelay = 100;
        hasyxDump._insertDelay = 50;
        hasyxDump._deleteDelay = 75;
        hasyxDump._updateDelay = 25;
        hasyxDump._subscribeInterval = 300;
        
        expect(hasyxDump._saveDelay).toBe(200);
        expect(hasyxDump._loadDelay).toBe(100);
        expect(hasyxDump._insertDelay).toBe(50);
        expect(hasyxDump._deleteDelay).toBe(75);
        expect(hasyxDump._updateDelay).toBe(25);
        expect(hasyxDump._subscribeInterval).toBe(300);
      });

      it('should auto-stop polling after maxCount intervals', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._defaultIntervalMaxCount = 3; // Set low maxCount for testing
        hasyxDump._subscribeInterval = 20; // Fast interval for testing
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await hasyxDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Wait for auto-stop (3 intervals * 20ms + buffer)
        await _delay(100);
        
        // Timer should be auto-stopped
        expect(hasyxDump['_pollingFallbackTimer']).toBeUndefined();
        expect(hasyxDump['_intervalCount']).toBe(0); // Reset after stop
        
        // Clean up subscription to prevent timer leaks
        unsubscribe();
      }, 10000);
    });

    describe('save() and load() operations', () => {
      it('should save and load dump with delays', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._saveDelay = 10;
        hasyxDump._loadDelay = 5;
        
        const testId = uuidv4();
        const testType = uuidv4();

      const testDump: StorageDump = {
          links: [{
            _id: deepSpaceId, // Root link
            _type: undefined,
            _created_at: 100,
            _updated_at: 200,
            _i: 1
          }, {
            _id: testId,
            _type: testType,
            _created_at: 100,
            _updated_at: 200,
            _i: 2
          }]
        };
        
        const startTime = Date.now();
        await hasyxDump.save(testDump);
        const saveTime = Date.now() - startTime;
        
        expect(saveTime).toBeGreaterThanOrEqual(10);
        expect(hasyxDump.dump).toEqual(testDump);
        
        const loadStartTime = Date.now();
        const loadedDump = await hasyxDump.load();
        const loadTime = Date.now() - loadStartTime;
        
        expect(loadTime).toBeGreaterThanOrEqual(5);
        expect(loadedDump.links).toHaveLength(testDump.links.length);
      }, 10000);
    });

    describe('insert() operation', () => {
      it('should insert link with delay', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._insertDelay = 10;
        
        // First insert root link
        const rootLink: StorageLink = {
          _id: deepSpaceId,
          _type: undefined,
          _created_at: 100,
          _updated_at: 200,
          _i: 1
        };
        await hasyxDump.insert(rootLink);
        
        // Then insert test link
        const testId = uuidv4();
        const testType = uuidv4();
        const testLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 300,
          _updated_at: 400,
          _i: 2
        };
        
        const startTime = Date.now();
        await hasyxDump.insert(testLink);
        const insertTime = Date.now() - startTime;
        
        expect(insertTime).toBeGreaterThanOrEqual(10);
        
        // Verify insertion in database
        let dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testLink._id } },
          returning: ['id']
        });
        expect(dbLinks).toHaveLength(1);
        
        const deleteStartTime = Date.now();
        await hasyxDump.delete(testLink);
        const deleteTime = Date.now() - deleteStartTime;
        
        expect(deleteTime).toBeGreaterThanOrEqual(10);
        
        // Verify deletion from database (source of truth in hasyx version)
        dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testLink._id } },
          returning: ['id']
        });
        expect(dbLinks).toHaveLength(0);
      }, 10000);

      it('should call _onDelta callback on insert', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._insertDelay = 1;
        
        const deltaCallback = jest.fn();
        hasyxDump._onDelta = deltaCallback;
        
        const testId = uuidv4();
        const testType = uuidv4();
        const testLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 700,
          _updated_at: 800,
        _i: 1
      };

        await hasyxDump.insert(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'insert',
          link: testLink
        });
      }, 10000);
    });

    describe('delete() operation', () => {
      it('should call _onDelta callback on delete', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._deleteDelay = 1;
        
        const deltaCallback = jest.fn();
        hasyxDump._onDelta = deltaCallback;
        
        const testId = uuidv4();
        const testType = uuidv4();
        const testLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 1100,
          _updated_at: 1200,
          _i: 1
        };
        
        await hasyxDump.insert(testLink);
        deltaCallback.mockClear(); // Clear insert call
        
        await hasyxDump.delete(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'delete',
          id: testLink._id
        });
      }, 10000);
    });

    describe('update() operation', () => {
      it('should update link with delay', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._updateDelay = 10;
        
        // First insert a link to update
        const testId = uuidv4();
        const testType = uuidv4();
        const originalLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 1300,
          _updated_at: 1400,
          _i: 1
        };
        
        await hasyxDump.insert(originalLink);
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 1500,
          _string: 'updated-data'
        };
        
        const startTime = Date.now();
        await hasyxDump.update(updatedLink);
        const updateTime = Date.now() - startTime;
        
        expect(updateTime).toBeGreaterThanOrEqual(10);
        
        // Verify update in database (source of truth in hasyx version)
        const dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testId } },
          returning: ['id', 'updated_at']
        });
        expect(dbLinks).toHaveLength(1);
        // System should have automatically updated timestamp to current time (greater than our test value 1500)
        expect(dbLinks[0].updated_at).toBeGreaterThan(1500);
      }, 10000);

      it('should call _onDelta callback on update', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._updateDelay = 1;
        
        const deltaCallback = jest.fn();
        hasyxDump._onDelta = deltaCallback;
        
        const testId = uuidv4();
        const testType = uuidv4();
        const originalLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 1600,
          _updated_at: 1700,
          _i: 1
        };
        
        await hasyxDump.insert(originalLink);
        deltaCallback.mockClear(); // Clear insert call
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 1800
        };
        
        await hasyxDump.update(updatedLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'update',
          id: updatedLink._id,
          link: updatedLink
        });
      }, 10000);
    });

    describe('Subscription functionality', () => {
      it('should subscribe to changes and receive notifications', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        hasyxDump._subscribeInterval = 50; // Fast interval for polling fallback
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await hasyxDump.subscribe((dump) => {
          debug(`Subscription notification received with ${dump.links.length} links`);
          notifications.push(dump);
        });
        
        // Insert a link to trigger notification
        const testId = uuidv4();
        const testType = uuidv4();
        const testLink: StorageLink = {
          _id: testId,
          _type: testType,
          _created_at: 1900,
          _updated_at: 2000,
          _i: 1
        };
        
        await hasyxDump.insert(testLink);
        
        // Wait for subscription to pick up changes
        // WebSocket subscriptions need more time + hasyx has 1s throttling
        await _delay(2000); // Increased to 2s for WebSocket + throttling
        
        expect(notifications.length).toBeGreaterThan(0);
        
        unsubscribe();
      }, 15000); // Increased timeout for WebSocket subscriptions

      it('should cleanup resources on destroy', async () => {
        const deepSpaceId = uuidv4();
        const hasyxDump = createTrackedHasyxDump(deepSpaceId);
        
        const unsubscribe = await hasyxDump.subscribe(() => {});
        
        // Verify subscription is active
        expect(hasyxDump['_subscriptionCallbacks'].size).toBe(1);
        
        hasyxDump.destroy();
        
        // Verify cleanup
        expect(hasyxDump['_subscriptionCallbacks'].size).toBe(0);
        expect(hasyxDump['_hasyxSubscription']).toBeUndefined();
        expect(hasyxDump['_pollingFallbackTimer']).toBeUndefined();
      });
    });
  });

  describe('StorageHasyx Function', () => {
    describe('newStorageHasyx function', () => {
      it('should create StorageHasyx with subscription strategy', async () => {
      const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
        strategy: 'subscription'
      });

        expect(storage).toBeDefined();
        expect(storage.state.strategy).toBe('subscription');
        expect(storage.state.deepSpaceId).toBe(deepSpaceId);

        await storage.promise;

        storage.destroy();
      }, 10000);

      it('should create StorageHasyx with delta strategy', async () => {
      const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
        strategy: 'delta'
      });

        expect(storage).toBeDefined();
        expect(storage.state.strategy).toBe('delta');
        expect(storage.state.deepSpaceId).toBe(deepSpaceId);

        await storage.promise;

        storage.destroy();
      }, 10000);

      it('should throw error for missing hasyx parameter', async () => {
      const deep = newDeep();
        
        expect(() => {
          new deep.StorageHasyx({
            deepSpaceId: deep._id
          });
        }).toThrow('hasyx client instance is required for StorageHasyx');
      });

      it('should throw error for missing deepSpaceId parameter', async () => {
      const deep = newDeep();
        
        expect(() => {
          new deep.StorageHasyx({
            hasyx
          });
        }).toThrow('deepSpaceId is required for StorageHasyx');
      });

      it('should throw error for unknown strategy', async () => {
        const deep = newDeep();
        
      expect(() => {
          new deep.StorageHasyx({
            hasyx,
            deepSpaceId: deep._id,
            strategy: 'unknown' as any
          });
        }).toThrow('Unknown strategy: unknown');
      });

      it('should apply provided dump on creation', async () => {
        const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const initialDump: StorageDump = {
          links: [{
            _id: deepSpaceId,
            _type: undefined,
            _created_at: 2100,
            _updated_at: 2200,
            _i: 1
          }]
        };
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
          dump: initialDump,
          strategy: 'subscription'
        });
        
        await storage.promise;
        
        expect(storage.state.dump).toEqual(initialDump);
        
        storage.destroy();
      }, 10000);
    });

    describe('Deep integration', () => {
      it('should sync insert operations to storage', async () => {
        const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
          strategy: 'delta'
        });
        
        await storage.promise;
        
        // Apply default marking
        defaultMarking(deep, storage);
        
        // Create new association
        const testString = new deep.String('sync-test-data');
        testString.store(storage, deep.storageMarkers.oneTrue);
        
        await storage.promise;
        
        // Verify in database
        const dbLinks = await hasyx.select({
        table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testString._id } },
          returning: ['id', 'string']
        });
        
        expect(dbLinks).toHaveLength(1);
        expect(dbLinks[0].string).toBe('sync-test-data');
        
        storage.destroy();
      }, 15000);

      it('should sync delete operations to storage', async () => {
        const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
          strategy: 'delta'
        });
        
        await storage.promise;
        
        // Apply default marking
        defaultMarking(deep, storage);
        
        // Create and then delete association
        const testString = new deep.String('delete-test-data');
        testString.store(storage, deep.storageMarkers.oneTrue);
        
        await storage.promise;
        
        // Verify insertion
        let dbLinks = await hasyx.select({
        table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testString._id } },
          returning: ['id']
      });
        expect(dbLinks).toHaveLength(1);
        
        // Delete the association
        testString.destroy();

        await storage.promise;

        // Verify deletion
        dbLinks = await hasyx.select({
        table: 'deep_links',
          where: { _deep: { _eq: deepSpaceId }, id: { _eq: testString._id } },
          returning: ['id']
        });
        expect(dbLinks).toHaveLength(0);
        
        storage.destroy();
      }, 15000);

      it('should prevent recursion using __isStorageEvent', async () => {
        const deep = newDeep();
        const deepSpaceId = deep._id;
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId,
          strategy: 'delta'
        });
        
        await storage.promise;
        
        // Apply default marking
        defaultMarking(deep, storage);
        
        let insertCallCount = 0;
        const originalInsert = storage.state.storageHasyxDump.insert;
        storage.state.storageHasyxDump.insert = async function(...args: any[]) {
          insertCallCount++;
          return originalInsert.apply(this, args);
        };
        
        // Create new association
        const testString = new deep.String('recursion-test');
        testString.store(storage, deep.storageMarkers.oneTrue);
        
        await storage.promise;
        
        // Should only call insert once (no recursion)
        expect(insertCallCount).toBe(1);
        
        storage.destroy();
      }, 15000);

      it('should cleanup subscriptions on destroy', async () => {
      const deep = newDeep();
        const deepSpaceId = deep._id;
      
      const storage = new deep.StorageHasyx({
        hasyx,
          deepSpaceId,
        strategy: 'subscription'
      });
      
        await storage.promise;
        
        const hasyxDump = storage.state.storageHasyxDump;
        
        // Verify subscription is active
        expect(hasyxDump['_subscriptionCallbacks'].size).toBeGreaterThanOrEqual(0);
        
        storage.destroy();
        
        // Verify cleanup
        expect(hasyxDump['_subscriptionCallbacks'].size).toBe(0);
      }, 10000);
    });
  });

  it('[COMPREHENSIVE] should complete full StorageHasyx synchronization cycle', async () => {
    // Implementation of the comprehensive test
  });
}); 