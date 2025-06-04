import { newDeep } from '.';
import Debug from './debug';

const debug = Debug('events:test');

describe('events', () => {
  it('custom event', () => {
    const deep = newDeep();
    const CustomEventType = new deep.Event();
    const customEvent = new CustomEventType();
    const a = new deep();
    let called = false;
    a.on(customEvent, () => {
      called = true;
    });
    a.emit(customEvent);
    expect(called).toBe(true);
  });

  it('should not duplicate basic emit/on events', () => {
    const deep = newDeep();
    const CustomEventType = new deep.Event();
    const customEvent = new CustomEventType();
    const association = new deep();
    
    let callCount = 0;
    const handler = () => {
      callCount++;
    };
    
    // Subscribe once
    association.on(customEvent, handler);
    
    // Emit once
    association.emit(customEvent);
    
    // Should be called exactly once
    expect(callCount).toBe(1);
    
    // Emit again
    association.emit(customEvent);
    
    // Should be called exactly twice (once per emit)
    expect(callCount).toBe(2);
  });

  it('valueSetted', () => {
    const deep = newDeep();
    const v = new deep.String('test');
    const a = new deep();
    let called = false;
    a.on(deep.events.valueSetted, () => {
      called = true;
    });
    a.value = v;
    expect(called).toBe(true);
  });
  it('typeSetted', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new deep();
    let called = false;
    a.on(deep.events.typeSetted._id, () => {
      called = true;
    });
    a.type = b;
    expect(called).toBe(true);
  });

  it('[DEBUG] typeSetted event in constructor - new instance creation', () => {
    const deep = newDeep();
    const Type = new deep();
    
    debug(`📝 Type created: ${Type._id}`);
  
    let globalLinkChangedCalled = false;
    
    // Subscribe to globalLinkChanged to see if it gets triggered
    deep.on(deep.events.globalLinkChanged._id, (payload: any) => {
      globalLinkChangedCalled = true;
      debug(`🔥 globalLinkChanged called: ${payload._id}, field: ${payload._field}`);
    });
    
    debug(`📝 Before creating new Type() instance`);

    const instance = new Type();
    
    // This is what we expect to happen but currently doesn't
    expect(globalLinkChangedCalled).toBe(true);
  });

  it('system event globalLinkChanged called only once per operation', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new deep();
    
    let callCount = 0;
    const handler = (payload: any) => {
      callCount++;
      debug(`🔥 globalLinkChanged handler called, count: ${callCount}, field: ${payload._field}, id: ${payload._id}`);
    };
    
    // Subscribe to globalLinkChanged
    deep.on(deep.events.globalLinkChanged._id, handler);
    
    debug(`📝 Before type assignment: callCount = ${callCount}`);
    
    // Perform one operation that should trigger globalLinkChanged once
    a.type = b;
    
    debug(`📝 After type assignment: callCount = ${callCount}`);
    
    // Handler should be called exactly once for this operation
    expect(callCount).toBe(1);
    
    // Change type again - should be called once more
    const c = new deep();
    a.type = c;
    debug(`📝 After second type assignment: callCount = ${callCount}`);
    expect(callCount).toBe(3); // +1 for deep type +1 for c type
  });

  it('complex scenario - multiple subscribers and event propagation', () => {
    const deep = newDeep();
    const container = new deep();
    const terminal = new deep();
    terminal.type = deep.String;
    
    let globalLinkCallCount = 0;
    let globalDataCallCount = 0;
    let valueSettedCallCount = 0;
    let dataSettedCallCount = 0;
    
    const globalLinkHandler = (payload: any) => {
      globalLinkCallCount++;
      debug(`🔥 globalLinkChanged handler called, count: ${globalLinkCallCount}, field: ${payload._field}, id: ${payload._id}`);
    };
    
    const globalDataHandler = (payload: any) => {
      globalDataCallCount++;
      debug(`🔥 globalDataChanged handler called, count: ${globalDataCallCount}, id: ${payload._id}`);
    };
    
    const valueSettedHandler = (payload: any) => {
      valueSettedCallCount++;
      debug(`🔥 valueSetted handler called, count: ${valueSettedCallCount}, id: ${payload._id}`);
    };
    
    const dataSettedHandler = (payload: any) => {
      dataSettedCallCount++;
      debug(`🔥 dataSetted handler called, count: ${dataSettedCallCount}, id: ${payload._id}`);
    };
    
    // Subscribe to multiple events
    deep.on(deep.events.globalLinkChanged._id, globalLinkHandler);
    deep.on(deep.events.globalDataChanged._id, globalDataHandler);
    container.on(deep.events.valueSetted._id, valueSettedHandler);
    terminal.on(deep.events.dataSetted._id, dataSettedHandler);
    
    debug(`📝 Before complex operations: globalLink=${globalLinkCallCount}, globalData=${globalDataCallCount}, valueSetted=${valueSettedCallCount}, dataSetted=${dataSettedCallCount}`);
    
    // Perform complex operation sequence
    container.value = terminal;  // Should trigger valueSetted and globalLinkChanged
    terminal.data = 'test-data'; // Should trigger dataSetted and globalDataChanged
    
    debug(`📝 After complex operations: globalLink=${globalLinkCallCount}, globalData=${globalDataCallCount}, valueSetted=${valueSettedCallCount}, dataSetted=${dataSettedCallCount}`);
    
    // Each event should be called exactly once per operation
    expect(globalLinkCallCount).toBe(1); // One for container.value = terminal
    expect(globalDataCallCount).toBe(2); // One for terminal.data = 'test-data'
    expect(valueSettedCallCount).toBe(1); // One for container.value = terminal
    expect(dataSettedCallCount).toBe(1); // One for terminal.data = 'test-data'
  });

  it('DEBUG: analyze value chain propagation hypothesis', () => {
    const deep = newDeep();
    const container = new deep();
    const terminal = new deep();
    terminal.type = deep.String;
    
    debug(`📝 Setup: container=${container._id}, terminal=${terminal._id}`);
    
    // Establish value chain: container.value = terminal
    container.value = terminal;
    debug(`📝 After container.value = terminal`);
    debug(`📝 container._value = ${container._value}`);
    debug(`📝 terminal._valued = ${Array.from(terminal._valued)}`);
    
    // Now check what happens when we modify terminal data
    let globalDataCallCount = 0;
    let dataSettedCallCount = 0;
    
    const globalDataHandler = (payload: any) => {
      globalDataCallCount++;
      debug(`🔥 globalDataChanged #${globalDataCallCount}: id=${payload._id}, source=${payload._source}`);
    };
    
    const dataSettedHandler = (payload: any) => {
      dataSettedCallCount++;
      debug(`🔥 dataSetted #${dataSettedCallCount}: id=${payload._id}`);
    };
    
    deep.on(deep.events.globalDataChanged._id, globalDataHandler);
    terminal.on(deep.events.dataSetted._id, dataSettedHandler);
    
    debug(`📝 Before terminal.data = 'test': globalData=${globalDataCallCount}, dataSetted=${dataSettedCallCount}`);
    
    // This should trigger propagation
    terminal.data = 'test';
    
    debug(`📝 After terminal.data = 'test': globalData=${globalDataCallCount}, dataSetted=${dataSettedCallCount}`);
    
    // HYPOTHESIS: The event propagates from terminal to container, causing double globalDataChanged
    // because both terminal and container emit globalDataChanged when dataSetted is propagated
  });

  it('DEBUG: analyze storeAdded double event issue', () => {
    const deep = newDeep();
    const association = new deep();
    const storage = new deep.Storage();
    
    debug(`📝 Setup: association=${association._id}, storage=${storage._id}`);
    
    let storeAddedCallCount = 0;
    
    const storeAddedHandler = (payload: any) => {
      storeAddedCallCount++;
      debug(`🔥 storeAdded #${storeAddedCallCount}: id=${payload._id}, source=${payload._source}, reason=${payload._reason}`);
    };
    
    // Subscribe to storeAdded event
    deep.on(deep.events.storeAdded._id, storeAddedHandler);
    
    debug(`📝 Before association.store(storage): storeAdded=${storeAddedCallCount}`);
    
    // This should trigger storeAdded event
    try {
      association.store(storage, deep.storageMarkers.oneTrue);
      debug(`📝 After association.store(storage): storeAdded=${storeAddedCallCount}`);
      
      // Check if storeAdded is called more than once
      if (storeAddedCallCount > 1) {
        debug('🚨 ISSUE CONFIRMED: storeAdded called multiple times');
      } else {
        debug('✅ No issue: storeAdded called once');
      }
    } catch (error: any) {
      debug(`❌ Error during store(): ${error.message}`);
    }
  });

  it('DEBUG: compare storage events with hasyx context', () => {
    const deep = newDeep();
    
    // First, let's check if Storage creation itself has events
    let storageConstructedCount = 0;
    deep.on(deep.events.globalConstructed._id, (payload: any) => {
      debug(`🔥 globalConstructed: ${payload._id}`);
      storageConstructedCount++;
    });
    
    // Create storage and listen for storeAdded
    let storeAddedCallCount = 0;
    const storeAddedHandler = (payload: any) => {
      storeAddedCallCount++;
      debug(`🔥 storeAdded #${storeAddedCallCount}: id=${payload._id}, source=${payload._source}`);
    };
    deep.on(deep.events.storeAdded._id, storeAddedHandler);
    
    debug(`📝 Creating storage...`);
    const storage = new deep.Storage();
    debug(`📝 Storage created: ${storage._id}, constructed events: ${storageConstructedCount}`);
    
    // Now create association and store it with typedTrue (like in hasyx test)
    debug(`📝 Creating association and storing with typedTrue marker...`);
    const association = new deep();
    debug(`📝 Association created: ${association._id}`);
    
    // This is the exact call from hasyx test: store(storage, deep.storageMarkers.typedTrue)
    association.store(storage, deep.storageMarkers.typedTrue);
    debug(`📝 After store with typedTrue: storeAdded=${storeAddedCallCount}`);
    
    // Test if the issue is related to storage type or marker type
    if (storeAddedCallCount > 1) {
      debug('🚨 ISSUE CONFIRMED with typedTrue marker');
    } else {
      debug('✅ No issue with typedTrue marker');
    }
  });
});
