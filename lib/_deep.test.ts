import { v4 as uuidv4 } from 'uuid';

import { _initDeep } from '.';
import { _delay } from './_promise';

describe('_deep', () => {
  it('_Deep instance', () => {
    const _Deep = _initDeep();
    const d1 = new _Deep();
    expect(typeof d1._id).toBe('string');
    expect(d1._source).toBe(d1._id);
    expect(d1._reason).toBe(d1._id);
    expect(d1._created_at).toBe(d1._updated_at);
    expect(() => d1._id = uuidv4()).toThrow(`id for ${d1._id} can't be changed`);

    const _d2 = uuidv4();
    const d2 = new _Deep(_d2);
    expect(d2._created_at).toBe(0);
    d2._created_at = new Date().valueOf();
    expect(d2._id).toBe(_d2);
    expect(d2._source).toBe(_d2);
    expect(d2._reason).toBe(_d2);
    expect(d2._created_at).toBe(d2._updated_at);
    expect(d2._created_at).toBeGreaterThan(d1._created_at);

    const d3 = new _Deep(d1._id);
    expect(d3._id).toBe(d1._id);
    expect(d3._source).toBe(d1._id);
    expect(d3._reason).toBe(d1._id);
    expect(d3._created_at).toBe(d1._created_at);

    const d4 = new _Deep();
    d3._source = d4._id;
    d3._reason = d4._id;
    expect(d3._source).toBe(d4._id);
    expect(d3._reason).toBe(d4._id);
    expect(d1._source).toBe(d1._id);
    expect(d1._reason).toBe(d1._id);

    d3.destroy();
  });

  it('_Deep sequential numbering (_i)', () => {
    const _Deep = _initDeep();
    
    // Create several associations
    const d1 = new _Deep();
    const d2 = new _Deep();
    const d3 = new _Deep();
    const d4 = new _Deep();

    // Check that each gets a unique sequential number
    expect(d1._i).toBe(1);
    expect(d2._i).toBe(2);
    expect(d3._i).toBe(3);
    expect(d4._i).toBe(4);

    // Check that creating an association with existing ID preserves sequence
    const existingId = uuidv4();
    _Deep._setSequenceNumber(existingId, 100);
    const d5 = new _Deep(existingId);
    expect(d5._i).toBe(100);

    // New associations should continue from the highest sequence
    const d6 = new _Deep();
    expect(d6._i).toBe(101);

    // Clean up
    d1.destroy();
    d2.destroy();
    d3.destroy();
    d4.destroy();
    d5.destroy();
    d6.destroy();
  });

  it('_Deep existing IDs system', () => {
    const _Deep = _initDeep();
    
    // Set up some existing IDs
    const existingIds = [uuidv4(), uuidv4(), uuidv4()];
    _Deep._setExistingIds(existingIds);

    // Create new associations - should use existing IDs first
    const d1 = new _Deep();
    const d2 = new _Deep();
    const d3 = new _Deep();

    expect(d1._id).toBe(existingIds[0]);
    expect(d2._id).toBe(existingIds[1]);
    expect(d3._id).toBe(existingIds[2]);

    // Next association should generate new UUID
    const d4 = new _Deep();
    expect(existingIds).not.toContain(d4._id);
    expect(d4._id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

    // Clean up
    d1.destroy();
    d2.destroy();
    d3.destroy();
    d4.destroy();
  });

  it('_Deep type', async () => {
    const _Deep = _initDeep();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._Type.size).toBe(0);

    const d1 = new _Deep();
    const d2 = new _Deep();
    const d3 = new _Deep();

    expect(d1._created_at).toBe(d1._updated_at);
    expect(d2._created_at).toBe(d2._updated_at);
    expect(d3._created_at).toBe(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._Type.size).toBe(0);

    await _delay(100);

    d2._type = d1._id;
    d3._type = d2._id;

    expect(d2._created_at).toBeLessThan(d2._updated_at);
    expect(d3._created_at).toBeLessThan(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._Type.size).toBe(2);
 
    expect(d2._type).toBe(d1._id);
    expect(d1._typed.has(d2._id)).toBe(true);
    expect(d3._type).toBe(d2._id);
    expect(d2._typed.has(d3._id)).toBe(true);

    d3._type = undefined;
    expect(d3._type).toBe(undefined);
    expect(d3._typed.size).toBe(0);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._Type.size).toBe(1);

    d1.destroy();
    d2.destroy();
    d3.destroy();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._Type.size).toBe(0);
  });
  it('_Deep from', async () => {
    const _Deep = _initDeep();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._From.size).toBe(0);

    const d1 = new _Deep();
    const d2 = new _Deep();
    const d3 = new _Deep();

    expect(d1._created_at).toBe(d1._updated_at);
    expect(d2._created_at).toBe(d2._updated_at);
    expect(d3._created_at).toBe(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._From.size).toBe(0);

    await _delay(100);

    d2._from = d1._id;
    d3._from = d2._id;

    expect(d2._created_at).toBeLessThan(d2._updated_at);
    expect(d3._created_at).toBeLessThan(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._From.size).toBe(2);
 
    expect(d2._from).toBe(d1._id);
    expect(d1._out.has(d2._id)).toBe(true);
    expect(d3._from).toBe(d2._id);
    expect(d2._out.has(d3._id)).toBe(true);

    d3._from = undefined;
    expect(d3._from).toBe(undefined);
    expect(d3._out.size).toBe(0);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._From.size).toBe(1);

    d1.destroy();
    d2.destroy();
    d3.destroy();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._From.size).toBe(0);
  });
  it('_Deep to', async () => {
    const _Deep = _initDeep();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._To.size).toBe(0);

    const d1 = new _Deep();
    const d2 = new _Deep();
    const d3 = new _Deep();

    expect(d1._created_at).toBe(d1._updated_at);
    expect(d2._created_at).toBe(d2._updated_at);
    expect(d3._created_at).toBe(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._To.size).toBe(0);

    await _delay(100);

    d2._to = d1._id;
    d3._to = d2._id;

    expect(d2._created_at).toBeLessThan(d2._updated_at);
    expect(d3._created_at).toBeLessThan(d3._updated_at);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._To.size).toBe(2);
 
    expect(d2._to).toBe(d1._id);
    expect(d1._in.has(d2._id)).toBe(true);
    expect(d3._to).toBe(d2._id);
    expect(d2._in.has(d3._id)).toBe(true);

    d3._to = undefined;
    expect(d3._to).toBe(undefined);
    expect(d3._in.size).toBe(0);

    expect(_Deep._ids.size).toBe(3);
    expect(_Deep._To.size).toBe(1);

    d1.destroy();
    d2.destroy();
    d3.destroy();

    expect(_Deep._ids.size).toBe(0);
    expect(_Deep._To.size).toBe(0);
  });
});
