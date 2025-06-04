// Hasyx database storage implementation for Deep Framework
// Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations
// Not add for exclude from syncing with remote

import { Hasyx } from 'hasyx';
import { newDeep } from '.';
import Debug from './debug';
import { StorageDump, StorageLink, _newStorage } from './storage';

export const debug = Debug('storage-hasyx');

export const _whereProtected = (id) => ({
  _deep: { _eq: id },
  _protected: { _eq: true }
});

export const _returningProtected = [
  'id', '_i', '_deep', '_type', '_from', '_to', 'string', 'number', 'function', 'created_at', 'updated_at',
];

// query for load by context and one level typed
export function _queryProtected(id): any {
  return {
    table: 'deep_links',
    order_by: { _i: 'asc' },
    where: _whereProtected(id),
    returning: _returningProtected,
  };
}

export function _query(query: object | Function): object {
  return typeof query == 'function' ? query() : query;
}

export function _parseHasyxLinkToDump(link: any): StorageLink {
  return {
    _id: link.id,
    _type: link._type,
    _from: link._from,
    _to: link._to,
    _value: link._value,
    _created_at: link.created_at,
    _updated_at: link.updated_at,
    _i: link._i,
    ...(typeof link.string === 'string' ? { _data: link.string } : {}),
    ...(typeof link.number === 'number' ? { _data: link.number } : {}),
    ...(typeof link.function === 'string' ? { _data: link.function } : {}),
  };
}

export function _resultsToDump(results: any[]): StorageDump {
  const dump: StorageDump = { ids: [], links: [] };
  for (const result of results) {
    if (dump.ids) dump.ids.push(result.id);
    dump.links.push(_parseHasyxLinkToDump(result));
  }
  return dump;
}

export async function _loadProtectedDump(id, hasyx, query?: any): Promise<StorageDump> {
  const q = _queryProtected(id);
  let where: any = _whereProtected(id);
  if (query) {
    const _q = _query(query);
    q.where = { _or: [where, _q] };
  }
  const results = await hasyx.select(q);
  return _resultsToDump(results);
}

export async function restoreDeep({
  id,
  hasyx,
  query,
}: {
  id: string;
  hasyx: Hasyx;
  query?: any;
}) {
  const dump = await _loadProtectedDump(id, hasyx, query);
  const deep = newDeep({ existingIds: dump.ids });
  const HasyxStorage = newStorageHasyx(deep);
  const storage = new HasyxStorage({ hasyx, dump, query });
  return { deep, storage };
}

export function newStorageHasyx(deep: any) {

  const onLinkUpsert = async function(storage, storageLink: StorageLink) {
    const _state = storage._getState(storageLink._id);
    const name = _state?._name;

    try {
      await storage.state.hasyx.upsert({
        table: 'deep_links',
        object: {
          id: storageLink._id,
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
          _i: storageLink._i || null, // Pass client _i for insert case
          _protected: storageLink._protected,
          ...(name ? { name } : {})
        },
        on_conflict: {
          constraint: '_links_pkey', // Primary key constraint on id column
          update_columns: [
            '_type', '_from', '_to', '_value', 
            'string', 'number', 'function', 
            'name', 'updated_at'
            // Note: NOT updating _i, created_at, and _protected - they should be immutable after insert
          ]
        },
        returning: ['id']
      });
    } catch (error) {
      console.error('StorageHasyx: onLinkUpsert: error', error);
    }
  }

  return _newStorage({
    deep,
    onStoreConstructed(storage, options) {
      if (typeof options.query) storage.state.query = options.query;
      storage.state.hasyx = options.hasyx;
      if (!storage.state.hasyx) throw new Error('StorageHasyx: hasyx not found');
    },
    onLinkInsert: onLinkUpsert,
    onLinkUpsert,
    onSubscription(storage, apply) {
      if (storage.state.query) {
        const query = _query(storage.state.query);
        if (typeof query !== 'object') throw new Error('StorageHasyx: query must be an object');
        const where = {
          _deep: { _eq: deep._id },
          _protected: { _eq: false }, // not need protected links
          ...query,
        };
        const subscription = storage.state.hasyx.subscribe({
          table: 'deep_links',
          where,
          returning: _returningProtected,
        });
        subscription.subscribe({
          next: (results) => {
            apply(_resultsToDump(results));
            debug('onSubscription next', results, 'by', where);
          },
          error: (error) => {
            debug('onSubscription error', error);
          },
        })
        return () => subscription.unsubscribe();
      }
    },
  });
};
