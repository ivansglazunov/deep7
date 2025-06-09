// This file will contain tests for the tracking system. 

import { newDeep } from '.';

describe('Tracking', () => {
  it('should manually track events between two arrays', () => {
    const deep = newDeep();
    const arr1 = new deep.Array([1, 2]);
    const arr2 = new deep.Array([]);

    const receivedEvents: { eventId: string, args: any[] }[] = [];
    
    // Define the handler on the 'to' object's context
    arr2._context._onTracker = (event: any, ...args: any[]) => {
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
    
    // Create reactive map: each element multiplied by 2
    const mappedArray = sourceArray.map((x: number) => x * 2);
    
    // Initial state should be correct
    expect(mappedArray._data).toEqual([2, 4, 6]);
    
    // Adding to source should update mapped array
    sourceArray.add(4);
    expect(sourceArray._data).toEqual([1, 2, 3, 4]);
    expect(mappedArray._data).toEqual([2, 4, 6, 8]); // Should automatically update
    
    // Deleting from source should update mapped array
    sourceArray.delete(2);
    expect(sourceArray._data).toEqual([1, 3, 4]);
    expect(mappedArray._data).toEqual([2, 6, 8]); // Should automatically update
    
    // Adding another element
    sourceArray.add(5);
    expect(sourceArray._data).toEqual([1, 3, 4, 5]);
    expect(mappedArray._data).toEqual([2, 6, 8, 10]); // Should automatically update
  });

  it('should support chained reactive maps', () => {
    const deep = newDeep();
    const source = new deep.Array([1, 2]);
    
    // Chain: source -> double -> square
    const doubled = source.map((x: number) => x * 2);      // [2, 4]
    const squared = doubled.map((x: number) => x * x);     // [4, 16]
    
    // Verify initial state
    expect(source._data).toEqual([1, 2]);
    expect(doubled._data).toEqual([2, 4]);
    expect(squared._data).toEqual([4, 16]);
    
    // Change source - should propagate through the chain
    source.add(3);
    expect(source._data).toEqual([1, 2, 3]);
    expect(doubled._data).toEqual([2, 4, 6]);  // 3*2 = 6
    expect(squared._data).toEqual([4, 16, 36]); // 6*6 = 36
    
    // Delete from source - should propagate
    source.delete(1);
    expect(source._data).toEqual([2, 3]);
    expect(doubled._data).toEqual([4, 6]);
    expect(squared._data).toEqual([16, 36]);
  });
}); 