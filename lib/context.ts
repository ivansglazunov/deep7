// Controllable by association _context and naming alive beings.

export function newContext(deep) {
  deep._context.name = new deep.Field(function(this, key, valueToSet) {
    const owner = new deep(this._source);
    if (this._reason == deep.reasons.getter._id) {
      return owner._state._name;
    } else if (this._reason == deep.reasons.setter._id) {
      return owner._state._name = valueToSet;
    } else if (this._reason == deep.reasons.deleter._id) {
      delete owner._state._name;
    }
  });

  const Context = deep._context.Context = new deep.Alive(function(this) {
    const state = this._state;
    if (this._reason == deep.reasons.construction._id) {
      state._onValue = this._on('.value:setted', () => {
        const name = this.data;
        this.to.name = name;
      });
    } else if (this._reason == deep.reasons.destruction._id) {
      if (state._onValue) state._onValue();
      const to = this.to;
      if (to) delete to.name;
    }
  });
  const ContextAlive = deep._context.ContextAlive = new deep.Alive(function(this) {
    if (this._reason == deep.reasons.construction._id) {
      // пройти по всем контекстам
      // создать экземпляры всех нужных контекстов
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
      // пройти по всем контекстам
      // уничтожить все контексты // или нет
    }
  });
  deep._context.contextAlive = new ContextAlive();
}
