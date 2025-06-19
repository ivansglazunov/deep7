// Controllable by association _contain and naming alive beings.

export function newContain(deep) {
  deep._contain.name = new deep.Field(function (this, key, valueToSet) {
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

  const Contain = deep._contain.Contain = new deep.Alive(function (this) {
    const state = this._state;
    if (this._reason == deep.reasons.construction._id) {
      state._onValue = this._on(deep.events.valueSetted._id, () => {
        const name = this.data;
        const from = this.from;
        const to = this.to;
        to.name = name; // name for easy navigation
        from._contain[name] = to; // auto parental control context
        deep._emit(deep.events.globalContextAdded._id, this);
      });
    } else if (this._reason == deep.reasons.destruction._id) {
      if (state._onValue) state._onValue();
      const from = this.from;
      const to = this.to;
      if (this.data) {
        if (to._name == this.data) delete to.name; // clear name if equal
        delete from._contain[this.data]; // clear parental context
      }
      deep._emit(deep.events.globalContextRemoved._id, this);
    }
  });
  const ContainAlive = deep._contain.ContainAlive = new deep.Alive(function (this) {
    if (this._reason == deep.reasons.construction._id) {
      // iterate through all contexts
      // create instances of all needed contexts
      const _contains = deep._contains;
      for (const [_id, _contain] of _contains) {
        for (const key of Object.keys(_contain)) {
          const _value = _contain[key];
          if (_value instanceof deep.Deep) {
            const context = new Contain();
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
  deep._contain.containAlive = new ContainAlive();
}
