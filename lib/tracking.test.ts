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
}); 