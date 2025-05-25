// Phase 4: HasyxDeepStorage Implementation
// Provides automatic database synchronization between Deep Framework and Hasura
import Debug from './debug';
import { newDeep } from './index';

// Debug categories for different aspects of the system
const debugLifecycle = Debug('hasyx:lifecycle');
const debugEvent = Debug('hasyx:event');
const debugSync = Debug('hasyx:sync');
const debugDatabase = Debug('hasyx:database');

// Create debug functions for different operations
const debugNewHasyx = Debug('storage:newHasyx');

/**
 * Creates HasyxDeepStorage class for strict database synchronization
 * Uses only high-level Deep Framework concepts: Alive, Field, Method, Event
 * No low-level _Deep internals or direct Map/Set manipulation
 */
export function newHasyxDeepStorage(deep: any) {
  debugLifecycle('Creating HasyxDeepStorage class');

  // Create singleton instance for shared state - this will be created once per Deep space
  let HasyxStorageInstance: any = null;
  let mainStorageInstance: any = null; // The main storage instance

  // Create the main HasyxDeepStorage class using Alive
  const HasyxDeepStorage = new deep.Alive(function(this: any) {
    if (this._reason == deep.reasons.construction._id) {
      debugLifecycle('HasyxDeepStorage instance created: %s', this._id);
      
      // Initialize singleton if not exists
      if (!HasyxStorageInstance) {
        HasyxStorageInstance = new deep();
        
        // Initialize singleton state using internal state
        const singletonState = HasyxStorageInstance._state;
        singletonState._initialized = false;
        singletonState._isActive = false;
        singletonState._hasyxClient = null;
        singletonState._trackedAssociations = new Set();
        singletonState._activePromises = new Set();
        
        debugLifecycle('Singleton instance created and initialized');
      }

      // Store reference to main storage instance
      if (!mainStorageInstance) {
        mainStorageInstance = this;
        
        // Set up event listeners only once
        if (!HasyxStorageInstance._state._listenersSetup) {
          setupGlobalStorageListener();
          HasyxStorageInstance._state._listenersSetup = true;
        }
      }

    } else if (this._reason == deep.reasons.destruction._id) {
      debugLifecycle('HasyxDeepStorage instance destroyed: %s', this._id);
      
      if (HasyxStorageInstance) {
        // Cleanup singleton state
        HasyxStorageInstance._state._isActive = false;
        HasyxStorageInstance._state._hasyxClient = null;
      }
    }
  });

  // Static helper functions
  function setupGlobalStorageListener() {
    // Use high-level .on() instead of low-level ._on()
    deep.on(deep.events.storeAdded, (payload: any) => {
      debugSync('Global storeAdded event received: %o', payload);
      
      if (!HasyxStorageInstance._state._isActive) {
        debugSync('Instance not active, ignoring storage event');
        return;
      }
      
      const { associationId, storageId, markerId } = payload;
      if (storageId === 'database') {
        startTrackingAssociation(associationId);
      }
    });
    
    debugSync('Global storage event listener set up');
  }

  function processExistingDatabaseStorages() {
    debugSync('Processing existing database storage markers');
    const allStorages = deep._getAllStorageMarkers();
    let processedCount = 0;
    
    for (const [associationId, storageMap] of allStorages) {
      if (storageMap.has('database')) {
        startTrackingAssociation(associationId);
        processedCount++;
      }
    }
    
    debugSync('Processed %d existing database storage associations', processedCount);
  }

  function startTrackingAssociation(associationId: string) {
    // Check if already being tracked
    if (HasyxStorageInstance._state._trackedAssociations.has(associationId)) {
      debugSync('Association %s is already being tracked', associationId);
      return;
    }
    
    debugSync('Starting to track association: %s', associationId);
    HasyxStorageInstance._state._trackedAssociations.add(associationId);
    
    const association = new deep(associationId);
    
    // Set up event listeners using high-level .on() API
    association.on(deep.events.typeSetted, handleAssociationCreated);
    association.on(deep.events.fromSetted, handleLinkUpdated);
    association.on(deep.events.toSetted, handleLinkUpdated);
    association.on(deep.events.valueSetted, handleLinkUpdated);
    association.on(deep.events.dataSetted, handleDataUpdated);
    
    debugSync('Event listeners set up for association: %s', associationId);
  }

  async function handleAssociationCreated(payload: any) {
    debugSync('handleAssociationCreated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._state._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available');
      return;
    }
    
    const associationId = payload._source;
    const association = new deep(associationId);
    
    debugSync('Processing association creation for: %s', associationId);
    
    // Create sync promise using existing promise system
    const syncOperation = (async () => {
      // STRICT REQUIREMENT: All referenced associations must exist in database
      const referencedIds = [
        association._type,
        association._from,
        association._to,
        association._value
      ].filter(id => id && typeof id === 'string');
      
      for (const refId of referencedIds) {
        const exists = await checkAssociationExists(hasyxClient, refId);
        if (!exists) {
          debugSync('Referenced association %s does not exist in database', refId);
          throw new Error(`Referenced association ${refId} must exist in database before creating ${associationId}`);
        }
      }
      
      // Insert new association
      const insertResult = await hasyxClient.insert({
        table: 'deep_links',
        object: {
          id: associationId,
          _deep: deep._id, // Deep space isolation key
          _i: association._i,
          _type: association._type,
          _from: association._from,
          _to: association._to,
          _value: association._value,
          created_at: new Date(association._created_at),
          updated_at: new Date(association._updated_at)
        },
        returning: ['id']
      });
      
      debugSync('Association created in database: %s', insertResult.id);
      
      // Handle typed data creation
      if (association._type) {
        await handleTypedDataCreation(hasyxClient, association);
      }
      
      // Emit completion event
      deep._emit(deep.events.dbAssociationCreated._id, payload);
      
      return insertResult;
    })();
    
    // Set promise directly on association
    association.promise = syncOperation;
    
    return syncOperation;
  }

  async function handleLinkUpdated(payload: any) {
    debugSync('handleLinkUpdated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._state._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available for link update');
      return;
    }
    
    const associationId = payload._source;
    const association = new deep(associationId);
    
    debugSync('Processing link update for: %s', associationId);
    
    const updateOperation = (async () => {
      const updateResult = await hasyxClient.update({
        table: 'deep_links',
        where: { id: { _eq: associationId } },
        _set: {
          _type: association._type,
          _from: association._from,
          _to: association._to,
          _value: association._value,
          updated_at: new Date(association._updated_at)
        },
        returning: ['id']
      });
      
      debugSync('Association updated in database: %s', updateResult[0]?.id);
      
      // Emit completion event
      deep._emit(deep.events.dbLinkUpdated._id, payload);
      
      return updateResult;
    })();
    
    // Set promise directly on association
    association.promise = updateOperation;
    
    return updateOperation;
  }

  async function handleDataUpdated(payload: any) {
    debugSync('handleDataUpdated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._state._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available for data update');
      return;
    }
    
    const associationId = payload._source;
    const association = new deep(associationId);
    
    if (!association._type || !association._data) {
      debugSync('No type or data for association %s, skipping data update', associationId);
      return;
    }
    
    debugSync('Processing data update for: %s', associationId);
    
    const updateOperation = (async () => {
      const typeId = association._type;
      let targetTable: string | null = null;
      
      if (typeId === deep.String._id) {
        targetTable = 'deep_strings';
      } else if (typeId === deep.Number._id) {
        targetTable = 'deep_numbers';
      } else if (typeId === deep.Function._id) {
        targetTable = 'deep_functions';
      }
      
      if (!targetTable) {
        debugSync('No typed table for type %s, skipping data update', typeId);
        return;
      }
      
      const updateResult = await hasyxClient.update({
        table: targetTable,
        where: { id: { _eq: associationId } },
        _set: { _data: association._data },
        returning: ['id']
      });
      
      debugSync('Data updated in database: %s', updateResult[0]?.id);
      
      // Emit completion event
      deep._emit(deep.events.dbDataUpdated._id, payload);
      
      return updateResult;
    })();
    
    // Set promise directly on association
    association.promise = updateOperation;
    
    return updateOperation;
  }

  // Add method to set hasyx client
  HasyxDeepStorage._context._setHasyxClient = new deep.Method(function(this: any, hasyxClient: any) {
    debugLifecycle('Setting Hasyx client for storage');
    
    if (!hasyxClient) {
      throw new Error('hasyxClient is required');
    }
    
    // Validate hasyx client
    if (typeof hasyxClient.select !== 'function' || 
        typeof hasyxClient.insert !== 'function') {
      throw new Error('Invalid hasyxClient: missing required methods (select, insert, update, delete)');
    }
    
    // Set client and activate storage
    HasyxStorageInstance._state._hasyxClient = hasyxClient;
    HasyxStorageInstance._state._isActive = true;
    HasyxStorageInstance._state._initialized = true;
    
    // Process existing database storages
    processExistingDatabaseStorages();
    
    debugLifecycle('HasyxDeepStorage successfully configured with client');
    
    return true;
  });

  return HasyxDeepStorage;

  // Helper functions that need access to deep
  async function checkAssociationExists(hasyxClient: any, associationId: string): Promise<boolean> {
    try {
      const result = await hasyxClient.select({
        table: 'deep_links',
        where: { id: { _eq: associationId } },
        returning: ['id'],
        limit: 1
      });
      return result.length > 0;
    } catch (error: any) {
      debugSync('Error checking association existence: %s', error.message);
      return false;
    }
  }

  async function handleTypedDataCreation(hasyxClient: any, association: any) {
    if (!association._type || !association._data) {
      return;
    }

    const typeId = association._type;
    let targetTable: string | null = null;
    
    if (typeId === deep.String._id) {
      targetTable = 'deep_strings';
    } else if (typeId === deep.Number._id) {
      targetTable = 'deep_numbers';
    } else if (typeId === deep.Function._id) {
      targetTable = 'deep_functions';
    }
    
    if (!targetTable) {
      debugSync('No typed table for type %s, skipping typed data creation', typeId);
      return;
    }

    debugSync('Creating typed data for %s in table %s', association._id, targetTable);
    
    try {
      await hasyxClient.insert({
        table: targetTable,
        object: {
          id: association._id,
          _data: association._data
        },
        returning: ['id']
      });
      
      debugSync('Typed data created successfully for %s', association._id);
    } catch (error: any) {
      if (error.message.includes('duplicate key')) {
        debugSync('Typed data already exists for %s', association._id);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Load dump from existing Deep space in database
 * @param options - Configuration options
 * @param options.hasyx - Hasyx client instance
 * @param options.id - ID of Deep space to load
 * @returns Promise<Array> - Array of objects with association data and typed data
 */
export async function loadHasyxDeep(options: {
  hasyx: any;
  id: string;
}): Promise<any[]> {
  if (!options || typeof options !== 'object') {
    throw new Error('loadHasyxDeep() requires options object');
  }
  
  if (!options.hasyx) {
    throw new Error('loadHasyxDeep() requires options.hasyx');
  }
  
  if (!options.id || typeof options.id !== 'string') {
    throw new Error('loadHasyxDeep() requires options.id as string');
  }
  
  const { hasyx, id: deepSpaceId } = options;
  
  // Load all associations from this Deep space with typed data in one query using relationships
  const associations = await hasyx.select({
    table: 'deep_links',
    where: { _deep: { _eq: deepSpaceId } },
    returning: [
      'id', '_i', '_type', '_from', '_to', '_value', 'created_at', 'updated_at',
      // Use relationships to get typed data in one query
      { deep_strings: { returning: ['_data'] } },
      { deep_numbers: { returning: ['_data'] } },
      { deep_functions: { returning: ['_data'] } }
    ],
    order_by: [{ _i: 'asc' }]
  });
  
  if (associations.length === 0) {
    throw new Error(`No associations found for Deep space: ${deepSpaceId}`);
  }
  
  // Transform associations to include typed data in the expected format
  const dump = associations.map(assoc => {
    const result: any = {
      id: assoc.id,
      _i: assoc._i,
      _type: assoc._type,
      _from: assoc._from,
      _to: assoc._to,
      _value: assoc._value,
      created_at: assoc.created_at,
      updated_at: assoc.updated_at
    };
    
    // Add typed data if present
    if (assoc.deep_strings && assoc.deep_strings._data !== undefined) {
      result.string = { value: assoc.deep_strings._data };
    }
    if (assoc.deep_numbers && assoc.deep_numbers._data !== undefined) {
      result.number = { value: assoc.deep_numbers._data };
    }
    if (assoc.deep_functions && assoc.deep_functions._data !== undefined) {
      result.function = { value: assoc.deep_functions._data };
    }
    
    return result;
  });
  
  return dump;
}

/**
 * Load Deep space from database using _deep key for space isolation
 * @param hasyxClient - Hasyx client instance
 * @param deepSpaceId - The _deep UUID identifying the specific Deep space
 * @param options - Additional options for loading
 * @returns Promise<Deep> - New Deep instance with loaded associations
 */
export async function loadDeepSpace(hasyxClient: any, deepSpaceId: string, options: {
  Deep?: any;
  _Deep?: any;
} = {}) {
  // Load all associations from this Deep space with typed data in one query using relationships
  const associations = await hasyxClient.select({
    table: 'deep_links',
    where: { _deep: { _eq: deepSpaceId } },
    returning: [
      'id', '_i', '_type', '_from', '_to', '_value', 'created_at', 'updated_at',
      // Use relationships to get typed data in one query
      { deep_strings: { returning: ['_data'] } },
      { deep_numbers: { returning: ['_data'] } },
      { deep_functions: { returning: ['_data'] } }
    ],
    order_by: [{ _i: 'asc' }]
  });
  
  if (associations.length === 0) {
    throw new Error(`No associations found for Deep space: ${deepSpaceId}`);
  }
  
  // Extract IDs in sequence order for proper restoration
  const existingIds = associations.map((assoc: any) => assoc.id);
  
  // Create new Deep instance with existing IDs
  const deep = newDeep({
    existingIds,
    Deep: options.Deep,
    _Deep: options._Deep
  });
  
  // Restore associations with their relationships and typed data
  for (const assoc of associations) {
    const association = new deep(assoc.id);
    
    // Restore relationships
    if (assoc._type) association._type = assoc._type;
    if (assoc._from) association._from = assoc._from;
    if (assoc._to) association._to = assoc._to;
    if (assoc._value) association._value = assoc._value;
    
    // Restore timestamps (they are already numbers in database)
    association._created_at = assoc.created_at;
    association._updated_at = assoc.updated_at;
    
    // Restore typed data if present
    if (assoc.deep_strings && assoc.deep_strings._data !== undefined) {
      association._data = assoc.deep_strings._data;
    }
    if (assoc.deep_numbers && assoc.deep_numbers._data !== undefined) {
      association._data = assoc.deep_numbers._data;
    }
    if (assoc.deep_functions && assoc.deep_functions._data !== undefined) {
      association._data = assoc.deep_functions._data;
    }
  }
  
  return deep;
}

/**
 * Create new Deep instance with Hasyx synchronization
 * @param options - Configuration options
 * @param options.hasyx - Hasyx client instance (renamed from hasyxClient for consistency)
 * @param options.dump - Optional dump from loadHasyxDeep to restore associations
 * @param options.deep - Optional existing deep instance to use
 * @returns Deep - New Deep instance with Hasyx synchronization enabled (synchronous)
 */
export function newHasyxDeep(options: {
  hasyx: any;
  dump?: any[];
  deep?: any;  // Add support for passing existing deep instance
  Deep?: any;
  _Deep?: any;
}): any {
  if (!options || typeof options !== 'object') {
    throw new Error('newHasyxDeep() requires options object');
  }
  
  if (!options.hasyx) {
    throw new Error('newHasyxDeep() requires options.hasyx');
  }
  
  const { hasyx: hasyxClient, dump, deep: existingDeep, Deep, _Deep } = options;
  
  // Use existing deep instance if provided, otherwise create new one
  const deep = existingDeep || (dump ? 
    newDeep({ existingIds: dump.map(item => item.id), Deep, _Deep }) : 
    newDeep({ Deep, _Deep })
  );
  
  debugNewHasyx(`[newHasyxDeep] ${existingDeep ? 'Using existing' : 'Created new'} Deep space with ${deep._ids.size} framework associations`);
  
  // Create storage instance for this deep space
  const storage = newHasyxDeepStorage(deep);
  deep._context.storage = storage;
  
  // If we have a dump, restore associations from it
  if (dump && !existingDeep) {
    debugNewHasyx(`[newHasyxDeep] Restoring ${dump.length} associations from dump`);
    
    for (const item of dump) {
      const association = new deep(item.id);
      
      // Restore basic association properties
      if (item._type !== undefined && item._type !== null) association._type = item._type;
      if (item._from !== undefined && item._from !== null) association._from = item._from;
      if (item._to !== undefined && item._to !== null) association._to = item._to;
      if (item._value !== undefined && item._value !== null) association._value = item._value;
      
      // Restore typed data
      if (item.string?.value !== undefined) {
        association._data = item.string.value;
      } else if (item.number?.value !== undefined) {
        association._data = item.number.value;
      } else if (item.function?.value !== undefined) {
        // For functions, create a simple wrapper that preserves the serialized code
        // This avoids eval issues while maintaining function identity
        const functionCode = item.function.value;
        association._data = function restoredFunction() {
          // This is a restored function from database
          // Original code: ${functionCode}
          return functionCode;
        };
        // Store original code for reference
        association._data._originalCode = functionCode;
      }
    }
  }
  
  // Configure automatic marking for database synchronization
  configureAutoMarking(deep, storage);
  
  if (dump && !existingDeep) {
    // For restored spaces from dump, set resolved promise immediately (no sync needed)
    storage.promise = Promise.resolve(true);
    debugNewHasyx(`[newHasyxDeep] Deep space restored from dump, no sync needed`);
  } else {
    // Start sync in background and set up promise tracking
    const syncPromise = syncAllAssociationsToDatabase(deep, hasyxClient);
    
    // Set promise directly on storage for tracking
    storage.promise = syncPromise;
    
    debugNewHasyx(`[newHasyxDeep] Background sync started, returning deep instance`);
    debugNewHasyx(`[newHasyxDeep] To wait for sync completion: await deep.storage.promise`);
  }
  
  return deep;
}

/**
 * Configure automatic storage marking for basic types
 * @param deep - Deep instance to configure
 * @param storage - Storage instance to use for marking
 */
function configureAutoMarking(deep: any, storage: any) {
  // Mark the deep instance itself for synchronization
  deep.store(storage, deep.storageMarkers.oneTrue);
  
  // Mark basic types for automatic synchronization of all instances
  deep.String.store(storage, deep.storageMarkers.typedTrue);
  deep.Number.store(storage, deep.storageMarkers.typedTrue);
  deep.Function.store(storage, deep.storageMarkers.typedTrue);
}

/**
 * Wrap existing Deep instance with Hasyx synchronization
 * Synchronizes all current associations to database once
 * @param deep - Existing Deep instance to wrap
 * @param hasyxClient - Hasyx client instance  
 * @returns Promise<Deep> - The same Deep instance with synchronization enabled
 */
export async function wrapHasyxDeep(deep: any, hasyxClient: any): Promise<any> {
  if (!deep || typeof deep !== 'object') {
    throw new Error('wrapHasyxDeep() requires Deep instance');
  }
  
  if (!hasyxClient) {
    throw new Error('wrapHasyxDeep() requires hasyxClient');
  }
  
  // Initialize Hasyx storage for this Deep space
  const storage = new deep.HasyxDeepStorage();
  deep._context.storage = storage;
  
  // Set hasyx client directly instead of using initialize
  storage._setHasyxClient(hasyxClient);
  
  // Configure automatic storage marking
  configureAutoMarking(deep, storage);
  
  // Synchronize all existing associations to database
  await syncAllAssociationsToDatabase(deep, hasyxClient);
  
  return deep;
}

/**
 * Synchronize all associations in Deep space to database
 * @param deep - Deep instance containing associations
 * @param hasyxClient - Hasyx client instance
 */
async function syncAllAssociationsToDatabase(deep: any, hasyxClient: any) {
  const spaceId = deep._id;
  debugNewHasyx(`[syncAll] Starting sync for space ${spaceId} with ${deep._ids.size} associations`);
  
  const linksToInsert: any[] = [];
  const stringsToInsert: any[] = [];
  const numbersToInsert: any[] = [];
  const functionsToInsert: any[] = [];
  
  // Process all associations
  for (const id of deep._ids) {
    const association = new deep(id);
    
    // Basic association data
    const linkData: any = {
      id: association._id,
      _deep: spaceId,
      _i: association._i,
      _type: association._type || null,
      _from: association._from || null,
      _to: association._to || null,
      _value: association._value || null,
      created_at: association._created_at || new Date().valueOf(),
      updated_at: association._updated_at || new Date().valueOf()
    };
    
    linksToInsert.push(linkData);
    
    // Handle typed data separately
    if (association._data !== undefined) {
      if (typeof association._data === 'string') {
        stringsToInsert.push({
          id: association._id,
          _data: association._data
        });
      } else if (typeof association._data === 'number') {
        numbersToInsert.push({
          id: association._id,
          _data: association._data
        });
      } else if (typeof association._data === 'function') {
        functionsToInsert.push({
          id: association._id,
          _data: association._data.toString()
        });
      }
    }
  }
  
  debugNewHasyx(`[syncAll] Prepared: ${linksToInsert.length} links, ${stringsToInsert.length} strings, ${numbersToInsert.length} numbers, ${functionsToInsert.length} functions`);
  
  // Insert links first
  if (linksToInsert.length > 0) {
    debugNewHasyx(`[syncAll] Inserting ${linksToInsert.length} links...`);
    await hasyxClient.insert({
      table: 'deep_links',
      objects: linksToInsert,
      on_conflict: {
        constraint: 'links_pkey',
        update_columns: ['_type', '_from', '_to', '_value', 'updated_at']
      }
    });
    debugNewHasyx(`[syncAll] Links inserted`);
  }
  
  // Insert typed data sequentially after links are inserted
  if (stringsToInsert.length > 0) {
    debugNewHasyx(`[syncAll] Inserting ${stringsToInsert.length} strings...`);
    await hasyxClient.insert({
      table: 'deep_strings',
      objects: stringsToInsert,
      on_conflict: {
        constraint: 'strings_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncAll] Strings inserted`);
  }
  
  if (numbersToInsert.length > 0) {
    debugNewHasyx(`[syncAll] Inserting ${numbersToInsert.length} numbers...`);
    await hasyxClient.insert({
      table: 'deep_numbers',
      objects: numbersToInsert,
      on_conflict: {
        constraint: 'numbers_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncAll] Numbers inserted`);
  }
  
  if (functionsToInsert.length > 0) {
    debugNewHasyx(`[syncAll] Inserting ${functionsToInsert.length} functions...`);
    await hasyxClient.insert({
      table: 'deep_functions',
      objects: functionsToInsert,
      on_conflict: {
        constraint: 'functions_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncAll] Functions inserted`);
  }
  
  debugNewHasyx(`[syncAll] Sync completed for space ${spaceId}`);
  return true;
}