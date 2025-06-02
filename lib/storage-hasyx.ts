// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations

import { Hasyx } from 'hasyx';
import { _delay } from './_promise';
import Debug from './debug';
import { StorageDelta, StorageDump, StorageLink, _applySubscription, _applyDelta, wrapStorageOperation, _sortDump } from './storage';
import path from 'path';
import fs from 'fs';

const debug = Debug('storage:hasyx');

export function newStorageHasyx(deep: any) {
  const StorageHasyx = new deep.Function(function StorageHasyx(this: any, options: {
    dump?: StorageDump;
    storageJsonDump?: StorageDump;
    strategy?: 'subscription' | 'delta';
    storage?: any; // Allow passing existing storage
  }) {
    const storage = options.storage || new deep.Storage();
    const ContextId = deep._context.Context._id;
    const strategy = options.strategy || 'subscription';
    if (strategy !== 'subscription') throw new Error('StorageHasyx: strategy must be subscription');
    if (!ContextId) throw new Error('StorageHasyx: Context not found');

    storage.state.onDestroy = () => {
      storage?.state?._unsubscribe();
    };
    if (typeof storage.state.watch === 'function') {
      storage.state.watch();
    }

    storage.state.onLinkInsert = (storageLink: StorageLink) => {
      console.log('onLinkInsert', storageLink._id);
      storage.promise = storage.promise.then(async () => {
        const { returning } = await deep.insert({
          table: 'deep_links',
          _id: storageLink._id,
          _deep: deep._id,
          _type: storageLink._type || null,
          _from: storageLink._from || null,
          _to: storageLink._to || null,
          _value: storageLink._value || null,
          string: storageLink._string || null,
          number: storageLink._number || null,
          function: storageLink._function || null,
          created_at: storageLink._created_at,
          updated_at: storageLink._updated_at,
          _i: storageLink._i || null,
          ...(ContextId === storageLink._id ? { name: 'Context' } : {})
        });
        if (!returning?.length) console.error('StorageHasyx: onLinkInsert: no returning for', storageLink);
      });
    };

    storage.state.onLinkDelete = (storageLink: StorageLink) => {
      console.log('onLinkDelete', storageLink._id);
      storage.promise = storage.promise.then(() => {});
    };
    
    storage.state.onLinkUpdate = (storageLink: StorageLink) => {
      console.log('onLinkUpdate', storageLink._id);
      storage.promise = storage.promise.then(() => {});
    };
    
    storage.state.onDataChanged = (storageLink: StorageLink) => {
      console.log('onDataChanged', storageLink._id);
      storage.promise = storage.promise.then(() => {});
    };

    storage?.state?.watch();

    // storage.promise = storage.promise.then(async () => {
      
    // });

    return storage;
  });

  deep._context.StorageHasyx = StorageHasyx;
  return StorageHasyx;
}
