// Controllable by association _context and naming alive beings.

export function newContext(deep) {
  const Context = new deep.Alive(function(this) {
    if (this._reason == deep.reasons.construction._id) {
      // this._state.construction = this;
    } else if (this._reason == deep.reasons.destruction._id) {
      // this._state.destruction = this;
    }
  });

  return Context;
} 