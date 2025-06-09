// jsan file storage implementation for Deep Framework
// Provides StorageJsonDump class and StorageJson function for file-based persistence
// Uses _delay from _promise.ts to simulate asynchronous operations and fs for file operations

import fs from 'fs';
import jsan from 'jsan';
import { newDeep } from '.';
import Debug from './debug';
import { StorageDump, StorageLink, _newStorage } from './storage';
import chokidar from 'chokidar';

const debug = Debug('storage-json');

export async function _loadLinks(path: string): Promise<StorageLink[]> {
  const file = fs.readFileSync(path, 'utf8');
  return jsan.parse(file);
}

export async function _loadProtectedDump(path: string): Promise<StorageDump> {
  const links = await _loadLinks(path);
  const protectedLinks = links.filter(link => typeof link._i === 'number' && link._protected);
  return { links: protectedLinks, ids: protectedLinks.sort((a, b) => ((a._i as number) - (b._i as number))).map(link => link._id) };
}

export async function restoreDeep({
  path,
  query,
}: {
  path: string;
  query?: (storageLink: StorageLink) => boolean;
}) {
  let dump;
  if (query) {
    debug('reastoreDeep query')
    const links = await _loadLinks(path);
    const filtered = links.filter((link) => query(link) || link._protected).sort((a, b) => ((a._i as number) - (b._i as number)));
    const ids = filtered.map(link => link._id);
    dump = { links: filtered, ids };
  } else {
    debug('reastoreDeep protected')
    dump = await _loadProtectedDump(path);
  }
  const deep = newDeep({ existingIds: dump.ids });
  const StorageJson = newStorageJson(deep);
  const storage = new StorageJson({ dump, path, query });
  return { deep, storage };
}

export function newStorageJson(deep: any) {
  const onLinkUpsert = async function(storage, storageLink: StorageLink) {
    try {
      const links = await _loadLinks(storage.state.path);
      const existingIndex = links.findIndex(l => l._id === storageLink._id);
      if (existingIndex === -1) {
        links.push(storageLink);
      } else {
        links[existingIndex] = storageLink;
      }
      await fs.writeFileSync(storage.state.path, jsan.stringify(links, null, 2));
    } catch (error) {
      console.error('StorageHasyx: onLinkUpsert: error', error);
    }
  }

  return _newStorage({
    deep,
    onStoreConstructed(storage, options) {
      if (typeof options.query) storage.state.query = options.query;
      storage.state.path = options.path;
      if (!storage.state.path) throw new Error('StorageJson: path not found');
      if (!fs.existsSync(storage.state.path)) {
        fs.writeFileSync(storage.state.path, jsan.stringify([], null, 2));
      }
    },
    onLinkInsert: onLinkUpsert,
    onLinkUpsert,
    onSubscription(storage, apply) {
      debug(`[storage-json] onSubscription called for storage ${storage._id} with query ${!!storage.state.query}`);
      if (storage.state.query) {
        debug(`[storage-json] Setting up chokidar for storage ${storage._id} on path ${storage.state.path}`);
        const watcher = chokidar.watch(storage.state.path, { persistent: true, ignoreInitial: true, usePolling: true });

        const handleChange = async (path) => {
          debug(`[storage-json watcher] file ${path} has been changed for storage ${storage._id}`);
          let dump, links;
          try {
            if (storage.state.query) {
              links = await _loadLinks(storage.state.path);
              const originalLength = links.length;
              links = links.filter((link) => storage.state.query(link));
              debug(`[storage-json watcher] storage ${storage._id}: Loaded ${originalLength} links, filtered to ${links.length} links. Applying...`, links.map(l => ({ id: l._id, type: l._type })));
            } else {
              dump = await _loadProtectedDump(storage.state.path);
              links = dump.links;
            }
            apply({ links });
          } catch (error) {
            debug(`[storage-json watcher] Error processing change for storage ${storage._id}: ${error}`);
          }
        };

        watcher
          .on('add', handleChange)
          .on('change', handleChange)
          .on('error', error => debug(`[storage-json watcher] Watcher error for storage ${storage._id}: ${error}`));
        
        // Expose handleChange for testing purposes
        storage.state.handleChange = handleChange;
        
        return () => watcher.close();
      }
    },
  });
};
