// Controllable by association _context and naming alive beings.

export function newContext(deep) {
  deep._context.name = new deep.Field(function (this, key, valueToSet) {
    const owner = new deep(this._source);
    if (this._reason == deep.reasons.getter._id) {
      return owner._state._name;
    } else if (this._reason == deep.reasons.setter._id) {
      return owner._state._name = valueToSet;
    } else if (this._reason == deep.reasons.deleter._id) {
      delete owner._state._name;
      return true;
    }
  });

  const Context = deep._context.Context = new deep.Alive(function (this) {
    const state = this._state;
    if (this._reason == deep.reasons.construction._id) {
      state._onValue = this._on(deep.events.valueSetted._id, () => {
        const name = this.data;
        const from = this.from;
        const to = this.to;
        to.name = name; // name for easy navigation
        from._context[name] = to; // auto parental control context
        deep._emit(deep.events.globalContextAdded._id, this);
      });
    } else if (this._reason == deep.reasons.destruction._id) {
      if (state._onValue) state._onValue();
      const from = this.from;
      const to = this.to;
      if (this.data) {
        if (to._name == this.data) delete to.name; // clear name if equal
        delete from._context[this.data]; // clear parental context
      }
      deep._emit(deep.events.globalContextRemoved._id, this);
    }
  });
  const ContextAlive = deep._context.ContextAlive = new deep.Alive(function (this) {
    if (this._reason == deep.reasons.construction._id) {
      // iterate through all contexts
      // create instances of all needed contexts
      const _contexts = deep._contexts;
      for (const [_id, _context] of _contexts) {
        for (const key of Object.keys(_context)) {
          const _value = _context[key];
          if (_value instanceof deep.Deep) {
            const context = new Context();
            context._from = _id;
            context._to = _value._id;
            context.value = new deep.String(key);
          }
        }
      }
    } else if (this._reason == deep.reasons.destruction._id) {
      // iterate through all contexts
      // destroy all contexts // or not
    }
  });
  deep._context.contextAlive = new ContextAlive();
}
