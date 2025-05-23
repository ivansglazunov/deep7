// Storage system for Deep Framework
// Provides storage markers and types for synchronization with long-term memory

/**
 * Creates the storage system with markers and types
 * @param deep The Deep factory instance
 */
export function newStorages(deep: any) {
  // Create Storage type
  const Storage = new deep();
  deep._context.Storage = Storage;
  
  // Create storage markers
  const StorageMarker = new deep();
  deep._context.StorageMarker = StorageMarker;
  
  const storageMarkers = new deep();
  deep._context.storageMarkers = storageMarkers;
  
  // Define marker types
  storageMarkers._context.oneTrue = new StorageMarker();
  storageMarkers._context.oneFalse = new StorageMarker();
  storageMarkers._context.typedTrue = new StorageMarker();
  storageMarkers._context.typedFalse = new StorageMarker();
  
  return { Storage, StorageMarker, storageMarkers };
} 