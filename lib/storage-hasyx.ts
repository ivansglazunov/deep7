// Phase 4: HasyxDeepStorage Implementation
// Provides automatic database synchronization between Deep Framework and Hasura
import Debug from './debug';
import { newDeep } from './index';

// Debug categories for different aspects of the system
const debugLifecycle = Debug('hasyx:lifecycle');
const debugEvent = Debug('hasyx:event');
const debugSync = Debug('hasyx:sync');
const debugDatabase = Debug('hasyx:database');
const debugRecursion = Debug('hasyx:recursion'); // Новый отладчик для рекурсии

// Create debug functions for different operations
const debugNewHasyx = Debug('storage:newHasyx');

// Счетчик для уникальных ID вызовов
let callCounter = 0;

// Функция для генерации уникального ID вызова
function generateCallId(): string {
  return `call_${++callCounter}`;
}

// Функция для получения стека вызовов
function getCallStack(): string {
  const stack = new Error().stack || '';
  return stack.split('\n').slice(2, 6).map(line => line.trim()).join(' -> ');
}

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
      state._eventDisposers = []; // Initialize event disposers array
      
      // Store reference for global access
      if (!globalStorageInstance) {
        globalStorageInstance = this;
        debugLifecycle('HasyxDeepStorage singleton initialized (event listeners will be enabled after initial sync)');
      }
      
    } else if (this._reason == deep.reasons.destruction._id) {
      debugLifecycle('HasyxDeepStorage instance destroyed: %s', this._id);
      
      // Clean up event listeners
      const state = this._state;
      if (state._eventDisposers) {
        state._eventDisposers.forEach((disposer: any) => {
          if (typeof disposer === 'function') disposer();
        });
        state._eventDisposers = [];
      }
      
      if (globalStorageInstance === this) {
        globalStorageInstance = null;
      }
    }
  });

  // Add setupGlobalSyncListeners as a method on HasyxDeepStorage
  HasyxDeepStorage._context._setupGlobalSyncListeners = new deep.Method(function(this: any, enabled: boolean = true) {
    setupGlobalSyncListeners(this, enabled);
  });

  // Setup global event listeners for real-time synchronization
  function setupGlobalSyncListeners(storageInstance: any, enabled: boolean = true) {
    const state = storageInstance._state;
    
    if (!enabled) {
      // Disable listeners
      debugSync('Disabling sync listeners');
      if (storageInstance._state._storeAddedDisposer) {
        storageInstance._state._storeAddedDisposer();
        storageInstance._state._storeAddedDisposer = null;
      }
      return;
    }
    
    // Ensure _eventDisposers is initialized
    if (!storageInstance._state._eventDisposers) {
      storageInstance._state._eventDisposers = [];
      debugSync('Initialized _eventDisposers array for storage instance');
    }
    
    // Record the time when events are enabled to avoid processing old associations
    const eventsEnabledTime = Date.now();
    state._eventsEnabledTime = eventsEnabledTime;
    debugSync('Events enabled at timestamp: %d', eventsEnabledTime);
    
    // NOTE: We do NOT listen to globalConstructed events!
    // Associations without type are not meaningful and should not be synced.
    // We only sync when associations get a type (become meaningful) via globalLinkChanged.
    
    // Register storeAdded handler
    if (deep.events && deep.events.storeAdded) {
      debugSync('Registering storeAdded handler for event: %s', deep.events.storeAdded._id);
      const disposer1 = deep.on(deep.events.storeAdded._id, (payload: any) => {
        // Only process storage events after events were enabled
        if (payload.timestamp && payload.timestamp >= eventsEnabledTime) {
          handleStoreAdded(storageInstance, payload);
        } else {
          debugSync('Skipping old storage event for %s (created before events enabled)', payload._source);
        }
      });
      state._storeAddedDisposer = disposer1;
      debugSync('storeAdded handler registered');
    } else {
      debugSync('deep.events.storeAdded not found!');
    }
    
    // Listen for link changes (when associations become meaningful)
    if (deep.events.globalLinkChanged) {
      const disposer2 = deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        // Only process link changes after events were enabled
        if (payload.timestamp && payload.timestamp >= eventsEnabledTime) {
          handleGlobalLinkChanged(storageInstance, payload);
        } else {
          debugSync('Skipping old link change for %s (created before events enabled)', payload._id);
        }
      });
      state._eventDisposers.push(disposer2);
    }
    
    // Listen for data changes
    if (deep.events.globalDataChanged) {
      const disposer3 = deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        // Only process data changes after events were enabled
        if (payload.timestamp && payload.timestamp >= eventsEnabledTime) {
          handleGlobalDataChanged(storageInstance, payload);
        } else {
          debugSync('Skipping old data change for %s (created before events enabled)', payload._id);
        }
      });
      state._eventDisposers.push(disposer3);
    }
    
    // Listen for association destruction
    if (deep.events.globalDestroyed) {
      const disposer4 = deep.on(deep.events.globalDestroyed._id, (payload: any) => {
        // Only process destruction events after events were enabled
        if (payload.timestamp && payload.timestamp >= eventsEnabledTime) {
          handleGlobalDestroyed(storageInstance, payload);
        } else {
          debugSync('Skipping old destruction event for %s (created before events enabled)', payload._id);
        }
      });
      state._eventDisposers.push(disposer4);
    }
    
    debugLifecycle('Global sync listeners enabled with %d disposers', state._eventDisposers.length);
  }

  // Add operation to promise chain and update storage.promise
  function queueOperation(storageInstance: any, operation: () => Promise<any>) {
    const state = storageInstance._state;
    
    debugSync('🔄 Queueing operation in promise chain');
    
    // КРИТИЧНО: Используем новую promise архитектуру - добавляем операцию в chain
    // Получаем текущий promise или создаем resolved
    const currentPromise = storageInstance.promise || Promise.resolve();
    
    // Создаем новый promise в chain
    const newPromise = currentPromise.then(async () => {
      debugSync('🚀 Executing queued operation');
      try {
        const result = await operation();
        debugSync('✅ Operation completed successfully');
        return result;
      } catch (error: any) {
        debugSync('💥 Operation failed: %s', error.message);
        // Продолжаем chain даже при ошибках
        return undefined;
      }
    });
    
    // Обновляем promise в storage
    storageInstance.promise = newPromise;
    
    debugSync('✅ Operation queued in promise chain');
    return newPromise;
  }

  // Handle storage marker added - sync association to database
  async function handleStoreAdded(storageInstance: any, payload: any) {
    // ВАЖНО: Используем deep.storage вместо переданного storageInstance
    // потому что события глобальные, но нам нужен конкретный инициализированный экземпляр
    const actualStorage = deep.storage;
    const state = actualStorage._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      debugSync('Sync disabled or no client, skipping handleStoreAdded');
      return;
    }
    
    debugSync('🏷️ handleStoreAdded: association=%s storageId=%s markerId=%s', 
      payload._source, payload.storageId, payload.markerId);
    
    const associationId = payload._source;
    const storageId = payload.storageId;
    
    // Only handle events for our storage instance
    if (storageId !== deep.storage._id) {
      debugSync('Event for different storage instance, skipping');
      return;
    }
    
    debugSync('🎯 Association %s marked for our storage, proceeding with sync', associationId);
    
    // Queue the sync operation
    return queueOperation(actualStorage, async () => {
      debugSync('🔄 Executing sync operation for newly stored association %s', associationId);
      try {
        const hasyxClient = state._hasyxClient;
        
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
          
          // Insert association directly (dependencies already validated by storages.ts)
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
          debugSync('Association %s already exists in database, no action needed', associationId);
          return null;
        }
      } catch (error: any) {
        debugDatabase('Error syncing newly stored association to database: %s', error.message);
        throw error;
      }
    });
  }

  // Handle link changes (_type, _from, _to, _value) - this is when associations become meaningful
  async function handleGlobalLinkChanged(storageInstance: any, payload: any) {
    // ВАЖНО: Используем deep.storage вместо переданного storageInstance
    const actualStorage = deep.storage;
    const state = actualStorage._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      debugSync('Sync disabled or no client, skipping handleGlobalLinkChanged');
      return;
    }
    
    debugSync('🔗 handleGlobalLinkChanged: %s field=%s before=%s after=%s', 
      payload._id, payload.field, payload.before, payload.after);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // КРИТИЧЕСКИ ВАЖНО: Проверяем, что ассоциация существует в памяти
    if (!deep._ids.has(associationId)) {
      debugSync('Association %s not found in memory, skipping', associationId);
      return;
    }
    
    // Get association safely (it already exists, so no new creation)
    const association = new deep(associationId);
    
    // Check if this association should be stored in database
    if (!association.isStored(deep.storage)) {
      debugSync('Association %s not marked for database storage, skipping sync', associationId);
      return;
    }
    
    // ВАЖНО: Ассоциации без типа не являются значимыми
    // Синхронизируем только когда ассоциация имеет тип (стала значимой)
    const currentType = association._type;
    if (!currentType || currentType === deep._id) {
      debugSync('Association %s has no meaningful type (type=%s), skipping sync', associationId, currentType);
      return;
    }
    
    debugSync('🎯 Association %s is meaningful and marked for storage, proceeding with sync', associationId);
    
    // Queue the sync operation
    return queueOperation(actualStorage, async () => {
      debugSync('🔄 Executing sync operation for association %s', associationId);
      try {
        // Check if this association already exists in database
        const exists = await checkAssociationExists(hasyxClient, associationId);
        debugSync('Association %s exists in database: %s', associationId, exists);
        
        if (!exists) {
          // Create new association in database
          debugDatabase('Creating new meaningful association in database: %s', associationId);
          
          // Get current state of the association
          const associationData = {
            _id: associationId,
            _i: deep._getSequenceNumber(associationId),
            _type: deep._Type.one(associationId) || null,
            _from: deep._From.one(associationId) || null,
            _to: deep._To.one(associationId) || null,
            _value: deep._Value.one(associationId) || null,
            _created_at: deep._created_ats.get(associationId) || new Date().valueOf(),
            _updated_at: deep._updated_ats.get(associationId) || new Date().valueOf()
          };
          
          debugDatabase('Association state: %o', associationData);
          
          // Insert association directly (dependencies already validated by storages.ts)
          const insertResult = await hasyxClient.insert({
            table: 'deep_links',
            object: {
              id: associationId,
              _deep: deep._id,
              _i: associationData._i,
              _type: associationData._type,
              _from: associationData._from,
              _to: associationData._to,
              _value: associationData._value,
              created_at: associationData._created_at,
              updated_at: associationData._updated_at
            },
            returning: ['id']
          });
          
          debugDatabase('Meaningful association created in database: %s', insertResult.id);
          
          // Handle typed data if present
          const data = deep._getData(associationId);
          if (data !== undefined) {
            await syncTypedDataToDatabase(hasyxClient, associationId, associationData._type, data);
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

  // Handle data changes
  async function handleGlobalDataChanged(storageInstance: any, payload: any) {
    // ВАЖНО: Используем deep.storage вместо переданного storageInstance
    const actualStorage = deep.storage;
    const state = actualStorage._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      debugSync('Sync disabled or no client, skipping handleGlobalDataChanged');
      return;
    }

    debugSync('handleGlobalDataChanged: %o', payload);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // Check if this association should be stored in database
    const association = new deep(associationId);
    
    if (!association.isStored(deep.storage)) {
      debugSync('Association %s not marked for database storage, skipping data sync', associationId);
      return;
    }
    
    debugSync('Association %s is marked for database storage, proceeding with data sync', associationId);
    
    // Queue the sync operation
    return queueOperation(actualStorage, async () => {
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
    // ВАЖНО: Используем deep.storage вместо переданного storageInstance
    const actualStorage = deep.storage;
    const state = actualStorage._state;
    
    if (!state._syncEnabled || !state._hasyxClient) {
      debugSync('Sync disabled or no client, skipping handleGlobalDestroyed');
      return;
    }

    debugSync('handleGlobalDestroyed: %o', payload);
    
    const associationId = payload._id;
    const hasyxClient = state._hasyxClient;
    
    // Check if this association was stored in database
    // Note: We can't check isStored() here because the association is already destroyed
    // Instead, we'll try to delete from database and let it fail silently if not found
    debugSync('Association %s destroyed, attempting database cleanup', associationId);
    
    // Queue the sync operation
    return queueOperation(actualStorage, async () => {
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

  // Return only the HasyxDeepStorage class - no internal functions should be exposed
  return { HasyxDeepStorage };
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
    if (assoc._type) association.__type = assoc._type;
    if (assoc._from) association.__from = assoc._from;
    if (assoc._to) association.__to = assoc._to;
    if (assoc._value) association.__value = assoc._value;
    
    // Restore timestamps (they are already numbers in database)
    association._created_at = assoc.created_at;
    association._updated_at = assoc.updated_at;
    
    // Restore typed data if present
    if (assoc.deep_strings && assoc.deep_strings._data !== undefined) {
      association.__data = assoc.deep_strings._data;
    }
    if (assoc.deep_numbers && assoc.deep_numbers._data !== undefined) {
      association.__data = assoc.deep_numbers._data;
    }
    if (assoc.deep_functions && assoc.deep_functions._data !== undefined) {
      association.__data = assoc.deep_functions._data;
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
  
  // IMPORTANT: Preserve existing storage markers if deep.storage already exists
  const existingStorage = deep._context.storage;
  if (existingStorage && existingStorage._id) {
    // Copy all storage markers from existing storage to new storage
    const allStorageMarkers = deep._getAllStorageMarkers();
    for (const [associationId, storageMap] of allStorageMarkers) {
      const markersForExistingStorage = storageMap.get(existingStorage._id);
      if (markersForExistingStorage) {
        for (const markerId of markersForExistingStorage) {
          deep._setStorageMarker(associationId, storage._id, markerId);
        }
      }
    }
    debugNewHasyx(`[newHasyxDeep] Transferred storage markers from existing storage to new HasyxDeepStorage`);
  }
  
  deep._context.storage = storage;
  
  // === STORAGE MARKERS SETUP ===
  // Set up storage markers for database synchronization
  
  // Mark the root deep instance as oneTrue (only itself, not instances)
  deep.store(deep.storage, deep.storageMarkers.oneTrue);
  
  // Mark all typed associations as typedTrue - their instances will sync automatically
  if (deep._typed && deep._typed.size > 0) {
    for (const typedId of deep._typed) {
      const typedAssociation = new deep(typedId);
      typedAssociation.store(deep.storage, deep.storageMarkers.typedTrue);
    }
    debugNewHasyx(`[newHasyxDeep] Marked ${deep._typed.size} typed associations as typedTrue`);
  } else {
    // Fallback to manual marking if _typed is not available
    deep.Function.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Field.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Method.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Alive.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.String.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Number.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Set.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.detect.store(deep.storage, deep.storageMarkers.typedTrue);
    
    // Mark system types as typedTrue
    deep.Event.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Reason.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.Storage.store(deep.storage, deep.storageMarkers.typedTrue);
    deep.StorageMarker.store(deep.storage, deep.storageMarkers.typedTrue);
    debugNewHasyx(`[newHasyxDeep] Manually marked core types as typedTrue (fallback)`);
  }
  
  debugNewHasyx(`[newHasyxDeep] Storage markers configured for database synchronization`);
  
  // If we have a dump, restore associations from it
  if (dump && !existingDeep) {
    debugNewHasyx(`[newHasyxDeep] Restoring ${dump.length} associations from dump`);
    
    for (const item of dump) {
      const association = new deep(item.id);
      
      // Restore basic association properties
      if (item._type !== undefined && item._type !== null) association.__type = item._type;
      if (item._from !== undefined && item._from !== null) association.__from = item._from;
      if (item._to !== undefined && item._to !== null) association.__to = item._to;
      if (item._value !== undefined && item._value !== null) association.__value = item._value;
      
      // Restore typed data
      if (item.string?.value !== undefined) {
        association.__data = item.string.value;
      } else if (item.number?.value !== undefined) {
        association.__data = item.number.value;
      } else if (item.function?.value !== undefined) {
        // For functions, create a simple wrapper that preserves the serialized code
        // This avoids eval issues while maintaining function identity
        const functionCode = item.function.value;
        const restoredFunction = function restoredFunction() {
          // This is a restored function from database
          // Original code: ${functionCode}
          return functionCode;
        };
        // Store original code for reference
        restoredFunction._originalCode = functionCode;
        association.__data = restoredFunction;
      }
    }
    
    // For restored spaces from dump, set resolved promise immediately (no sync needed)
    storage.promise = Promise.resolve(true);
    debugNewHasyx(`[newHasyxDeep] Deep space restored from dump, no sync needed`);
    
    // Set up client but disable initial sync for restored spaces
    const state = storage._state;
    state._hasyxClient = hasyxClient;
    state._syncEnabled = true; // Enable sync for future changes
    
    // Auto-enable event listeners after initial sync
    debugSync('Initial sync completed, auto-enabling event listeners');
    storage._setupGlobalSyncListeners(true);
  } else {
    // Initialize storage with sync directly
    let storage = deep._context.storage;
    if (!storage) {
      storage = new deep.HasyxDeepStorage();
      deep._context.storage = storage;
    }
    
    // Set client and enable sync directly
    const state = storage._state;
    state._hasyxClient = hasyxClient;
    state._syncEnabled = true;
    
    // Initialize tracked associations if not already done
    if (!state._trackedAssociations) {
      state._trackedAssociations = new Set();
    }
    
    debugLifecycle('HasyxDeepStorage initialized with Hasyx client');
    
    // Create and set initial synchronization promise
    const initPromise = (async () => {
      debugLifecycle('Starting initial synchronization to database');
      
      try {
        await syncAllAssociationsToDatabase(deep, hasyxClient);
        debugLifecycle('Initial synchronization completed successfully');
        
        // Auto-enable event listeners after initial sync
        debugSync('Initial sync completed, auto-enabling event listeners');
        storage._setupGlobalSyncListeners(true);
        
        return true;
      } catch (error: any) {
        debugLifecycle('Initial synchronization failed:', error);
        throw error;
      }
    })();
    
    storage.promise = initPromise;
    state._currentPromise = initPromise;
    
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

  // Initialize Hasyx storage for this Deep space directly
  let storage = deep._context.storage;
  if (!storage) {
    storage = new deep.HasyxDeepStorage();
    deep._context.storage = storage;
  }
  
  // Set client and enable sync directly
  const state = storage._state;
  state._hasyxClient = hasyxClient;
  state._syncEnabled = true;
  
  // Initialize tracked associations if not already done
  if (!state._trackedAssociations) {
    state._trackedAssociations = new Set();
  }
  
  debugLifecycle('HasyxDeepStorage initialized with Hasyx client');
  
  // Create and set initial synchronization promise
  const initPromise = (async () => {
    debugLifecycle('Starting initial synchronization to database');
    
    try {
      await syncAllAssociationsToDatabase(deep, hasyxClient);
      debugLifecycle('Initial synchronization completed successfully');
      
      // Auto-enable event listeners after initial sync
      debugSync('Initial sync completed, auto-enabling event listeners');
      storage._setupGlobalSyncListeners(true);
      
      return true;
    } catch (error: any) {
      debugLifecycle('Initial synchronization failed:', error);
      throw error;
    }
  })();
  
  storage.promise = initPromise;
  state._currentPromise = initPromise;
  
  return deep;
}

/**
 * Synchronize all associations in Deep space to database using topological sorting
 * @param deep - Deep instance containing associations
 * @param hasyxClient - Hasyx client instance
 */
async function syncAllAssociationsToDatabase(deep: any, hasyxClient: any) {
  const spaceId = deep._id;
  debugNewHasyx(`[syncAll] Starting sync for space ${spaceId}`);
  
  // Get all associations marked for storage in this Deep space
  const markedAssociations: string[] = [];
  const allStorageMarkers = deep._getAllStorageMarkers();
  
  for (const [associationId, storageMap] of allStorageMarkers) {
    // Check if this association is marked for the default storage
    if (storageMap.has(deep.storage._id)) {
      markedAssociations.push(associationId);
    }
  }
  
  debugNewHasyx(`[syncAll] Found ${markedAssociations.length} associations marked for storage`);
  
  if (markedAssociations.length === 0) {
    debugNewHasyx(`[syncAll] No associations to sync`);
    return true;
  }
  
  // Sort associations topologically to ensure dependencies are created first
  // (only among the marked associations)
  const sortedAssociations = topologicalSort(markedAssociations, deep);
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < sortedAssociations.length; i += batchSize) {
    const batch = sortedAssociations.slice(i, i + batchSize);
    await syncAssociationBatch(deep, hasyxClient, batch, `batch-${Math.floor(i / batchSize) + 1}`);
  }
  
  debugNewHasyx(`[syncAll] Sync completed for space ${spaceId}`);
  return true;
}

/**
 * Topologically sort associations to ensure dependencies are created first
 */
function topologicalSort(associationIds: string[], deep: any): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  
  debugNewHasyx(`[topSort] Starting topological sort for ${associationIds.length} associations`);
  
  // Log all associations and their dependencies first
  for (const id of associationIds) {
    const association = new deep(id);
    const deps = [association._type, association._from, association._to, association._value]
      .filter(depId => depId && typeof depId === 'string');
    const depsInSet = deps.filter(depId => associationIds.includes(depId));
    
    debugNewHasyx(`[topSort] Association ${id}: deps=[${deps.join(', ')}] depsInSet=[${depsInSet.join(', ')}]`);
  }
  
  function visit(id: string) {
    if (visited.has(id)) {
      debugNewHasyx(`[topSort] Already visited ${id}, skipping`);
      return;
    }
    if (visiting.has(id)) {
      // Circular dependency detected - add to result anyway
      debugNewHasyx(`[topSort] ⚠️ Circular dependency detected for ${id}, adding anyway`);
      return;
    }
    
    debugNewHasyx(`[topSort] Visiting ${id}`);
    visiting.add(id);
    
    // Visit dependencies first
    const association = new deep(id);
    const dependencies = [association._type, association._from, association._to, association._value]
      .filter(depId => depId && typeof depId === 'string' && associationIds.includes(depId));
    
    debugNewHasyx(`[topSort] ${id} has dependencies: [${dependencies.join(', ')}]`);
    
    for (const depId of dependencies) {
      debugNewHasyx(`[topSort] ${id} depends on ${depId}, visiting dependency first`);
      visit(depId);
    }
    
    visiting.delete(id);
    visited.add(id);
    result.push(id);
    debugNewHasyx(`[topSort] ✅ Added ${id} to result (position ${result.length})`);
  }
  
  // Visit all associations
  for (const id of associationIds) {
    debugNewHasyx(`[topSort] Processing root association ${id}`);
    visit(id);
  }
  
  debugNewHasyx(`[topSort] Final sorted order: [${result.join(', ')}]`);
  return result;
}

async function syncAssociationBatch(deep: any, hasyxClient: any, associationIds: string[], batchType: string) {
  if (associationIds.length === 0) return;
  
  const spaceId = deep._id;
  debugNewHasyx(`[syncBatch] Processing ${batchType} batch: ${associationIds.length} associations`);
  
  const linksToInsert: any[] = [];
  const stringsToInsert: any[] = [];
  const numbersToInsert: any[] = [];
  const functionsToInsert: any[] = [];
  
  // Process associations in this batch
  for (const id of associationIds) {
    const association = new deep(id);
    
    debugNewHasyx(`[syncBatch] Processing association ${id}:`);
    debugNewHasyx(`[syncBatch]   _type: ${association._type}`);
    debugNewHasyx(`[syncBatch]   _from: ${association._from}`);
    debugNewHasyx(`[syncBatch]   _to: ${association._to}`);
    debugNewHasyx(`[syncBatch]   _value: ${association._value}`);
    
    // Check if dependencies exist in the current batch or are already in database
    const dependencies = [association._type, association._from, association._to, association._value]
      .filter(depId => depId && typeof depId === 'string');
    
    // Simply sync all marked associations (dependencies already validated by storages.ts)
    debugNewHasyx(`[syncBatch]   association ${id}: syncing (dependencies validated by storages.ts)`);
    
    // Add to batch for insertion
    linksToInsert.push({
      id: id,
      _deep: spaceId,
      _i: association._i,
      _type: association._type,
      _from: association._from,
      _to: association._to,
      _value: association._value,
      created_at: association._created_at,
      updated_at: association._updated_at
    });
  }
  
  debugNewHasyx(`[syncBatch] ${batchType}: ${linksToInsert.length} links, ${stringsToInsert.length} strings, ${numbersToInsert.length} numbers, ${functionsToInsert.length} functions`);
  
  // Insert links first (this satisfies foreign key constraints for typed data)
  if (linksToInsert.length > 0) {
    debugNewHasyx(`[syncBatch] ${batchType}: Inserting ${linksToInsert.length} links...`);
    
    // Log each link being inserted for debugging
    for (const link of linksToInsert) {
      debugNewHasyx(`[syncBatch] Inserting link: ${link.id} (type=${link._type}, from=${link._from}, to=${link._to}, value=${link._value})`);
    }
    
    try {
      await hasyxClient.insert({
        table: 'deep_links',
        objects: linksToInsert,
        on_conflict: {
          constraint: 'links_pkey',
          update_columns: ['_type', '_from', '_to', '_value', 'updated_at']
        }
      });
      debugNewHasyx(`[syncBatch] ${batchType}: ✅ Links inserted successfully`);
    } catch (error: any) {
      debugNewHasyx(`[syncBatch] ${batchType}: ❌ Error inserting links: ${error.message}`);
      
      // Log details about the failed batch
      debugNewHasyx(`[syncBatch] Failed batch details:`);
      for (const link of linksToInsert) {
        debugNewHasyx(`[syncBatch]   Link ${link.id}:`);
        debugNewHasyx(`[syncBatch]     _type: ${link._type} (exists in memory: ${link._type ? deep._ids.has(link._type) : 'N/A'})`);
        debugNewHasyx(`[syncBatch]     _from: ${link._from} (exists in memory: ${link._from ? deep._ids.has(link._from) : 'N/A'})`);
        debugNewHasyx(`[syncBatch]     _to: ${link._to} (exists in memory: ${link._to ? deep._ids.has(link._to) : 'N/A'})`);
        debugNewHasyx(`[syncBatch]     _value: ${link._value} (exists in memory: ${link._value ? deep._ids.has(link._value) : 'N/A'})`);
      }
      
      throw error;
    }
  }
  
  // Now insert typed data (links already exist, so foreign keys are satisfied)
  if (stringsToInsert.length > 0) {
    debugNewHasyx(`[syncBatch] ${batchType}: Inserting ${stringsToInsert.length} strings...`);
    await hasyxClient.insert({
      table: 'deep_strings',
      objects: stringsToInsert,
      on_conflict: {
        constraint: 'strings_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncBatch] ${batchType}: Strings inserted`);
  }
  
  if (numbersToInsert.length > 0) {
    debugNewHasyx(`[syncBatch] ${batchType}: Inserting ${numbersToInsert.length} numbers...`);
    await hasyxClient.insert({
      table: 'deep_numbers',
      objects: numbersToInsert,
      on_conflict: {
        constraint: 'numbers_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncBatch] ${batchType}: Numbers inserted`);
  }
  
  if (functionsToInsert.length > 0) {
    debugNewHasyx(`[syncBatch] ${batchType}: Inserting ${functionsToInsert.length} functions...`);
    await hasyxClient.insert({
      table: 'deep_functions',
      objects: functionsToInsert,
      on_conflict: {
        constraint: 'functions_pkey',
        update_columns: ['_data']
      }
    });
    debugNewHasyx(`[syncBatch] ${batchType}: Functions inserted`);
  }
}
