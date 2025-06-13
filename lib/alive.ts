// Provides a mechanism (Alive class) for defining custom lifecycle behaviors for Deep instances with specialized construction and destruction logic.

export function newAlive(deep) {
  const Alive = new deep();

  // Create AliveInstance before defining Alive._constructor
  const AliveInstance = Alive._context.AliveInstance = new deep();

  // Do NOT set type to avoid recursion
  // AliveInstance._type = Alive._id;

  Alive._context._constructor = function (currentConstructor, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn._type != deep._context.Function._id) throw new Error('alive must be a function but got ' + typeof _fn);
    } else {
      throw new Error('alive must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance._type = AliveInstance._id;
    instance._value = fn._id;
    return instance;
  };

  // Constructor will handle calling the _construction method
  AliveInstance._context._construction = function (this: any) {
    const state = this._getState(this._id);
    if (this._id == AliveInstance._id || this._type == AliveInstance._id) return; // avoid self new deep() handling
    if (!state._construction) {
      state._construction = true;
      const data = this._getData(this._Value.one(this._type));
      if (typeof data !== 'function') {
        // During restoration, the alive function might not be available yet
        // Mark as constructed to prevent future attempts and return gracefully
        if (data === undefined) {
          console.warn(`Alive function not found for ${this._id} during restoration, skipping construction`);
          return;
        }
        throw new Error('alive must be a function but got ' + typeof data);
      }
      return data.call(this);
    }
  };

  // Destructor will handle calling the _destruction method
  AliveInstance._context._destruction = function (this: any) {
    const state = this._getState(this._id);
    if (this._id == AliveInstance._id || this._type == AliveInstance._id) return; // avoid self new deep() handling
    if (!state._destruction) {
      state._destruction = true;
      const data = this._getData(this._Value.one(this._type));
      if (typeof data !== 'function') {
        // During restoration, the alive function might not be available yet
        // Mark as destructed to prevent future attempts and return gracefully
        if (data === undefined) {
          console.warn(`Alive function not found for ${this._id} during destruction, skipping destruction`);
          return;
        }
        throw new Error('alive must be a function but got ' + typeof data);
      }
      return data.call(this);
    }
  };

  return Alive;
} 