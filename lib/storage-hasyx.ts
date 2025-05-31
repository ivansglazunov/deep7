// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations

import { Hasyx } from 'hasyx';
import { _delay } from './_promise';
import Debug from './debug';
import { StorageDelta, StorageDump, StorageLink, _applySubscription, _applyDelta, wrapStorageOperation, _sortDump } from './storage';

const debug = Debug('storage:hasyx');

// Global subscription tracking to prevent test hangs
const globalSubscriptions = new Set<StorageHasyxDump>();

// Global cleanup function for tests
export function destroyAllSubscriptions(): void {
  debug(`🧹 Destroying all global hasyx subscriptions (${globalSubscriptions.size} instances)`);
  
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
 * Safe JSON.stringify with circular reference detection
 */
function safeStringify(obj: any, context: string): string {
  try {
    debug(`CIRCULAR CHECK: Attempting JSON.stringify in context: ${context}`);
    const result = JSON.stringify(obj);
    debug(`CIRCULAR CHECK: SUCCESS for context: ${context}`);
    return result;
  } catch (error: any) {
    debug(`CIRCULAR CHECK: ERROR in context ${context}: ${error.message}`);
    if (error.message.includes('circular')) {
      console.error('🔴 CIRCULAR REFERENCE DETECTED in context:', context);
      console.error('🔴 Object type:', typeof obj);
      console.error('🔴 Object keys:', obj && typeof obj === 'object' ? Object.keys(obj) : 'N/A');
      console.error('🔴 Stack trace:', error.stack);
      
      // Try to identify which part is circular
      if (obj && typeof obj === 'object' && obj.links && Array.isArray(obj.links)) {
        console.error(`🔴 Dump links count: ${obj.links.length}`);
        for (let i = 0; i < Math.min(obj.links.length, 3); i++) {
          try {
            JSON.stringify(obj.links[i]);
            console.error(`🔴 Link ${i} is OK`);
          } catch (linkError: any) {
            console.error(`🔴 Link ${i} has circular reference: ${linkError.message}`);
            if (obj.links[i]) {
              console.error('🔴 Problematic link keys:', Object.keys(obj.links[i]));
            }
          }
        }
      }
    }
    throw error;
  }
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
    debug(`Creating StorageHasyxDump with deepSpaceId: ${deepSpaceId}`);
    
    this.hasyx = hasyx;
    this.deepSpaceId = deepSpaceId; 
    
    if (initialDump) {
      this.dump = initialDump;
      debug(`Initialized with dump containing ${initialDump.links.length} links`);
    }
    
    debug('CIRCULAR CHECK: About to stringify initial dump in constructor');
    this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump constructor');
    globalSubscriptions.add(this);
    debug(`Added to global subscriptions tracking (total: ${globalSubscriptions.size})`);
  }

  async save(dump: StorageDump): Promise<void> {
    debug(`save() called for space ${this.deepSpaceId} with ${dump.links.length} links, delay=${this._saveDelay}ms`);
    
    debug('save() waiting for delay...');
    await _delay(this._saveDelay);
    debug('save() delay completed');
      
    debug(`save() clearing existing data for space: ${this.deepSpaceId}`);
    try {
      await this.hasyx.delete({
        table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } }
      });
      debug(`save() existing data cleared for space: ${this.deepSpaceId}`);
    } catch (error: any) {
      debug(`save() error clearing data: ${error.message}`);
      throw error;
    }
      
    if (dump.links.length > 0) {
      debug(`save() processing ${dump.links.length} links for space: ${this.deepSpaceId}`);
      
      // 🔥 CRITICAL FIX: Separate root link from other links
      const rootLink = dump.links.find(link => link._id === this.deepSpaceId && !link._type);
      const otherLinks = dump.links.filter(link => !(link._id === this.deepSpaceId && !link._type));
      
      debug(`save() found root link: ${rootLink ? 'YES' : 'NO'}, other links: ${otherLinks.length}`);
      
      // 🔥 STEP 1: Insert root link FIRST if it exists
      if (rootLink) {
        debug(`save() inserting ROOT link first: ${rootLink._id}`);
        
        const insertObject = {
          id: rootLink._id,
          _deep: rootLink._id, // root link: _deep = _id
          _type: null, // root link always has null _type
          _from: rootLink._from || null,
          _to: rootLink._to || null,
          _value: rootLink._value || null,
          string: rootLink._string || null,
          number: rootLink._number || null,
          function: rootLink._function || null,
          created_at: rootLink._created_at,
          updated_at: rootLink._updated_at,
          _i: rootLink._i || null
        };

        try {
          await this.hasyx.insert({
            table: 'deep_links',
            object: insertObject
          });
          debug(`✅ save() ROOT link inserted successfully: ${rootLink._id}`);
        } catch (error: any) {
          debug(`❌ save() ROOT link insertion failed: ${rootLink._id} - ${error.message}`);
          throw error;
        }
      }
      
      // 🔥 STEP 2: Sort and insert other links by dependencies
      if (otherLinks.length > 0) {
        debug(`save() sorting ${otherLinks.length} non-root links by dependencies`);
        const sortedLinks = _sortDump(otherLinks);
        debug(`save() dependency sorting completed, inserting ${sortedLinks.length} links sequentially`);
        
        // Insert non-root links one by one in dependency order
        for (let i = 0; i < sortedLinks.length; i++) {
          const link = sortedLinks[i];

          if (!link._type) {
            const errorMsg = `Non-root link ${link._id} has null _type but is not the root link (${this.deepSpaceId}).`;
            debug(errorMsg);
            throw new Error(errorMsg);
          }

          const insertObject = {
            id: link._id,
            _deep: this.deepSpaceId, // non-root links: _deep = deepSpaceId
            _type: link._type,
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

          debug(`save() inserting non-root link ${i + 1}/${sortedLinks.length}: ${link._id} (type: ${link._type})`);
          
          try {
            await this.hasyx.insert({
              table: 'deep_links',
              object: insertObject
            });
            debug(`✅ save() non-root link ${i + 1}/${sortedLinks.length} inserted successfully: ${link._id}`);
          } catch (error: any) {
            debug(`❌ save() non-root link ${i + 1}/${sortedLinks.length} insertion failed: ${link._id} - ${error.message}`);
            throw error;
          }
        }
        
        debug(`save() all ${sortedLinks.length} non-root links inserted successfully`);
      }
      
      debug(`save() all links inserted successfully into space: ${this.deepSpaceId} (root: ${rootLink ? 1 : 0}, other: ${otherLinks.length})`);
    } else {
      debug(`save() no links to insert into space: ${this.deepSpaceId}`);
    }
        
    this.dump = dump;
    debug('CIRCULAR CHECK: About to stringify dump in save()');
    this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump.save');
    debug(`save() completed for space ${this.deepSpaceId}`);
  }

  async load(): Promise<StorageDump> {
    debug(`load() called for space ${this.deepSpaceId}, delay=${this._loadDelay}ms`);
    await _delay(this._loadDelay);
    
    debug(`load() executing hasyx.select for space ${this.deepSpaceId}`);
      const dbLinks = await this.hasyx.select({
      table: 'deep_links',
        where: { _deep: { _eq: this.deepSpaceId } },
        returning: [
          'id', '_deep', '_type', '_from', '_to', '_value', 
        'string', 'number', 'function',
          'created_at', 'updated_at', '_i'
        ]
      });
      
    debug(`load() found ${dbLinks.length} links for space ${this.deepSpaceId}`);
    
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
    debug('CIRCULAR CHECK: About to stringify dump in load()');
    this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump.load');
    debug(`load() completed for space ${this.deepSpaceId} with ${this.dump.links.length} links`);
    return this.dump;
  }

  async insert(link: StorageLink): Promise<void> {
    debug(`insert() called for link ${link._id} with _type=${link._type} in space ${this.deepSpaceId}`);
    await _delay(this._insertDelay);
    
    const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
    const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

    if (!link._type && link._id !== this.deepSpaceId) {
      const errorMsg = `Cannot insert link with null _type and id (${link._id}) that does not match deepSpaceId (${this.deepSpaceId}).`;
      debug(errorMsg);
      throw new Error(errorMsg);
    }
    
    const insertObject = {
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
    
    debug(`insert() attempting hasyx.insert for ${link._id} with object:`, insertObject);
    
    try {
      const result = await this.hasyx.insert({
        table: 'deep_links',
        object: insertObject
      });
      debug(`✅ insert() SUCCESS for ${link._id}:`, result);
      return result;
    } catch (error: any) {
      debug(`❌ insert() FAILED for ${link._id}: ${error.message}`);
      debug(`❌ insert() ERROR STACK: ${error.stack}`);
      debug('❌ insert() FAILING OBJECT:', insertObject);
      throw error; 
    }
  }

  async delete(link: StorageLink): Promise<void> {
    debug(`delete() called for link ${link._id} in space ${this.deepSpaceId}, delay=${this._deleteDelay}ms`);
    await _delay(this._deleteDelay);
    
    const isRootLinkEquivalent = link._id === this.deepSpaceId && !link._type;
    const _deepValue = isRootLinkEquivalent ? link._id : this.deepSpaceId;

    debug(`delete() attempting to delete link ${link._id} from _deep space ${_deepValue}`);

    try {
    const result = await this.hasyx.delete({
      table: 'deep_links',
        where: { id: { _eq: link._id }, _deep: { _eq: _deepValue } } 
    });
      debug(`delete() successful for link ${link._id} in space ${this.deepSpaceId}: affected_rows ${result.affected_rows}`);
      
    if (result.affected_rows === 0) {
        const errorMsg = `Link with id ${link._id} not found for deletion in space ${_deepValue}`;
        debug(`delete() error: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
      if (existingIndex !== -1) {
        this.dump.links.splice(existingIndex, 1);
        debug('CIRCULAR CHECK: About to stringify dump in delete()');
        this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump.delete');
    } else {
        debug(`delete() warning: link ${link._id} not found in in-memory dump for deletion in space ${this.deepSpaceId}.`);
      }

    } catch (error: any) {
      debug(`delete() failed for link ${link._id} in space ${this.deepSpaceId}: ${error.message}`);
      throw error; 
    }
    
    if (this._onDelta) {
      debug(`delete() calling _onDelta for link ${link._id} in space ${this.deepSpaceId}`);
      this._onDelta({ operation: 'delete', id: link._id });
    }
  }

  async update(link: StorageLink): Promise<void> {
    debug(`update() called for link ${link._id} in space ${this.deepSpaceId}, delay=${this._updateDelay}ms`);
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
      debug(`update() successful for link ${link._id} in space ${this.deepSpaceId}: affected_rows ${result.affected_rows}`);
    
    if (result.affected_rows === 0) {
         const errorMsg = `Link with id ${link._id} not found for update in space ${_deepValue}`;
         debug(`update() error: ${errorMsg}`);
         throw new Error(errorMsg);
      }

      const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
      if (existingIndex !== -1) {
        this.dump.links[existingIndex] = link;
      } else {
        debug(`update() warning: link ${link._id} updated in DB but not found in in-memory dump for space ${this.deepSpaceId}.`);
        if (result.affected_rows > 0) { 
            this.dump.links.push(link); 
        }
      }
      debug('CIRCULAR CHECK: About to stringify dump in update()');
      this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump.update');

    } catch (error: any) {
      debug(`update() failed for link ${link._id} in space ${this.deepSpaceId}: ${error.message}`);
      throw error; 
    }
    
    if (this._onDelta) {
      debug(`update() calling _onDelta for link ${link._id} in space ${this.deepSpaceId}`);
      this._onDelta({ operation: 'update', id: link._id, link });
    }
  }

  async subscribe(callback: (dump: StorageDump) => void): Promise<() => void> {
    debug(`subscribe() called for deepSpaceId: ${this.deepSpaceId}`);
    this._subscriptionCallbacks.add(callback);
    
    const unsubscribe = () => {
      debug(`Unsubscribe called for space ${this.deepSpaceId}.`);
      this._subscriptionCallbacks.delete(callback);
      if (this._subscriptionCallbacks.size === 0) {
        debug(`No more subscribers, cleaning up Hasyx subscription for space ${this.deepSpaceId}.`);
        if (this._hasyxSubscription && typeof this._hasyxSubscription.unsubscribe === 'function') {
          try {
            this._hasyxSubscription.unsubscribe();
            debug(`Hasyx subscription.unsubscribe() called for space ${this.deepSpaceId}.`);
          } catch (unsubError: any) {
            debug(`Error during Hasyx subscription.unsubscribe() for space ${this.deepSpaceId}: ${unsubError.message}`);
          }
        }
        this._hasyxSubscription = undefined;

        if (this._pollingFallbackTimer) {
            clearTimeout(this._pollingFallbackTimer);
            this._pollingFallbackTimer = undefined;
            debug(`Polling fallback timer cleared for space ${this.deepSpaceId}.`);
        }
        this._intervalCount = 0; 
        debug(`Hasyx resources cleaned up for space ${this.deepSpaceId}.`);
      }
    };

    if (!this._hasyxSubscription && this._subscriptionCallbacks.size === 1) {
      debug(`First subscriber, initiating Hasyx subscription for space ${this.deepSpaceId}`);
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
            debug(`Hasyx subscription data for space ${this.deepSpaceId}:`, response);
            if (response && response.data) {
              this._handleSubscriptionData(response.data);
            } else if (response && response.errors) {
              debug(`Hasyx subscription error for space ${this.deepSpaceId}:`, response.errors);
            } else {
              debug(`Hasyx subscription - unexpected response structure for space ${this.deepSpaceId}:`, response);
            }
          },
          onError: (error: any) => {
            debug(`Hasyx subscription error for space ${this.deepSpaceId}: ${error.message}. Falling back to polling.`, error);
            this._startPollingFallback(callback);
          }
        });
        debug(`Hasyx subscription initiated successfully for space ${this.deepSpaceId}.`);
      } catch (error: any) {
        debug(`Error initiating Hasyx subscription for space ${this.deepSpaceId}: ${error.message}. Falling back to polling.`, error);
        this._startPollingFallback(callback);
      }
    }
    
    return unsubscribe;
  }

  private _handleSubscriptionData(responseData: any): void {
    debug(`_handleSubscriptionData received for space ${this.deepSpaceId}:`, responseData);

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
        debug(`_handleSubscriptionData: Data format for space ${this.deepSpaceId} not recognized or empty. Data:`, responseData);
        return; 
    }
      
      const newDumpJson = safeStringify(newDump, 'StorageHasyxDump._handleSubscriptionData');
    if (newDumpJson !== this._lastDumpJson) {
      debug(`_handleSubscriptionData: Dump changed for space ${this.deepSpaceId}, notifying subscribers.`);
      this.dump = newDump;
        this._lastDumpJson = newDumpJson;
        
      for (const indivCallback of this._subscriptionCallbacks) {
          try {
          indivCallback(this.dump); 
          } catch (error) {
          debug(`Error in subscription callback for space ${this.deepSpaceId}: ${(error as Error).message}`);
        }
      }
    } else {
      debug(`_handleSubscriptionData: Dump unchanged for space ${this.deepSpaceId}, no notification needed.`);
    }
  }

  private async _poll(): Promise<void> {
    if (this._subscriptionCallbacks.size === 0) {
        debug(`Polling: No subscribers for space ${this.deepSpaceId}, stopping poll.`);
        if (this._pollingFallbackTimer) clearTimeout(this._pollingFallbackTimer);
        this._pollingFallbackTimer = undefined;
        this._intervalCount = 0;
        return;
    }

    this._intervalCount++;
    debug(`Polling check for space ${this.deepSpaceId} (interval ${this._intervalCount}/${this._defaultIntervalMaxCount})`);

    if (this._defaultIntervalMaxCount > 0 && this._intervalCount >= this._defaultIntervalMaxCount) {
        debug(`Polling: Max interval count reached for space ${this.deepSpaceId}. Stopping poll.`);
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
        debug(`Polling: Error during load for space ${this.deepSpaceId}: ${(error as Error).message}`);
    }

    if (this._pollingFallbackTimer) { 
       this._pollingFallbackTimer = setTimeout(() => this._poll(), this._subscribeInterval);
    }
  }


  private _startPollingFallback(initialCallback: (dump: StorageDump) => void): void {
    debug(`Starting polling fallback for space ${this.deepSpaceId}.`);
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
    debug(`Destroying StorageHasyxDump for deepSpaceId: ${this.deepSpaceId}`);
    
    if (this._hasyxSubscription && typeof this._hasyxSubscription.unsubscribe === 'function') {
      try {
        this._hasyxSubscription.unsubscribe();
      } catch (unsubError: any) {
        debug(`Error during Hasyx subscription.unsubscribe() in destroy for space ${this.deepSpaceId}: ${unsubError.message}`);
      }
      }
      this._hasyxSubscription = undefined;

    if (this._pollingFallbackTimer) {
      clearTimeout(this._pollingFallbackTimer);
      this._pollingFallbackTimer = undefined;
    }
    
    this._subscriptionCallbacks.clear();
    globalSubscriptions.delete(this);
    debug(`Removed from global subscriptions tracking (total: ${globalSubscriptions.size}) for space ${this.deepSpaceId}`);
    debug(`StorageHasyxDump destroyed for space ${this.deepSpaceId}`);
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
    debug(`Creating StorageHasyx with strategy: ${options.strategy || 'subscription'}`);
    
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
    
    debug(`Storage ${providedStorage ? 'reused' : 'created'} with ID: ${storage._id}`);
    
    // Create or use provided StorageHasyxDump
    const storageHasyxDump = providedStorageHasyxDump || new StorageHasyxDump(hasyx, deepSpaceId, dump);
    
    // Set up cleanup handler
    storage.state.onDestroy = () => {
      debug(`Storage cleanup initiated for ${storage._id}`);
      storage?.state?._unsubscribe();
      storageHasyxDump.destroy();
      debug('StorageHasyx cleanup completed');
    };
    
    // ✅ CRITICAL FIX: Start watching for events BEFORE processing initial state
    // This ensures that events from defaultMarking() are captured
    if (typeof storage.state.watch === 'function') {
      storage.state.watch();
    }
    
    // Set up local -> storage synchronization using storage.state event handlers
    // These will be called by the Storage Alive function when events occur
    storage.state.onLinkInsert = (storageLink: StorageLink) => {
      debug(`onLinkInsert called for ${storageLink._id}`);
      storage.promise = storage.promise.then(() => 
        wrapStorageOperation(storage, () => storageHasyxDump.insert(storageLink))
      );
    };
    
    storage.state.onLinkDelete = (storageLink: StorageLink) => {
      debug(`onLinkDelete called for ${storageLink._id}`);
      storage.promise = storage.promise.then(() => 
        wrapStorageOperation(storage, () => storageHasyxDump.delete(storageLink))
      );
    };
    
    storage.state.onLinkUpdate = (storageLink: StorageLink) => {
      debug(`onLinkUpdate called for ${storageLink._id}`);
      storage.promise = storage.promise.then(() => 
        wrapStorageOperation(storage, () => storageHasyxDump.update(storageLink))
      );
    };
    
    storage.state.onDataChanged = (storageLink: StorageLink) => {
      debug(`onDataChanged called for ${storageLink._id}`);
      storage.promise = storage.promise.then(() => 
        wrapStorageOperation(storage, () => storageHasyxDump.update(storageLink))
      );
    };
    
    // Store options in storage.state for test access
    storage.state.hasyx = hasyx;
    storage.state.deepSpaceId = deepSpaceId;
    storage.state.strategy = strategy;
    storage.state.storageHasyxDump = storageHasyxDump;
    
    // Set up storage -> local synchronization based on strategy
    if (strategy === 'subscription') {
      debug('Setting up subscription strategy');
      storage.promise = storage.promise.then(async () => {
        const unsubscribe = await storageHasyxDump.subscribe((nextDump) => {
          debug(`Subscription received dump with ${nextDump.links.length} links`);
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
          debug(`Delta received: ${delta.operation} for ${delta.id || delta.link?._id}`);
          deep.__isStorageEvent = storage._id;
          _applyDelta(deep, delta, storage);
        };
        
        return Promise.resolve(true);
      });
    }
    
    // Handle initial dump or generate new one
    debug(`🔍 Checking dump parameter:`, dump);
    debug(`🔍 Dump is truthy: ${!!dump}`);
    debug(`🔍 Dump is undefined: ${dump === undefined}`);
    debug(`🔍 Dump is null: ${dump === null}`);
    
    if (dump) {
      debug(`✅ Using provided dump with ${dump.links.length} links - restoring from database`);
      storage.state.dump = dump;
      // Apply dump to deep instance using existing function
      storage.promise = storage.promise.then(() => {
        debug('🔄 Applying provided dump to deep instance');
        deep.__isStorageEvent = storage._id;
        _applySubscription(deep, dump, storage);
        return Promise.resolve(true);
      });
    } else {
      debug('✅ NO dump provided - generating initial dump and saving to database');
      // Follow storage-local/storage-json pattern: generate dump from existing associations and save
      storage.promise = storage.promise.then(() => {
        debug('🔄 Generating initial dump from existing deep associations');
        const initialDump = storage.state.generateDump();
        storage.state.dump = initialDump;
        debug(`📦 Generated dump with ${initialDump.links.length} links, saving to database`);
        return storageHasyxDump.save(initialDump);
      });
    }
    
    debug('StorageHasyx created successfully');
    return storage;
  });
  
  // Register StorageHasyx in deep context
  deep._context.StorageHasyx = StorageHasyx;
  
  return StorageHasyx;
} 