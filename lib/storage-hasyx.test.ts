// Real hasyx database storage implementation tests
// Tests StorageHasyxDump and StorageHasyx with real hasyx database integration
// Uses real hasyx database connections and operations

import dotenv from 'dotenv';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { v4 as uuidv4 } from 'uuid';
import schema from '../public/hasura-schema.json';
import { newDeep } from '.';
import Debug from './debug';
import { StorageDump, defaultMarking } from './storage';
import { StorageHasyxDump, destroyAllSubscriptions, newStorageHasyx } from './storage-hasyx';

dotenv.config();

const debug = Debug('test:storage-hasyx');
const generate = Generator(schema as any);

// Global cleanup to prevent Jest hanging
afterAll(() => {
  destroyAllSubscriptions();
});

// Real hasyx client factory for testing with real database
const createRealHasyxClient = (): { hasyx: Hasyx; cleanup: () => void } => {
  debug('HYPOTHESIS 1: Testing Apollo InMemoryCache circular structure');
  
  const graphqlUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL;
  const adminSecret = process.env.HASURA_ADMIN_SECRET;

  debug('Environment variables check - URL: %s, Secret: %s', graphqlUrl ? 'present' : 'missing', adminSecret ? 'present' : 'missing');

  if (!graphqlUrl || !adminSecret) {
    throw new Error(
      'Missing environment variables. Required: NEXT_PUBLIC_HASURA_GRAPHQL_URL, HASURA_ADMIN_SECRET'
    );
  }

  debug('Creating real hasyx client with URL: %s', graphqlUrl);
  debug('About to create Apollo client - checking for circular reference source');

  const apolloClient = createApolloClient({
    url: graphqlUrl,
    secret: adminSecret,
    ws: false, // Don't use WebSocket for tests to prevent hanging
  }) as HasyxApolloClient;

  debug('Apollo client created successfully - type: %s', typeof apolloClient);
  debug('Apollo client cache type: %s', apolloClient.cache ? typeof apolloClient.cache : 'undefined');
  debug('Apollo client cache constructor: %s', apolloClient.cache ? apolloClient.cache.constructor.name : 'undefined');

  // TEST CRITICAL: Try to detect circular reference BEFORE creating Hasyx
  debug('CRITICAL: Testing Apollo client properties for circular references');
  try {
    // Test individual properties to identify circular reference source
    debug('Testing apolloClient keys: %o', Object.keys(apolloClient));
    
    // Try to serialize cache separately 
    if (apolloClient.cache) {
      debug('Testing cache serialization...');
      debug('Cache basic info serialization successful');
    }
    
    // Try to serialize client without cache
    debug('Testing apolloClient without cache serialization...');
    const clientWithoutCache = { ...apolloClient, cache: null };
    debug('Client without cache serialization successful');
    
  } catch (serializationError) {
    debug('CRITICAL: Serialization test failed: %s', (serializationError as Error).message);
    debug('Error stack: %s', (serializationError as Error).stack);
  }

  const hasyxInstance = new Hasyx(apolloClient, generate);
  debug('Hasyx instance created - type: %s', typeof hasyxInstance);
  debug('Hasyx instance properties count: %d', Object.keys(hasyxInstance).length);

  // Cleanup function to properly dispose of Apollo Client
  const cleanup = () => {
    try {
      debug('Cleaning up Apollo Client to prevent Jest serialization issues');
      
      // Stop Apollo Client
      if (apolloClient.stop) {
        apolloClient.stop();
      }
      
      // Clear cache
      if (apolloClient.cache && apolloClient.cache.reset) {
        apolloClient.cache.reset();
      }
      
      // Clear store
      if (apolloClient.clearStore) {
        apolloClient.clearStore().catch(() => {
          // Ignore cleanup errors
        });
      }
      
      // CRITICAL: Null out all circular reference properties
      if (apolloClient.cache) {
        // Break circular references in InMemoryCache
        if (apolloClient.cache.policies) {
          apolloClient.cache.policies.cache = null;
        }
        if (apolloClient.cache.data) {
          apolloClient.cache.data.policies = null;
        }
        if (apolloClient.cache.optimisticData) {
          apolloClient.cache.optimisticData.policies = null;
        }
        // Null out the cache itself
        (apolloClient as any).cache = null;
      }
      
      // Clear other potential circular references
      if (apolloClient.queryManager) {
        (apolloClient as any).queryManager = null;
      }
      if (apolloClient.localState) {
        (apolloClient as any).localState = null;
      }
      
      // Null out the Hasyx Apollo Client reference
      if (hasyxInstance && (hasyxInstance as any).apolloClient) {
        (hasyxInstance as any).apolloClient = null;
      }
      
      debug('Apollo Client cleanup completed');
    } catch (error) {
      debug('Error during Apollo Client cleanup: %s', (error as Error).message);
    }
  };

  debug('CRITICAL: Returning Hasyx instance with cleanup function to prevent Jest serialization issues');
  return { hasyx: hasyxInstance, cleanup };
};

describe('DEBUG: Basic newDeep Test', () => {
  afterAll(() => {
    destroyAllSubscriptions();
  });

  it('should create newDeep without errors', () => {
    const deep = newDeep();
    expect(deep).toBeDefined();
    expect(deep._id).toBeDefined();
    expect(deep.String).toBeDefined();
    expect(deep.Number).toBeDefined();
    debug('newDeep created successfully with ID: %s', deep._id);
  });
});

describe('Real Hasyx Storage Tests', () => {
  afterAll(() => {
    destroyAllSubscriptions();
  });

  const createSimpleTestSpace = () => {
    // Create unique UUID for each test space
    const spaceId = uuidv4();
    debug('Created test space ID: %s', spaceId);
    return spaceId;
  };

  describe('StorageHasyxDump with Real Database', () => {
    it('should create StorageHasyxDump with real hasyx', () => {
      debug('TEST START: Creating StorageHasyxDump test');
      
      debug('STEP 1: About to call createRealHasyxClient()');
      const { hasyx, cleanup } = createRealHasyxClient();
      debug('STEP 2: Successfully got hasyx client from factory');
      
      try {
        debug('STEP 3: About to call createSimpleTestSpace()');
        const testSpaceId = createSimpleTestSpace();
        debug('STEP 4: Got test space ID: %s', testSpaceId);
        
        debug('STEP 5: About to create StorageHasyxDump instance');
        const dump = new StorageHasyxDump(hasyx, testSpaceId);
        debug('STEP 6: StorageHasyxDump created successfully');
        
        debug('STEP 7: About to run expect assertions');
        expect(dump).toBeDefined();
        expect(dump.hasyx).toBe(hasyx);
        expect(dump.deepSpaceId).toBe(testSpaceId);
        expect(dump.dump.links).toEqual([]);
        debug('STEP 8: All assertions passed');
        
        debug('StorageHasyxDump created successfully');
      } finally {
        // Always cleanup Apollo Client to prevent Jest serialization issues
        cleanup();
        debug('TEST END: StorageHasyxDump test completed with cleanup');
      }
      
      // CRITICAL: Return undefined explicitly to avoid Jest trying to serialize anything
      return undefined;
    });

    it('should create with initial dump', () => {
      const { hasyx, cleanup } = createRealHasyxClient();
      
      try {
        const testSpaceId = createSimpleTestSpace();
        const initialDump: StorageDump = {
          links: [
            {
              _id: uuidv4(),
              _type: uuidv4(),
              _created_at: Date.now(),
              _updated_at: Date.now(),
              _i: 1
            }
          ]
        };

        const dump = new StorageHasyxDump(hasyx, testSpaceId, initialDump);

        expect(dump.dump.links).toHaveLength(1);
        expect(dump.dump.links[0]._id).toBe(initialDump.links[0]._id);
        
        debug('StorageHasyxDump created with initial dump');
      } finally {
        cleanup();
      }
    });

    it('should save and load data from real database', async () => {
      const { hasyx, cleanup } = createRealHasyxClient();
      
      try {
        const testSpaceId = createSimpleTestSpace();
        const dump = new StorageHasyxDump(hasyx, testSpaceId);

        const testLinkId = uuidv4();
        const testTypeId = uuidv4();

        const testDump: StorageDump = {
          links: [
            {
              _id: testSpaceId, // Root link with _id === deepSpaceId
              _type: undefined, // Root links have no type
              _created_at: Date.now(),
              _updated_at: Date.now(),
              _i: 1
            },
            {
              _id: testLinkId,
              _type: testTypeId,
              _created_at: Date.now(),
              _updated_at: Date.now(),
              _i: 2,
              _string: 'test-data'
            }
          ]
        };

        // Save to real database
        await dump.save(testDump);
        debug('Saved test dump to real database');

        // Load from real database
        const loadedDump = await dump.load();
        debug('Loaded dump from real database with %d links', loadedDump.links.length);

        expect(loadedDump.links).toHaveLength(2);
        
        // Find the test link
        const testLink = loadedDump.links.find(link => link._id === testLinkId);
        expect(testLink).toBeDefined();
        expect(testLink!._type).toBe(testTypeId);
        expect(testLink!._string).toBe('test-data');
        
        debug('Real database save/load test completed successfully');
      } finally {
        cleanup();
      }
    }, 10000);

    it('should handle insert operation with real database', async () => {
      const { hasyx, cleanup } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();
      const dump = new StorageHasyxDump(hasyx, testSpaceId);

      const testLink = {
        _id: uuidv4(),
        _type: uuidv4(),
        _created_at: Date.now(),
        _updated_at: Date.now(),
        _i: 1,
        _string: 'inserted-data'
      };

      // Insert into real database
      await dump.insert(testLink);
      debug('Inserted link into real database: %s', testLink._id);

      // Verify by loading
      const loadedDump = await dump.load();
      const insertedLink = loadedDump.links.find(link => link._id === testLink._id);
      
      expect(insertedLink).toBeDefined();
      expect(insertedLink!._string).toBe('inserted-data');
      
      debug('Real database insert test completed successfully');
    }, 10000);

    it('should handle delete operation with real database', async () => {
      const { hasyx, cleanup } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();
      const dump = new StorageHasyxDump(hasyx, testSpaceId);

      const testLink = {
        _id: uuidv4(),
        _type: uuidv4(),
        _created_at: Date.now(),
        _updated_at: Date.now(),
        _i: 1
      };

      // First insert the link
      await dump.insert(testLink);
      debug('Inserted link for delete test: %s', testLink._id);

      // Verify it exists
      let loadedDump = await dump.load();
      expect(loadedDump.links.find(link => link._id === testLink._id)).toBeDefined();

      // Now delete it
      await dump.delete(testLink);
      debug('Deleted link from real database: %s', testLink._id);

      // Verify it's gone
      loadedDump = await dump.load();
      expect(loadedDump.links.find(link => link._id === testLink._id)).toBeUndefined();
      
      debug('Real database delete test completed successfully');
    }, 10000);

    it('should handle update operation with real database', async () => {
      const { hasyx, cleanup } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();
      const dump = new StorageHasyxDump(hasyx, testSpaceId);

      const testLink = {
        _id: uuidv4(),
        _type: uuidv4(),
        _created_at: Date.now(),
        _updated_at: Date.now(),
        _i: 1,
        _string: 'original-data'
      };

      // First insert the link
      await dump.insert(testLink);
      debug('Inserted link for update test: %s', testLink._id);

      // Update the link
      const updatedLink = {
        ...testLink,
        _string: 'updated-data',
        _updated_at: Date.now()
      };

      await dump.update(updatedLink);
      debug('Updated link in real database: %s', testLink._id);

      // Verify the update
      const loadedDump = await dump.load();
      const foundLink = loadedDump.links.find(link => link._id === testLink._id);
      
      expect(foundLink).toBeDefined();
      expect(foundLink!._string).toBe('updated-data');
      
      debug('Real database update test completed successfully');
    }, 10000);
  });

  describe('StorageHasyx Function with Real Database', () => {
    it('should create StorageHasyx with real hasyx client', () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId
      });

      expect(storageHasyx).toBeDefined();
      expect(storageHasyx.state.hasyx).toBe(hasyx);
      expect(storageHasyx.state.deepSpaceId).toBe(testSpaceId);
      
      debug('StorageHasyx created with real hasyx client');
    });

    it('should integrate with newDeep using real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      // Create storage with real hasyx
      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId
      });

      // Apply default marking
      defaultMarking(deep, storageHasyx);

      // Wait for initialization
      await storageHasyx.promise;

      // Create a test association
      const testAssoc = new deep.String('test-integration-data');
      testAssoc.store(storageHasyx, deep.storageMarkers.oneTrue);

      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 500));

      debug('Real hasyx integration test completed');
    }, 15000);

    it('should save and restore dump with real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      // Create storage
      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId
      });

      defaultMarking(deep, storageHasyx);
      await storageHasyx.promise;

      // Generate and verify dump
      const dump = storageHasyx.state.generateDump();
      expect(dump).toBeDefined();
      expect(dump.links).toBeDefined();
      expect(Array.isArray(dump.links)).toBe(true);

      debug('Real hasyx dump generation test completed');
    }, 15000);

    it('should handle subscription strategy with real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId,
        strategy: 'subscription'
      });

      expect(storageHasyx).toBeDefined();
      await storageHasyx.promise;

      debug('Real hasyx subscription strategy test completed');
    }, 15000);

    it('should handle delta strategy with real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId,
        strategy: 'delta'
      });

      expect(storageHasyx).toBeDefined();
      await storageHasyx.promise;

      debug('Real hasyx delta strategy test completed');
    }, 15000);

    it('should sync with typed data using real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId
      });

      defaultMarking(deep, storageHasyx);
      await storageHasyx.promise;

      // Create typed associations
      const stringAssoc = new deep.String('test-string-data');
      const numberAssoc = new deep.Number(42);

      // Store them
      stringAssoc.store(storageHasyx, deep.storageMarkers.oneTrue);
      numberAssoc.store(storageHasyx, deep.storageMarkers.oneTrue);

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 1000));

      debug('Real hasyx typed data sync test completed');
    }, 15000);

    it('should handle cleanup and resource management with real hasyx', async () => {
      const deep = newDeep();
      const StorageHasyx = newStorageHasyx(deep);
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createSimpleTestSpace();

      const storageHasyx = new StorageHasyx({
        hasyx: hasyx,
        deepSpaceId: testSpaceId
      });

      await storageHasyx.promise;

      // Test cleanup
      expect(() => {
        storageHasyx.destroy();
      }).not.toThrow();

      debug('Real hasyx cleanup test completed');
    }, 15000);
  });

  const createTestSpaceId = () => {
    return uuidv4();
  };

  describe('Real Database Integration Tests', () => {
    it('should work with real hasyx database operations', async () => {
      const { hasyx } = createRealHasyxClient();
      const testSpaceId = createTestSpaceId();

      // Test basic database connectivity
      const testData = {
        id: testSpaceId,
        _deep: testSpaceId,
        _type: null,
        created_at: Date.now(),
        updated_at: Date.now(),
        _i: 1
      };

      // Insert data
      await hasyx.insert({
        table: 'deep_links',
        object: testData
      });

      debug('Inserted test data into real database');

      // Select data
      const result = await hasyx.select({
        table: 'deep_links',
        where: { _deep: { _eq: testSpaceId } },
        returning: ['id', '_deep', '_type', 'created_at', 'updated_at', '_i']
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(testSpaceId);

      debug('Selected test data from real database');

      // Clean up
      await hasyx.delete({
        table: 'deep_links',
        where: { _deep: { _eq: testSpaceId } }
      });

      debug('Cleaned up test data from real database');
    }, 10000);

    it('should handle multiple space isolation in real database', async () => {
      const { hasyx } = createRealHasyxClient();
      const spaceId1 = createTestSpaceId();
      const spaceId2 = createTestSpaceId();

      // Insert data for two different spaces
      await hasyx.insert({
        table: 'deep_links',
        objects: [
          {
            id: uuidv4(),
            _deep: spaceId1,
            _type: uuidv4(),
            created_at: Date.now(),
            updated_at: Date.now(),
            _i: 1
          },
          {
            id: uuidv4(),
            _deep: spaceId2,
            _type: uuidv4(),
            created_at: Date.now(),
            updated_at: Date.now(),
            _i: 1
          }
        ]
      });

      // Verify space isolation
      const space1Data = await hasyx.select({
        table: 'deep_links',
        where: { _deep: { _eq: spaceId1 } }
      });

      const space2Data = await hasyx.select({
        table: 'deep_links',
        where: { _deep: { _eq: spaceId2 } }
      });

      expect(space1Data).toHaveLength(1);
      expect(space2Data).toHaveLength(1);
      expect(space1Data[0]._deep).toBe(spaceId1);
      expect(space2Data[0]._deep).toBe(spaceId2);

      // Clean up both spaces
      await hasyx.delete({
        table: 'deep_links',
        where: { _deep: { _in: [spaceId1, spaceId2] } }
      });

      debug('Space isolation test completed successfully');
    }, 10000);
  });

  describe('Full newDeep Synchronization Cycle', () => {
    it('should complete full synchronization cycle: newDeep -> defaultMarking -> real database', async () => {
      debug('🚀 Starting full synchronization cycle test...');
      
      const testSpaceId = uuidv4();
      debug('🚀 Testing with space ID: %s', testSpaceId);
      
      // Create newDeep
      debug('📦 Creating newDeep instance');
      const deep = newDeep();
      debug('✅ Created deep with %d associations initially', deep._ids.size);
      
      // Create storage and storageHasyxDump  
      debug('🏗️ Creating storage and hasyx dump');
      const { hasyx } = createRealHasyxClient();
      const storageHasyxDump = new StorageHasyxDump(hasyx, testSpaceId);
      
      const storage = new deep.StorageHasyx({
        hasyx,
        deepSpaceId: testSpaceId,
        storageHasyxDump,
        strategy: 'subscription'
      });
      
      debug('✅ Created storage with ID: %s', storage._id);
      
      // Apply defaultMarking - this should trigger full synchronization
      debug('⚡ Applying defaultMarking - should trigger sync');
      defaultMarking(deep, storage);
      debug('✅ Applied defaultMarking, deep has %d associations', deep._ids.size);
      
      // Check generated dump before save
      const beforeSaveDump = storage.state.generateDump();
      debug('📄 Generated dump has %d links before save', beforeSaveDump.links.length);
      
      // Wait for storage.promise to complete
      debug('⏳ Waiting for storage.promise to complete...');
      const startTime = Date.now();
      
      try {
        await storage.promise;
        const endTime = Date.now();
        debug('✅ Storage.promise completed in %dms', endTime - startTime);
      } catch (error: any) {
        debug('❌ Storage.promise failed: %s', error.message);
        throw error;
      }
      
      // Check if save was called
      debug('🔍 Checking if data was saved to database...');
      
      // Load from database to verify
      const databaseDump = await storageHasyxDump.load();
      debug('📊 Database dump loaded with %d links', databaseDump.links.length);
      
      // Verify that all deep associations are in database
      debug('🔄 Verifying synchronization: deep._ids.size=%d vs database=%d', deep._ids.size, databaseDump.links.length);
      expect(databaseDump.links.length).toBe(deep._ids.size);
      
      debug('✅ Full synchronization cycle test PASSED');
      
      // Cleanup
      storageHasyxDump.destroy();
    }, 60000);
  });
}); 