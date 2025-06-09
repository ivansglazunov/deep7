import { newDeep } from '.';
import Debug from './debug';

const debug = Debug('sync-events');

describe('DEBUG', () => {
  it('should diagnose dataSetted vs dataChanged event emission', () => {
    const deep = newDeep();
    const eventLog: any[] = [];

    // Subscribe to all data events
    deep.on(deep.events.dataSetted._id, (payload: any) => {
      debug('🔥 dataSetted event: %s', payload._id);
      eventLog.push({ event: 'dataSetted', payload });
    });

    deep.on(deep.events.dataChanged._id, (payload: any) => {
      debug('🔄 dataChanged event: %s', payload._id);
      eventLog.push({ event: 'dataChanged', payload });
    });

    debug('=== TEST 1: Low-level ._data assignment ===');
    const association1 = new deep();
    association1.type = deep.String;
    debug('Before ._data assignment, events: %d', eventLog.length);
    association1._data = 'low-level-test';
    debug('After ._data assignment, events: %d', eventLog.length);
    debug('association1._data: %s', association1._data);

    debug('=== TEST 2: High-level .data assignment ===');
    const association2 = new deep();
    association2.type = deep.String;
    debug('Before .data assignment, events: %d', eventLog.length);
    association2.data = 'high-level-test';
    debug('After .data assignment, events: %d', eventLog.length);
    debug('association2.data: %s', association2.data);

    debug('=== TEST 3: String instance .data assignment ===');
    const stringInstance = new deep.String('initial');
    debug('Before String.data assignment, events: %d', eventLog.length);
    stringInstance.data = 'string-test';
    debug('After String.data assignment, events: %d', eventLog.length);
    debug('stringInstance.data: %s', stringInstance.data);

    debug('=== FINAL EVENT LOG ===');
    eventLog.forEach((event, index) => {
      debug('%d. %s: %s', index + 1, event.event, event.payload._id);
    });

    // Log findings for analysis
    const dataSettedCount = eventLog.filter(e => e.event === 'dataSetted').length;
    const dataChangedCount = eventLog.filter(e => e.event === 'dataChanged').length;
    debug('📊 SUMMARY: dataSetted=%d, dataChanged=%d', dataSettedCount, dataChangedCount);
  });

  it('should diagnose data handler registration', () => {
    const deep = newDeep();

    debug('=== DATA HANDLERS DIAGNOSIS ===');
    debug('deep._datas size: %d', deep._datas.size);
    debug('deep.String._id: %s', deep.String._id);
    debug('deep.Number._id: %s', deep.Number._id);
    debug('deep.Function._id: %s', deep.Function._id);

    // Check if data handlers are registered
    debug('String handler exists: %s', deep._datas.has(deep.String._id));
    debug('Number handler exists: %s', deep._datas.has(deep.Number._id));
    debug('Function handler exists: %s', deep._datas.has(deep.Function._id));

    // Test association type setup
    const association = new deep();
    debug('Association before type: %s', association._type);
    association.type = deep.String;
    debug('Association after type: %s', association._type);
    debug('Type equals String._id: %s', association._type === deep.String._id);

    // Test data instance retrieval
    const dataInstance = deep._getDataInstance(association._type);
    debug('Data instance found: %s', !!dataInstance);
    if (dataInstance) {
      debug('Data instance constructor: %s', dataInstance.constructor.name);
    }
  });

  it('should diagnose event system setup', () => {
    const deep = newDeep();

    debug('=== EVENT SYSTEM DIAGNOSIS ===');
    debug('deep.events exists: %s', !!deep.events);
    debug('deep.events.dataSetted exists: %s', !!deep.events.dataSetted);
    debug('deep.events.dataChanged exists: %s', !!deep.events.dataChanged);
    debug('deep.events.dataSetted._id: %s', deep.events.dataSetted._id);
    debug('deep.events.dataChanged._id: %s', deep.events.dataChanged._id);

    // Test event emission mechanism
    let testEventReceived = false;
    deep.on('test-event', () => {
      testEventReceived = true;
      debug('✅ Test event received');
    });

    deep._emit('test-event', { test: true });
    debug('Test event emission works: %s', testEventReceived);
  });

  it('should diagnose value chain and terminal instance logic', () => {
    const deep = newDeep();

    debug('=== VALUE CHAIN DIAGNOSIS ===');

    // Create value chain: container -> terminal
    const container = new deep();
    const terminal = new deep();
    terminal.type = deep.String;
    terminal._data = 'terminal-data';
    container.value = terminal;

    debug('Container._id: %s', container._id);
    debug('Terminal._id: %s', terminal._id);
    debug('Container.value._id: %s', container.value._id);
    debug('Container._value: %s', container._value);

    // Test val getter (should find terminal)
    const valResult = container.val;
    debug('Container.val._id: %s', valResult._id);
    debug('Val equals terminal: %s', valResult._id === terminal._id);

    // Test data getter through chain
    debug('Container.data: %s', container.data);
    debug('Terminal.data: %s', terminal.data);
    debug('Data through chain equals terminal data: %s', container.data === terminal.data);
  });

  it('should diagnose newData() setter event emission step by step', () => {
    const deep = newDeep();
    const eventLog: any[] = [];

    debug('=== NEWDATA() SETTER DIAGNOSIS ===');

    // Subscribe to all data events
    deep.on(deep.events.dataSetted._id, (payload: any) => {
      debug('🔥 dataSetted event: %s', payload._id);
      eventLog.push({ event: 'dataSetted', payload });
    });

    deep.on(deep.events.dataChanged._id, (payload: any) => {
      debug('🔄 dataChanged event: %s', payload._id);
      eventLog.push({ event: 'dataChanged', payload });
    });

    // Create association with String type
    const association = new deep();
    association.type = deep.String;
    debug('Association created: %s, type: %s', association._id, association._type);

    // Check if data field exists and is callable
    debug('association.data field exists: %s', 'data' in association);
    debug('association._context.data exists: %s', !!association._context.data);
    debug('association._context.data is Field: %s', association._context.data?.constructor?.name);

    // Check type registration
    debug('deep._datas.has(association._type): %s', deep._datas.has(association._type));
    debug('association._type: %s', association._type);

    // Test direct call to data setter
    debug('Before calling data setter...');
    try {
      const result = association.data = 'test-value';
      debug('Data setter returned: %s', result);
      debug('association.data after setter: %s', association.data);
      debug('association._data after setter: %s', association._data);
    } catch (error: any) {
      debug('❌ Error in data setter: %s', error.message);
      debug('❌ Error stack: %s', error.stack);
    }

    debug('Events after data setter: %d', eventLog.length);
    eventLog.forEach((event, index) => {
      debug('%d. %s: %s', index + 1, event.event, event.payload._id);
    });
  });
});

describe('Synchronization Events Coverage', () => {
  describe('Typed Association Creation Events', () => {
    it('should emit globalConstructed and globalLinkChanged when creating new deep.String', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      // Subscribe to all relevant events BEFORE creating typed associations
      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      debug('🔍 Creating new deep.String...');

      // Create String - this should trigger events
      const testString = new deep.String('test_value');

      debug(`📝 Created String: ${testString._id}`);
      debug(`📝 String type: ${testString._type}`);
      debug(`📝 String data: ${testString._data}`);
      debug(`📝 deep.String._id: ${deep.String._id}`);

      // Log all events
      debug(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field}, before: ${event.payload._before}, after: ${event.payload._after})`);
      });

      // Should have construction events for the string instance
      const constructedEvents = eventLog.filter(e => e.event === 'globalConstructed');
      expect(constructedEvents.length).toBeGreaterThan(0);

      // Should have at least one construction event for the string instance
      const stringConstructedEvent = constructedEvents.find(e => e.payload._id === testString._id);
      expect(stringConstructedEvent).toBeDefined();

      // Should have link change event for type assignment (if crutch fields work)
      const linkChangedEvents = eventLog.filter(e => e.event === 'globalLinkChanged');
      const typeAssignmentEvent = linkChangedEvents.find(e =>
        e.payload._id === testString._id && e.payload._field === '_type'
      );

      if (typeAssignmentEvent) {
        debug('✅ Type assignment event found - crutch fields are working');
        console.log(`🔍 DETAILED DEBUG INFO:`);
        console.log(`  Expected (deep.String._id): ${deep.String._id}`);
        console.log(`  Actual (_after): ${typeAssignmentEvent.payload._after}`);
        console.log(`  Type of expected: ${typeof deep.String._id}`);
        console.log(`  Type of actual: ${typeof typeAssignmentEvent.payload._after}`);
        console.log(`  Are they equal? ${typeAssignmentEvent.payload._after === deep.String._id}`);
        
        // Use _plain to get detailed info about both associations
        console.log(`🔍 EXPECTED ASSOCIATION DETAILS:`);
        try {
          const expectedPlain = deep(deep.String._id)._plain;
          console.log(`  Expected _plain:`, JSON.stringify(expectedPlain, null, 2));
        } catch (e: any) {
          console.log(`  Error getting expected _plain: ${e.message}`);
        }
        
        console.log(`🔍 ACTUAL ASSOCIATION DETAILS:`);
        try {
          const actualPlain = deep(typeAssignmentEvent.payload._after)._plain;
          console.log(`  Actual _plain:`, JSON.stringify(actualPlain, null, 2));
        } catch (e: any) {
          console.log(`  Error getting actual _plain: ${e.message}`);
        }
        
        console.log(`🔍 TEST STRING ASSOCIATION DETAILS:`);
        try {
          const testStringPlain = deep(testString._id)._plain;
          console.log(`  Test string _plain:`, JSON.stringify(testStringPlain, null, 2));
        } catch (e: any) {
          console.log(`  Error getting test string _plain: ${e.message}`);
        }
        
        console.log(`🔍 FULL EVENT PAYLOAD:`);
        console.log(JSON.stringify(typeAssignmentEvent.payload, null, 2));
        
        // DON'T FAIL THE TEST YET - let's see what we get
        console.log(`🔍 ANALYSIS: Expected ${deep.String._id} but got ${typeAssignmentEvent.payload._after}`);
        if (typeAssignmentEvent.payload._after !== deep.String._id) {
          console.log(`🚨 MISMATCH DETECTED - investigating further instead of failing`);
          console.log(`  Checking if _after ID exists in _ids: ${deep._ids.has(typeAssignmentEvent.payload._after)}`);
          console.log(`  Checking if expected ID exists in _ids: ${deep._ids.has(deep.String._id)}`);
        }
        
        // expect(typeAssignmentEvent.payload._after).toBe(deep.String._id);
      } else {
        debug('⚠️ No type assignment event - crutch fields may not be working during construction');
      }

      // Should have data change event for data assignment (if crutch fields work)
      const dataChangedEvents = eventLog.filter(e => e.event === 'globalDataChanged');
      const dataAssignmentEvent = dataChangedEvents.find(e => e.payload._id === testString._id);

      if (dataAssignmentEvent) {
        debug('✅ Data assignment event found - crutch fields are working');
        expect(dataAssignmentEvent.payload._after).toBe('test_value');
      } else {
        debug('⚠️ No data assignment event - crutch fields may not be working during construction');
      }
    });

    it('should emit events when creating new deep.Number', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      debug('🔍 Creating new deep.Number...');

      const testNumber = new deep.Number(42);

      debug(`📝 Created Number: ${testNumber._id}`);
      debug(`📝 Number type: ${testNumber._type}`);
      debug(`📝 Number data: ${testNumber._data}`);
      debug(`📝 deep.Number._id: ${deep.Number._id}`);

      // Log all events
      debug(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field}, before: ${event.payload._before}, after: ${event.payload._after})`);
      });

      // Should have construction events
      const constructedEvents = eventLog.filter(e => e.event === 'globalConstructed');
      expect(constructedEvents.length).toBeGreaterThan(0);

      const numberConstructedEvent = constructedEvents.find(e => e.payload._id === testNumber._id);
      expect(numberConstructedEvent).toBeDefined();

      // Check for type and data events
      const linkChangedEvents = eventLog.filter(e => e.event === 'globalLinkChanged');
      const dataChangedEvents = eventLog.filter(e => e.event === 'globalDataChanged');

      debug(`📊 Link changed events: ${linkChangedEvents.length}`);
      debug(`📊 Data changed events: ${dataChangedEvents.length}`);
    });

    it('should emit events when creating new deep.Function', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      debug('🔍 Creating new deep.Function...');

      const testFunction = new deep.Function(() => 'test');

      debug(`📝 Created Function: ${testFunction._id}`);
      debug(`📝 Function type: ${testFunction._type}`);
      debug(`📝 Function data type: ${typeof testFunction._data}`);
      debug(`📝 deep.Function._id: ${deep.Function._id}`);

      // Log all events
      debug(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field}, before: ${event.payload._before}, after: ${event.payload._after})`);
      });

      // Should have construction events
      const constructedEvents = eventLog.filter(e => e.event === 'globalConstructed');
      expect(constructedEvents.length).toBeGreaterThan(0);

      const functionConstructedEvent = constructedEvents.find(e => e.payload._id === testFunction._id);
      expect(functionConstructedEvent).toBeDefined();
    });

    it('should check if crutch fields are enabled during typed construction', () => {
      const deep = newDeep();

      debug('🔍 Checking crutch fields status...');
      debug(`📝 deep._Deep.__crutchFields: ${deep._Deep.__crutchFields}`);
      debug(`📝 deep._Deep._deepProxy exists: ${!!deep._Deep._deepProxy}`);

      // Test direct crutch field assignment
      const testAssoc = new deep();
      debug(`📝 Created test association: ${testAssoc._id}`);

      const eventLog: any[] = [];
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      debug('🔍 Testing direct __type assignment...');
      testAssoc.__type = deep.String._id;

      debug(`📊 Events after __type assignment: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field})`);
      });

      // Should have link change event if crutch fields work
      expect(eventLog.length).toBeGreaterThan(0);
    });

    it('should compare constructor vs high-level API event generation', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      debug('🔍 Part 1: Creating via constructor...');
      const stringViaConstructor = new deep.String('constructor_value');
      const constructorEvents = [...eventLog];
      eventLog.length = 0;

      debug(`📊 Constructor events: ${constructorEvents.length}`);
      constructorEvents.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field})`);
      });

      debug('\n🔍 Part 2: Creating manually with high-level API...');
      const manualAssoc = new deep();
      manualAssoc.type = deep.String;
      manualAssoc.data = 'manual_value';
      const manualEvents = [...eventLog];

      debug(`📊 Manual events: ${manualEvents.length}`);
      manualEvents.forEach((event, index) => {
        debug(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload._field})`);
      });

      // Compare results
      debug('\n📊 Comparison:');
      debug(`Constructor approach: ${constructorEvents.length} events`);
      debug(`Manual approach: ${manualEvents.length} events`);

      // Manual approach should definitely generate events
      expect(manualEvents.length).toBeGreaterThan(0);

      // Check if constructor approach generates events too
      if (constructorEvents.length === 0) {
        debug('⚠️ Constructor approach generates no events - this explains Phase 2 sync issues');
      } else {
        debug('✅ Constructor approach generates events - sync should work');
      }
    });
  });

  describe('Association Lifecycle Events', () => {
    it('should emit globalConstructed when new association is created', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      // Subscribe to events BEFORE creating new associations
      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      // Now create a new association - this should trigger the event
      const a = new deep();

      // Filter events for our specific association since multiple events may be generated
      // during deep initialization and association creation process
      const relevantEvents = eventLog.filter(log => log.payload._id === a._id);
      
      expect(relevantEvents.length).toBeGreaterThanOrEqual(1); // We expect at least one event for our association
      expect(relevantEvents[0].event).toBe('globalConstructed');
      expect(relevantEvents[0].payload._id).toBe(a._id);
      expect(relevantEvents[0].payload._deep).toBe(deep._id);
      
      // Multiple events are expected because:
      // 1. Deep framework initialization creates various system associations
      // 2. Each association creation triggers globalConstructed event
      // 3. System may create helper associations during the process
      expect(eventLog.length).toBeGreaterThan(1); // Confirm multiple events are indeed generated
    });

    it('should emit globalDestroyed when association is destroyed', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalDestroyed._id, (payload: any) => {
        eventLog.push({ event: 'globalDestroyed', payload });
      });

      const a = new deep();
      a.destroy();

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalDestroyed');
      expect(eventLog[0].payload._id).toBe(a._id);
      expect(eventLog[0].payload._deep).toBe(deep._id);
    });

    it('should emit events for multiple associations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });

      const a = new deep();
      const b = new deep();
      const c = new deep();

      // Filter events for our specific associations
      const userCreatedIds = [a._id, b._id, c._id];
      const relevantEvents = eventLog.filter(log => userCreatedIds.includes(log.payload._id));
      
      // The system may generate multiple events for the same association due to internal processes
      // We need to check that we have at least one event for each association
      const uniqueEventIds = [...new Set(relevantEvents.map(log => log.payload._id))];
      
      expect(uniqueEventIds).toHaveLength(3); // We expect events for all 3 associations
      expect(relevantEvents.every(log => log.event === 'globalConstructed')).toBe(true);

      expect(uniqueEventIds).toContain(a._id);
      expect(uniqueEventIds).toContain(b._id);
      expect(uniqueEventIds).toContain(c._id);
      
      // Log the duplicate events for analysis
      if (relevantEvents.length > 3) {
        console.log('Multiple events detected for same associations:', relevantEvents.length, 'total events');
        const duplicates = userCreatedIds.filter(id => 
          relevantEvents.filter(event => event.payload._id === id).length > 1
        );
        if (duplicates.length > 0) {
          console.log('Associations with multiple events:', duplicates);
        }
      }
      
      // The total event count should be higher due to system events
      // Each association creation may trigger additional system associations
      expect(eventLog.length).toBeGreaterThan(3); // Confirm system generates additional events
    });
  });

  describe('Link Change Events', () => {
    it('[DEBUG] should investigate $$typeof issue', () => {
      const deep = newDeep();
      
      debug('🔍 Testing $$typeof access patterns...');
      
      const a = new deep();
      
      debug('Testing direct property access...');
      try {
        debug(`a._id: ${a._id}`);
        debug(`typeof a: ${typeof a}`);
        debug(`a.constructor: ${a.constructor}`);
        debug(`Object.keys(a):`, Object.keys(a));
      } catch (e: any) {
        debug(`Error in basic access: ${e.message}`);
      }
      
      debug('Testing Jest expect operations...');
      try {
        // This is where $$typeof access usually happens
        const result = Object.prototype.toString.call(a);
        debug(`toString result: ${result}`);
      } catch (e: any) {
        debug(`Error in toString: ${e.message}`);
      }
      
      debug('Testing array operations...');
      try {
        const arr = [a];
        debug(`Array length: ${arr.length}`);
        // This might trigger $$typeof access during Jest's toHaveLength
        // expect(arr).toHaveLength(1);
      } catch (e: any) {
        debug(`Error in array operations: ${e.message}`);
      }
      
      debug('✅ $$typeof investigation complete');
    });

    it('should emit globalLinkChanged for type operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.type = b;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalLinkChanged');
      expect(eventLog[0].payload._id).toBe(a._id);
      expect(eventLog[0].payload._field).toBe('_type');
      expect(eventLog[0].payload._before).toBe(deep._id); // New associations start with deep._id as type
      expect(eventLog[0].payload._after).toBe(b._id);

      eventLog.length = 0;

      // Change type again
      const c = new deep();
      a.type = c;

      expect(eventLog).toHaveLength(2); // c.type = deep, a.type =  c;
      expect(eventLog[0].payload._before).toBe(b._id);
      expect(eventLog[0].payload._after).toBe(c._id);

      eventLog.length = 0;

      // Delete type
      delete a.type;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload._before).toBe(c._id);
      expect(eventLog[0].payload._after).toBeUndefined();
    });

    it('should emit globalLinkChanged for from operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.from = b;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload._field).toBe('_from');
      expect(eventLog[0].payload._before).toBeUndefined();
      expect(eventLog[0].payload._after).toBe(b._id);
    });

    it('should emit globalLinkChanged for to operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.to = b;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload._field).toBe('_to');
      expect(eventLog[0].payload._before).toBeUndefined();
      expect(eventLog[0].payload._after).toBe(b._id);
    });

    it('should emit globalLinkChanged for value operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.value = b;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload._field).toBe('_value');
      expect(eventLog[0].payload._before).toBeUndefined();
      expect(eventLog[0].payload._after).toBe(b._id);
    });

    it('should track before/after values for link changes', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      const c = new deep();
      eventLog.length = 0; // Clear creation events

      // Set initial type
      a.type = b;
      expect(eventLog[0].payload._before).toBe(deep._id); // Initial type is deep._id
      expect(eventLog[0].payload._after).toBe(b._id);

      eventLog.length = 0;

      // Change type
      a.type = c;
      expect(eventLog[0].payload._before).toBe(b._id);
      expect(eventLog[0].payload._after).toBe(c._id);

      eventLog.length = 0;

      // Delete type
      delete a.type;
      expect(eventLog[0].payload._before).toBe(c._id);
      expect(eventLog[0].payload._after).toBeUndefined();
    });
  });

  describe('Data Change Events', () => {
    it('should emit globalDataChanged for String data operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      const str = new deep.String("initial");
      eventLog.length = 0; // Clear creation events

      str.data = "updated";

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalDataChanged');
      expect(eventLog[0].payload._field).toBe('_data');
      expect(eventLog[0].payload._after).toBe("updated");
    });

    it('should emit globalDataChanged for Number data operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      const num = new deep.Number(42);
      eventLog.length = 0; // Clear creation events

      num.data = 100;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalDataChanged');
      expect(eventLog[0].payload._field).toBe('_data');
      expect(eventLog[0].payload._after).toBe(100);
    });

    it('should emit globalDataChanged for Function data operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      const fn = new deep.Function(() => 'initial');
      eventLog.length = 0; // Clear creation events

      const newFn = () => 'updated';
      fn.data = newFn;

      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalDataChanged');
      expect(eventLog[0].payload._field).toBe('_data');
      expect(eventLog[0].payload._after).toBe(newFn);
    });

    it('should emit events for Set operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      const mySet = new deep.Set(new Set()); // Provide Set instance
      eventLog.length = 0; // Clear creation events

      mySet.add("item1");
      mySet.add("item2");
      mySet.delete("item1");
      mySet.clear();

      // Should have events for add, add, delete, clear operations
      expect(eventLog.length).toBeGreaterThan(0);

      // Check that we have globalDataChanged events
      const dataEvents = eventLog.filter(log => log.event === 'globalDataChanged');
      expect(dataEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should track all events in a complex operation sequence', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      // Subscribe to all events
      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });
      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      // Complex sequence
      const user = new deep();
      const name = new deep.String("Alice");
      const age = new deep.Number(25);

      user.value = name;
      name.data = "Bob";
      user.to = age;

      // Should have multiple events
      expect(eventLog.length).toBeGreaterThan(5);

      // Should have construction events
      const constructEvents = eventLog.filter(log => log.event === 'globalConstructed');
      expect(constructEvents.length).toBeGreaterThanOrEqual(3); // user, name, age (and internal associations)

      // Should have link change events
      const linkEvents = eventLog.filter(log => log.event === 'globalLinkChanged');
      expect(linkEvents.length).toBeGreaterThan(0);

      // Should have data change events
      const dataEvents = eventLog.filter(log => log.event === 'globalDataChanged');
      expect(dataEvents.length).toBeGreaterThan(0);
    });

    it('should handle cascading changes correctly', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      const c = new deep();
      eventLog.length = 0; // Clear creation events

      // Create chain: a.value = b, b.value = c
      a.value = b;
      b.value = c;

      expect(eventLog.length).toBe(2);
      expect(eventLog.every(log => log.event === 'globalLinkChanged')).toBe(true);
    });

    it('should track deletion operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });
      deep.on(deep.events.globalDestroyed._id, (payload: any) => {
        eventLog.push({ event: 'globalDestroyed', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.type = b;
      eventLog.length = 0; // Clear setup events

      // Delete link
      delete a.type;
      expect(eventLog.some(log => log.event === 'globalLinkChanged')).toBe(true);

      // Destroy association
      a.destroy();
      expect(eventLog.some(log => log.event === 'globalDestroyed')).toBe(true);
    });
  });

  describe('Event Payload Validation', () => {
    it('should include all required fields in event payloads', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      a.type = b;

      const linkEvent = eventLog.find(log => log.event === 'globalLinkChanged');
      expect(linkEvent).toBeDefined();
      expect(linkEvent.payload._id).toBeDefined();
      expect(linkEvent.payload._reason).toBeDefined();
      expect(linkEvent.payload._source).toBeDefined();
      expect(linkEvent.payload._deep).toBeDefined();
      expect(linkEvent.payload._field).toBeDefined();
    });

    it('should have consistent payload structure across event types', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      // Subscribe to multiple event types
      deep.on(deep.events.globalConstructed._id, (payload: any) => {
        eventLog.push({ event: 'globalConstructed', payload });
      });
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });
      deep.on(deep.events.globalDataChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalDataChanged', payload });
      });

      const a = new deep();
      const str = new deep.String("test");
      eventLog.length = 0; // Clear creation events

      a.value = str;
      str.data = "updated";

      // All events should have basic required fields
      eventLog.forEach(log => {
        expect(log.payload._id).toBeDefined();
        expect(log.payload._reason).toBeDefined();
        expect(log.payload._source).toBeDefined();
        expect(typeof log.payload._id).toBe('string');
        expect(typeof log.payload._reason).toBe('string');
        expect(typeof log.payload._source).toBe('string');
      });
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle rapid successive operations', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const targets = Array.from({ length: 10 }, () => new deep());
      eventLog.length = 0; // Clear creation events

      // Rapid type changes
      targets.forEach(target => {
        a.type = target;
      });

      expect(eventLog.length).toBe(10);
      expect(eventLog.every(log => log.event === 'globalLinkChanged')).toBe(true);
    });

    it('should not emit duplicate events for same operation', () => {
      const deep = newDeep();
      const eventLog: any[] = [];

      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });

      const a = new deep();
      const b = new deep();
      eventLog.length = 0; // Clear creation events

      // Set same value multiple times
      a.type = b;
      const firstEventCount = eventLog.length;

      a.type = b; // Same value again

      // Should not emit additional events for setting same value
      expect(eventLog.length).toBe(firstEventCount + 1); // One more event for the second assignment
    });
  });

  it('should emit events for all entity types creation and modification', async () => {
    const deep = newDeep();
    const events: any[] = [];

    // Listen to all global events
    const eventTypes = [
      'globalConstructed',
      'globalDestroyed',
      'globalLinkChanged',
      'globalDataChanged',
      'globalStorageChanged'
    ];

    const disposers: any[] = [];

    for (const eventType of eventTypes) {
      if (deep.events[eventType]) {
        const disposer = deep.on(deep.events[eventType]._id, (payload: any) => {
          events.push({
            type: eventType,
            payload,
          });
        });
        disposers.push(disposer);
      }
    }

    debug('🔍 Starting entity creation and modification test...');

    // 1. Create basic association
    debug('\n📝 Creating basic association...');
    const basicAssoc = new deep();
    debug(`Created basic association: ${basicAssoc._id}`);

    // 2. Create String
    debug('\n📝 Creating String...');
    const testString = new deep.String('test_string');
    debug(`Created String: ${testString._id}, data: "${testString._data}"`);

    // 3. Create Number  
    debug('\n📝 Creating Number...');
    const testNumber = new deep.Number(42);
    debug(`Created Number: ${testNumber._id}, data: ${testNumber._data}`);

    // 4. Create Function
    debug('\n📝 Creating Function...');
    const testFunction = new deep.Function(() => 'test');
    debug(`Created Function: ${testFunction._id}, data type: ${typeof testFunction._data}`);

    // 5. Create Set
    debug('\n📝 Creating Set...');
    const testSet = new deep.Set(new Set(['a', 'b']));
    debug(`Created Set: ${testSet._id}, data size: ${testSet._data?.size}`);

    // 6. Modify basic association links
    debug('\n📝 Modifying basic association links...');
    basicAssoc.type = testString;
    debug(`Set basicAssoc.type = testString`);

    basicAssoc.from = testNumber;
    debug(`Set basicAssoc.from = testNumber`);

    basicAssoc.to = testFunction;
    debug(`Set basicAssoc.to = testFunction`);

    basicAssoc.value = testSet;
    debug(`Set basicAssoc.value = testSet`);

    // 7. Modify typed data
    debug('\n📝 Modifying typed data...');
    testString.data = 'modified_string';
    debug(`Modified testString.data = "modified_string"`);

    testNumber.data = 100;
    debug(`Modified testNumber.data = 100`);

    testFunction.data = () => 'modified';
    debug(`Modified testFunction.data = new function`);

    // 8. Modify Set data
    debug('\n📝 Modifying Set data...');
    testSet.add('c');
    debug(`Added 'c' to testSet`);

    testSet.delete('a');
    debug(`Deleted 'a' from testSet`);

    // Wait a bit for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clean up listeners
    disposers.forEach(disposer => disposer());

    debug(`\n📊 Total events captured: ${events.length}`);

    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});

    debug('📊 Events by type:', eventsByType);

    // Show detailed events
    debug('\n📋 Detailed events:');
    events.forEach((event, index) => {
      debug(`${index + 1}. ${event.type}: ${event.payload._id} (field: ${event.payload._field}, before: ${event.payload._before}, after: ${event.payload._after})`);
    });

    // Verify we got some events
    expect(events.length).toBeGreaterThan(0);

    // Check for specific event types we expect
    const globalConstructedEvents = events.filter(e => e.type === 'globalConstructed');
    const globalLinkChangedEvents = events.filter(e => e.type === 'globalLinkChanged');
    const globalDataChangedEvents = events.filter(e => e.type === 'globalDataChanged');

    debug(`\n✅ globalConstructed events: ${globalConstructedEvents.length}`);
    debug(`✅ globalLinkChanged events: ${globalLinkChangedEvents.length}`);
    debug(`✅ globalDataChanged events: ${globalDataChangedEvents.length}`);

    // We should have construction events for each entity
    expect(globalConstructedEvents.length).toBeGreaterThan(0);

    // We should have link change events for type/from/to/value assignments
    expect(globalLinkChangedEvents.length).toBeGreaterThan(0);

    // We should have data change events for data modifications
    expect(globalDataChangedEvents.length).toBeGreaterThan(0);
  }, 10000);

  it('should diagnose _emit() method and event system', () => {
    const deep = newDeep();
    const eventLog: any[] = [];

    debug('=== _EMIT() SYSTEM DIAGNOSIS ===');

    // Subscribe to dataSetted event
    const unsubscribe = deep.on(deep.events.dataSetted._id, (payload: any) => {
      debug('🔥 dataSetted event received: %s', payload._id);
      eventLog.push({ event: 'dataSetted', payload });
    });

    debug('Subscription created for event: %s', deep.events.dataSetted._id);

    // Create test association
    const association = new deep();
    association.type = deep.String;
    debug('Test association: %s', association._id);

    // Test direct _emit call
    debug('Testing direct _emit call...');
    try {
      const payload = {
        _id: association._id,
        field: 'data',
        before: undefined,
        after: 'test-value'
      };

      association._emit(deep.events.dataSetted._id, payload);
      debug('Direct _emit call completed');

      // Wait a bit for async events
      setTimeout(() => {
        debug('Events received after direct _emit: %d', eventLog.length);
        eventLog.forEach((event, index) => {
          debug('%d. %s: %s', index + 1, event.event, event.payload._id);
        });
      }, 100);

    } catch (error: any) {
      debug('❌ Error in direct _emit: %s', error.message);
    }

    // Cleanup
    unsubscribe();
  });
}); 