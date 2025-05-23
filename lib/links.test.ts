import { newDeep } from '.';

describe('links', () => {
  it('.type', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new a();
    const c = new b();
    expect(b._type).toBe(a._id);
    expect(b.type._id).toBe(a._id);
    expect(c._type).toBe(b._id);
    expect(c.type._id).toBe(b._id);
    c.type = a;
    expect(c._type).toBe(a._id);
    expect(c.type._id).toBe(a._id);
    delete c.type;
    expect(c._type).toBe(undefined);
    expect(c.type).toBe(undefined);
  });

  it('.from', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new a();
    const c = new b();
    expect(b._from).toBe(undefined);
    expect(b.from).toBe(undefined);
    expect(c._from).toBe(undefined);
    expect(c.from).toBe(undefined);
    b.from = a;
    expect(b._from).toBe(a._id);
    expect(b.from._id).toBe(a._id);
    c.from = b;
    expect(c._from).toBe(b._id);
    expect(c.from._id).toBe(b._id);
    delete c.from;
    expect(c._from).toBe(undefined);
    expect(c.from).toBe(undefined);
  });

  it('.to', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new a();
    const c = new b();
    expect(b._to).toBe(undefined);
    expect(b.to).toBe(undefined);
    expect(c._to).toBe(undefined);
    expect(c.to).toBe(undefined);
    b.to = a;
    expect(b._to).toBe(a._id);
    expect(b.to._id).toBe(a._id);
    c.to = b;
    expect(c._to).toBe(b._id);
    expect(c.to._id).toBe(b._id);
    delete c.to;
    expect(c._to).toBe(undefined);
    expect(c.to).toBe(undefined);
  });

  it('.value', () => {
    const deep = newDeep();
    const a = new deep();
    const b = new a();
    const c = new b();
    expect(b._value).toBe(undefined);
    expect(b.value).toBe(undefined);
    expect(c._value).toBe(undefined);
    expect(c.value).toBe(undefined);
    b.value = a;
    expect(b._value).toBe(a._id);
    expect(b.value._id).toBe(a._id);
    c.value = b;
    expect(c._value).toBe(b._id);
    expect(c.value._id).toBe(b._id);
    delete c.value;
    expect(c._value).toBe(undefined);
    expect(c.value).toBe(undefined);
  });

  it('.val field', () => {
    const deep = newDeep();

    const stringType = new deep.String("test string");
    const numberType = new deep.Number(123);

    const a = new deep();
    const b = new deep();
    const c = new deep();
    const d = new deep();

    a.value = stringType; 
    expect(a.val._id).toBe(stringType._id); 
    expect(a.val._data).toBe("test string");

    b.value = stringType;
    c.value = b;
    d.value = c;
    expect(d.val._id).toBe(stringType._id);
    expect(d.val._data).toBe("test string");
    expect(c.val._id).toBe(stringType._id);
    expect(b.val._id).toBe(stringType._id);

    b.value = numberType;
    expect(d.val._id).toBe(numberType._id);
    expect(d.val._data).toBe(123);

    const e = new deep.String("raw data for e");
    expect(e.val._id).toBe(e._id); 
    expect(e.val._data).toBe("raw data for e"); 

    const cycleA = new deep();
    const cycleB = new deep();
    cycleA.value = cycleB;
    cycleB.value = cycleA; 
    expect(cycleA.val._id).toBe(cycleA._id);
    expect(cycleB.val._id).toBe(cycleB._id);

    const selfCycle = new deep();
    selfCycle.value = selfCycle;
    expect(selfCycle.val._id).toBe(selfCycle._id);

    const f = new deep();
    f.value = stringType;
    expect(() => { f.val = numberType; }).toThrow('Setting .val is not supported.');
    expect(() => { delete f.val; }).toThrow('Deleting .val is not supported.');
  });

  it('.data field', () => {
    const deep = newDeep();

    const stringInstance = new deep.String("hello world");
    const numberInstance = new deep.Number(42);

    const a = new deep();
    const b = new deep();
    const c = new deep();

    expect(stringInstance.data).toBe("hello world");
    expect(numberInstance.data).toBe(42);
    
    const plainUntypedNoData = new deep();
    expect(plainUntypedNoData.data).toBeUndefined(); 

    a.value = stringInstance;
    expect(a.data).toBe("hello world");

    b.value = a;
    expect(b.data).toBe("hello world");

    a.value = numberInstance; 
    expect(c.data).toBeUndefined();
    expect(b.data).toBe(42);
    expect(a.data).toBe(42);

    const anotherString = new deep.String("some other data");
    a.value = anotherString;
    expect(b.data).toBe("some other data");

    const noDataNoValue = new deep();
    expect(noDataNoValue.data).toBeUndefined();

    const cycleA = new deep.String("Data A"); 
    const cycleB = new deep.String("Data B");

    cycleA.value = cycleB;
    cycleB.value = cycleA;
    expect(cycleA.data).toBe("Data A"); 
    expect(cycleB.data).toBe("Data B");

    const selfCycleString = new deep.String("Self Cycle Data");
    selfCycleString.value = selfCycleString;
    expect(selfCycleString.data).toBe("Self Cycle Data"); 

    const typedStr = new deep.String("original data");
    typedStr.data = "new data"; 
    expect(typedStr.data).toBe("new data");
    
    const chain1 = new deep();
    const chain2 = new deep();
    
    chain1.value = typedStr;
    chain2.value = chain1;
    
    chain2.data = "changed via chain";
    expect(typedStr.data).toBe("changed via chain");
    expect(chain1.data).toBe("changed via chain");
    expect(chain2.data).toBe("changed via chain");
    
    const untypedInstance = new deep();
    expect(() => { untypedInstance.data = "new data"; }).toThrow('Setting .data is only supported on instances with a registered data handler for their type.');
    expect(() => { delete untypedInstance.data; }).toThrow('Deleting .data is only supported on instances with a registered data handler for their type.');
  });
});

describe('events', () => {
  it('type link: should emit correct events for set, change, and delete scenarios', () => {
    const deep = newDeep();
    const linkA = new deep();
    const linkB = new deep();
    const linkC = new deep();
    const linkD = new deep();

    let typeSettedCountA = 0;
    let typedAddedCountB = 0;
    let typedDeletedCountB = 0;
    let typedAddedCountC = 0;
    let typeDeletedCountA = 0;
    let typedDeletedCountC = 0;
    let typedChangedCountD = 0;

    // --- Scenario 1: Initial set linkA.type = linkB ---
    const disposer1A = linkA.on(deep.events.typeSetted._id, (p:any) => {
      typeSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer1B = linkB.on(deep.events.typedAdded._id, (p:any) => {
      typedAddedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkB._id);
    });

    linkA.type = linkB;

    expect(typeSettedCountA).toBe(1);
    expect(typedAddedCountB).toBe(1);

    disposer1A();
    disposer1B();

    // --- Scenario 2: linkD refers to linkA, then linkA.type changes ---
    linkD.type = linkA; 
    typeSettedCountA = 0; // Reset for this scenario part
    // typedAddedCountB is not expected here
    // typedDeletedCountB will be reused
    // typedAddedCountC will be reused

    const disposer2A = linkA.on(deep.events.typeSetted._id, (p:any) => {
      typeSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer2B = linkB.on(deep.events.typedDeleted._id, (p:any) => {
      typedDeletedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkB._id);
    });
    const disposer2C = linkC.on(deep.events.typedAdded._id, (p:any) => {
      typedAddedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkC._id);
    });
    
    linkA.type = linkC;

    expect(typeSettedCountA).toBe(1);
    expect(typedDeletedCountB).toBe(1);
    expect(typedAddedCountC).toBe(1);

    disposer2A();
    disposer2B();
    disposer2C();

    // --- Scenario 3: Delete linkA.type (which was linkC) ---
    // typeDeletedCountA will be reused
    // typedDeletedCountC will be reused
    // typedChangedCountD will be reused

    const disposer3A = linkA.on(deep.events.typeDeleted._id, (p:any) => {
      typeDeletedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer3C = linkC.on(deep.events.typedDeleted._id, (p:any) => {
      typedDeletedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkC._id);
    });
    const disposer3D = linkD.on(deep.events.typedChanged._id, (p:any) => { 
      typedChangedCountD++;
      expect(p._id).toBe(linkD._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(linkD._id);
    });

    delete linkA.type;

    expect(typeDeletedCountA).toBe(1);
    expect(typedDeletedCountC).toBe(1);
    expect(typedChangedCountD).toBe(1);

    disposer3A();
    disposer3C();
    disposer3D();
  });

  it('from link: should emit correct events for set, change, and delete scenarios', () => {
    const deep = newDeep();
    const linkA = new deep();
    const linkB = new deep();
    const linkC = new deep();
    const linkD = new deep();

    let fromSettedCountA = 0;
    let outAddedCountB = 0;
    let outDeletedCountB = 0;
    let outAddedCountC = 0;
    let fromDeletedCountA = 0;
    let outDeletedCountC = 0;
    let outChangedCountD = 0;

    // --- Scenario 1: Initial set linkA.from = linkB ---
    const disposer1A = linkA.on(deep.events.fromSetted._id, (p:any) => {
      fromSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer1B = linkB.on(deep.events.outAdded._id, (p:any) => {
      outAddedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkB._id);
    });

    linkA.from = linkB;

    expect(fromSettedCountA).toBe(1);
    expect(outAddedCountB).toBe(1);

    disposer1A();
    disposer1B();

    // --- Scenario 2: linkD refers to linkA (linkD.from = linkA), then linkA.from changes ---
    linkD.from = linkA;
    fromSettedCountA = 0; // Reset

    const disposer2A = linkA.on(deep.events.fromSetted._id, (p:any) => {
      fromSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer2B = linkB.on(deep.events.outDeleted._id, (p:any) => {
      outDeletedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkB._id);
    });
    const disposer2C = linkC.on(deep.events.outAdded._id, (p:any) => {
      outAddedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkC._id);
    });
    // Note: Referrer event (outChanged on linkD) is implicitly tested by later scenarios,
    // but for clarity, we ensure it fires correctly when source changes.
    const disposer2D_change = linkD.on(deep.events.outChanged._id, (p:any) => { 
      // This will be triggered if linkA (which linkD.from points to) changes its .from
      // However, this specific scenario tests when linkA.from itself is changed, not linkA.
      // The test for linkD.outChanged due to linkA.from changing is better placed in the 'from link events' specific describe block later.
      // For this sub-scenario, we are focused on A, B, C.
    });
    
    linkA.from = linkC;

    expect(fromSettedCountA).toBe(1);
    expect(outDeletedCountB).toBe(1);
    expect(outAddedCountC).toBe(1);
    // outChangedCountD is not expected to increment here based on this specific event setup for this sub-scenario.
    // It will be tested in the dedicated block 'from link events'.

    disposer2A();
    disposer2B();
    disposer2C();
    disposer2D_change(); // Dispose this listener

    // --- Scenario 3: Delete linkA.from (which was linkC) ---
    const disposer3A = linkA.on(deep.events.fromDeleted._id, (p:any) => {
      fromDeletedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer3C = linkC.on(deep.events.outDeleted._id, (p:any) => {
      outDeletedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkC._id);
    });
    const disposer3D = linkD.on(deep.events.outChanged._id, (p:any) => {
      outChangedCountD++; // This SHOULD fire now as linkA (D's .from target) had its .from deleted.
      expect(p._id).toBe(linkD._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(linkD._id);
    });

    delete linkA.from;

    expect(fromDeletedCountA).toBe(1);
    expect(outDeletedCountC).toBe(1);
    expect(outChangedCountD).toBe(1); // Expecting D to get an outChanged event

    disposer3A();
    disposer3C();
    disposer3D();
  });

  it('to link: should emit correct events for set, change, and delete scenarios', () => {
    const deep = newDeep();
    const linkA = new deep();
    const linkB = new deep();
    const linkC = new deep();
    const linkD = new deep();

    let toSettedCountA = 0;
    let inAddedCountB = 0;
    let inDeletedCountB = 0;
    let inAddedCountC = 0;
    let toDeletedCountA = 0;
    let inDeletedCountC = 0;
    let inChangedCountD = 0;

    // --- Scenario 1: Initial set linkA.to = linkB ---
    const disposer1A = linkA.on(deep.events.toSetted._id, (p:any) => {
      toSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer1B = linkB.on(deep.events.inAdded._id, (p:any) => {
      inAddedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkB._id);
    });

    linkA.to = linkB;
    expect(toSettedCountA).toBe(1);
    expect(inAddedCountB).toBe(1);
    
    disposer1A();
    disposer1B();
    
    // --- Scenario 2: linkD.to = linkA, then linkA.to changes ---
    linkD.to = linkA;
    toSettedCountA = 0; // Reset

    const disposer2A = linkA.on(deep.events.toSetted._id, (p:any) => {
      toSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer2B = linkB.on(deep.events.inDeleted._id, (p:any) => {
      inDeletedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkB._id);
    });
    const disposer2C = linkC.on(deep.events.inAdded._id, (p:any) => {
      inAddedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkC._id);
    });

    linkA.to = linkC;
    expect(toSettedCountA).toBe(1);
    expect(inDeletedCountB).toBe(1);
    expect(inAddedCountC).toBe(1);
    
    disposer2A();
    disposer2B();
    disposer2C();
    
    // --- Scenario 3: Delete linkA.to (which was linkC) ---
    const disposer3A = linkA.on(deep.events.toDeleted._id, (p:any) => {
      toDeletedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer3C = linkC.on(deep.events.inDeleted._id, (p:any) => {
      inDeletedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkC._id);
    });
    const disposer3D = linkD.on(deep.events.inChanged._id, (p:any) => {
      inChangedCountD++;
      expect(p._id).toBe(linkD._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(linkD._id);
    });

    delete linkA.to;
    expect(toDeletedCountA).toBe(1);
    expect(inDeletedCountC).toBe(1);
    expect(inChangedCountD).toBe(1);

    disposer3A();
    disposer3C();
    disposer3D();
  });

  it('value link: should emit correct events for set, changed, and delete scenarios', () => {
    const deep = newDeep();
    const linkA = new deep();
    const linkB = new deep();
    const linkC = new deep();
    const linkD = new deep();

    let valueSettedCountA = 0;
    let valuedAddedCountB = 0;
    let valuedDeletedCountB = 0;
    let valuedAddedCountC = 0;
    let valueDeletedCountA = 0;
    let valuedDeletedCountC = 0;
    let valuedChangedCountD = 0;

    // --- Scenario 1: Initial set linkA.value = linkB ---
    const disposer1A = linkA.on(deep.events.valueSetted._id, (p:any) => {
      valueSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer1B = linkB.on(deep.events.valuedAdded._id, (p:any) => {
      valuedAddedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkB._id);
    });

    linkA.value = linkB;
    expect(valueSettedCountA).toBe(1);
    expect(valuedAddedCountB).toBe(1);
    
    disposer1A();
    disposer1B();
    
    // --- Scenario 2: linkD.value = linkA, then linkA.value changes ---
    linkD.value = linkA;
    valueSettedCountA = 0; // Reset

    const disposer2A = linkA.on(deep.events.valueSetted._id, (p:any) => {
      valueSettedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer2B = linkB.on(deep.events.valuedDeleted._id, (p:any) => {
      valuedDeletedCountB++;
      expect(p._id).toBe(linkB._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkB._id);
    });
    const disposer2C = linkC.on(deep.events.valuedAdded._id, (p:any) => {
      valuedAddedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(linkC._id);
    });

    linkA.value = linkC;
    expect(valueSettedCountA).toBe(1);
    expect(valuedDeletedCountB).toBe(1);
    expect(valuedAddedCountC).toBe(1);

    disposer2A();
    disposer2B();
    disposer2C();
    
    // --- Scenario 3: Delete linkA.value (which was linkC) ---
    const disposer3A = linkA.on(deep.events.valueDeleted._id, (p:any) => {
      valueDeletedCountA++;
      expect(p._id).toBe(linkA._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkA._id);
    });
    const disposer3C = linkC.on(deep.events.valuedDeleted._id, (p:any) => {
      valuedDeletedCountC++;
      expect(p._id).toBe(linkC._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(linkC._id);
    });
    const disposer3D = linkD.on(deep.events.valuedChanged._id, (p:any) => {
      valuedChangedCountD++;
      expect(p._id).toBe(linkD._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(linkD._id);
    });

    delete linkA.value;
    expect(valueDeletedCountA).toBe(1);
    expect(valuedDeletedCountC).toBe(1);
    expect(valuedChangedCountD).toBe(1);

    disposer3A();
    disposer3C();
    disposer3D();
  });
});

describe('from link events', () => {
  it('should emit correct events when a "from" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    
    const source = new deep();
    const oldTarget = new deep();
    const newTarget = new deep();
    const referrer = new deep();

    let fromSettedCountSource = 0;
    let outAddedCountOldTarget = 0;
    let outDeletedCountOldTarget = 0;
    let outAddedCountNewTarget = 0;
    let fromDeletedCountSource = 0;
    let outDeletedCountNewTarget = 0;
    let outChangedCountReferrer = 0;

    referrer.from = source;

    // --- Scenario 1: Set source.from = oldTarget ---
    const disposer1Source = source.on(deep.events.fromSetted._id, (p: any) => {
      fromSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer1OldTarget = oldTarget.on(deep.events.outAdded._id, (p: any) => {
      outAddedCountOldTarget++;
      expect(p._id).toBe(oldTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(oldTarget._id);
    });

    source.from = oldTarget;

    expect(fromSettedCountSource).toBe(1);
    expect(outAddedCountOldTarget).toBe(1);

    disposer1Source();
    disposer1OldTarget();

    // --- Scenario 2: Change source.from from oldTarget to newTarget ---
    fromSettedCountSource = 0; // Reset
    
    const disposer2Source = source.on(deep.events.fromSetted._id, (p: any) => {
      fromSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer2OldTarget = oldTarget.on(deep.events.outDeleted._id, (p: any) => {
      outDeletedCountOldTarget++;
      expect(p._id).toBe(oldTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(oldTarget._id);
    });
    const disposer2NewTarget = newTarget.on(deep.events.outAdded._id, (p: any) => {
      outAddedCountNewTarget++;
      expect(p._id).toBe(newTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(newTarget._id);
    });
    const disposer2Referrer = referrer.on(deep.events.outChanged._id, (p: any) => {
      outChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });

    source.from = newTarget;

    expect(fromSettedCountSource).toBe(1);
    expect(outDeletedCountOldTarget).toBe(1);
    expect(outAddedCountNewTarget).toBe(1);
    expect(outChangedCountReferrer).toBe(1);

    disposer2Source();
    disposer2OldTarget();
    disposer2NewTarget();
    disposer2Referrer();

    // --- Scenario 3: Delete source.from (which was newTarget) ---
    outChangedCountReferrer = 0; // Reset for this specific check
    
    const disposer3Source = source.on(deep.events.fromDeleted._id, (p: any) => {
      fromDeletedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(source._id);
    });
    const disposer3NewTarget = newTarget.on(deep.events.outDeleted._id, (p: any) => {
      outDeletedCountNewTarget++;
      expect(p._id).toBe(newTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(newTarget._id);
    });
    const disposer3Referrer = referrer.on(deep.events.outChanged._id, (p: any) => {
      outChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });

    delete source.from;

    expect(fromDeletedCountSource).toBe(1);
    expect(outDeletedCountNewTarget).toBe(1);
    expect(outChangedCountReferrer).toBe(1);

    disposer3Source();
    disposer3NewTarget();
    disposer3Referrer();
  });
});

describe('to link events', () => {
  it('should emit correct events when a "to" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    
    const source = new deep();
    const oldTarget = new deep();
    const newTarget = new deep();
    const referrer = new deep(); 

    let toSettedCountSource = 0;
    let inAddedCountOldTarget = 0;
    let inDeletedCountOldTarget = 0;
    let inAddedCountNewTarget = 0;
    let toDeletedCountSource = 0;
    let inDeletedCountNewTarget = 0;
    let inChangedCountReferrer = 0;
    
    referrer.to = source;

    // --- Scenario 1: Set source.to = oldTarget ---
    const disposer1Source = source.on(deep.events.toSetted._id, (p: any) => {
      toSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer1OldTarget = oldTarget.on(deep.events.inAdded._id, (p: any) => {
      inAddedCountOldTarget++;
      expect(p._id).toBe(oldTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(oldTarget._id);
    });
        
    source.to = oldTarget;
    expect(toSettedCountSource).toBe(1);
    expect(inAddedCountOldTarget).toBe(1);

    disposer1Source();
    disposer1OldTarget();

    // --- Scenario 2: Change source.to from oldTarget to newTarget ---
    toSettedCountSource = 0; // Reset

    const disposer2Source = source.on(deep.events.toSetted._id, (p: any) => {
      toSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer2OldTarget = oldTarget.on(deep.events.inDeleted._id, (p: any) => {
      inDeletedCountOldTarget++;
      expect(p._id).toBe(oldTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(oldTarget._id);
    });
    const disposer2NewTarget = newTarget.on(deep.events.inAdded._id, (p: any) => {
      inAddedCountNewTarget++;
      expect(p._id).toBe(newTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(newTarget._id);
    });
    const disposer2Referrer = referrer.on(deep.events.inChanged._id, (p: any) => {
      inChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });

    source.to = newTarget;
    expect(toSettedCountSource).toBe(1);
    expect(inDeletedCountOldTarget).toBe(1);
    expect(inAddedCountNewTarget).toBe(1);
    expect(inChangedCountReferrer).toBe(1);

    disposer2Source();
    disposer2OldTarget();
    disposer2NewTarget();
    disposer2Referrer();

    // --- Scenario 3: Delete source.to ---
    inChangedCountReferrer = 0; // Reset

    const disposer3Source = source.on(deep.events.toDeleted._id, (p: any) => {
      toDeletedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(source._id);
    });
    const disposer3NewTarget = newTarget.on(deep.events.inDeleted._id, (p: any) => {
      inDeletedCountNewTarget++;
      expect(p._id).toBe(newTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(newTarget._id);
    });
    const disposer3Referrer = referrer.on(deep.events.inChanged._id, (p: any) => {
      inChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });
    
    delete source.to;
    expect(toDeletedCountSource).toBe(1);
    expect(inDeletedCountNewTarget).toBe(1);
    expect(inChangedCountReferrer).toBe(1);

    disposer3Source();
    disposer3NewTarget();
    disposer3Referrer();
  });
});

describe('value link events', () => {
  it('should emit correct events when a "value" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    
    const source = new deep();
    const oldValueTarget = new deep(); 
    const newValueTarget = new deep(); 
    const referrer = new deep();

    let valueSettedCountSource = 0;
    let valuedAddedCountOldValueTarget = 0;
    let valuedDeletedCountOldValueTarget = 0;
    let valuedAddedCountNewValueTarget = 0;
    let valueDeletedCountSource = 0;
    let valuedDeletedCountNewValueTarget = 0;
    let valuedChangedCountReferrer = 0;
    
    referrer.value = source;

    // --- Scenario 1: Set source.value = oldValueTarget ---
    const disposer1Source = source.on(deep.events.valueSetted._id, (p: any) => {
      valueSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer1OldValueTarget = oldValueTarget.on(deep.events.valuedAdded._id, (p: any) => {
      valuedAddedCountOldValueTarget++;
      expect(p._id).toBe(oldValueTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(oldValueTarget._id);
    });
        
    source.value = oldValueTarget;
    expect(valueSettedCountSource).toBe(1);
    expect(valuedAddedCountOldValueTarget).toBe(1);

    disposer1Source();
    disposer1OldValueTarget();

    // --- Scenario 2: Change source.value from oldValueTarget to newValueTarget ---
    valueSettedCountSource = 0; // Reset

    const disposer2Source = source.on(deep.events.valueSetted._id, (p: any) => {
      valueSettedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(source._id);
    });
    const disposer2OldValueTarget = oldValueTarget.on(deep.events.valuedDeleted._id, (p: any) => {
      valuedDeletedCountOldValueTarget++;
      expect(p._id).toBe(oldValueTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(oldValueTarget._id);
    });
    const disposer2NewValueTarget = newValueTarget.on(deep.events.valuedAdded._id, (p: any) => {
      valuedAddedCountNewValueTarget++;
      expect(p._id).toBe(newValueTarget._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(newValueTarget._id);
    });
    const disposer2Referrer = referrer.on(deep.events.valuedChanged._id, (p: any) => {
      valuedChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });

    source.value = newValueTarget;
    expect(valueSettedCountSource).toBe(1);
    expect(valuedDeletedCountOldValueTarget).toBe(1);
    expect(valuedAddedCountNewValueTarget).toBe(1);
    expect(valuedChangedCountReferrer).toBe(1);

    disposer2Source();
    disposer2OldValueTarget();
    disposer2NewValueTarget();
    disposer2Referrer();

    // --- Scenario 3: Delete source.value ---
    valuedChangedCountReferrer = 0; // Reset

    const disposer3Source = source.on(deep.events.valueDeleted._id, (p: any) => {
      valueDeletedCountSource++;
      expect(p._id).toBe(source._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(source._id);
    });
    const disposer3NewValueTarget = newValueTarget.on(deep.events.valuedDeleted._id, (p: any) => {
      valuedDeletedCountNewValueTarget++;
      expect(p._id).toBe(newValueTarget._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(newValueTarget._id);
    });
    const disposer3Referrer = referrer.on(deep.events.valuedChanged._id, (p: any) => {
      valuedChangedCountReferrer++;
      expect(p._id).toBe(referrer._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(referrer._id);
    });

    delete source.value;
    expect(valueDeletedCountSource).toBe(1);
    expect(valuedDeletedCountNewValueTarget).toBe(1);
    expect(valuedChangedCountReferrer).toBe(1);

    disposer3Source();
    disposer3NewValueTarget();
    disposer3Referrer();
  });
});

describe('data change events', () => {
  it('should propagate data:changed events up the value chain when data is modified', () => {
    const deep = newDeep();
    
    const str = new deep.String('abc');
    const A = new deep();
    const B = new deep();
    const C = new deep();
    
    A.value = str;
    B.value = A;
    C.value = B;
    
    let dataSettedCountStr = 0;
    let dataChangedCountA = 0;
    let dataChangedCountB = 0;
    let dataChangedCountC = 0;
    
    const disposerStr = str.on(deep.events.dataSetted._id, (p:any) => {
      dataSettedCountStr++;
      expect(p._id).toBe(str._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(str._id);
    });
    const disposerA = A.on(deep.events.dataChanged._id, (p:any) => {
      dataChangedCountA++;
      expect(p._id).toBe(A._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(A._id);
    });
    const disposerB = B.on(deep.events.dataChanged._id, (p:any) => {
      dataChangedCountB++;
      expect(p._id).toBe(B._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(B._id);
    });
    const disposerC = C.on(deep.events.dataChanged._id, (p:any) => {
      dataChangedCountC++;
      expect(p._id).toBe(C._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(C._id);
    });
        
    C.data = 'def';
    
    expect(dataSettedCountStr).toBe(1);
    expect(dataChangedCountA).toBe(1);
    expect(dataChangedCountB).toBe(1);
    expect(dataChangedCountC).toBe(1);
    
    expect(str.data).toBe('def');
    expect(A.data).toBe('def');
    expect(B.data).toBe('def');
    expect(C.data).toBe('def');
    
    disposerStr();
    disposerA();
    disposerB();
    disposerC();
  });

  it('should propagate value:changed events up the chain when value links change', () => {
    const deep = newDeep();
    
    const str1 = new deep.String('abc1');
    const str2 = new deep.String('abc2');
    const A = new deep();
    const B = new deep();
    const C = new deep();
    
    A.value = str1;
    B.value = A;
    C.value = B;
    
    let valueSettedCountA = 0;
    let valuedDeletedCountStr1 = 0;
    let valuedAddedCountStr2 = 0;
    let valuedChangedCountB = 0;
    let valuedChangedCountC = 0;
    
    const disposerA = A.on(deep.events.valueSetted._id, (p:any) => {
      valueSettedCountA++;
      expect(p._id).toBe(A._id);
      expect(p._reason).toBe('setted');
      expect(p._source).toBe(A._id);
    });
    const disposerStr1 = str1.on(deep.events.valuedDeleted._id, (p:any) => {
      valuedDeletedCountStr1++;
      expect(p._id).toBe(str1._id);
      expect(p._reason).toBe('deleted');
      expect(p._source).toBe(str1._id);
    });
    const disposerStr2 = str2.on(deep.events.valuedAdded._id, (p:any) => {
      valuedAddedCountStr2++;
      expect(p._id).toBe(str2._id);
      expect(p._reason).toBe('added');
      expect(p._source).toBe(str2._id);
    });
    const disposerB = B.on(deep.events.valuedChanged._id, (p:any) => {
      valuedChangedCountB++;
      expect(p._id).toBe(B._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(B._id);
    });
    const disposerC = C.on(deep.events.valuedChanged._id, (p:any) => {
      valuedChangedCountC++;
      expect(p._id).toBe(C._id);
      expect(p._reason).toBe('changed');
      expect(p._source).toBe(C._id);
    });
    
    A.value = str2;
    
    expect(A.value._id).toBe(str2._id);
    
    expect(valueSettedCountA).toBe(1);
    expect(valuedDeletedCountStr1).toBe(1);
    expect(valuedAddedCountStr2).toBe(1);
    expect(valuedChangedCountB).toBe(1);
    expect(valuedChangedCountC).toBe(1);
    
    disposerA();
    disposerStr1();
    disposerStr2();
    disposerB();
    disposerC();
  });
});
