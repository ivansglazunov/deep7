import { v4 as uuidv4 } from 'uuid';
import { newDeep as originalNewDeep } from '../lib/deep';
import { _initDeep as originalInitDeep } from '../lib';

/**
 * Event record interface for diagnostics
 */
interface EventRecord {
  timestamp: number;
  sourceId: string;
  eventType: string;
  args: any[];
}

/**
 * Gets the source code of a function
 */
function getFunctionSource(fn: Function): string {
  return fn.toString();
}

/**
 * Function to diagnose Deep framework events during initialization
 * Captures all events that occur between start and end of newDeep() call
 * 
 * @returns The initialized Deep instance
 */
export function diagnoseDeepInitialization() {
  console.log('Starting Deep diagnostic...');
  
  // Event records
  const eventLog: EventRecord[] = [];
  
  // Create a function to track a method call as an event
  const trackMethodCall = (className: string, methodName: string, id: string, args: any[] = []) => {
    eventLog.push({
      timestamp: Date.now(),
      sourceId: id,
      eventType: `${className}.${methodName}`,
      args
    });
  };
  
  // Track calls to imported objects/modules
  const instrumentObject = (obj: any, objName: string) => {
    const instrumentedObj: any = {};
    
    // Copy all properties
    for (const prop in obj) {
      const value = obj[prop];
      
      if (typeof value === 'function') {
        // Wrap the function to track calls
        instrumentedObj[prop] = function(...args: any[]) {
          trackMethodCall(objName, prop, 'module', args);
          try {
            return value.apply(this, args);
          } catch (err) {
            trackMethodCall(objName, `${prop}_error`, 'module', [err]);
            throw err;
          }
        };
      } else {
        // Just copy the value
        instrumentedObj[prop] = value;
      }
    }
    
    return instrumentedObj;
  };
  
  // Instrument _initDeep to track object creation and type assignments
  const wrappedInitDeep = function() {
    trackMethodCall('_initDeep', 'call', 'global');
    const _Deep = originalInitDeep();
    
    // Save original _Deep.prototype methods
    const originalConstructor = _Deep.prototype.constructor;
    const originalDestroy = _Deep.prototype.destroy;
    
    // Patch constructor to track object creation
    _Deep.prototype.constructor = function(...args: any[]) {
      trackMethodCall('_Deep', 'constructor', this._id || 'new_instance', args);
      const result = originalConstructor.apply(this, args);
      return result;
    };
    
    // Patch destroy method
    _Deep.prototype.destroy = function() {
      trackMethodCall('_Deep', 'destroy', this._id);
      return originalDestroy.apply(this);
    };
    
    // Add property change trackers (get/set)
    for (const prop of ['_type', '_from', '_to', '_value', '_data']) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(_Deep.prototype, prop);
        if (descriptor && descriptor.get && descriptor.set) {
          Object.defineProperty(_Deep.prototype, prop, {
            get: function() {
              const result = descriptor.get!.call(this);
              trackMethodCall('_Deep', `get_${prop}`, this._id, [result]);
              return result;
            },
            set: function(value) {
              trackMethodCall('_Deep', `set_${prop}`, this._id, [value]);
              return descriptor.set!.call(this, value);
            },
            configurable: true
          });
        }
      } catch (e) {
        console.error(`Failed to instrument ${prop}:`, e);
      }
    }
    
    trackMethodCall('_initDeep', 'return', 'global');
    return _Deep;
  };
  
  // Create customized version of newDeep that will log all operations
  const instrumentedNewDeep = function(options: any = {}) {
    // Log the start of initialization
    trackMethodCall('Deep', 'initialization_start', 'global');
    
    // Save original function
    const initDeepOriginal = (global as any)._initDeep;
    
    // Replace with our instrumented version
    (global as any)._initDeep = wrappedInitDeep;
    
    // Analyze the newDeep function
    const newDeepSource = getFunctionSource(originalNewDeep);
    trackMethodCall('Analysis', 'newDeep_source', 'global', [newDeepSource]);
    
    // Tracking internal function calls
    const trackCalls = (fn: Function, name: string) => {
      return function(...args: any[]) {
        trackMethodCall('Deep.internal', name, 'module', args);
        return fn.apply(this, args);
      };
    };
    
    // Monkey patch the global require to track module imports
    const originalRequire = (global as any).require;
    (global as any).require = function(id: string) {
      trackMethodCall('require', id, 'global');
      return originalRequire(id);
    };
    
    try {
      // Use our instrumented _initDeep via the original newDeep
      trackMethodCall('Deep', 'newDeep_call', 'global', [options]);
      const deep = originalNewDeep(options);
      trackMethodCall('Deep', 'newDeep_return', 'global');
      
      // Instrument the deep instance methods
      const methodsToInstrument = ['_emit', '_on', '_off', '_once'];
      for (const method of methodsToInstrument) {
        if (typeof deep[method] === 'function') {
          const original = deep[method];
          deep[method] = function(...args: any[]) {
            trackMethodCall('Deep', method, this._id, args);
            return original.apply(this, args);
          };
        }
      }
      
      // Validate the returned object
      trackMethodCall('Deep', 'validation', 'global', [
        'has_id: ' + (deep._id !== undefined),
        'events: ' + (deep._events !== undefined),
        'context: ' + (deep._context !== undefined)
      ]);
      
      // Log end of initialization
      trackMethodCall('Deep', 'initialization_complete', 'global');
      
      return deep;
    } finally {
      // Restore original require
      (global as any).require = originalRequire;
      
      // Restore original _initDeep
      (global as any)._initDeep = initDeepOriginal;
    }
  };
  
  // Timestamp for tracking duration
  const startTime = Date.now();
  
  // Initialize Deep with tracking
  console.log('Initializing Deep framework with event tracking...');
  const deep = instrumentedNewDeep();
  
  // Calculate statistics
  const endTime = Date.now();
  const duration = endTime - startTime;
  const eventTypes = new Set(eventLog.map(e => e.eventType));
  const sourceIds = new Set(eventLog.map(e => e.sourceId));
  
  // Display diagnostic information
  console.log('\n=== Deep Initialization Diagnostics ===');
  console.log(`Total events fired: ${eventLog.length}`);
  console.log(`Initialization duration: ${duration}ms`);
  console.log(`Unique event types: ${eventTypes.size}`);
  console.log(`Unique source IDs: ${sourceIds.size}`);
  console.log(`Events per millisecond: ${(eventLog.length / duration).toFixed(2)}`);
  
  // Categorize events by type patterns
  const eventCategories: Record<string, string[]> = {
    'link': [],
    'property': [],
    'method': [],
    'constructor': [],
    'emit': [],
    'getter': [],
    'setter': [],
    'initialization': [],
    'other': []
  };
  
  eventLog.forEach(event => {
    const type = event.eventType;
    if (type.includes('type') || type.includes('from') || type.includes('to')) {
      eventCategories['link'].push(type);
    } else if (type.includes('property')) {
      eventCategories['property'].push(type);
    } else if (type.includes('method') || type.includes('Method')) {
      eventCategories['method'].push(type);
    } else if (type.includes('constructor') || type.includes('new')) {
      eventCategories['constructor'].push(type);
    } else if (type.includes('emit')) {
      eventCategories['emit'].push(type);
    } else if (type.includes('get_')) {
      eventCategories['getter'].push(type);
    } else if (type.includes('set_')) {
      eventCategories['setter'].push(type);
    } else if (type.includes('initialization') || type.includes('require')) {
      eventCategories['initialization'].push(type);
    } else {
      eventCategories['other'].push(type);
    }
  });
  
  // Display event categories
  console.log('\nEvent categories:');
  for (const [category, events] of Object.entries(eventCategories)) {
    if (events.length > 0) {
      console.log(`  ${category}: ${events.length} events`);
    }
  }
  
  // Detailed breakdown of event types
  console.log('\nEvent types breakdown:');
  const eventTypeCount: Record<string, number> = {};
  eventLog.forEach(event => {
    eventTypeCount[event.eventType] = (eventTypeCount[event.eventType] || 0) + 1;
  });
  
  Object.entries(eventTypeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([eventType, count]) => {
      console.log(`  ${eventType}: ${count} times`);
    });
  
  // Source ID breakdown
  console.log('\nSource IDs breakdown (top 10):');
  const sourceIdEvents: Record<string, string[]> = {};
  eventLog.forEach(event => {
    if (!sourceIdEvents[event.sourceId]) {
      sourceIdEvents[event.sourceId] = [];
    }
    sourceIdEvents[event.sourceId].push(event.eventType);
  });
  
  Object.entries(sourceIdEvents)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10) // Show only top 10 sources
    .forEach(([sourceId, events]) => {
      console.log(`  ${sourceId.substring(0, 8)}... : ${events.length} events`);
    });
  
  // Timing analysis
  const eventTiming: Record<string, { min: number, max: number, total: number, count: number }> = {};
  
  for (let i = 1; i < eventLog.length; i++) {
    const current = eventLog[i];
    const prev = eventLog[i-1];
    const timeDiff = current.timestamp - prev.timestamp;
    
    if (!eventTiming[current.eventType]) {
      eventTiming[current.eventType] = { min: timeDiff, max: timeDiff, total: timeDiff, count: 1 };
    } else {
      const timing = eventTiming[current.eventType];
      timing.min = Math.min(timing.min, timeDiff);
      timing.max = Math.max(timing.max, timeDiff);
      timing.total += timeDiff;
      timing.count++;
    }
  }
  
  // Show timing for common events
  console.log('\nEvent timing (ms) for top 5 most common events:');
  Object.entries(eventTiming)
    .filter(([eventType]) => eventTypeCount[eventType] > 2) // Only show common events
    .sort((a, b) => eventTypeCount[a[0]] - eventTypeCount[b[0]])
    .slice(-5) // Top 5
    .forEach(([eventType, timing]) => {
      const avg = (timing.total / timing.count).toFixed(2);
      console.log(`  ${eventType}: avg=${avg}ms, min=${timing.min}ms, max=${timing.max}ms`);
    });
  
  // Show events in chronological order
  console.log('\nEvents timeline (first 20):');
  eventLog
    .slice(0, 20) // Show only first 20 events to avoid overwhelming output
    .forEach((event, index) => {
      const timeOffset = event.timestamp - startTime;
      console.log(`  [+${timeOffset}ms] #${index} ${event.eventType} from ${event.sourceId.substring(0, 8)}...`);
    });
  
  if (eventLog.length > 20) {
    console.log(`  ... and ${eventLog.length - 20} more events`);
  }
  
  console.log('\nDiagnostic complete');
  
  return deep;
}

// Auto-run if this file is executed directly
if (require.main === module) {
  diagnoseDeepInitialization();
}

// Export the main function as default
export default diagnoseDeepInitialization; 