// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations

import { _delay } from './_promise';
import { StorageDump, StorageLink, StorageDelta, _applyDelta, _applySubscription } from './storage';
import Debug from './debug';
import { v4 as uuidv4 } from 'uuid';

const debug = Debug('storage:hasyx');

// Global subscription tracking to prevent test hangs
const globalSubscriptions = new Set<StorageHasyxDump>();

// Global cleanup function for tests
export function destroyAllSubscriptions(): void {
  debug('🧹 Destroying all global hasyx subscriptions (%d instances)', globalSubscriptions.size);
  
  for (const instance of globalSubscriptions) {
    try {
      instance.destroy();
    } catch (error) {
      debug('Error destroying subscription instance:', error);
    }
  }
  
  globalSubscriptions.clear();
  debug('✅ All hasyx subscriptions destroyed');
}

/**
 * StorageHasyxDump - Real hasyx database storage with space isolation
 * Follows Deep Framework space model - deepSpaceId corresponds to root link
 * 
 * HASYX SUBSCRIPTION LIMITATIONS:
 * - Hasyx subscriptions trigger no more than once per second (1000ms minimum interval)
 * - Works in all environments (test, development, production)
 * - Tests must wait >1000ms for subscription updates to propagate
 * - While called "real-time", actual update frequency is limited to 1Hz
 */
export class StorageHasyxDump {
  hasyx: any;
  deepSpaceId: string;  // ID of the root link (where id == _deep and _type is NULL)
  dump: StorageDump = { links: [] };
  
  // Configurable delays
  _saveDelay: number = 100;
  _loadDelay: number = 50;
  _insertDelay: number = 30;
  _deleteDelay: number = 30;
  _updateDelay: number = 30;
  _subscribeInterval: number = 200;
  
  // Interval auto-stop configuration
  _defaultIntervalMaxCount: number = 30;
  private _intervalCount: number = 0;
  
  // Delta callback for real-time updates
  public _onDelta: ((delta: StorageDelta) => void) | undefined;
  
  // Subscription management with real-time hasyx subscriptions  
  private _subscriptionCallbacks: Set<(dump: StorageDump) => void> = new Set();
  private _hasyxSubscription: any = undefined; // hasyx subscription instance
  private _lastDumpJson: string = '';

  constructor(hasyx: any, deepSpaceId: string, initialDump?: StorageDump) {
    debug('Creating StorageHasyxDump with deepSpaceId: %s', deepSpaceId);
    
    this.hasyx = hasyx;
    this.deepSpaceId = deepSpaceId; // This should be the ID of the root link
    
    if (initialDump) {
      this.dump = initialDump;
      debug('Initialized with dump containing %d links', initialDump.links.length);
    }
    
    // Initialize last dump JSON for change detection
    this._lastDumpJson = JSON.stringify(this.dump);
    
    // Add to global tracking for test cleanup
    globalSubscriptions.add(this);
    debug('Added to global subscriptions tracking (total: %d)', globalSubscriptions.size);
  }

  /**
   * Save dump with configurable delay
   */
  async save(dump: StorageDump): Promise<void> {
    debug('save() called with %d links, delay=%dms', dump.links.length, this._saveDelay);
    await _delay(this._saveDelay);
      
      // Clear existing data for this space
      await this.hasyx.delete({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } }
      });
      
    // Insert all links with correct _deep values
    for (const link of dump.links) {
      // Determine _deep value based on link type
      const isRootLink = !link._type;
      const _deep = isRootLink ? link._id : this.deepSpaceId;
      
      // For root links, ensure id == deepSpaceId
      if (isRootLink && link._id !== this.deepSpaceId) {
        throw new Error(`Root link id (${link._id}) must equal deepSpaceId (${this.deepSpaceId})`);
      }
      
          await this.hasyx.insert({
        table: 'deep_links',
            object: {
          id: link._id,
          _deep: _deep,
          _type: link._type || null,
          _from: link._from || null,
          _to: link._to || null,
          _value: link._value || null,
          string: link._string || null,
          number: link._number || null,
          function: link._function || null,
              created_at: link._created_at,
              updated_at: link._updated_at,
          _i: link._i || null
            }
          });
        }
        
      this.dump = dump;
    debug('save() completed');
  }

  /**
   * Load dump with configurable delay
   */
  async load(): Promise<StorageDump> {
    debug('load() called, delay=%dms', this._loadDelay);
    await _delay(this._loadDelay);
    
    // Load all links where _deep equals our deepSpaceId
    debug('load() executing hasyx.select with where: { _deep: { _eq: %s } }', this.deepSpaceId);
      const dbLinks = await this.hasyx.select({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } },
        returning: [
          'id', '_deep', '_type', '_from', '_to', '_value', 
        'string', 'number', 'function',
          'created_at', 'updated_at', '_i'
        ]
      });
      
    debug('load() found %d links for deepSpaceId: %s', dbLinks.length, this.deepSpaceId);
    debug('load() raw database response:');
    for (let i = 0; i < dbLinks.length; i++) {
      debug('  link %d: %o', i, dbLinks[i]);
    }
    
      const storageLinks: StorageLink[] = dbLinks.map((dbLink: any) => ({
        _id: dbLink.id,
      _type: dbLink._type || undefined,
        _from: dbLink._from || undefined,
        _to: dbLink._to || undefined, 
        _value: dbLink._value || undefined,
        _created_at: dbLink.created_at,
        _updated_at: dbLink.updated_at,
      _i: dbLink._i || undefined,
        _string: dbLink.string || undefined,
        _number: dbLink.number || undefined,
        _function: dbLink.function || undefined
      }));
      
      const dump: StorageDump = { links: storageLinks };
      this.dump = dump;
      debug('load() completed with %d links', dump.links.length);
    debug('load() returning dump: %o', dump);
      
      return dump;
  }

  /**
   * Insert link with configurable delay and database update
   */
  async insert(link: StorageLink): Promise<void> {
    debug('insert() called for link %s, delay=%dms', link._id, this._insertDelay);
    await _delay(this._insertDelay);
    
    // Determine _deep value based on link type:
    // - Root link (no _type): id == _deep == deepSpaceId 
    // - Regular link (with _type): _deep = deepSpaceId
    const isRootLink = !link._type;
    const _deep = isRootLink ? link._id : this.deepSpaceId;
    
    // For root links, ensure id == deepSpaceId
    if (isRootLink && link._id !== this.deepSpaceId) {
      throw new Error(`Root link id (${link._id}) must equal deepSpaceId (${this.deepSpaceId})`);
    }
    
      // Check if link already exists
      const existing = await this.hasyx.select({
        table: 'deep_links',
        where: { 
          id: { _eq: link._id },
        _deep: { _eq: _deep }
        },
        returning: ['id']
      });
      
      if (existing.length > 0) {
        throw new Error(`Link with id ${link._id} already exists`);
      }
      
    // Insert into database
    const result = await this.hasyx.insert({
        table: 'deep_links',
        object: {
        id: link._id,
        _deep: _deep,
        _type: link._type || null,
          _from: link._from || null,
          _to: link._to || null,
          _value: link._value || null,
        string: link._string || null,
        number: link._number || null,
        function: link._function || null,
          created_at: link._created_at,
          updated_at: link._updated_at,
        _i: link._i || null
      }
      });
      
    // Add to in-memory dump
      this.dump.links.push(link);
    
      debug('insert() completed for link %s', link._id);
      
    // Call delta callback if set
      if (this._onDelta) {
        this._onDelta({ operation: 'insert', link });
    }
  }

  /**
   * Delete link with configurable delay
   */
  async delete(link: StorageLink): Promise<void> {
    debug('delete() called for link %s, delay=%dms', link._id, this._deleteDelay);
    await _delay(this._deleteDelay);
    
    // Delete by id only - id is globally unique primary key
      const result = await this.hasyx.delete({
        table: 'deep_links',
        where: {
        id: { _eq: link._id }
        }
      });
      
      if (result.affected_rows === 0) {
        throw new Error(`Link with id ${link._id} not found`);
      }
      
      // Remove from local dump
      const index = this.dump.links.findIndex(l => l._id === link._id);
      if (index !== -1) {
        this.dump.links.splice(index, 1);
      }
      
      debug('delete() completed for link %s', link._id);
      
      // Call delta callback
      if (this._onDelta) {
        this._onDelta({ operation: 'delete', id: link._id });
    }
  }

  /**
   * Update link with configurable delay
   */
  async update(link: StorageLink): Promise<void> {
    debug('update() called for link %s, delay=%dms', link._id, this._updateDelay);
    await _delay(this._updateDelay);
    
    // Determine _deep value for search and update
    const isRootLink = !link._type;
    const _deep = isRootLink ? link._id : this.deepSpaceId;
      
    const result = await this.hasyx.update({
      table: 'deep_links',
      where: {
        id: { _eq: link._id },
        _deep: { _eq: _deep }
      },
      _set: {
        _deep: _deep,
        _type: link._type || null,
        _from: link._from || null,
        _to: link._to || null,
        _value: link._value || null,
        string: link._string || null,
        number: link._number || null,
        function: link._function || null,
        updated_at: link._updated_at,
        _i: link._i || null
      }
    });
    
    // If no rows affected, record doesn't exist - insert it
    if (result.affected_rows === 0) {
      debug('Link %s not found in database, inserting it', link._id);
      await this.insert(link);
      return;
    }
      
    // Update in local dump
    const index = this.dump.links.findIndex(l => l._id === link._id);
    if (index !== -1) {
      this.dump.links[index] = link;
    }
      
    debug('update() completed for link %s', link._id);
      
    // Call delta callback
    if (this._onDelta) {
      this._onDelta({ operation: 'update', id: link._id, link });
    }
  }

  /**
   * Subscribe to changes using hasyx real-time GraphQL subscriptions
   * 
   * NOTE: Hasyx subscriptions have frequency limitations:
   * - Trigger no more than once per second (1000ms minimum interval)
   * - Tests should wait >1000ms for updates to propagate
   * - Real-time updates are limited to 1Hz frequency
   */
  async subscribe(callback: (dump: StorageDump) => void): Promise<() => void> {
    debug('Setting up hasyx real-time subscription for deepSpaceId: %s', this.deepSpaceId);
    
    this._subscriptionCallbacks.add(callback);
    
    // Start real-time hasyx subscription if not already started
    if (!this._hasyxSubscription && this.hasyx.subscribe) {
      try {
        const observable = this.hasyx.subscribe({
          table: 'deep_links',
          where: { _deep: { _eq: this.deepSpaceId } },
          returning: ['id', '_i', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at']
        });
        
        // hasyx.subscribe() returns Observable, need to call .subscribe() on it
        this._hasyxSubscription = observable.subscribe({
          next: (data: any) => {
            debug('Received hasyx subscription data: %o', data);
            this._handleSubscriptionData(data);
          },
          error: (error: any) => {
            debug('❌ Hasyx subscription error: %s', error.message);
            this._startPollingFallback(callback);
          },
          complete: () => {
            debug('Hasyx subscription completed');
          }
        });
        
        debug('✅ Hasyx real-time subscription established');
      } catch (error) {
        debug('❌ Failed to establish hasyx subscription, falling back to polling: %s', (error as Error).message);
        this._startPollingFallback(callback);
      }
    }
    
    // Set up cleanup handler
    const cleanup = () => {
      debug('unsubscribe() called');
      this._subscriptionCallbacks.delete(callback);
      
      if (this._subscriptionCallbacks.size === 0 && this._hasyxSubscription) {
        // Stop subscription when no more callbacks
        try {
          this._hasyxSubscription.unsubscribe();
        } catch (error) {
          debug('Error unsubscribing from hasyx: %s', (error as Error).message);
        }
        this._hasyxSubscription = undefined;
      }
    };
    
    return cleanup;
  }
  
  /**
   * Handle real-time subscription data from hasyx
   */
  private _handleSubscriptionData(data: any): void {
    try {
      // Convert hasyx data to StorageDump format
      const newDump: StorageDump = {
        links: Array.isArray(data) ? data.map((item: any) => ({
          _id: item.id,
          _type: item._type,
          _from: item._from,
          _to: item._to,
          _value: item._value,
          _i: item._i,
          _created_at: item.created_at,
          _updated_at: item.updated_at,
          _string: item.string,
          _number: item.number,
          _function: item.function
        })) : []
      };
      
      const newDumpJson = JSON.stringify(newDump);
      if (this._lastDumpJson !== newDumpJson) {
        this._lastDumpJson = newDumpJson;
        this.dump = newDump;
        
        // Notify all callbacks
        for (const callback of this._subscriptionCallbacks) {
          try {
            callback(newDump);
          } catch (error) {
            debug('Error in subscription callback: %s', (error as Error).message);
          }
        }
      }
    } catch (error) {
      debug('Error handling subscription data: %s', (error as Error).message);
    }
  }

  /**
   * Fallback to polling if real-time subscription fails
   */
  private _startPollingFallback(callback: (dump: StorageDump) => void): void {
    debug('Starting polling fallback for deepSpaceId: %s', this.deepSpaceId);
    
    this._intervalCount = 0;
    const pollTimer = setInterval(async () => {
      this._intervalCount++;
      if (this._intervalCount > this._defaultIntervalMaxCount) {
        clearInterval(pollTimer);
        return;
      }
      
      try {
        const dump = await this.load();
        const newDumpJson = JSON.stringify(dump);
        if (this._lastDumpJson !== newDumpJson) {
          this._lastDumpJson = newDumpJson;
          callback(dump);
        }
      } catch (error) {
        debug('Error in polling fallback: %s', (error as Error).message);
      }
    }, this._subscribeInterval);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    debug('Destroying StorageHasyxDump for %s', this.deepSpaceId);
    
    // Clean up hasyx subscription
    if (this._hasyxSubscription) {
      try {
        this._hasyxSubscription.unsubscribe();
      } catch (error) {
        debug('Error unsubscribing from hasyx during destroy: %s', (error as Error).message);
      }
      this._hasyxSubscription = undefined;
    }
    
    // Clear all callbacks
    this._subscriptionCallbacks.clear();
    
    this._onDelta = undefined;
    
    // Remove from global tracking for test cleanup
    globalSubscriptions.delete(this);
    debug('Removed from global subscriptions tracking (total: %d)', globalSubscriptions.size);
    
    debug('StorageHasyxDump destroyed');
  }
}

/**
 * Create StorageHasyx function for Deep Framework - following storage-local.ts architecture
 */
export function newStorageHasyx(deep: any) {
  debug('Initializing StorageHasyx');
  
  const StorageHasyx = new deep.Function(function(this: any, options: {
    hasyx: any;
    deepSpaceId: string;
    dump?: StorageDump;
    storageHasyxDump?: StorageHasyxDump;
    strategy?: 'subscription' | 'delta';
    storage?: any;
  }) {
    debug('Creating StorageHasyx with options: %o', { ...options, hasyx: '[HasyxClient]' });
    
    if (!options.hasyx) {
      throw new Error('hasyx client is required for StorageHasyx');
    }
    
    if (!options.deepSpaceId) {
      throw new Error('deepSpaceId is required for StorageHasyx');
    }
    
    const strategy = options.strategy || 'delta';
    
    // Use provided storage or create new one - IMPORTANT: follow storage-local pattern
    const storage = options.storage || new deep.Storage();
    
    debug('Storage %s with ID: %s', options.storage ? 'reused' : 'created', storage._id);
    
    // Create or use provided StorageHasyxDump
    const storageHasyxDump = options.storageHasyxDump || new StorageHasyxDump(options.hasyx, options.deepSpaceId, options.dump);
    
    /**
     * Ensure essential types exist in database BEFORE defaultMarking
     * This satisfies up-links validation requirements
     */
    const _ensureEssentialTypes = async () => {
      debug('🔧 Ensuring essential types exist in database...');
      
      try {
        // Check if root space exists
        const rootSpaceExists = await options.hasyx.select({
          table: 'deep_links',
          where: { 
            id: { _eq: options.deepSpaceId },
            _deep: { _eq: options.deepSpaceId }
          },
          returning: ['id']
        });
        
        if (rootSpaceExists.length === 0) {
          debug('📝 Creating root space...');
          // Create root space (id == _deep allows NULL _type)
          await options.hasyx.insert({
            table: 'deep_links',
            object: { 
              id: options.deepSpaceId,
              _deep: options.deepSpaceId,  // id == _deep allows NULL _type
              string: 'Root Space'
            },
            returning: 'id'
          });
          debug('✅ Root space created');
        } else {
          debug('✅ Root space already exists');
        }
        
        // Check and create essential framework types
        const essentialTypes = [
          { id: deep.String._id, name: 'String' },
          { id: deep.Number._id, name: 'Number' },
          { id: deep.Function._id, name: 'Function' },
          { id: deep.Storage._id, name: 'Storage' },
          { id: deep.StorageMarker._id, name: 'StorageMarker' }
        ];
        
        for (const type of essentialTypes) {
          const typeExists = await options.hasyx.select({
            table: 'deep_links',
            where: { 
              id: { _eq: type.id },
              _deep: { _eq: options.deepSpaceId }
            },
            returning: ['id']
          });
          
          if (typeExists.length === 0) {
            debug('📝 Creating type %s (%s)...', type.name, type.id);
            await options.hasyx.insert({
              table: 'deep_links',
              object: { 
                id: type.id,
                _deep: options.deepSpaceId,
                _type: options.deepSpaceId,  // Use root as type
                string: type.name
              },
              returning: 'id'
            });
            debug('✅ Type %s created', type.name);
          } else {
            debug('✅ Type %s already exists', type.name);
          }
        }
        
        // Also create storage marker types
        const markerTypes = [
          { id: deep.storageMarkers.oneTrue._id, name: 'oneTrue' },
          { id: deep.storageMarkers.oneFalse._id, name: 'oneFalse' },
          { id: deep.storageMarkers.typedTrue._id, name: 'typedTrue' },
          { id: deep.storageMarkers.typedFalse._id, name: 'typedFalse' }
        ];
        
        for (const marker of markerTypes) {
          const markerExists = await options.hasyx.select({
            table: 'deep_links',
            where: { 
              id: { _eq: marker.id },
              _deep: { _eq: options.deepSpaceId }
            },
            returning: ['id']
          });
          
          if (markerExists.length === 0) {
            debug('📝 Creating storage marker %s (%s)...', marker.name, marker.id);
            await options.hasyx.insert({
              table: 'deep_links',
              object: { 
                id: marker.id,
                _deep: options.deepSpaceId,
                _type: deep.StorageMarker._id,  // Use StorageMarker as type
                string: marker.name
              },
              returning: 'id'
            });
            debug('✅ Storage marker %s created', marker.name);
          } else {
            debug('✅ Storage marker %s already exists', marker.name);
          }
        }
        
        debug('✅ All essential types ensured in database');
        
      } catch (error) {
        debug('❌ Error ensuring essential types: %s', (error as Error).message);
        throw error;
      }
    };
    
    // Handle initial dump or load existing one - following storage-local pattern
    if (options.dump) {
      // If dump provided, newDeep was restored with corresponding IDs but dump not yet applied
      // Need to apply the entire dump using _applySubscription
      // No need to save back to storageHasyxDump since we got this dump from there
      storage.promise = Promise.resolve().then(async () => {
        debug('Applying initial dump with %d links', options.dump!.links.length);
        
        // STEP 1: Ensure essential types exist FIRST
        await _ensureEssentialTypes();
        
        debug('Applying initial dump to deep instance');
        deep.__isStorageEvent = storage._id;
        _applySubscription(deep, options.dump!, storage);
      });
    } else {
      // Load existing dump from hasyx or create new one
      storage.promise = Promise.resolve().then(async () => {
        // STEP 1: Ensure essential types exist FIRST
        await _ensureEssentialTypes();
        
        try {
          debug('Loading existing dump from hasyx database');
          const existingDump = await storageHasyxDump.load();
          debug('Loaded existing dump with %d links', existingDump.links.length);
          
          if (existingDump.links.length > 0) {
            debug('Applying existing dump with %d links', existingDump.links.length);
            debug('Applying existing dump to deep instance');
            try {
              deep.__isStorageEvent = storage._id;
              _applySubscription(deep, existingDump, storage);
              debug('Applied existing dump, deep._ids.size: %d', deep._ids.size);
            } catch (error) {
              debug('Warning applying existing dump: %s', (error as Error).message);
              // Don't throw - continue with initialization, the dump will be applied later via subscription
            }
          }
          storage.state.dump = existingDump;
        } catch (loadError) {
          debug('Error during load, trying to generate initial dump: %s', (loadError as Error).message);
          debug('Generating initial dump from current storage state');
          
          try {
            // Generate initial dump and save to storage
            const dump = storage.state.generateDump();
            storage.state.dump = dump;
            await storageHasyxDump.save(dump);
          } catch (generateError) {
            debug('Both load and generate failed: %s', (generateError as Error).message);
            throw generateError;
          }
        }
      });
    }
    
    // Set up local -> storage synchronization using storage.state event handlers
    // These will be called by the Storage Alive function when events occur
    storage.state.onLinkInsert = (storageLink: StorageLink) => {
      debug('onLinkInsert called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageHasyxDump.insert(storageLink));
    };
    
    storage.state.onLinkDelete = (storageLink: StorageLink) => {
      debug('onLinkDelete called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageHasyxDump.delete(storageLink));
    };
    
    storage.state.onLinkUpdate = (storageLink: StorageLink) => {
      debug('onLinkUpdate called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageHasyxDump.update(storageLink));
    };
    
    storage.state.onDataChanged = (storageLink: StorageLink) => {
      debug('onDataChanged called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageHasyxDump.update(storageLink));
    };
    
    // CRITICAL: Start watching for events - this triggers the Storage Alive function to start listening
    if (typeof storage.state.watch === 'function') {
      storage.state.watch();
    }
    
    // Set up storage -> local synchronization based on strategy
    if (strategy === 'subscription') {
      debug('Setting up subscription strategy');
      storage.promise = storage.promise.then(async () => {
        const unsubscribe = await storageHasyxDump.subscribe((nextDump) => {
          debug('Subscription received dump with %d links', nextDump.links.length);
          _applySubscription(deep, nextDump, storage);
        });
        
        // Store unsubscribe function for cleanup
        storage.state._unsubscribe = unsubscribe;
        return Promise.resolve(true);
      });
    } else if (strategy === 'delta') {
      debug('Setting up delta strategy');
      storage.promise = storage.promise.then(() => {
        storageHasyxDump._onDelta = (delta) => {
          debug('Delta received: %s for %s', delta.operation, delta.id || delta.link?._id);
          _applyDelta(deep, delta, storage);
        };
        return Promise.resolve(true);
      });
    }
    
    // Set up cleanup handler
    storage.state.onDestroy = () => {
      debug('Storage cleanup initiated for %s', storage._id);
      storage?.state?._unsubscribe?.();
      storageHasyxDump.destroy();
      debug('StorageHasyx cleanup completed');
    };
    
    debug('StorageHasyx created successfully');
    return storage;
  });
  
  // Register StorageHasyx in deep context
  deep._context.StorageHasyx = StorageHasyx;
  
  return StorageHasyx;
} 