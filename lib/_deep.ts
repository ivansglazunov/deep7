// Provides the low-level core for Deep instances, managing identity, timestamps, contexts, fundamental link relations (_Type, _From, _To, _Value), typed data storage, and an event bus. Intended for internal framework use only.
import { v4 as uuidv4 } from 'uuid';

import { _Relation } from './_relation';
import { _Data } from './_data';
import { _Events } from './_events';

export function _initDeep() {
  const _ids = new Set<string>();
  const _created_ats = new Map<string, number>();
  const _updated_ats = new Map<string, number>();

  const _contexts = new Map<string, any>();

  const _Type = new _Relation();
  const _From = new _Relation();
  const _To = new _Relation();
  const _Value = new _Relation();

  const _datas = new Map<string, _Data<any>>();
  const _getData = (typeId: string | undefined): _Data<any> | undefined => {
    if (!typeId) return undefined;
    if (_datas.has(typeId)) return _datas.get(typeId);
    else {
      const nextTypeId = _Type.one(typeId);
      if (nextTypeId) return _getData(nextTypeId);
      else return undefined;
    }
  }

  const __events = new _Events();

  class _Deep extends Function {
    // <global context>
    static _Deep = _Deep;
    public _Deep = _Deep;
    // </global context>

    // <about association>
    static _ids = _ids;
    public _ids = _ids;
    public __id: string;
    get _id(): string { return this.__id; }
    set _id(id: string) {
      if (this.__id) throw new Error(`id for ${this._id} can't be changed`);
      else this.__id = id;
    }

    get _symbol(): any { return this._data || this._id; }

    static _created_ats = _created_ats;
    public _created_ats = _created_ats;
    get _created_at(): number { return _created_ats.get(this._id) || 0; }
    set _created_at(created_at: number) {
      if (_created_ats.has(this._id)) throw new Error(`created_at for ${this._id} can't be changed`);
      else {
        _created_ats.set(this._id, created_at);
        _updated_ats.set(this._id, created_at);
      }
    }

    static _updated_ats = _updated_ats;
    public _updated_ats = _updated_ats;
    get _updated_at(): number { return _updated_ats.get(this._id) || 0; }
    set _updated_at(updated_at: number) { _updated_ats.set(this._id, updated_at); }

    // <context for proxy>
    static _contexts = _contexts;
    public _contexts = _contexts;

    get _context(): any {
      let _context;
      if (!_contexts.has(this.__id)) _contexts.set(this.__id, _context = {});
      else _context = _contexts.get(this.__id);
      return _context;
    }
    set _context(typeId: any) {
      let _context;
      if (!_contexts.has(this.__id)) _contexts.set(this.__id, _context = {});
      else _context = _contexts.get(this.__id);
      Object.setPrototypeOf(_context, _contexts.get(typeId));
    }
    // </context for proxy>

    static _Type = _Type;
    public _Type = _Type;
    get _type(): string | undefined { return _Type.one(this._id); }
    set _type(type: string | undefined) {
      if (typeof type !== 'string' && type !== undefined) throw new Error('type must be id string or undefined');
      if (type !== undefined) {
        _Type.set(this._id, type);
        this._context = type;
      } else _Type.delete(this._id);
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _typed(): Set<string> { return _Type.many(this._id); }

    static _From = _From;
    public _From = _From;
    get _from(): string | undefined { return _From.one(this._id); }
    set _from(from: string | undefined) {
      if (typeof from !== 'string' && from !== undefined) throw new Error('from must be id string or undefined');
      if (from !== undefined) _From.set(this._id, from);
      else _From.delete(this._id);
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _out(): Set<string> { return _From.many(this._id); }

    static _To = _To;
    public _To = _To;
    get _to(): string | undefined { return _To.one(this._id); }
    set _to(to: string | undefined) {
      if (typeof to !== 'string' && to !== undefined) throw new Error('to must be id string or undefined');
      if (to !== undefined) _To.set(this._id, to);
      else _To.delete(this._id);
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _in(): Set<string> { return _To.many(this._id); }

    static _Value = _Value;
    public _Value = _Value;
    get _value(): any { return _Value.one(this._id); }
    set _value(value: any) {
      if (value !== undefined) _Value.set(this._id, value);
      else _Value.delete(this._id);
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _valued(): Set<any> { return _Value.many(this._id); }

    static _datas = _datas;
    public _datas = _datas;
    static _getData = _getData;
    public _getData = _getData;
    get _data(): any {
      const typeIdToUse = this._type;
      if (!typeIdToUse) return undefined;

      const handler = _getData(typeIdToUse);
      if (handler) return handler.byId(this._id);
      return undefined;
    }
    set _data(data: any) {
      if (data instanceof _Deep) throw new Error('data can\'t be a Deep');
      const typeIdToUse = this._type;
      if (!typeIdToUse) {
        throw new Error(`Instance ${this._id} has no ._type, ._data cannot be set via a handler.`);
      }
      const handler = _getData(typeIdToUse);
      if (handler) {
        handler.byId(this._id, data);
      } else {
        throw new Error(`Handler for ._data not found for type '${typeIdToUse}' (instance ${this._id}). Ensure a _Data handler is registered for this type.`);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }
    // </about association>

    // <events>
    static __events = __events;
    static get _events() {
      return __events;
    }
    get _events() {
      return __events;
    }
    // </events>

    // <about instance>
    // parent[key] access for example
    public __source: string | undefined;
    get _source(): string { return this.__source || this.__id; }
    set _source(source: string | undefined) { this.__source = source; }

    // getter setter apply construct
    public __reason: string | undefined;
    get _reason(): string { return this.__reason || this.__id; }
    set _reason(reason: string | undefined) { this.__reason = reason; }
    
    constructor(_id?: string) {
      super();
      if (_id) {
        if (!_ids.has(_id)) _ids.add(_id);
        this.__id = _id;
      } else {
        this.__id = uuidv4();
        _ids.add(this.__id);
        this._created_at = new Date().valueOf();
      }
      // connect to contexts
      this._context;
      if (this._type) this._context = this._type;
    }

    destroy() {
      _ids.delete(this.__id);
      _Type.delete(this.__id);
      _From.delete(this.__id);
      _To.delete(this.__id);
      _Value.delete(this.__id);
      _datas.delete(this.__id);
      _contexts.delete(this.__id);
      _created_ats.delete(this.__id);
      _updated_ats.delete(this.__id);
      // <events>
      this._events.destroy(this.__id);
      // </events>
    }
  }

  return _Deep;
};
