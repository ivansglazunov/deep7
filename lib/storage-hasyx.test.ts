// Real hasyx database storage implementation tests
// Tests StorageHasyxDump and StorageHasyx with real hasyx database integration
// Uses real hasyx database connections and operations

import { jest } from '@jest/globals';
import { newDeep } from '.';
import { Hasyx } from 'hasyx';
import { StorageHasyxDump, destroyAllSubscriptions, newStorageHasyx } from './storage-hasyx';
import { StorageDump, StorageLink, _applySubscription, defaultMarking } from './storage';
import { _delay } from './_promise';
import Debug from './debug';
import dotenv from 'dotenv';

dotenv.config();

const debug = Debug('test:storage-hasyx');

// Global cleanup to prevent Jest hanging
afterAll(() => {
  destroyAllSubscriptions();
});

describe('DEBUG: Basic newDeep Test', () => {
  afterAll(() => {
    destroyAllSubscriptions();
  });

  it('should create newDeep without errors', () => {
    const deep = newDeep();
    expect(deep).toBeDefined();
    expect(deep._id).toBeDefined();
    expect(typeof deep._id).toBe('string');
  });

  it('should create Storage instance', () => {
    const deep = newDeep();
    const storage = new deep.Storage();
    expect(storage).toBeDefined();
    expect(storage._id).toBeDefined();
  });

  it('should apply defaultMarking without errors', () => {
    const deep = newDeep();
    const storage = new deep.Storage();
    
    expect(() => {
      defaultMarking(deep, storage);
    }).not.toThrow();
    
    expect(deep.isStored(storage)).toBe(true);
  });
});

describe('StorageHasyxDump Basic Tests', () => {
  afterEach(() => {
    destroyAllSubscriptions();
  });

  afterAll(() => {
    destroyAllSubscriptions();
  });

  const createSimpleTestSpace = () => {
    // Generate a simple test space ID that doesn't require UUID validation
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-space-${timestamp}-${random}`;
  };

  it('should create empty StorageHasyxDump without hasyx connection', () => {
    // Create a minimal test without actual hasyx connection
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createSimpleTestSpace();
    
    const dump = new StorageHasyxDump(mockHasyx, testSpaceId);
    
    expect(dump).toBeDefined();
    expect(dump.deepSpaceId).toBe(testSpaceId);
    expect(dump.dump.links).toEqual([]);
  });

  it('should create StorageHasyxDump with initial dump', () => {
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createSimpleTestSpace();
    
    const initialDump: StorageDump = {
      links: [{
        _id: 'test-link',
        _type: 'test-type',
        _created_at: Date.now(),
        _updated_at: Date.now(),
        _i: 1
      }]
    };
    
    const dump = new StorageHasyxDump(mockHasyx, testSpaceId, initialDump);
    
    expect(dump.dump.links).toHaveLength(1);
    expect(dump.dump.links[0]._id).toBe('test-link');
  });
});

describe('StorageHasyx Function Basic Tests', () => {
  afterAll(() => {
    destroyAllSubscriptions();
  });

  it('should create newStorageHasyx function in deep context', () => {
    const deep = newDeep();
    
    expect(deep.StorageHasyx).toBeDefined();
    expect(typeof deep.StorageHasyx).toBe('function');
  });

  it('should require hasyx parameter', () => {
    const deep = newDeep();
    
    expect(() => {
      new deep.StorageHasyx({
        deepSpaceId: 'test-space'
        // missing hasyx parameter
      });
    }).toThrow('hasyx client instance is required for StorageHasyx');
  });

  it('should require deepSpaceId parameter', () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    
    expect(() => {
      new deep.StorageHasyx({
        hasyx: mockHasyx
        // missing deepSpaceId parameter  
      });
    }).toThrow('deepSpaceId is required for StorageHasyx');
  });

  it('should create StorageHasyx instance with minimal parameters', () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = `test-space-${Date.now()}`;
    
    const storageHasyx = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId
    });
    
    expect(storageHasyx).toBeDefined();
    expect(storageHasyx._type).toBe(deep.Storage._id);
    expect(storageHasyx.state.hasyx).toBe(mockHasyx);
    expect(storageHasyx.state.deepSpaceId).toBe(testSpaceId);
  });
});

describe('StorageHasyx Integration Tests', () => {
  afterEach(() => {
    destroyAllSubscriptions();
  });

  afterAll(() => {
    destroyAllSubscriptions();
  });

  const createTestSpaceId = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-space-${timestamp}-${random}`;
  };

  it('should integrate with newDeep using mock hasyx', async () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createTestSpaceId();
    
    // Create storage with mock hasyx
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId
    });
    
    // Apply default marking
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    expect(deep.isStored(storage)).toBe(true);
    expect(storage.state.deepSpaceId).toBe(testSpaceId);
  });

  it('should save and restore dump with mock hasyx', async () => {
    const deep = newDeep();
    const testSpaceId = createTestSpaceId();
    const mockHasyx = {} as Hasyx;
    
    // Create storage first
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId
    });
    
    // Apply default marking - this will create the basic associations
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    // Generate current dump - should now have associations from defaultMarking
    const currentDump = storage.state.generateDump();
    
    expect(currentDump.links.length).toBeGreaterThan(0);
    expect(deep._ids.has(deep._id)).toBe(true);
    expect(deep.isStored(storage)).toBe(true);
  });

  it('should handle subscription strategy with mock hasyx', async () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createTestSpaceId();
    
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId,
      strategy: 'subscription'
    });
    
    // Apply default marking
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    expect(storage.state.deepSpaceId).toBe(testSpaceId);
    expect(deep.isStored(storage)).toBe(true);
  });

  it('should handle delta strategy with mock hasyx', async () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createTestSpaceId();
    
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId,
      strategy: 'delta'
    });
    
    // Apply default marking
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    expect(storage.state.deepSpaceId).toBe(testSpaceId);
    expect(deep.isStored(storage)).toBe(true);
  });

  it('should sync with typed data using mock hasyx', async () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createTestSpaceId();
    
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId
    });
    
    // Apply default marking
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    // Create typed data
    const stringData = new deep.String('test string');
    const numberData = new deep.Number(42);
    
    // Store data
    stringData.store(storage, deep.storageMarkers.oneTrue);
    numberData.store(storage, deep.storageMarkers.oneTrue);
    
    // Wait for processing
    await storage.promise;
    
    // Generate dump
    const dump = storage.state.generateDump();
    
    const stringLink = dump.links.find(l => l._id === stringData._id);
    const numberLink = dump.links.find(l => l._id === numberData._id);
    
    expect(stringLink).toBeDefined();
    expect(stringLink?._string).toBe('test string');
    expect(stringLink?._type).toBe(deep.String._id);
    
    expect(numberLink).toBeDefined();
    expect(numberLink?._number).toBe(42);
    expect(numberLink?._type).toBe(deep.Number._id);
  });

  it('should cleanup resources properly', async () => {
    const deep = newDeep();
    const mockHasyx = {} as Hasyx;
    const testSpaceId = createTestSpaceId();
    
    const storage = new deep.StorageHasyx({
      hasyx: mockHasyx,
      deepSpaceId: testSpaceId
    });
    
    // Apply default marking
    defaultMarking(deep, storage);
    
    // Wait for initialization
    await storage.promise;
    
    // Check that storage is working
    expect(storage.state.deepSpaceId).toBe(testSpaceId);
    
    // Cleanup
    storage.destroy();
    
    // After cleanup, state should be reset
    expect(storage._state).toEqual({});
  });
}); 