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

deep.Value = new deep();
deep.ValueVariants = new deep();

deep.undefined = new deep.Value();
deep.undefined.data = undefined;
deep.undefined._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0] || undefined;
  if (typeof value != 'undefined') throw new Error(`!undefined`);
  const instance = _context._construct(proxy, args, deep.undefined?.symbol);
  instance.data = value;
  return instance;
}

deep.null = new deep.Value();
deep.null.data = null;
deep.null._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0] || null;
  if (value !== null) throw new Error(`!null`);
  const instance = _context._construct(proxy, args, deep.null?.symbol);
  instance.data = value;
  return instance;
}

deep.Boolean = new deep.Value();
deep.Boolean._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0] || false;
  if (typeof value != 'boolean') throw new Error(`!boolean`);
  const instance = _context._construct(proxy, args, value ? deep.true?.symbol : deep.false?.symbol);
  instance.data = value;
  return instance;
}
deep.false = new deep.Boolean(false);
deep.true = new deep.Boolean(true);

deep.Number = new deep.Value();
export const _numbers = deep._numbers = new _Value<number>();
deep.Number._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'number' || !Number.isFinite(value)) throw new Error(`!number`);
  const symbol = _numbers.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) _numbers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.NaN = new deep.Value();
deep.NaN.data = NaN;
deep.NaN._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0] || NaN;
  if (!Number.isNaN(value)) throw new Error(`!NaN`);
  const instance = _context._construct(proxy, args, deep.NaN?.symbol);
  instance.data = value;
  return instance;
}

deep.Infinity = new deep.Value();
deep.Infinity._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0] || Infinity;
  if (value !== Infinity && value !== -Infinity) throw new Error(`!Infinity`);
  const instance = _context._construct(proxy, args, value === Infinity ? _plusInfinity?.symbol : _minusInfinity?.symbol);
  instance.data = value;
  return instance;
}
export const _plusInfinity = deep._plusInfinity = new deep.Infinity(Infinity);
export const _minusInfinity = deep._minusInfinity = new deep.Infinity(-Infinity);

deep.String = new deep.Value();
deep.strings = new _Value<string>();
deep.String._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'string') throw new Error(`!string`);
  const symbol = deep.strings.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.strings.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Symbol = new deep.Value();
deep.symbols = new _Value<symbol>();
deep.Symbol._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'symbol') throw new Error(`!symbol`);
  const symbol = _all.has(value) ? value : deep.symbols.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.symbols.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Array = new deep.Value();
deep.arrays = new _Value<Array<any>>();
deep.Array._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (!Array.isArray(value)) throw new Error(`!array`);
  const symbol = deep.arrays.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.arrays.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Object = new deep.Value();
deep.objects = new _Value<Object>();
deep.Object._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object') throw new Error(`!object`);
  const symbol = deep.objects.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.objects.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Promise = new deep.Value();
deep.promises = new _Value<Promise<any>>(WeakMap);
deep.Promise._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (value?.[Symbol.toStringTag] !== 'Promise') throw new Error(`!promise`);
  const symbol = deep.promises.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.promises.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Map = new deep.Value();
deep.maps = new _Value<Map<any, any>>();
deep.Map._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Map)) throw new Error(`!map`);
  const symbol = deep.maps.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.maps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.WeakMap = new deep.Value();
deep.weakMaps = new _Value<WeakMap<any, any>>();
deep.WeakMap._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof WeakMap)) throw new Error(`!weakMap`);
  const symbol = deep.weakMaps.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.weakMaps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Set = new deep.Value();
deep.sets = new _Value<Set<any>>();
deep.Set._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Set)) throw new Error(`!set`);
  const symbol = deep.sets.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.sets.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.WeakSet = new deep.Value();
deep.weakSets = new _Value<WeakSet<any>>();
deep.WeakSet._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof WeakSet)) throw new Error(`!weakSet`);
  const symbol = deep.weakSets.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.weakSets.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Date = new deep.Value();
deep.dates = new _Value<Date>();
deep.Date._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Date)) throw new Error(`!date`);
  const symbol = deep.dates.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.dates.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.RegExp = new deep.Value();
deep.regExps = new _Value<RegExp>();
deep.RegExp._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof RegExp)) throw new Error(`!RegExp`);
  const symbol = deep.regExps.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.regExps.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Error = new deep.Value();
deep.errors = new _Value<Error>();
deep.Error._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'object' || !(value instanceof Error)) throw new Error(`!error`);
  const symbol = deep.errors.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.errors.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Binary = new deep.Value();

// For Buffer check if Buffer exists (Node.js)
const isBufferAvailable = typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function';

deep.Buffer = new deep.Binary();
deep.buffers = new _Value<Buffer>();
deep.Buffer._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (!isBufferAvailable || !Buffer.isBuffer(value)) throw new Error('!Buffer');
  const symbol = deep.buffers.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.buffers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.ArrayBuffer = new deep.Binary();
deep.arrayBuffers = new _Value<ArrayBuffer>();
deep.ArrayBuffer._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (!(value instanceof ArrayBuffer)) throw new Error('!ArrayBuffer');
  const symbol = deep.arrayBuffers.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.arrayBuffers.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.TypedArray = new deep.Binary();
deep.typedArrays = new _Value<TypedArray>();
deep.TypedArray._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  // Проверяем, что это TypedArray (например Uint8Array, Int32Array и т.п.)
  const isTypedArray = ArrayBuffer.isView(value) && !(value instanceof DataView);
  if (!isTypedArray) throw new Error('!TypedArray');
  const symbol = deep.typedArrays.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.typedArrays.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.DataView = new deep.Binary();
deep.dataViews = new _Value<DataView>();
deep.DataView._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (!(value instanceof DataView)) throw new Error('!DataView');
  const symbol = deep.dataViews.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.dataViews.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Blob = new deep.Binary();
deep.blobs = new _Value<Blob>();
deep.Blob._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  // Blob существует в браузере, в Node.js начиная с 15 версии
  if (typeof Blob === 'undefined' || !(value instanceof Blob)) throw new Error('!Blob');
  const symbol = deep.blobs.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.blobs.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}

deep.Function = new deep.Value();
deep.functions = new _Value<Function>();
deep.Function._construct = (proxy: any, args: any[]): Deep => {
  const value = args?.[0];
  if (typeof value != 'function') throw new Error(`!function`);
  const symbol = deep.functions.byValue(value);
  const instance = _context._construct(proxy, args, symbol);
  if (!symbol) deep.functions.byValue(value, instance.symbol);
  instance.data = value;
  return instance;
}
