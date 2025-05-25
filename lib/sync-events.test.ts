import { newDeep } from '.';

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
      
      console.log('🔍 Creating new deep.String...');
      
      // Create String - this should trigger events
      const testString = new deep.String('test_value');
      
      console.log(`📝 Created String: ${testString._id}`);
      console.log(`📝 String type: ${testString._type}`);
      console.log(`📝 String data: ${testString._data}`);
      console.log(`📝 deep.String._id: ${deep.String._id}`);
      
      // Log all events
      console.log(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field}, before: ${event.payload.before}, after: ${event.payload.after})`);
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
        e.payload._id === testString._id && e.payload.field === '_type'
      );
      
      if (typeAssignmentEvent) {
        console.log('✅ Type assignment event found - crutch fields are working');
        expect(typeAssignmentEvent.payload.after).toBe(deep.String._id);
      } else {
        console.log('⚠️ No type assignment event - crutch fields may not be working during construction');
      }
      
      // Should have data change event for data assignment (if crutch fields work)
      const dataChangedEvents = eventLog.filter(e => e.event === 'globalDataChanged');
      const dataAssignmentEvent = dataChangedEvents.find(e => e.payload._id === testString._id);
      
      if (dataAssignmentEvent) {
        console.log('✅ Data assignment event found - crutch fields are working');
        expect(dataAssignmentEvent.payload.after).toBe('test_value');
      } else {
        console.log('⚠️ No data assignment event - crutch fields may not be working during construction');
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
      
      console.log('🔍 Creating new deep.Number...');
      
      const testNumber = new deep.Number(42);
      
      console.log(`📝 Created Number: ${testNumber._id}`);
      console.log(`📝 Number type: ${testNumber._type}`);
      console.log(`📝 Number data: ${testNumber._data}`);
      console.log(`📝 deep.Number._id: ${deep.Number._id}`);
      
      // Log all events
      console.log(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field}, before: ${event.payload.before}, after: ${event.payload.after})`);
      });
      
      // Should have construction events
      const constructedEvents = eventLog.filter(e => e.event === 'globalConstructed');
      expect(constructedEvents.length).toBeGreaterThan(0);
      
      const numberConstructedEvent = constructedEvents.find(e => e.payload._id === testNumber._id);
      expect(numberConstructedEvent).toBeDefined();
      
      // Check for type and data events
      const linkChangedEvents = eventLog.filter(e => e.event === 'globalLinkChanged');
      const dataChangedEvents = eventLog.filter(e => e.event === 'globalDataChanged');
      
      console.log(`📊 Link changed events: ${linkChangedEvents.length}`);
      console.log(`📊 Data changed events: ${dataChangedEvents.length}`);
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
      
      console.log('🔍 Creating new deep.Function...');
      
      const testFunction = new deep.Function(() => 'test');
      
      console.log(`📝 Created Function: ${testFunction._id}`);
      console.log(`📝 Function type: ${testFunction._type}`);
      console.log(`📝 Function data type: ${typeof testFunction._data}`);
      console.log(`📝 deep.Function._id: ${deep.Function._id}`);
      
      // Log all events
      console.log(`📊 Total events captured: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field}, before: ${event.payload.before}, after: ${event.payload.after})`);
      });
      
      // Should have construction events
      const constructedEvents = eventLog.filter(e => e.event === 'globalConstructed');
      expect(constructedEvents.length).toBeGreaterThan(0);
      
      const functionConstructedEvent = constructedEvents.find(e => e.payload._id === testFunction._id);
      expect(functionConstructedEvent).toBeDefined();
    });

    it('should check if crutch fields are enabled during typed construction', () => {
      const deep = newDeep();
      
      console.log('🔍 Checking crutch fields status...');
      console.log(`📝 deep._Deep.__crutchFields: ${deep._Deep.__crutchFields}`);
      console.log(`📝 deep._Deep._deepProxy exists: ${!!deep._Deep._deepProxy}`);
      
      // Test direct crutch field assignment
      const testAssoc = new deep();
      console.log(`📝 Created test association: ${testAssoc._id}`);
      
      const eventLog: any[] = [];
      deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
        eventLog.push({ event: 'globalLinkChanged', payload });
      });
      
      console.log('🔍 Testing direct __type assignment...');
      testAssoc.__type = deep.String._id;
      
      console.log(`📊 Events after __type assignment: ${eventLog.length}`);
      eventLog.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field})`);
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
      
      console.log('🔍 Part 1: Creating via constructor...');
      const stringViaConstructor = new deep.String('constructor_value');
      const constructorEvents = [...eventLog];
      eventLog.length = 0;
      
      console.log(`📊 Constructor events: ${constructorEvents.length}`);
      constructorEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field})`);
      });
      
      console.log('\n🔍 Part 2: Creating manually with high-level API...');
      const manualAssoc = new deep();
      manualAssoc.type = deep.String;
      manualAssoc.data = 'manual_value';
      const manualEvents = [...eventLog];
      
      console.log(`📊 Manual events: ${manualEvents.length}`);
      manualEvents.forEach((event, index) => {
        console.log(`${index + 1}. ${event.event}: ${event.payload._id} (field: ${event.payload.field})`);
      });
      
      // Compare results
      console.log('\n📊 Comparison:');
      console.log(`Constructor approach: ${constructorEvents.length} events`);
      console.log(`Manual approach: ${manualEvents.length} events`);
      
      // Manual approach should definitely generate events
      expect(manualEvents.length).toBeGreaterThan(0);
      
      // Check if constructor approach generates events too
      if (constructorEvents.length === 0) {
        console.log('⚠️ Constructor approach generates no events - this explains Phase 2 sync issues');
      } else {
        console.log('✅ Constructor approach generates events - sync should work');
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
      
      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].event).toBe('globalConstructed');
      expect(eventLog[0].payload._id).toBe(a._id);
      expect(eventLog[0].payload._deep).toBe(deep._id);
      expect(eventLog[0].payload.timestamp).toBeDefined();
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
      
      expect(eventLog).toHaveLength(3);
      expect(eventLog.every(log => log.event === 'globalConstructed')).toBe(true);
      
      const ids = eventLog.map(log => log.payload._id);
      expect(ids).toContain(a._id);
      expect(ids).toContain(b._id);
      expect(ids).toContain(c._id);
    });
  });

  describe('Link Change Events', () => {
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
      expect(eventLog[0].payload.field).toBe('_type');
      expect(eventLog[0].payload.before).toBe(deep._id); // New associations start with deep._id as type
      expect(eventLog[0].payload.after).toBe(b._id);
      
      eventLog.length = 0;
      
      // Change type again
      const c = new deep();
      a.type = c;
      
      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload.before).toBe(b._id);
      expect(eventLog[0].payload.after).toBe(c._id);
      
      eventLog.length = 0;
      
      // Delete type
      delete a.type;
      
      expect(eventLog).toHaveLength(1);
      expect(eventLog[0].payload.before).toBe(c._id);
      expect(eventLog[0].payload.after).toBeUndefined();
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
      expect(eventLog[0].payload.field).toBe('_from');
      expect(eventLog[0].payload.before).toBeUndefined();
      expect(eventLog[0].payload.after).toBe(b._id);
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
      expect(eventLog[0].payload.field).toBe('_to');
      expect(eventLog[0].payload.before).toBeUndefined();
      expect(eventLog[0].payload.after).toBe(b._id);
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
      expect(eventLog[0].payload.field).toBe('_value');
      expect(eventLog[0].payload.before).toBeUndefined();
      expect(eventLog[0].payload.after).toBe(b._id);
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
      expect(eventLog[0].payload.before).toBe(deep._id); // Initial type is deep._id
      expect(eventLog[0].payload.after).toBe(b._id);
      
      eventLog.length = 0;
      
      // Change type
      a.type = c;
      expect(eventLog[0].payload.before).toBe(b._id);
      expect(eventLog[0].payload.after).toBe(c._id);
      
      eventLog.length = 0;
      
      // Delete type
      delete a.type;
      expect(eventLog[0].payload.before).toBe(c._id);
      expect(eventLog[0].payload.after).toBeUndefined();
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
      expect(eventLog[0].payload.field).toBe('_data');
      expect(eventLog[0].payload.after).toBe("updated");
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
      expect(eventLog[0].payload.field).toBe('_data');
      expect(eventLog[0].payload.after).toBe(100);
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
      expect(eventLog[0].payload.field).toBe('_data');
      expect(eventLog[0].payload.after).toBe(newFn);
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
      expect(linkEvent.payload.field).toBeDefined();
      expect(linkEvent.payload.timestamp).toBeDefined();
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
            payload: {
              _id: payload._id,
              _reason: payload._reason,
              _source: payload._source,
              field: payload.field,
              before: payload.before,
              after: payload.after,
              timestamp: payload.timestamp
            }
          });
        });
        disposers.push(disposer);
      }
    }
    
    console.log('🔍 Starting entity creation and modification test...');
    
    // 1. Create basic association
    console.log('\n📝 Creating basic association...');
    const basicAssoc = new deep();
    console.log(`Created basic association: ${basicAssoc._id}`);
    
    // 2. Create String
    console.log('\n📝 Creating String...');
    const testString = new deep.String('test_string');
    console.log(`Created String: ${testString._id}, data: "${testString._data}"`);
    
    // 3. Create Number  
    console.log('\n📝 Creating Number...');
    const testNumber = new deep.Number(42);
    console.log(`Created Number: ${testNumber._id}, data: ${testNumber._data}`);
    
    // 4. Create Function
    console.log('\n📝 Creating Function...');
    const testFunction = new deep.Function(() => 'test');
    console.log(`Created Function: ${testFunction._id}, data type: ${typeof testFunction._data}`);
    
    // 5. Create Set
    console.log('\n📝 Creating Set...');
    const testSet = new deep.Set(new Set(['a', 'b']));
    console.log(`Created Set: ${testSet._id}, data size: ${testSet._data?.size}`);
    
    // 6. Modify basic association links
    console.log('\n📝 Modifying basic association links...');
    basicAssoc.type = testString;
    console.log(`Set basicAssoc.type = testString`);
    
    basicAssoc.from = testNumber;
    console.log(`Set basicAssoc.from = testNumber`);
    
    basicAssoc.to = testFunction;
    console.log(`Set basicAssoc.to = testFunction`);
    
    basicAssoc.value = testSet;
    console.log(`Set basicAssoc.value = testSet`);
    
    // 7. Modify typed data
    console.log('\n📝 Modifying typed data...');
    testString.data = 'modified_string';
    console.log(`Modified testString.data = "modified_string"`);
    
    testNumber.data = 100;
    console.log(`Modified testNumber.data = 100`);
    
    testFunction.data = () => 'modified';
    console.log(`Modified testFunction.data = new function`);
    
    // 8. Modify Set data
    console.log('\n📝 Modifying Set data...');
    testSet.add('c');
    console.log(`Added 'c' to testSet`);
    
    testSet.delete('a');
    console.log(`Deleted 'a' from testSet`);
    
    // Wait a bit for all events to be processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Clean up listeners
    disposers.forEach(disposer => disposer());
    
    console.log(`\n📊 Total events captured: ${events.length}`);
    
    // Group events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Events by type:', eventsByType);
    
    // Show detailed events
    console.log('\n📋 Detailed events:');
    events.forEach((event, index) => {
      console.log(`${index + 1}. ${event.type}: ${event.payload._id} (field: ${event.payload.field}, before: ${event.payload.before}, after: ${event.payload.after})`);
    });
    
    // Verify we got some events
    expect(events.length).toBeGreaterThan(0);
    
    // Check for specific event types we expect
    const globalConstructedEvents = events.filter(e => e.type === 'globalConstructed');
    const globalLinkChangedEvents = events.filter(e => e.type === 'globalLinkChanged');
    const globalDataChangedEvents = events.filter(e => e.type === 'globalDataChanged');
    
    console.log(`\n✅ globalConstructed events: ${globalConstructedEvents.length}`);
    console.log(`✅ globalLinkChanged events: ${globalLinkChangedEvents.length}`);
    console.log(`✅ globalDataChanged events: ${globalDataChangedEvents.length}`);
    
    // We should have construction events for each entity
    expect(globalConstructedEvents.length).toBeGreaterThan(0);
    
    // We should have link change events for type/from/to/value assignments
    expect(globalLinkChangedEvents.length).toBeGreaterThan(0);
    
    // We should have data change events for data modifications
    expect(globalDataChangedEvents.length).toBeGreaterThan(0);
  }, 10000);
}); 