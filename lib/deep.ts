import Debug from 'debug';

const debug = Debug('deep');

export const _context: any = {};

export const _all = new Set<symbol>();
export const _contexts = new Map<symbol, any>();
export const _datas = new Map<symbol, _Data<any>>();

export class _Data<T> {
  private _byData: Map<T, symbol>;
  private _bySymbol: Map<symbol, T>;
  constructor(Collection: any = Map) {
    this._byData = new Collection();
    this._bySymbol = new Collection();
  }
  byData(data: T, symbol?: symbol): symbol | undefined {
    if (symbol) {
      this._bySymbol.set(symbol, data);
      this._byData.set(data, symbol);
    }
    return this._byData.get(data);
  }
  bySymbol(symbol: symbol, data?: T): T | undefined {
    if (data) {
      this._byData.set(data, symbol);
      this._bySymbol.set(symbol, data);
    }
    return this._bySymbol.get(symbol);
  }
}

export const _sets = new Set<any>(['instance', 'context', 'symbol', 'prev', 'prevBy', 'proxy', 'data']);
export const _gets = new Set<any>(['instance', 'context', 'symbol', 'prev', 'prevBy', 'proxy', 'proxify', 'data']);

export class Deep extends Function {
  private _instance: any;
  get instance() { return this._instance; }
  set instance(instance: any) { throw new Error('instance is immutable'); }
  private _context: any;
  get context() {
    if (!this._context) this.context = _context;
    return this._context;
  }
  set context(parent: any) {
    if (!this._context) _contexts.set(this._symbol, this._context = {
      // TODO remove crutch duplicating in mamory
      _symbol: this._symbol,
      _instance: this._instance,
      _proxy: this._proxy,
    });
    Object.setPrototypeOf(this._context, parent);
  }
  private _symbol: any;
  get symbol() { return this._symbol; }
  set symbol(symbol: any) { throw new Error('symbol is immutable'); }
  private _data: any;
  get data() { return this._data; }
  set data(data: any) {
    if (data instanceof Deep) throw new Error('data can\'t be a Deep');
    if (this._data) debug('⚠️ data dangerously re-assigned');
    this._data = data;
  }
  private _prev: any;
  get prev() { return this._prev; }
  set prev(prev: any) {
    if (this._prev) debug('⚠️ prev dangerously re-assigned');
    this._prev = prev;
  }
  private _prevBy: any;
  get prevBy() { return this._prevBy; }
  set prevBy(prevBy: any) {
    if (this._prevBy) debug('⚠️ prevBy dangerously re-assigned');
    this._prevBy = prevBy;
  }
  private _proxy: any;
  get proxy() {
    if (!this._proxy) this._proxy = this.proxify;
    return this._proxy;
  }
  set proxy(proxy: any) {
    if (this._proxy) debug('⚠️ proxy dangerously re-assigned');
    this._proxy = proxy;
  }
  get proxify() {
    const self = this;
    const proxy: any = new Proxy(this, {
      apply(ass, thisArg, args: any[] = []) {
        const context = self.context;
        return context._apply(thisArg, proxy, args);
      },
      construct(ass, args: any[] = []) {
        const context = self.context;
        return context._construct(proxy, args);
      },
      get: (target, key, receiver) => {
        const context = self.context;
        if (_gets.has(key)) return self[key];
        else if (context[key]) {
          const _value = context._get(proxy, key);
          if (_value instanceof Deep && (_value as any)._getter) {
            return (_value as any)._getter(target, _value, key);
          } else {
            return _value;
          }
        }
        return undefined;
      },
      set: (target, key, value, receiver) => {
        const context = self.context;
        if (_sets.has(key)) {
          self[key] = value;
          return true;
        }
        const _value = context._get(proxy, key);
        if (_value instanceof Deep && (_value as any)._setter) {
          return (_value as any)._setter(target, _value, key, value);
        } else {
          return context._set(proxy, key, value);
        }
      },
      deleteProperty: (target, key) => {
        const context = self.context;
        const _value = context._get(proxy, key);
        if (_value instanceof Deep && (_value as any)._deleter) {
          return (_value as any)._deleter(target, _value, key);
        } else {
          return context._delete(proxy, key);
        }
      },
      has: (target, key) => {
        const context = self.context;
        if (_gets.has(key)) return !!self[key];
        return !!context[key];
      },
      ownKeys: (target) => {
        return [...new Set([
          ...Reflect.ownKeys(target),
          ...Object.keys(target.context),
        ])];
      },
      getOwnPropertyDescriptor: (target, key) => {
        const targetDesc = Reflect.getOwnPropertyDescriptor(target, key);
        return targetDesc ? targetDesc : target.context[key] ? {
          enumerable: true,
          configurable: true,
          value: target.context[key]
        } : undefined;
      }
    });
    return proxy;
  }
  constructor(symbol: any) {
    super();
    this._instance = this;
    if (symbol) {
      if (!_all.has(symbol)) throw new Error('symbol not exists');
      else this._symbol = symbol;
    } else {
      const stack: any = new Error().stack;
      const stackLines = stack.split('\n');
      const constructIndex = stackLines.findIndex(v => v.includes('Object.construct'));
      const index = constructIndex > -1 ? constructIndex + 1 : 3;
      const locationMatch = stackLines[index].match(/\((.+):(\d+):(\d+)\)/) || stackLines[index].match(/at\s+(.+):(\d+):(\d+)/);
      const location = locationMatch ? locationMatch[1] + ':' + locationMatch[2] + ':' + locationMatch[3] : 'unknown';
      const timestamp = new Date().valueOf();
      this._symbol = Symbol(location + ' ' + timestamp);
     
    }
  }
}

_context._all = _all;
_context._datas = _datas;

export const _create = _context._create = function _create(symbol?: any) {
  const instance = new Deep(symbol);
  const proxy = instance.proxy;
  _all.add(symbol || proxy.symbol);
  return proxy;
}

export const _apply = _context._apply = function _apply(thisArg: any, proxy: any, args: any[]) {
  return proxy.symbol;
}

export const _get = _context._get = function _get(proxy: any, key: any) {
  return proxy?.context?.[key];
}

export const _set = _context._set = function _set(proxy: any, key: any, value: any) {
  proxy.context[key] = value;
  return true;
}

// DON'T NEED IF YOU NOT USE IT IN YOUR DEEP INSTANCES
// export const _getter = _context._getter = function _getter(proxy: any, key: any) {
//   return undefined;
// }

// export const _setter = _context._setter = function _setter(proxy: any, key: any, value: any) {
//   return false;
// }

// export const _delete = _context._delete = function _delete(proxy: any, key: any) {
//   return false;
// }

export const construct = _context.construct = _create();
export const apply = _context.apply = _create();
export const method = _context.method = _create();
export const getter = _context.getter = _create();
export const setter = _context.setter = _create();
export const deleter = _context.deleter = _create();

export const _construct = _context._construct = function _construct(proxy: any, args: any[], symbol) {
  const instance = _create(symbol);
  instance.prev = proxy.symbol;
  instance.prevBy = construct.symbol;
  instance.context = proxy.context;
  return instance;
}

_context._getBySymbol = (symbol: symbol) => {
  return undefined;
}

export const deep = global.deep = _create();
deep.deep = deep;

deep._construct = function _construct(proxy: any, args: any[] = []): Deep {
  let data = args?.[0];
  let __context;
  if (data instanceof Deep) return data;
  if (typeof data === 'symbol' && _all.has(data)) {
    __context = _contexts.get(data);
    if (__context) return __context._proxy;
    const __datas = _datas.get(data);
    if (__datas) {
      const realData = __datas.bySymbol(data);
      if (realData) data = realData;
    }
  }
  
  let instance = _context._construct(proxy, args);
  if (args.length === 0) {
    instance.context = proxy.context; 
  }
  else if (__context) {
    instance.context = __context;
  } else if (args.length === 1) {
    if (data === undefined) instance = new proxy.Undefined(data);
    else if (data === null) instance = new proxy.null(data);
    else if (typeof data === 'boolean') instance = new proxy.Boolean(data);
    else if (Number.isNaN(data)) instance = new proxy.NaN(data);
    else if (data === Infinity) instance = new proxy.Infinity(data);
    else if (data === -Infinity) instance = new proxy.Infinitye(data);
    else if (typeof data === 'number') instance = new proxy.Number(data);
    else if (typeof data === 'bigint') instance = new proxy.Bigint(data);
    else if (typeof data === 'string') instance = new proxy.String(data);
    else if (typeof data === 'symbol') instance = new proxy.Symbol(data);
    else if (Array.isArray(data)) instance = new proxy.Array(data);
    else if (data instanceof Promise) instance = new proxy.Promise(data);
    else if (data instanceof Map) instance = new proxy.Map(data);
    else if (data instanceof WeakMap) instance = new proxy.WeakMap(data);
    else if (data instanceof Set) instance = new proxy.Set(data);
    else if (data instanceof WeakSet) instance = new proxy.WeakSet(data);
    else if (data instanceof Date) instance = new proxy.Date(data);
    else if (data instanceof RegExp) instance = new proxy.RegExp(data);
    else if (data instanceof Error) instance = new proxy.Error(data);
    else if (data instanceof Buffer) instance = new proxy.Buffer(data);
    else if (typeof data === 'object') instance = new proxy.Object(data);
    else if (typeof data === 'function') instance = new proxy.Function(data);
    else throw new Error('unknown value');
  } else {
    const values: Deep[] = [];
    for (let i = 0; i < args.length; i++) {
      values.push(proxy._construct(args[i]));
    }
    instance = new deep.Array(values);
  }
  instance.prev = proxy.symbol;
  instance.prevBy = construct.symbol;
  return instance;
}

deep.globalContext = _context;

export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;

export * from './data';
