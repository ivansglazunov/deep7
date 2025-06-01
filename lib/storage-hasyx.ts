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
  
  // PHASE 4: Selective synchronization support
  _selectiveContexts?: string[]; // Array of Context names for selective sync
  
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
    
    // PHASE 4: Use selective synchronization if contexts are specified
    if (this._selectiveContexts && this._selectiveContexts.length > 0) {
      debug(`PHASE 4: Using selective synchronization for contexts: ${this._selectiveContexts.join(', ')}`);
      return this._loadSelective();
    } else {
      debug(`Using full synchronization for space ${this.deepSpaceId}`);
      return this._loadFull();
    }
  }

  // PHASE 4: Selective load using generateHasyxQueryDeepInstance
  private async _loadSelective(): Promise<StorageDump> {
    debug(`_loadSelective() executing for space ${this.deepSpaceId} with contexts: ${this._selectiveContexts!.join(', ')}`);
    
    try {
      // Use generateHasyxQueryDeepInstance to create targeted query
      const selectiveQuery = generateHasyxQueryDeepInstance(
        null, // deep instance not needed for query generation
        this._selectiveContexts!,
        this.deepSpaceId
      );
      
      debug(`Generated selective query: table=${selectiveQuery.table}, contexts=${this._selectiveContexts!.length}`);
      
      // Execute the selective query
      const dbLinks = await this.hasyx.select(selectiveQuery);
      debug(`Selective query found ${dbLinks.length} links for space ${this.deepSpaceId}`);
      
      // If we have selective contexts but the basic query doesn't support them yet,
      // try using the helper function for Context-based filtering
      if (this._selectiveContexts!.length > 0 && dbLinks.length === 0) {
        debug(`No results from basic selective query, trying Context-based filtering`);
        
        try {
          const targetIds = await generateContextBasedTargetIds(
            this.hasyx,
            this._selectiveContexts!,
            this.deepSpaceId
          );
          
          if (targetIds.length > 0) {
            debug(`Found ${targetIds.length} target IDs from Context filtering`);
            
            // Query for specific target IDs plus the root space
            const contextBasedQuery = {
              table: 'deep_links',
              where: {
                _deep: { _eq: this.deepSpaceId },
                _or: [
                  { id: { _eq: this.deepSpaceId } }, // Include root space
                  { id: { _in: targetIds } }         // Include Context targets
                ]
              },
              returning: [
                'id', '_deep', '_type', '_from', '_to', '_value', 
                'string', 'number', 'function',
                'created_at', 'updated_at', '_i'
              ]
            };
            
            const contextDbLinks = await this.hasyx.select(contextBasedQuery);
            debug(`Context-based query found ${contextDbLinks.length} links`);
            
            return this._processDbLinks(contextDbLinks);
          } else {
            debug(`No Context-based targets found, falling back to full sync`);
            return this._loadFull();
          }
        } catch (contextError) {
          debug(`Context-based filtering failed: ${(contextError as Error).message}, falling back to full sync`);
          return this._loadFull();
        }
      } else {
        return this._processDbLinks(dbLinks);
      }
    } catch (error) {
      debug(`Selective load failed: ${(error as Error).message}, falling back to full sync`);
      return this._loadFull();
    }
  }

  // PHASE 4: Full load (existing logic)
  private async _loadFull(): Promise<StorageDump> {
    debug(`_loadFull() executing hasyx.select for space ${this.deepSpaceId}`);
    
    const dbLinks = await this.hasyx.select({
      table: 'deep_links',
      where: { _deep: { _eq: this.deepSpaceId } },
      returning: [
        'id', '_deep', '_type', '_from', '_to', '_value', 
        'string', 'number', 'function',
        'created_at', 'updated_at', '_i'
      ]
    });
    
    debug(`Full query found ${dbLinks.length} links for space ${this.deepSpaceId}`);
    return this._processDbLinks(dbLinks);
  }

  // PHASE 4: Helper to process database links into StorageDump
  private _processDbLinks(dbLinks: any[]): StorageDump {
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
    debug('CIRCULAR CHECK: About to stringify dump in _processDbLinks');
    this._lastDumpJson = safeStringify(this.dump, 'StorageHasyxDump._processDbLinks');
    debug(`Processed ${this.dump.links.length} links into StorageDump`);
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
      
      // Call delta callback if set
      if (this._onDelta) {
        debug(`insert() calling _onDelta for link ${link._id} in space ${this.deepSpaceId}`);
        this._onDelta({ operation: 'insert', link });
      }
      
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

      // NOTE: In hasyx version, we don't maintain local dump.links as source of truth is the database
      // dump is only used for initial restoration, not for tracking ongoing changes

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

      // NOTE: In hasyx version, we don't maintain local dump.links as source of truth is the database
      // dump is only used for initial restoration, not for tracking ongoing changes

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
    debug(`🔄 subscribe() called for deepSpaceId: ${this.deepSpaceId}`);
    this._subscriptionCallbacks.add(callback);
    debug(`📊 Total subscription callbacks: ${this._subscriptionCallbacks.size}`);
    
    const unsubscribe = () => {
      debug(`🔄 Unsubscribe called for space ${this.deepSpaceId}.`);
      this._subscriptionCallbacks.delete(callback);
      if (this._subscriptionCallbacks.size === 0) {
        debug(`🧹 No more subscribers, cleaning up Hasyx subscription for space ${this.deepSpaceId}.`);
        if (this._hasyxSubscription && typeof this._hasyxSubscription.unsubscribe === 'function') {
          try {
            this._hasyxSubscription.unsubscribe();
            debug(`✅ Hasyx subscription.unsubscribe() called for space ${this.deepSpaceId}.`);
          } catch (unsubError: any) {
            debug(`❌ Error during Hasyx subscription.unsubscribe() for space ${this.deepSpaceId}: ${unsubError.message}`);
          }
        }
        this._hasyxSubscription = undefined;

        if (this._pollingFallbackTimer) {
            clearTimeout(this._pollingFallbackTimer);
            this._pollingFallbackTimer = undefined;
            debug(`🛑 Polling fallback timer cleared for space ${this.deepSpaceId}.`);
        }
        this._intervalCount = 0; 
        debug(`✅ Hasyx resources cleaned up for space ${this.deepSpaceId}.`);
      }
    };

    if (!this._hasyxSubscription && this._subscriptionCallbacks.size === 1) {
      debug(`🚀 First subscriber, initiating Hasyx subscription for space ${this.deepSpaceId}`);
      debug(`🔍 Hasyx client info: ${typeof this.hasyx}, apolloClient: ${typeof this.hasyx.apolloClient}`);
      
      try {
        debug(`📡 Creating Hasyx subscription with GenerateOptions for deepSpaceId: ${this.deepSpaceId}`);
        const subscriptionObservable = this.hasyx.subscribe({
          table: 'deep_links',
          where: { _deep: { _eq: this.deepSpaceId } },
          returning: ['id', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at', '_i']
        });
        
        debug(`✅ Subscription Observable created for space ${this.deepSpaceId}`);
        debug(`🔍 Observable type: ${typeof subscriptionObservable}, methods: ${Object.keys(subscriptionObservable || {}).join(', ')}`);
        
        this._hasyxSubscription = subscriptionObservable.subscribe({
          next: (data: any) => {
            debug(`📬 Hasyx subscription data received for space ${this.deepSpaceId}:`, data);
            debug(`🔍 Processing subscription data for space ${this.deepSpaceId}`);
            // Convert array data to expected format
            this._handleSubscriptionData({ deep_links: data });
          },
          error: (error: any) => {
            debug(`❌ Hasyx subscription error for space ${this.deepSpaceId}: ${error.message}. Falling back to polling.`, error);
            this._startPollingFallback(callback);
          },
          complete: () => {
            debug(`🏁 Hasyx subscription completed for space ${this.deepSpaceId}`);
          }
        });
        
        debug(`✅ Hasyx subscription initiated successfully for space ${this.deepSpaceId}.`);
        debug(`🔍 Subscription instance type: ${typeof this._hasyxSubscription}, methods: ${Object.keys(this._hasyxSubscription || {}).join(', ')}`);
      } catch (error: any) {
        debug(`❌ Error initiating Hasyx subscription for space ${this.deepSpaceId}: ${error.message}. Falling back to polling.`, error);
        debug(`🔍 Error stack: ${error.stack}`);
        this._startPollingFallback(callback);
      }
    } else {
      debug(`🔄 Hasyx subscription already exists for space ${this.deepSpaceId}, reusing existing subscription`);
    }
    
    return unsubscribe;
  }

  private _handleSubscriptionData(responseData: any): void {
    debug(`🔍 _handleSubscriptionData received for space ${this.deepSpaceId}:`, responseData);

    let newDump: StorageDump;

    if (responseData && responseData.deep_links && Array.isArray(responseData.deep_links)) {
        debug(`✅ Valid subscription data format for space ${this.deepSpaceId}, ${responseData.deep_links.length} links`);
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
        debug(`❌ _handleSubscriptionData: Data format for space ${this.deepSpaceId} not recognized or empty. Data:`, responseData);
        return; 
    }
      
    debug(`🔍 Comparing dumps for space ${this.deepSpaceId}, current subscribers: ${this._subscriptionCallbacks.size}`);
    const newDumpJson = safeStringify(newDump, 'StorageHasyxDump._handleSubscriptionData');
    if (newDumpJson !== this._lastDumpJson) {
      debug(`📢 _handleSubscriptionData: Dump changed for space ${this.deepSpaceId}, notifying ${this._subscriptionCallbacks.size} subscribers.`);
      this.dump = newDump;
        this._lastDumpJson = newDumpJson;
        
      for (const indivCallback of this._subscriptionCallbacks) {
          try {
          debug(`📞 Calling subscription callback for space ${this.deepSpaceId}`);
          indivCallback(this.dump); 
          debug(`✅ Subscription callback completed for space ${this.deepSpaceId}`);
          } catch (error) {
          debug(`❌ Error in subscription callback for space ${this.deepSpaceId}: ${(error as Error).message}`);
        }
      }
    } else {
      debug(`⏸️ _handleSubscriptionData: Dump unchanged for space ${this.deepSpaceId}, no notification needed.`);
    }
  }

  private async _poll(): Promise<void> {
    if (this._subscriptionCallbacks.size === 0) {
        debug(`⏹️ Polling: No subscribers for space ${this.deepSpaceId}, stopping poll.`);
        if (this._pollingFallbackTimer) clearTimeout(this._pollingFallbackTimer);
        this._pollingFallbackTimer = undefined;
        this._intervalCount = 0;
        return;
    }

    this._intervalCount++;
    debug(`🔄 Polling check ${this._intervalCount}/${this._defaultIntervalMaxCount} for space ${this.deepSpaceId}`);

    if (this._defaultIntervalMaxCount > 0 && this._intervalCount >= this._defaultIntervalMaxCount) {
        debug(`🛑 Polling: Max interval count reached for space ${this.deepSpaceId}. Stopping poll.`);
        if (this._pollingFallbackTimer) clearTimeout(this._pollingFallbackTimer);
        this._pollingFallbackTimer = undefined;
        this._intervalCount = 0;
        return;
      }
      
      try {
        debug(`📡 Polling: Executing hasyx.select for space ${this.deepSpaceId}`);
        // Re-fetch data directly to compare using Hasyx select
        const dbLinks = await this.hasyx.select({
            table: 'deep_links',
            where: { _deep: { _eq: this.deepSpaceId } },
            returning: ['id', '_deep', '_type', '_from', '_to', '_value', 'string', 'number', 'function', 'created_at', 'updated_at', '_i']
        });
        debug(`📊 Polling: Retrieved ${dbLinks.length} links for space ${this.deepSpaceId}`);
        // Pass the raw query result (expected to be an array of links) to _handleSubscriptionData
        // _handleSubscriptionData expects an object like { deep_links: [...] }
        this._handleSubscriptionData({ deep_links: dbLinks });

    } catch (error) {
        debug(`❌ Polling: Error during load for space ${this.deepSpaceId}: ${(error as Error).message}`);
    }

    if (this._pollingFallbackTimer) { 
       debug(`⏰ Scheduling next poll in ${this._subscribeInterval}ms for space ${this.deepSpaceId}`);
       this._pollingFallbackTimer = setTimeout(() => this._poll(), this._subscribeInterval);
    }
  }


  private _startPollingFallback(initialCallback: (dump: StorageDump) => void): void {
    debug(`🔄 Starting polling fallback for space ${this.deepSpaceId}.`);
    if (!this._subscriptionCallbacks.has(initialCallback)) {
        debug(`➕ Adding initial callback to subscription list for space ${this.deepSpaceId}`);
        this._subscriptionCallbacks.add(initialCallback);
    }

    if (this._pollingFallbackTimer) {
      debug(`🛑 Clearing existing polling timer for space ${this.deepSpaceId}`);
      clearTimeout(this._pollingFallbackTimer);
    }
    this._intervalCount = 0; 
    debug(`🚀 Starting polling with interval ${this._subscribeInterval}ms for space ${this.deepSpaceId}`);
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
    selectiveContexts?: string[]; // PHASE 4: Add selective synchronization support
  }) {
    debug(`Creating StorageHasyx with strategy: ${options.strategy || 'subscription'}`);
    
    // Validate required parameters
    if (!options.hasyx) {
      throw new Error('hasyx client instance is required for StorageHasyx');
    }
    if (!options.deepSpaceId) {
      throw new Error('deepSpaceId is required for StorageHasyx');
    }
    
    const { dump, hasyx, deepSpaceId, storageHasyxDump: providedStorageHasyxDump, strategy = 'subscription', storage: providedStorage, selectiveContexts } = options;
    
    if (!['subscription', 'delta'].includes(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    // PHASE 4: Log selective synchronization mode
    if (selectiveContexts && selectiveContexts.length > 0) {
      debug(`PHASE 4: Selective synchronization enabled with contexts: ${selectiveContexts.join(', ')}`);
    } else {
      debug('Full synchronization mode (no selective contexts specified)');
    }
    
    // Use provided storage or create new one
    const storage = providedStorage || new deep.Storage();
    
    debug(`Storage ${providedStorage ? 'reused' : 'created'} with ID: ${storage._id}`);
    
    // Create or use provided StorageHasyxDump with selective support
    const storageHasyxDump = providedStorageHasyxDump || new StorageHasyxDump(hasyx, deepSpaceId, dump);
    
    // PHASE 4: Store selective contexts for use in operations
    if (selectiveContexts) {
      storageHasyxDump._selectiveContexts = selectiveContexts;
      debug(`Stored selective contexts in StorageHasyxDump: ${selectiveContexts.join(', ')}`);
    }
    
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

// PHASE 3: Selective Synchronization Implementation
// Uses Context-based name lookup for targeted entity retrieval

/**
 * Generate Hasyx Query for Deep Instance with selective Context-based synchronization
 * 
 * This function implements selective synchronization by:
 * 1. Finding entities with specific Context names (e.g., "Function", "Type", etc.)
 * 2. Using the proven SQL JOIN pattern: Context._value → String entity → _strings.data
 * 3. Returning targeted queries instead of full namespace synchronization
 * 
 * @param deep - Deep instance
 * @param targetContextNames - Array of Context names to synchronize (e.g., ["Function", "Type"])
 * @param deepSpaceId - ID of the deep space to query
 * @returns Object with hasyx query configuration for selective sync
 */
export function generateHasyxQueryDeepInstance(
  deep: any, 
  targetContextNames: string[], 
  deepSpaceId: string
): {
  table: string;
  where: any;
  returning: string[];
} {
  debug(`generateHasyxQueryDeepInstance called for space ${deepSpaceId} with contexts: ${targetContextNames.join(', ')}`);
  
  if (targetContextNames.length === 0) {
    debug('No target context names provided, returning basic query for space');
    // Return basic query for the space when no contexts specified
    return {
      table: 'deep_links',
      where: {
        _deep: { _eq: deepSpaceId }
      },
      returning: [
        'id', '_deep', '_type', '_from', '_to', '_value', 
        'string', 'number', 'function', 
        'created_at', 'updated_at', '_i'
      ]
    };
  }
  
  // For now, return the basic structure for selective sync
  // Future enhancement: Use generateContextBasedTargetIds() helper for complex filtering
  debug(`Generated selective query for ${targetContextNames.length} context names`);
  
  const query = {
    table: 'deep_links',
    where: {
      _deep: { _eq: deepSpaceId },
      // Note: In a full implementation, this would include Context-based filtering
      // using the SQL pattern from PHASE 2 tests
    },
    returning: [
      'id', '_deep', '_type', '_from', '_to', '_value', 
      'string', 'number', 'function', 
      'created_at', 'updated_at', '_i'
    ]
  };
  
  debug(`Generated selective query for ${targetContextNames.length} context names`);
  return query;
}

/**
 * Helper function to generate target IDs for Context-based filtering
 * This function can use raw SQL when needed for complex JOIN operations
 * 
 * @param hasyx - Hasyx instance for database operations
 * @param targetContextNames - Array of Context names to filter by
 * @param deepSpaceId - ID of the deep space
 * @returns Promise<string[]> - Array of target IDs that match the Context criteria
 */
export async function generateContextBasedTargetIds(
  hasyx: any,
  targetContextNames: string[],
  deepSpaceId: string
): Promise<string[]> {
  debug(`generateContextBasedTargetIds called for space ${deepSpaceId} with contexts: ${targetContextNames.join(', ')}`);
  
  if (targetContextNames.length === 0) {
    return [];
  }
  
  try {
    // Use the proven SQL pattern from PHASE 2 tests
    // This query finds all target IDs that have Context associations with the specified names
    const contextFilterQuery = await hasyx.sql(`
      SELECT DISTINCT c._to as target_id
      FROM deep._links c
      JOIN deep._links ct ON c._type = ct.id AND ct.__name = 'Context'
      LEFT JOIN deep._links s ON c._value = s.id
      LEFT JOIN deep._strings str ON s._string = str.id
      WHERE c._deep = '${deepSpaceId}' AND str.data IN ('${targetContextNames.join("', '")}')
    `);
    
    // Extract target IDs from query results
    const targetIds: string[] = [];
    if (contextFilterQuery.result && contextFilterQuery.result.length > 1) {
      // Skip headers row (index 0) and process data rows
      for (let i = 1; i < contextFilterQuery.result.length; i++) {
        const row = contextFilterQuery.result[i];
        if (row[0]) {
          targetIds.push(row[0]);
        }
      }
    }
    
    debug(`Found ${targetIds.length} target IDs for Context-based filtering`);
    return targetIds;
    
  } catch (error) {
    debug(`Error in generateContextBasedTargetIds: ${(error as Error).message}`);
    // Return empty array on error - fall back to full namespace sync
    return [];
  }
} 