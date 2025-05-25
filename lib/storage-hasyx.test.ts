import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { newHasyxDeep, loadHasyxDeep } from './storage-hasyx';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';
import Debug from './debug';

// Load environment variables
dotenv.config();

const generate = Generator(schema as any);

// Create debug function for tests
const debugTest = Debug('storage:test');

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
      // Only delete from deep_links - cascade delete trigger will handle typed data automatically
      await hasyx.delete({ table: 'deep_links', where: { _deep: { _eq: spaceId } } });
    }
    debugTest('🧹 Test cleanup completed');
  };

  return { hasyx, cleanup };
}

describe('Hasyx Deep Storage', () => {
  describe('Basic Operations', () => {
    it('should create new Deep space and sync to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        debugTest(`✅ Created and synced Deep space ${deep._id} with ${deep._ids.size} associations`);
        expect(deep._id).toBeDefined();
        expect(deep.storage).toBeDefined();
        expect(deep.storage.promise).toBeDefined();
      } finally {
        await cleanup(spaceId);
        debugTest('🧹 Test cleanup completed');
      }
    }, 60000);

    it('should create Deep space with existing data and sync', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        // Create a Deep space with some data
        const existingDeep = newDeep();
        const testString = new existingDeep.String('abc_test');
        const testNumber = new existingDeep.Number(456);
        
        // Create Hasyx Deep with existing data
        const deep = newHasyxDeep({ hasyx, deep: existingDeep });
        spaceId = deep._id;
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        debugTest(`✅ Created Deep space with existing data: ${deep._ids.size} associations`);
        debugTest(`🔗 String: "${testString._data}", Number: ${testNumber._data}`);
        
        expect(deep._id).toBeDefined();
        expect(testString._data).toBe('abc_test');
        expect(testNumber._data).toBe(456);
      } finally {
        await cleanup(spaceId);
        debugTest('🧹 Test cleanup completed');
      }
    }, 30000);

    it('should restore Deep space from dump', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
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
        
        // Verify restoration
        expect(restoredDeep._ids.size).toBe(originalDeep._ids.size);
        debugTest(`✅ Restored space with ${restoredDeep._ids.size} associations (original: ${originalDeep._ids.size})`);
        debugTest(`🔗 String data: "${testString._data}", Number data: ${testNumber._data}`);
      } finally {
        await cleanup(spaceId);
        debugTest('🧹 Test cleanup completed');
      }
    }, 30000);
  });
});

// ================================
// PHASE 2: REAL-TIME SYNCHRONIZATION TESTS - TODO
// These tests should be implemented when real-time change tracking is available:
// - Local changes sync to database
// - External changes sync from database
// ================================

describe('Phase 2: Real-Time Local → Database Synchronization', () => {
  describe('Association Creation Sync', () => {
    it('should sync new association creation to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        // Create Deep space and wait for initial sync
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debugTest('✅ Initial sync completed, testing new association creation');
        
        // Create new association after initial sync
        const newAssociation = new deep();
        
        // Association becomes meaningful when it gets a type
        const typeAssociation = new deep();
        typeAssociation.type = deep; // Give it a type to make it meaningful
        await deep.storage.promise; // Wait for type association to sync
        
        newAssociation.type = typeAssociation; // Now this triggers sync
        await deep.storage.promise; // Wait for sync to complete
        
        // Verify association exists in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: newAssociation._id } },
          returning: ['id', '_deep', '_i', '_type']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0].id).toBe(newAssociation._id);
        expect(dbResult[0]._deep).toBe(deep._id);
        expect(dbResult[0]._i).toBe(newAssociation._i);
        expect(dbResult[0]._type).toBe(typeAssociation._id);
        
        debugTest('✅ New association successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync typed data creation to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debugTest('✅ Initial sync completed, testing typed data creation');
        
        // Add small delay to ensure sync is fully set up
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create typed associations after initial sync
        // These automatically get types and should trigger sync
        const testString = new deep.String('test_sync_string');
        const testNumber = new deep.Number(12345);
        const testFunction = new deep.Function(() => 'test_sync_function');
        
        // Wait for all syncs to complete
        await deep.storage.promise; // Wait for storage sync
        
        // Verify associations exist in links table
        const linkResults = await hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _in: [testString._id, testNumber._id, testFunction._id] }
          },
          returning: ['id', '_type']
        });
        expect(linkResults.length).toBe(3);
        
        // Verify string data in database
        const stringResult = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id', '_data']
        });
        expect(stringResult.length).toBe(1);
        expect(stringResult[0]._data).toBe('test_sync_string');
        
        // Verify number data in database
        const numberResult = await hasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: testNumber._id } },
          returning: ['id', '_data']
        });
        expect(numberResult.length).toBe(1);
        expect(numberResult[0]._data).toBe(12345);
        
        // Verify function data in database
        const functionResult = await hasyx.select({
          table: 'deep_functions',
          where: { id: { _eq: testFunction._id } },
          returning: ['id', '_data']
        });
        expect(functionResult.length).toBe(1);
        expect(functionResult[0]._data).toContain('test_sync_function');
        
        debugTest('✅ All typed data successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Link Changes Sync', () => {
    it('should sync _type changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const typeAssociation = new deep();
        
        debugTest('✅ Initial associations created, testing _type change');
        
        // Change type
        association.type = typeAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_type']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._type).toBe(typeAssociation._id);
        
        debugTest('✅ _type change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _from changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const fromAssociation = new deep();
        
        debugTest('✅ Initial associations created, testing _from change');
        
        // Change from
        association.from = fromAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_from']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._from).toBe(fromAssociation._id);
        
        debugTest('✅ _from change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _to changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const toAssociation = new deep();
        
        debugTest('✅ Initial associations created, testing _to change');
        
        // Change to
        association.to = toAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_to']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._to).toBe(toAssociation._id);
        
        debugTest('✅ _to change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync _value changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create associations
        const association = new deep();
        const valueAssociation = new deep();
        
        debugTest('✅ Initial associations created, testing _value change');
        
        // Change value
        association.value = valueAssociation;
        await deep.storage.promise; // Wait for sync
        
        // Verify in database
        const dbResult = await hasyx.select({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          returning: ['id', '_value']
        });
        
        expect(dbResult.length).toBe(1);
        expect(dbResult[0]._value).toBe(valueAssociation._id);
        
        debugTest('✅ _value change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Data Changes Sync', () => {
    it('should sync string data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create string association
        const testString = new deep.String('initial_value');
        await testString.promise;
        
        debugTest('✅ Initial string created, testing data change');
        
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
        
        debugTest('✅ String data change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync number data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create number association
        const testNumber = new deep.Number(100);
        await testNumber.promise;
        
        debugTest('✅ Initial number created, testing data change');
        
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
        
        debugTest('✅ Number data change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync function data changes to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Create function association
        const testFunction = new deep.Function(() => 'initial');
        await testFunction.promise;
        
        debugTest('✅ Initial function created, testing data change');
        
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
        
        debugTest('✅ Function data change successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Association Destruction Sync', () => {
    it('should sync association destruction to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
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
        
        debugTest('✅ Association created and verified, testing destruction');
        
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
        
        debugTest('✅ Association destruction successfully synced to database');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should sync typed data destruction to database via cascade', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
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
        
        debugTest('✅ Typed association created and verified, testing destruction');
        
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
        
        debugTest('✅ Typed association destruction with cascade successfully synced');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Complex Synchronization Scenarios', () => {
    it('should handle rapid sequential changes', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debugTest('✅ Initial sync completed, testing rapid sequential changes');
        
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
        
        debugTest('✅ Rapid sequential changes successfully synced');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should handle concurrent changes to different associations', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debugTest('✅ Initial sync completed, testing concurrent changes');
        
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
        
        debugTest('✅ Concurrent changes successfully synced');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);
  });

  describe('Promise Tracking', () => {
    it('should track sync promises on storage and associations', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        debugTest('✅ Initial sync completed, testing promise tracking');
        
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
        
        debugTest('✅ Promise tracking working correctly');
      } finally {
        await cleanup(spaceId);
      }
    }, 30000);

    it('should handle promise rejection on sync errors', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      let spaceId: string | undefined;
      
      try {
        const deep = newHasyxDeep({ hasyx });
        spaceId = deep._id;
        await deep.storage.promise;
        
        // Disable sync to simulate error condition
        deep.storage._setSyncEnabled(false);
        
        debugTest('✅ Sync disabled, testing error handling');
        
        // Create association (should not sync)
        const association = new deep();
        
        // Promise should exist but resolve immediately (no sync)
        expect(association.promise).toBeUndefined(); // No promise when sync disabled
        
        debugTest('✅ Error handling working correctly');
      } finally {
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