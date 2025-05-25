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

describe('Hasyx Deep Storage', () => {
  describe('Basic Operations', () => {
    it('should create new Deep space and sync to database', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        const deep = newHasyxDeep({ hasyx });
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        console.log(`✅ Created and synced Deep space ${deep._id} with ${deep._ids.size} associations`);
        expect(deep._id).toBeDefined();
        expect(deep.storage).toBeDefined();
        expect(deep.storage.promise).toBeDefined();
      } finally {
        await cleanup();
        console.log('🧹 Test cleanup completed');
      }
    }, 60000);

    it('should create Deep space with existing data and sync', async () => {
      const { hasyx, cleanup } = createTestEnvironment();
      
      try {
        // Create a Deep space with some data
        const existingDeep = newDeep();
        const testString = new existingDeep.String('abc_test');
        const testNumber = new existingDeep.Number(456);
        
        // Create Hasyx Deep with existing data
        const deep = newHasyxDeep({ hasyx, deep: existingDeep });
        
        // Wait for sync to complete
        await deep.storage.promise;
        
        console.log(`✅ Created Deep space with existing data: ${deep._ids.size} associations`);
        console.log(`🔗 String: "${testString._data}", Number: ${testNumber._data}`);
        
        expect(deep._id).toBeDefined();
        expect(testString._data).toBe('abc_test');
        expect(testNumber._data).toBe(456);
      } finally {
        await cleanup();
        console.log('🧹 Test cleanup completed');
      }
    }, 30000);

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
        
        // Verify restoration
        expect(restoredDeep._ids.size).toBe(originalDeep._ids.size);
        console.log(`✅ Restored space with ${restoredDeep._ids.size} associations (original: ${originalDeep._ids.size})`);
        console.log(`🔗 String data: "${testString._data}", Number data: ${testNumber._data}`);
      } finally {
        await cleanup();
        console.log('🧹 Test cleanup completed');
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