// Local storage implementation for Deep Framework
// Provides StorageLocalDump class and StorageLocal function for testing and development
// Uses _delay from _promise.ts to simulate asynchronous operations

import { _delay } from './_promise';
import { StorageDump, StorageLink, StorageDelta, _applyDelta, _applySubscription } from './storage';
import Debug from './debug';

const debug = Debug('storage:local');

/**
 * StorageLocalDump - simulates external storage with configurable delays
 * All operations use _delay to simulate real-world asynchronous behavior
 */
export class StorageLocalDump {
  dump: StorageDump = { links: [] };
  
  // Configurable delays for different operations
  _saveDaly: number = 100; // Typo preserved from original specification
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
  
  // Subscription management
  private _subscriptionCallbacks: Set<(dump: StorageDump) => void> = new Set();
  private _subscriptionTimer: NodeJS.Timeout | undefined;
  private _lastDumpJson: string = '';

  constructor(initialDump?: StorageDump, defaultIntervalMaxCount: number = 30) {
    debug('Creating StorageLocalDump with maxCount=%d', defaultIntervalMaxCount);
    
    if (initialDump) {
      this.dump = initialDump;
      debug('Initialized with dump containing %d links', initialDump.links.length);
    }
    
    this._defaultIntervalMaxCount = defaultIntervalMaxCount;
    this._lastDumpJson = JSON.stringify(this.dump);
  }

  /**
   * Save dump with configurable delay
   */
  async save(dump: StorageDump): Promise<void> {
    debug('save() called with %d links, delay=%dms', dump.links.length, this._saveDaly);
    await _delay(this._saveDaly);
    this.dump = dump;
    debug('save() completed');
  }

  /**
   * Load dump with configurable delay
   */
  async load(): Promise<StorageDump> {
    debug('load() called, delay=%dms', this._loadDelay);
    await _delay(this._loadDelay);
    debug('load() completed with %d links', this.dump.links.length);
    return this.dump;
  }

  /**
   * Insert link with configurable delay
   */
  async insert(link: StorageLink): Promise<void> {
    debug('insert() called for link %s, delay=%dms', link._id, this._insertDelay);
    await _delay(this._insertDelay);
    
    // Check if link already exists
    const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
    if (existingIndex !== -1) {
      throw new Error(`Link with id ${link._id} already exists`);
    }
    
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
    
    // Find and remove link
    const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
    if (existingIndex === -1) {
      throw new Error(`Link with id ${link._id} not found`);
    }
    
    this.dump.links.splice(existingIndex, 1);
    debug('delete() completed for link %s', link._id);
    
    // Call delta callback if set
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
    
    // Find and update link
    const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
    if (existingIndex === -1) {
      throw new Error(`Link with id ${link._id} not found`);
    }
    
    this.dump.links[existingIndex] = link;
    debug('update() completed for link %s', link._id);
    
    // Call delta callback if set
    if (this._onDelta) {
      this._onDelta({ operation: 'update', id: link._id, link });
    }
  }

  /**
   * Subscribe to changes with polling and auto-stop
   */
  async subscribe(callback: (dump: StorageDump) => void): Promise<() => void> {
    debug('subscribe() called');
    
    this._subscriptionCallbacks.add(callback);
    
    // Start polling if this is the first subscriber
    if (this._subscriptionCallbacks.size === 1) {
      this._startPolling();
    }
    
    // Return unsubscribe function
    return () => {
      debug('unsubscribe() called');
      this._subscriptionCallbacks.delete(callback);
      
      // Stop polling if no more subscribers
      if (this._subscriptionCallbacks.size === 0) {
        this._stopPolling();
      }
    };
  }

  /**
   * Start polling for changes
   */
  private _startPolling(): void {
    debug('Starting polling with interval %dms, maxCount=%d', this._subscribeInterval, this._defaultIntervalMaxCount);
    this._intervalCount = 0; // Reset counter when starting
    this._subscriptionTimer = setInterval(() => {
      this._checkForChanges();
    }, this._subscribeInterval);
  }

  /**
   * Stop polling for changes
   */
  private _stopPolling(): void {
    if (this._subscriptionTimer) {
      debug('Stopping polling after %d intervals', this._intervalCount);
      clearInterval(this._subscriptionTimer);
      this._subscriptionTimer = undefined;
      this._intervalCount = 0; // Reset counter when stopping
    }
  }

  /**
   * Check for changes and notify subscribers
   */
  private _checkForChanges(): void {
    this._intervalCount++;
    debug('Checking for changes (interval %d/%d)', this._intervalCount, this._defaultIntervalMaxCount);
    
    // Auto-stop if max count reached (unless disabled with 0)
    if (this._defaultIntervalMaxCount > 0 && this._intervalCount >= this._defaultIntervalMaxCount) {
      debug('Auto-stopping polling after %d intervals', this._intervalCount);
      this._stopPolling();
      return;
    }
    
    const currentDumpJson = JSON.stringify(this.dump);
    
    if (currentDumpJson !== this._lastDumpJson) {
      debug('Changes detected, notifying %d subscribers', this._subscriptionCallbacks.size);
      this._lastDumpJson = currentDumpJson;
      
      const dumpCopy = JSON.parse(currentDumpJson);
      for (const callback of this._subscriptionCallbacks) {
        try {
          callback(dumpCopy);
        } catch (error) {
          debug('Error in subscription callback:', error);
        }
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    debug('destroy() called');
    this._stopPolling();
    this._subscriptionCallbacks.clear();
    this._onDelta = undefined;
  }
}

/**
 * Create StorageLocal function for deep context
 */
export function newStorageLocal(deep: any) {
  debug('Initializing StorageLocal');
  
  const StorageLocal = new deep.Function(function(this: any, options: {
    dump?: StorageDump;
    storageLocalDump: StorageLocalDump;
    strategy: 'subscription' | 'delta';
    storage?: any; // Add optional storage parameter
  }) {
    debug('Creating StorageLocal with strategy: %s', options.strategy);
    
    // Validate required parameters
    if (!options.storageLocalDump || !(options.storageLocalDump instanceof StorageLocalDump)) {
      throw new Error('storageLocalDump must be a StorageLocalDump instance');
    }
    
    const { dump, storageLocalDump, strategy, storage: providedStorage } = options;
    
    if (!['subscription', 'delta'].includes(strategy)) {
      throw new Error(`Unknown strategy: ${strategy}`);
    }
    
    // Use provided storage or create new one
    const storage = providedStorage || new deep.Storage();
    
    debug('Storage %s with ID: %s', providedStorage ? 'reused' : 'created', storage._id);
    
    // Handle initial dump or generate new one
    if (dump) {
      debug('Using provided dump with %d links', dump.links.length);
      storage.state.dump = dump;
      // Apply dump to deep instance using existing function
      storage.promise = storage.promise.then(() => {
        _applySubscription(deep, dump, storage);
        return Promise.resolve(true);
      });
    } else {
      debug('Generating initial dump');
      // Generate dump and save to storageLocalDump
      storage.promise = storage.promise.then(() => {
        const dump = storage.state.generateDump();
        storage.state.dump = dump;
        return storageLocalDump.save(dump);
      });
    }
    
    // Set up local -> storage synchronization using storage.state event handlers
    // These will be called by the Storage Alive function when events occur
    storage.state.onLinkInsert = (storageLink: StorageLink) => {
      debug('onLinkInsert called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageLocalDump.insert(storageLink));
    };
    
    storage.state.onLinkDelete = (storageLink: StorageLink) => {
      debug('onLinkDelete called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageLocalDump.delete(storageLink));
    };
    
    storage.state.onLinkUpdate = (storageLink: StorageLink) => {
      debug('onLinkUpdate called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageLocalDump.update(storageLink));
    };
    
    storage.state.onDataChanged = (storageLink: StorageLink) => {
      debug('onDataChanged called for %s', storageLink._id);
      storage.promise = storage.promise.then(() => storageLocalDump.update(storageLink));
    };
    
    // Start watching for events (this should trigger the Storage Alive function to start listening)
    if (typeof storage.state.watch === 'function') {
      storage.state.watch();
    }
    
    // Set up storage -> local synchronization based on strategy
    if (strategy === 'subscription') {
      debug('Setting up subscription strategy');
      storage.promise = storage.promise.then(async () => {
        const unsubscribe = await storageLocalDump.subscribe((nextDump) => {
          debug('Subscription received dump with %d links', nextDump.links.length);
          _applySubscription(deep, nextDump, storage);
        });
        
        // Store unsubscribe function for cleanup
        storage.state._unsubscribe = unsubscribe;
        
        return Promise.resolve(true);
      });
    } else if (strategy === 'delta') {
      storage.promise = storage.promise.then(() => {
        storageLocalDump._onDelta = (delta) => {
          debug('Delta received: %s for %s', delta.operation, delta.id || delta.link?._id);
          _applyDelta(deep, delta, storage);
        };
        
        return Promise.resolve(true);
      });
    }
    
    // Set up cleanup handler
    storage.state.onDestroy = () => {
      debug('Storage cleanup initiated for %s', storage._id);
      
      // Cleanup subscription
      if (typeof storage.state._unsubscribe === 'function') {
        storage.state._unsubscribe();
        storage.state._unsubscribe = undefined;
      }
      
      // Cleanup delta callback
      if (storageLocalDump._onDelta) {
        storageLocalDump._onDelta = undefined;
      }
      
      debug('StorageLocal cleanup completed');
    };
    
    debug('StorageLocal created successfully');
    return storage;
  });
  
  // Register StorageLocal in deep context
  deep._context.StorageLocal = StorageLocal;
  
  return StorageLocal;
} 