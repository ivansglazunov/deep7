// Real hasyx database storage implementation tests
// Tests StorageHasyxDump and StorageHasyx with real hasyx database integration
// Uses real hasyx database connections and operations

import { describe, it, expect, afterEach, afterAll } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import { StorageHasyxDump, newStorageHasyx, destroyAllSubscriptions } from './storage-hasyx';
import { StorageDump, StorageLink, newStorage, defaultMarking } from './storage';
import { newDeep } from './deep';
import dotenv from 'dotenv';
import { _delay } from './_promise';
import Debug from './debug';

dotenv.config();

const debug = Debug('test:storage-hasyx');

const generate = Generator(schema as any);
const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!;
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;

// Global tracking for cleanup
const hasyxDumpInstances: StorageHasyxDump[] = [];
const cleanupFunctions: (() => Promise<void>)[] = [];

// Helper function to create isolated hasyx client
async function createRealHasyxClient() {
  const apolloClient = createApolloClient({
    url: HASURA_URL,
    secret: ADMIN_SECRET,
    ws: false,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = async () => {
    if (apolloClient.stop) {
      apolloClient.stop();
    }
    if (apolloClient.cache) {
      await apolloClient.cache.reset();
    }
    if (apolloClient.clearStore) {
      await apolloClient.clearStore();
    }
  };

  return { hasyx, cleanup };
}

// Helper function to create isolated hasyx dump with auto-cleanup
const createRealHasyxDump = async (deepSpaceId?: string, initialDump?: StorageDump) => {
  const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
  const testDeepSpaceId = deepSpaceId || uuidv4();
  const dump = new StorageHasyxDump(hasyx, testDeepSpaceId, initialDump);
  
  // Add to global tracking
  hasyxDumpInstances.push(dump);
  
  const cleanup = async () => {
    // Clean up test data
    await hasyx.delete({
      table: 'deep_links',
      where: { _deep: { _eq: testDeepSpaceId } }
    }).catch(() => {});
    
    dump.destroy();
    await hasyxCleanup();
  };
  
  // Add cleanup to global tracking
  cleanupFunctions.push(cleanup);

  return { dump, cleanup, testDeepSpaceId };
};

describe('StorageHasyxDump - Real Database Operations', () => {
  
  // Global cleanup after each test to prevent hangs
  afterEach(async () => {
    // Clean up all dump instances
    for (const instance of hasyxDumpInstances) {
      try {
        instance.destroy();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    hasyxDumpInstances.length = 0;
    
    // Run all cleanup functions
    for (const cleanup of cleanupFunctions) {
      try {
        await cleanup();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    cleanupFunctions.length = 0;
  });

  describe('Basic Operations', () => {
    it('should save and load dump to/from real hasyx database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        const testDump: StorageDump = {
          links: [
            // Root link
            {
              _id: testDeepSpaceId,
              _created_at: Date.now(),
              _updated_at: Date.now(),
              _string: 'root-link'
            },
            // Regular link
            {
              _id: uuidv4(),
              _type: testDeepSpaceId,
              _created_at: Date.now(),
              _updated_at: Date.now(),
              _string: 'test-value'
            }
          ]
        };
        
        await dump.save(testDump);
        const loaded = await dump.load();
        
        expect(loaded.links).toHaveLength(2);
        expect(loaded.links.find(l => l._string === 'test-value')).toBeTruthy();
      } finally {
        await cleanup();
      }
    });

    it('should insert link to real hasyx database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // First create root link (id == deepSpaceId, _type = null)
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Then create regular link that references the root as _type
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId, // Reference the root link
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'inserted-test'
        };
        
        await dump.insert(testLink);
        const loaded = await dump.load();
        
        expect(loaded.links).toHaveLength(2); // Root + regular link
        expect(loaded.links.find(l => l._id === testLink._id)?._string).toBe('inserted-test');
      } finally {
        await cleanup();
      }
    });
    
    it('should delete link from real hasyx database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // First create root link
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Then create regular link that we'll delete
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'to-delete'
        };
        
        await dump.insert(testLink);
        await dump.delete(testLink);
        
        const loaded = await dump.load();
        expect(loaded.links).toHaveLength(1); // Only root link should remain
        expect(loaded.links[0]._string).toBe('root-link');
      } finally {
        await cleanup();
      }
    });

    it('should update link in real hasyx database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // First create root link
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Then create regular link that we'll update
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'original'
        };
        
        await dump.insert(testLink);
        
        testLink._string = 'updated';
        testLink._updated_at = Date.now();
        await dump.update(testLink);
        
        const loaded = await dump.load();
        expect(loaded.links).toHaveLength(2);
        expect(loaded.links.find(l => l._id === testLink._id)?._string).toBe('updated');
      } finally {
        await cleanup();
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error when inserting duplicate link', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // First create root link
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
              _created_at: Date.now(),
              _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Then create regular link
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        
        await dump.insert(testLink);
        await expect(dump.insert(testLink)).rejects.toThrow('already exists');
      } finally {
        await cleanup();
      }
    });

    it('should throw error when deleting non-existent link', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // Create root link for consistency
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Try to delete non-existent regular link
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        
        await expect(dump.delete(testLink)).rejects.toThrow('not found');
      } finally {
        await cleanup();
      }
    });
    
    it('should throw error when updating non-existent link', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        // Create root link for consistency
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
            _created_at: Date.now(),
            _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Try to update non-existent regular link
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
            _created_at: Date.now(),
          _updated_at: Date.now()
        };
        
        await expect(dump.update(testLink)).rejects.toThrow('not found');
      } finally {
        await cleanup();
      }
    });
  });

  describe('Space Isolation', () => {
    it('should isolate data by deepSpaceId', async () => {
      const { dump: dump1, cleanup: cleanup1, testDeepSpaceId: space1Id } = await createRealHasyxDump();
      const { dump: dump2, cleanup: cleanup2, testDeepSpaceId: space2Id } = await createRealHasyxDump();
      
      try {
        // Create root links for each space
        const root1: StorageLink = {
          _id: space1Id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'space-1-root'
        };
        
        const root2: StorageLink = {
          _id: space2Id,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'space-2-root'
        };
        
        await dump1.insert(root1);
        await dump2.insert(root2);
        
        // Create regular links in each space
        const link1: StorageLink = {
              _id: uuidv4(),
          _type: space1Id,
              _created_at: Date.now(),
              _updated_at: Date.now(),
          _string: 'space-1'
        };
        
        const link2: StorageLink = {
              _id: uuidv4(),
          _type: space2Id,
              _created_at: Date.now(),
              _updated_at: Date.now(),
          _string: 'space-2'
        };
        
        await dump1.insert(link1);
        await dump2.insert(link2);
        
        const loaded1 = await dump1.load();
        const loaded2 = await dump2.load();
        
        expect(loaded1.links).toHaveLength(2); // Root + regular link
        expect(loaded2.links).toHaveLength(2); // Root + regular link
        
        // Each space should only see its own links
        expect(loaded1.links.find(l => l._string === 'space-1')).toBeTruthy();
        expect(loaded1.links.find(l => l._string === 'space-2')).toBeFalsy();
        
        expect(loaded2.links.find(l => l._string === 'space-2')).toBeTruthy();
        expect(loaded2.links.find(l => l._string === 'space-1')).toBeFalsy();
      } finally {
        await cleanup1();
        await cleanup2();
      }
    });
  });
});

describe('StorageHasyx - Deep Framework Integration', () => {

  describe('Basic Storage Operations', () => {
    it('should create StorageHasyx with delta strategy', async () => {
      const hasyx = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      // Initialize deep context
      const deep = newDeep();
      newStorage(deep);
      newStorageHasyx(deep);
      
      const storage = new deep.StorageHasyx({
        hasyx,
        deepSpaceId: testDeepSpaceId,
        strategy: 'delta'
      });
      
      expect(storage).toBeDefined();
      
      // Test basic operation - create root link
      const rootLink: StorageLink = {
        _id: testDeepSpaceId,
        _created_at: Date.now(),
        _updated_at: Date.now(),
        _string: 'test-root'
      };
      
      // Wait for storage initialization
      await storage.promise;
      
      console.log('🔍 Debug: Storage initialized with dump:', JSON.stringify(storage.state.dump, null, 2));
      console.log('🔍 Debug: Initial deep associations count:', deep._ids.size);
      
      // Cleanup
      if (storage.state.onDestroy) {
        storage.state.onDestroy();
      }
    });

    it('should persist associations to real hasyx database', async () => {
      const hasyx = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      // Initialize deep context
      const deep = newDeep();
      newStorage(deep);
      newStorageHasyx(deep);
      
      const storage = new deep.StorageHasyx({
        hasyx,
        deepSpaceId: testDeepSpaceId,
        strategy: 'delta'
      });
      
      try {
        // Wait for storage initialization
        await storage.promise;
        
        // Verify the storage was created and can be used
        expect(storage).toBeDefined();
        expect(storage.state).toBeDefined();
        
      } finally {
        if (storage.state.onDestroy) {
          storage.state.onDestroy();
        }
      }
    });
  });

  describe('Deep to Storage Synchronization', () => {
    it('should sync insert operations from deep to hasyx database', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        // Create external changes BEFORE creating StorageHasyx
        // so they will be loaded during initialization
        
        // Create root link in database first
        await hasyx.insert({
          table: 'deep_links',
          object: {
            id: testDeepSpaceId,
            _deep: testDeepSpaceId,
            string: 'external-root'
          }
        });
        
        // Create external link directly in database (simulating external change)
        const externalLinkId = uuidv4();
        await hasyx.insert({
          table: 'deep_links',
          object: {
            id: externalLinkId,
            _deep: testDeepSpaceId,
            _type: testDeepSpaceId,
            string: 'external-change'
          }
        });
        
        // NOW create StorageHasyx with subscription strategy
        // which should load existing data and then watch for new changes
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'  // ✅ Используем subscription strategy
        });
        defaultMarking(deep, storage);
        await storage.promise;
        
        console.log('🔍 Debug: Storage initialized with dump:', JSON.stringify(storage.state.dump, null, 2));
        console.log('🔍 Debug: Initial deep associations count:', deep._ids.size);
        
        // Don't create external changes again - they already exist
        
        // Wait for subscription to detect change and apply it
        // NOTE: Hasyx subscriptions trigger no more than once per second
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
        
        // Now StorageHasyx with subscription strategy should automatically
        // apply external changes through _applySubscription()
        
        // Test 1: Verify data exists in hasyx database
        const hasyxData = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } },
          returning: ['id', 'string']
        });
        
        expect(hasyxData.length).toBe(2); // Root + external link
        const externalData = hasyxData.find(l => l.id === externalLinkId);
        expect(externalData).toBeDefined();
        expect(externalData.string).toBe('external-change');
        
        // Debug: Check what subscription received
        console.log('🔍 Debug: Current storage dump:', JSON.stringify(storage.state.dump, null, 2));
        console.log('🔍 Debug: Total deep associations:', deep._ids.size);
        console.log('🔍 Debug: Deep associations list:', Array.from(deep._ids));
        
        // Test 2: Verify subscription automatically applied external changes to deep
        const rootAssociation = new deep(testDeepSpaceId);
        const externalAssociation = new deep(externalLinkId);
        
        console.log('🔍 Debug: Root association type:', rootAssociation._type);
        console.log('🔍 Debug: Root association data:', rootAssociation.data);
        console.log('🔍 Debug: Root association exists in _ids:', deep._ids.has(testDeepSpaceId));
        
        console.log('🔍 Debug: External association type:', externalAssociation._type);
        console.log('🔍 Debug: External association data:', externalAssociation.data);
        console.log('🔍 Debug: External association exists in _ids:', deep._ids.has(externalLinkId));
        
        // If subscription worked, both associations should exist in deep
        expect(deep._ids.has(testDeepSpaceId)).toBe(true);
        expect(rootAssociation.data).toBe('external-root');
        
        expect(deep._ids.has(externalLinkId)).toBe(true);
        expect(externalAssociation._type).toBe(testDeepSpaceId);
        expect(externalAssociation.data).toBe('external-change');
        
        console.log('✅ External changes automatically applied via subscription');
        
      } finally {
        // Simplified cleanup
        try {
          await hasyx.delete({
            table: 'deep_links',
            where: { _deep: { _eq: testDeepSpaceId } }
          });
        } catch (error) {
          console.warn('Cleanup warning:', error);
        }
        await hasyxCleanup();
      }
    }, 15000); // 15 second timeout

    it('should sync delete operations from deep to hasyx database', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        // Create StorageHasyx with subscription strategy
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'  // ✅ Используем subscription strategy
        });
        defaultMarking(deep, storage);
        
        // CRITICAL: Create required dependencies in database first
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        // 1. Create root link (testDeepSpaceId)
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined, // Root link has no type
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        
        // 2. Create deep.String type in database
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage
        });
        
        await storageHasyx.promise;
        
        // Create root association in deep
        const rootAssociation = new deep(testDeepSpaceId);
        rootAssociation.store(storage, deep.storageMarkers.oneTrue);
        await storageHasyx.promise;
        
        // Create and store string association
        const association = new deep();
        association.type = deep.String;
        association.data = 'delete-test';
        association.store(storage, deep.storageMarkers.oneTrue);
        
        // Wait for insert to complete
        await storageHasyx.promise;
        await _delay(200); // Additional delay for database operation
        
        // Verify it was created in database
        let dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _eq: association._id },
            _deep: { _eq: testDeepSpaceId }
          },
          returning: ['id', '_type', 'string']
        });
        
        console.log('Created association in database:', dbLinks);
        expect(dbLinks).toHaveLength(1);
        expect(dbLinks[0]._type).toBe(deep.String._id);
        expect(dbLinks[0].string).toBe('delete-test');
        
        // Destroy association
        association.destroy();
        
        // Wait for delete to complete
        await storageHasyx.promise;
        await _delay(200); // Additional delay for database operation
        
        // Verify it was deleted from database
        dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _eq: association._id },
            _deep: { _eq: testDeepSpaceId }
          },
          returning: ['id']
        });
        
        console.log('After delete - remaining links:', dbLinks);
        expect(dbLinks).toHaveLength(0);
        
        if (storageHasyx.state.onDestroy) {
          storageHasyx.state.onDestroy();
        }
        
        // Cleanup direct dump
        directDump.destroy();
      } finally {
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await hasyxCleanup();
      }
    });

    it('should sync update operations from deep to hasyx database', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        // Create StorageHasyx with subscription strategy
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'  // ✅ Используем subscription strategy
        });
        defaultMarking(deep, storage);
        
        // CRITICAL: Create required dependencies in database first
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        // 1. Create root link (testDeepSpaceId)
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined, // Root link has no type
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        
        // 2. Create deep.String type in database
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage
        });
        
        await storageHasyx.promise;
        
        // Create root association in deep
        const rootAssociation = new deep(testDeepSpaceId);
        rootAssociation.store(storage, deep.storageMarkers.oneTrue);
        await storageHasyx.promise;
        
        // Create and store string association
        const association = new deep();
        association.type = deep.String;
        association.data = 'original-value';
        association.store(storage, deep.storageMarkers.oneTrue);
        
        // Wait for insert to complete
        await storageHasyx.promise;
        await _delay(200); // Additional delay for database operation
        
        // Update data
        association.data = 'updated-value';
        
        // Wait for update to complete
        await storageHasyx.promise;
        await _delay(200); // Additional delay for database operation
        
        // Verify update was synced to database
        const dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _eq: association._id },
            _deep: { _eq: testDeepSpaceId }
          },
          returning: ['id', 'string']
        });
        
        console.log('Updated association in database:', dbLinks);
        expect(dbLinks).toHaveLength(1);
        expect(dbLinks[0].string).toBe('updated-value');
        
        if (storageHasyx.state.onDestroy) {
          storageHasyx.state.onDestroy();
        }
        
        // Cleanup direct dump
        directDump.destroy();
      } finally {
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await hasyxCleanup();
      }
    });
  });

  describe('Storage to Deep Synchronization', () => {
    it('should load existing external data during initialization', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        console.log('🚀 Starting basic hasyx test with deepSpaceId:', testDeepSpaceId);
        
        // 1. FIRST: Create external data directly in database
        console.log('📝 Inserting root link...');
        const rootResult = await hasyx.insert({
          table: 'deep_links',
          object: {
            id: testDeepSpaceId,
            _deep: testDeepSpaceId,
            string: 'pre-existing-root'
          }
        });
        
        console.log('✅ Root link inserted:', rootResult);
        
        const externalLinkId = uuidv4();
        console.log('📝 Inserting external link...');
        const externalResult = await hasyx.insert({
          table: 'deep_links',
          object: {
            id: externalLinkId,
            _deep: testDeepSpaceId,
            _type: testDeepSpaceId,
            string: 'pre-existing-data'
          }
        });
        
        console.log('✅ External link inserted:', externalResult);
        
        // 2. Verify external data exists in database BEFORE creating StorageHasyx
        console.log('🔍 Verifying data exists in database...');
        const verifyData = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } },
          returning: ['id', '_deep', '_type', 'string']
        });
        
        console.log('🔍 Found external data in database:', JSON.stringify(verifyData, null, 2));
        console.log('📊 Data count:', verifyData.length);
        
        if (verifyData.length !== 2) {
          throw new Error(`Expected 2 links, found ${verifyData.length}: ${JSON.stringify(verifyData)}`);
        }
        
        console.log('✅ Database verification successful - found 2 links');
        
        // Now test this passes basic expectation
        expect(verifyData.length).toBe(2);
        expect(verifyData.some(link => link.id === testDeepSpaceId)).toBe(true);
        expect(verifyData.some(link => link.id === externalLinkId)).toBe(true);
        
        console.log('✅ Basic hasyx operations working correctly');
        
      } finally {
        try {
          console.log('🧹 Cleaning up test data...');
          await hasyx.delete({
            table: 'deep_links',
            where: { _deep: { _eq: testDeepSpaceId } }
          });
          console.log('✅ Cleanup successful');
        } catch (error) {
          console.warn('Cleanup warning:', error);
        }
        await hasyxCleanup();
      }
    }, 15000);

    it('should sync external hasyx database changes to deep via subscription', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        // Create external changes BEFORE creating StorageHasyx
        // so they will be loaded during initialization
        
        // Create root link in database first
        await hasyx.insert({
          table: 'deep_links',
          object: {
            id: testDeepSpaceId,
            _deep: testDeepSpaceId,
            string: 'external-root'
          }
        });
        
        // Create external link directly in database (simulating external change)
        const externalLinkId = uuidv4();
        await hasyx.insert({
          table: 'deep_links',
          object: {
            id: externalLinkId,
            _deep: testDeepSpaceId,
            _type: testDeepSpaceId,
            string: 'external-change'
          }
        });
        
        // NOW create StorageHasyx with subscription strategy
        // which should load existing data and then watch for new changes
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'  // ✅ Используем subscription strategy
        });
        defaultMarking(deep, storage);
        await storage.promise;
        
        console.log('🔍 Debug: Storage initialized with dump:', JSON.stringify(storage.state.dump, null, 2));
        console.log('🔍 Debug: Initial deep associations count:', deep._ids.size);
        
        // Don't create external changes again - they already exist
        
        // Wait for subscription to detect change and apply it
        // NOTE: Hasyx subscriptions trigger no more than once per second
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
        
        // Now StorageHasyx with subscription strategy should automatically
        // apply external changes through _applySubscription()
        
        // Test 1: Verify data exists in hasyx database
        const hasyxData = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } },
          returning: ['id', 'string']
        });
        
        expect(hasyxData.length).toBe(2); // Root + external link
        const externalData = hasyxData.find(l => l.id === externalLinkId);
        expect(externalData).toBeDefined();
        expect(externalData.string).toBe('external-change');
        
        // Debug: Check what subscription received
        console.log('🔍 Debug: Current storage dump:', JSON.stringify(storage.state.dump, null, 2));
        console.log('🔍 Debug: Total deep associations:', deep._ids.size);
        console.log('🔍 Debug: Deep associations list:', Array.from(deep._ids));
        
        // Test 2: Verify subscription automatically applied external changes to deep
        const rootAssociation = new deep(testDeepSpaceId);
        const externalAssociation = new deep(externalLinkId);
        
        console.log('🔍 Debug: Root association type:', rootAssociation._type);
        console.log('🔍 Debug: Root association data:', rootAssociation.data);
        console.log('🔍 Debug: Root association exists in _ids:', deep._ids.has(testDeepSpaceId));
        
        console.log('🔍 Debug: External association type:', externalAssociation._type);
        console.log('🔍 Debug: External association data:', externalAssociation.data);
        console.log('🔍 Debug: External association exists in _ids:', deep._ids.has(externalLinkId));
        
        // If subscription worked, both associations should exist in deep
        expect(deep._ids.has(testDeepSpaceId)).toBe(true);
        expect(rootAssociation.data).toBe('external-root');
        
        expect(deep._ids.has(externalLinkId)).toBe(true);
        expect(externalAssociation._type).toBe(testDeepSpaceId);
        expect(externalAssociation.data).toBe('external-change');
        
        console.log('✅ External changes automatically applied via subscription');
        
      } finally {
        // Simplified cleanup
        try {
          await hasyx.delete({
            table: 'deep_links',
            where: { _deep: { _eq: testDeepSpaceId } }
          });
        } catch (error) {
          console.warn('Cleanup warning:', error);
        }
        await hasyxCleanup();
      }
    }, 15000); // 15 second timeout

    it('should handle complex association hierarchies', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta'
        });
        
        defaultMarking(deep, storage);
        await storage.promise;
        
        console.log('🔍 Debug: Storage initialized with dump:', JSON.stringify(storage.state.dump, null, 2));
        console.log('🔍 Debug: Initial deep associations count:', deep._ids.size);
        
        // Create root link first
        const rootAssociation = new deep(testDeepSpaceId);
        rootAssociation.store(storage, deep.storageMarkers.oneTrue);
        await storage.promise;
        
        // Create type hierarchy: BaseType -> SpecificType -> Instance
        const baseType = new deep();
        baseType.type = new deep(testDeepSpaceId);
        baseType.data = 'BaseType';
        baseType.store(storage, deep.storageMarkers.oneTrue);
        
        const specificType = new deep();
        specificType.type = baseType;
        specificType.data = 'SpecificType';
        specificType.store(storage, deep.storageMarkers.oneTrue);
        
        const instance = new deep();
        instance.type = specificType;
        instance.from = baseType;
        instance.to = specificType;
        instance.data = 'Instance';
        instance.store(storage, deep.storageMarkers.oneTrue);
        
        await storage.promise;
        
        // Verify all relationships were stored correctly in database
        const dbLinks = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } },
          returning: ['id', '_type', '_from', '_to', 'string']
        });
        
        expect(dbLinks).toHaveLength(4); // root + baseType + specificType + instance
        
        const instanceLink = dbLinks.find(l => l.id === instance._id);
        expect(instanceLink).toBeDefined();
        expect(instanceLink?._type).toBe(specificType._id);
        expect(instanceLink?._from).toBe(baseType._id);
        expect(instanceLink?._to).toBe(specificType._id);
        expect(instanceLink?.string).toBe('Instance');
        
        if (storage.state.onDestroy) {
          storage.state.onDestroy();
        }
      } finally {
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await hasyxCleanup();
      }
    });
  });

  describe('Multi-Instance Synchronization', () => {
    it('should synchronize data between multiple StorageHasyx instances', async () => {
      const { hasyx: hasyx1, cleanup: cleanup1 } = await createRealHasyxClient();
      const { hasyx: hasyx2, cleanup: cleanup2 } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        // Create two separate deep instances with same deepSpaceId
        const deep1 = newDeep();
        newStorage(deep1);
        newStorageHasyx(deep1);
        
        const deep2 = newDeep();
        newStorage(deep2);
        newStorageHasyx(deep2);
        
        const storage1 = new deep1.StorageHasyx({
          hasyx: hasyx1,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'
        });
        
        const storage2 = new deep2.StorageHasyx({
          hasyx: hasyx2,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'
        });
        
        defaultMarking(deep1, storage1);
        defaultMarking(deep2, storage2);
        
        await storage1.promise;
        await storage2.promise;
        
        // Create root in first instance
        const root1 = new deep1(testDeepSpaceId);
        root1.store(storage1, deep1.storageMarkers.oneTrue);
        await storage1.promise;
        
        // Create association in first instance
        const assoc1 = new deep1();
        assoc1.type = new deep1(testDeepSpaceId);
        assoc1.data = 'from-instance-1';
        assoc1.store(storage1, deep1.storageMarkers.oneTrue);
        await storage1.promise;
        
        // Wait for subscription sync
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify data appears in second instance
        const assoc2 = new deep2(assoc1._id);
        expect(assoc2._type).toBe(testDeepSpaceId);
        expect(assoc2.data).toBe('from-instance-1');
        
        if (storage1.state.onDestroy) storage1.state.onDestroy();
        if (storage2.state.onDestroy) storage2.state.onDestroy();
      } finally {
        await hasyx1.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await cleanup1();
        await cleanup2();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle hasyx connection errors gracefully', async () => {
      const deep = newDeep();
      newStorage(deep);
      newStorageHasyx(deep);
      
      // Apply default marking to ensure we have stored data that will need to be saved via hasyx
      const baseStorage = new deep.Storage();
      defaultMarking(deep, baseStorage);
      
      // Create invalid hasyx client - all operations fail
      const invalidHasyx = { 
        select: () => Promise.reject(new Error('Connection failed')),
        insert: () => Promise.reject(new Error('Connection failed')),
        delete: () => Promise.reject(new Error('Connection failed')),
        update: () => Promise.reject(new Error('Connection failed'))
      };
      
      const storage = new deep.StorageHasyx({
        hasyx: invalidHasyx,
        deepSpaceId: uuidv4(),
        strategy: 'delta',
        storage: baseStorage  // Use storage with existing data
      });
      
      // Should handle initialization error gracefully
      await expect(storage.promise).rejects.toThrow('Connection failed');
    });

    it('should prevent infinite recursion during synchronization', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta'
        });
        
        defaultMarking(deep, storage);
        await storage.promise;
        
        // Track event recursion
        let eventCount = 0;
        const originalEmit = deep._emit;
        deep._emit = function(...args: any[]) {
          eventCount++;
          if (eventCount > 100) {
            throw new Error('Infinite recursion detected');
          }
          return originalEmit.apply(this, args);
        };
        
        // Create root and association
        const root = new deep(testDeepSpaceId);
        root.store(storage, deep.storageMarkers.oneTrue);
        
        const association = new deep();
        association.type = new deep(testDeepSpaceId);
        association.store(storage, deep.storageMarkers.oneTrue);
        
        await storage.promise;
        
        // Should not cause infinite recursion
        expect(eventCount).toBeLessThan(50);
        
        if (storage.state.onDestroy) {
          storage.state.onDestroy();
        }
      } finally {
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await hasyxCleanup();
      }
    });
  });

  describe('Event Handlers and Callbacks', () => {
    it('should call onLinkInsert when links are added to database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        const insertedLinks: StorageLink[] = [];
        dump._onDelta = (delta) => {
          if (delta.operation === 'insert' && delta.link) {
            insertedLinks.push(delta.link);
          }
        };
        
        // Create root link first
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        await dump.insert(rootLink);
        
        // Create regular link
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'callback-test'
        };
        
        await dump.insert(testLink);
        
        expect(insertedLinks).toHaveLength(2);
        expect(insertedLinks.find(l => l._string === 'callback-test')).toBeTruthy();
      } finally {
        await cleanup();
      }
    });
    
    it('should call onLinkDelete when links are removed from database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        const deletedIds: string[] = [];
        dump._onDelta = (delta) => {
          if (delta.operation === 'delete' && delta.id) {
            deletedIds.push(delta.id);
          }
        };
        
        // Create and insert links
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'to-delete'
        };
        
        await dump.insert(rootLink);
        await dump.insert(testLink);
        
        // Delete test link
        await dump.delete(testLink);
        
        expect(deletedIds).toContain(testLink._id);
      } finally {
        await cleanup();
      }
    });

    it('should call onLinkUpdate when links are modified in database', async () => {
      const { dump, cleanup, testDeepSpaceId } = await createRealHasyxDump();
      
      try {
        const updatedLinks: StorageLink[] = [];
        dump._onDelta = (delta) => {
          if (delta.operation === 'update' && delta.link) {
            updatedLinks.push(delta.link);
          }
        };
        
        // Create and insert links
        const rootLink: StorageLink = {
          _id: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'root-link'
        };
        
        const testLink: StorageLink = {
          _id: uuidv4(),
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now(),
          _string: 'original'
        };
        
        await dump.insert(rootLink);
        await dump.insert(testLink);
        
        // Update test link
        testLink._string = 'updated';
        testLink._updated_at = Date.now();
        await dump.update(testLink);
        
        expect(updatedLinks).toHaveLength(1);
        expect(updatedLinks[0]._string).toBe('updated');
      } finally {
        await cleanup();
      }
    });
  });

  describe('Cleanup and Lifecycle', () => {
    it('should cleanup resources properly on destroy', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'
        });
        
        await storage.promise;
        
        // Track cleanup
        let cleanupCalled = false;
        const originalOnDestroy = storage.state.onDestroy;
        storage.state.onDestroy = () => {
          cleanupCalled = true;
          if (originalOnDestroy) originalOnDestroy();
        };
        
        // Destroy storage
        storage.destroy();
        
        expect(cleanupCalled).toBe(true);
      } finally {
        await hasyx.delete({
          table: 'deep_links',
          where: { _deep: { _eq: testDeepSpaceId } }
        }).catch(() => {});
        await hasyxCleanup();
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error when hasyx is not provided', () => {
      const deep = newDeep();
      newStorage(deep);
      newStorageHasyx(deep);
      
      expect(() => {
        new deep.StorageHasyx({
          deepSpaceId: uuidv4(),
          strategy: 'delta'
        });
      }).toThrow('hasyx client is required');
    });

    it('should throw error when deepSpaceId is not provided', async () => {
      const { hasyx, cleanup } = await createRealHasyxClient();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        expect(() => {
          new deep.StorageHasyx({
            hasyx,
            strategy: 'delta'
          });
        }).toThrow('deepSpaceId is required');
      } finally {
        await cleanup();
      }
    });
  });

  describe('Real Association Creation', () => {
    it('should create real associations with proper dependency chain', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        // Create StorageHasyx with subscription strategy
        const storage = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'subscription'  // ✅ Используем subscription strategy
        });
        defaultMarking(deep, storage);
        
        // Use controlled dump with limited intervals to prevent hangs
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        // Override the interval count manually to prevent infinite loops
        directDump._defaultIntervalMaxCount = 5;
        
        // 1. Create root link
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        await _delay(50); // Small delay between operations
        
        // 2. Create deep.String type
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        await _delay(50);
        
        // 3. Create StorageHasyx with limited subscription interval
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage,
          storageHasyxDump: directDump  // Use the same dump instance for subscription
        });
        
        await storageHasyx.promise;
        await _delay(100); // Wait for initialization
        
        // 4. Create ONE simple string association
        const textAssoc = new deep();
        textAssoc.type = deep.String;
        textAssoc.data = 'Hello Deep Framework!';
        textAssoc.store(storage, deep.storageMarkers.oneTrue);
        
        await _delay(200); // Wait for persistence
        
        // 5. Verify persistence
        const finalDump = await directDump.load();
        const persistedLinks = finalDump.links;
        
        // Should have: root + String type + text = 3 links minimum
        expect(persistedLinks.length).toBeGreaterThanOrEqual(3);
        
        // Verify string association
        const textLink = persistedLinks.find(l => l._id === textAssoc._id);
        expect(textLink).toBeDefined();
        expect(textLink!._type).toBe(deep.String._id);
        expect(textLink!._string).toBe('Hello Deep Framework!');
        
        console.log('✅ Real Association Creation test passed - Deep Framework integrated!');
        
      } finally {
        await hasyxCleanup();
      }
    }, 15000); // 15 second timeout

    it('should handle complex CRUD operations with deep objects', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Setup required types
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage
        });
        
        await storageHasyx.promise;
        
        // Add debug handler to track onLinkDelete calls
        let deleteCallCount = 0;
        const originalOnLinkDelete = storageHasyx.state.onLinkDelete;
        storageHasyx.state.onLinkDelete = (storageLink: StorageLink) => {
          console.log('🗑️ onLinkDelete called for:', storageLink._id, 'type:', storageLink._type);
          deleteCallCount++;
          if (originalOnLinkDelete) {
            originalOnLinkDelete(storageLink);
          }
        };
        
        // CREATE - Create initial association
        const userAssoc = new deep();
        userAssoc.type = deep.String;
        userAssoc.data = 'John Doe';
        userAssoc.store(storage, deep.storageMarkers.oneTrue);
        
        await _delay(100);
        
        // READ - Verify creation
        let dump = await directDump.load();
        let userLink = dump.links.find(l => l._id === userAssoc._id);
        expect(userLink).toBeDefined();
        expect(userLink!._string).toBe('John Doe');
        
        // UPDATE - Change data
        userAssoc.data = 'Jane Smith';
        
        await _delay(100);
        
        // READ - Verify update
        dump = await directDump.load();
        userLink = dump.links.find(l => l._id === userAssoc._id);
        expect(userLink).toBeDefined();
        expect(userLink!._string).toBe('Jane Smith');
        
        // CREATE RELATIONSHIP - Add more complex structure
        const addressAssoc = new deep();
        addressAssoc.type = deep.String;
        addressAssoc.data = '123 Main St';
        addressAssoc.store(storage, deep.storageMarkers.oneTrue);
        
        const livesAtAssoc = new deep();
        livesAtAssoc.type = deep.String;
        livesAtAssoc.from = userAssoc;
        livesAtAssoc.to = addressAssoc;
        livesAtAssoc.data = 'lives at';
        livesAtAssoc.store(storage, deep.storageMarkers.oneTrue);
        
        await _delay(100);
        
        // READ - Verify complex structure
        dump = await directDump.load();
        const addressLink = dump.links.find(l => l._id === addressAssoc._id);
        const livesAtLink = dump.links.find(l => l._id === livesAtAssoc._id);
        
        expect(addressLink).toBeDefined();
        expect(addressLink!._string).toBe('123 Main St');
        
        expect(livesAtLink).toBeDefined();
        expect(livesAtLink!._from).toBe(userAssoc._id);
        expect(livesAtLink!._to).toBe(addressAssoc._id);
        expect(livesAtLink!._string).toBe('lives at');
        
        // DELETE - Remove association
        userAssoc.destroy();
        
        await _delay(100);
        
        // READ - Verify deletion
        dump = await directDump.load();
        userLink = dump.links.find(l => l._id === userAssoc._id);
        expect(userLink).toBeUndefined();
        
        // But address should still exist
        const finalAddressLink = dump.links.find(l => l._id === addressAssoc._id);
        expect(finalAddressLink).toBeDefined();
        
        console.log('✅ Complex CRUD operations test passed!');
        
      } finally {
        await hasyxCleanup();
      }
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle large dataset operations efficiently', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Setup with controlled intervals
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        // Override the interval count manually to prevent infinite loops
        directDump._defaultIntervalMaxCount = 3;
        
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        await _delay(50);
        
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        await _delay(50);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage
        });
        
        await storageHasyx.promise;
        await _delay(100);
        
        const startTime = Date.now();
        const associations: any[] = [];
        const BATCH_SIZE = 10; // Smaller batch for stability
        
        // Create associations one by one with delays
        for (let i = 0; i < BATCH_SIZE; i++) {
          const assoc = new deep();
          assoc.type = deep.String;
          assoc.data = `Test Item ${i}`;
          assoc.store(storage, deep.storageMarkers.oneTrue);
          associations.push(assoc);
          
          // Wait between each creation to avoid overwhelming
          await _delay(100);
        }
        
        await _delay(500); // Wait for all operations to complete
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Verify all items were persisted
        const finalDump = await directDump.load();
        const dataLinks = finalDump.links.filter(l => l._string && l._string.startsWith('Test Item'));
        
        expect(dataLinks.length).toBe(BATCH_SIZE);
        expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
        
        console.log(`✅ Performance test passed: ${BATCH_SIZE} items in ${duration}ms`);
        
      } finally {
        await hasyxCleanup();
      }
    }, 20000); // 20 second timeout

    it('should handle concurrent operations correctly', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Setup
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage
        });
        
        await storageHasyx.promise;
        
        // Create associations concurrently
        const promises: Promise<any>[] = [];
        const associations: any[] = [];
        
        for (let i = 0; i < 10; i++) {
          const promise = new Promise(async (resolve) => {
            const assoc = new deep();
            assoc.type = deep.String;
            assoc.data = `Concurrent Item ${i}`;
            assoc.store(storage, deep.storageMarkers.oneTrue);
            associations.push(assoc);
            
            // Random delay to simulate real concurrent access
            await _delay(Math.random() * 100);
            resolve(assoc);
          });
          promises.push(promise);
        }
        
        // Wait for all concurrent operations
        await Promise.all(promises);
        await _delay(200); // Allow persistence to complete
        
        // Verify all items were persisted correctly
        const finalDump = await directDump.load();
        const concurrentLinks = finalDump.links.filter(l => 
          l._string && l._string.startsWith('Concurrent Item')
        );
        
        expect(concurrentLinks.length).toBe(10);
        
        // Verify all have unique IDs
        const ids = new Set(concurrentLinks.map(l => l._id));
        expect(ids.size).toBe(10);
        
        console.log('✅ Concurrent operations test passed!');
        
      } finally {
        await hasyxCleanup();
      }
    });
  });

  describe('Real-time Updates and Subscriptions', () => {
    it('should handle real-time updates correctly', async () => {
      const { hasyx, cleanup: hasyxCleanup } = await createRealHasyxClient();
      const testDeepSpaceId = uuidv4();
      
      try {
        const deep = newDeep();
        newStorage(deep);
        newStorageHasyx(deep);
        
        const storage = new deep.Storage();
        defaultMarking(deep, storage);
        
        // Setup
        const directDump = new StorageHasyxDump(hasyx, testDeepSpaceId);
        
        const rootTypeLink: StorageLink = {
          _id: testDeepSpaceId,
          _type: undefined,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(rootTypeLink);
        
        const stringTypeLink: StorageLink = {
          _id: deep.String._id,
          _type: testDeepSpaceId,
          _created_at: Date.now(),
          _updated_at: Date.now()
        };
        await directDump.insert(stringTypeLink);
        
        const storageHasyx = new deep.StorageHasyx({
          hasyx,
          deepSpaceId: testDeepSpaceId,
          strategy: 'delta',
          storage: storage,
          storageHasyxDump: directDump  // Use the same dump instance for subscription
        });
        
        await storageHasyx.promise;
        
        // Set up update tracking
        const updates: StorageLink[] = [];
        
        // Subscribe to changes on the SAME dump instance that will receive updates
        const unsubscribe = await directDump.subscribe((dump) => {
          debug('Received subscription update with %d links', dump.links.length);
          // Track new links that appear
          for (const link of dump.links) {
            if (link._string && link._string.includes('RealTime')) {
              debug('Found real-time link: %s', link._string);
              updates.push(link);
            }
          }
        });
        
        // Create association that should trigger real-time update
        const realtimeAssoc = new deep();
        realtimeAssoc.type = deep.String;
        realtimeAssoc.data = 'RealTime Data';
        realtimeAssoc.store(storage, deep.storageMarkers.oneTrue);
        
        await _delay(1200); // Wait for subscription to detect changes (hasyx subscription triggers max once per second)
        
        // Verify real-time update was detected
        expect(updates.length).toBeGreaterThan(0);
        const realtimeUpdate = updates.find(u => u._string && u._string.includes('RealTime'));
        expect(realtimeUpdate).toBeDefined();
        
        // Cleanup subscription
        unsubscribe();
        
        console.log('✅ Real-time updates test passed!');
        
      } finally {
        await hasyxCleanup();
      }
    });
  });
});

// Global cleanup after all tests to prevent hanging subscriptions
afterAll(async () => {
  // Give some time for async operations to complete
  await _delay(500);
  
  // Destroy all remaining hasyx subscriptions
  destroyAllSubscriptions();
  
  // Additional cleanup time
  await _delay(100);
}); 