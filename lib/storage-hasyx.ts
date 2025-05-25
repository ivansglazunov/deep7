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

  // Module-level storage instance reference
  let globalStorageInstance: any = null;

  // Create the main HasyxDeepStorage class using Alive
  const HasyxDeepStorage = new deep.Alive(function(this: any) {
    if (this._reason == deep.reasons.construction._id) {
      debugLifecycle('HasyxDeepStorage instance constructed: %s', this._id);
      
      // Initialize state
      const state = this._state;
      state._syncEnabled = false;
      state._hasyxClient = null;
      state._trackedAssociations = new Set();
      state._operationQueue = [];
      state._isProcessingQueue = false;
      
      // Store reference for global access
      if (!globalStorageInstance) {
        globalStorageInstance = this;
        
        // Setup global event listeners
        setupGlobalSyncListeners(this);
        
        debugLifecycle('HasyxDeepStorage singleton initialized');
      }
      
    } else if (this._reason == deep.reasons.destruction._id) {
      debugLifecycle('HasyxDeepStorage instance destroyed: %s', this._id);
      
      if (globalStorageInstance === this) {
        globalStorageInstance = null;
      }
    }
  });

  // Setup global event listeners for real-time synchronization
  function setupGlobalSyncListeners(storageInstance: any) {
    if (!deep.events) return;
    
    debugLifecycle('Setting up global sync listeners');
    
    // Listen for link changes (when associations become meaningful)
    if (deep.events.globalLinkChanged) {
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        handleGlobalLinkChanged(storageInstance, payload);
      });
    }
    
    // Listen for data changes
    if (deep.events.globalDataChanged) {
      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        handleGlobalDataChanged(storageInstance, payload);
      });
    }
    
    // Listen for association destruction
    if (deep.events.globalDestroyed) {
      deep.on(deep.events.globalDestroyed._id, (payload: any) => {
        handleGlobalDestroyed(storageInstance, payload);
      });
    }
  }

  // Process operation queue sequentially
  async function processOperationQueue(storageInstance: any) {
    const state = storageInstance._state;
    
    if (state._isProcessingQueue || state._operationQueue.length === 0) {
      return;
    }
    
    state._isProcessingQueue = true;
    debugSync('Processing operation queue, %d operations pending', state._operationQueue.length);
    
    try {
      while (state._operationQueue.length > 0) {
        const operation = state._operationQueue.shift();
        if (operation) {
          debugSync('Executing queued operation');
          await operation();
          debugSync('Operation completed');
        }
      }
    } catch (error: any) {
      debugSync('Error processing operation queue: %s', error.message);
      throw error;
    } finally {
      state._isProcessingQueue = false;
      debugSync('Operation queue processing completed');
    }
  }

  // Add operation to queue and update storage.promise
  function queueOperation(storageInstance: any, operation: () => Promise<any>) {
    const state = storageInstance._state;
    state._operationQueue.push(operation);
    
    // Update storage.promise to reflect the new queue state
    const queuePromise = processOperationQueue(storageInstance);
    storageInstance.promise = queuePromise;
    
    return queuePromise;
  }

  // Handle link changes (_type, _from, _to, _value) - this is when associations become meaningful
  async function handleGlobalLinkChanged(storageInstance: any, payload: any) {
    const state = storageInstance._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      debugSync('Sync disabled or no client, skipping handleGlobalLinkChanged');
      return;
    }
    
    debugSync('handleGlobalLinkChanged: %o', payload);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // Queue the sync operation
    return queueOperation(storageInstance, async () => {
      try {
        // Check if this association already exists in database
        const exists = await checkAssociationExists(hasyxClient, associationId);
        debugSync('Association %s exists in database: %s', associationId, exists);
        
        if (!exists) {
          // Create new association in database
          debugDatabase('Creating new association in database: %s', associationId);
          
          // Get current state of the association
          const association = deep._ids.has(associationId) ? {
            _id: associationId,
            _i: deep._getSequenceNumber(associationId),
            _type: deep._Type.one(associationId) || null,
            _from: deep._From.one(associationId) || null,
            _to: deep._To.one(associationId) || null,
            _value: deep._Value.one(associationId) || null,
            _created_at: deep._created_ats.get(associationId) || new Date().valueOf(),
            _updated_at: deep._updated_ats.get(associationId) || new Date().valueOf()
          } : null;
          
          if (!association) {
            debugDatabase('Association not found in memory: %s', associationId);
            return;
          }
          
          debugDatabase('Association state: %o', association);
          
          // Create referenced associations first (they will be queued before this operation)
          await ensureReferencedAssociationsExist(hasyxClient, association);
          
          const insertResult = await hasyxClient.insert({
            table: 'deep_links',
            object: {
              id: associationId,
              _deep: deep._id,
              _i: association._i,
              _type: association._type,
              _from: association._from,
              _to: association._to,
              _value: association._value,
              created_at: association._created_at,
              updated_at: association._updated_at
            },
            returning: ['id']
          });
          
          debugDatabase('Association created in database: %s', insertResult.id);
          
          // Handle typed data if present
          const data = deep._getData(associationId);
          if (data !== undefined) {
            await syncTypedDataToDatabase(hasyxClient, associationId, association._type, data);
          }
          
          return insertResult;
        } else {
          // Update existing association
          debugDatabase('Updating link in database: %s, field: %s', associationId, payload.field);
          
          const updateData: any = {
            updated_at: new Date().valueOf()
          };
          
          // Update specific field
          if (payload.field === '_type') {
            updateData._type = payload.after;
          } else if (payload.field === '_from') {
            updateData._from = payload.after;
          } else if (payload.field === '_to') {
            updateData._to = payload.after;
          } else if (payload.field === '_value') {
            updateData._value = payload.after;
          }
          
          const updateResult = await hasyxClient.update({
            table: 'deep_links',
            where: { id: { _eq: associationId } },
            _set: updateData,
            returning: ['id']
          });
          
          debugDatabase('Link updated in database: %s', updateResult[0]?.id);
          
          return updateResult;
        }
      } catch (error: any) {
        debugDatabase('Error syncing link change to database: %s', error.message);
        throw error;
      }
    });
  }

  // Helper function to ensure referenced associations exist
  async function ensureReferencedAssociationsExist(hasyxClient: any, association: any) {
    const referencedIds = [association._type, association._from, association._to, association._value]
      .filter(id => id && typeof id === 'string');
    
    for (const refId of referencedIds) {
      const refExists = await checkAssociationExists(hasyxClient, refId);
      if (!refExists) {
        debugDatabase('Referenced association %s does not exist, creating it first', refId);
        
        // Create referenced association first
        const refAssociation = {
          _id: refId,
          _i: deep._getSequenceNumber(refId),
          _type: deep._Type.one(refId) || null,
          _from: deep._From.one(refId) || null,
          _to: deep._To.one(refId) || null,
          _value: deep._Value.one(refId) || null,
          _created_at: deep._created_ats.get(refId) || new Date().valueOf(),
          _updated_at: deep._updated_ats.get(refId) || new Date().valueOf()
        };
        
        // Recursively ensure referenced associations exist
        await ensureReferencedAssociationsExist(hasyxClient, refAssociation);
        
        await hasyxClient.insert({
          table: 'deep_links',
          object: {
            id: refId,
            _deep: deep._id,
            _i: refAssociation._i,
            _type: refAssociation._type,
            _from: refAssociation._from,
            _to: refAssociation._to,
            _value: refAssociation._value,
            created_at: refAssociation._created_at,
            updated_at: refAssociation._updated_at
          },
          returning: ['id']
        });
        
        debugDatabase('Referenced association created: %s', refId);
      }
    }
  }

  // Handle data changes
  async function handleGlobalDataChanged(storageInstance: any, payload: any) {
    const state = storageInstance._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      return;
    }
    
    debugSync('handleGlobalDataChanged: %o', payload);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // Queue the sync operation
    return queueOperation(storageInstance, async () => {
      try {
        debugDatabase('Updating data in database: %s', associationId);
        
        // Get current state
        const typeId = deep._Type.one(associationId);
        const data = deep._getData(associationId);
        
        if (typeId && data !== undefined) {
          await syncTypedDataToDatabase(hasyxClient, associationId, typeId, data);
        }
        
        return { id: associationId };
      } catch (error: any) {
        debugDatabase('Error updating data in database: %s', error.message);
        throw error;
      }
    });
  }

  // Handle association destruction
  async function handleGlobalDestroyed(storageInstance: any, payload: any) {
    const state = storageInstance._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      return;
    }
    
    debugSync('handleGlobalDestroyed: %o', payload);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // Queue the sync operation
    return queueOperation(storageInstance, async () => {
      try {
        debugDatabase('Deleting association from database: %s', associationId);
        
        // Delete from deep_links (cascade triggers will handle typed data)
        const deleteResult = await hasyxClient.delete({
          table: 'deep_links',
          where: { id: { _eq: associationId } },
          returning: ['id']
        });
        
        debugDatabase('Association deleted from database: %s', deleteResult[0]?.id);
        
        return deleteResult;
      } catch (error: any) {
        debugDatabase('Error deleting association from database: %s', error.message);
        throw error;
      }
    });
  }

  // Helper function to sync typed data to database
  async function syncTypedDataToDatabase(hasyxClient: any, associationId: string, typeId: string, dataValue: any) {
    try {
      if (typeof dataValue === 'string') {
        await hasyxClient.insert({
          table: 'deep_strings',
          object: { id: associationId, _data: dataValue },
          on_conflict: {
            constraint: 'strings_pkey',
            update_columns: ['_data']
          }
        });
        debugDatabase('String data synced for %s', associationId);
      } else if (typeof dataValue === 'number') {
        await hasyxClient.insert({
          table: 'deep_numbers',
          object: { id: associationId, _data: dataValue },
          on_conflict: {
            constraint: 'numbers_pkey',
            update_columns: ['_data']
          }
        });
        debugDatabase('Number data synced for %s', associationId);
      } else if (typeof dataValue === 'function') {
        await hasyxClient.insert({
          table: 'deep_functions',
          object: { id: associationId, _data: dataValue.toString() },
          on_conflict: {
            constraint: 'functions_pkey',
            update_columns: ['_data']
          }
        });
        debugDatabase('Function data synced for %s', associationId);
      }
    } catch (error: any) {
      debugDatabase('Error syncing typed data for %s: %s', associationId, error.message);
      throw error;
    }
  }

  // Helper function to check if association exists in database
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
      debugDatabase('Error checking association existence for %s: %s', associationId, error.message);
      return false;
    }
  }

  return HasyxDeepStorage;
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
  const storage = new deep.HasyxDeepStorage();
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
    
    // For restored spaces from dump, set resolved promise immediately (no sync needed)
    storage.promise = Promise.resolve(true);
    debugNewHasyx(`[newHasyxDeep] Deep space restored from dump, no sync needed`);
    
    // Set up client but disable initial sync for restored spaces
    const state = storage._state;
    state._hasyxClient = hasyxClient;
    state._syncEnabled = true; // Enable sync for future changes
  } else {
    // Initialize storage with sync
    const initPromise = initializeHasyxStorage(deep, hasyxClient);
    debugNewHasyx(`[newHasyxDeep] Background sync started, returning deep instance`);
    debugNewHasyx(`[newHasyxDeep] To wait for sync completion: await deep.storage.promise`);
  }
  
  return deep;
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
  await initializeHasyxStorage(deep, hasyxClient);
  
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

// Simple initialization function
export function initializeHasyxStorage(deep: any, hasyxClient: any): Promise<any> {
  // Use existing storage instance if it exists, otherwise create new one
  let storage = deep._context.storage;
  if (!storage) {
    storage = new deep.HasyxDeepStorage();
    deep._context.storage = storage;
  }
  
  // Set client and enable sync
  const state = storage._state;
  state._hasyxClient = hasyxClient;
  state._syncEnabled = true;
  
  // Setup event listeners for real-time sync
  // The listeners are set up in the HasyxDeepStorage constructor
  
  // Queue initial synchronization
  const initPromise = (async () => {
    debugLifecycle('Starting initial synchronization to database');
    
    try {
      await syncAllAssociationsToDatabase(deep, hasyxClient);
      debugLifecycle('Initial synchronization completed successfully');
      return true;
    } catch (error: any) {
      debugLifecycle('Initial synchronization failed: %s', error.message);
      throw error;
    }
  })();
  
  storage.promise = initPromise;
  return initPromise;
}