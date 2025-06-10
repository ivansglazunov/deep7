// This file will contain tests for the tracking system. 

import { newDeep } from '.';

describe('Tracking', () => {
  it('should manually track events between two arrays', () => {
    const deep = newDeep();
    const arr1 = new deep.Array([1, 2]);
    const arr2 = new deep.Array([]);

    const receivedEvents: { eventId: string, args: any[] }[] = [];
    
    // Define the handler on the 'to' object's state (not context)
    arr2._state._onTracker = (event: any, ...args: any[]) => {
      receivedEvents.push({ eventId: event._id, args });
    };

    // Start tracking
    const tracker = arr1.track(arr2);
    expect(tracker.type.is(deep.Tracker)).toBe(true);
    expect(tracker.from._id).toBe(arr1._id);
    expect(tracker.to._id).toBe(arr2._id);

    // --- Test ADD event ---
    arr1.add(3);
    expect(receivedEvents.length).toBe(2); // dataAdd + dataChanged
    
    // Check dataAdd event
    expect(receivedEvents[0].eventId).toBe(deep.events.dataAdd._id);
    expect(receivedEvents[0].args.length).toBe(1);
    expect(receivedEvents[0].args[0]._symbol).toBe(3);

    // Check dataChanged event
    expect(receivedEvents[1].eventId).toBe(deep.events.dataChanged._id);

    // --- Test DELETE event ---
    arr1.delete(1);
    expect(receivedEvents.length).toBe(4); // + dataDelete + dataChanged

    // Check dataDelete event
    expect(receivedEvents[2].eventId).toBe(deep.events.dataDelete._id);
    expect(receivedEvents[2].args.length).toBe(1);
    expect(receivedEvents[2].args[0]._symbol).toBe(1);

    // --- Test Untracking ---
    const untrackResult = arr1.untrack(arr2);
    expect(untrackResult).toBe(true);

    // This should not trigger the handler anymore
    arr1.add(4);
    expect(receivedEvents.length).toBe(4); // No new events
  });

  it('should make array.map() reactive using tracking system', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const mappedArray = sourceArray.map((x: number) => x * 2);
    
    // Verify initial mapping
    expect(mappedArray._data).toEqual([2, 4, 6]);
    
    // Test reactivity by adding to source
    sourceArray.add(4);
    expect(mappedArray._data).toEqual([2, 4, 6, 8]);
    
    // Test that isTrackable works
    expect(deep.Array.map.isTrackable).toBe(true);
  });

  it('should support chained reactive maps', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const doubledArray = sourceArray.map((x: number) => x * 2);
    const incrementedArray = doubledArray.map((x: number) => x + 1);
    
    // Verify chained maps work
    expect(incrementedArray._data).toEqual([3, 5, 7]);
    
    // Test reactivity through the chain
    sourceArray.add(4);
    expect(doubledArray._data).toEqual([2, 4, 6, 8]);
    expect(incrementedArray._data).toEqual([3, 5, 7, 9]);
  });

  it('should support isTrackable field and Trackable functionality', () => {
    const deep = newDeep();
    
    // Test that Array.map is trackable
    expect(deep.Array.map.isTrackable).toBe(true);
    
    // Test that Array.map has trackable in context
    expect(deep.Array.map._context.trackable).toBeDefined();
    expect(deep.Array.map._context.trackable.type.is(deep.Trackable)).toBe(true);
    
    // Test that trackable.value is the Function and trackable.data is the original function
    const trackable = deep.Array.map._context.trackable;
    expect(trackable.value.type.is(deep.Function)).toBe(true);
    expect(typeof trackable.data).toBe('function');
    
    // Test that regular objects are not trackable
    const regularArray = new deep.Array([1, 2, 3]);
    expect(regularArray.isTrackable).toBe(false);
    
    // Test that regular methods are not trackable
    expect(deep.Array.add.isTrackable).toBe(false);
    expect(deep.Array.delete.isTrackable).toBe(false);
  });

  it('should create tracker and handle array updates', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const targetArray = new deep.Array([]);
    
    // Set up _onTracker function to copy data changes
    targetArray._state._onTracker = function(event: any, ...args: any[]) {
      // Simply copy the data from source to target
      this._data = sourceArray._data;
    };
    
    // Create tracker relationship
    const tracker = sourceArray.track(targetArray);
    
    // Verify tracker was created
    expect(tracker).toBeDefined();
    expect(tracker.from._id).toBe(sourceArray._id);
    expect(tracker.to._id).toBe(targetArray._id);
  });

  it('should handle manual tracking with _onTracker', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const targetArray = new deep.Array([]);
    
    let eventCount = 0;
    
    targetArray._state._onTracker = function(event: any, ...args: any[]) {
      eventCount++;
    };
    
    // Create tracker
    const tracker = sourceArray.track(targetArray);
    
    // Manually trigger events to test tracking
    sourceArray.add(4);
    
    // Verify the tracking function was called (expect 2 events: dataAdd + dataChanged)
    expect(eventCount).toBe(2);
  });

  it('should handle reactive map functionality', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const mappedArray = sourceArray.map((x: number) => x * 2);
    
    // Verify the reactive map was created properly
    expect(mappedArray).toBeDefined();
    expect(mappedArray._data).toEqual([2, 4, 6]); // Use _data instead of Array.from
    
    // Test reactivity by modifying source
    sourceArray.add(4);
    expect(mappedArray._data).toEqual([2, 4, 6, 8]); // Use _data instead of Array.from
  });
});

describe('Trackable', () => {
  it('should create a new deep.Trackable with a function', () => {
    const deep = newDeep();
    
    const testFn = function(this: any, event: any, ...args: any[]) {
    };
    
    const trackable = new deep.Trackable(testFn);
    
    // Check that trackable is properly typed
    expect(trackable.type.is(deep.Trackable)).toBe(true);
    
    // Check that trackable.value is a deep.Function
    expect(trackable.value.type.is(deep.Function)).toBe(true);
    
    // Check that trackable.data is the original function
    expect(trackable.data).toBe(testFn);
  });

  it('should create a trackable with a string function id', () => {
    const deep = newDeep();
    
    // First create a function
    const testFn = function(this: any, event: any, ...args: any[]) {
    };
    const fn = new deep.Function(testFn);
    
    // Now create trackable with string id
    const trackable = new deep.Trackable(fn._id);
    
    expect(trackable.type.is(deep.Trackable)).toBe(true);
    expect(trackable.value.type.is(deep.Function)).toBe(true);
  });

  it('should throw error for invalid trackable argument', () => {
    const deep = newDeep();
    
    expect(() => {
      new deep.Trackable(123);
    }).toThrow('trackable must got function or string id but got number');
    
    expect(() => {
      new deep.Trackable('invalid-id');
    }).toThrow('trackable must be a function but got string');
  });

  it('should verify isTrackable field works correctly', () => {
    const deep = newDeep();
    
    // Regular array should not be trackable
    const regularArray = new deep.Array([1, 2, 3]);
    expect(regularArray.isTrackable).toBe(false);
    
    // Array.map should be trackable
    expect(deep.Array.map.isTrackable).toBe(true);
    
    // Regular deep instance should not be trackable
    const regularDeep = new deep();
    expect(regularDeep.isTrackable).toBe(false);
  });
});

describe('[DEBUG] Tracking System Debug', () => {
  it('should debug basic tracker creation and event flow', () => {
    const deep = newDeep();
    
    const sourceArray = new deep.Array([1, 2, 3]);
    const targetArray = new deep.Array([]);
    
    
    let eventCount = 0;
    targetArray._state._onTracker = function(event: any, ...args: any[]) {
      eventCount++;
      this._data = sourceArray._data.slice(); // Copy source data
    };
    
    const tracker = sourceArray.track(targetArray);
    
    sourceArray.add(4);
    
    expect(eventCount).toBeGreaterThan(0);
  });
  
  it('should debug trackable creation and data access', () => {
    const deep = newDeep();
    
    const jsFunction = function(event: any, ...args: any[]) {
    };
    
    const trackable = new deep.Trackable(jsFunction);
    
    
    const sourceArray = new deep.Array([1, 2, 3]);
    
    const mappedArray = sourceArray.map((x: any) => x * 2);
    
    expect(trackable.type.is(deep.Trackable)).toBe(true);
    expect(trackable.data).toBe(jsFunction);
  });
}); 