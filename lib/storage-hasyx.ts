// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations

import { Hasyx } from 'hasyx';
import { _delay } from './_promise';
import Debug from './debug';
import { StorageDelta, StorageDump, StorageLink, _applySubscription } from './storage';

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
    await _delay(this._saveDelay);
      
    debug('save() clearing existing data for space: %s', this.deepSpaceId);
      await this.hasyx.delete({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } }
      });
    debug('save() existing data cleared for space: %s', this.deepSpaceId);
      
    if (dump.links.length > 0) {
      debug('save() inserting %d links into space: %s', dump.links.length, this.deepSpaceId);
      const objectsToInsert = dump.links.map(link => {
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

      await this.hasyx.insert({
        table: 'deep_links',
        objects: objectsToInsert
      });
      debug('save() %d links inserted into space: %s', dump.links.length, this.deepSpaceId);
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
  const StorageHasyx = new deep.Function(function StorageHasyx(this: any, options: {
    hasyx: Hasyx;
    deepSpaceId: string;
    dump?: StorageDump;
    storageJsonDump?: StorageHasyxDump;
    strategy?: 'subscription' | 'delta';
    storage?: any;
  }) {
    debug('Creating StorageHasyx for space %s with options: %o', options.deepSpaceId, options);
    
    if (!options.hasyx) {
      throw new Error('hasyx client instance is required for StorageHasyx');
    }
    if (!options.deepSpaceId) {
      throw new Error('deepSpaceId is required for StorageHasyx');
    }
    
    const strategy = options.strategy || 'subscription';
    const storage = options.storage || new deep.Storage();
    
    const storageHasyxDump = options.storageJsonDump || new StorageHasyxDump(options.hasyx, options.deepSpaceId, options.dump);
    
    const _ensureEssentialTypes = async () => {
      debug('[EnsureTypes] Ensuring essential types exist in DB for space %s using provided deep instance', options.deepSpaceId);
      const essentialTypes = [
        { id: deep.Type._id, name: 'Type', type: deep.Type._id },
        { id: deep.String._id, name: 'String', type: deep.Type._id },
        { id: deep.Number._id, name: 'Number', type: deep.Type._id },
        { id: deep.Function._id, name: 'Function', type: deep.Type._id },
      ];
      const now = Date.now();

      debug('[EnsureTypes] Space ID: %s, deep.Type._id: %s', options.deepSpaceId, deep.Type._id);
      const typeTypeLink = {
        id: deep.Type._id,
        _deep: options.deepSpaceId,
        _type: deep.Type._id, 
        _string: 'Type',
        created_at: now,
        updated_at: now,
      };
      debug('[EnsureTypes] Attempting to insert/update deep.Type link: %o', typeTypeLink);
      try {
        const result = await (storageHasyxDump.hasyx.insert as any)({
            table: 'deep_links',
            object: typeTypeLink,
            on_conflict: { constraint: 'deep_links_pkey', update_columns: ['_deep', '_type', '_string', 'updated_at'] }
        });
        debug('[EnsureTypes] Result for deep.Type link: %o', result);
      } catch (error: any) {
         debug('Error ensuring Type type link %s in space %s (continuing): %s', typeTypeLink.id, options.deepSpaceId, error.message);
      }
      
      for (const essential of essentialTypes) {
        if (essential.id === deep.Type._id) continue;
        debug('[EnsureTypes] Essential type from list: %o', essential);

        const typeLink = {
          id: essential.id,
                _deep: options.deepSpaceId,
          _type: essential.type, 
          _string: essential.name,
          created_at: now,
          updated_at: now,
        };
        debug('[EnsureTypes] Attempting to insert/update essential type link (%s): %o', essential.name, typeLink);
        try {
          const result = await (storageHasyxDump.hasyx.insert as any)({
            table: 'deep_links',
            object: typeLink,
            on_conflict: { constraint: 'deep_links_pkey', update_columns: ['_deep', '_type', '_string', 'updated_at'] }
          });
          debug('[EnsureTypes] Result for %s link: %o', essential.name, result);
        } catch (error: any) {
          debug('Error ensuring essential type link %s (name: %s) in space %s (continuing): %s', essential.id, essential.name, options.deepSpaceId, error.message);
        }
      }
      debug('Essential types ensuring process completed for space %s', options.deepSpaceId);
    };

    const initializeStorage = async () => {
      let dumpApplied = false;
      // 1. Load existing dump first
      const existingDump = await storageHasyxDump.load();
      debug('Loaded existing Hasyx dump with %d links for space %s', existingDump.links.length, options.deepSpaceId);

      if (existingDump.links.length > 0) {
        debug('Applying existing Hasyx dump with %d links to deep instance for space %s', existingDump.links.length, options.deepSpaceId);
        deep.__isStorageEvent = storage._id;
        _applySubscription(deep, existingDump, storage);
        dumpApplied = true;
      }

      // 2. If options.dump was provided (newDeep restoration), apply it.
      // This could overwrite or add to what was loaded from existingDump if both were present (though unlikely scenario).
      if (options.dump) {
        debug('Applying provided initial dump with %d links to space %s (for newDeep restoration)', options.dump.links.length, options.deepSpaceId);
              deep.__isStorageEvent = storage._id;
        _applySubscription(deep, options.dump, storage);
        dumpApplied = true;
      }

      // 3. If DB was empty (no existingDump) AND no options.dump was applied, AND deep has data (e.g. from defaultMarking),
      // then this is the first run for this deep instance with this Hasyx space.
      // Save deep's current state to Hasyx.
      if (!dumpApplied && deep._ids.size > 1) { // deep._ids.size > 1 means more than just the root deep itself
        const currentDeepDump = storage.state.generateDump();
        debug('Initial save of current deep state with %d links to Hasyx space %s', currentDeepDump.links.length, options.deepSpaceId);
        if (currentDeepDump.links.length > 0) {
          await storageHasyxDump.save(currentDeepDump);
        }
      }

      // 4. FINALLY, ensure essential types exist (insert or update).
      // This runs last to ensure they are present regardless of previous operations (load, initial save).
      // await _ensureEssentialTypes(); // Temporarily commented out
    };

    storage.promise = initializeStorage();
    
    const createHandler = (operationName: string, DBOperation: (link: StorageLink) => Promise<any>) => {
      return async (link: StorageLink) => {
        debug('%s strategy: %s called for link %s in space %s', strategy, operationName, link._id, options.deepSpaceId);
        try {
          await storage.promise; 
          const opPromise = DBOperation(link);
          storage.promise = opPromise; 
          await opPromise;
        } catch (error) {
          debug('%s strategy: Error in %s for space %s, link %s: %s', strategy, operationName, options.deepSpaceId, link._id, (error as Error).message);
        }
      };
    };

    storage.state.onLinkInsert = createHandler('onLinkInsert', (link) => storageHasyxDump.insert(link));
    storage.state.onLinkDelete = createHandler('onLinkDelete', (link) => storageHasyxDump.delete(link));
    storage.state.onLinkUpdate = createHandler('onLinkUpdate', (link) => storageHasyxDump.update(link));
    storage.state.onDataChanged = createHandler('onDataChanged', (link) => storageHasyxDump.update(link));
    
    let unsubscribeFromHasyx: (() => void) | undefined;
    storageHasyxDump.subscribe((newDump: StorageDump) => {
      debug('Received external Hasyx dump update for space %s with %d links', options.deepSpaceId, newDump.links.length);
      deep.__isStorageEvent = storage._id;
      _applySubscription(deep, newDump, storage);
      debug('Applied external Hasyx dump to deep instance for space %s.', options.deepSpaceId);
    }).then(unsub => unsubscribeFromHasyx = unsub);
    
    storage.state.onDestroy = () => {
      debug('Cleaning up StorageHasyx resources for space %s', options.deepSpaceId);
      if (unsubscribeFromHasyx) {
        unsubscribeFromHasyx();
      }
      storageHasyxDump.destroy();
    };
    
    storage.state.watch();
    
    debug('StorageHasyx created successfully for space %s with %s strategy', options.deepSpaceId, strategy);
    return storage;
  });
  
  deep._context.StorageHasyx = StorageHasyx;
  return StorageHasyx;
} 