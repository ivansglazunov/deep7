import Debug from 'debug';

const debug = Debug('deep');

export const _context: any = {};

export const _all = new Set<symbol>();
export const _values = new Map<symbol, _Value<any>>();

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
    if (!this._context) this._context = {
      _symbol: this._symbol,
      _instance: this._instance,
      _proxy: this._proxy,
    };
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
        return context._apply(proxy, args); // I
      },
      construct(ass, args: any[] = []) {
        const context = self.context;
        return context._construct(proxy, args); // I
      },
      get: (target, key, receiver) => {
        const context = self.context;
        if (_gets.has(key)) return self[key]; // I
        else if (context[key]) return context._get(proxy, key); // II
        return undefined; // III
      },
      set: (target, key, value, receiver) => {
        const context = self.context;
        if (_sets.has(key)) {
          self[key] = value; // I
          return true;
        }
        return context._set(proxy, key, value); // II
      },
      has: (target, key) => {
        const context = self.context;
        if (_gets.has(key)) return !!self[key]; // I
        return !!context[key]; // II
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
      // this._symbol = Symbol(stack.split('\n').map((v, i) => `${i} - ${v}`).join('\n'));
    }
  }
}

_context._all = _all;
_context._values = _values;

export const _create = _context._create = function _create(symbol?: any) {
  const instance = new Deep(symbol);
  const proxy = instance.proxy;
  _all.add(symbol || instance.symbol);
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

export const _valueConstruct = (proxy, Value, check, args) => {
  const value = args?.[0];
  check(value)
  const symbol = Value._values.byValue(value);
  const instance = _context._construct(Value, args, symbol);
  if (!symbol) Value._values.byValue(value, instance.symbol);
  instance.data = value;
  _values.set(instance.symbol, Value._values);
  return instance;
};

export const construct = _context.construct = _create();
export const _construct = _context._construct = function _construct(proxy: any, args: any[], symbol) {
  const instance = _create(symbol);
  instance.prev = proxy.symbol;
  instance.prevBy = construct;
  instance.context = proxy.context;
  return instance;
}

_context._getBySymbol = (symbol: symbol) => {
  return undefined;
}

export const deep = global.deep = _create();
deep.deep = deep;

deep._construct = function _construct(proxy: any, args: any[] = []): Deep {
  let value = args?.[0];
  if (value instanceof Deep) return value;
  if (typeof value === 'symbol' && _all.has(value)) {
    const __values = _values.get(value);
    if (__values) {
      const realValue = __values.bySymbol(value);
      if (realValue) value = realValue;
    }
  }
  let instance = _context._construct(proxy, args);
  let Constructor;
  if (args.length === 0) {
    instance.context = proxy.context; 
    Constructor = proxy.symbol;
  }
  else if (args.length === 1) {
    if (value === undefined) Constructor = proxy.undefined;
    else if (value === null) Constructor = proxy.null;
    else if (typeof value === 'boolean') Constructor = proxy.Boolean;
    else if (Number.isNaN(value)) Constructor = proxy.NaN;
    else if (value === Infinity) Constructor = proxy.Infinity;
    else if (value === -Infinity) Constructor = proxy.Infinitye;
    else if (typeof value === 'number') Constructor = proxy.Number;
    else if (typeof value === 'bigint') Constructor = proxy.Bigint;
    else if (typeof value === 'string') Constructor = proxy.String;
    else if (typeof value === 'symbol') Constructor = proxy.Symbol;
    else if (Array.isArray(value)) Constructor = proxy.Array;
    else if (typeof value === 'object') Constructor = proxy.Object;
    else if (value instanceof Promise) Constructor = proxy.Promise;
    else if (value instanceof Map) Constructor = proxy.Map;
    else if (value instanceof WeakMap) Constructor = proxy.WeakMap;
    else if (value instanceof Set) Constructor = proxy.Set;
    else if (value instanceof WeakSet) Constructor = proxy.WeakSet;
    else if (value instanceof Date) Constructor = proxy.Date;
    else if (value instanceof RegExp) Constructor = proxy.RegExp;
    else if (value instanceof Error) Constructor = proxy.Error;
    else if (value instanceof Buffer) Constructor = proxy.Buffer;
    else if (typeof value === 'function') Constructor = proxy.Function;
    else throw new Error('unknown value');
    instance = new Constructor(value);
  } else {
    const values: Deep[] = [];
    for (let i = 0; i < args.length; i++) {
      values.push(proxy._construct(args[i]));
    }
    Constructor = deep.Array;
    instance = new Constructor(values);
  }
  instance.prev = proxy.symbol;
  instance.prevBy = construct;
  return instance;
}


deep.globalContext = _context;

export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
