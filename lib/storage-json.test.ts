import { newDeep } from '.';
import { StorageDump, StorageLink, _applySubscription, defaultMarking } from './storage';
import { _delay } from './_promise';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { StorageJsonDump, newStorageJson } from './storage-json';

const debug = require('debug')('deep7:storage:json:test');

// Import classes that will be implemented
// import { StorageJsonDump, newStorageJson } from './storage-json';

describe('DEBUG', () => {
  // Experiments and hypothesis testing go here
  // Remove after verification
});

describe('Phase 4: JSON File Storage Implementation', () => {
  // Track all temp files and instances for cleanup
  const tempFiles: string[] = [];
  const jsonDumpInstances: StorageJsonDump[] = [];
  
  // Helper to create temp file path
  const createTempFilePath = () => {
    const tempFile = path.join(os.tmpdir(), `deep7-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.json`);
    tempFiles.push(tempFile);
    return tempFile;
  };
  
  // Helper to create and track StorageJsonDump
  const createTrackedJsonDump = (filePath?: string, initialDump?: StorageDump, defaultIntervalMaxCount?: number) => {
    const instance = new StorageJsonDump(filePath || createTempFilePath(), initialDump, defaultIntervalMaxCount);
    jsonDumpInstances.push(instance);
    return instance;
  };
  
  afterEach(async () => {
    // Clean up all StorageJsonDump instances to prevent timer leaks
    for (const instance of jsonDumpInstances) {
      try {
        if (instance.destroy) {
          instance.destroy();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    jsonDumpInstances.length = 0; // Clear array
    
    // Clean up temp files
    for (const filePath of tempFiles) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    tempFiles.length = 0; // Clear array
  });

  describe('StorageJsonDump Class', () => {
    describe('Basic Operations', () => {
      it('should create empty StorageJsonDump', () => {
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        expect(jsonDump.dump.links).toHaveLength(0);
        expect(jsonDump.filePath).toBe(filePath);
      });

      it('should create StorageJsonDump with custom defaultIntervalMaxCount', () => {
        const jsonDump = createTrackedJsonDump(undefined, undefined, 50);
        expect(jsonDump._defaultIntervalMaxCount).toBe(50);
      });

      it('should create StorageJsonDump with initial dump and custom maxCount', () => {
        const initialDump: StorageDump = {
          links: [{
            _id: 'test-id',
            _type: 'test-type',
            _created_at: 123,
            _updated_at: 456,
            _i: 1
          }]
        };
        
        const jsonDump = createTrackedJsonDump(undefined, initialDump, 100);
        expect(jsonDump.dump.links).toHaveLength(1);
        expect(jsonDump._defaultIntervalMaxCount).toBe(100);
      });

      it('should create StorageJsonDump with initial dump', () => {
        const initialDump: StorageDump = {
          links: [{
            _id: 'test-id-2',
            _type: 'test-type-2',
            _created_at: 789,
            _updated_at: 1011,
            _i: 2
          }]
        };
        
        const jsonDump = createTrackedJsonDump(undefined, initialDump);
        expect(jsonDump.dump.links).toHaveLength(1);
        expect(jsonDump.dump.links[0]._id).toBe('test-id-2');
      });

      it('should allow configuring delays', () => {
        const jsonDump = createTrackedJsonDump();
        
        jsonDump._saveDaly = 200;
        jsonDump._loadDelay = 100;
        jsonDump._insertDelay = 50;
        jsonDump._deleteDelay = 75;
        jsonDump._updateDelay = 25;
        jsonDump._watchInterval = 300;
        
        expect(jsonDump._saveDaly).toBe(200);
        expect(jsonDump._loadDelay).toBe(100);
        expect(jsonDump._insertDelay).toBe(50);
        expect(jsonDump._deleteDelay).toBe(75);
        expect(jsonDump._updateDelay).toBe(25);
        expect(jsonDump._watchInterval).toBe(300);
      });

      it.skip('should auto-stop file watching after maxCount intervals', async () => {
        const jsonDump = createTrackedJsonDump(undefined, undefined, 3); // Set low maxCount for testing
        jsonDump._watchInterval = 20; // Fast interval for testing
        
        const notifications: StorageDump[] = [];
        
        const unsubscribe = await jsonDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Wait for auto-stop (3 intervals * 20ms + buffer)
        await _delay(100);
        
        // File watcher should be auto-stopped
        expect(jsonDump['_fileWatcher']).toBeUndefined();
        expect(jsonDump['_intervalCount']).toBe(0); // Reset after stop
        
        // Clean up subscription to prevent timer leaks
        unsubscribe();
      });
    });

    describe('File Operations', () => {
      it('should create JSON file if not exists', async () => {
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        
        // File should not exist initially
        expect(fs.existsSync(filePath)).toBe(false);
        
        // Save should create the file
        await jsonDump.save({ links: [] });
        expect(fs.existsSync(filePath)).toBe(true);
        
        // File should contain valid JSON
        const content = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        expect(parsed).toEqual({ links: [] });
      });

      it('should load existing JSON file', async () => {
        const filePath = createTempFilePath();
        const testDump: StorageDump = {
          links: [{
            _id: 'existing-test',
            _type: 'test-type',
            _created_at: 100,
            _updated_at: 200,
            _i: 1
          }]
        };
        
        // Create file manually
        await fs.promises.writeFile(filePath, JSON.stringify(testDump), 'utf8');
        
        const jsonDump = createTrackedJsonDump(filePath);
        const loadedDump = await jsonDump.load();
        
        expect(loadedDump).toEqual(testDump);
      });

      it('should handle corrupted JSON files gracefully', async () => {
        const filePath = createTempFilePath();
        
        // Create corrupted JSON file
        await fs.promises.writeFile(filePath, '{ invalid json }', 'utf8');
        
        const jsonDump = createTrackedJsonDump(filePath);
        
        // Should handle corruption gracefully
        await expect(jsonDump.load()).rejects.toThrow();
      });

      it('should perform atomic writes', async () => {
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        
        const testDump: StorageDump = {
          links: [{
            _id: 'atomic-test',
            _type: 'test-type',
            _created_at: 300,
            _updated_at: 400,
            _i: 2
          }]
        };
        
        // Save should be atomic (no temp files left behind)
        await jsonDump.save(testDump);
        
        expect(fs.existsSync(filePath)).toBe(true);
        expect(fs.existsSync(filePath + '.tmp')).toBe(false);
        
        const content = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content);
        expect(parsed).toEqual(testDump);
      });
    });

    describe('save() and load() operations', () => {
      it('should save and load dump with delays', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._saveDaly = 10;
        jsonDump._loadDelay = 5;
        
        const testDump: StorageDump = {
          links: [{
            _id: 'save-test',
            _type: 'test-type',
            _created_at: 100,
            _updated_at: 200,
            _i: 1
          }]
        };
        
        const startTime = Date.now();
        await jsonDump.save(testDump);
        const saveTime = Date.now() - startTime;
        
        expect(saveTime).toBeGreaterThanOrEqual(10);
        expect(jsonDump.dump).toEqual(testDump);
        
        const loadStartTime = Date.now();
        const loadedDump = await jsonDump.load();
        const loadTime = Date.now() - loadStartTime;
        
        expect(loadTime).toBeGreaterThanOrEqual(5);
        expect(loadedDump).toEqual(testDump);
      });
    });

    describe('insert() operation', () => {
      it('should insert link with delay', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._insertDelay = 10;
        
        const testLink: StorageLink = {
          _id: 'insert-test',
          _type: 'test-type',
          _created_at: 300,
          _updated_at: 400,
          _i: 2
        };
        
        const startTime = Date.now();
        await jsonDump.insert(testLink);
        const insertTime = Date.now() - startTime;
        
        expect(insertTime).toBeGreaterThanOrEqual(10);
        expect(jsonDump.dump.links).toHaveLength(1);
        expect(jsonDump.dump.links[0]).toEqual(testLink);
        
        // Check file was updated
        const fileContent = await fs.promises.readFile(jsonDump.filePath, 'utf8');
        const fileDump = JSON.parse(fileContent);
        expect(fileDump.links).toHaveLength(1);
        expect(fileDump.links[0]).toEqual(testLink);
      });

      it('should throw error when inserting duplicate link', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._insertDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'duplicate-test',
          _type: 'test-type',
          _created_at: 500,
          _updated_at: 600,
          _i: 3
        };
        
        await jsonDump.insert(testLink);
        
        await expect(jsonDump.insert(testLink)).rejects.toThrow('Link with id duplicate-test already exists');
      });

      it('should call _onDelta callback on insert', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._insertDelay = 1;
        
        const deltaCallback = jest.fn();
        jsonDump._onDelta = deltaCallback;
        
        const testLink: StorageLink = {
          _id: 'delta-insert-test',
          _type: 'test-type',
          _created_at: 700,
          _updated_at: 800,
          _i: 4
        };
        
        await jsonDump.insert(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'insert',
          link: testLink
        });
      });
    });

    describe('delete() operation', () => {
      it('should delete link with delay', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._deleteDelay = 10;
        
        const testLink: StorageLink = {
          _id: 'delete-test',
          _type: 'test-type',
          _created_at: 900,
          _updated_at: 1000,
          _i: 5
        };
        
        // Insert first
        await jsonDump.insert(testLink);
        expect(jsonDump.dump.links).toHaveLength(1);
        
        const startTime = Date.now();
        await jsonDump.delete(testLink);
        const deleteTime = Date.now() - startTime;
        
        expect(deleteTime).toBeGreaterThanOrEqual(10);
        expect(jsonDump.dump.links).toHaveLength(0);
        
        // Check file was updated
        const fileContent = await fs.promises.readFile(jsonDump.filePath, 'utf8');
        const fileDump = JSON.parse(fileContent);
        expect(fileDump.links).toHaveLength(0);
      });

      it('should throw error when deleting non-existent link', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._deleteDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'non-existent',
          _type: 'test-type',
          _created_at: 1100,
          _updated_at: 1200,
          _i: 6
        };
        
        await expect(jsonDump.delete(testLink)).rejects.toThrow('Link with id non-existent not found');
      });

      it('should call _onDelta callback on delete', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._deleteDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'delta-delete-test',
          _type: 'test-type',
          _created_at: 1300,
          _updated_at: 1400,
          _i: 7
        };
        
        // Insert first
        await jsonDump.insert(testLink);
        
        const deltaCallback = jest.fn();
        jsonDump._onDelta = deltaCallback;
        
        await jsonDump.delete(testLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'delete',
          id: testLink._id
        });
      });
    });

    describe('update() operation', () => {
      it('should update link with delay', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._updateDelay = 10;
        
        const originalLink: StorageLink = {
          _id: 'update-test',
          _type: 'test-type',
          _created_at: 1500,
          _updated_at: 1600,
          _i: 8
        };
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 1700,
          _string: 'updated-value'
        };
        
        // Insert first
        await jsonDump.insert(originalLink);
        
        const startTime = Date.now();
        await jsonDump.update(updatedLink);
        const updateTime = Date.now() - startTime;
        
        expect(updateTime).toBeGreaterThanOrEqual(10);
        expect(jsonDump.dump.links).toHaveLength(1);
        expect(jsonDump.dump.links[0]).toEqual(updatedLink);
        
        // Check file was updated
        const fileContent = await fs.promises.readFile(jsonDump.filePath, 'utf8');
        const fileDump = JSON.parse(fileContent);
        expect(fileDump.links[0]).toEqual(updatedLink);
      });

      it('should throw error when updating non-existent link', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._updateDelay = 1;
        
        const testLink: StorageLink = {
          _id: 'non-existent-update',
          _type: 'test-type',
          _created_at: 1800,
          _updated_at: 1900,
          _i: 9
        };
        
        await expect(jsonDump.update(testLink)).rejects.toThrow('Link with id non-existent-update not found');
      });

      it('should call _onDelta callback on update', async () => {
        const jsonDump = createTrackedJsonDump();
        jsonDump._updateDelay = 1;
        
        const originalLink: StorageLink = {
          _id: 'delta-update-test',
          _type: 'test-type',
          _created_at: 2000,
          _updated_at: 2100,
          _i: 10
        };
        
        const updatedLink: StorageLink = {
          ...originalLink,
          _updated_at: 2200,
          _string: 'delta-updated'
        };
        
        // Insert first
        await jsonDump.insert(originalLink);
        
        const deltaCallback = jest.fn();
        jsonDump._onDelta = deltaCallback;
        
        await jsonDump.update(updatedLink);
        
        expect(deltaCallback).toHaveBeenCalledWith({
          operation: 'update',
          id: updatedLink._id,
          link: updatedLink
        });
      });
    });

    describe('File Watching and Subscriptions', () => {
      it.skip('should detect external file changes', async () => {
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        
        const notifications: StorageDump[] = [];
        const unsubscribe = await jsonDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Modify file externally
        const externalDump: StorageDump = {
          links: [{
            _id: 'external-change',
            _type: 'test-type',
            _created_at: 2300,
            _updated_at: 2400,
            _i: 11
          }]
        };
        
        await fs.promises.writeFile(filePath, JSON.stringify(externalDump), 'utf8');
        
        // Wait for file watcher to detect change
        await _delay(100);
        
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[notifications.length - 1]).toEqual(externalDump);
        
        unsubscribe();
      });

      it('should notify subscribers of changes', async () => {
        const jsonDump = createTrackedJsonDump();
        
        const notifications1: StorageDump[] = [];
        const notifications2: StorageDump[] = [];
        
        const unsubscribe1 = await jsonDump.subscribe((dump) => {
          notifications1.push(dump);
        });
        
        const unsubscribe2 = await jsonDump.subscribe((dump) => {
          notifications2.push(dump);
        });
        
        // Make a change
        const testLink: StorageLink = {
          _id: 'notify-test',
          _type: 'test-type',
          _created_at: 2500,
          _updated_at: 2600,
          _i: 12
        };
        
        await jsonDump.insert(testLink);
        
        // Wait for notifications
        await _delay(50);
        
        // Both subscribers should be notified
        expect(notifications1.length).toBeGreaterThan(0);
        expect(notifications2.length).toBeGreaterThan(0);
        
        unsubscribe1();
        unsubscribe2();
      });

      it('should handle file deletion and recreation', async () => {
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        
        // Create initial file
        await jsonDump.save({ links: [] });
        expect(fs.existsSync(filePath)).toBe(true);
        
        const notifications: StorageDump[] = [];
        const unsubscribe = await jsonDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Delete file externally
        await fs.promises.unlink(filePath);
        expect(fs.existsSync(filePath)).toBe(false);
        
        // Recreate file with new content
        const newDump: StorageDump = {
          links: [{
            _id: 'recreated-file',
            _type: 'test-type',
            _created_at: 2700,
            _updated_at: 2800,
            _i: 13
          }]
        };
        
        await fs.promises.writeFile(filePath, JSON.stringify(newDump), 'utf8');
        
        // Wait for file watcher to detect recreation
        await _delay(100);
        
        // Should handle gracefully
        expect(fs.existsSync(filePath)).toBe(true);
        
        unsubscribe();
      });

      it('should stop file watching when no subscribers', async () => {
        const jsonDump = createTrackedJsonDump();
        
        const unsubscribe1 = await jsonDump.subscribe(() => {});
        const unsubscribe2 = await jsonDump.subscribe(() => {});
        
        // File watcher should be active
        expect(jsonDump['_fileWatcher']).toBeDefined();
        
        unsubscribe1();
        // Still has one subscriber, watcher should remain
        expect(jsonDump['_fileWatcher']).toBeDefined();
        
        unsubscribe2();
        // No more subscribers, watcher should stop
        expect(jsonDump['_fileWatcher']).toBeUndefined();
      });

      it('should subscribe to changes and receive notifications', async () => {
        const jsonDump = createTrackedJsonDump();
        
        const notifications: StorageDump[] = [];
        const unsubscribe = await jsonDump.subscribe((dump) => {
          notifications.push(dump);
        });
        
        // Make a change
        const testLink: StorageLink = {
          _id: 'notify-test',
          _type: 'test-type',
          _created_at: 2500,
          _updated_at: 2600,
          _i: 12
        };
        
        await jsonDump.insert(testLink);
        
        // Wait for notifications
        await _delay(50);
        
        // Check if notifications are received
        expect(notifications.length).toBeGreaterThan(0);
        const lastNotification = notifications[notifications.length - 1];
        expect(lastNotification.links).toHaveLength(1);
        expect(lastNotification.links[0]).toEqual(testLink);
        
        unsubscribe();
      });
    });

    describe('Multi-Process Simulation', () => {
      it('should sync between multiple StorageJsonDump instances', async () => {
        const filePath = createTempFilePath();
        
        const jsonDump1 = createTrackedJsonDump(filePath);
        const jsonDump2 = createTrackedJsonDump(filePath);
        
        // Configure faster intervals for testing
        jsonDump1._watchInterval = 50;
        jsonDump2._watchInterval = 50;
        jsonDump1._insertDelay = 10;
        jsonDump2._insertDelay = 10;
        
        // Set up subscriptions
        const notifications1: StorageDump[] = [];
        const notifications2: StorageDump[] = [];
        
        const unsubscribe1 = await jsonDump1.subscribe((dump) => {
          notifications1.push(dump);
        });
        
        const unsubscribe2 = await jsonDump2.subscribe((dump) => {
          notifications2.push(dump);
        });
        
        // Make change in first instance
        const testLink: StorageLink = {
          _id: 'multi-process-test',
          _type: 'test-type',
          _created_at: 2900,
          _updated_at: 3000,
          _i: 14
        };
        
        await jsonDump1.insert(testLink);
        
        // Wait for synchronization (longer wait time)
        await _delay(300);
        
        // Second instance should receive the change
        expect(notifications2.length).toBeGreaterThan(0);
        expect(jsonDump2.dump.links).toContainEqual(testLink);
        
        unsubscribe1();
        unsubscribe2();
      });

      it('should handle concurrent writes from different instances', async () => {
        const filePath = createTempFilePath();
        
        const jsonDump1 = createTrackedJsonDump(filePath);
        const jsonDump2 = createTrackedJsonDump(filePath);
        
        // Configure faster operations for testing
        jsonDump1._insertDelay = 10;
        jsonDump2._insertDelay = 10;
        
        const link1: StorageLink = {
          _id: 'concurrent-1',
          _type: 'test-type',
          _created_at: 3100,
          _updated_at: 3200,
          _i: 15
        };
        
        const link2: StorageLink = {
          _id: 'concurrent-2',
          _type: 'test-type',
          _created_at: 3300,
          _updated_at: 3400,
          _i: 16
        };
        
        // Insert first link
        await jsonDump1.insert(link1);
        
        // Small delay to avoid exact concurrency
        await _delay(20);
        
        // Insert second link from different instance
        await jsonDump2.insert(link2);
        
        // Wait for synchronization
        await _delay(100);
        
        // Both links should eventually be present
        const finalContent = await fs.promises.readFile(filePath, 'utf8');
        const finalDump = JSON.parse(finalContent);
        
        expect(finalDump.links.length).toBe(2);
        expect(finalDump.links.some((l: StorageLink) => l._id === 'concurrent-1')).toBe(true);
        expect(finalDump.links.some((l: StorageLink) => l._id === 'concurrent-2')).toBe(true);
      });

      it('should maintain data consistency', async () => {
        const filePath = createTempFilePath();
        
        const jsonDump1 = createTrackedJsonDump(filePath);
        const jsonDump2 = createTrackedJsonDump(filePath);
        const jsonDump3 = createTrackedJsonDump(filePath);
        
        // Configure faster operations for testing
        jsonDump1._insertDelay = 5;
        jsonDump2._insertDelay = 5;
        jsonDump3._insertDelay = 5;
        
        // Perform operations sequentially with small delays to simulate near-concurrent access
        await jsonDump1.insert({
          _id: 'consistency-1',
          _type: 'test-type',
          _created_at: 3500,
          _updated_at: 3600,
          _i: 17
        });
        
        // Small delay to simulate near-concurrent access
        await _delay(10);
        
        await jsonDump2.insert({
          _id: 'consistency-2',
          _type: 'test-type',
          _created_at: 3700,
          _updated_at: 3800,
          _i: 18
        });
        
        // Small delay to simulate near-concurrent access
        await _delay(10);
        
        await jsonDump3.insert({
          _id: 'consistency-3',
          _type: 'test-type',
          _created_at: 3900,
          _updated_at: 4000,
          _i: 19
        });
        
        // Wait for all synchronizations
        await _delay(100);
        
        // All instances should have consistent state
        const finalContent = await fs.promises.readFile(filePath, 'utf8');
        const finalDump = JSON.parse(finalContent);
        
        expect(finalDump.links.length).toBe(3);
        expect(finalDump.links.map((l: StorageLink) => l._id).sort()).toEqual([
          'consistency-1',
          'consistency-2',
          'consistency-3'
        ]);
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it.skip('should handle file permission errors gracefully', async () => {
        // This test might be platform-specific
        const filePath = createTempFilePath();
        const jsonDump = createTrackedJsonDump(filePath);
        
        // Create file first
        await jsonDump.save({ links: [] });
        
        // Try to make file read-only (if supported by platform)
        try {
          await fs.promises.chmod(filePath, 0o444);
          
          const testLink: StorageLink = {
            _id: 'permission-test',
            _type: 'test-type',
            _created_at: 4100,
            _updated_at: 4200,
            _i: 20
          };
          
          await expect(jsonDump.insert(testLink)).rejects.toThrow();
          
          // Restore permissions for cleanup
          await fs.promises.chmod(filePath, 0o644);
        } catch (error) {
          // Skip test if chmod not supported
          console.log('Skipping permission test - chmod not supported');
        }
      });

      it('should handle large JSON files efficiently', async () => {
        const jsonDump = createTrackedJsonDump();
        
        // Create large dump
        const largeDump: StorageDump = {
          links: Array.from({ length: 1000 }, (_, i) => ({
            _id: `large-test-${i}`,
            _type: 'test-type',
            _created_at: 4300 + i,
            _updated_at: 4400 + i,
            _i: 21 + i
          }))
        };
        
        const startTime = Date.now();
        await jsonDump.save(largeDump);
        const saveTime = Date.now() - startTime;
        
        // Should handle large files reasonably quickly
        expect(saveTime).toBeLessThan(5000); // 5 seconds max
        
        const loadStartTime = Date.now();
        const loadedDump = await jsonDump.load();
        const loadTime = Date.now() - loadStartTime;
        
        expect(loadTime).toBeLessThan(5000); // 5 seconds max
        expect(loadedDump.links.length).toBe(1000);
      });

      it('should cleanup resources on destroy', async () => {
        const jsonDump = createTrackedJsonDump();
        
        // Set up subscriptions and watchers
        const unsubscribe = await jsonDump.subscribe(() => {});
        
        expect(jsonDump['_fileWatcher']).toBeDefined();
        expect(jsonDump['_subscriptionCallbacks'].size).toBeGreaterThan(0);
        
        jsonDump.destroy();
        
        expect(jsonDump['_fileWatcher']).toBeUndefined();
        expect(jsonDump['_subscriptionCallbacks'].size).toBe(0);
      });
    });
  });

  describe('StorageJson Function', () => {
    describe('Delta Strategy', () => {
      it.skip('should use delta strategy by default', () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storage = new deep.StorageJson({
        //   filePath,
        //   strategy: 'delta'
        // });
        
        // expect(storage).toBeDefined();
        // expect(storage._type).toBe(deep.Storage._id);
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should sync local changes to JSON file', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep, storage);
        
        // // Create association
        // const testAssociation = new deep();
        // testAssociation.store(storage, deep.storageMarkers.oneTrue);
        
        // // Wait for sync
        // await _delay(100);
        
        // // Check file was updated
        // const fileContent = await fs.promises.readFile(filePath, 'utf8');
        // const fileDump = JSON.parse(fileContent);
        // expect(fileDump.links.some((l: StorageLink) => l._id === testAssociation._id)).toBe(true);
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should apply external changes from JSON file', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep, storage);
        
        // // Modify file externally
        // const externalLink: StorageLink = {
        //   _id: 'external-association',
        //   _type: deep._id,
        //   _created_at: 5000,
        //   _updated_at: 5100,
        //   _i: 1000
        // };
        
        // await storageJsonDump.insert(externalLink);
        
        // // Wait for sync
        // await _delay(100);
        
        // // Check association was created in deep
        // expect(deep._ids.has('external-association')).toBe(true);
        // const association = new deep('external-association');
        // expect(association.isStored(storage)).toBe(true);
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should prevent event recursion with __isStorageEvent', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep, storage);
        
        // // Track delta calls
        // const deltaCallback = jest.fn();
        // storageJsonDump._onDelta = deltaCallback;
        
        // // Create association (should trigger delta)
        // const testAssociation = new deep();
        // testAssociation.store(storage, deep.storageMarkers.oneTrue);
        
        // // Wait for processing
        // await _delay(100);
        
        // // Should have called delta once
        // expect(deltaCallback).toHaveBeenCalledTimes(1);
        
        // // Reset mock
        // deltaCallback.mockClear();
        
        // // Apply external change (should NOT trigger delta due to __isStorageEvent)
        // const externalLink: StorageLink = {
        //   _id: 'external-no-recursion',
        //   _type: deep._id,
        //   _created_at: 5200,
        //   _updated_at: 5300,
        //   _i: 1001
        // };
        
        // await storageJsonDump.insert(externalLink);
        
        // // Wait for processing
        // await _delay(100);
        
        // // Should NOT have triggered additional delta calls
        // expect(deltaCallback).not.toHaveBeenCalled();
        
        throw new Error('StorageJson function not implemented yet');
      });
    });

    describe('Multi-Deep Instance Synchronization', () => {
      it.skip('should synchronize data across multiple deep instances via JSON file', async () => {
        const filePath = createTempFilePath();
        
        // Create two separate deep instances
        const deep1 = newDeep();
        const deep2 = newDeep();
        
        // const storageJsonDump1 = createTrackedJsonDump(filePath);
        // const storageJsonDump2 = createTrackedJsonDump(filePath);
        
        // const storage1 = new deep1.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump1,
        //   strategy: 'delta'
        // });
        
        // const storage2 = new deep2.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump2,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep1, storage1);
        // defaultMarking(deep2, storage2);
        
        // // Create association in first instance
        // const association1 = new deep1();
        // association1.store(storage1, deep1.storageMarkers.oneTrue);
        
        // // Wait for synchronization
        // await _delay(200);
        
        // // Check association appears in second instance
        // expect(deep2._ids.has(association1._id)).toBe(true);
        // const association2 = new deep2(association1._id);
        // expect(association2.isStored(storage2)).toBe(true);
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should handle complex association hierarchies', async () => {
        const filePath = createTempFilePath();
        
        const deep1 = newDeep();
        const deep2 = newDeep();
        
        // const storageJsonDump1 = createTrackedJsonDump(filePath);
        // const storageJsonDump2 = createTrackedJsonDump(filePath);
        
        // const storage1 = new deep1.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump1,
        //   strategy: 'delta'
        // });
        
        // const storage2 = new deep2.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump2,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep1, storage1);
        // defaultMarking(deep2, storage2);
        
        // // Create complex hierarchy in first instance
        // const parent = new deep1();
        // const child = new deep1();
        // const grandchild = new deep1();
        
        // child.type = parent;
        // grandchild.type = child;
        // grandchild.from = parent;
        // grandchild.to = child;
        
        // // Store all associations
        // parent.store(storage1, deep1.storageMarkers.oneTrue);
        // child.store(storage1, deep1.storageMarkers.oneTrue);
        // grandchild.store(storage1, deep1.storageMarkers.oneTrue);
        
        // // Wait for synchronization
        // await _delay(300);
        
        // // Check hierarchy is preserved in second instance
        // expect(deep2._ids.has(parent._id)).toBe(true);
        // expect(deep2._ids.has(child._id)).toBe(true);
        // expect(deep2._ids.has(grandchild._id)).toBe(true);
        
        // const parent2 = new deep2(parent._id);
        // const child2 = new deep2(child._id);
        // const grandchild2 = new deep2(grandchild._id);
        
        // expect(child2._type).toBe(parent._id);
        // expect(grandchild2._type).toBe(child._id);
        // expect(grandchild2._from).toBe(parent._id);
        // expect(grandchild2._to).toBe(child._id);
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should maintain referential integrity', async () => {
        const filePath = createTempFilePath();
        
        const deep1 = newDeep();
        const deep2 = newDeep();
        
        // const storageJsonDump1 = createTrackedJsonDump(filePath);
        // const storageJsonDump2 = createTrackedJsonDump(filePath);
        
        // const storage1 = new deep1.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump1,
        //   strategy: 'delta'
        // });
        
        // const storage2 = new deep2.StorageJson({
        //   filePath,
        //   storageJsonDump: storageJsonDump2,
        //   strategy: 'delta'
        // });
        
        // defaultMarking(deep1, storage1);
        // defaultMarking(deep2, storage2);
        
        // // Create associations with references
        // const typeAssoc = new deep1();
        // const fromAssoc = new deep1();
        // const toAssoc = new deep1();
        // const valueAssoc = new deep1();
        // const mainAssoc = new deep1();
        
        // // Set up references
        // mainAssoc.type = typeAssoc;
        // mainAssoc.from = fromAssoc;
        // mainAssoc.to = toAssoc;
        // mainAssoc.value = valueAssoc;
        
        // // Store all associations
        // [typeAssoc, fromAssoc, toAssoc, valueAssoc, mainAssoc].forEach(assoc => {
        //   assoc.store(storage1, deep1.storageMarkers.oneTrue);
        // });
        
        // // Wait for synchronization
        // await _delay(300);
        
        // // Check referential integrity in second instance
        // const mainAssoc2 = new deep2(mainAssoc._id);
        // expect(mainAssoc2._type).toBe(typeAssoc._id);
        // expect(mainAssoc2._from).toBe(fromAssoc._id);
        // expect(mainAssoc2._to).toBe(toAssoc._id);
        // expect(mainAssoc2._value).toBe(valueAssoc._id);
        
        // // All referenced associations should exist
        // expect(deep2._ids.has(typeAssoc._id)).toBe(true);
        // expect(deep2._ids.has(fromAssoc._id)).toBe(true);
        // expect(deep2._ids.has(toAssoc._id)).toBe(true);
        // expect(deep2._ids.has(valueAssoc._id)).toBe(true);
        
        throw new Error('StorageJson function not implemented yet');
      });
    });

    describe('Subscription Strategy Support', () => {
      it.skip('should support subscription strategy as alternative', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'subscription'
        // });
        
        // expect(storage).toBeDefined();
        // expect(storage._type).toBe(deep.Storage._id);
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should handle subscription strategy correctly', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'subscription'
        // });
        
        // defaultMarking(deep, storage);
        
        // // Create association
        // const testAssociation = new deep();
        // testAssociation.store(storage, deep.storageMarkers.oneTrue);
        
        // // Wait for sync
        // await _delay(100);
        
        // // Check file was updated
        // const fileContent = await fs.promises.readFile(filePath, 'utf8');
        // const fileDump = JSON.parse(fileContent);
        // expect(fileDump.links.some((l: StorageLink) => l._id === testAssociation._id)).toBe(true);
        
        throw new Error('StorageJson function not implemented yet');
      });
    });

    describe('Integration and Cleanup', () => {
      it.skip('should integrate with existing storage system', () => {
        const deep = newDeep();
        
        // Check that StorageJson is available
        // expect(deep.StorageJson).toBeDefined();
        // expect(typeof deep.StorageJson).toBe('function');
        
        throw new Error('StorageJson function not implemented yet');
      });

      it.skip('should cleanup resources on storage destruction', async () => {
        const deep = newDeep();
        const filePath = createTempFilePath();
        
        // const storageJsonDump = createTrackedJsonDump(filePath);
        // const storage = new deep.StorageJson({
        //   filePath,
        //   storageJsonDump,
        //   strategy: 'delta'
        // });
        
        // // Set up subscriptions
        // defaultMarking(deep, storage);
        
        // // Destroy storage
        // storage.destroy();
        
        // // Check cleanup
        // expect(storageJsonDump['_fileWatcher']).toBeUndefined();
        // expect(storageJsonDump['_subscriptionCallbacks'].size).toBe(0);
        
        throw new Error('StorageJson function not implemented yet');
      });
    });
  });
}); 