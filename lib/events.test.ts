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

  it('typeSetted event in constructor - new instance creation', () => {
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
});