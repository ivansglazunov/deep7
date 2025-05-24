// Phase 4: HasyxDeepStorage Implementation
// Provides automatic database synchronization between Deep Framework and Hasura
import Debug from './debug';

// Debug categories for different aspects of the system
const debugLifecycle = Debug('hasyx:lifecycle');
const debugEvent = Debug('hasyx:event');
const debugSync = Debug('hasyx:sync');
const debugDatabase = Debug('hasyx:database');

/**
 * Creates HasyxDeepStorage class for strict database synchronization
 * Uses only high-level Deep Framework concepts: Alive, Field, Method, Event
 * No low-level _Deep internals or direct Map/Set manipulation
 */
export function newHasyxDeepStorage(deep: any) {
  debugLifecycle('Creating HasyxDeepStorage class');

  // Create singleton instance for shared state using high-level API
  const HasyxStorageInstance = new deep();
  
  // Initialize shared state using Field-based approach
  HasyxStorageInstance._context._initialized = new deep.Field(function(this: any) {
    const state = this._getState(HasyxStorageInstance._id);
    if (this._reason == deep.reasons.getter._id) {
      return state._initialized || false;
    } else if (this._reason == deep.reasons.setter._id) {
      state._initialized = arguments[1];
      return true;
    }
  });
  
  HasyxStorageInstance._context._isActive = new deep.Field(function(this: any) {
    const state = this._getState(HasyxStorageInstance._id);
    if (this._reason == deep.reasons.getter._id) {
      return state._isActive || false;
    } else if (this._reason == deep.reasons.setter._id) {
      state._isActive = arguments[1];
      return true;
    }
  });
  
  HasyxStorageInstance._context._hasyxClient = new deep.Field(function(this: any) {
    const state = this._getState(HasyxStorageInstance._id);
    if (this._reason == deep.reasons.getter._id) {
      return state._hasyxClient || null;
    } else if (this._reason == deep.reasons.setter._id) {
      state._hasyxClient = arguments[1];
      return true;
    }
  });
  
  // Use deep.Set for tracking instead of native Set (high-level API)
  HasyxStorageInstance._context._trackedAssociations = new deep.Set(new Set());
  
  // Promise tracking for association-level and storage-level completion
  HasyxStorageInstance._context._activePromises = new deep.Set(new Set());
  HasyxStorageInstance._context._storagePromise = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      // Return current global promise that resolves when all sync operations complete
      const activePromises = Array.from(this._activePromises._data);
      if (activePromises.length === 0) {
        return Promise.resolve();
      }
      return Promise.all(activePromises);
    }
  });

  // Global storage listener setup using high-level event API
  function setupGlobalStorageListener() {
    // Use high-level .on() instead of low-level ._on()
    deep.on(deep.events.storeAdded, (payload: any) => {
      debugSync('Global storeAdded event received: %o', payload);
      
      if (!HasyxStorageInstance._isActive) {
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
    // Use high-level Set API instead of direct manipulation
    if (HasyxStorageInstance._trackedAssociations.has(associationId)) {
      debugSync('Association %s is already being tracked', associationId);
      return;
    }
    
    debugSync('Starting to track association: %s', associationId);
    HasyxStorageInstance._trackedAssociations.add(associationId);
    
    const association = new deep(associationId);
    
    // Set up event listeners using high-level .on() API
    association.on(deep.events.typeSetted, (payload: any) => handleAssociationCreated(payload));
    association.on(deep.events.fromSetted, (payload: any) => handleLinkUpdated(payload));
    association.on(deep.events.toSetted, (payload: any) => handleLinkUpdated(payload));
    association.on(deep.events.valueSetted, (payload: any) => handleLinkUpdated(payload));
    association.on(deep.events.dataSetted, (payload: any) => handleDataUpdated(payload));
    
    debugSync('Event listeners set up for association: %s', associationId);
  }

  async function handleAssociationCreated(payload: any) {
    debugSync('handleAssociationCreated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._hasyxClient;
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
    
    // Set promise using existing promise system
    association.promise = syncOperation;
    
    return syncOperation;
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

  async function handleLinkUpdated(payload: any) {
    debugSync('handleLinkUpdated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available');
      return;
    }
    
    const associationId = payload._source;
    const association = new deep(associationId);
    
    debugSync('Processing link update for: %s', associationId);
    
    // Create update operation using existing promise system
    const updateOperation = (async () => {
      // Check if association exists in database
      const exists = await checkAssociationExists(hasyxClient, associationId);
      if (!exists) {
        debugSync('Association %s does not exist in database, cannot update', associationId);
        throw new Error(`Association ${associationId} must exist in database before updating`);
      }
      
      // Update link in database
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
      
      debugSync('Link updated in database: %s', updateResult[0]?.id);
      
      // Emit completion event
      deep._emit(deep.events.dbLinkUpdated._id, payload);
      
      return updateResult;
    })();
    
    // Set promise using existing promise system
    association.promise = updateOperation;
    
    return updateOperation;
  }

  async function handleDataUpdated(payload: any) {
    debugSync('handleDataUpdated called with payload: %o', payload);
    
    const hasyxClient = HasyxStorageInstance._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available');
      return;
    }
    
    const associationId = payload._source;
    const association = new deep(associationId);
    
    debugSync('Processing data update for: %s', associationId);
    
    // Create data update operation using existing promise system
    const dataUpdateOperation = (async () => {
      if (!association._type) {
        debugSync('Association %s has no type, skipping data update', associationId);
        return;
      }
      
      // Determine data table and update typed data
      let tableName: string | undefined;
      if (association._type === deep.String._id) {
        tableName = 'deep_strings';
      } else if (association._type === deep.Number._id) {
        tableName = 'deep_numbers';
      } else if (association._type === deep.Function._id) {
        tableName = 'deep_functions';
      }
      
      if (tableName) {
        const updateResult = await hasyxClient.update({
          table: tableName,
          where: { id: { _eq: associationId } },
          _set: { _data: association._data },
          returning: ['id']
        });
        
        debugSync('Data updated in %s: %s', tableName, updateResult[0]?.id);
      }
      
      // Emit completion event
      deep._emit(deep.events.dbDataUpdated._id, payload);
      
      return true;
    })();
    
    // Set promise using existing promise system
    association.promise = dataUpdateOperation;
    
    return dataUpdateOperation;
  }

  const HasyxDeepStorage = new deep.Alive(function(this: any) {
    if (this._reason == deep.reasons.construction._id) {
      debugLifecycle('HasyxDeepStorage instance constructed: %s', this._id);
      
      // Initialize singleton state using Field setters
      if (HasyxStorageInstance._initialized === undefined) {
        HasyxStorageInstance._initialized = false;
      }
      if (HasyxStorageInstance._isActive === undefined) {
        HasyxStorageInstance._isActive = false;
      }
      if (HasyxStorageInstance._hasyxClient === undefined) {
        HasyxStorageInstance._hasyxClient = null;
      }
      
    } else if (this._reason == deep.reasons.destruction._id) {
      debugLifecycle('HasyxDeepStorage instance destroyed: %s', this._id);
      
      // Use Field setters for cleanup
      HasyxStorageInstance._isActive = false;
      HasyxStorageInstance._hasyxClient = null;
    }
  });

  // Initialize method using existing promise system
  HasyxDeepStorage._context.initialize = new deep.Method(function(this: any, options: { hasyxClient: any }) {
    debugLifecycle('Initializing HasyxDeepStorage with options: %o', options);
    
    if (!options.hasyxClient) {
      throw new Error('hasyxClient is required for initialization');
    }
    
    const initOperation = (async () => {
      // Validate hasyx client
      if (typeof options.hasyxClient.select !== 'function' || 
          typeof options.hasyxClient.insert !== 'function') {
        throw new Error('Invalid hasyxClient: missing required methods (select, insert, update, delete)');
      }
      
      // Set client and state using Field setters
      HasyxStorageInstance._hasyxClient = options.hasyxClient;
      HasyxStorageInstance._isActive = true;
      HasyxStorageInstance._initialized = true;
      
      // Setup event listeners
      setupGlobalStorageListener();
      
      // Process existing database storages  
      await processExistingDatabaseStorages();
      
      debugLifecycle('HasyxDeepStorage successfully initialized');
      
      return true;
    })();
    
    // Set promise on storage instance using existing promise system
    this.promise = initOperation;
    
    return initOperation;
  });

  // Storage promise - tracks global synchronization status
  HasyxDeepStorage._context.promise = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      // Return existing promise or create resolved promise by default
      if (!this._state._globalPromise) {
        this._state._globalPromise = Promise.resolve(true);
      }
      return this._state._globalPromise;
    } else if (this._reason == deep.reasons.setter._id) {
      const promiseToSet = arguments[1];
      
      // Collect all promises and wait for all to complete
      if (!this._state._allGlobalPromises) {
        this._state._allGlobalPromises = [];
      }
      
      let newPromise: Promise<any>;
      
      if (promiseToSet && typeof promiseToSet.then === 'function') {
        // Add the new promise to the collection
        this._state._allGlobalPromises.push(promiseToSet);
        
        // Create a promise that waits for all promises to complete
        newPromise = Promise.all(this._state._allGlobalPromises).then(results => {
          // Return the result of the last promise
          return results[results.length - 1];
        });
      } else {
        // If not a promise, create resolved promise with the value
        const resolvedPromise = Promise.resolve(promiseToSet);
        this._state._allGlobalPromises.push(resolvedPromise);
        newPromise = Promise.all(this._state._allGlobalPromises).then(results => {
          return results[results.length - 1];
        });
      }
      
      // Store the combined promise
      this._state._globalPromise = newPromise;
      
      // Add error handling to prevent unhandled rejections
      newPromise.catch((error) => {
        // Silent error handling to prevent unhandled rejections
      });
      
      return true; // Must return true for proxy setter
    } else if (this._reason == deep.reasons.deleter._id) {
      // Clear the promise and all promise collection
      delete this._state._globalPromise;
      delete this._state._allGlobalPromises;
      return true;
    }
  });

  // Add accessor fields that delegate to singleton
  HasyxDeepStorage._context._initialized = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      return HasyxStorageInstance._initialized;
    }
  });
  
  HasyxDeepStorage._context._isActive = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      return HasyxStorageInstance._isActive;
    }
  });
  
  HasyxDeepStorage._context._hasyxClient = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      return HasyxStorageInstance._hasyxClient;
    }
  });

  // Method to track global promise completion
  HasyxDeepStorage._context._updateGlobalPromise = new deep.Method(function(this: any, newPromise: Promise<any>) {
    const previousPromise = this._state._globalPromise || Promise.resolve();
    
    // Chain new promise after previous one
    this._state._globalPromise = previousPromise.then(() => newPromise);
    
    return this._state._globalPromise;
  });

  return HasyxDeepStorage;
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
  const { newDeep } = require('./index');
  
  // Load all associations from this Deep space
  const associations = await hasyxClient.select({
    table: 'deep_links',
    where: { _deep: { _eq: deepSpaceId } },
    returning: ['id', '_i', '_type', '_from', '_to', '_value', 'created_at', 'updated_at'],
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
  
  // Restore associations with their relationships
  for (const assoc of associations) {
    const association = new deep(assoc.id);
    
    // Restore relationships
    if (assoc._type) association._type = assoc._type;
    if (assoc._from) association._from = assoc._from;
    if (assoc._to) association._to = assoc._to;
    if (assoc._value) association._value = assoc._value;
    
    // Restore timestamps
    association._created_at = new Date(assoc.created_at).valueOf();
    association._updated_at = new Date(assoc.updated_at).valueOf();
  }
  
  // Load typed data for associations with types
  await loadTypedData(hasyxClient, deep, associations);
  
  return deep;
}

/**
 * Load typed data for associations from strings, numbers, functions tables
 */
async function loadTypedData(hasyxClient: any, deep: any, associations: any[]) {
  const typedAssociations = associations.filter(assoc => assoc._type);
  
  if (typedAssociations.length === 0) return;
  
  // Group by type for efficient loading
  const typeGroups = new Map<string, string[]>();
  
  for (const assoc of typedAssociations) {
    const typeId = assoc._type;
    if (!typeGroups.has(typeId)) {
      typeGroups.set(typeId, []);
    }
    typeGroups.get(typeId)!.push(assoc.id);
  }
  
  // Load data for each type group
  for (const [typeId, associationIds] of typeGroups) {
    let tableName: string | null = null;
    
    if (typeId === deep.String._id) {
      tableName = 'deep_strings';
    } else if (typeId === deep.Number._id) {
      tableName = 'deep_numbers';
    } else if (typeId === deep.Function._id) {
      tableName = 'deep_functions';
    }
    
    if (tableName) {
      const typedData = await hasyxClient.select({
        table: tableName,
        where: { id: { _in: associationIds } },
        returning: ['id', '_data']
      });
      
      // Restore data for each association
      for (const data of typedData) {
        const association = new deep(data.id);
        association._data = data._data;
      }
    }
  }
} 