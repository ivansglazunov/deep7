// JSON file storage implementation for Deep Framework
// Provides StorageJsonDump class and StorageJson function for file-based persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and fs for file operations

import { _delay } from './_promise';
import { StorageDump, StorageLink, StorageDelta, _applyDelta, _applySubscription, wrapStorageOperation } from './storage';
import Debug from './debug';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const debug = Debug('storage:json');

/**
 * StorageJsonDump - JSON file-based storage with file watching and multi-process support
 * All operations use _delay to simulate real-world asynchronous behavior
 */
export class StorageJsonDump {
  filePath: string;
  dump: StorageDump = { links: [] };
  
  // Configurable delays for different operations
  _saveDaly: number = 100; // Typo preserved from original specification
  _loadDelay: number = 50;
  _insertDelay: number = 30;
  _deleteDelay: number = 30;
  _updateDelay: number = 30;
  _watchInterval: number = 200;
  
  // Interval auto-stop configuration
  _defaultIntervalMaxCount: number = 30;
  private _intervalCount: number = 0;
  
  // Delta callback for real-time updates
  public _onDelta: ((delta: StorageDelta) => void) | undefined;
  
  // File watching and subscription management
  private _fileWatcher: fs.FSWatcher | undefined;
  private _subscriptionCallbacks: Set<(dump: StorageDump) => void> = new Set();
  private _subscriptionTimer: NodeJS.Timeout | undefined;
  private _lastFileStats: fs.Stats | undefined;
  private _lastDumpJson: string = '';

  constructor(filePath: string, initialDump?: StorageDump, defaultIntervalMaxCount: number = 30) {
    debug('Creating StorageJsonDump with filePath=%s, maxCount=%d', filePath, defaultIntervalMaxCount);
    
    this.filePath = filePath;
    
    if (initialDump) {
      this.dump = initialDump;
      debug('Initialized with dump containing %d links', initialDump.links.length);
    }
    
    this._defaultIntervalMaxCount = defaultIntervalMaxCount;
    this._lastDumpJson = JSON.stringify(this.dump);
  }

  /**
   * Ensure file exists and create directory if needed
   */
  private async _ensureFileExists(): Promise<void> {
    const dir = path.dirname(this.filePath);
    
    // Create directory if it doesn't exist
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
    }
    
    // Create file if it doesn't exist
    if (!fs.existsSync(this.filePath)) {
      await fs.promises.writeFile(this.filePath, JSON.stringify({ links: [] }), 'utf8');
      debug('Created new JSON file at %s', this.filePath);
    }
  }

  /**
   * Perform atomic write operation using temporary file with retry logic
   */
  private async _atomicWrite(data: string): Promise<void> {
    const tempFile = this.filePath + '.tmp.' + Math.random().toString(36).substr(2, 9);
    let retries = 3;
    
    while (retries > 0) {
      try {
        await fs.promises.writeFile(tempFile, data, 'utf8');
        
        try {
          await fs.promises.rename(tempFile, this.filePath);
          debug('Atomic write completed to %s', this.filePath);
          return;
        } catch (renameError: any) {
          if (renameError.code === 'ENOENT') {
            // Target directory might not exist, ensure it exists and try again
            await this._ensureFileExists();
            await fs.promises.rename(tempFile, this.filePath);
            debug('Atomic write completed to %s (after ensuring directory)', this.filePath);
            return;
          } else {
            throw renameError;
          }
        }
      } catch (error: any) {
        retries--;
        debug('Atomic write failed, retries left: %d, error: %s', retries, error.message);
        
        // Clean up temp file if it exists
        try {
          if (fs.existsSync(tempFile)) {
            await fs.promises.unlink(tempFile);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        if (retries === 0) {
          throw error;
        }
        
        // Wait a bit before retry to avoid race conditions
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
      }
    }
  }

  /**
   * Save dump with configurable delay and atomic write
   */
  async save(dump: StorageDump): Promise<void> {
    debug('save() called with %d links, delay=%dms', dump.links.length, this._saveDaly);
    await _delay(this._saveDaly);
    
    await this._ensureFileExists();
    
    this.dump = dump;
    const jsonData = JSON.stringify(dump, null, 2);
    await this._atomicWrite(jsonData);
    
    // Update last known content to prevent false change detection
    this._lastDumpJson = jsonData;
    
    debug('save() completed');
  }

  /**
   * Load dump with configurable delay
   */
  async load(): Promise<StorageDump> {
    debug('load() called, delay=%dms', this._loadDelay);
    await _delay(this._loadDelay);
    
    await this._ensureFileExists();
    
    try {
      const content = await fs.promises.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content);
      this.dump = parsed;
      
      // Update last known content to prevent false change detection
      this._lastDumpJson = content;
      
      debug('load() completed with %d links', this.dump.links.length);
      return this.dump;
    } catch (error) {
      debug('Error loading JSON file: %s', (error as Error).message);
      throw new Error(`Failed to load JSON file: ${(error as Error).message}`);
    }
  }

  /**
   * Insert link with configurable delay and file update
   */
  async insert(link: StorageLink): Promise<void> {
    debug('insert() called for link %s, delay=%dms', link._id, this._insertDelay);
    await _delay(this._insertDelay);
    
    // Check if link already exists in memory
    const existingIndex = this.dump.links.findIndex(l => l._id === link._id);
    if (existingIndex !== -1) {
      throw new Error(`Link with id ${link._id} already exists`);
    }
    
    // For concurrent writes, read current file state before modifying
    await this._ensureFileExists();
    
    try {
      // Read current file content to handle concurrent modifications
      const currentContent = await fs.promises.readFile(this.filePath, 'utf8');
      const currentDump = JSON.parse(currentContent);
      
      // Check if link already exists in file
      const fileExistingIndex = currentDump.links.findIndex((l: StorageLink) => l._id === link._id);
      if (fileExistingIndex !== -1) {
        throw new Error(`Link with id ${link._id} already exists`);
      }
      
      // Add link to current file state
      currentDump.links.push(link);
      
      // Update both memory and file
      this.dump = currentDump;
      const jsonData = JSON.stringify(this.dump, null, 2);
      await this._atomicWrite(jsonData);
      
      // Update last known content to prevent false change detection
      this._lastDumpJson = jsonData;
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, create it with just this link
        this.dump.links.push(link);
        const jsonData = JSON.stringify(this.dump, null, 2);
        await this._atomicWrite(jsonData);
        this._lastDumpJson = jsonData;
      } else {
        throw error;
      }
    }
    
    debug('insert() completed for link %s', link._id);
    
    // Call delta callback if set
    if (this._onDelta) {
      this._onDelta({ operation: 'insert', link });
    }
    
    // Notify all subscribers of the change
    this._notifySubscribers();
  }

  /**
   * Delete link with configurable delay and file update
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
    
    // Update file
    await this._ensureFileExists();
    const jsonData = JSON.stringify(this.dump, null, 2);
    await this._atomicWrite(jsonData);
    
    // Update last known content to prevent false change detection
    this._lastDumpJson = jsonData;
    
    debug('delete() completed for link %s', link._id);
    
    // Call delta callback if set
    if (this._onDelta) {
      this._onDelta({ operation: 'delete', id: link._id });
    }
    
    // Notify all subscribers of the change
    this._notifySubscribers();
  }

  /**
   * Update link with configurable delay and file update
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
    
    // Update file
    await this._ensureFileExists();
    const jsonData = JSON.stringify(this.dump, null, 2);
    await this._atomicWrite(jsonData);
    
    // Update last known content to prevent false change detection
    this._lastDumpJson = jsonData;
    
    debug('update() completed for link %s', link._id);
    
    // Call delta callback if set
    if (this._onDelta) {
      this._onDelta({ operation: 'update', id: link._id, link });
    }
  }

  /**
   * Subscribe to file changes with file watching
   */
  async subscribe(callback: (dump: StorageDump) => void): Promise<() => void> {
    debug('subscribe() called');
    
    this._subscriptionCallbacks.add(callback);
    
    // Start file watching if this is the first subscriber
    if (this._subscriptionCallbacks.size === 1) {
      await this._startFileWatching();
    }
    
    // Return unsubscribe function
    return () => {
      debug('unsubscribe() called');
      this._subscriptionCallbacks.delete(callback);
      
      // Stop file watching if no more subscribers
      if (this._subscriptionCallbacks.size === 0) {
        this._stopFileWatching();
      }
    };
  }

  /**
   * Start file watching for external changes
   */
  private async _startFileWatching(): Promise<void> {
    debug('Starting file watching for %s with interval %dms, maxCount=%d', this.filePath, this._watchInterval, this._defaultIntervalMaxCount);
    
    await this._ensureFileExists();
    
    this._intervalCount = 0; // Reset counter when starting
    
    try {
      // Use fs.watch for file system events
      this._fileWatcher = fs.watch(this.filePath, (eventType, filename) => {
        if (eventType === 'change') {
          debug('File change detected: %s', eventType);
          this._onFileChanged();
        }
      });
      
      // Also use polling as backup
      this._subscriptionTimer = setInterval(() => {
        this._checkForChanges();
      }, this._watchInterval);
      
    } catch (error) {
      debug('Error starting file watcher: %s', (error as Error).message);
      // Fall back to polling only
      this._subscriptionTimer = setInterval(() => {
        this._checkForChanges();
      }, this._watchInterval);
    }
  }

  /**
   * Stop file watching
   */
  private _stopFileWatching(): void {
    debug('Stopping file watching after %d intervals', this._intervalCount);
    
    if (this._fileWatcher) {
      this._fileWatcher.close();
      this._fileWatcher = undefined;
    }
    
    if (this._subscriptionTimer) {
      clearInterval(this._subscriptionTimer);
      this._subscriptionTimer = undefined;
    }
    
    this._intervalCount = 0; // Reset counter when stopping
  }

  /**
   * Handle file change events
   */
  private _onFileChanged(): void {
    debug('File changed, checking for updates');
    this._checkForChanges();
  }

  /**
   * Check for file changes and notify subscribers
   */
  private _checkForChanges(): void {
    this._intervalCount++;
    debug('Checking for file changes (interval %d/%d)', this._intervalCount, this._defaultIntervalMaxCount);
    
    // Auto-stop if max count reached (unless disabled with 0)
    if (this._defaultIntervalMaxCount > 0 && this._intervalCount >= this._defaultIntervalMaxCount) {
      debug('Auto-stopping file watching after %d intervals', this._intervalCount);
      this._stopFileWatching();
      return;
    }
    
    // Check if file exists
    if (!fs.existsSync(this.filePath)) {
      debug('File does not exist, skipping change check');
      return;
    }
    
    try {
      // Read current file content
      const currentContent = fs.readFileSync(this.filePath, 'utf8');
      const currentDumpJson = currentContent;
      
      if (currentDumpJson !== this._lastDumpJson) {
        debug('File content changed, notifying subscribers');
        this._lastDumpJson = currentDumpJson;
        
        try {
          const newDump = JSON.parse(currentContent);
          this.dump = newDump;
          
          // Notify all subscribers
          for (const callback of this._subscriptionCallbacks) {
            try {
              callback(newDump);
            } catch (error) {
              debug('Error in subscription callback: %s', (error as Error).message);
            }
          }
        } catch (parseError) {
          debug('Error parsing JSON file: %s', (parseError as Error).message);
        }
      }
    } catch (error) {
      debug('Error checking for file changes: %s', (error as Error).message);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    debug('Destroying StorageJsonDump for %s', this.filePath);
    
    this._stopFileWatching();
    this._subscriptionCallbacks.clear();
    
    debug('StorageJsonDump destroyed');
  }

  /**
   * Notify all subscribers of a change
   */
  private _notifySubscribers(): void {
    for (const callback of this._subscriptionCallbacks) {
      callback(this.dump);
    }
  }
}

/**
 * Creates StorageJson function for Deep Framework
 * @param deep - Deep instance to attach storage to
 */
export function newStorageJson(deep: any) {
  // Create StorageJson function
  const StorageJson = new deep.Function(function(this: any, options: {
    filePath: string;
    dump?: StorageDump;
    storageJsonDump?: StorageJsonDump;
    strategy?: 'subscription' | 'delta';
    storage?: any; // Allow passing existing storage
  }) {
    debug('Creating StorageJson with options: %o', options);
    
    if (!options.filePath) {
      throw new Error('filePath is required for StorageJson');
    }
    
    const strategy = options.strategy || 'delta'; // Default to delta for JSON
    const storage = options.storage || new deep.Storage(); // Use provided storage or create new one
    
    // Create or use provided StorageJsonDump
    const storageJsonDump = options.storageJsonDump || new StorageJsonDump(options.filePath, options.dump);
    
    if (options.dump) {
      // If dump provided, newDeep was restored with corresponding IDs but dump not yet applied
      // Need to apply the entire dump using _applySubscription
      // No need to save back to storageJsonDump since we got this dump from there
      storage.promise = Promise.resolve().then(async () => {
        debug('Applying initial dump with %d links', options.dump!.links.length);
        deep.__isStorageEvent = storage._id;
        _applySubscription(deep, options.dump!, storage);
      });
    } else {
      // Check if file exists and load existing dump
      if (fs.existsSync(options.filePath)) {
        debug('Loading existing dump from file');
        storage.promise = storageJsonDump.load().then((existingDump) => {
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
              // Don't throw - continue with initialization, the dump will be applied later via file watching
            }
          }
          storage.state.dump = existingDump;
        });
      } else {
        // Generate initial dump and save to storage
        const dump = storage.state.generateDump();
        storage.state.dump = dump;
        storage.promise = storageJsonDump.save(dump);
      }
    }
    
    // Set up strategy-specific handlers
    if (strategy === 'delta') {
      debug('Setting up delta strategy handlers');
      
      // Delta strategy: handle individual operations with lifecycle protection
      storage.state.onLinkInsert = async (link: StorageLink) => {
        debug('onLinkInsert called for link %s', link._id);
        try {
          const insertPromise = wrapStorageOperation(storage, () => storageJsonDump.insert(link));
          storage.promise = storage.promise.then(() => insertPromise);
          await insertPromise;
        } catch (error) {
          debug('Error in onLinkInsert: %s', (error as Error).message);
        }
      };
      
      storage.state.onLinkDelete = async (link: StorageLink) => {
        debug('onLinkDelete called for link %s', link._id);
        try {
          const deletePromise = wrapStorageOperation(storage, () => storageJsonDump.delete(link));
          storage.promise = storage.promise.then(() => deletePromise);
          await deletePromise;
        } catch (error) {
          debug('Error in onLinkDelete: %s', (error as Error).message);
        }
      };
      
      storage.state.onLinkUpdate = async (link: StorageLink) => {
        debug('onLinkUpdate called for link %s', link._id);
        try {
          const updatePromise = wrapStorageOperation(storage, () => storageJsonDump.update(link));
          storage.promise = storage.promise.then(() => updatePromise);
          await updatePromise;
        } catch (error) {
          debug('Error in onLinkUpdate: %s', (error as Error).message);
        }
      };
      
      storage.state.onDataChanged = async (link: StorageLink) => {
        debug('onDataChanged called for link %s', link._id);
        try {
          const updatePromise = wrapStorageOperation(storage, () => storageJsonDump.update(link));
          storage.promise = storage.promise.then(() => updatePromise);
          await updatePromise;
        } catch (error) {
          debug('Error in onDataChanged: %s', (error as Error).message);
        }
      };
      
    } else if (strategy === 'subscription') {
      debug('Setting up subscription strategy handlers');
      
      // Subscription strategy: regenerate and save full dump on any change with lifecycle protection
      const saveFullDump = async () => {
        try {
          const currentDump = storage.state.generateDump();
          const savePromise = wrapStorageOperation(storage, () => storageJsonDump.save(currentDump));
          storage.promise = storage.promise.then(() => savePromise);
          await savePromise;
        } catch (error) {
          debug('Error saving full dump: %s', (error as Error).message);
        }
      };
      
      storage.state.onLinkInsert = saveFullDump;
      storage.state.onLinkDelete = saveFullDump;
      storage.state.onLinkUpdate = saveFullDump;
      storage.state.onDataChanged = saveFullDump;
    }
    
    // Set up file watching for external changes
    let unsubscribe: (() => void) | undefined;
    
    storageJsonDump.subscribe((newDump: StorageDump) => {
      debug('Received external dump update with %d links', newDump.links.length);
      
      // Apply changes from external source
      deep.__isStorageEvent = storage._id;
      _applySubscription(deep, newDump, storage);
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    
    // Set up cleanup on storage destruction
    storage.state.onDestroy = () => {
      debug('Cleaning up StorageJson resources');
      if (unsubscribe) {
        unsubscribe();
      }
      storageJsonDump.destroy();
    };
    
    // Start watching for events
    storage.state.watch();
    
    debug('StorageJson created successfully with %s strategy', strategy);
    return storage;
  });
  
  // Register StorageJson in deep context
  deep._context.StorageJson = StorageJson;
  
  return StorageJson;
} 