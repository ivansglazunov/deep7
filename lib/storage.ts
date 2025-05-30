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
  _type?: string; // optional - can be NULL when id != _deep
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
        // Store disposers for cleanup
        if (!state._eventDisposers) {
          state._eventDisposers = [];
        }
        
        // Listen for storage events
        if (deep.events.storeAdded) {
          const disposer1 = deep.on(deep.events.storeAdded._id, (payload: any) => {
            // Only handle events for this storage
            if (payload.storageId === this._id && state.onLinkInsert) {
              // Generate storage link for the added association
              const association = new deep(payload._source);
              const storageLink = __generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkInsert(storageLink);
              }
            }
          });
          state._eventDisposers.push(disposer1);
        }
        
        if (deep.events.storeRemoved) {
          const disposer2 = deep.on(deep.events.storeRemoved._id, (payload: any) => {
            // Only handle events for this storage
            if (payload.storageId === this._id && state.onLinkDelete) {
              // Generate storage link for the removed association
              const association = new deep(payload._source);
              const storageLink = __generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkDelete(storageLink);
              }
            }
          });
          state._eventDisposers.push(disposer2);
        }
        
        // Listen for link changes
        if (deep.events.globalLinkChanged) {
          const disposer3 = deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
            // Check if this association is stored in this storage
            const association = new deep(payload._id);
            if (association.isStored(this) && state.onLinkUpdate) {
              const storageLink = __generateStorageLink(deep, association);
              if (storageLink) {
                state.onLinkUpdate(storageLink);
              }
            }
          });
          state._eventDisposers.push(disposer3);
        }
        
        // Listen for data changes
        if (deep.events.globalDataChanged) {
          const disposer4 = deep.on(deep.events.globalDataChanged._id, (payload: any) => {
            // Check if this association is stored in this storage
            const association = new deep(payload._id);
            if (association.isStored(this) && state.onDataChanged) {
              const storageLink = __generateStorageLink(deep, association);
              if (storageLink) {
                state.onDataChanged(storageLink);
              }
            }
          });
          state._eventDisposers.push(disposer4);
        }
        
        // Listen for association destruction
        if (deep.events.globalDestroyed) {
          const disposer5 = deep.on(deep.events.globalDestroyed._id, (payload: any) => {
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
          state._eventDisposers.push(disposer5);
        }
      };
      
      // Storage Event Handlers (to be set by storage implementations)
      // These are undefined by default and should be set by specific storage implementations
      state.onLinkInsert = undefined;
      state.onLinkDelete = undefined;
      state.onLinkUpdate = undefined;
      state.onDataChanged = undefined;
    } else if (this._reason === deep.reasons.destruction._id) {
      // Handle storage destruction cleanup
      const state = this._state;
      
      debug('Storage destruction initiated for %s', this._id);
      
      // Call onDestroy handler if it exists
      if (state.onDestroy && typeof state.onDestroy === 'function') {
        try {
          state.onDestroy();
          debug('Storage onDestroy handler completed for %s', this._id);
        } catch (error) {
          debug('Error in storage onDestroy handler for %s: %s', this._id, (error as Error).message);
        }
      }
      
      // Clean up event disposers
      if (state._eventDisposers) {
        for (const disposer of state._eventDisposers) {
          if (typeof disposer === 'function') {
            disposer();
          }
        }
        state._eventDisposers = [];
      }
      
      debug('Storage destruction completed for %s', this._id);
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
function __generateStorageLink(deep: any, association: any): StorageLink | null {
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
  
  // First pass: collect directly marked associations
  const directlyMarked = new Set<string>();
  for (const [associationId, storageMap] of allStorageMarkers) {
    if (storageMap.has(storage._id)) {
      directlyMarked.add(associationId);
    }
  }
  
  // Second pass: collect associations that inherit storage through type hierarchy
  const inheritedMarked = new Set<string>();
  for (const associationId of deep._ids) {
    if (directlyMarked.has(associationId)) {
      continue; // Already directly marked
    }
    
    const association = new deep(associationId);
    if (association.isStored(storage)) {
      inheritedMarked.add(associationId);
    }
  }
  
  // Combine both sets
  const allMarkedAssociations = new Set([...directlyMarked, ...inheritedMarked]);
  
  for (const associationId of allMarkedAssociations) {
    const association = new deep(associationId);
    
    // Include all associations that are marked for storage
    // This includes both plain associations (type = deep._id) and typed associations
    // But exclude system types that should be recreated during newDeep() initialization
    const typeId = association._type;
    if (!typeId) {
      continue; // Skip only untyped associations (no type at all)
    }
    
    // Skip system types that are recreated during newDeep() initialization
    // Use low-level API to avoid alive function calls
    const typeAssociation = new deep.Deep(typeId);
    if (typeAssociation._type === deep.Alive.AliveInstance._id) {
      continue; // Skip Alive instances (Storage, etc.) - they should be recreated
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

export function _applyDelta(deep: any, delta: StorageDelta, storage: any, skipValidation?: boolean): void {
  debug('Applying delta: %o', delta);
  
  if (delta.operation === 'insert' && delta.link) {
    const link = delta.link;
    debug('Inserting link: %s', link._id);
    
    // Validate dependencies before creating association (skip during dump restoration)
    if (!skipValidation) {
      _validateDependencies(deep, link, storage);
    }
    
    // Create or get existing association
    const association = new deep(link._id);
    
    // Set timestamps from received data (only for new associations)
    if (!deep._created_ats.has(link._id)) {
      association._created_at = link._created_at;
    }
    association._updated_at = link._updated_at;
    
    // Set sequence number
    association._setSequenceNumber(link._id, link._i!);
    
    // Validate sequence number after setting
    if (association._i !== link._i) {
      throw new Error(`Sequence number mismatch for ${link._id}: expected ${link._i}, got ${association._i}. This violates synchronization law.`);
    }
    
    // Check if this is a system type that needs special handling
    const isSystemType = link._type && (
      link._type === deep.Storage._id ||
      link._type === deep.Alive.AliveInstance._id ||
      (deep.Alive && deep.Alive.AliveInstance && link._type === deep.Alive.AliveInstance._id) ||
      // Check if the type is an Alive instance by checking its type hierarchy
      (deep._Type.one(link._type) === deep.Alive.AliveInstance._id) ||
      // Check if the type is a Storage instance by checking its type hierarchy
      (deep._Type.one(link._type) === deep.Storage._id)
    );
    
    debug('Processing link %s with type %s, isSystemType: %s', link._id, link._type, isSystemType);
    debug('deep.Storage._id: %s, deep.Alive.AliveInstance._id: %s', deep.Storage._id, deep.Alive?.AliveInstance?._id);
    debug('Type hierarchy for %s: %s', link._type, deep._Type.one(link._type));
    
    // Use high-level Field API for all types to ensure proper events are generated
    // The alive.ts protection should handle system types gracefully
    if (link._type) {
      deep.Deep.__isStorageEvent = storage._id;
      association.type = new deep(link._type);
    }
    if (link._from) {
      deep.Deep.__isStorageEvent = storage._id;
      association.from = new deep(link._from);
    }
    if (link._to) {
      deep.Deep.__isStorageEvent = storage._id;
      association.to = new deep(link._to);
    }
    if (link._value) {
      deep.Deep.__isStorageEvent = storage._id;
      association.value = new deep(link._value);
    }
    
    // Set typed data using high-level Field API
    if (link._string !== undefined) {
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._string;
    }
    if (link._number !== undefined) {
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._number;
    }
    if (link._function !== undefined) {
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._function;
    }
    
    debug('Successfully inserted association: %s', link._id);
    
    // Add storage marker based on type (defer during dump restoration to avoid alive function issues)
    if (!skipValidation) {
      if (link._type === deep._id) {
        // Plain association - add typedTrue marker
        association.store(storage, deep.storageMarkers.typedTrue);
      } else {
        // Typed association - add oneTrue marker for typed associations
        association.store(storage, deep.storageMarkers.oneTrue);
      }
    }
    
  } else if (delta.operation === 'delete' && delta.id) {
    debug('Deleting association: %s', delta.id);
    
    const association = new deep(delta.id);
    
    // Remove from storage first
    association.unstore(storage);
    
    // Then destroy the association
    association.destroy();
    
    debug('Successfully deleted association: %s', delta.id);
    
  } else if (delta.operation === 'update' && delta.link) {
    const link = delta.link;
    debug('Updating association: %s', link._id);
    
    // Validate dependencies before updating (skip during dump restoration)
    if (!skipValidation) {
      _validateDependencies(deep, link, storage);
    }
    
    const association = new deep(link._id);
    
    // Check if this is a system type that needs special handling
    const isSystemType = link._type && (
      link._type === deep.Storage._id ||
      link._type === deep.Alive.AliveInstance._id ||
      (deep.Alive && deep.Alive.AliveInstance && link._type === deep.Alive.AliveInstance._id) ||
      // Check if the type is an Alive instance by checking its type hierarchy
      (deep._Type.one(link._type) === deep.Alive.AliveInstance._id) ||
      // Check if the type is a Storage instance by checking its type hierarchy
      (deep._Type.one(link._type) === deep.Storage._id)
    );
    
    debug('Processing link %s with type %s, isSystemType: %s', link._id, link._type, isSystemType);
    debug('deep.Storage._id: %s, deep.Alive.AliveInstance._id: %s', deep.Storage._id, deep.Alive?.AliveInstance?._id);
    debug('Type hierarchy for %s: %s', link._type, deep._Type.one(link._type));
    
    // Use high-level Field API for all types to ensure proper events are generated
    // The alive.ts protection should handle system types gracefully
    if (link._type) {
      deep.Deep.__isStorageEvent = storage._id;
      association.type = new deep(link._type);
    }
    if (link._from) {
      deep.Deep.__isStorageEvent = storage._id;
      association.from = new deep(link._from);
    }
    if (link._to) {
      deep.Deep.__isStorageEvent = storage._id;
      association.to = new deep(link._to);
    }
    if (link._value) {
      deep.Deep.__isStorageEvent = storage._id;
      association.value = new deep(link._value);
    }
    
    // Update timestamps (don't update _created_at as it's immutable)
    if (link._updated_at !== undefined) {
      association._updated_at = link._updated_at;
    }
    
    // Update sequence number if provided
    if (link._i !== undefined) {
      association._setSequenceNumber(link._id, link._i);
      
      // Validate sequence number after setting
      if (association._i !== link._i) {
        throw new Error(`Sequence number mismatch for ${link._id}: expected ${link._i}, got ${association._i}. This violates synchronization law.`);
      }
    }
    
    // Update typed data using high-level Field API
    if (link._string !== undefined) {
      if (association._type !== deep.String._id) {
        throw new Error(`Association ${link._id} has _string data but type is not deep.String (${association._type})`);
      }
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._string;
    }
    if (link._number !== undefined) {
      if (association._type !== deep.Number._id) {
        throw new Error(`Association ${link._id} has _number data but type is not deep.Number (${association._type})`);
      }
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._number;
    }
    if (link._function !== undefined) {
      if (association._type !== deep.Function._id) {
        throw new Error(`Association ${link._id} has _function data but type is not deep.Function (${association._type})`);
      }
      deep.Deep.__isStorageEvent = storage._id;
      association.data = link._function;
    }
    
    debug('Successfully updated association: %s', link._id);
    
  } else {
    throw new Error(`Invalid delta operation: ${JSON.stringify(delta)}`);
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
      _applyDelta(deep, insertDelta, storage, true); // Skip validation during dump restoration
    } else {
      // Update existing association
      const updateDelta: StorageDelta = {
        operation: 'update',
        id: link._id,
        link: link
      };
      _applyDelta(deep, updateDelta, storage, true); // Skip validation during dump restoration
    }
  }
  
  // 4. Apply storage markers after all associations are restored
  for (const link of dump.links) {
    // Use low-level API to avoid alive function calls during restoration
    if (link._type === deep._id) {
      // Plain association - add typedTrue marker
      deep._setStorageMarker(link._id, storage._id, deep.storageMarkers.typedTrue._id);
    } else {
      // Typed association - add oneTrue marker
      // Note: We don't check if type is stored during restoration because
      // types might not be restored yet due to dependency order
      deep._setStorageMarker(link._id, storage._id, deep.storageMarkers.oneTrue._id);
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
  
  // 2. Mark all plain associations (with type = deep._id) with typedTrue
  // This will make all their typed instances inherit storage automatically
  // IMPORTANT: Convert Set to Array to avoid infinite loop during iteration
  // as store() operations may add new associations to deep._ids
  const existingIds = Array.from(deep._ids);
  for (const id of existingIds) {
    if (id === deep._id) continue; // Skip root deep, already marked above
    
    const association = new deep(id);
    if (association._type === deep._id) {
      // Plain association - mark with typedTrue so all instances inherit storage
      association.store(storage, deep.storageMarkers.typedTrue);
    }
    // Typed associations (._type !== deep._id) will inherit storage through typedTrue
    // from their types, so we don't mark them directly
  }
} 