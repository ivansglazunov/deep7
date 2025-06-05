import dotenv from 'dotenv';
import { Hasyx } from 'hasyx';
import { HasyxApolloClient, createApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { newDeep } from '.';
import schema from '../public/hasura-schema.json';
import { _delay } from './_promise';
import Debug from './debug';
import { _searchLostElements } from './storage';
import { newStorageHasyx, restoreDeep } from './storage-hasyx';

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

const { hasyx, cleanup } = createRealHasyxClient();
describe('[DEBUG] Hasyx Events - Database Event Logging', () => {
  afterAll(() => {
    cleanup();
  });
  
  it('should trigger database events and log them to debug table', async () => {
    // Create new Deep instance with storage
    const deep = newDeep();
    const StorageHasyx = newStorageHasyx(deep);
    const storage = new StorageHasyx({ hasyx });
    
    debug('🟢 deep._id', deep._id);
    debug('🟢 storage._id', storage._id);
    
    // Wait for initial synchronization
    await storage.promise;
    
    // Get initial debug count
    const debugCountBefore = await hasyx.select({
      table: 'debug',
      where: { 
        value: { _contains: { event_type: 'deep_framework_database_event' } }
      },
      aggregate: { count: true }
    });
    
    debug('🟢 Debug entries before:', debugCountBefore?.debug_aggregate?.aggregate?.count || 0);
    
    // Create a new association - this should trigger INSERT event
    const testAssoc = new deep();
    testAssoc.store(storage, deep.storageMarkers.oneTrue);
    
    debug('🟢 Created testAssoc._id', testAssoc._id);
    
    // Wait for storage sync
    await storage.promise;
    
    // Wait a bit for event processing
    await _delay(3000);
    
    // Check if debug entries were created
    const debugCountAfter = await hasyx.select({
      table: 'debug',
      where: { 
        value: { _contains: { event_type: 'deep_framework_database_event' } }
      },
      aggregate: { count: true }
    });
    
    debug('🟢 Debug entries after:', debugCountAfter?.debug_aggregate?.aggregate?.count || 0);
    
    // Get recent debug entries
    const recentDebugEntries = await hasyx.select({
      table: 'debug',
      where: { 
        value: { _contains: { event_type: 'deep_framework_database_event' } },
        created_at: { _gte: new Date(Date.now() - 10000).toISOString() }
      },
      order_by: { created_at: 'desc' },
      limit: 10,
      returning: ['id', 'value', 'created_at']
    });
    
    debug('🟢 Recent debug entries:', recentDebugEntries?.length || 0);
    
    if (recentDebugEntries && recentDebugEntries.length > 0) {
      recentDebugEntries.forEach((entry, index) => {
        debug(`🟢 Debug entry ${index + 1}:`, {
          value: entry.value,
          created_at: entry.created_at
        });
      });
    }
    
    // Verify that events were logged
    expect(debugCountAfter?.debug_aggregate?.aggregate?.count || 0).toBeGreaterThan(
      debugCountBefore?.debug_aggregate?.aggregate?.count || 0
    );
    
    // Update the association - this should trigger UPDATE event
    testAssoc.from = deep;
    await storage.promise;
    await _delay(3000);
    
    // Check for more debug entries
    const debugCountAfterUpdate = await hasyx.select({
      table: 'debug',
      where: { 
        value: { _contains: { event_type: 'deep_framework_database_event' } }
      },
      aggregate: { count: true }
    });
    
    debug('🟢 Debug entries after update:', debugCountAfterUpdate?.debug_aggregate?.aggregate?.count || 0);
    
    expect(debugCountAfterUpdate?.debug_aggregate?.aggregate?.count || 0).toBeGreaterThan(
      debugCountAfter?.debug_aggregate?.aggregate?.count || 0
    );
    
  }, 30000);
}); 