import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const generate = Generator(schema as any);

// Helper to create complete test environment for each test
function createTestEnvironment(): { 
  deep: any, 
  hasyx: Hasyx, 
  cleanup: () => Promise<void> 
} {
  const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET || 'dev-secret';

  const apolloClient = createApolloClient({
    url: hasuraUrl,
    secret: hasuraSecret,
    ws: false,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);
  
  // Create new Deep instance with fresh namespace
  const deep = newDeep();
  
  const cleanup = async () => {
    // Minimal cleanup to avoid database hangs
    try {
      // Only clean Apollo Client cache, no database operations
      if (apolloClient.cache) {
        apolloClient.cache.reset();
      }
    } catch (error) {
      // Ignore all cleanup errors to prevent hanging
      console.debug('Cleanup ignored error:', error);
    }
  };

  return { deep, hasyx, cleanup };
}

describe.skip('Phase 4: Database Integration & Events', () => {
  describe.skip('HasyxDeepStorage Creation', () => {
    it('should create HasyxDeepStorage with proper initialization', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Create storage instance
        hasyxStorage = new deep.HasyxDeepStorage();
        expect(hasyxStorage).toBeDefined();
        
        // Verify initial state
        const initialState = hasyxStorage._getState(hasyxStorage._id);
        expect(initialState).toBeDefined();
        expect(hasyxStorage._initialized).toBe(false);
        expect(hasyxStorage._isActive).toBe(false);
        
        // Initialize with hasyx client
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Verify post-initialization state
        expect(hasyxStorage._initialized).toBe(true);
        expect(hasyxStorage._isActive).toBe(true);
        
        // Verify state contains hasyx client
        const postInitState = hasyxStorage._state;
        expect(postInitState._hasyxClient).toBe(hasyx);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should require hasyxClient for initialization', async () => {
      const { deep, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        hasyxStorage = new deep.HasyxDeepStorage();
        
        expect(() => {
          hasyxStorage.initialize({});
        }).toThrow('hasyxClient is required for HasyxDeepStorage initialization');
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should prevent double initialization', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
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

  describe.skip('Database Events System', () => {
    it('should define database event types', async () => {
      const { deep, cleanup } = createTestEnvironment();
      
      try {
        expect(deep.events.dbAssociationCreated).toBeDefined();
        expect(deep.events.dbLinkUpdated).toBeDefined(); 
        expect(deep.events.dbDataUpdated).toBeDefined();
        expect(deep.events.dbAssociationDeleted).toBeDefined();
        expect(deep.events.dbBatchStarted).toBeDefined();
        expect(deep.events.dbBatchCompleted).toBeDefined();
        expect(deep.events.dbBatchFailed).toBeDefined();
        
        // Verify they are actual Deep instances
        expect(deep.events.dbAssociationCreated._id).toBeDefined();
        expect(deep.events.dbLinkUpdated._id).toBeDefined();
        
      } finally {
        await cleanup();
      }
    });
  });

  describe.skip('Association Synchronization', () => {
    it('should handle basic association creation', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Initialize storage
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create association
        const testAssociation = new deep();
        expect(testAssociation._id).toBeDefined();
        
        // Mark for storage - this should trigger synchronization
        testAssociation.store('database', deep.storageMarkers.oneTrue);
        
        // Verify association is tracked
        const storageMarkers = testAssociation._getStorageMarkers('database');
        expect(storageMarkers.has(deep.storageMarkers.oneTrue._id)).toBe(true);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle string association creation', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Initialize storage
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create string association
        const testString = new deep.String('test data');
        expect(testString._data).toBe('test data');
        expect(testString._type).toBe(deep.String._id);
        
        // Mark for storage
        testString.store('database', deep.storageMarkers.oneTrue);
        
        // Verify storage marker
        const storageMarkers = testString._getStorageMarkers('database');
        expect(storageMarkers.has(deep.storageMarkers.oneTrue._id)).toBe(true);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle link creation', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Initialize storage
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        // Create associations
        const sourceAssoc = new deep();
        const targetAssoc = new deep();
        
        // Mark for storage
        sourceAssoc.store('database', deep.storageMarkers.oneTrue);
        targetAssoc.store('database', deep.storageMarkers.oneTrue);
        
        // Create link
        sourceAssoc.type = targetAssoc;
        expect(sourceAssoc._type).toBe(targetAssoc._id);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });

  describe.skip('Storage Markers System', () => {
    it('should handle storage markers correctly', async () => {
      const { deep, cleanup } = createTestEnvironment();
      
      try {
        // Create association
        const testAssoc = new deep();
        
        // Debug: Check deep instances match
        console.log('deep._Deep === testAssoc._Deep:', deep._Deep === testAssoc._Deep);
        console.log('deep._storages === testAssoc._storages:', deep._storages === testAssoc._storages);
        console.log('deep._Deep._storages === testAssoc._Deep._storages:', deep._Deep._storages === testAssoc._Deep._storages);
        
        // Debug: Check if store method exists
        console.log('testAssoc.store exists:', typeof testAssoc.store);
        console.log('deep.storageMarkers.oneTrue exists:', !!deep.storageMarkers.oneTrue);
        console.log('deep.storageMarkers.oneTrue._id:', deep.storageMarkers.oneTrue._id);
        
        // Verify initial state - no storage markers
        const initialMarkers = testAssoc._getStorageMarkers('database');
        console.log('Initial markers:', initialMarkers);
        expect(initialMarkers.size).toBe(0);
        
        // Add storage marker
        console.log('Calling testAssoc.store()...');
        testAssoc.store('database', deep.storageMarkers.oneTrue);
        
        // Debug: Check both instances after store
        const markersViaTestAssoc = testAssoc._getStorageMarkers('database');
        const markersViaDeep = deep._getStorageMarkers(testAssoc._id, 'database');
        
        console.log('Markers via testAssoc._getStorageMarkers():', markersViaTestAssoc);
        console.log('Markers via deep._getStorageMarkers():', markersViaDeep);
        console.log('testAssoc._id:', testAssoc._id);
        
        // Try the method that we expect to work
        expect(markersViaDeep.has(deep.storageMarkers.oneTrue._id)).toBe(true);
        
      } finally {
        await cleanup();
      }
    });
  });

  describe.skip('Lifecycle Management', () => {
    it('should handle storage destruction properly', async () => {
      const { deep, hasyx, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Create and initialize storage
        hasyxStorage = new deep.HasyxDeepStorage();
        hasyxStorage.initialize({ hasyxClient: hasyx });
        
        expect(hasyxStorage._isActive).toBe(true);
        expect(hasyxStorage._initialized).toBe(true);
        
        // Destroy storage
        hasyxStorage.destroy();
        
        // Verify state after destruction
        expect(hasyxStorage._isActive).toBe(false);
        expect(hasyxStorage._initialized).toBe(false);
        
        // Set to null to prevent cleanup in finally
        hasyxStorage = null;
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });

  describe.skip('Error Handling', () => {
    it('should fail gracefully when storage operations fail', async () => {
      const { deep, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        // Create storage without initialization
        hasyxStorage = new deep.HasyxDeepStorage();
        
        // Attempting storage operations without initialization should fail
        const testAssoc = new deep();
        
        // This should not throw but should not work either
        testAssoc.store('database', deep.storageMarkers.oneTrue);
        
        // Verify marker was set even though storage is not initialized
        const markers = testAssoc._getStorageMarkers('database');
        expect(markers.has(deep.storageMarkers.oneTrue._id)).toBe(true);
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });

    it('should handle invalid initialization parameters', async () => {
      const { deep, cleanup } = createTestEnvironment();
      let hasyxStorage: any = null;
      
      try {
        hasyxStorage = new deep.HasyxDeepStorage();
        
        // Test various invalid parameters
        expect(() => {
          hasyxStorage.initialize({ hasyxClient: null });
        }).toThrow('hasyxClient is required for HasyxDeepStorage initialization');
        
        expect(() => {
          hasyxStorage.initialize({ hasyxClient: undefined });
        }).toThrow('hasyxClient is required for HasyxDeepStorage initialization');
        
        expect(() => {
          hasyxStorage.initialize({ hasyxClient: 'invalid' });
        }).toThrow('hasyxClient is required for HasyxDeepStorage initialization');
        
      } finally {
        if (hasyxStorage) {
          hasyxStorage.destroy();
        }
        await cleanup();
      }
    });
  });
}); 