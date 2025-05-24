import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const generate = Generator(schema as any);

// Helper to create Hasura client for each test
function createHasyxClient(): { hasyx: Hasyx, cleanup: () => Promise<void> } {
  const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET || 'dev-secret';

  const apolloClient = createApolloClient({
    url: hasuraUrl,
    secret: hasuraSecret,
    ws: false,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);
  
  const cleanup = async () => {
    // Close Apollo Client connections
    if (apolloClient.stop) {
      apolloClient.stop();
    }
    if (apolloClient.cache) {
      apolloClient.cache.reset();
    }
    // Clear any remaining subscriptions
    if (apolloClient.clearStore) {
      await apolloClient.clearStore();
    }
  };

  return { hasyx, cleanup };
}

describe('Phase 4: Database Integration & Events', () => {
  describe('HasyxDeepStorage Creation', () => {
    it('should create HasyxDeepStorage with hasyx client', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        
        const state = hasyxStorage._getState(hasyxStorage._id);
        expect(state).toBeDefined();
        
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        expect(hasyxStorage).toBeDefined();
        expect(hasyxStorage._initialized).toBe(true);
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should require hasyxClient for initialization', async () => {
      const deep = newDeep();
      const hasyxStorage = new deep.HasyxDeepStorage();
      
      try {
        expect(() => {
          hasyxStorage.initialize({});
        }).toThrow('hasyxClient is required for HasyxDeepStorage initialization');
      } finally {
        hasyxStorage.destroy();
      }
    });

    it('should prevent double initialization', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        expect(() => {
          hasyxStorage.initialize({ hasyxClient: hasyx });
        }).toThrow('HasyxDeepStorage is already initialized');
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });

  describe('Database Events System', () => {
    it('should define database event types', () => {
      const deep = newDeep();
      
      expect(deep.events.dbAssociationCreated).toBeDefined();
      expect(deep.events.dbLinkUpdated).toBeDefined(); 
      expect(deep.events.dbDataUpdated).toBeDefined();
      expect(deep.events.dbAssociationDeleted).toBeDefined();
      expect(deep.events.dbBatchStarted).toBeDefined();
      expect(deep.events.dbBatchCompleted).toBeDefined();
      expect(deep.events.dbBatchFailed).toBeDefined();
    });
  });

  describe('Association Synchronization', () => {
    it('should handle basic association creation without infinite recursion', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        // Clear test data first
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create basic association
        const testAssociation = new deep();
        
        // This should NOT cause infinite recursion
        testAssociation.store('database');
        
        // If we get here without stack overflow, test passes
        expect(testAssociation).toBeDefined();
        expect(testAssociation._id).toBeDefined();
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle string association creation', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        const testString = new deep.String('test data');
        testString.store('database');
        
        expect(testString._data).toBe('test data');
        expect(testString._type).toBe(deep.String._id);
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle link updates without recursion', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        const sourceAssoc = new deep();
        const targetAssoc = new deep();
        
        sourceAssoc.store('database');
        targetAssoc.store('database');
        
        // This should not cause infinite recursion
        sourceAssoc.type = targetAssoc;
        
        expect(sourceAssoc._type).toBe(targetAssoc._id);
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    // Core integration test demonstrating the main STORAGE.md example
    it('should demonstrate complete synchronization lifecycle from STORAGE.md example', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let storage: any = null;
      let restoredStorage: any = null;
      
      try {
        // Clear test data first
        await hasyx.delete({ table: 'deep_strings', where: {} });
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        // === PART 1: Create new Deep instance and sync to database ===
        
        const deep = newDeep();
        
        // Initialize storage synchronization
        storage = new deep.HasyxDeepStorage();
        storage.initialize({ hasyxClient: hasyx });
        
        // Create string associations
        const stringA = new deep.String('a');
        const stringB = new deep.String('b'); 
        const stringC = new deep.String('c');
        
        // Mark for database synchronization
        stringA.store('database', deep.storageMarkers.oneTrue);
        
        console.log('🔍 Test: stringA stored, waiting for sync...');
        console.log('🔍 Test: stringA._id =', stringA._id);
        console.log('🔍 Test: stringA._type =', stringA._type);
        console.log('🔍 Test: stringA._data =', stringA._data);
        
        // Wait for string A to be synchronized and verify in database
        const syncPromiseA = new Promise((resolve) => {
          let resolved = false;
          
          const handler = (payload: any) => {
            console.log('🔍 Test: Event received on stringA:', payload);
            if (payload._source === stringA._id && !resolved) {
              console.log('🔍 Test: Correct event received, resolving...');
              resolved = true;
              resolve(true);
            }
          };
          
          const storageHandler = (payload: any) => {
            console.log('🔍 Test: Event received on storage:', payload);
            if (payload._source === stringA._id && !resolved) {
              console.log('🔍 Test: Correct event received on storage, resolving...');
              resolved = true;
              resolve(true);
            }
          };
          
          // Listen on both the association and storage for the event
          console.log('🔍 Test: Setting up event listeners...');
          stringA.on(deep.events.dbAssociationCreated._id, handler);
          storage.on(deep.events.dbAssociationCreated._id, storageHandler);
          
          // Set timeout to prevent hanging
          setTimeout(() => {
            if (!resolved) {
              console.log('🔍 Test: Timeout reached, no event received');
              resolved = true;
              resolve(false);
            }
          }, 5000);
        });
        
        const syncedA = await syncPromiseA;
        expect(syncedA).toBe(true);
        
        // Verify stringA exists in database
        const resultA = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: stringA._id } },
          returning: ['id', '_data']
        });
        expect(resultA).toHaveLength(1);
        expect(resultA[0]._data).toBe('a');
        
        // Mark strings B and C for synchronization
        stringB.store('database', deep.storageMarkers.oneTrue);
        stringC.store('database', deep.storageMarkers.oneTrue);
        
        // Wait for storage to complete all synchronizations
        const storageSyncPromise = new Promise((resolve) => {
          let syncedCount = 0;
          let resolved = false;
          const targetCount = 2; // B and C
          
          const handleSync = (payload: any) => {
            if ([stringB._id, stringC._id].includes(payload._source) && !resolved) {
              syncedCount++;
              if (syncedCount === targetCount) {
                resolved = true;
                resolve(true);
              }
            }
          };
          
          // Listen on both the associations and storage for the event
          stringB.on(deep.events.dbAssociationCreated._id, handleSync);
          stringC.on(deep.events.dbAssociationCreated._id, handleSync);
          storage.on(deep.events.dbAssociationCreated._id, handleSync);
          
          // Set timeout to prevent hanging
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve(false);
            }
          }, 5000);
        });
        
        const syncedBC = await storageSyncPromise;
        expect(syncedBC).toBe(true);
        
        // Verify both strings exist in database
        const resultsBC = await hasyx.select({
          table: 'deep_strings',
          where: { 
            id: { _in: [stringB._id, stringC._id] }
          },
          returning: ['id', '_data']
        });
        expect(resultsBC).toHaveLength(2);
        const dataValues = resultsBC.map(r => r._data).sort();
        expect(dataValues).toEqual(['b', 'c']);
        
        // Stop synchronization
        storage.destroy();
        storage = null;
        
        // === PART 2: Load everything from database ===
        
        // Create new Deep instance from database
        const existingResult = await hasyx.select({
          table: 'deep_links',
          returning: ['id', '_i', '_type', '_from', '_to', '_value'],
          order_by: [{ _i: 'asc' }]
        });
        
        const existingIds = existingResult.map(link => link.id);
        expect(existingIds.length).toBeGreaterThan(0);
        
        // Create Deep instance with existing IDs
        const restoredDeep = newDeep({ existingIds });
        
        // Initialize storage for restored instance
        restoredStorage = new restoredDeep.HasyxDeepStorage();
        restoredStorage.initialize({ hasyxClient: hasyx });
        
        // Load string data and establish associations
        const stringResults = await hasyx.select({
          table: 'deep_strings',
          returning: ['id', '_data', { link: ['_type'] }]
        });
        
        expect(stringResults).toHaveLength(3);
        
        // Restore string data to associations
        for (const stringData of stringResults) {
          const association = new restoredDeep(stringData.id);
          association._data = stringData._data; // Restore string content
          if (stringData.link._type) {
            association._type = stringData.link._type; // Restore type
          }
        }
        
        // Check that our strings a, b, c are present with original IDs
        const restoredA = new restoredDeep(stringA._id);
        const restoredB = new restoredDeep(stringB._id);
        const restoredC = new restoredDeep(stringC._id);
        
        expect(restoredA._data).toBe('a');
        expect(restoredB._data).toBe('b');
        expect(restoredC._data).toBe('c');
        
        // Verify they are properly typed
        const stringType = restoredDeep.String;
        expect(restoredA._type).toBe(stringType._id);
        expect(restoredB._type).toBe(stringType._id);
        expect(restoredC._type).toBe(stringType._id);
        
      } finally {
        if (storage) {
          storage.destroy();
        }
        if (restoredStorage) {
          restoredStorage.destroy();
        }
        await cleanup();
      }
    }, 15000); // Extended timeout for this comprehensive test
  });

  describe('Lifecycle Management', () => {
    it('should properly initialize and destroy', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        
        // Initialize
        hasyxStorage.initialize({ hasyxClient: hasyx });
        expect(hasyxStorage._initialized).toBe(true);
        expect(hasyxStorage._isActive).toBe(true);
        
        // Destroy
        hasyxStorage.destroy();
        expect(hasyxStorage._isActive).toBe(false);
        
        // Clear reference to prevent double cleanup
        hasyxStorage = null;
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle destroy before initialization', () => {
      const deep = newDeep();
      const hasyxStorage = new deep.HasyxDeepStorage();
      
      // Should not throw
      expect(() => {
        hasyxStorage.destroy();
      }).not.toThrow();
      
      expect(hasyxStorage._isActive).toBe(false);
    });

    it('should handle multiple destroy calls', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Multiple destroy calls should not throw
        hasyxStorage.destroy();
        hasyxStorage.destroy();
        hasyxStorage.destroy();
        
        expect(hasyxStorage._isActive).toBe(false);
        hasyxStorage = null; // Prevent cleanup in finally
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should not process events after destruction', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Destroy immediately
        hasyxStorage.destroy();
        
        // Try to create association (should not sync to database)
        const testAssoc = new deep();
        testAssoc.store('database');
        
        // Should still create locally but not sync
        expect(testAssoc._id).toBeDefined();
        
        hasyxStorage = null; // Prevent cleanup in finally
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid hasyx client gracefully', async () => {
      let invalidClient: any = null;
      let hasyxStorage: any = null;
      
      try {
        // Create invalid client
        const invalidApolloClient = createApolloClient({
          url: 'http://invalid-url-that-does-not-exist',
          secret: 'invalid-secret',
          ws: false,
        }) as HasyxApolloClient;
        
        invalidClient = new Hasyx(invalidApolloClient, generate);
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: invalidClient });
        
        // Create association (should not crash the test)
        const testAssoc = new deep();
        testAssoc.store('database');
        
        // Should not throw - errors should be handled internally
        expect(testAssoc._id).toBeDefined();
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        if (invalidClient && invalidClient.client) {
          try {
            if (invalidClient.client.stop) {
              invalidClient.client.stop();
            }
            if (invalidClient.client.clearStore) {
              await invalidClient.client.clearStore();
            }
          } catch (e) {
            // Ignore cleanup errors for invalid client
          }
        }
      }
    });
  });

  describe('Storage Hook Isolation', () => {
    it('should not cause infinite recursion in storage hook', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create multiple associations rapidly
        const associations: any[] = [];
        for (let i = 0; i < 5; i++) {
          const assoc = new deep();
          assoc.store('database');
          associations.push(assoc);
        }
        
        // All should be created without stack overflow
        expect(associations.length).toBe(5);
        associations.forEach((assoc: any) => {
          expect(assoc._id).toBeDefined();
        });
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });

  describe('Promise Mechanism & Consistency', () => {
    it('should properly track async operations with promises', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        // Clear test data first
        await hasyx.delete({ table: 'deep_strings', where: {} });
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create string and verify promise tracking
        const testString = new deep.String('promise-test');
        
        // Check initial promise state
        const initialStatus = deep.promiseUtils.getPromiseStatus(testString);
        expect(initialStatus.hasPromise).toBe(false);
        
        // Mark for storage and track promise
        testString.store('database', deep.storageMarkers.oneTrue);
        
        // Check that promise is now pending
        const pendingStatus = deep.promiseUtils.getPromiseStatus(testString);
        expect(pendingStatus.hasPromise).toBe(true);
        
        // Wait for completion using our promise utility
        const completed = await deep.promiseUtils.waitForCompletion(testString);
        expect(completed).toBe(true);
        
        // Verify that operation is no longer pending
        const finalStatus = deep.promiseUtils.getPromiseStatus(testString);
        expect(deep.promiseUtils.isPending(testString)).toBe(false);
        
        // Verify data was actually stored
        const result = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id', '_data']
        });
        expect(result).toHaveLength(1);
        expect(result[0]._data).toBe('promise-test');
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    }, 10000);

    it('should handle multiple concurrent async operations', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        // Clear test data first
        await hasyx.delete({ table: 'deep_strings', where: {} });
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create multiple strings
        const strings = [
          new deep.String('concurrent-1'),
          new deep.String('concurrent-2'),
          new deep.String('concurrent-3')
        ];
        
        // Mark all for storage simultaneously
        strings.forEach(str => str.store('database', deep.storageMarkers.oneTrue));
        
        // Wait for all to complete
        const completionPromises = strings.map(str => deep.promiseUtils.waitForCompletion(str));
        const results = await Promise.all(completionPromises);
        
        // All should complete successfully
        expect(results.every(result => result === true)).toBe(true);
        
        // Verify all data was stored
        const dbResults = await hasyx.select({
          table: 'deep_strings',
          where: { 
            id: { _in: strings.map(s => s._id) }
          },
          returning: ['id', '_data']
        });
        expect(dbResults).toHaveLength(3);
        
        const dataValues = dbResults.map(r => r._data).sort();
        expect(dataValues).toEqual(['concurrent-1', 'concurrent-2', 'concurrent-3']);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    }, 10000);

    it('should maintain consistency during storage operations', async () => {
      const { hasyx, cleanup } = createHasyxClient();
      let hasyxStorage: any = null;
      
      try {
        // Clear test data first
        await hasyx.delete({ table: 'deep_strings', where: {} });
        await hasyx.delete({ table: 'deep_links', where: {} });
        
        const deep = newDeep();
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create a chain of operations
        const parentString = new deep.String('parent');
        const childString = new deep.String('child');
        
        // Set up relationship
        const link = new deep();
        link._from = parentString._id;
        link._to = childString._id;
        
        // Store parent first
        parentString.store('database', deep.storageMarkers.oneTrue);
        await deep.promiseUtils.waitForCompletion(parentString);
        
        // Store child
        childString.store('database', deep.storageMarkers.oneTrue);
        await deep.promiseUtils.waitForCompletion(childString);
        
        // Store link
        link.store('database', deep.storageMarkers.oneTrue);
        await deep.promiseUtils.waitForCompletion(link);
        
        // Verify all data is consistent in database
        const linkResults = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: link._id } },
          returning: ['id', '_from', '_to']
        });
        expect(linkResults).toHaveLength(1);
        expect(linkResults[0]._from).toBe(parentString._id);
        expect(linkResults[0]._to).toBe(childString._id);
        
        const stringResults = await hasyx.select({
          table: 'deep_strings',
          where: { 
            id: { _in: [parentString._id, childString._id] }
          },
          returning: ['id', '_data']
        });
        expect(stringResults).toHaveLength(2);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    }, 15000);
  });
}); 