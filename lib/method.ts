// Provides a mechanism (Method class) for defining callable methods on Deep instances with custom application logic.

export function newMethod(deep) {
  const Method = new deep();

  Method._context._constructor = function (currentConstructor, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn._type != deep.Function._id) throw new Error('method must be a function but got ' + fn._type);
    } else {
      throw new Error('must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance._type = MethodInstance._id;
    instance._value = fn._id;
    return instance;
  };

  const MethodInstance = new deep();
  Method._context.MethodInstance = MethodInstance;
  MethodInstance._type = Method._id;
  MethodInstance._context._apply = function (this: any, ...args: any[]) {
    const fn = this._getDataInstance(this._value).byId(this._value);
    const instance = new deep(this._id);
    instance._source = this._source;
    instance._reason = deep.reasons.apply._id;
    return fn.apply(instance, args);
  };
  return Method;
}