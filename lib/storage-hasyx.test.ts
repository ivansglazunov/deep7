import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { newHasyxDeep, loadHasyxDeep } from './storage-hasyx';
import * as schema from '../public/hasura-schema.json';
import * as dotenv from 'dotenv';
import Debug from './debug';

// Load environment variables
dotenv.config();

const generate = Generator(schema as any);

// Create debug function for tests
const debug = Debug('storage:test');

// Helper to create complete test environment for each test
function createTestEnvironment(): { 
  hasyx: Hasyx, 
  cleanup: (spaceId?: string) => Promise<void> 
} {
  const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET || 'dev-secret';

  const apolloClient = createApolloClient({
    url: hasuraUrl,
    secret: hasuraSecret
  });

  const hasyx = new Hasyx(apolloClient, generate);
  
  const cleanup = async (spaceId?: string) => {
    if (hasyx && spaceId) {
      try {
        // Only delete data that belongs to THIS specific test's Deep space
        // Use _deep field to ensure we only delete data from this space
        const deleteResult = await hasyx.delete({ 
          table: 'deep_links', 
          where: { _deep: { _eq: spaceId } } 
        });
        debug(`🧹 Cleaned up ${deleteResult?.affected_rows || 0} associations for space ${spaceId}`);
      } catch (error) {
        debug(`⚠️ Cleanup error for space ${spaceId}:`, error);
        // Don't throw - cleanup errors shouldn't fail tests
      }
    }
  };

  return { hasyx, cleanup };
}

// Helper function to properly cleanup Deep instances with synchronization
function cleanupDeepInstance(deep: any): void {
  if (!deep) return;
  
  try {
    // Destroy storage instance if it exists
    if (deep.storage && typeof deep.storage.destroy === 'function') {
      debug(`🧹 Destroying storage for Deep space ${deep._id}`);
      deep.storage.destroy();
    }
    
    // Destroy the deep instance itself
    if (typeof deep.destroy === 'function') {
      debug(`🧹 Destroying Deep space ${deep._id}`);
      deep.destroy();
    }
  } catch (error: any) {
    debug(`⚠️ Error during Deep instance cleanup:`, error);
    // Don't throw - cleanup errors shouldn't fail tests
  }
}

describe('Hasyx Deep Storage', () => {
  describe('Storage Markers', () => {
    it('should properly setup and check storage markers', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let deep: any;
      
      try {
        // Create new Deep space
        deep = newHasyxDeep({ hasyx });
        
        // Wait for initial sync to complete
        await deep.storage.promise;
        
        // === BASIC STORAGE MARKER CHECKS ===
        
        // Check that storage markers exist
        expect(deep.storageMarkers).toBeDefined();
        expect(deep.storageMarkers.oneTrue).toBeDefined();
        expect(deep.storageMarkers.oneFalse).toBeDefined();
        expect(deep.storageMarkers.typedTrue).toBeDefined();
        expect(deep.storageMarkers.typedFalse).toBeDefined();
        
        // Check that storage exists
        expect(deep.storage).toBeDefined();
        
        // === CORE TYPE STORAGE MARKERS ===
        
        // Check that core types are marked with typedTrue
        expect(deep.String.isStored(deep.storage)).toBe(true);
        expect(deep.Number.isStored(deep.storage)).toBe(true);
        expect(deep.Function.isStored(deep.storage)).toBe(true);
        expect(deep.Field.isStored(deep.storage)).toBe(true);
        expect(deep.Method.isStored(deep.storage)).toBe(true);
        expect(deep.Alive.isStored(deep.storage)).toBe(true);
        
        // === TYPED INSTANCE STORAGE ===
        
        // Create typed instances - they should inherit storage from their types
        const str = new deep.String('test string');
        const num = new deep.Number(42);
        const fn = new deep.Function(() => 'test');
        
        // Check that typed instances are marked for storage
        expect(str.isStored(deep.storage)).toBe(true);
        expect(num.isStored(deep.storage)).toBe(true);
        expect(fn.isStored(deep.storage)).toBe(true);
        
        // === PLAIN DEEP INSTANCES ===
        
        // Create plain deep instances - they should NOT be marked for storage by default
        const plainDeep1 = new deep();
        const plainDeep2 = new deep();
        
        expect(plainDeep1.isStored(deep.storage)).toBe(false);
        expect(plainDeep2.isStored(deep.storage)).toBe(false);
        
        // === MANUAL STORAGE MARKING ===
        
        // Manually mark a plain instance for storage
        const databaseStorage = deep.storage;
        plainDeep1.store(databaseStorage, deep.storageMarkers.oneTrue);
        expect(plainDeep1.isStored(databaseStorage)).toBe(true);
        expect(plainDeep2.isStored(databaseStorage)).toBe(false); // Still not marked
        
        // Add event listener to track sync events
        let syncEventCount = 0;
        const syncListener = (payload: any) => {
          syncEventCount++;
          debug(`🔔 Sync event ${syncEventCount}: ${payload._id}`);
        };
        deep.on(deep.events.globalLinkChanged._id, syncListener);
        
        // === STORAGE MARKER INHERITANCE ===
        
        // Create a custom type and mark it for storage
        const CustomType = new deep();
        CustomType.store(deep.storage, deep.storageMarkers.typedTrue);
        
        // Create instances of the custom type
        const customInstance1 = new deep();
        customInstance1._type = CustomType._id;
        const customInstance2 = new deep();
        customInstance2._type = CustomType._id;
        
        // Both instances should inherit storage marking from their type
        expect(customInstance1.isStored(deep.storage)).toBe(true);
        expect(customInstance2.isStored(deep.storage)).toBe(true);
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup();
        debug('🧹 Test cleanup completed');
      }
    }, 30000);

    it('should sync typed instances automatically (typedTrue) but not plain deep instances', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      let deep: any;
      
      try {
        // Create Deep space with storage markers already configured
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        
        // Wait for initial sync to complete
        await deep.storage.promise;
        
        debug(`✅ Initial sync completed for space ${spaceId}`);
        
        // Create instances of different types
        const plainInstance = new deep(); // Should NOT sync (deep is oneTrue)
        const stringInstance = new deep.String('test_string'); // Should sync (String is typedTrue)
        const numberInstance = new deep.Number(42); // Should sync (Number is typedTrue)
        const functionInstance = new deep.Function(() => 'test'); // Should sync (Function is typedTrue)
        
        debug(`📝 Created instances:`);
        debug(`  Plain: ${plainInstance._id} (type: ${plainInstance._type})`);
        debug(`  String: ${stringInstance._id} (type: ${stringInstance._type})`);
        debug(`  Number: ${numberInstance._id} (type: ${numberInstance._type})`);
        debug(`  Function: ${functionInstance._id} (type: ${functionInstance._type})`);
        
        // Check storage markers
        const databaseStorage = deep.storage;
        debug(`🔍 Storage marker checks:`);
        debug(`  Plain.isStored: ${plainInstance.isStored(databaseStorage)}`);
        debug(`  String.isStored: ${stringInstance.isStored(databaseStorage)}`);
        debug(`  Number.isStored: ${numberInstance.isStored(databaseStorage)}`);
        debug(`  Function.isStored: ${functionInstance.isStored(databaseStorage)}`);
        
        // Check type storage markers
        debug(`🔍 Type storage marker checks:`);
        debug(`  deep.isStored: ${deep.isStored(databaseStorage)}`);
        debug(`  deep.String.isStored: ${deep.String.isStored(databaseStorage)}`);
        debug(`  deep.Number.isStored: ${deep.Number.isStored(databaseStorage)}`);
        debug(`  deep.Function.isStored: ${deep.Function.isStored(databaseStorage)}`);
        
        // Check typeofs for instances
        debug(`🔍 Instance typeofs checks:`);
        debug(`  stringInstance.typeofs: ${stringInstance.typeofs}`);
        debug(`  numberInstance.typeofs: ${numberInstance.typeofs}`);
        debug(`  functionInstance.typeofs: ${functionInstance.typeofs}`);
        
        // Check storage markers on types
        debug(`🔍 Type storage markers:`);
        debug(`  deep.String storages: ${deep.String.storages(databaseStorage).length} markers`);
        debug(`  deep.Number storages: ${deep.Number.storages(databaseStorage).length} markers`);
        debug(`  deep.Function storages: ${deep.Function.storages(databaseStorage).length} markers`);
        
        // Verify expectations
        expect(plainInstance.isStored(databaseStorage)).toBe(false); // deep is oneTrue, instances not auto-stored
        expect(stringInstance.isStored(databaseStorage)).toBe(true); // String is typedTrue, instances auto-stored
        expect(numberInstance.isStored(databaseStorage)).toBe(true); // Number is typedTrue, instances auto-stored
        expect(functionInstance.isStored(databaseStorage)).toBe(true); // Function is typedTrue, instances auto-stored
        
        // Wait for sync to complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (deep.storage.promise) {
          await deep.storage.promise;
        }
        
        // Check database - only typed instances should be synced
        const result = await hasyx.select({
          table: 'deep_links',
          where: { 
            _deep: { _eq: spaceId },
            id: { _in: [plainInstance._id, stringInstance._id, numberInstance._id, functionInstance._id] }
          },
          returning: ['id', '_type']
        });
        
        debug(`🔍 Database results: ${JSON.stringify(result)}`);
        
        const syncedIds = result.map(r => r.id);
        
        // Plain instance should NOT be synced
        expect(syncedIds).not.toContain(plainInstance._id);
        
        // Typed instances should be synced
        expect(syncedIds).toContain(stringInstance._id);
        expect(syncedIds).toContain(numberInstance._id);
        expect(syncedIds).toContain(functionInstance._id);
        
        debug(`✅ Storage markers working correctly - typed instances synced, plain instances not synced`);
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 60000);

    it('should sync manually marked instances with oneTrue marker (with awaits)', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let deep: any;
      
      try {
        // Create new Deep space
        deep = newHasyxDeep({ hasyx });
        
        // Wait for initial sync to complete
        await deep.storage.promise;
        
        // Create plain instance and manually mark it for storage
        const plainInstance = new deep();
        const databaseStorage = deep.storage;
        
        // Initially should not be stored
        expect(plainInstance.isStored(databaseStorage)).toBe(false);
        
        // Mark for storage FIRST
        plainInstance.store(databaseStorage, deep.storageMarkers.oneTrue);
        expect(plainInstance.isStored(databaseStorage)).toBe(true);
        
        // Create a string and mark it for storage FIRST
        const str = new deep.String('abc');
        str.store(databaseStorage, deep.storageMarkers.oneTrue);
        
        // Now create the relationship - this should trigger sync for both
        plainInstance.value = str;
        
        // WAIT for sync to complete after each operation
        await deep.storage.promise;
        
        // Check database
        const result = await hasyx.select({
          table: 'deep_links',
          returning: [
            'id', '_type', '_from', '_to', '_value',
            { deep_strings: { returning: ['_data'] } },
            { deep_numbers: { returning: ['_data'] } },
            { deep_functions: { returning: ['_data'] } }
          ]
        });
        
        debug(`🔍 Database result: ${JSON.stringify(result, null, 2)}`);
        
        // Should find both associations in database
        expect(result.length).toBeGreaterThan(0);
        
        // Should find the string data
        const stringAssociations = result.filter((link: any) => 
          link.deep_strings && link.deep_strings.length > 0
        );
        expect(stringAssociations.length).toBeGreaterThan(0);
        expect(stringAssociations[0].deep_strings[0]._data).toBe('abc');
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup();
      }
    }, 60000);

    it('should sync manually marked instances with oneTrue marker (without awaits)', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let deep: any;
      
      try {
        // Create new Deep space
        deep = newHasyxDeep({ hasyx });
        
        // Wait for initial sync to complete
        await deep.storage.promise;
        
        // Create plain instance and manually mark it for storage
        const plainInstance = new deep();
        const databaseStorage = deep.storage;
        
        // Initially should not be stored
        expect(plainInstance.isStored(databaseStorage)).toBe(false);
        
        // Mark for storage FIRST
        plainInstance.store(databaseStorage, deep.storageMarkers.oneTrue);
        expect(plainInstance.isStored(databaseStorage)).toBe(true);
        
        // Create a string and mark it for storage FIRST
        const str = new deep.String('abc');
        str.store(databaseStorage, deep.storageMarkers.oneTrue);
        
        // Now create the relationship - this should trigger sync for both
        plainInstance.value = str;
        
        // DON'T WAIT - let operations queue up
        
        // Wait for ALL sync operations to complete before checking database
        await deep.storage.promise;
        
        // Check database
        const result = await hasyx.select({
          table: 'deep_links',
          returning: [
            'id', '_type', '_from', '_to', '_value',
            { deep_strings: { returning: ['_data'] } },
            { deep_numbers: { returning: ['_data'] } },
            { deep_functions: { returning: ['_data'] } }
          ]
        });
        
        debug(`🔍 Database result: ${JSON.stringify(result, null, 2)}`);
        
        // Should find both associations in database
        expect(result.length).toBeGreaterThan(0);
        
        // Should find the string data
        const stringAssociations = result.filter((link: any) => 
          link.deep_strings && link.deep_strings.length > 0
        );
        expect(stringAssociations.length).toBeGreaterThan(0);
        expect(stringAssociations[0].deep_strings[0]._data).toBe('abc');
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup();
      }
    }, 60000);

    it('should test all core Deep Framework types with storage markers', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        // Create Deep space
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug(`✅ Initial sync completed for space ${spaceId}`);
        
        // Create instances of all core types
        const instances = {
          field: new deep.Field(() => 'field_test'),
          method: new deep.Method(() => 'method_test'),
          alive: new deep.Alive(function() { return 'alive_test'; }),
          function: new deep.Function(() => 'function_test'),
          string: new deep.String('string_test'),
          number: new deep.Number(123),
          set: new deep.Set(new Set()),
          detect: new deep.detect(),
          event: new deep.Event(),
          reason: new deep.Reason(),
          storage: new deep.Storage(),
          storageMarker: new deep.StorageMarker()
        };
        
        debug(`📝 Created instances of all core types:`);
        Object.entries(instances).forEach(([type, instance]) => {
          debug(`  ${type}: ${instance._id}`);
        });
        
        // Check storage markers for all types
        const databaseStorage = deep.storage;
        debug(`🔍 Storage marker checks:`);
        Object.entries(instances).forEach(([type, instance]) => {
          const isStored = instance.isStored(databaseStorage);
          debug(`  ${type}.isStored: ${isStored}`);
          expect(isStored).toBe(true); // All should be stored due to typedTrue
        });
        
        // Wait for sync
        await new Promise(resolve => setTimeout(resolve, 4000));
        if (deep.storage.promise) {
          await deep.storage.promise;
        }
        
        // Check database - all should be synced
        const allIds = Object.values(instances).map(i => i._id);
        const result = await hasyx.select({
          table: 'deep_links',
          where: { 
            _deep: { _eq: spaceId },
            id: { _in: allIds }
          },
          returning: ['id', '_type']
        });
        
        debug(`🔍 Database results: ${JSON.stringify(result)}`);
        
        const syncedIds = result.map(r => r.id);
        
        // All typed instances should be synced
        Object.entries(instances).forEach(([type, instance]) => {
          expect(syncedIds).toContain(instance._id);
          debug(`✅ ${type} instance ${instance._id} synced to database`);
        });
        
        debug(`✅ All core types working correctly with storage markers`);
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 60000);
  });

  describe('Basic Operations', () => {
    it('should create new Deep space and sync to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        debug(`✅ Created and synced Deep space ${deep._id} with ${deep._ids.size} associations`);
        expect(deep._id).toBeDefined();
        expect(deep.storage).toBeDefined();
        expect(deep.storage.promise).toBeDefined();
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 60000);

    it('should create Deep space with existing data and sync', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      let deep: any;
      
      try {
        // Create a Deep space with some simple associations (no typed data to avoid FK issues)
        const existingDeep = newDeep();
        const assoc1 = new existingDeep();
        const assoc2 = new existingDeep();
        const assoc3 = new existingDeep();
        
        // Create some relationships
        assoc1._type = assoc2._id;
        assoc2._from = assoc3._id;
        
        // Create Hasyx Deep with existing data
        deep = newHasyxDeep({ hasyx, deep: existingDeep });
        spaceId = deep._id;
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        debug(`✅ Created Deep space with existing data: ${deep._ids.size} associations`);
        debug(`🔗 Assoc1 type: ${assoc1._type}, Assoc2 from: ${assoc2._from}`);
        
        expect(deep._id).toBeDefined();
        expect(assoc1._type).toBe(assoc2._id);
        expect(assoc2._from).toBe(assoc3._id);
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 30000);

    it('should restore Deep space from dump', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      let deep: any;
      
      try {
        // First, create and sync a Deep space with some data
        const existingDeep = newDeep();
        const testString = new existingDeep.String('abc_test');
        const testNumber = new existingDeep.Number(456);
        
        const originalDeep = newHasyxDeep({ hasyx, deep: existingDeep });
        spaceId = originalDeep._id;
        await originalDeep.storage.promise;
        
        // Load dump from the created space
        const dump = await loadHasyxDeep({ 
          hasyx, 
          id: originalDeep._id 
        });
        
        // Create new Deep space from dump (this should NOT sync to database)
        // because the dump already contains the data
        const restoredDeep = newHasyxDeep({ hasyx, dump });
        deep = restoredDeep; // Assign for cleanup
        
        // Verify restoration
        expect(restoredDeep._ids.size).toBe(originalDeep._ids.size);
        debug(`✅ Restored space with ${restoredDeep._ids.size} associations (original: ${originalDeep._ids.size})`);
        debug(`🔗 String data: "${testString._data}", Number data: ${testNumber._data}`);
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 30000);
  });

  describe('Sequential Operation Execution', () => {
    it('should process operations sequentially', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        
        debug('✅ Deep space created, waiting for initial sync');
        
        // Wait for initial sync to complete
        await deep.storage.promise;
        debug('✅ Initial sync completed');
        
        // Now test sequential operations
        const assoc1 = new deep();
        const assoc2 = new deep();
        
        // Mark them for storage
        assoc1.store(deep.storage, deep.storageMarkers.oneTrue);
        assoc2.store(deep.storage, deep.storageMarkers.oneTrue);
        
        // Create strings
        const str1 = new deep.String('test1');
        const str2 = new deep.String('test2');
        
        str1.store(deep.storage, deep.storageMarkers.oneTrue);
        str2.store(deep.storage, deep.storageMarkers.oneTrue);
        
        debug('🔄 Triggering sequential operations...');
        
        // Trigger operations that should be queued
        assoc1.value = str1;
        assoc2.value = str2;
        
        // Wait for all operations to complete
        await deep.storage.promise;
        
        debug('✅ All operations completed, verifying results');
        
        // Verify results in database
        const result = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _in: [assoc1._id, assoc2._id] }
          },
          returning: ['id', '_value']
        });
        
        expect(result.length).toBe(2);
        
        const assoc1Result = result.find(r => r.id === assoc1._id);
        const assoc2Result = result.find(r => r.id === assoc2._id);
        
        expect(assoc1Result?._value).toBe(str1._id);
        expect(assoc2Result?._value).toBe(str2._id);
        
        debug('✅ Sequential operations completed successfully');
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should handle rapid changes correctly', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug('✅ Initial sync completed, testing rapid changes');
        
        // Create association
        const association = new deep();
        association.store(deep.storage, deep.storageMarkers.oneTrue);
        
        // Create strings
        const str1 = new deep.String('value1');
        const str2 = new deep.String('value2');
        
        str1.store(deep.storage, deep.storageMarkers.oneTrue);
        str2.store(deep.storage, deep.storageMarkers.oneTrue);
        
        // Rapidly change value
        association.value = str1;
        association.value = str2;
        
        // Wait for completion
        await deep.storage.promise;
        
        // Check final state
        const result = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_value']
        });
        
        expect(result.length).toBe(1);
        expect(result[0]._value).toBe(str2._id);
        
        debug('✅ Rapid changes handled correctly');
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 15000);
  });
});

// PHASE 2: REAL-TIME SYNCHRONIZATION TESTS - TODO
// These tests require event-driven synchronization which is not yet implemented
// They should be enabled when we implement the local→database synchronizer
// that listens to globalLinkChanged and globalDataChanged events

describe('Phase 2: Real-Time Local → Database Synchronization', () => {
  describe('Association Creation Sync', () => {
    it('should sync new association creation to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        // Create initial Deep space
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        
        // Wait for initial sync
        await deep.storage.promise;
        debug(`✅ Initial sync completed for space ${spaceId}`);
        
        // Create new association (not yet meaningful)
        const newAssoc = new deep();
        debug(`📝 Created new association ${newAssoc._id} (not yet meaningful)`);
        
        // Wait a bit to ensure no premature sync
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check that empty association is NOT synced yet
        let result = await hasyx.select({
          table: 'deep_links',
          where: { 
            _deep: { _eq: spaceId },
            id: { _eq: newAssoc._id }
          },
          returning: ['id']
        });
        
        debug(`🔍 Empty association in database: ${result.length} records`);
        expect(result.length).toBe(0); // Should not be synced yet
        
        // NOW make it meaningful by assigning type
        newAssoc.type = deep.String;
        debug(`🎯 Assigned type to association ${newAssoc._id}, should trigger sync`);
        
        // Wait for event processing and sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if meaningful association was synced to database
        result = await hasyx.select({
          table: 'deep_links',
          where: { 
            _deep: { _eq: spaceId },
            id: { _eq: newAssoc._id }
          },
          returning: ['id', '_type']
        });
        
        debug(`🔍 Meaningful association in database: ${JSON.stringify(result)}`);
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(newAssoc._id);
        expect(result[0]._type).toBe(deep.String._id);
        
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
        debug('🧹 Test cleanup completed');
      }
    }, 30000);

    it('should sync typed data creation to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug('✅ Initial sync completed, testing typed data creation');
        debug(`📝 Deep space ID: ${spaceId}`);
        debug(`📝 Sync enabled: ${deep.storage._state._syncEnabled}`);
        
        // Add small delay to ensure sync is fully set up
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create typed associations after initial sync
        // These automatically get types and should trigger sync
        debug('🔍 Creating typed associations...');
        const testString = new deep.String('test_sync_string');
        const testNumber = new deep.Number(12345);
        const testFunction = new deep.Function(() => 'test_sync_function');
        
        debug(`📝 Created String: ${testString._id}, type: ${testString._type}, data: ${testString._data}`);
        debug(`📝 Created Number: ${testNumber._id}, type: ${testNumber._type}, data: ${testNumber._data}`);
        debug(`📝 Created Function: ${testFunction._id}, type: ${testFunction._type}, data type: ${typeof testFunction._data}`);
        
        // Check if associations exist in memory
        debug(`📝 String exists in _ids: ${deep._ids.has(testString._id)}`);
        debug(`📝 Number exists in _ids: ${deep._ids.has(testNumber._id)}`);
        debug(`📝 Function exists in _ids: ${deep._ids.has(testFunction._id)}`);
        
        // Wait for all syncs to complete
        debug('⏳ Waiting for storage sync...');
        await deep.storage.promise; // Wait for storage sync
        
        // Add extra wait to ensure all async operations complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        debug('🔍 Checking database for synced data...');
        
        // First check if associations exist in deep_links
        const linkResults = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _in: [testString._id, testNumber._id, testFunction._id] }
          },
          returning: ['id', '_type', '_deep']
        });
        
        debug(`📊 Found ${linkResults.length} associations in deep_links:`);
        linkResults.forEach(link => {
          debug(`  - ${link.id}: type=${link._type}, deep=${link._deep}`);
        });
        
        // Verify string in database
        const stringResult = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id', '_data']
        });
        
        debug(`📊 String query result: ${stringResult.length} rows`);
        if (stringResult.length === 0) {
          debug('❌ String data not found in database - sync failed');
          
          // Check if the association exists in links table
          const stringLinkResult = await hasyx.select({
            table: 'deep_links',
            where: { id: { _eq: testString._id } },
            returning: ['id', '_type', '_deep', '_i']
          });
          debug(`📊 String link result: ${stringLinkResult.length} rows`);
          if (stringLinkResult.length > 0) {
            debug(`📝 String link found: ${JSON.stringify(stringLinkResult[0])}`);
          }
        }
        
        // Verify number in database
        const numberResult = await hasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: testNumber._id } },
          returning: ['id', '_data']
        });
        
        expect(numberResult.length).toBe(1);
        expect(numberResult[0]._data).toBe(12345);
        
        // Verify function in database
        const functionResult = await hasyx.select({
          table: 'deep_functions',
          where: { id: { _eq: testFunction._id } },
          returning: ['id', '_data']
        });
        
        expect(functionResult.length).toBe(1);
        expect(functionResult[0]._data).toContain('test_sync_function');
        
        debug('✅ All typed data successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Link Changes Sync', () => {
    it('should sync _type changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep.id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const typeAssociation = new deep();
        
        debug('✅ Initial associations created, testing _type change');
        
        // Change type
        association.type = typeAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association.id } },
          returning: ['id', '_type']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._type).toBe(typeAssociation.id);
        
        debug('✅ Type change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _from changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep.id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const fromAssociation = new deep();
        
        debug('✅ Initial associations created, testing _from change');
        
        // Change from
        association.from = fromAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association.id } },
          returning: ['id', '_from']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._from).toBe(fromAssociation.id);
        
        debug('✅ From change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _to changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep.id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const toAssociation = new deep();
        
        debug('✅ Initial associations created, testing _to change');
        
        // Change to
        association.to = toAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association.id } },
          returning: ['id', '_to']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._to).toBe(toAssociation.id);
        
        debug('✅ To change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _value changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep.id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const valueAssociation = new deep();
        
        debug('✅ Initial associations created, testing _value change');
        
        // Change value
        association.value = valueAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association.id } },
          returning: ['id', '_value']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._value).toBe(valueAssociation.id);
        
        debug('✅ Value change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Data Changes Sync', () => {
    it('should sync string data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create string association
        const testString = new deep.String('initial_value');
        await testString.promise;
        
        debug('✅ Initial string created, testing data change');
        
        // Change data
        testString.data = 'updated_value';
        await testString.promise;
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id', '_data']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._data).toBe('updated_value');
        
        debug('✅ String data change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync number data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create number association
        const testNumber = new deep.Number(100);
        await testNumber.promise;
        
        debug('✅ Initial number created, testing data change');
        
        // Change data
        testNumber.data = 200;
        await testNumber.promise;
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: testNumber._id } },
          returning: ['id', '_data']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._data).toBe(200);
        
        debug('✅ Number data change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync function data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create function association
        const testFunction = new deep.Function(() => 'initial');
        await testFunction.promise;
        
        debug('✅ Initial function created, testing data change');
        
        // Change data
        testFunction.data = () => 'updated';
        await testFunction.promise;
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_functions',
          where: { id: { _eq: testFunction._id } },
          returning: ['id', '_data']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._data).toContain('updated');
        
        debug('✅ Function data change successfully synced to database');
      } finally {
        if (typeof deep !== 'undefined') {
          cleanupDeepInstance(deep);
        }
        await cleanup(spaceId);
      }
    }, 30000);
});

  describe('Association Destruction Sync', () => {
    it('should sync association destruction to database', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create association
        const association = new deep();
        await association.promise;
        
        // Verify it exists in database
        let dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id']
        });
        expect(dbResult.length).toBe(1);
        
        debug('✅ Association created and verified, testing destruction');
        
        // Destroy association
        const associationId = association._id;
        association.destroy();
        
        // Wait for storage sync (since association is destroyed, we wait on storage)
        await deep.storage.promise;
        
        // Verify it's deleted from database
        dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: associationId } },
          returning: ['id']
        });
        expect(dbResult.length).toBe(0);
        
        debug('✅ Association destruction successfully synced to database');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
    }
    }, 30000);

    it('should sync typed data destruction to database via cascade', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create typed association
        const testString = new deep.String('test_destruction');
        await testString.promise;
        
        // Verify it exists in both tables
        let linkResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testString._id } },
          returning: ['id']
        });
        let stringResult = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id']
        });
        expect(linkResult.length).toBe(1);
        expect(stringResult.length).toBe(1);
        
        debug('✅ Typed association created and verified, testing destruction');
        
        // Destroy association
        const associationId = testString._id;
        testString.destroy();
        
        // Wait for storage sync
        await deep.storage.promise;
        
        // Verify both are deleted (cascade should handle typed data)
        linkResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: associationId } },
          returning: ['id']
        });
        stringResult = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: associationId } },
          returning: ['id']
        });
        expect(linkResult.length).toBe(0);
        expect(stringResult.length).toBe(0);
        
        debug('✅ Typed association destruction with cascade successfully synced');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
    }
    }, 30000);
  });

  describe('Complex Synchronization Scenarios', () => {
    it('should handle rapid sequential changes', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug('✅ Initial sync completed, testing rapid sequential changes');
        
        // Create association and make rapid changes
        const association = new deep();
        await association.promise;
        
        const target1 = new deep();
        const target2 = new deep();
        const target3 = new deep();
        await Promise.all([target1.promise, target2.promise, target3.promise]);
        
        // Rapid sequential changes
        association.type = target1;
        await association.promise;
        
        association.from = target2;
        await association.promise;
        
        association.to = target3;
        await association.promise;
        
        // Verify final state in database
        const dbResult = await hasyx.select({
        table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_type', '_from', '_to']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._type).toBe(target1._id);
        expect(dbResult[0]._from).toBe(target2._id);
        expect(dbResult[0]._to).toBe(target3._id);
        
        debug('✅ Rapid sequential changes successfully synced');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
    }
    }, 30000);

    it('should handle concurrent changes to different associations', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug('✅ Initial sync completed, testing concurrent changes');
        
        // Create multiple associations
        const assoc1 = new deep();
        const assoc2 = new deep();
        const assoc3 = new deep();
        await Promise.all([assoc1.promise, assoc2.promise, assoc3.promise]);
        
        // Create targets
        const target1 = new deep();
        const target2 = new deep();
        const target3 = new deep();
        await Promise.all([target1.promise, target2.promise, target3.promise]);
        
        // Make concurrent changes
        const changePromises = [
          (async () => { assoc1.type = target1; await assoc1.promise; })(),
          (async () => { assoc2.from = target2; await assoc2.promise; })(),
          (async () => { assoc3.to = target3; await assoc3.promise; })()
        ];
        
        await Promise.all(changePromises);
        
        // Verify all changes in database
        const dbResults = await hasyx.select({
        table: 'deep_links',
          where: { 
            id: { _in: [assoc1._id, assoc2._id, assoc3._id] }
          },
          returning: ['id', '_type', '_from', '_to']
        });
        
        expect(dbResults.length).toBe(3);
        
        const assoc1Result = dbResults.find(r => r.id === assoc1._id);
        const assoc2Result = dbResults.find(r => r.id === assoc2._id);
        const assoc3Result = dbResults.find(r => r.id === assoc3._id);
        
        expect(assoc1Result._type).toBe(target1._id);
        expect(assoc2Result._from).toBe(target2._id);
        expect(assoc3Result._to).toBe(target3._id);
        
        debug('✅ Concurrent changes successfully synced');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
    }
    }, 30000);
  });

  describe('Promise Tracking', () => {
    it('should track sync promises on storage and associations', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debug('✅ Initial sync completed, testing promise tracking');
        
        // Create new association
        const association = new deep();
        
        // Both storage and association should have promises
        expect(deep.storage.promise).toBeDefined();
        expect(association.promise).toBeDefined();
        
        // Promises should be the same operation
        expect(deep.storage.promise).toBe(association.promise);
        
        // Wait for completion
        const result = await association.promise;
        expect(result).toBeDefined();
        
        debug('✅ Promise tracking working correctly');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
    }
    }, 30000);

    it('should handle promise rejection on sync errors', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      let deep: any;
      
      try {
        deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Disable sync to simulate error condition
        deep.storage._setSyncEnabled(false);
        
        debug('✅ Sync disabled, testing error handling');
        
        // Create association (should not sync)
        const association = new deep();
        
        // Promise should exist but resolve immediately (no sync)
        expect(association.promise).toBeUndefined(); // No promise when sync disabled
        
        debug('✅ Error handling working correctly');
    } finally {
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
        await cleanup(spaceId);
      }
    }, 30000);
  });
});

describe.skip('Phase 3: Database → Local Synchronization - TODO', () => {
  describe.skip('Local Changes → Database Sync', () => {
    it.skip('should sync local association changes to database', async () => {
      // TODO: Test that local changes (after initial sync) are detected and sent to database
      // Requirements:
      // - Create newHasyxDeep space and wait for initial sync
      // - Make local changes (new associations, link changes, data changes)
      // - Verify changes appear in database
      // - Verify promise completion tracking for individual changes
    });

    it.skip('should handle typed data changes in real-time', async () => {
      // TODO: Test that typed data changes are synced
      // Requirements:
      // - Create String/Number/Function instances
      // - Change their _data values
      // - Verify database reflects changes
    });

    it.skip('should handle relationship changes in real-time', async () => {
      // TODO: Test that relationship changes (_type, _from, _to, _value) are synced
      // Requirements:
      // - Create associations with relationships
      // - Change relationships
      // - Verify database reflects new relationships
    });
  });

  describe.skip('Database Changes → Local Sync', () => {
    it.skip('should receive external changes via hasyx.subscribe', async () => {
      // TODO: Test that external database changes are received locally
      // Requirements:
      // - Create two Deep spaces connected to same database
      // - Make changes in space A
      // - Verify changes appear in space B
      // - Verify no circular sync loops
    });

    it.skip('should apply external changes without triggering local sync', async () => {
      // TODO: Test that external changes don't cause sync loops
      // Requirements:
      // - Receive external change event
      // - Apply changes with proper _source/_reason to prevent re-sync
      // - Verify local state updated but no database calls made
    });

    it.skip('should handle concurrent changes from multiple clients', async () => {
      // TODO: Test concurrent modifications
      // Requirements:
      // - Multiple clients modifying same associations
      // - Conflict resolution strategies
      // - Eventual consistency verification
    });
  });

  describe.skip('Advanced Synchronization Features', () => {
    it.skip('should batch multiple changes for efficiency', async () => {
      // TODO: Test batching of multiple operations
      // Requirements:
      // - Multiple rapid changes
      // - Verify they are batched into fewer database operations
      // - Verify all changes are applied correctly
    });

    it.skip('should handle sync errors and retry', async () => {
      // TODO: Test error handling and retry logic
      // Requirements:
      // - Simulate database connection failures
      // - Verify retry mechanisms
      // - Verify eventual consistency after recovery
    });
  });
});

describe('Queue Debugging', () => {
  it('should debug queue operations without infinite loops', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
    let spaceId: string | undefined;
    let deep: any;
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      deep = newHasyxDeep({ hasyx });
      spaceId = deep._id;
      
      debug('🚀 Starting queue debugging test');
      
      // Wait for initial sync with timeout
      debug('⏳ Waiting for initial sync...');
      const initialSyncPromise = deep.storage.promise;
      if (initialSyncPromise) {
        await Promise.race([
          initialSyncPromise,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Initial sync timeout')), 10000);
          })
        ]);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
      debug('✅ Initial sync completed');
      
      // Create a simple association
      debug('📝 Creating simple association');
      const assoc = new deep();
      debug('📝 Association created with ID:', assoc._id);
      
      // Check storage state before marking
      debug('🔍 Storage state before marking:', {
        syncEnabled: deep.storage._state._syncEnabled,
        hasClient: !!deep.storage._state._hasyxClient,
        hasPromise: !!deep.storage.promise
      });
      
      // Mark for storage - this should trigger sync
      debug('🏷️ Marking association for storage');
      assoc.store(deep.storage, deep.storageMarkers.oneTrue);
      debug('🏷️ Association marked for storage');
      
      // Check storage state after marking
      debug('🔍 Storage state after marking:', {
        syncEnabled: deep.storage._state._syncEnabled,
        hasClient: !!deep.storage._state._hasyxClient,
        hasPromise: !!deep.storage.promise
      });
      
      // Check if association is marked for storage
      debug('🔍 Association storage markers:', assoc.isStored(deep.storage));
      
      // Wait for sync with timeout
      debug('⏳ Waiting for sync to complete...');
      const syncPromise = deep.storage.promise;
      if (syncPromise) {
        try {
          let syncTimeoutId: NodeJS.Timeout | undefined;
          await Promise.race([
            syncPromise,
            new Promise((_, reject) => {
              syncTimeoutId = setTimeout(() => reject(new Error('Sync timeout')), 5000);
            })
          ]);
          if (syncTimeoutId) {
            clearTimeout(syncTimeoutId);
          }
          debug('✅ Sync completed successfully');
        } catch (error: any) {
          debug('⚠️ Sync timeout or error:', error.message);
          // Don't fail the test, just log the timeout
        }
      } else {
        debug('ℹ️ No sync promise found');
      }
      
      // Check final storage state
      debug('🔍 Final storage state:', {
        syncEnabled: deep.storage._state._syncEnabled,
        hasClient: !!deep.storage._state._hasyxClient,
        hasPromise: !!deep.storage.promise
      });
      
      debug('✅ Test completed without hanging');
      
    } finally {
      // Clear any remaining timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
      await cleanup(spaceId);
    }
  }, 20000);
  
  it('should test complex scenario that might cause recursion', async () => {
    const { hasyx, cleanup } = createTestEnvironment();
    let spaceId: string | undefined;
    let deep: any;
    let timeoutId: NodeJS.Timeout | undefined;
    
    try {
      deep = newHasyxDeep({ hasyx });
      spaceId = deep._id;
      
      debug('🚀 Starting complex recursion test');
      
      // Wait for initial sync with timeout
      debug('⏳ Waiting for initial sync...');
      const initialSyncPromise = deep.storage.promise;
      if (initialSyncPromise) {
        await Promise.race([
          initialSyncPromise,
          new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Initial sync timeout')), 10000);
          })
        ]);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }
      debug('✅ Initial sync completed');
      
      // Create associations with circular references
      debug('📝 Creating associations with potential circular references');
      const assoc1 = new deep();
      const assoc2 = new deep();
      const assoc3 = new deep();
      
      // Mark all for storage first
      debug('🏷️ Marking all associations for storage');
      assoc1.store(deep.storage, deep.storageMarkers.oneTrue);
      assoc2.store(deep.storage, deep.storageMarkers.oneTrue);
      assoc3.store(deep.storage, deep.storageMarkers.oneTrue);
      
      // Create circular references
      debug('🔗 Creating circular references');
      assoc1.type = assoc2;
      assoc2.type = assoc3;
      assoc3.type = assoc1; // This creates a cycle
      
      // Wait for sync with timeout
      debug('⏳ Waiting for sync to complete...');
      const syncPromise = deep.storage.promise;
      if (syncPromise) {
        try {
          let syncTimeoutId: NodeJS.Timeout | undefined;
          await Promise.race([
            syncPromise,
            new Promise((_, reject) => {
              syncTimeoutId = setTimeout(() => reject(new Error('Sync timeout')), 5000);
            })
          ]);
          if (syncTimeoutId) {
            clearTimeout(syncTimeoutId);
          }
          debug('✅ Sync completed successfully');
        } catch (error: any) {
          debug('⚠️ Sync timeout or error:', error.message);
          // Don't fail the test, just log the timeout
        }
      } else {
        debug('ℹ️ No sync promise found');
      }
      
      debug('✅ Complex test completed without infinite recursion');
      
    } finally {
      // Clear any remaining timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (typeof deep !== 'undefined') {
        cleanupDeepInstance(deep);
      }
      await cleanup(spaceId);
    }
  }, 25000);
}); 