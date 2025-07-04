// // Hasyx database storage implementation for Deep Framework
// // Provides StorageHasyxDump class and StorageHasyx function for real database persistence
// // Uses _delay from _promise.ts to simulate asynchronous operations and hasyx for database operations
// // Not add for exclude from syncing with remote

// import { Hasyx } from 'hasyx';
// import { newDeep } from '.';
// import Debug from './debug';
// import { StorageDump, StorageLink, _newStorage } from './storage';

// export const debug = Debug('storage-hasyx');

// export const _whereProtected = (id) => ({
//   _deep: { _eq: id },
//   _protected: { _eq: true }
// });

// export const _returningProtected = [
//   'id', '_i', '_deep', 'type_id', 'from_id', 'to_id', 'string', 'number', 'function', 'created_at', 'updated_at',
// ];

// // query for load by context and one level typed
// export function _queryProtected(id): any {
//   return {
//     table: 'deep_links',
//     order_by: { _i: 'asc' },
//     where: _whereProtected(id),
//     returning: _returningProtected,
//   };
// }

// export function _query(query: object | Function): object {
//   return typeof query == 'function' ? query() : query;
// }

// export function _parseHasyxLinkToDump(link: any): StorageLink {
//   return {
//     _id: link.id,
//     type_id: link.type_id,
//     from_id: link.from_id,
//     to_id: link.to_id,
//     value_id: link.value_id,
//     _created_at: link.created_at,
//     _updated_at: link.updated_at,
//     _i: link._i,
//     ...(typeof link.string === 'string' ? { _data: link.string } : {}),
//     ...(typeof link.number === 'number' ? { _data: link.number } : {}),
//     ...(typeof link.function === 'string' ? { _data: link.function } : {}),
//   };
// }

// export function _resultsToDump(results: any[]): StorageDump {
//   const dump: StorageDump = { ids: [], links: [] };
//   for (const result of results) {
//     if (dump.ids) dump.ids.push(result.id);
//     dump.links.push(_parseHasyxLinkToDump(result));
//   }
//   return dump;
// }

// export async function _loadProtectedDump(id, hasyx, query?: any): Promise<StorageDump> {
//   const q = _queryProtected(id);
//   let where: any = _whereProtected(id);
//   if (query) {
//     const _q = _query(query);
//     q.where = { _or: [where, _q] };
//   }
//   debug('_loadProtectedDump q', JSON.stringify(q, null, 2));
//   const results = await hasyx.select(q);
//   // debug('_loadProtectedDump results', JSON.stringify(results, null, 2));
//   return _resultsToDump(results);
// }

// export async function restoreDeep({
//   id,
//   hasyx,
//   query,
// }: {
//   id: string;
//   hasyx: Hasyx;
//   query?: any;
// }) {
//   const dump = await _loadProtectedDump(id, hasyx, query);
//   debug('_loadProtectedDump dump.ids', JSON.stringify(dump.ids));
//   const deep = newDeep({ existingIds: dump.ids });
//   const HasyxStorage = newStorageHasyx(deep);
//   const storage = new HasyxStorage({ hasyx, dump, query });
//   return { deep, storage };
// }

// export function newStorageHasyx(deep: any) {

//   const onLinkUpsert = async function(storage, storageLink: StorageLink) {
//     const _state = storage._getState(storageLink._id);
//     const name = _state?._name;

//     try {
//       await storage.state.hasyx.upsert({
//         table: 'deep_links',
//         object: {
//           id: storageLink._id,
//           _deep: deep._id,
//           type_id: storageLink.type_id || null,
//           from_id: storageLink.from_id || null,
//           to_id: storageLink.to_id || null,
//           value_id: storageLink.value_id || null,
//           string: storageLink._string || null,
//           number: storageLink._number || null,
//           function: storageLink._function || null,
//           created_at: storageLink._created_at,
//           updated_at: storageLink._updated_at,
//           _i: storageLink._i || null, // Pass client _i for insert case
//           _protected: storageLink._protected,
//           ...(name ? { name } : {})
//         },
//         on_conflict: {
//           constraint: '_links_pkey', // Primary key constraint on id column
//           update_columns: [
//             'type_id', 'from_id', 'to_id', 'value_id', 
//             'string', 'number', 'function', 
//             'name', 'updated_at'
//             // Note: NOT updating _i, created_at, and _protected - they should be immutable after insert
//           ]
//         },
//         returning: ['id']
//       });
//     } catch (error) {
//       console.error('StorageHasyx: onLinkUpsert: error', error);
//     }
//   }

//   return _newStorage({
//     deep,
//     onStoreConstructed(storage, options) {
//       if (typeof options.query) storage.state.query = options.query;
//       storage.state.hasyx = options.hasyx;
//       if (!storage.state.hasyx) throw new Error('StorageHasyx: hasyx not found');
//       storage.state.applyResults = (results) => {
//         const _results = _resultsToDump(results);
//         debug('onSubscription next', JSON.stringify(_results, null, 2), JSON.stringify(results, null, 2));
//         storage.state.apply(_results);
//       }
//     },
//     onLinkInsert: onLinkUpsert,
//     onLinkUpsert,
//     onSubscription(storage, apply) {
//       if (storage.state.query) {
//         const query = _query(storage.state.query);
//         if (typeof query !== 'object') throw new Error('StorageHasyx: query must be an object');
//         const where = {
//           _deep: { _eq: deep._id },
//           _protected: { _eq: false }, // not need protected links
//           ...query,
//         };
//         debug('onSubscription subscribe', JSON.stringify(where, null, 2));
//         const subscription = storage.state.hasyx.subscribe({
//           table: 'deep_links',
//           where,
//           returning: _returningProtected,
//         });
//         subscription.subscribe({
//           next: storage.state.applyResults,
//           error: (error) => {
//             debug('onSubscription error', error);
//           },
//         })
//         return () => subscription.unsubscribe();
//       }
//     },
//   });
// };
