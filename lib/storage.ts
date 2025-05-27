import Debug from './debug';

const debug = Debug('storage');

// Core Storage System for Deep Framework
// Provides base Storage Alive class with event handlers and methods for storage implementations

/**
 * Storage dump interface for serialization and restoration
 */
export interface StorageDump {
  ids?: string[]; // identifiers for newDeep() restoration
  links: StorageLink[];
}

/**
 * Storage link interface representing an association in storage format
 */
export interface StorageLink {
  _id: string;
  _type: string; // only typed associations are stored, others are not material
  _from?: string;
  _to?: string;
  _value?: string;
  _created_at: number;
  _updated_at: number;
  _i?: number; // sequence number, auto-assigned by StorageLocalDump on insert if not specified, immutable on update
  _function?: string;
  _number?: number;
  _string?: string;
}

/**
 * Delta operation for incremental updates
 */
export interface StorageDelta {
  operation: 'insert' | 'delete' | 'update';
  id?: string;
  link?: StorageLink;
}

/**
 * Creates the core Storage system with Alive-based storage class
 * @param deep - Deep instance to attach storage to
 */
export function newStorage(deep: any) {
  // Create Storage as Alive class with storage event handlers and methods
  const Storage = new deep.Alive(function(this: any) {
    if (this._reason === deep.reasons.construction._id) {
      // Initialize storage state
      const state = this._state;
      
      // Storage Methods (created as state keys during Alive construction)
      
      /**
       * Storage Method: Generate dump snapshot for storage
       * @returns StorageDump - Current state snapshot
       */
      state.generateDump = (): StorageDump => {
        return _generateDump(deep, this);
      };
      
      /**
       * Storage Method: Start subscriptions to deep.on global events
       */
      state.watch = () => {
        // Listen for storage events
        if (deep.events.storeAdded) {
          deep.on(deep.events.storeAdded._id, (payload: any) => {
            // Only handle events for this storage
            if (payload.storageId === this._id && state.onLinkInsert) {
              // Generate storage link for the added association
              const association = new deep(payload._source);
              const storageLink = generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkInsert(storageLink);
              }
            }
          });
        }
        
        if (deep.events.storeRemoved) {
          deep.on(deep.events.storeRemoved._id, (payload: any) => {
            // Only handle events for this storage
            if (payload.storageId === this._id && state.onLinkDelete) {
              // Generate storage link for the removed association
              const association = new deep(payload._source);
              const storageLink = generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkDelete(storageLink);
              }
            }
          });
        }
        
        // Listen for link changes
        if (deep.events.globalLinkChanged) {
          deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
            // Check if this association is stored in this storage
            const association = new deep(payload._id);
            if (association.isStored(this) && state.onLinkUpdate) {
              const storageLink = generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkUpdate(storageLink);
              }
            }
          });
        }
        
        // Listen for data changes
        if (deep.events.globalDataChanged) {
          deep.on(deep.events.globalDataChanged._id, (payload: any) => {
            // Check if this association is stored in this storage
            const association = new deep(payload._id);
            if (association.isStored(this) && state.onDataChanged) {
              const storageLink = generateStorageLink(deep, association);
              if (storageLink) {
                state.onDataChanged(storageLink);
              }
            }
          });
        }
        
        // Listen for association destruction
        if (deep.events.globalDestroyed) {
          deep.on(deep.events.globalDestroyed._id, (payload: any) => {
            // We can't check isStored after destruction, so we'll handle all destructions
            // Storage implementations should filter if needed
            if (state.onLinkDelete) {
              // Create minimal storage link for destruction
              const storageLink: StorageLink = {
                _id: payload._id,
                _type: '', // Unknown after destruction
                _created_at: 0,
                _updated_at: Date.now()
              };
              state.onLinkDelete(storageLink);
            }
          });
        }
      };
      
      // Storage Event Handlers (to be set by storage implementations)
      // These are undefined by default and should be set by specific storage implementations
      state.onLinkInsert = undefined;
      state.onLinkDelete = undefined;
      state.onLinkUpdate = undefined;
      state.onDataChanged = undefined;
    }
  });
  
  // Register Storage in deep context
  deep._context.Storage = Storage;
  
  return Storage;
}

/**
 * Helper function to generate StorageLink from association
 * @param deep - Deep instance
 * @param association - Association to convert
 * @returns StorageLink or null if not meaningful
 */
function generateStorageLink(deep: any, association: any): StorageLink | null {
  const typeId = association._type;
  
  // Only include typed associations (meaningful ones)
  if (!typeId || typeId === deep._id) {
    return null; // Skip untyped or plain associations
  }
  
  // Create storage link
  const storageLink: StorageLink = {
    _id: association._id,
    _type: typeId,
    _created_at: association._created_at,
    _updated_at: association._updated_at,
    _i: association._i // Include sequence number
  };
  
  // Add optional fields if they exist
  if (association._from) storageLink._from = association._from;
  if (association._to) storageLink._to = association._to;
  if (association._value) storageLink._value = association._value;
  
  // Add typed data if present
  const data = deep._getData(association._id);
  if (data !== undefined) {
    if (typeof data === 'string') {
      storageLink._string = data;
    } else if (typeof data === 'number') {
      storageLink._number = data;
    } else if (typeof data === 'function') {
      storageLink._function = data.toString();
    }
  }
  
  return storageLink;
}

/**
 * Generate correct StorageDump for testing and internal use
 * @param deep - Deep instance
 * @param storage - Storage instance
 * @returns StorageDump - Generated dump
 */
export function _generateDump(deep: any, storage: any): StorageDump {
  const links: StorageLink[] = [];
  const ids: string[] = [];
  
  // Get all associations marked for this storage
  const allStorageMarkers = deep._getAllStorageMarkers();
  
  for (const [associationId, storageMap] of allStorageMarkers) {
    // Check if this association is marked for this storage instance
    if (storageMap.has(storage._id)) {
      const association = new deep(associationId);
      
      // Only include typed associations (meaningful ones)
      const typeId = association._type;
      if (!typeId || typeId === deep._id) {
        continue; // Skip untyped or plain associations
      }
      
      // Create storage link
      const storageLink: StorageLink = {
        _id: associationId,
        _type: typeId,
        _created_at: association._created_at,
        _updated_at: association._updated_at,
        _i: association._i // Include sequence number
      };
      
      // Add optional fields if they exist
      if (association._from) storageLink._from = association._from;
      if (association._to) storageLink._to = association._to;
      if (association._value) storageLink._value = association._value;
      
      // Add typed data if present
      const data = deep._getData(associationId);
      if (data !== undefined) {
        if (typeof data === 'string') {
          storageLink._string = data;
        } else if (typeof data === 'number') {
          storageLink._number = data;
        } else if (typeof data === 'function') {
          storageLink._function = data.toString();
        }
      }
      
      links.push(storageLink);
      ids.push(associationId);
    }
  }
  
  return { ids, links };
}

/**
 * Dependency-aware sorting of storage links
 * @param links - Array of storage links to sort
 * @param needResortI - Whether to pre-sort by _i field
 * @returns Topologically sorted links array
 */
export function _sortDump(links: StorageLink[], needResortI?: boolean): StorageLink[] {
  // 1. Pre-sort by _i if needed (single loop with sort)
  const sortedLinks = needResortI ? 
    [...links].sort((a, b) => {
      if (a._i === undefined || b._i === undefined) {
        throw new Error(`Missing _i field for sorting on link ${a._i === undefined ? a._id : b._id}`);
      }
      return a._i - b._i;
    }) : links;
  
  // 2. Create dependency map and check for dependencies within the dump
  const linkIds = new Set(sortedLinks.map(link => link._id));
  const dependencyMap = new Map<string, { 
    link: StorageLink, 
    dependencies: Set<string>
  }>();
  
  for (const link of sortedLinks) {
    // Collect all dependencies that exist within this dump
    const dependencies = [link._type, link._from, link._to, link._value]
      .filter((dep): dep is string => Boolean(dep) && linkIds.has(dep as string));
    
    dependencyMap.set(link._id, { 
      link, 
      dependencies: new Set(dependencies) 
    });
  }
  
  // 3. Topological sorting with cycle detection
  const result: StorageLink[] = [];
  const processing = new Set<string>();
  const processed = new Set<string>();
  
  const processLink = (linkId: string): void => {
    // Already processed
    if (processed.has(linkId)) return;
    
    // Detect circular dependencies
    if (processing.has(linkId)) {
      throw new Error(`Circular dependency detected involving link: ${linkId}`);
    }
    
    // Mark as being processed
    processing.add(linkId);
    
    const entry = dependencyMap.get(linkId);
    if (!entry) {
      throw new Error(`Link not found in dependency map: ${linkId}`);
    }
    
    // Process all dependencies first
    for (const depId of entry.dependencies) {
      processLink(depId);
    }
    
    // Add current link to result
    result.push(entry.link);
    processed.add(linkId);
    
    // Remove from processing
    processing.delete(linkId);
  };
  
  // Process all links
  for (const link of sortedLinks) {
    processLink(link._id);
  }
  
  return result;
}

export function _validateDependencies(deep: any, link: StorageLink, storage: any): void {
  const dependencies = [link._type, link._from, link._to, link._value]
    .filter(depId => depId && typeof depId === 'string');
  
  for (const depId of dependencies) {
    const dependency = new deep(depId);
    if (!dependency.isStored(storage)) {
      throw new Error(`Dependency ${depId} is not stored in the same storage`);
    }
  }
}

export function _applyDelta(deep: any, delta: StorageDelta, storage: any): void {
  // 1. Validate input data
  if (!['insert', 'delete', 'update'].includes(delta.operation)) {
    throw new Error(`Invalid delta operation: ${delta.operation}. Must be 'insert', 'delete', or 'update'`);
  }
  
  if ((delta.operation === 'insert' || delta.operation === 'update') && !delta.link) {
    throw new Error(`Delta operation '${delta.operation}' requires 'link' property`);
  }
  
  if (delta.operation === 'delete' && !delta.id) {
    throw new Error(`Delta operation 'delete' requires 'id' property`);
  }
  
  // Require _i field for all operations from external source
  if (delta.operation === 'insert' || delta.operation === 'update') {
    if (typeof delta.link!._i !== 'number') {
      throw new Error(`Delta link must have '_i' field as number when received from external source`);
    }
  }
  
  // Set __isStorageEvent to prevent recursion
  deep.Deep.__isStorageEvent = storage._id;
  
  try {
    if (delta.operation === 'insert') {
      // 2. Handle 'insert' operation
      const link = delta.link!;
      
      // Require timestamps
      if (typeof link._created_at !== 'number' || typeof link._updated_at !== 'number') {
        throw new Error(`Delta link must have '_created_at' and '_updated_at' fields as numbers`);
      }
      
      // Check if association already exists
      if (deep._ids.has(link._id)) {
        throw new Error(`Cannot insert association ${link._id}: association already exists`);
      }
      
      // Validate dependencies
      _validateDependencies(deep, link, storage);
      
      // Create new association
      const association = new deep(link._id);
      
      // Set all fields from link
      if (link._type) association._type = link._type;
      if (link._from) association._from = link._from;
      if (link._to) association._to = link._to;
      if (link._value) association._value = link._value;
      
      // Set timestamps from received data
      association._created_at = link._created_at;
      association._updated_at = link._updated_at;
      
      // Set sequence number
      association._setSequenceNumber(link._id, link._i!);
      
      // Validate and set typed data
      if (link._string !== undefined) {
        if (association._type !== deep.String._id) {
          throw new Error(`Association ${link._id} has _string data but type is not deep.String (${association._type})`);
        }
        association._data = link._string;
      }
      if (link._number !== undefined) {
        if (association._type !== deep.Number._id) {
          throw new Error(`Association ${link._id} has _number data but type is not deep.Number (${association._type})`);
        }
        association._data = link._number;
      }
      if (link._function !== undefined) {
        if (association._type !== deep.Function._id) {
          throw new Error(`Association ${link._id} has _function data but type is not deep.Function (${association._type})`);
        }
        association._data = link._function;
      }
      
      // Add storage marker based on type
      if (link._type === deep._id) {
        // Plain association - add typedTrue marker
        association.store(storage, deep.storageMarkers.typedTrue);
      } else {
        // Typed association - check that type is stored
        const typeAssociation = new deep(link._type);
        if (!typeAssociation.isStored(storage)) {
          throw new Error(`Cannot store association ${link._id}: type ${link._type} is not stored in the same storage (anomaly)`);
        }
        association.store(storage, deep.storageMarkers.oneTrue);
      }
      
    } else if (delta.operation === 'update') {
      // 3. Handle 'update' operation
      const link = delta.link!;
      
      // Find existing association
      if (!deep._ids.has(link._id)) {
        throw new Error(`Cannot update association ${link._id}: association not found`);
      }
      
      const association = new deep(link._id);
      
      // Check that association is stored in this storage
      if (!association.isStored(storage)) {
        throw new Error(`Cannot update association ${link._id}: association is not stored in this storage (anomaly)`);
      }
      
      // Require _updated_at
      if (typeof link._updated_at !== 'number') {
        throw new Error(`Delta link must have '_updated_at' field as number for update operation`);
      }
      
      // Check that _updated_at is different from current
      if (link._updated_at === association._updated_at) {
        throw new Error(`Delta link _updated_at (${link._updated_at}) must be different from current (${association._updated_at})`);
      }
      
      // Validate dependencies for new values
      _validateDependencies(deep, link, storage);
      
      // Update only changed fields
      if (link._type !== undefined && link._type !== association._type) {
        association._type = link._type;
      }
      if (link._from !== undefined && link._from !== association._from) {
        association._from = link._from;
      }
      if (link._to !== undefined && link._to !== association._to) {
        association._to = link._to;
      }
      if (link._value !== undefined && link._value !== association._value) {
        association._value = link._value;
      }
      
      // Set _updated_at from received data
      association._updated_at = link._updated_at;
      
      // Update typed data if provided
      if (link._string !== undefined) {
        if (association._type !== deep.String._id) {
          throw new Error(`Association ${link._id} has _string data but type is not deep.String (${association._type})`);
        }
        association._data = link._string;
      }
      if (link._number !== undefined) {
        if (association._type !== deep.Number._id) {
          throw new Error(`Association ${link._id} has _number data but type is not deep.Number (${association._type})`);
        }
        association._data = link._number;
      }
      if (link._function !== undefined) {
        if (association._type !== deep.Function._id) {
          throw new Error(`Association ${link._id} has _function data but type is not deep.Function (${association._type})`);
        }
        association._data = link._function;
      }
      
    } else if (delta.operation === 'delete') {
      // 4. Handle 'delete' operation
      const associationId = delta.id!;
      
      // Find association
      if (!deep._ids.has(associationId)) {
        throw new Error(`Cannot delete association ${associationId}: association not found`);
      }
      
      const association = new deep(associationId);
      
      // Check that association is stored in this storage
      if (!association.isStored(storage)) {
        throw new Error(`Cannot delete association ${associationId}: association is not stored in this storage`);
      }
      
      // Storage markers are automatically deleted in _deep.ts via _storages.delete(this.__id)
      // Destroy the association
      association.destroy();
    }
  } finally {
    // Always reset __isStorageEvent
    deep.Deep.__isStorageEvent = undefined;
  }
}

/**
 * Handle subscription-based dump synchronization
 * @param deep - Deep instance
 * @param dump - Storage dump to apply
 * @param storage - Storage instance
 */
export function _applySubscription(deep: any, dump: StorageDump, storage: any): void {
  // Handle empty dumps
  if (!dump.links || dump.links.length === 0) {
    return;
  }
  
  // 1. Filter links that need to be processed (new or changed)
  const linksToProcess: StorageLink[] = [];
  
  for (const link of dump.links) {
    const existingUpdatedAt = deep._updated_ats.get(link._id);
    
    if (existingUpdatedAt === undefined) {
      // New association - needs to be inserted
      linksToProcess.push(link);
    } else if (link._updated_at > existingUpdatedAt) {
      // Changed association - needs to be updated
      linksToProcess.push(link);
    }
    // Skip unchanged associations (same or older timestamp)
  }
  
  // 2. Sort links for dependency-aware processing
  const sortedLinks = _sortDump(linksToProcess);
  
  // 3. Apply each link via _applyDelta
  for (const link of sortedLinks) {
    const existingUpdatedAt = deep._updated_ats.get(link._id);
    
    if (existingUpdatedAt === undefined) {
      // Insert new association
      const insertDelta: StorageDelta = {
        operation: 'insert',
        link: link
      };
      _applyDelta(deep, insertDelta, storage);
    } else {
      // Update existing association
      const updateDelta: StorageDelta = {
        operation: 'update',
        id: link._id,
        link: link
      };
      _applyDelta(deep, updateDelta, storage);
    }
  }
}

/**
 * Mark existing deep hierarchy for storage synchronization
 * Should be called right after newDeep() but before working with storages
 * @param deep - Deep instance
 * @param storage - Storage instance
 */
export function defaultMarking(deep: any, storage: any): void {
  // 1. Mark the root deep for storage
  deep.store(storage, deep.storageMarkers.oneTrue);
  
  // 2. Mark all existing deep descendants with typedTrue using ._typed Set
  for (const typeId of deep._typed) {
    const typeInstance = new deep(typeId);
    typeInstance.store(storage, deep.storageMarkers.typedTrue);
  }
} 