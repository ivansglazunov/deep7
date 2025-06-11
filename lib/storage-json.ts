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
    debug('restoreDeep query')
    const links = await _loadLinks(path);
    const filtered = links.filter((link) => query(link) || link._protected).sort((a, b) => ((a._i as number) - (b._i as number)));
    const ids = filtered.map(link => link._id);
    dump = { links: filtered, ids };
  } else {
    debug('restoreDeep protected')
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
      fs.writeFileSync(storage.state.path, jsan.stringify(links, null, 2));
      
      // Update file modification time tracking
      if (storage.state._lastMtime !== undefined) {
        const stats = fs.statSync(storage.state.path);
        storage.state._lastMtime = stats.mtime.getTime();
        debug(`[storage-json] Updated mtime tracking for ${storage._id}: ${storage.state._lastMtime}`);
      }
    } catch (error) {
      console.error('StorageJson: onLinkUpsert: error', error);
    }
  }

  return _newStorage({
    deep,
    onStoreConstructed(storage, options) {
      if (typeof options.query === 'function') storage.state.query = options.query;
      storage.state.path = options.path;
      if (!storage.state.path) throw new Error('StorageJson: path not found');
      if (!fs.existsSync(storage.state.path)) {
        fs.writeFileSync(storage.state.path, jsan.stringify([], null, 2));
      }
      
      // Initialize file modification time tracking
      const stats = fs.statSync(storage.state.path);
      storage.state._lastMtime = stats.mtime.getTime();
      debug(`[storage-json] Initial mtime for ${storage._id}: ${storage.state._lastMtime}`);
    },
    onLinkInsert: onLinkUpsert,
    onLinkUpsert,
    onSubscription(storage, apply) {
      debug(`[storage-json] onSubscription called for storage ${storage._id} with query ${!!storage.state.query}`);
      if (storage.state.query) {
        debug(`[storage-json] Setting up file monitoring for storage ${storage._id} on path ${storage.state.path}`);
        
        const handleChange = async (source = 'watcher') => {
          debug(`[storage-json ${source}] File changed for storage ${storage._id}`);
          try {
            let links;
            if (storage.state.query) {
              links = await _loadLinks(storage.state.path);
              const originalLength = links.length;
              links = links.filter((link) => storage.state.query(link));
              debug(`[storage-json ${source}] Storage ${storage._id}: Loaded ${originalLength} links, filtered to ${links.length} links`);
            } else {
              const dump = await _loadProtectedDump(storage.state.path);
              links = dump.links;
            }
            apply({ links });
            debug(`[storage-json ${source}] Applied ${links.length} links to storage ${storage._id}`);
          } catch (error) {
            debug(`[storage-json ${source}] Error processing change for storage ${storage._id}:`, error);
          }
        };

        let watcher: any = null;
        let pollingInterval: NodeJS.Timeout | null = null;
        
        // Try to set up chokidar watcher
        try {
          watcher = chokidar.watch(storage.state.path, { 
            persistent: true, 
            ignoreInitial: true, 
            usePolling: true,
            interval: 100,
            binaryInterval: 300,
            awaitWriteFinish: {
              stabilityThreshold: 100,
              pollInterval: 100
            }
          });

          watcher
            .on('change', () => handleChange('chokidar'))
            .on('add', () => handleChange('chokidar'))
            .on('error', error => {
              debug(`[storage-json watcher] Watcher error for storage ${storage._id}:`, error);
              // If watcher fails, we'll rely on polling
            })
            .on('ready', () => debug(`[storage-json watcher] Chokidar ready for storage ${storage._id}`));
          
          debug(`[storage-json] Chokidar watcher setup for storage ${storage._id}`);
        } catch (error) {
          debug(`[storage-json] Failed to setup chokidar for storage ${storage._id}:`, error);
          watcher = null;
        }
        
        // Always set up polling as fallback/supplement
        const pollForChanges = () => {
          try {
            const stats = fs.statSync(storage.state.path);
            const currentMtime = stats.mtime.getTime();
            
            if (currentMtime !== storage.state._lastMtime) {
              debug(`[storage-json polling] File mtime changed for storage ${storage._id}: ${storage.state._lastMtime} -> ${currentMtime}`);
              storage.state._lastMtime = currentMtime;
              handleChange('polling');
            }
          } catch (error) {
            debug(`[storage-json polling] Error checking file for storage ${storage._id}:`, error);
          }
        };
        
        // Poll every 200ms
        pollingInterval = setInterval(pollForChanges, 200);
        debug(`[storage-json] Polling setup for storage ${storage._id}`);
        
        return () => {
          debug(`[storage-json] Cleaning up monitoring for storage ${storage._id}`);
          if (watcher) {
            watcher.close();
          }
          if (pollingInterval) {
            clearInterval(pollingInterval);
          }
        };
      }
    },
  });
};
