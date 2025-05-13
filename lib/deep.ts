import Debug from 'debug';

const debug = Debug('deep');

export const _context: any = {};

export const _all = new Set<symbol>();

export class _Value<T> {
  private _byValue: Map<T, symbol>;
  private _bySymbol: Map<symbol, T>;
  constructor(Collection: any = Map) {
    this._byValue = new Collection();
    this._bySymbol = new Collection();
  }
  byValue(value: T, symbol?: symbol): symbol | undefined {
    if (symbol) {
      this._bySymbol.set(symbol, value);
      this._byValue.set(value, symbol);
    }
    return this._byValue.get(value);
  }
  bySymbol(symbol: symbol, value?: T): T | undefined {
    if (value) {
      this._byValue.set(value, symbol);
      this._bySymbol.set(symbol, value);
    }
    return this._bySymbol.get(symbol);
  }
}

export const _sets = new Set<any>(['instance', 'context', 'symbol', 'prev', 'prevBy', 'proxy', 'data']);
export const _gets = new Set<any>(['instance', 'context', 'symbol', 'prev', 'prevBy', 'proxy', 'proxify', 'data']);

export const _symbolify = (maybeSymbol: any) => {
  if (typeof maybeSymbol === 'symbol') {
    if (!_all.has(maybeSymbol)) throw new Error('symbol not exists');
    return maybeSymbol;
  } else if (maybeSymbol instanceof Deep) {
    return maybeSymbol.symbol;
  } else throw new Error(`can't symbolify type ${typeof maybeSymbol}`);
}

export const _deepify = (maybeDeep: any) => {
  if (maybeDeep instanceof Deep) return maybeDeep;
  else if (typeof maybeDeep === 'symbol') return new Deep(maybeDeep);
  else throw new Error(`can't deepify type ${typeof maybeDeep}`);
}

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
    if (!this._context) this._context = {};
    Object.setPrototypeOf(this._context, parent);
  }
  private _symbol: any;
  get symbol() { return this._symbol; }
  set symbol(symbol: any) { throw new Error('symbol is immutable'); }
  private _data: any;
  get data() { return this._data; }
  set data(data: any) {
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
    const context = this.context;
    const proxy: any = new Proxy(this, {
      apply(ass, thisArg, args) {
        return context._apply(proxy, args); // I
      },
      construct(ass, args = []) {
        return context._construct(proxy, args); // I
      },
      get: (target, key, receiver) => {
        if (_gets.has(key)) return self[key]; // I
        else if (context[key]) return context._get(proxy, key); // II
        return undefined; // III
      },
      set: (target, key, value, receiver) => {
        if (_sets.has(key)) {
          self[key] = value; // I
          return true;
        }
        return context._set(proxy, key, value); // II
      },
      has: (target, key) => {
        if (_gets.has(key)) return !!self[key]; // I
        return context._has(proxy, key); // II
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
      const stackLine = stack.split('\n')[3] || '';
      const locationMatch = stackLine.match(/\((.+):(\d+):(\d+)\)/) || stackLine.match(/at\s+(.+):(\d+):(\d+)/);
      const location = locationMatch ? locationMatch[1] + ':' + locationMatch[2] + ':' + locationMatch[3] : 'unknown';
      const timestamp = new Date().valueOf();
      this._symbol = Symbol(location + ' ' + timestamp);
      _all.add(this._symbol);
    }
  }
}

export const _create = _context._create = function _create(symbol?: any) {
  const instance = new Deep(symbol);
  const proxy = instance.proxy;
  return proxy;
}

export const _apply = _context._apply = function _apply(proxy: any, args: any[]) {
  return proxy.symbol;
}

export const _get = _context._get = function _get(proxy: any, key: any) {
  return proxy?.context?.[key];
}

export const _set = _context._set = function _set(proxy: any, key: any, value: any) {
  proxy.context[key] = value;
  return true;
}

export const construct = _context.construct = _create();
export const _construct = _context._construct = function _construct(proxy: any, args: any[], symbol) {
  const instance = _create(symbol);
  instance.prev = proxy.symbol;
  instance.prevBy = construct;
  instance.context = proxy.context;
  return instance;
}

export const deep = _create();
deep._construct = function _construct(proxy: any, args: any[]): Deep {
  const value = args?.[0];
  let instance = _context._construct(proxy, args);
  if (args.length === 0) instance.context = proxy.context;
  else if (args.length === 1) {
    if (value === undefined) instance = new proxy.undefined(value);
    else if (value === null) instance = new proxy.null(value);
    else if (typeof value === 'boolean') instance = new proxy.Boolean(value);
    else if (Number.isNaN(value)) instance = new proxy.NaN(value);
    else if (value === Infinity) instance = new proxy.Infinity(value);
    else if (value === -Infinity) instance = new proxy.Infinity(-value);
    else if (typeof value === 'number') instance = new proxy.Number(value);
    else if (typeof value === 'bigint') instance = new proxy.Bigint(value);
    else if (typeof value === 'string') instance = new proxy.String(value);
    else if (typeof value === 'symbol') instance = new proxy.Symbol(value);
    else if (Array.isArray(value)) instance = new proxy.Array(value);
    else if (value instanceof Object) instance = new proxy.Object(value);
    else if (value instanceof Promise) instance = new proxy.Promise(value);
    else if (value instanceof Map) instance = new proxy.Map(value);
    else if (value instanceof WeakMap) instance = new proxy.WeakMap(value);
    else if (value instanceof Set) instance = new proxy.Set(value);
    else if (value instanceof WeakSet) instance = new proxy.WeakSet(value);
    else if (value instanceof Date) instance = new proxy.Date(value);
    else if (value instanceof RegExp) instance = new proxy.RegExp(value);
    else if (value instanceof Error) instance = new proxy.Error(value);
    else if (value instanceof Buffer) instance = new proxy.Buffer(value);
    else if (typeof value === 'function') instance = new proxy.Function(value);
    else throw new Error('unknown value');
  } else {
    const values: Deep[] = [];
    for (let i = 0; i < args.length; i++) {
      values.push(proxy._construct(args[i]));
    }
    instance = new deep.Array(values);
  }
  instance.prev = proxy.symbol;
  instance.prevBy = construct;
  return instance;
}


deep.globalContext = _context;

export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
