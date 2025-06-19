// This file will contain the implementation of the tracking system. 

// Implements the Tracker system for creating reactive links between deep instances.

// Provides tracking and reactive behavior support for the Deep framework, including Trackable class for managing tracking functions and Tracker instances for establishing reactive relationships between Deep instances.

import { _Data } from "./_data";

export const _rebind = function(deep: any, tracker: any) {
  // Always clean up existing disposers first
  if (tracker._state.dataAddDisposer) {
    tracker._state.dataAddDisposer();
    tracker._state.dataAddDisposer = null;
  }
  if (tracker._state.dataDeleteDisposer) {
    tracker._state.dataDeleteDisposer();
    tracker._state.dataDeleteDisposer = null;
  }
  if (tracker._state.dataPushDisposer) {
    tracker._state.dataPushDisposer();
    tracker._state.dataPushDisposer = null;
  }
  if (tracker._state.dataChangedDisposer) {
    tracker._state.dataChangedDisposer();
    tracker._state.dataChangedDisposer = null;
  }
  
  // Only create new subscriptions if both _from and _to are set
  if (tracker._from && tracker._to) {
    const fromInstance = new deep(tracker._from);
    
    // Define event handlers for each event type
    const dataAddHandler = function(...args: any[]) {
      const to = new deep(tracker._to);
      if (to._state._onTracker && typeof to._state._onTracker === 'function') {
        to._state._onTracker.call(to, deep.events.dataAdd, ...args);
      }
    };
    
    const dataDeleteHandler = function(...args: any[]) {
      const to = new deep(tracker._to);
      if (to._state._onTracker && typeof to._state._onTracker === 'function') {
        to._state._onTracker.call(to, deep.events.dataDelete, ...args);
      }
    };
    
    const dataPushHandler = function(...args: any[]) {
      const to = new deep(tracker._to);
      if (to._state._onTracker && typeof to._state._onTracker === 'function') {
        to._state._onTracker.call(to, deep.events.dataPush, ...args);
      }
    };
    
    const dataChangedHandler = function(...args: any[]) {
      const to = new deep(tracker._to);
      if (to._state._onTracker && typeof to._state._onTracker === 'function') {
        to._state._onTracker.call(to, deep.events.dataChanged, ...args);
      }
    };
    
    // Subscribe to events on the 'from' instance
    tracker._state.dataAddDisposer = fromInstance.on(deep.events.dataAdd._id, dataAddHandler);
    tracker._state.dataDeleteDisposer = fromInstance.on(deep.events.dataDelete._id, dataDeleteHandler);
    tracker._state.dataPushDisposer = fromInstance.on(deep.events.dataPush._id, dataPushHandler);
    tracker._state.dataChangedDisposer = fromInstance.on(deep.events.dataChanged._id, dataChangedHandler);
  }
};

function newTrackable(deep: any) {
  const Trackable = new deep();

  // Register a data handler for Trackable instances  
  // The actual data stored will be the function
  deep._datas.set(Trackable._id, new _Data<any>());

  // Create TrackableInstance before defining Trackable._constructor
  const TrackableInstance = Trackable._contain.TrackableInstance = new deep();

  // Set the correct type for TrackableInstance
  TrackableInstance._type = Trackable._id;

  Trackable._contain._constructor = function (currentConstructor: any, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn._type != deep.Function._id) throw new Error('trackable must be a function but got ' + typeof _fn);
    } else {
      throw new Error('trackable must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__value = fn._id;
    instance.__data = _fn; // Store the original function as data
    return instance;
  };

  // Constructor will handle calling the _construction method
  TrackableInstance._contain._construction = function (this: any) {
    const state = this._getState(this._id);
    if (this._id == TrackableInstance._id || this._type == TrackableInstance._id) return; // avoid self new deep() handling
    if (!state._construction) {
      state._construction = true;
      const data = this._getData(this._Value.one(this._type));
      if (typeof data !== 'function') {
        // During restoration, the trackable function might not be available yet
        // Mark as constructed to prevent future attempts and return gracefully
        if (data === undefined) {
          console.warn(`Trackable function not found for ${this._id} during restoration, skipping construction`);
          return;
        }
        throw new Error('trackable must be a function but got ' + typeof data);
      }
      return data.call(this);
    }
  };

  // Destructor will handle calling the _destruction method
  TrackableInstance._contain._destruction = function (this: any) {
    const state = this._getState(this._id);
    if (this._id == TrackableInstance._id || this._type == TrackableInstance._id) return; // avoid self new deep() handling
    if (!state._destruction) {
      state._destruction = true;
      const data = this._getData(this._Value.one(this._type));
      if (typeof data !== 'function') {
        // During restoration, the trackable function might not be available yet
        // Mark as destructed to prevent future attempts and return gracefully
        if (data === undefined) {
          console.warn(`Trackable function not found for ${this._id} during destruction, skipping destruction`);
          return;
        }
        throw new Error('trackable must be a function but got ' + typeof data);
      }
      return data.call(this);
    }
  };

  return Trackable;
}



export function newTracking(deep: any) {
  // Create Trackable class first
  deep._contain.Trackable = newTrackable(deep);

  // Add isTrackable field
  deep._contain.isTrackable = new deep.Field(function(this: any) {
    const self = new deep(this._source);
    return !!(self._contain.trackable);
  });

  // Create Tracker class
  const Tracker = new deep.Alive(function(this: any) {
    if (this._reason === deep.reasons.construction._id) {
      const tracker = this;
      
      // Subscribe to changes in own _from and _to fields to rebind when they change
      tracker._state.fromDisposer = tracker.on(deep.events.fromSetted._id, () => {
        _rebind(deep, tracker);
      });
      
      tracker._state.toDisposer = tracker.on(deep.events.toSetted._id, () => {
        _rebind(deep, tracker);
      });
      
      // Initial rebind in case _from and _to are already set
      _rebind(deep, tracker);
      
    } else if (this._reason === deep.reasons.destruction._id) {
      // Clean up all event listeners
      _rebind(deep, this); // This will clear data event disposers
      
      if (this._state.fromDisposer) this._state.fromDisposer();
      if (this._state.toDisposer) this._state.toDisposer();
    }
  });

  deep._contain.Tracker = Tracker;

  // Add track method to all Deep instances
  deep._contain.track = new deep.Method(function(this: any, target: any) {
    const self = new deep(this._source);
    const tracker = new deep.Tracker();
    tracker.from = self;
    tracker.to = target;
    
    // Keep track of trackers
    if (!self._contain.trackers) {
      self._contain.trackers = [];
    }
    self._contain.trackers.push(tracker);
    
    return tracker;
  });

  deep._contain.untrack = new deep.Method(function(this: any, toOrTracker: any) {
    const self = new deep(this._source);
    if (!self._contain.trackers || self._contain.trackers.length === 0) {
      return false;
    }

    let trackerToDestroy;
    if (toOrTracker.is(deep.Tracker)) {
      // It's a tracker instance
      trackerToDestroy = toOrTracker;
    } else {
      // It's a 'to' instance, find the corresponding tracker
      trackerToDestroy = self._contain.trackers.find((t: any) => t.to?._id === toOrTracker._id);
    }
    
    if (trackerToDestroy) {
      trackerToDestroy.destroy();
      // Remove it from the list
      self._contain.trackers = self._contain.trackers.filter((t: any) => t._id !== trackerToDestroy._id);
      return true;
    }
    
    return false;
  });

  return Tracker;
} 