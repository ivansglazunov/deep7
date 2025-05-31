// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations

import { Hasyx } from 'hasyx';
import { _delay } from './_promise';
import Debug from './debug';
import { StorageDelta, StorageDump, StorageLink, _applySubscription, _applyDelta } from './storage';

const debug = Debug('storage:hasyx');

// Global subscription tracking to prevent test hangs
const globalSubscriptions = new Set<StorageHasyxDump>();

// Global cleanup function for tests
export function destroyAllSubscriptions(): void {
  debug('🧹 Destroying all global hasyx subscriptions (%d instances)', globalSubscriptions.size);
  
  for (const instance of globalSubscriptions) {
    try {
      if (instance && typeof instance.destroy === 'function') {
        instance.destroy();
      }
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
  hasyx: Hasyx;
  deepSpaceId: string;  // ID of the root link (where id == _deep and _type is NULL)
  dump: StorageDump = { links: [] };
  
  // Configurable delays
  _saveDelay: number = 100;
  _loadDelay: number = 50;
  _insertDelay: number = 30;
  _deleteDelay: number = 30;
  _updateDelay: number = 30;
  _subscribeInterval: number = 200; // For polling fallback
  
  // Interval auto-stop configuration for polling fallback
  _defaultIntervalMaxCount: number = 30;
  private _intervalCount: number = 0;
  
  // Delta callback for real-time updates
  public _onDelta: ((delta: StorageDelta) => void) | undefined;
  
  // Subscription management with real-time hasyx subscriptions  
  private _subscriptionCallbacks: Set<(dump: StorageDump) => void> = new Set();
  private _hasyxSubscription: any = undefined; // hasyx subscription instance
  private _pollingFallbackTimer: NodeJS.Timeout | undefined;
  private _lastDumpJson: string = '';

  constructor(hasyx: Hasyx, deepSpaceId: string, initialDump?: StorageDump) {
    debug('Creating StorageHasyxDump with deepSpaceId: %s', deepSpaceId);
    
    this.hasyx = hasyx;
    this.deepSpaceId = deepSpaceId; 
    
    if (initialDump) {
      this.dump = initialDump;
      debug('Initialized with dump containing %d links', initialDump.links.length);
    }
    
    this._lastDumpJson = JSON.stringify(this.dump);
    globalSubscriptions.add(this);
    debug('Added to global subscriptions tracking (total: %d)', globalSubscriptions.size);
  }

  async save(dump: StorageDump): Promise<void> {
    debug('save() called for space %s with %d links, delay=%dms', this.deepSpaceId, dump.links.length, this._saveDelay);
    
    debug('save() waiting for delay...');
    await _delay(this._saveDelay);
    debug('save() delay completed');
      
    debug('save() clearing existing data for space: %s', this.deepSpaceId);
    try {
      await this.hasyx.delete({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } }
      });
      debug('save() existing data cleared for space: %s', this.deepSpaceId);
    } catch (error: any) {
      debug('save() error clearing data: %s', error.message);
      throw error;
    }
      
    if (dump.links.length > 0) {
      debug('save() inserting %d links into space: %s', dump.links.length, this.deepSpaceId);
      
      // Split large batches to avoid database query errors
      const batchSize = 50; // Hasura limit
      const batches: StorageLink[][] = [];
      for (let i = 0; i < dump.links.length; i += batchSize) {
        batches.push(dump.links.slice(i, i + batchSize));
      }
      
      debug('save() splitting into %d batches of max %d links each', batches.length, batchSize);
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        debug('save() processing batch %d/%d with %d links', batchIndex + 1, batches.length, batch.length);
        
        const objectsToInsert = batch.map(link => {
          const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
          const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

          if (!link._type && link._id !== this.deepSpaceId) {
            const errorMsg = `Link with null _type (intended as root) has id (${link._id}) which does not match deepSpaceId (${this.deepSpaceId}).`;
            debug(errorMsg);
            throw new Error(errorMsg);
          }

          return {
            id: link._id,
            _deep: _deepValue,
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
          };
        });

        debug('save() about to insert batch %d/%d with %d objects via hasyx.insert', batchIndex + 1, batches.length, objectsToInsert.length);
        try {
          await this.hasyx.insert({
            table: 'deep_links',
            objects: objectsToInsert
          });
          debug('save() batch %d/%d inserted successfully (%d links)', batchIndex + 1, batches.length, batch.length);
        } catch (error: any) {
          debug('save() error inserting batch %d/%d: %s', batchIndex + 1, batches.length, error.message);
          throw error;
        }
      }
      
      debug('save() all %d batches inserted successfully, total %d links into space: %s', batches.length, dump.links.length, this.deepSpaceId);
    } else {
      debug('save() no links to insert into space: %s', this.deepSpaceId);
        }
        
      this.dump = dump;
    this._lastDumpJson = JSON.stringify(this.dump);
    debug('save() completed for space %s', this.deepSpaceId);
  }

  async load(): Promise<StorageDump> {
    debug('load() called for space %s, delay=%dms', this.deepSpaceId, this._loadDelay);
    await _delay(this._loadDelay);
    
    debug('load() executing hasyx.select for space %s', this.deepSpaceId);
      const dbLinks = await this.hasyx.select({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } },
        returning: [
          'id', '_deep', '_type', '_from', '_to', '_value', 
        'string', 'number', 'function',
          'created_at', 'updated_at', '_i'
        ]
      });
      
    debug('load() found %d links for space %s', dbLinks.length, this.deepSpaceId);
    
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
      
    const newDump: StorageDump = { links: storageLinks };
    this.dump = newDump;
    this._lastDumpJson = JSON.stringify(this.dump);
    debug('load() completed for space %s with %d links', this.deepSpaceId, this.dump.links.length);
    return this.dump;
  }

  async insert(link: StorageLink): Promise<void> {
    debug('insert() called for link %s in space %s, delay=%dms', link._id, this.deepSpaceId, this._insertDelay);
    await _delay(this._insertDelay);
    
    const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
    const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

    if (!link._type && link._id !== this.deepSpaceId) {
      const errorMsg = `Cannot insert link with null _type and id (${link._id}) that does not match deepSpaceId (${this.deepSpaceId}).`;
      debug(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      await this.hasyx.insert({
        table: 'deep_links',
        object: {
          id: link._id,
          _deep: _deepValue,
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
      debug('insert() successful for link %s in space %s', link._id, this.deepSpaceId);

      const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
      if (existingIndex === -1) {
        this.dump.links.push(link);
      } else {
        this.dump.links[existingIndex] = link;
      }
      this._lastDumpJson = JSON.stringify(this.dump);

    } catch (error: any) {
      debug('insert() failed for link %s in space %s: %s', link._id, this.deepSpaceId, error.message);
      throw error; 
    }
    
    if (this._onDelta) {
      debug('insert() calling _onDelta for link %s in space %s', link._id, this.deepSpaceId);
      this._onDelta({ operation: 'insert', link });
    }
  }

  async delete(link: StorageLink): Promise<void> {
    debug('delete() called for link %s in space %s, delay=%dms', link._id, this.deepSpaceId, this._deleteDelay);
    await _delay(this._deleteDelay);
    
    const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
    const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

    debug('delete() attempting to delete link %s from _deep space %s', link._id, _deepValue);

    try {
    const result = await this.hasyx.delete({
      table: 'deep_links',
        where: { id: { _eq: link._id }, _deep: { _eq: _deepValue } } 
    });
      debug('delete() successful for link %s in space %s: affected_rows %d', link._id, this.deepSpaceId, result.affected_rows);
      
    if (result.affected_rows === 0) {
        const errorMsg = `Link with id ${link._id} not found for deletion in space ${_deepValue}`;
        debug('delete() error: %s', errorMsg);
        throw new Error(errorMsg);
      }

      const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
      if (existingIndex !== -1) {
        this.dump.links.splice(existingIndex, 1);
        this._lastDumpJson = JSON.stringify(this.dump);
    } else {
        debug('delete() warning: link %s not found in in-memory dump for deletion in space %s.', link._id, this.deepSpaceId);
      }

    } catch (error: any) {
      debug('delete() failed for link %s in space %s: %s', link._id, this.deepSpaceId, error.message);
      throw error; 
    }
    
    if (this._onDelta) {
      debug('delete() calling _onDelta for link %s in space %s', link._id, this.deepSpaceId);
      this._onDelta({ operation: 'delete', id: link._id });
    }
  }

  async update(link: StorageLink): Promise<void> {
    debug('update() called for link %s in space %s, delay=%dms', link._id, this.deepSpaceId, this._updateDelay);
    await _delay(this._updateDelay);
    
    const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
    const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

    if (!link._type && link._id !== this.deepSpaceId) {
      const errorMsg = `Cannot update link with null _type and id (${link._id}) that does not match deepSpaceId (${this.deepSpaceId}).`;
      debug(errorMsg);
      throw new Error(errorMsg);
    }
    
    try {
      const result = await (this.hasyx.update as any)({
      table: 'deep_links',
        where: { id: { _eq: link._id }, _deep: { _eq: _deepValue } }, 
      _set: {
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
      debug('update() successful for link %s in space %s: affected_rows %d', link._id, this.deepSpaceId, result.affected_rows);
    
    if (result.affected_rows === 0) {
         const errorMsg = `Link with id ${link._id} not found for update in space ${_deepValue}`;
         debug('update() error: %s', errorMsg);
         throw new Error(errorMsg);
      }

      const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
      if (existingIndex !== -1) {
        this.dump.links[existingIndex] = link;
      } else {
        debug('update() warning: link %s updated in DB but not found in in-memory dump for space %s.', link._id, this.deepSpaceId);
        if (result.affected_rows > 0) { 
            this.dump.links.push(link); 
        }
      }
      this._lastDumpJson = JSON.stringify(this.dump);

    } catch (error: any) {
      debug('update() failed for link %s in space %s: %s', link._id, this.deepSpaceId, error.message);
      throw error; 
    }
    
    if (this._onDelta) {
      debug('update() calling _onDelta for link %s in space %s', link._id, this.deepSpaceId);
      this._onDelta({ operation: 'update', id: link._id, link });
    }
  }

  async subscribe(callback: (dump: StorageDump) => void): Promise<() => void> {
    debug('subscribe() called for deepSpaceId: %s', this.deepSpaceId);
    this._subscriptionCallbacks.add(callback);
    
    const unsubscribe = () => {
      debug('Unsubscribe called for space %s.', this.deepSpaceId);
      this._subscriptionCallbacks.delete(callback);
      if (this._subscriptionCallbacks.size === 0) {
        debug('No more subscribers, cleaning up Hasyx subscription for space %s.', this.deepSpaceId);
        if (this._hasyxSubscription && typeof this._hasyxSubscription.unsubscribe === 'function') {
          try {
            this._hasyxSubscription.unsubscribe();
            debug('Hasyx subscription.unsubscribe() called for space %s.', this.deepSpaceId);
          } catch (unsubError: any) {
            debug('Error during Hasyx subscription.unsubscribe() for space %s: %s', this.deepSpaceId, unsubError.message);
          }
        }
        this._hasyxSubscription = undefined;

        if (this._pollingFallbackTimer) {
            clearTimeout(this._pollingFallbackTimer);
            this._pollingFallbackTimer = undefined;
            debug('Polling fallback timer cleared for space %s.', this.deepSpaceId);
        }
        this._intervalCount = 0; 
        debug('Hasyx resources cleaned up for space %s.', this.deepSpaceId);
      }
    };

    if (!this._hasyxSubscription && this._subscriptionCallbacks.size === 1) {
      debug('First subscriber, initiating Hasyx subscription for space %s', this.deepSpaceId);
      try {
        this._hasyxSubscription = (this.hasyx.subscribe as any)({
          query: /* GraphQL */ `
            subscription linksInSpace($deepSpaceId: uuid!) {
              deep_links(where: {_deep: {_eq: $deepSpaceId}}) {
                id
                _deep
                _type
                _from
                _to
                _value
                string
                number
                function
                created_at
                updated_at
                _i
              }
            }
          `,
          variables: { deepSpaceId: this.deepSpaceId },
          onData: (response: any) => { 
            debug('Hasyx subscription data for space %s: %o', this.deepSpaceId, response);
            if (response && response.data) {
              this._handleSubscriptionData(response.data);
            } else if (response && response.errors) {
              debug('Hasyx subscription error for space %s: %o', this.deepSpaceId, response.errors);
            } else {
              debug('Hasyx subscription - unexpected response structure for space %s: %o', this.deepSpaceId, response);
            }
          },
          onError: (error: any) => {
            debug('Hasyx subscription error for space %s: %s. Falling back to polling.', this.deepSpaceId, error.message, error);
            this._startPollingFallback(callback);
          }
        });
        debug('Hasyx subscription initiated successfully for space %s.', this.deepSpaceId);
      } catch (error: any) {
        debug('Error initiating Hasyx subscription for space %s: %s. Falling back to polling.', this.deepSpaceId, error.message, error);
        this._startPollingFallback(callback);
      }
    }
    
    return unsubscribe;
  }

  private _handleSubscriptionData(responseData: any): void {
    debug('_handleSubscriptionData received for space %s: %o', this.deepSpaceId, responseData);

    let newDump: StorageDump;

    if (responseData && responseData.deep_links && Array.isArray(responseData.deep_links)) {
        const storageLinks: StorageLink[] = responseData.deep_links.map((dbLink: any) => ({
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
        newDump = { links: storageLinks };
    } else {
        debug('_handleSubscriptionData: Data format for space %s not recognized or empty. Data: %o', this.deepSpaceId, responseData);
        return; 
    }
      
      const newDumpJson = JSON.stringify(newDump);
    if (newDumpJson !== this._lastDumpJson) {
      debug('_handleSubscriptionData: Dump changed for space %s, notifying subscribers.', this.deepSpaceId);
      this.dump = newDump;
        this._lastDumpJson = newDumpJson;
        
      for (const indivCallback of this._subscriptionCallbacks) {
          try {
          indivCallback(this.dump); 
          } catch (error) {
          debug('Error in subscription callback for space %s: %s', this.deepSpaceId, (error as Error).message);
        }
      }
    } else {
      debug('_handleSubscriptionData: Dump unchanged for space %s, no notification needed.', this.deepSpaceId);
    }
  }

  private async _poll(): Promise<void> {
    if (this._subscriptionCallbacks.size === 0) {
        debug('Polling: No subscribers for space %s, stopping poll.', this.deepSpaceId);
        if (this._pollingFallbackTimer) clearTimeout(this._pollingFallbackTimer);
        this._pollingFallbackTimer = undefined;
        this._intervalCount = 0;
        return;
    }

    this._intervalCount++;
    debug('Polling check for space %s (interval %d/%d)', this.deepSpaceId, this._intervalCount, this._defaultIntervalMaxCount);

    if (this._defaultIntervalMaxCount > 0 && this._intervalCount >= this._defaultIntervalMaxCount) {
        debug('Polling: Max interval count reached for space %s. Stopping poll.', this.deepSpaceId);
        if (this._pollingFallbackTimer) clearTimeout(this._pollingFallbackTimer);
        this._pollingFallbackTimer = undefined;
    this._intervalCount = 0;
        return;
      }
      
      try {
        // Re-fetch data directly to compare using Hasyx select
        const dbLinks = await this.hasyx.select({
            table: 'deep_links',
            where: { _deep: { _eq: this.deepSpaceId } },
            returning: ['id', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at', '_i']
        });
        // Pass the raw query result (expected to be an array of links) to _handleSubscriptionData
        // _handleSubscriptionData expects an object like { deep_links: [...] }
        this._handleSubscriptionData({ deep_links: dbLinks });

    } catch (error) {
        debug('Polling: Error during load for space %s: %s', this.deepSpaceId, (error as Error).message);
    }

    if (this._pollingFallbackTimer) { 
       this._pollingFallbackTimer = setTimeout(() => this._poll(), this._subscribeInterval);
    }
  }


  private _startPollingFallback(initialCallback: (dump: StorageDump) => void): void {
    debug('Starting polling fallback for space %s.', this.deepSpaceId);
    if (!this._subscriptionCallbacks.has(initialCallback)) {
        this._subscriptionCallbacks.add(initialCallback);
    }

    if (this._pollingFallbackTimer) {
      clearTimeout(this._pollingFallbackTimer);
    }
    this._intervalCount = 0; 
    this._poll(); 
  }

  destroy(): void {
    debug('Destroying StorageHasyxDump for deepSpaceId: %s', this.deepSpaceId);
    
    if (this._hasyxSubscription && typeof this._hasyxSubscription.unsubscribe === 'function') {
      try {
        this._hasyxSubscription.unsubscribe();
      } catch (unsubError: any) {
        debug('Error during Hasyx subscription.unsubscribe() in destroy for space %s: %s', this.deepSpaceId, unsubError.message);
      }
      }
      this._hasyxSubscription = undefined;

    if (this._pollingFallbackTimer) {
      clearTimeout(this._pollingFallbackTimer);
      this._pollingFallbackTimer = undefined;
    }
    
    this._subscriptionCallbacks.clear();
    globalSubscriptions.delete(this);
    debug('Removed from global subscriptions tracking (total: %d) for space %s', globalSubscriptions.size, this.deepSpaceId);
    debug('StorageHasyxDump destroyed for space %s', this.deepSpaceId);
  }
}

export function newStorageHasyx(deep: any) {
  debug('Initializing StorageHasyx');
  
  const StorageHasyx = new deep.Function(function StorageHasyx(this: any, options: {
    hasyx: Hasyx;
    deepSpaceId: string;
    dump?: StorageDump;
    storageHasyxDump?: StorageHasyxDump;
    strategy?: 'subscription' | 'delta';
    storage?: any; // Add optional storage parameter
  }) {
    debug('Creating StorageHasyx with strategy: %s', options.strategy || 'subscription');
    
    // Validate required parameters
    if (!options.hasyx) {
      throw new Error('hasyx client instance is required for StorageHasyx');
    }
    if (!options.deepSpaceId) {
      throw new Error('deepSpaceId is required for StorageHasyx');
    }
    
    const { dump, hasyx, deepSpaceId, storageHasyxDump: providedStorageHasyxDump, strategy = 'subscription', storage: providedStorage } = options;
    
    if (!['subscription', 'delta'].includes(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    // Use provided storage or create new one
    const storage = providedStorage || new deep.Storage();
    
    debug('Storage %s with ID: %s', providedStorage ? 'reused' : 'created', storage._id);
    
    // Create or use provided StorageHasyxDump
    const storageHasyxDump = providedStorageHasyxDump || new StorageHasyxDump(hasyx, deepSpaceId, dump);
    
    // Handle initial dump or generate new one
    debug('🔍 Checking dump parameter: %o', dump);
    debug('🔍 Dump is truthy: %s', !!dump);
    debug('🔍 Dump is undefined: %s', dump === undefined);
    debug('🔍 Dump is null: %s', dump === null);
    
    if (dump) {
      debug('✅ Using provided dump with %d links', dump.links.length);
      storage.state.dump = dump;
      // Apply dump to deep instance using existing function
      storage.promise = storage.promise.then(() => {
        debug('🔄 Applying provided dump to deep instance');
        deep.__isStorageEvent = storage._id;
        _applySubscription(deep, dump, storage);
        return Promise.resolve(true);
      });
    } else {
      debug('✅ NO dump provided - generating initial dump and saving');
      // Generate dump and save to storageHasyxDump
      storage.promise = storage.promise.then(() => {
        debug('📊 About to generate dump...');
        const dump = storage.state.generateDump();
        debug('📄 Generated dump with %d links', dump.links.length);
        storage.state.dump = dump;
        debug('💾 About to save dump to hasyx database...');
        return storageHasyxDump.save(dump).then(() => {
          debug('✅ Successfully saved dump to hasyx database');
        });
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
    
    // Start watching for events (this should trigger the Storage Alive function to start listening)
    if (typeof storage.state.watch === 'function') {
      storage.state.watch();
    }
    
    // Set up storage -> local synchronization based on strategy
    if (strategy === 'subscription') {
      debug('Setting up subscription strategy');
      storage.promise = storage.promise.then(async () => {
        const unsubscribe = await storageHasyxDump.subscribe((nextDump) => {
          debug('Subscription received dump with %d links', nextDump.links.length);
          deep.__isStorageEvent = storage._id;
          _applySubscription(deep, nextDump, storage);
        });
        
        // Store unsubscribe function for cleanup
        storage.state._unsubscribe = unsubscribe;
        
        return Promise.resolve(true);
      });
    } else if (strategy === 'delta') {
      storage.promise = storage.promise.then(() => {
        storageHasyxDump._onDelta = (delta) => {
          debug('Delta received: %s for %s', delta.operation, delta.id || delta.link?._id);
          deep.__isStorageEvent = storage._id;
          _applyDelta(deep, delta, storage);
        };
        
        return Promise.resolve(true);
      });
    }
    
    // Set up cleanup handler
    storage.state.onDestroy = () => {
      debug('Storage cleanup initiated for %s', storage._id);
      storage?.state?._unsubscribe();
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