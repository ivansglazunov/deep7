import { newDeep } from '.';

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
});
