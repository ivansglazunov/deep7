// Provides a mechanism (Method class) for defining callable methods on Deep instances with custom application logic.

export function newMethod(deep) {
  const Method = new deep();

  Method._contain._constructor = function (currentConstructor, args: any[] = []) {
    const _fn = args[0];
    let fn;
    if (typeof _fn == 'function') {
      fn = new deep.Function(_fn);
    } else if (typeof _fn == 'string') {
      fn = deep(_fn);
      if (fn.type_id != deep.Function._id) throw new Error('method must be a function but got ' + fn.type_id);
    } else {
      throw new Error('must got function or string id but got ' + typeof _fn);
    }
    const instance = new deep();
    instance.type_id = MethodInstance._id;
    instance.value_id = fn._id;
    return instance;
  };

  const MethodInstance = new deep();
  Method._contain.MethodInstance = MethodInstance;
  MethodInstance.type_id = Method._id;
  MethodInstance._contain._apply = function (this: any, ...args: any[]) {
    const fn = this._getDataInstance(this.value_id).byId(this.value_id);
    const instance = new deep(this._id);
    instance._source = this._source;
    instance._reason = deep.reasons.apply._id;
    return fn.apply(instance, args);
  };
  return Method;
}