import { newDeep } from '.';
import { defaultMarking } from './storage';
import { StorageHasyxDump, newStorageHasyx, destroyAllSubscriptions } from './storage-hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx';
import { Hasyx } from 'hasyx';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import Debug from './debug';
import dotenv from 'dotenv';

dotenv.config();

const debug = Debug('storage:hasyx:test');
const generate = Generator(schema as any);

// Helper function to create real Hasyx client
const createRealHasyxClient = (): { hasyx: Hasyx; cleanup: () => void } => {
  const url = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'https://3003-01j4jb4xr1n7zeh8b0y5y1s3qz.cloudspaces.litefs.com/v1/graphql';
  const adminSecret = process.env.HASURA_ADMIN_SECRET || 'myadminsecretkey';

  debug(`Creating Hasyx client with URL: ${url}`);
  
  const apolloClient = createApolloClient({
    url,
    secret: adminSecret,
    ws: false,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = () => {
    debug('Cleaning up Hasyx client');
    // Apollo client cleanup happens automatically
  };

  return { hasyx, cleanup };
};

// Test configuration
const TEST_CONFIG = {
  // Enable full debug logging
  enableDebug: true,
};

describe('[DEBUG] StorageHasyx Full Synchronization Cycle', () => {
  let hasyx: Hasyx;
  let cleanup: () => void;

  beforeAll(() => {
    // Enable debug logging for this test
    if (TEST_CONFIG.enableDebug) {
      process.env.DEBUG = 'hasyx*,deep7*,storage*';
    }
    
    const hasyxClient = createRealHasyxClient();
    hasyx = hasyxClient.hasyx;
    cleanup = hasyxClient.cleanup;
  });

  afterAll(() => {
    cleanup();
    destroyAllSubscriptions();
  });

  it('[COMPREHENSIVE] should complete full StorageHasyx synchronization cycle', async () => {
    debug('🚀 Starting comprehensive StorageHasyx synchronization test');
    
    let deep: any; // Declare deep variable here for cleanup access
    
    try {
      // === PHASE 0: Clean database state ===
      debug('🧹 PHASE 0: Creating newDeep instance first to get deepSpaceId');
      deep = newDeep();
      const deepSpaceId = deep._id;
      debug(`✅ Using deep._id as space ID: ${deepSpaceId}`);
      
      debug('🧹 PHASE 0: Cleaning isolated database space');
      const { hasyx: cleanupHasyx, cleanup: cleanupFn } = createRealHasyxClient();
      
      // Clean only THIS test's space using _deep isolation
      await cleanupHasyx.delete({
        table: 'deep_links',
        where: { _deep: { _eq: deepSpaceId } }
      });
      debug('✅ Database cleaned for isolated space: %s', deepSpaceId);
      
      cleanupFn();
      
      // === PHASE 1: Initialize Deep and Storage ===
      debug('📖 PHASE 1: Deep instance already created with ${deep._ids.size} initial associations');
      debug(`📍 Using deep._id as space ID: ${deep._id}`);

      // === PHASE 2: Create StorageHasyx ===
      debug('💾 PHASE 2: Creating StorageHasyx instance');
      const storage = new deep.StorageHasyx({
        hasyx,
        deepSpaceId: deep._id,
        strategy: 'subscription'
      });
      debug(`✅ StorageHasyx created with ID: ${storage._id}`);

      // === PHASE 3: Apply Default Marking ===
      debug('🏷️ PHASE 3: Applying default marking to establish storage hierarchy');
      defaultMarking(deep, storage);
      
      // Count associations marked for storage
      const allStorageMarkers = deep._getAllStorageMarkers();
      let markedCount = 0;
      for (const [associationId, storageMap] of allStorageMarkers) {
        if (storageMap.has(storage._id)) {
          markedCount++;
        }
      }
      debug(`🏷️ Applied default marking - ${markedCount} associations marked for storage`);

      // === PHASE 4: Wait for Storage Promise Resolution ===
      debug('⏳ PHASE 4: Waiting for storage promise resolution');
      await storage.promise;
      debug('✅ Storage promise resolved successfully');

      // === PHASE 5: Analyze Results ===
      debug('📊 PHASE 5: Analyzing synchronization results');
      
      // Count local associations
      const localAssociations = Array.from(deep._ids);
      debug(`🧠 Local Associations: ${localAssociations.length}`);

      // Count locally stored associations
      let locallyStoredCount = 0;
      for (const associationId of localAssociations) {
        const association = new deep(associationId);
        if (association.isStored(storage)) {
          locallyStoredCount++;
        }
      }
      debug(`🏷️ Locally Stored: ${locallyStoredCount}`);

      // Check database via direct query
      debug('🗄️ Querying database for persisted links');
      const dbLinks = await hasyx.select({
        table: 'deep_links',
        where: { _deep: { _eq: deep._id } },
        returning: ['id', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at', '_i']
      });
      debug(`🗄️ Database Links: ${dbLinks.length}`);

      // === PHASE 6: Validation ===
      debug('✅ PHASE 6: Validating synchronization success');
      
      const syncSuccess = locallyStoredCount > 0 && dbLinks.length > 0 && locallyStoredCount === dbLinks.length;
      debug(`⚖️ Sync Success: ${syncSuccess ? '✅ YES' : '❌ NO'}`);

      if (!syncSuccess) {
        debug('❌ SYNCHRONIZATION FAILED - analyzing differences');
        debug(`   - Local associations: ${localAssociations.length}`);
        debug(`   - Locally stored: ${locallyStoredCount}`);
        debug(`   - Database records: ${dbLinks.length}`);
        
        // Log first few database records for debugging
        if (dbLinks.length > 0) {
          debug('🔍 Sample database records:');
          for (let i = 0; i < Math.min(dbLinks.length, 3); i++) {
            debug(`   ${i + 1}. ID: ${dbLinks[i].id}, Type: ${dbLinks[i]._type}, Deep: ${dbLinks[i]._deep}`);
          }
        }
        
        // Log first few locally stored associations for debugging
        if (locallyStoredCount > 0) {
          debug('🔍 Sample locally stored associations:');
          let count = 0;
          for (const associationId of localAssociations) {
            const association = new deep(associationId);
            if (association.isStored(storage) && count < 3) {
              debug(`   ${count + 1}. ID: ${associationId}, Type: ${association._type}`);
              count++;
            }
          }
        }
      }

      // === PHASE 7: Test Dynamic Operations ===
      debug('🔄 PHASE 7: Testing dynamic operations after initial sync');
      
      // Create new String association
      const testString = new deep.String('dynamic-test-data');
      debug(`📝 Created new String association: ${testString._id}`);
      
      // Store it in storage
      testString.store(storage, deep.storageMarkers.oneTrue);
      debug(`🏷️ Marked new association for storage`);
      
      // Wait for storage promise to complete the operation
      debug('⏳ Waiting for dynamic operation to complete');
      await storage.promise;
      debug('✅ Dynamic operation promise resolved');
      
      // Check if new association appears in database
      const updatedDbLinks = await hasyx.select({
        table: 'deep_links',
        where: { _deep: { _eq: deep._id } },
        returning: ['id', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at', '_i']
      });
      
      const dynamicLinkInDb = updatedDbLinks.find(link => link.id === testString._id);
      const dynamicSuccess = dynamicLinkInDb !== undefined;
      debug(`🔄 Dynamic Operation Success: ${dynamicSuccess ? '✅ YES' : '❌ NO'}`);
      
      if (dynamicSuccess) {
        debug(`   - New association found in DB with data: "${dynamicLinkInDb.string}"`);
      } else {
        debug(`   - New association NOT found in database`);
        debug(`   - Database now has ${updatedDbLinks.length} links (was ${dbLinks.length})`);
      }

      // === PHASE 8: Final Results ===
      debug('🎯 PHASE 8: Final test results');
      debug(`📊 SUMMARY:`);
      debug(`   🧠 Local associations: ${localAssociations.length}`);
      debug(`   🏷️ Locally stored: ${locallyStoredCount}`);
      debug(`   🗄️ Database links (initial): ${dbLinks.length}`);
      debug(`   🗄️ Database links (after dynamic): ${updatedDbLinks.length}`);
      debug(`   ⚖️ Initial sync: ${syncSuccess ? '✅' : '❌'}`);
      debug(`   🔄 Dynamic operation: ${dynamicSuccess ? '✅' : '❌'}`);

      // Test assertions
      expect(localAssociations.length).toBeGreaterThan(0);
      expect(locallyStoredCount).toBeGreaterThan(0);
      expect(dbLinks.length).toBeGreaterThan(0);
      expect(syncSuccess).toBe(true);
      expect(dynamicSuccess).toBe(true);
      
      debug('🎉 Test completed successfully!');

    } catch (error) {
      debug('💥 Test failed with error:', error);
      throw error;
    } finally {
      // === CLEANUP ===
      debug('🧹 Cleaning up test space');
      try {
        if (deep) {
          await hasyx.delete({
            table: 'deep_links',
            where: { _deep: { _eq: deep._id } }
          });
          debug(`✅ Cleaned up test space: ${deep._id}`);
        }
      } catch (cleanupError) {
        debug('⚠️ Cleanup error (non-critical):', cleanupError);
      }
    }
  }, 30000); // 30 second timeout for comprehensive test
});