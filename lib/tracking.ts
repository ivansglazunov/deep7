// This file will contain the implementation of the tracking system. 

// Implements the Tracker system for creating reactive links between deep instances.

function _parseTrackerEvent(eventType: any) {
  return function(this: any, ...args: any[]) {
    const tracker = this; // 'this' is the tracker instance
    if (tracker.to?._context?._onTracker) {
      tracker.to._context._onTracker.call(tracker.to, eventType, ...args);
    }
  };
}

export function newTracking(deep: any) {
  const Tracker = new deep.Alive(function(this: any) {
    // 'this' is the Tracker instance
    const tracker = this;
    
    // Use _state for internal, non-deep properties
    if (!tracker._state.offs) {
      tracker._state.offs = [];
    }

    const rebind = () => {
      // Clear previous subscriptions
      tracker._state.offs.forEach((off: () => void) => off());
      tracker._state.offs = [];

      if (tracker.from && tracker.to) {
        // Subscribe to data events on the 'from' instance
        const off1 = tracker.from.on(deep.events.dataAdd, _parseTrackerEvent(deep.events.dataAdd).bind(tracker));
        const off2 = tracker.from.on(deep.events.dataDelete, _parseTrackerEvent(deep.events.dataDelete).bind(tracker));
        const off3 = tracker.from.on(deep.events.dataPush, _parseTrackerEvent(deep.events.dataPush).bind(tracker));
        const off4 = tracker.from.on(deep.events.dataChanged, _parseTrackerEvent(deep.events.dataChanged).bind(tracker));

        tracker._state.offs.push(off1, off2, off3, off4);
      }
    };

    if (tracker._reason === deep.reasons.construction._id) {
      // Re-evaluate subscriptions when from/to links change
      tracker.on(deep.events.fromSetted, rebind);
      tracker.on(deep.events.toSetted, rebind);
      tracker.on(deep.events.fromDeleted, rebind);
      tracker.on(deep.events.toDeleted, rebind);
    } else if (tracker._reason === deep.reasons.destruction._id) {
      // Cleanup on destruction
      tracker._state.offs.forEach((off: () => void) => off());
      tracker._state.offs = [];
    }
  });
  deep._context.Tracker = Tracker;

  deep._context.track = new deep.Method(function(this: any, to: any) {
    const self = new deep(this._source); // The object to be tracked (from)
    
    // Create a new tracker instance
    const tracker = new deep.Tracker();
    tracker.from = self;
    tracker.to = to;
    
    // Associate tracker with the source object for later retrieval/untracking
    if (!self._context.trackers) {
      self._context.trackers = [];
    }
    self._context.trackers.push(tracker);
    
    return tracker;
  });

  deep._context.untrack = new deep.Method(function(this: any, toOrTracker: any) {
    const self = new deep(this._source);
    if (!self._context.trackers || self._context.trackers.length === 0) {
      return false;
    }

    let trackerToDestroy;
    if (toOrTracker.is(deep.Tracker)) {
      // It's a tracker instance
      trackerToDestroy = toOrTracker;
    } else {
      // It's a 'to' instance, find the corresponding tracker
      trackerToDestroy = self._context.trackers.find((t: any) => t.to?._id === toOrTracker._id);
    }
    
    if (trackerToDestroy) {
      trackerToDestroy.destroy();
      // Remove it from the list
      self._context.trackers = self._context.trackers.filter((t: any) => t._id !== trackerToDestroy._id);
      return true;
    }
    
    return false;
  });

  return Tracker;
} 