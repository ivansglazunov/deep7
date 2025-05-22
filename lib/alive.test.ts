import { newDeep } from '.';

describe('alive', () => {
  it('new deep.Alive(!function&!string) error', () => {
    const deep = newDeep();
    expect(() => new deep.Alive(123)).toThrow('must got function or string id but got number');
  });

  it('lifecycle hooks are called correctly', () => {
    const deep = newDeep();
    let constructed = false;
    let destructed = false;

    const aliveInstance = new deep.Alive(function (this: any) {
      if (this._reason == deep.reasons.construction._id) {
        constructed = true;
        return true;
      } else if (this._reason == deep.reasons.destruction._id) {
        destructed = true;
        return true;
      } else {
        throw new Error('unknown alive reason');
      }
    });

    expect(aliveInstance._type).toBe(deep.Alive.AliveInstance._id);

    // Creating an instance should trigger construction
    const being = new aliveInstance();
    expect(constructed).toBe(true);
    expect(destructed).toBe(false);

    // Destroying the instance should trigger destruction
    being.destroy();
    expect(destructed).toBe(true);
  });
}); 