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

    console.log('Alive._id', deep.Alive._id);
    console.log('AliveInstance._id', deep.Alive.AliveInstance._id);
    console.log('AliveInstance._type', deep.Alive.AliveInstance._type);
    console.log('aliveInstance._id', aliveInstance._id);
    console.log('aliveInstance._type', aliveInstance._type);

    // Creating an instance should trigger construction
    const being = new aliveInstance();
    expect(constructed).toBe(true);
    expect(destructed).toBe(false);

    console.log('being._id', being._id);
    console.log('being._type', being._type);
    console.log('being._context', being._context);
    console.log('aliveInstance._context', aliveInstance._context);
    console.log('AliveInstance._context', deep.Alive.AliveInstance._context);
    console.log('being._context._construction', being._context._construction);
    console.log('being._context._destruction', being._context._destruction);

    // Destroying the instance should trigger destruction
    being.destroy();
    expect(destructed).toBe(true);
  });
}); 