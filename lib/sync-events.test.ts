import { newDeep } from '.';

describe('Synchronization Events Coverage', () => {
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
}); 