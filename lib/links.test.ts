import { _Reason, newDeep } from '.';

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

  describe('events', () => {
    it('type link: should emit correct events for set, change, and delete scenarios without mocks', () => {
      const deep = newDeep();
      const DeepClass = deep.Deep;
      const linkA = new deep();
      const linkB = new deep();
      const linkC = new deep();
      const linkD = new deep();

      interface RecordedEvent {
        emitterId: string;
        eventType: string;
        payloadId?: string;
        payloadReason?: string;
        payloadSource?: string;
        receivedPayload?: string; // Added for debugging non-standard payloads
      }
      let recordedEvents: RecordedEvent[] = [];
      let disposers: (() => void)[] = [];

      const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };

        if (payload instanceof DeepClass) {
          const pId = payload._id;
          const pReason = payload._reason;
          const pSource = payload._source;

          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId;
            event.payloadSource = pSource;
            event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let receivedPayloadStr = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pId}; `;
            receivedPayloadStr += `reason: ${typeof pReason === 'string' ? pReason : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pReason}; `;
            receivedPayloadStr += `source: ${typeof pSource === 'string' ? pSource : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pSource})`;
            event.receivedPayload = receivedPayloadStr;
          }
        } else if (payload !== undefined && payload !== null) {
          try {
            event.receivedPayload = JSON.stringify(payload);
          } catch (e) {
            event.receivedPayload = String(payload);
          }
        } else {
          event.receivedPayload = String(payload);
        }
        recordedEvents.push(event);
      };

      const clearRecorder = () => {
        disposers.forEach(dispose => dispose());
        disposers = [];
        recordedEvents = [];
      };

      // --- Scenario 1: Initial set linkA.type = linkB ---
      clearRecorder();
      disposers.push(linkA._on('.type:setted', (p:any) => recordEvent(linkA._id, '.type:setted', p)));
      disposers.push(linkB._on('.typed:added', (p:any) => recordEvent(linkB._id, '.typed:added', p)));

      linkA.type = linkB;

      expect(recordedEvents).toHaveLength(2);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.type:setted', payloadId: linkA._id, payloadReason: 'setted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.typed:added', payloadId: linkB._id, payloadReason: 'added', payloadSource: linkB._id }),
      ]));

      // --- Scenario 2: linkD refers to linkA, then linkA.type changes ---
      clearRecorder();
      linkD.type = linkA; 
      clearRecorder(); 

      disposers.push(linkA._on('.type:setted', (p:any) => recordEvent(linkA._id, '.type:setted', p)));
      disposers.push(linkB._on('.typed:deleted', (p:any) => recordEvent(linkB._id, '.typed:deleted', p)));
      disposers.push(linkC._on('.typed:added', (p:any) => recordEvent(linkC._id, '.typed:added', p)));
      disposers.push(linkD._on('.typed:changed', (p:any) => recordEvent(linkD._id, '.typed:changed', p)));
      
      linkA.type = linkC;

      expect(recordedEvents).toHaveLength(4);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.type:setted', payloadId: linkA._id, payloadReason: 'setted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.typed:deleted', payloadId: linkB._id, payloadReason: 'deleted', payloadSource: linkB._id }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.typed:added', payloadId: linkC._id, payloadReason: 'added', payloadSource: linkC._id }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.typed:changed', payloadId: linkD._id, payloadReason: 'changed', payloadSource: linkD._id }),
      ]));

      // --- Scenario 3: Delete linkA.type (which was linkC) ---
      clearRecorder();
      disposers.push(linkA._on('.type:deleted', (p:any) => recordEvent(linkA._id, '.type:deleted', p)));
      disposers.push(linkC._on('.typed:deleted', (p:any) => recordEvent(linkC._id, '.typed:deleted', p)));
      disposers.push(linkD._on('.typed:changed', (p:any) => recordEvent(linkD._id, '.typed:changed', p)));

      delete linkA.type;

      expect(recordedEvents).toHaveLength(3);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.type:deleted', payloadId: linkA._id, payloadReason: 'deleted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.typed:deleted', payloadId: linkC._id, payloadReason: 'deleted', payloadSource: linkC._id }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.typed:changed', payloadId: linkD._id, payloadReason: 'changed', payloadSource: linkD._id }),
      ]));

      clearRecorder();
    });

    it('from link: should emit correct events for set, change, and delete scenarios without mocks', () => {
      const deep = newDeep();
      const DeepClass = deep.Deep;
      const linkA = new deep();
      const linkB = new deep();
      const linkC = new deep();
      const linkD = new deep(); // linkD will refer to linkA

      interface RecordedEvent {
        emitterId: string;
        eventType: string;
        payloadId?: string;
        payloadReason?: string;
        payloadSource?: string;
        receivedPayload?: string; // Added
      }
      let recordedEvents: RecordedEvent[] = [];
      let disposers: (() => void)[] = [];

      const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };

        if (payload instanceof DeepClass) {
          const pId = payload._id;
          const pReason = payload._reason;
          const pSource = payload._source;

          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId;
            event.payloadSource = pSource;
            event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let receivedPayloadStr = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pId}; `;
            receivedPayloadStr += `reason: ${typeof pReason === 'string' ? pReason : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pReason}; `;
            receivedPayloadStr += `source: ${typeof pSource === 'string' ? pSource : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pSource})`;
            event.receivedPayload = receivedPayloadStr;
          }
        } else if (payload !== undefined && payload !== null) {
          try {
            event.receivedPayload = JSON.stringify(payload);
          } catch (e) {
            event.receivedPayload = String(payload);
          }
        } else {
          event.receivedPayload = String(payload);
        }
        recordedEvents.push(event);
      };

      const clearRecorder = () => {
        disposers.forEach(dispose => dispose());
        disposers = [];
        recordedEvents = [];
      };

      // --- Scenario 1: Initial set linkA.from = linkB ---
      clearRecorder();
      disposers.push(linkA._on('.from:setted', (p:any) => recordEvent(linkA._id, '.from:setted', p)));
      disposers.push(linkB._on('.out:added', (p:any) => recordEvent(linkB._id, '.out:added', p)));

      linkA.from = linkB;

      expect(recordedEvents).toHaveLength(2);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.from:setted', payloadId: linkA._id, payloadReason: 'setted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.out:added', payloadId: linkB._id, payloadReason: 'added', payloadSource: linkB._id }),
      ]));

      // --- Scenario 2: linkD refers to linkA (linkD.from = linkA), then linkA.from changes ---
      clearRecorder();
      linkD.from = linkA; // Setup: linkD's .from now points to linkA
      clearRecorder(); 

      disposers.push(linkA._on('.from:setted', (p:any) => recordEvent(linkA._id, '.from:setted', p)));
      disposers.push(linkB._on('.out:deleted', (p:any) => recordEvent(linkB._id, '.out:deleted', p))); // linkB was old .from of linkA
      disposers.push(linkC._on('.out:added', (p:any) => recordEvent(linkC._id, '.out:added', p)));   // linkC is new .from of linkA
      disposers.push(linkD._on('.out:changed', (p:any) => recordEvent(linkD._id, '.out:changed', p)));// linkD refers to linkA via .from
      
      linkA.from = linkC; // Change linkA.from from linkB to linkC

      expect(recordedEvents).toHaveLength(4);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.from:setted', payloadId: linkA._id, payloadReason: 'setted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.out:deleted', payloadId: linkB._id, payloadReason: 'deleted', payloadSource: linkB._id }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.out:added', payloadId: linkC._id, payloadReason: 'added', payloadSource: linkC._id }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.out:changed', payloadId: linkD._id, payloadReason: 'changed', payloadSource: linkD._id }),
      ]));

      // --- Scenario 3: Delete linkA.from (which was linkC) ---
      clearRecorder();
      disposers.push(linkA._on('.from:deleted', (p:any) => recordEvent(linkA._id, '.from:deleted', p)));
      disposers.push(linkC._on('.out:deleted', (p:any) => recordEvent(linkC._id, '.out:deleted', p))); // linkC was the .from of linkA
      disposers.push(linkD._on('.out:changed', (p:any) => recordEvent(linkD._id, '.out:changed', p)));// linkD refers to linkA via .from

      delete linkA.from;

      expect(recordedEvents).toHaveLength(3);
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.from:deleted', payloadId: linkA._id, payloadReason: 'deleted', payloadSource: linkA._id }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.out:deleted', payloadId: linkC._id, payloadReason: 'deleted', payloadSource: linkC._id }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.out:changed', payloadId: linkD._id, payloadReason: 'changed', payloadSource: linkD._id }),
      ]));

      clearRecorder();
    });

    it('to link: should emit correct events for set, change, and delete scenarios without mocks', () => {
      const deep = newDeep();
      const DeepClass = deep.Deep;
      const linkA = new deep(); // Source of the .to link
      const linkB = new deep(); // Initial target of linkA.to
      const linkC = new deep(); // New target of linkA.to
      const linkD = new deep(); // linkD.to will refer to linkA

      interface RecordedEvent { emitterId: string; eventType: string; payloadId?: string; payloadReason?: string; payloadSource?: string; receivedPayload?: string;}
      let recordedEvents: RecordedEvent[] = [];
      let disposers: (() => void)[] = [];
      const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };

        if (payload instanceof DeepClass) {
          const pId = payload._id;
          const pReason = payload._reason;
          const pSource = payload._source;

          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId;
            event.payloadSource = pSource;
            event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let receivedPayloadStr = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pId}; `;
            receivedPayloadStr += `reason: ${typeof pReason === 'string' ? pReason : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pReason}; `;
            receivedPayloadStr += `source: ${typeof pSource === 'string' ? pSource : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pSource})`;
            event.receivedPayload = receivedPayloadStr;
          }
        } else if (payload !== undefined && payload !== null) {
          try {
            event.receivedPayload = JSON.stringify(payload);
          } catch (e) {
            event.receivedPayload = String(payload);
          }
        } else {
          event.receivedPayload = String(payload);
        }
        recordedEvents.push(event);
      };
      const clearRecorder = () => { disposers.forEach(dispose => dispose()); disposers = []; recordedEvents = []; };

      // --- Scenario 1: Initial set linkA.to = linkB ---
      clearRecorder();
      disposers.push(linkA._on('.to:setted', (p:any) => recordEvent(linkA._id, '.to:setted', p)));
      disposers.push(linkB._on('.in:added', (p:any) => recordEvent(linkB._id, '.in:added', p)));

      linkA.to = linkB;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.to:setted', payloadReason: 'setted' }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.in:added', payloadReason: 'added' }),
      ]));
      expect(recordedEvents).toHaveLength(2);

      // --- Scenario 2: linkD.to = linkA, then linkA.to changes ---
      clearRecorder();
      linkD.to = linkA;
      clearRecorder();
      disposers.push(linkA._on('.to:setted', (p:any) => recordEvent(linkA._id, '.to:setted', p)));
      disposers.push(linkB._on('.in:deleted', (p:any) => recordEvent(linkB._id, '.in:deleted', p)));
      disposers.push(linkC._on('.in:added', (p:any) => recordEvent(linkC._id, '.in:added', p)));
      disposers.push(linkD._on('.in:changed', (p:any) => recordEvent(linkD._id, '.in:changed', p)));

      linkA.to = linkC;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.to:setted', payloadReason: 'setted' }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.in:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.in:added', payloadReason: 'added' }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.in:changed', payloadReason: 'changed' }),
      ]));
      expect(recordedEvents).toHaveLength(4);

      // --- Scenario 3: Delete linkA.to (which was linkC) ---
      clearRecorder();
      disposers.push(linkA._on('.to:deleted', (p:any) => recordEvent(linkA._id, '.to:deleted', p)));
      disposers.push(linkC._on('.in:deleted', (p:any) => recordEvent(linkC._id, '.in:deleted', p)));
      disposers.push(linkD._on('.in:changed', (p:any) => recordEvent(linkD._id, '.in:changed', p)));

      delete linkA.to;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.to:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.in:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.in:changed', payloadReason: 'changed' }),
      ]));
      expect(recordedEvents).toHaveLength(3);
      clearRecorder();
    });

    it('value link: should emit correct events for set, change, and delete scenarios without mocks', () => {
      const deep = newDeep();
      const DeepClass = deep.Deep;
      const linkA = new deep(); // Source of the .value link
      const linkB = new deep(); // Initial target of linkA.value
      const linkC = new deep(); // New target of linkA.value
      const linkD = new deep(); // linkD.value will refer to linkA

      interface RecordedEvent { emitterId: string; eventType: string; payloadId?: string; payloadReason?: string; payloadSource?: string; receivedPayload?: string;}
      let recordedEvents: RecordedEvent[] = [];
      let disposers: (() => void)[] = [];
      const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };

        if (payload instanceof DeepClass) {
          const pId = payload._id;
          const pReason = payload._reason;
          const pSource = payload._source;

          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId;
            event.payloadSource = pSource;
            event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let receivedPayloadStr = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pId}; `;
            receivedPayloadStr += `reason: ${typeof pReason === 'string' ? pReason : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pReason}; `;
            receivedPayloadStr += `source: ${typeof pSource === 'string' ? pSource : 'NOT_A_STRING_OR_UNDEFINED'}, type: ${typeof pSource})`;
            event.receivedPayload = receivedPayloadStr;
          }
        } else if (payload !== undefined && payload !== null) {
          try {
            event.receivedPayload = JSON.stringify(payload);
          } catch (e) {
            event.receivedPayload = String(payload);
          }
        } else {
          event.receivedPayload = String(payload);
        }
        recordedEvents.push(event);
      };
      const clearRecorder = () => { disposers.forEach(dispose => dispose()); disposers = []; recordedEvents = []; };

      // --- Scenario 1: Initial set linkA.value = linkB ---
      clearRecorder();
      disposers.push(linkA._on('.value:setted', (p:any) => recordEvent(linkA._id, '.value:setted', p)));
      disposers.push(linkB._on('.valued:added', (p:any) => recordEvent(linkB._id, '.valued:added', p)));

      linkA.value = linkB;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.value:setted', payloadReason: 'setted' }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.valued:added', payloadReason: 'added' }),
      ]));
      expect(recordedEvents).toHaveLength(2);

      // --- Scenario 2: linkD.value = linkA, then linkA.value changes ---
      clearRecorder();
      linkD.value = linkA;
      clearRecorder();
      disposers.push(linkA._on('.value:setted', (p:any) => recordEvent(linkA._id, '.value:setted', p)));
      disposers.push(linkB._on('.valued:deleted', (p:any) => recordEvent(linkB._id, '.valued:deleted', p)));
      disposers.push(linkC._on('.valued:added', (p:any) => recordEvent(linkC._id, '.valued:added', p)));
      disposers.push(linkD._on('.valued:changed', (p:any) => recordEvent(linkD._id, '.valued:changed', p)));

      linkA.value = linkC;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.value:setted', payloadReason: 'setted' }),
        expect.objectContaining({ emitterId: linkB._id, eventType: '.valued:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.valued:added', payloadReason: 'added' }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.valued:changed', payloadReason: 'changed' }),
      ]));
      expect(recordedEvents).toHaveLength(4);

      // --- Scenario 3: Delete linkA.value (which was linkC) ---
      clearRecorder();
      disposers.push(linkA._on('.value:deleted', (p:any) => recordEvent(linkA._id, '.value:deleted', p)));
      disposers.push(linkC._on('.valued:deleted', (p:any) => recordEvent(linkC._id, '.valued:deleted', p)));
      disposers.push(linkD._on('.valued:changed', (p:any) => recordEvent(linkD._id, '.valued:changed', p)));

      delete linkA.value;
      expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: linkA._id, eventType: '.value:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkC._id, eventType: '.valued:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: linkD._id, eventType: '.valued:changed', payloadReason: 'changed' }),
      ]));
      expect(recordedEvents).toHaveLength(3);
      clearRecorder();
    });
  });
});

describe('from link events', () => {
  it('should emit correct events when a "from" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    const DeepClass = deep.Deep;
    
    const source = new deep();
    const oldTarget = new deep();
    const newTarget = new deep();
    const referrer = new deep();

    interface RecordedEvent {
        emitterId: string;
        eventType: string;
        payloadId?: string;
        payloadReason?: string;
        payloadSource?: string;
        receivedPayload?: string;
    }
    let recordedEvents: RecordedEvent[] = [];
    let disposers: (() => void)[] = [];

    const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };
        if (payload instanceof DeepClass) {
            const pId = payload._id; const pReason = payload._reason; const pSource = payload._source;
            if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
                event.payloadId = pId; event.payloadSource = pSource; event.payloadReason = pReason;
            } else {
                event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
                let str = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'N/A'}, type: ${typeof pId}; `;
                str += `reason: ${typeof pReason === 'string' ? pReason : 'N/A'}, type: ${typeof pReason}; `;
                str += `source: ${typeof pSource === 'string' ? pSource : 'N/A'}, type: ${typeof pSource})`;
                event.receivedPayload = str;
            }
        } else if (payload !== undefined && payload !== null) {
            try { event.receivedPayload = JSON.stringify(payload); } catch (e) { event.receivedPayload = String(payload); }
        } else { event.receivedPayload = String(payload); }
        recordedEvents.push(event);
    };

    const clearRecorder = () => {
        disposers.forEach(dispose => dispose());
        disposers = [];
        recordedEvents = [];
    };

    // Precondition: referrer.from points to source.
    // This action itself might emit events if listeners were active globally.
    // For the new pattern, we ensure this state before specific scenario listeners.
    referrer.from = source;

    // --- Scenario 1: Set source.from = oldTarget ---
    clearRecorder(); // Clear events from referrer.from = source setup

    disposers.push(source._on('.from:setted', (p: any) => recordEvent(source._id, '.from:setted', p)));
    disposers.push(oldTarget._on('.out:added', (p: any) => recordEvent(oldTarget._id, '.out:added', p)));
    // If referrer.from === source._id, it should get .out:changed when source changes its .from
    disposers.push(referrer._on('.out:changed', (p: any) => recordEvent(referrer._id, '.out:changed', p)));

    source.from = oldTarget;

    expect(recordedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.from:setted', payloadId: source._id, payloadReason: 'setted', payloadSource: source._id }),
        expect.objectContaining({ emitterId: oldTarget._id, eventType: '.out:added', payloadId: oldTarget._id, payloadReason: 'added', payloadSource: oldTarget._id }),
        expect.objectContaining({ emitterId: referrer._id, eventType: '.out:changed', payloadId: referrer._id, payloadReason: 'changed', payloadSource: referrer._id }),
      ])
    );
    expect(recordedEvents).toHaveLength(3);

    // --- Scenario 2: Change source.from from oldTarget to newTarget ---
    clearRecorder();
    // referrer.from = source; // This link still exists.
    
    disposers.push(source._on('.from:setted', (p: any) => recordEvent(source._id, '.from:setted', p)));
    disposers.push(oldTarget._on('.out:deleted', (p: any) => recordEvent(oldTarget._id, '.out:deleted', p)));
    disposers.push(newTarget._on('.out:added', (p: any) => recordEvent(newTarget._id, '.out:added', p)));
    disposers.push(referrer._on('.out:changed', (p: any) => recordEvent(referrer._id, '.out:changed', p)));

    source.from = newTarget;

    expect(recordedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.from:setted', payloadReason: 'setted' }),
        expect.objectContaining({ emitterId: oldTarget._id, eventType: '.out:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: newTarget._id, eventType: '.out:added', payloadReason: 'added' }),
        expect.objectContaining({ emitterId: referrer._id, eventType: '.out:changed', payloadReason: 'changed' }),
      ])
    );
    expect(recordedEvents).toHaveLength(4);

    // --- Scenario 3: Delete source.from (which was newTarget) ---
    clearRecorder();
    // referrer.from = source; // This link still exists, source's .from is being removed.
    
    disposers.push(source._on('.from:deleted', (p: any) => recordEvent(source._id, '.from:deleted', p)));
    disposers.push(newTarget._on('.out:deleted', (p: any) => recordEvent(newTarget._id, '.out:deleted', p)));
    disposers.push(referrer._on('.out:changed', (p: any) => recordEvent(referrer._id, '.out:changed', p)));

    delete source.from;

    expect(recordedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.from:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: newTarget._id, eventType: '.out:deleted', payloadReason: 'deleted' }),
        expect.objectContaining({ emitterId: referrer._id, eventType: '.out:changed', payloadReason: 'changed' }),
      ])
    );
    expect(recordedEvents).toHaveLength(3);
    clearRecorder(); 
  });
});

describe('to link events', () => {
  it('should emit correct events when a "to" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    const DeepClass = deep.Deep;

    const source = new deep();
    const oldTarget = new deep();
    const newTarget = new deep();
    const referrer = new deep(); 

    interface RecordedEvent { emitterId: string; eventType: string; payloadId?: string; payloadReason?: string; payloadSource?: string; receivedPayload?: string; }
    let recordedEvents: RecordedEvent[] = [];
    let disposers: (() => void)[] = [];

    const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };
        if (payload instanceof DeepClass) {
          const pId = payload._id; const pReason = payload._reason; const pSource = payload._source;
          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId; event.payloadSource = pSource; event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let str = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'N/A'}, type: ${typeof pId}; `;
            str += `reason: ${typeof pReason === 'string' ? pReason : 'N/A'}, type: ${typeof pReason}; `;
            str += `source: ${typeof pSource === 'string' ? pSource : 'N/A'}, type: ${typeof pSource})`;
            event.receivedPayload = str;
          }
        } else if (payload !== undefined && payload !== null) {
            try { event.receivedPayload = JSON.stringify(payload); } catch (e) { event.receivedPayload = String(payload); }
        } else { event.receivedPayload = String(payload); }
        recordedEvents.push(event);
    };
    const clearRecorder = () => { disposers.forEach(dispose => dispose()); disposers = []; recordedEvents = []; };
    
    referrer.to = source; // Precondition

    // --- Scenario 1: Set source.to = oldTarget ---
    clearRecorder(); // Clear events from referrer.to = source setup

    disposers.push(source._on('.to:setted', (p: any) => recordEvent(source._id, '.to:setted', p)));
    disposers.push(oldTarget._on('.in:added', (p: any) => recordEvent(oldTarget._id, '.in:added', p)));
    disposers.push(referrer._on('.in:changed', (p: any) => recordEvent(referrer._id, '.in:changed', p)));
    
    source.to = oldTarget;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.to:setted', payloadReason: 'setted' }), 
        expect.objectContaining({ emitterId: oldTarget._id, eventType: '.in:added', payloadReason: 'added' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.in:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(3);

    // --- Scenario 2: Change source.to from oldTarget to newTarget ---
    clearRecorder();
    disposers.push(source._on('.to:setted', (p: any) => recordEvent(source._id, '.to:setted', p)));
    disposers.push(oldTarget._on('.in:deleted', (p: any) => recordEvent(oldTarget._id, '.in:deleted', p)));
    disposers.push(newTarget._on('.in:added', (p: any) => recordEvent(newTarget._id, '.in:added', p)));
    disposers.push(referrer._on('.in:changed', (p: any) => recordEvent(referrer._id, '.in:changed', p)));

    source.to = newTarget;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.to:setted', payloadReason: 'setted' }), 
        expect.objectContaining({ emitterId: oldTarget._id, eventType: '.in:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: newTarget._id, eventType: '.in:added', payloadReason: 'added' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.in:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(4);

    // --- Scenario 3: Delete source.to ---
    clearRecorder();
    disposers.push(source._on('.to:deleted', (p: any) => recordEvent(source._id, '.to:deleted', p)));
    disposers.push(newTarget._on('.in:deleted', (p: any) => recordEvent(newTarget._id, '.in:deleted', p))); // newTarget was the target
    disposers.push(referrer._on('.in:changed', (p: any) => recordEvent(referrer._id, '.in:changed', p)));
    
    delete source.to;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.to:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: newTarget._id, eventType: '.in:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.in:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(3);
    clearRecorder();
  });
});

describe('value link events', () => {
  it('should emit correct events when a "value" link is set, changed, and deleted, including referrer events', () => {
    const deep = newDeep();
    const DeepClass = deep.Deep;

    const source = new deep();
    const oldValueTarget = new deep(); 
    const newValueTarget = new deep(); 
    const referrer = new deep();

    interface RecordedEvent { emitterId: string; eventType: string; payloadId?: string; payloadReason?: string; payloadSource?: string; receivedPayload?: string; }
    let recordedEvents: RecordedEvent[] = [];
    let disposers: (() => void)[] = [];

    const recordEvent = (emitterId: string, eventType: string, payload: any) => {
        const event: RecordedEvent = { emitterId, eventType };
        if (payload instanceof DeepClass) {
          const pId = payload._id; const pReason = payload._reason; const pSource = payload._source;
          if (typeof pId === 'string' && typeof pReason === 'string' && typeof pSource === 'string') {
            event.payloadId = pId; event.payloadSource = pSource; event.payloadReason = pReason;
          } else {
            event.payloadId = typeof pId === 'string' ? pId : 'payload_id_not_string';
            let str = `DeepInstance (id: ${typeof pId === 'string' ? pId : 'N/A'}, type: ${typeof pId}; `;
            str += `reason: ${typeof pReason === 'string' ? pReason : 'N/A'}, type: ${typeof pReason}; `;
            str += `source: ${typeof pSource === 'string' ? pSource : 'N/A'}, type: ${typeof pSource})`;
            event.receivedPayload = str;
          }
        } else if (payload !== undefined && payload !== null) {
            try { event.receivedPayload = JSON.stringify(payload); } catch (e) { event.receivedPayload = String(payload); }
        } else { event.receivedPayload = String(payload); }
        recordedEvents.push(event);
    };
    const clearRecorder = () => { disposers.forEach(dispose => dispose()); disposers = []; recordedEvents = []; };
    
    referrer.value = source; // Precondition

    // --- Scenario 1: Set source.value = oldValueTarget ---
    clearRecorder(); // Clear events from referrer.value = source setup

    disposers.push(source._on('.value:setted', (p: any) => recordEvent(source._id, '.value:setted', p)));
    disposers.push(oldValueTarget._on('.valued:added', (p: any) => recordEvent(oldValueTarget._id, '.valued:added', p)));
    disposers.push(referrer._on('.valued:changed', (p: any) => recordEvent(referrer._id, '.valued:changed', p)));
    
    source.value = oldValueTarget;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.value:setted', payloadReason: 'setted' }), 
        expect.objectContaining({ emitterId: oldValueTarget._id, eventType: '.valued:added', payloadReason: 'added' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.valued:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(3);

    // --- Scenario 2: Change source.value from oldValueTarget to newValueTarget ---
    clearRecorder();
    disposers.push(source._on('.value:setted', (p: any) => recordEvent(source._id, '.value:setted', p)));
    disposers.push(oldValueTarget._on('.valued:deleted', (p: any) => recordEvent(oldValueTarget._id, '.valued:deleted', p)));
    disposers.push(newValueTarget._on('.valued:added', (p: any) => recordEvent(newValueTarget._id, '.valued:added', p)));
    disposers.push(referrer._on('.valued:changed', (p: any) => recordEvent(referrer._id, '.valued:changed', p)));

    source.value = newValueTarget;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.value:setted', payloadReason: 'setted' }), 
        expect.objectContaining({ emitterId: oldValueTarget._id, eventType: '.valued:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: newValueTarget._id, eventType: '.valued:added', payloadReason: 'added' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.valued:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(4);

    // --- Scenario 3: Delete source.value ---
    clearRecorder();
    disposers.push(source._on('.value:deleted', (p: any) => recordEvent(source._id, '.value:deleted', p)));
    disposers.push(newValueTarget._on('.valued:deleted', (p: any) => recordEvent(newValueTarget._id, '.valued:deleted', p))); // newValueTarget was the target
    disposers.push(referrer._on('.valued:changed', (p: any) => recordEvent(referrer._id, '.valued:changed', p)));

    delete source.value;
    expect(recordedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ emitterId: source._id, eventType: '.value:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: newValueTarget._id, eventType: '.valued:deleted', payloadReason: 'deleted' }), 
        expect.objectContaining({ emitterId: referrer._id, eventType: '.valued:changed', payloadReason: 'changed' }),
    ]));
    expect(recordedEvents).toHaveLength(3);
    clearRecorder();
  });
});

// Add tests for mixed referrer types if necessary, e.g.
// source.type changes.
// referrer1.type = source
// referrer2.from = source
// referrer3.to = source
// referrer4.value = source
// All referrers should get their respective :changed events.
// The current emitReferrerChangeEvents should handle this.
// A separate test could confirm this cross-link-type referrer notification.

/*
Example of recordEvent if it needs to be defined or imported:
interface RecordedEvent {
  emitterId: number;
  eventType: string;
  payloadId?: string;
  payloadSource?: number;
  payloadReason?: string;
}

const recordEvent = (receivedEvents: RecordedEvent[], emitterId: number, eventType: string, payload: any) => {
  const event: RecordedEvent = { emitterId, eventType };
  if (payload && payload instanceof deep.Deep && 
      typeof payload._id === 'string' && 
      typeof payload._reason === 'string' && 
      typeof payload._source === 'number') {
    event.payloadId = payload._id;
    event.payloadSource = payload._source;
    event.payloadReason = payload._reason;
  } else if (payload && typeof payload === 'object' && payload !== null) { // Basic fallback for other payloads
    // For these tests, we primarily expect Deep instances as payloads.
  }
  receivedEvents.push(event);
};
*/
