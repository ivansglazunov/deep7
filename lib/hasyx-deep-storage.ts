// Phase 4: HasyxDeepStorage Implementation
// Provides automatic database synchronization between Deep Framework and Hasura
import Debug from './debug';

// Debug categories for different aspects of the system
const debugLifecycle = Debug('hasyx:lifecycle');
const debugEvent = Debug('hasyx:event');
const debugSync = Debug('hasyx:sync');
const debugDatabase = Debug('hasyx:database');

/**
 * Creates HasyxDeepStorage constructor for automatic database synchronization
 * @param deep The Deep factory instance
 * @returns HasyxDeepStorage constructor
 */
export function newHasyxDeepStorage(deep: any) {
  debugLifecycle('Creating HasyxDeepStorage...');
  
  // Module-level storage for tracking active instances
  const _activeInstances = new Set<any>();
  
  // Helper function for setting up global storage listener
  function setupGlobalStorageListener(instance: any) {
    // Use global state consistently with initialize method
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    
    if (state._globalStorageListener) {
      debugEvent('Global storage listener already setup for %s', instance._id);
      return;
    }
    
    debugEvent('Setting up global storage event listener for %s', instance._id);
    
    // Listen to ALL storeAdded events on the deep instance itself
    // This catches any association.store() calls
    const listener = deep.on(deep.events.storeAdded._id, (payload: any) => {
      console.log('🔧 Storage: Global storeAdded event received:', payload);
      debugEvent('Global storeAdded event received: %o', payload);
      
      if (!state._isActive) {
        console.log('🔧 Storage: Instance not active, ignoring');
        debugEvent('Instance %s not active, ignoring storage event', instance._id);
        return;
      }
      
      const associationId = payload._source || payload._id;
      const storageId = payload.storageId;
      
      console.log('🔧 Storage: Processing - association:', associationId, 'storage:', storageId);
      debugEvent('Processing storage event - association: %s, storage: %s', associationId, storageId);
      
      // Only handle database storage
      if (storageId === 'database') {
        console.log('🔧 Storage: Database storage detected, starting tracking');
        debugSync('Database storage detected for association %s', associationId);
        startTrackingAssociation(instance, associationId);
      } else {
        console.log('🔧 Storage: Non-database storage, ignoring');
        debugEvent('Non-database storage (%s), ignoring', storageId);
      }
    });
    
    state._globalStorageListener = listener;
    debugEvent('Global storage listener setup complete for %s', instance._id);
  }
  
  // Helper function for processing existing database storages
  function processExistingDatabaseStorages(instance: any) {
    debugSync('Processing existing database storages...');
    
    const allStorages = deep._getAllStorageMarkers();
    let processedCount = 0;
    
    for (const [associationId, storageMap] of allStorages) {
      if (storageMap.has('database')) {
        debugSync('Found existing database storage for association %s', associationId);
        // Call helper function directly
        startTrackingAssociation(instance, associationId);
        processedCount++;
      }
    }
    
    debugSync('Processed %d existing database storages', processedCount);
  }
  
  // Helper function for starting tracking of a specific association
  function startTrackingAssociation(instance: any, associationId: string) {
    // Use global state consistently with initialize method
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    
    if (state._trackedAssociations.has(associationId)) {
      debugSync('Association %s already being tracked, skipping', associationId);
      return;
    }
    
    debugSync('Starting to track association %s', associationId);
    
    const association = new deep(associationId);
    const disposers: any[] = [];
    
    // Listen for association lifecycle events
    const typeSettedDisposer = association.on(deep.events.typeSetted._id, async (payload: any) => {
      debugEvent('Type assigned to %s', associationId);
      if (state._isActive) {
        try {
          // Call handler function directly
          await handleAssociationCreated(instance, { _source: associationId });
        } catch (error) {
          console.error('🚨 HasyxDeepStorage: Error handling type assignment:', error);
        }
      }
    });
    disposers.push(typeSettedDisposer);
    
    // Listen for link updates  
    const linkEvents = [
      { event: deep.events.fromSetted._id, handler: 'handleLinkUpdated' },
      { event: deep.events.toSetted._id, handler: 'handleLinkUpdated' },
      { event: deep.events.valueSetted._id, handler: 'handleLinkUpdated' }
    ];
    
    for (const { event, handler } of linkEvents) {
      const disposer = association.on(event, async (payload: any) => {
        if (state._isActive) {
          try {
            // Call handler function directly
            if (handler === 'handleLinkUpdated') {
              await handleLinkUpdated(instance, payload);
            }
          } catch (error) {
            console.error(`🚨 HasyxDeepStorage: Error handling ${event}:`, error);
          }
        }
      });
      disposers.push(disposer);
    }
    
    // Listen for data updates
    const dataSettedDisposer = association.on(deep.events.dataSetted._id, async (payload: any) => {
      if (state._isActive) {
        try {
          // Call handler function directly
          await handleDataUpdated(instance, payload);
        } catch (error) {
          console.error('🚨 HasyxDeepStorage: Error handling data update:', error);
        }
      }
    });
    disposers.push(dataSettedDisposer);
    
    // Store disposers for cleanup
    state._trackedAssociations.set(associationId, disposers);
    debugEvent('Event listeners set up for %s', associationId);
    
    // If association already has a type, trigger creation immediately
    if (association._type) {
      debugSync('Association %s already has type: %s, creating...', associationId, association._type);
      setTimeout(async () => {
        if (state._isActive) {
          try {
            // Call handler function directly
            await handleAssociationCreated(instance, { _source: associationId });
          } catch (error) {
            console.error('🚨 HasyxDeepStorage: Error creating existing association:', error);
          }
        }
      }, 0);
    } else {
      debugSync('Association %s has no type yet, waiting for typeSetted event...', associationId);
    }
  }
  
  // Association creation handler - when new association is registered for tracking
  async function handleAssociationCreated(instance: any, payload: any) {
    const associationId = payload._source;
    debugSync('handleAssociationCreated called for association: %s', associationId);
    
    // Use global state consistently with initialize method
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    
    // More strict initialization check
    if (!state || !state._initialized || !state._isActive || !state._hasyxClient) {
      debugSync('Instance not properly initialized, skipping handleAssociationCreated. State: %o', {
        initialized: state?._initialized,
        active: state?._isActive,
        hasClient: !!state?._hasyxClient
      });
      return;
    }

    // Capture the hasyx client to avoid undefined access in async operations
    const hasyxClient = state._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available, skipping handleAssociationCreated');
      return;
    }

    // Start async operation tracking
    const association = new deep(associationId);
    const syncPromise = (async () => {
      try {
        debugSync('Starting sync operation for %s', associationId);

        // Check if association exists in database
        const exists = await checkAssociationExists(hasyxClient, associationId);
        
        if (!exists) {
          debugSync('Association %s does not exist in database, creating...', associationId);
          
          // Get association details - these fields must be string | undefined according to _deep.ts
          const assoc = new deep(associationId);
          
          // STRICT TYPE CHECKS - These fields should NEVER be Deep objects!
          if (typeof assoc._type !== 'string' && assoc._type !== undefined) {
            throw new Error(`CRITICAL BUG: assoc._type is not string/undefined but ${typeof assoc._type}: ${assoc._type}`);
          }
          if (typeof assoc._from !== 'string' && assoc._from !== undefined) {
            throw new Error(`CRITICAL BUG: assoc._from is not string/undefined but ${typeof assoc._from}: ${assoc._from}`);
          }
          if (typeof assoc._to !== 'string' && assoc._to !== undefined) {
            throw new Error(`CRITICAL BUG: assoc._to is not string/undefined but ${typeof assoc._to}: ${assoc._to}`);
          }
          if (typeof assoc._value !== 'string' && assoc._value !== undefined) {
            throw new Error(`CRITICAL BUG: assoc._value is not string/undefined but ${typeof assoc._value}: ${assoc._value}`);
          }
          
          const data = {
            id: associationId,
            _type: assoc._type || null,  // Already string | undefined, no ._id needed
            _from: assoc._from || null,  // Already string | undefined, no ._id needed
            _to: assoc._to || null,      // Already string | undefined, no ._id needed
            _value: assoc._value || null // Already string | undefined, no ._id needed
          };

          debugSync('Inserting association data: %o', data);

          // Insert association into database - use correct table name
          await hasyxClient.insert({
            table: 'deep_links',
            object: data,
            returning: ['id']
          });
          
          // Handle typed data insertion for String types
          if (assoc._type === assoc._deep.String._id) {
            debugSync('Inserting string data for %s: %s', associationId, assoc._data);
            await hasyxClient.insert({
              table: 'deep_strings',
              object: {
                id: associationId,
                _data: assoc._data || ''
              },
              returning: ['id']
            });
          }
          
          debugSync('✅ Association %s inserted to database successfully', associationId);
          
          // Emit database created event on both association and storage instance
          // Use simple JavaScript objects to avoid Deep serialization issues
          const eventPayload = {
            _source: associationId,
            _reason: deep.events.dbAssociationCreated._id
          };
          
          association._emit(deep.events.dbAssociationCreated._id, eventPayload);
          
          // Also emit on storage instance for global listeners
          instance._emit(deep.events.dbAssociationCreated._id, eventPayload);
        } else {
          debugSync('Association %s already exists in database', associationId);
        }
        
        return true; // Successfully processed
      } catch (error) {
        debugSync('Error in handleAssociationCreated for %s: %s', associationId, (error as Error).message);
        throw error;
      }
    })();

    // Set promise for tracking
    association.promise = syncPromise;
    
    // Also set promise on storage instance for global tracking  
    const storagePromise = state._promise || Promise.resolve();
    state._promise = storagePromise.then(() => syncPromise);
  }
  
  // Helper function to update association links when targets exist
  async function updateAssociationLinks(hasyxClient: any, association: any) {
    // STRICT TYPE CHECKS - These fields should NEVER be Deep objects!
    if (typeof association._type !== 'string' && association._type !== undefined) {
      throw new Error(`CRITICAL BUG in updateAssociationLinks: association._type is not string/undefined but ${typeof association._type}: ${association._type}`);
    }
    if (typeof association._from !== 'string' && association._from !== undefined) {
      throw new Error(`CRITICAL BUG in updateAssociationLinks: association._from is not string/undefined but ${typeof association._from}: ${association._from}`);
    }
    if (typeof association._to !== 'string' && association._to !== undefined) {
      throw new Error(`CRITICAL BUG in updateAssociationLinks: association._to is not string/undefined but ${typeof association._to}: ${association._to}`);
    }
    if (typeof association._value !== 'string' && association._value !== undefined) {
      throw new Error(`CRITICAL BUG in updateAssociationLinks: association._value is not string/undefined but ${typeof association._value}: ${association._value}`);
    }
    
    const linksToUpdate: any = {};
    let hasLinksToUpdate = false;
    
    // Check each potential link and only include if target exists in database
    if (association._type) {
      const typeExists = await checkAssociationExists(hasyxClient, association._type);
      if (typeExists) {
        linksToUpdate._type = association._type;
        hasLinksToUpdate = true;
      } else {
        debugSync('Skipping _type link to %s (target not in database yet)', association._type);
      }
    }
    
    if (association._from) {
      const fromExists = await checkAssociationExists(hasyxClient, association._from);
      if (fromExists) {
        linksToUpdate._from = association._from;
        hasLinksToUpdate = true;
      } else {
        debugSync('Skipping _from link to %s (target not in database yet)', association._from);
      }
    }
    
    if (association._to) {
      const toExists = await checkAssociationExists(hasyxClient, association._to);
      if (toExists) {
        linksToUpdate._to = association._to;
        hasLinksToUpdate = true;
      } else {
        debugSync('Skipping _to link to %s (target not in database yet)', association._to);
      }
    }
    
    if (association._value) {
      const valueExists = await checkAssociationExists(hasyxClient, association._value);
      if (valueExists) {
        linksToUpdate._value = association._value;
        hasLinksToUpdate = true;
      } else {
        debugSync('Skipping _value link to %s (target not in database yet)', association._value);
      }
    }
    
    // Update links if any are available
    if (hasLinksToUpdate) {
      debugSync('Updating links for %s: %o', association._id, linksToUpdate);
      
      try {
        await hasyxClient.update({
          table: 'deep_links',
          where: { id: { _eq: association._id } },
          _set: linksToUpdate,
          returning: ['id']
        });
        
        debugSync('✅ Links updated successfully for %s', association._id);
      } catch (error: any) {
        debugSync('Error updating association links %s: %s', association._id, (error as Error).message);
        throw error;
      }
    } else {
      debugSync('No links to update for %s (all targets missing)', association._id);
    }
  }
  
  // Helper function to check if association exists in database
  async function checkAssociationExists(hasyxClient: any, associationId: string): Promise<boolean> {
    try {
      const result = await hasyxClient.select({
        table: 'deep_links',
        where: { id: { _eq: associationId } },
        returning: ['id']
      });
      return result && result.length > 0;
    } catch (error) {
      debugSync('Error checking association existence for %s: %s', associationId, (error as Error).message);
      return false;
    }
  }
  
  // Link update handler - when association links change
  async function handleLinkUpdated(instance: any, payload: any) {
    const associationId = payload._source;
    debugSync('handleLinkUpdated called for association: %s', associationId);
    
    // Use global state consistently with initialize method
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    
    // More strict initialization check
    if (!state || !state._initialized || !state._isActive || !state._hasyxClient) {
      debugSync('Instance not properly initialized, skipping handleLinkUpdated. State: %o', {
        initialized: state?._initialized,
        active: state?._isActive,
        hasClient: !!state?._hasyxClient
      });
      return;
    }

    // Capture the hasyx client to avoid undefined access in async operations
    const hasyxClient = state._hasyxClient;
    if (!hasyxClient) {
      debugSync('No hasyx client available, skipping handleLinkUpdated');
      return;
    }

    // Start async operation tracking
    const association = new deep(associationId);
    const syncPromise = (async () => {
      try {
        debugSync('Starting link update sync for %s', associationId);

        // Check if this association exists in database first
        const associationExists = await checkAssociationExists(hasyxClient, associationId);
        
        if (!associationExists) {
          debugSync('Association %s does not exist in database, skipping link update', associationId);
          return false;
        }

        // Update association links using proper hasyx client operations
        await updateAssociationLinks(hasyxClient, association);
        
        debugSync('✅ Link update completed for %s', associationId);
        
        // Emit database updated event on both association and storage instance
        // Use simple JavaScript objects to avoid Deep serialization issues
        const eventPayload = {
          _source: associationId,
          _reason: deep.events.dbLinkUpdated._id
        };
        
        association._emit(deep.events.dbLinkUpdated._id, eventPayload);
        
        // Also emit on storage instance for global listeners
        instance._emit(deep.events.dbLinkUpdated._id, eventPayload);
        
        return true; // Successfully processed
      } catch (error) {
        debugSync('Error in handleLinkUpdated for %s: %s', associationId, (error as Error).message);
        throw error;
      }
    })();

    // Set promise for tracking
    association.promise = syncPromise;
    
    // Also set promise on storage instance for global tracking
    const storagePromise = state._promise || Promise.resolve();
    state._promise = storagePromise.then(() => syncPromise);
  }
  
  // Data update handler - when association data changes  
  async function handleDataUpdated(instance: any, payload: any) {
    // Use global state consistently with initialize method  
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    const associationId = payload._source || payload._id;
    
    debugDatabase('Handling data update for %s', associationId);
    
    // More strict initialization check
    if (!state || !state._initialized || !state._isActive || !state._hasyxClient) {
      debugDatabase('Instance not properly initialized, skipping handleDataUpdated. State: %o', {
        initialized: state?._initialized,
        active: state?._isActive,
        hasClient: !!state?._hasyxClient
      });
      return;
    }

    // Capture the hasyx client to avoid undefined access in async operations
    const hasyxClient = state._hasyxClient;
    if (!hasyxClient) {
      debugDatabase('No hasyx client available, skipping handleDataUpdated');
      return;
    }
    
    const association = new deep(associationId);
    
    // Convert to plain objects to avoid Deep serialization issues
    const updateData = {
      _data: association._data,
      updated_at: new Date(association._updated_at).toISOString()
    };
    
    debugDatabase('Data update: %o', updateData);
    
    try {
      // Update association data in database - use correct table name
      const result = await hasyxClient.update({
        table: 'deep_links',
        where: { id: { _eq: association._id } },
        _set: updateData,
        returning: ['id', 'updated_at']
      });
      
      debugDatabase('Association %s data updated in database: %o', associationId, result);
      
      // Emit database update event - use simple JavaScript objects
      const dbEvent = {
        _source: associationId,
        _reason: deep.events.dbDataUpdated._id,
        operation: 'update_data',
        data: updateData,
        result: result
      };
      instance._emit(deep.events.dbDataUpdated._id, dbEvent);
      
    } catch (error: any) {
      console.error('🚨 HasyxDeepStorage: Failed to update association data in database:', error);
      
      // Emit database error event - use simple JavaScript objects  
      const errorEvent = {
        _source: associationId,
        _reason: deep.events.dbBatchFailed._id,
        operation: 'update_data',
        error: error.message || String(error),
        data: updateData
      };
      instance._emit(deep.events.dbBatchFailed._id, errorEvent);
    }
  }
  
  const HasyxDeepStorage = new deep();
  
  // Create HasyxStorageInstance type for instances  
  const HasyxStorageInstance = HasyxDeepStorage._context.HasyxStorageInstance = new deep();
  
  // Constructor that initializes base state
  HasyxDeepStorage._context._constructor = function(this: any, args: any[] = []) {
    debugLifecycle('HasyxDeepStorage constructor called');
    
    const instance = new deep();
    instance._type = HasyxStorageInstance._id;
    const state = instance._getState(instance._id);
    
    // Initialize base state with proper defaults
    state._initialized = false;
    state._isActive = false;
    state._hasyxClient = null;
    state._trackedAssociations = null;
    state._globalStorageListener = null;
    
    debugLifecycle('Instance %s base state initialized', instance._id);
    return instance;
  };
  
  // Initialize method on instance type
  HasyxStorageInstance._context.initialize = new deep.Method(function(this: any, options: any = {}) {
    debugLifecycle('Initialize method called with options: %o', options);
    debugLifecycle('Initialize called on instance ID: %s', this._id);
    
    // Validate required options
    if (!options || !options.hasyxClient) {
      throw new Error('hasyxClient is required for HasyxDeepStorage initialization');
    }
    
    // Use global state for the HasyxStorageInstance type instead of per-instance state
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    debugLifecycle('State before initialization: %o', state);
    
    if (state._initialized) {
      debugLifecycle('HasyxStorageInstance already initialized, skipping');
      throw new Error('HasyxDeepStorage is already initialized');
    }
    
    // Store configuration and initialize state properly
    state._hasyxClient = options.hasyxClient;
    state._initialized = true;
    state._isActive = true;
    state._trackedAssociations = new Map(); // Map<associationId, disposers[]>
    
    debugLifecycle('State after initialization: %o', state);
    debugLifecycle('HasyxStorageInstance initialized successfully');
    
    // Setup global storage listener for this instance
    setupGlobalStorageListener(this);
    
    // Process any existing associations that are already marked for database storage
    processExistingDatabaseStorages(this);
    
    debugLifecycle('HasyxStorageInstance setup completed');
  });

  // Destroy method on instance type
  HasyxStorageInstance._context.destroy = new deep.Method(function(this: any) {
    debugLifecycle('Destroy method called for instance %s', this._id);
    
    // Use global state for the HasyxStorageInstance type instead of per-instance state
    const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
    
    if (!state._initialized) {
      debugLifecycle('HasyxStorageInstance was not initialized, just marking as inactive');
      state._isActive = false;
      state._initialized = false;  // Ensure it's false, not undefined
      return;
    }
    
    // Mark as inactive first to stop processing new events
    state._isActive = false;
    
    // Clean up tracked associations and their event listeners
    if (state._trackedAssociations) {
      debugLifecycle('Cleaning up %d tracked associations', state._trackedAssociations.size);
      for (const [associationId, disposers] of state._trackedAssociations) {
        debugLifecycle('Cleaning up listeners for association %s', associationId);
        if (Array.isArray(disposers)) {
          disposers.forEach((disposer, index) => {
            try {
              if (typeof disposer === 'function') {
                disposer();
              }
            } catch (error) {
              debugLifecycle('Error disposing listener %d for association %s: %o', index, associationId, error);
            }
          });
        }
      }
      state._trackedAssociations.clear();
    }
    
    // Remove event listeners if they were set up
    if (state._globalStorageListener) {
      try {
        state._globalStorageListener(); // Call disposer function
        state._globalStorageListener = null;
        debugLifecycle('Storage listener removed');
      } catch (error) {
        debugLifecycle('Error removing storage listener: %o', error);
      }
    }
    
    // Clean up other state but keep _initialized and _isActive as boolean
    delete state._hasyxClient;
    state._initialized = false;  // Set to false instead of deleting
    delete state._trackedAssociations;
    
    debugLifecycle('HasyxStorageInstance destroyed successfully');
  });
  
  // Add helper methods to access global state for any instance
  HasyxStorageInstance._context._getGlobalState = new deep.Method(function(this: any) {
    return HasyxStorageInstance._getState(HasyxStorageInstance._id);
  });
  
  HasyxStorageInstance._context._initialized = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
      return state._initialized || false;
    }
  });
  
  HasyxStorageInstance._context._isActive = new deep.Field(function(this: any) {
    if (this._reason == deep.reasons.getter._id) {
      const state = HasyxStorageInstance._getState(HasyxStorageInstance._id);
      return state._isActive || false;
    }
  });

  debugLifecycle('HasyxDeepStorage constructor created');
  return HasyxDeepStorage;
} 