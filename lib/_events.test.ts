import { jest } from '@jest/globals';
import { _Events, Disposer } from './_events';

describe('_Events', () => {
  let events: _Events;
  const id1 = 'id1';
  const id2 = 'id2';
  const eventType1 = 'event1';
  const eventType2 = 'event2';

  beforeEach(() => {
    events = new _Events();
  });

  test('on and emit: should call handler for a registered event', () => {
    const handler = jest.fn();
    events.on(id1, eventType1, handler);
    events.emit(id1, eventType1, 'arg1', 'arg2');
    expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('on and emit: multiple handlers for the same event', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    events.on(id1, eventType1, handler1);
    events.on(id1, eventType1, handler2);
    events.emit(id1, eventType1, 'data');
    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
  });

  test('on and emit: handlers for different events on the same id', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    events.on(id1, eventType1, handler1);
    events.on(id1, eventType2, handler2);
    events.emit(id1, eventType1, 'data1');
    events.emit(id1, eventType2, 'data2');
    expect(handler1).toHaveBeenCalledWith('data1');
    expect(handler2).toHaveBeenCalledWith('data2');
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  test('on and emit: handlers for different ids', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    events.on(id1, eventType1, handler1);
    events.on(id2, eventType1, handler2);
    events.emit(id1, eventType1, 'data1');
    events.emit(id2, eventType1, 'data2');
    expect(handler1).toHaveBeenCalledWith('data1');
    expect(handler2).toHaveBeenCalledWith('data2');
  });

  test('once: handler should be called only once', () => {
    const handler = jest.fn();
    events.once(id1, eventType1, handler);
    events.emit(id1, eventType1, 'first call');
    events.emit(id1, eventType1, 'second call');
    expect(handler).toHaveBeenCalledWith('first call');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test('off: should remove a specific handler registered with on', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    events.on(id1, eventType1, handler1);
    events.on(id1, eventType1, handler2);
    const result = events.off(id1, eventType1, handler1);
    expect(result).toBe(true);
    events.emit(id1, eventType1, 'data');
    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledWith('data');
  });

  test('off: should remove a specific handler registered with once', () => {
    const handler = jest.fn();
    events.once(id1, eventType1, handler);
    const result = events.off(id1, eventType1, handler);
    expect(result).toBe(true);
    events.emit(id1, eventType1, 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  test('off: should return false if handler or event type does not exist', () => {
    const handler = jest.fn();
    expect(events.off(id1, eventType1, handler)).toBe(false);
    events.on(id1, eventType1, handler);
    expect(events.off(id1, 'nonExistentEvent', handler)).toBe(false);
    expect(events.off('nonExistentId', eventType1, handler)).toBe(false);
  });
  
  test('off: should remove all matching handlers', () => {
    const handler = jest.fn();
    events.on(id1, eventType1, handler);
    events.on(id1, eventType1, handler);
    const result = events.off(id1, eventType1, handler);
    expect(result).toBe(true);
    events.emit(id1, eventType1, 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  test('disposer from on: should remove the handler', () => {
    const handler = jest.fn();
    const dispose = events.on(id1, eventType1, handler);
    dispose();
    events.emit(id1, eventType1, 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  test('disposer from once: should remove the handler', () => {
    const handler = jest.fn();
    const dispose = events.once(id1, eventType1, handler);
    dispose();
    events.emit(id1, eventType1, 'data');
    expect(handler).not.toHaveBeenCalled();
  });
  
  test('disposer from once: calling disposer after event fired should not error', () => {
    const handler = jest.fn();
    const dispose = events.once(id1, eventType1, handler);
    events.emit(id1, eventType1, 'data');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(() => dispose()).not.toThrow();
    events.emit(id1, eventType1, 'more data');
    expect(handler).toHaveBeenCalledTimes(1); // Still once
  });

  test('emit: should not throw for non-existent id or event type', () => {
    expect(() => events.emit('nonExistentId', eventType1, 'data')).not.toThrow();
    expect(() => events.emit(id1, 'nonExistentEvent', 'data')).not.toThrow();
  });

  test('destroy: should remove all handlers for a given id', () => {
    const handler1Id1 = jest.fn();
    const handler2Id1 = jest.fn();
    const handler1Id2 = jest.fn();
    events.on(id1, eventType1, handler1Id1);
    events.on(id1, eventType2, handler2Id1);
    events.on(id2, eventType1, handler1Id2);

    events.destroy(id1);

    events.emit(id1, eventType1, 'data');
    events.emit(id1, eventType2, 'data');
    events.emit(id2, eventType1, 'dataForId2');

    expect(handler1Id1).not.toHaveBeenCalled();
    expect(handler2Id1).not.toHaveBeenCalled();
    expect(handler1Id2).toHaveBeenCalledWith('dataForId2');
  });

  test('destroy: should not affect other ids', () => {
    const handlerId1 = jest.fn();
    const handlerId2 = jest.fn();
    events.on(id1, eventType1, handlerId1);
    events.on(id2, eventType1, handlerId2);
    events.destroy(id1);
    events.emit(id2, eventType1, 'data');
    expect(handlerId2).toHaveBeenCalledWith('data');
  });

  test('emit: should call other handlers if one throws an error, and log the error', () => {
    const handler1 = jest.fn(() => {
      throw new Error('Test error in handler1');
    });
    const handler2 = jest.fn();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    events.on(id1, eventType1, handler1);
    events.on(id1, eventType1, handler2);

    events.emit(id1, eventType1, 'data');

    expect(handler1).toHaveBeenCalledWith('data');
    expect(handler2).toHaveBeenCalledWith('data');
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error in event handler for id '${id1}', event '${eventType1}':`,
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
