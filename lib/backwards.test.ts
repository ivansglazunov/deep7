import { newDeep } from './index';

// Удаляем .skip чтобы включить тесты backwards references
describe('Backward references', () => {
  it('should access backward references for type relation', () => {
    const deep = newDeep();
    const A = new deep();
    
    const valueEvents: any[] = [];
    
    const Atyped = A.typed; 
    expect(Atyped.value.type.is(deep.Set)).toBe(true);

    // Listen on the Set instance itself (A.typed.value)
    Atyped.on('.value:add', (value) => {
      valueEvents.push({ event: '.value:add', value });
    });
    Atyped.on('.value:delete', (value) => {
      valueEvents.push({ event: '.value:delete', value });
    });

    const B = new A();
    
    expect(valueEvents.length).toBe(1);
    expect(valueEvents[0].event).toBe('.value:add');
    expect(valueEvents[0].value._id).toBe(B._id);
    
    expect(Atyped.has(B)).toBe(true);
    expect(Atyped.size).toBe(1);
    
    const C = new A();
    
    expect(valueEvents.length).toBe(2);
    const lastEventC = valueEvents[valueEvents.length - 1];
    expect(lastEventC.event).toBe('.value:add');
    expect(lastEventC.value._id).toBe(C._id);
    expect(Atyped.size).toBe(2);
    expect(Atyped.has(C)).toBe(true);
    
    delete B.type; // This should trigger a delete event from A.typed.value
    
    expect(valueEvents.length).toBe(3);
    const deleteEventB = valueEvents[valueEvents.length - 1];
    expect(deleteEventB.event).toBe('.value:delete');
    expect(deleteEventB.value._id).toBe(B._id);

    expect(Atyped.has(B)).toBe(false);
    expect(Atyped.size).toBe(1);
  });
  
  it('should access backward references for from relation', () => {
    const deep = newDeep();
    const A = new deep();
    const B = new deep();
    
    const outEvents: any[] = [];
    const Bout = B.out;
    expect(Bout.value.type.is(deep.Set)).toBe(true);
    
    Bout.on('.value:add', (value) => {
      outEvents.push({ event: '.value:add', value });
    });
    Bout.on('.value:delete', (value) => {
      outEvents.push({ event: '.value:delete', value });
    });
    
    A.from = B;
    
    expect(outEvents.length).toBe(1);
    expect(outEvents[0].event).toBe('.value:add');
    expect(outEvents[0].value._id).toBe(A._id);
    
    expect(Bout.has(A)).toBe(true);
    expect(Bout.size).toBe(1);
    
    const C = new deep();
    C.from = B;
    
    expect(outEvents.length).toBe(2);
    const lastEventC = outEvents[outEvents.length - 1];
    expect(lastEventC.event).toBe('.value:add');
    expect(lastEventC.value._id).toBe(C._id);
    expect(Bout.size).toBe(2);
    expect(Bout.has(C)).toBe(true);
    
    delete A.from;
    
    expect(outEvents.length).toBe(3);
    const deleteEventA = outEvents[outEvents.length - 1];
    expect(deleteEventA.event).toBe('.value:delete');
    expect(deleteEventA.value._id).toBe(A._id);

    expect(Bout.has(A)).toBe(false);
    expect(Bout.size).toBe(1);
  });
  
  it('should access backward references for to relation', () => {
    const deep = newDeep();
    const A = new deep();
    const B = new deep(); // B will have links pointing out from it
    
    const inEvents: any[] = [];
    const Bin = B.in;
    expect(Bin.value.type.is(deep.Set)).toBe(true);
    
    Bin.on('.value:add', (value) => {
      inEvents.push({ event: '.value:add', value });
    });
    Bin.on('.value:delete', (value) => {
      inEvents.push({ event: '.value:delete', value });
    });
    
    A.to = B;
    
    expect(inEvents.length).toBe(1);
    expect(inEvents[0].event).toBe('.value:add');
    expect(inEvents[0].value._id).toBe(A._id); // A is added to B's out set
    
    expect(Bin.has(A)).toBe(true);
    expect(Bin.size).toBe(1);
    
    const C = new deep();
    C.to = B;
    
    expect(inEvents.length).toBe(2);
    const lastEventC = inEvents[inEvents.length - 1];
    expect(lastEventC.event).toBe('.value:add');
    expect(lastEventC.value._id).toBe(C._id);
    expect(Bin.size).toBe(2);
    expect(Bin.has(C)).toBe(true);
    
    delete A.to;
    
    expect(inEvents.length).toBe(3); 
    const deleteEventA = inEvents[inEvents.length - 1];
    expect(deleteEventA.event).toBe('.value:delete');
    expect(deleteEventA.value._id).toBe(A._id);

    expect(Bin.size).toBe(1);
    expect(Bin.has(A)).toBe(false);
    expect(Bin.has(C)).toBe(true);
  });
  
  it('should access backward references for value relation', () => {
    const deep = newDeep();
    const A = new deep(); // A will have its .value set
    const B = new deep(); // B will be the target of A.value
    
    const valuedEvents: any[] = [];
    const Bvalued = B.valued;
    expect(Bvalued.value.type.is(deep.Set)).toBe(true);
    
    Bvalued.on('.value:add', (value) => {
      valuedEvents.push({ event: '.value:add', value });
    });
    Bvalued.on('.value:delete', (value) => {
      valuedEvents.push({ event: '.value:delete', value });
    });
    
    A.value = B; // A's value is B
    
    expect(valuedEvents.length).toBe(1);
    expect(valuedEvents[0].event).toBe('.value:add');
    expect(valuedEvents[0].value._id).toBe(A._id); // A is added to B's valued set
    
    expect(Bvalued.has(A)).toBe(true);
    expect(Bvalued.size).toBe(1);
    
    const C = new deep();
    C.value = B; // C's value is also B
    
    expect(valuedEvents.length).toBe(2);
    const lastEventC = valuedEvents[valuedEvents.length-1];
    expect(lastEventC.event).toBe('.value:add');
    expect(lastEventC.value._id).toBe(C._id);

    expect(Bvalued.size).toBe(2);
    expect(Bvalued.has(C)).toBe(true);
    
    delete A.value; // A's value is cleared
    
    expect(valuedEvents.length).toBe(3);
    const deleteEventA = valuedEvents[valuedEvents.length-1];
    expect(deleteEventA.event).toBe('.value:delete');
    expect(deleteEventA.value._id).toBe(A._id);

    expect(Bvalued.has(A)).toBe(false);
    expect(Bvalued.size).toBe(1);
  });
}); 