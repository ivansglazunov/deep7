import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { newHasyxDeep, loadHasyxDeep } from './storage-hasyx';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const generate = Generator(schema as any);

// Helper to create complete test environment for each test
function createTestEnvironment(): { 
  hasyx: Hasyx, 
  cleanup: () => Promise<void> 
} {
  const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET || 'dev-secret';

  const apolloClient = createApolloClient({
    url: hasuraUrl,
    secret: hasuraSecret
  });

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = async () => {
    try {
      // Clean up any test data if needed
      console.log('🧹 Test cleanup completed');
    } catch (error) {
      console.warn('⚠️ Cleanup warning:', error);
    }
  };

  return { hasyx, cleanup };
}

describe('Hasyx Deep Storage - Core API', () => {
  describe('newHasyxDeep() - Create new Deep space', () => {
    it('should create new Deep space and sync to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        // Create new deep space 
        const deep = newHasyxDeep({ hasyx });
        
        expect(deep).toBeDefined();
        expect(deep._id).toBeDefined();
        expect(deep.storage).toBeDefined();
        expect(deep.storage.promise).toBeDefined();
        
        console.log(`🔄 Created deep space ${deep._id}, waiting for sync...`);
        
        // Wait for sync completion
        await deep.storage.promise;
        console.log('✅ Initial sync completed');
        
        // Verify associations are in database
        const dbAssociations = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: deep._id } },
          returning: ['id', '_i', '_type', '_from', '_to', '_value']
        });
        
        console.log(`📊 Database contains ${dbAssociations.length} associations for space ${deep._id}`);
        console.log(`📊 Local space contains ${deep._ids.size} associations`);
        
        expect(dbAssociations.length).toBe(deep._ids.size);
        
      } finally {
        await cleanup();
      }
    }, 30000);

    it('should sync pre-created associations when passed existing deep', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        // Create deep space with some associations BEFORE sync
        const existingDeep = newDeep();
        const testString = new existingDeep.String('pre_created_string');
        const testNumber = new existingDeep.Number(999);
        
        console.log(`📝 Pre-created ${existingDeep._ids.size} associations including String and Number`);
        
        // Now sync the existing deep space
        const deep = newHasyxDeep({ hasyx, deep: existingDeep });
        
        expect(deep._id).toBe(existingDeep._id);
        expect(deep._ids.size).toBe(existingDeep._ids.size);
        
        // Wait for sync completion
        await deep.storage.promise;
        console.log('✅ Pre-created associations sync completed');
        
        // Verify all associations are in database
        const dbAssociations = await hasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: deep._id } },
          returning: ['id', '_i', '_type', '_from', '_to', '_value']
        });
        
        expect(dbAssociations.length).toBe(deep._ids.size);
        
        // Verify typed data is also synced
        const stringData = await hasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: testString._id } },
          returning: ['id', '_data']
        });
        
        const numberData = await hasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: testNumber._id } },
          returning: ['id', '_data']
        });
        
        expect(stringData.length).toBe(1);
        expect(stringData[0]._data).toBe('pre_created_string');
        expect(numberData.length).toBe(1);
        expect(numberData[0]._data).toBe(999);
        
        console.log(`✅ Verified typed data: String="${stringData[0]._data}", Number=${numberData[0]._data}`);
        
      } finally {
        await cleanup();
      }
    }, 30000);
  });

  describe('loadHasyxDeep() - Load dump from database', () => {
    it('should load dump from existing Deep space', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        // First, create and sync a Deep space with some data
        const existingDeep = newDeep();
        const testString = new existingDeep.String('abc_test');
        const testNumber = new existingDeep.Number(123);
        
        // Create some relationships
        const container = new existingDeep();
        container.value = testString;
        
        const originalDeep = newHasyxDeep({ hasyx, deep: existingDeep });
        await originalDeep.storage.promise;
        
        console.log(`🔄 Created space ${originalDeep._id} with ${originalDeep._ids.size} associations`);
        
        // Now load dump from the created space
        const dump = await loadHasyxDeep({ 
          hasyx, 
          id: originalDeep._id 
        });
        
        expect(dump).toBeDefined();
        expect(Array.isArray(dump)).toBe(true);
        expect(dump.length).toBe(originalDeep._ids.size);
        
        // Verify dump contains our test data
        const stringItem = dump.find(item => item.string?.value === 'abc_test');
        expect(stringItem).toBeDefined();
        expect(stringItem.id).toBe(testString._id);
        
        const numberItem = dump.find(item => item.number?.value === 123);
        expect(numberItem).toBeDefined();
        expect(numberItem.id).toBe(testNumber._id);
        
        // Verify relationships are preserved
        const containerItem = dump.find(item => item.id === container._id);
        expect(containerItem).toBeDefined();
        expect(containerItem._value).toBe(testString._id);
        
        console.log(`✅ Loaded dump with ${dump.length} items`);
        
      } finally {
        await cleanup();
      }
    }, 30000);
  });

  describe('newHasyxDeep() with dump - Restore from database', () => {
    it('should restore Deep space from dump', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        // First, create and sync a Deep space with some data
        const existingDeep = newDeep();
        const testString = new existingDeep.String('abc_test');
        const testNumber = new existingDeep.Number(456);
        
        const originalDeep = newHasyxDeep({ hasyx, deep: existingDeep });
        await originalDeep.storage.promise;
        
        // Load dump from the created space
        const dump = await loadHasyxDeep({ 
          hasyx, 
          id: originalDeep._id 
        });
        
        // Create new Deep space from dump (this should NOT sync to database)
        // because the dump already contains the data
        const restoredDeep = newHasyxDeep({ hasyx, dump });
        
        expect(restoredDeep).toBeDefined();
        expect(restoredDeep._id).toBe(originalDeep._id); // Same space ID
        
        // Verify that our test data exists in the restored space
        // Find the restored string by ID
        const restoredString = new restoredDeep(testString._id);
        expect(restoredString._data).toBe('abc_test');
        
        // Find the restored number by ID  
        const restoredNumber = new restoredDeep(testNumber._id);
        expect(restoredNumber._data).toBe(456);
        
        console.log(`✅ Restored space with ${restoredDeep._ids.size} associations (original: ${originalDeep._ids.size})`);
        console.log(`🔗 String data: "${restoredString._data}", Number data: ${restoredNumber._data}`);
        
      } finally {
        await cleanup();
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

describe.skip('Phase 2: Real-Time Synchronization - TODO', () => {
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