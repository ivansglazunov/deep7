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
  const _getDataInstance = (typeId: string | undefined): _Data<any> | undefined => {
    if (!typeId) return undefined;
    if (_datas.has(typeId)) return _datas.get(typeId);
    else {
      const nextTypeId = _Type.one(typeId);
      if (nextTypeId) return _getDataInstance(nextTypeId);
      else return undefined;
    }
  }
  const _getData = (_id: string): any | undefined => {
    const _data = _getDataInstance(_id);
    if (_data) return _data.byId(_id);
    else return undefined;
  }

  const __events = new _Events();

  const _states = new Map<string, any>();
  const _getState = (_id: string): any => {
    let state = _states.get(_id);
    if (!state) _states.set(_id, (state = {}));
    return state;
  }

  const _debugs = new Map<string, string>();

  // Sequential numbering system
  let _sequenceCounter = 0;
  const _sequenceNumbers = new Map<string, number>();

  // Functions for sequence management
  const _getNextSequence = (): number => ++_sequenceCounter;
  const _setSequenceNumber = (id: string, sequence: number): void => {
    _sequenceNumbers.set(id, sequence);
    _sequenceCounter = Math.max(_sequenceCounter, sequence);
  };
  const _getSequenceNumber = (id: string): number => _sequenceNumbers.get(id) || 0;

  // Existing IDs system (for future state restoration)
  let _existingIds: string[] | null = null;
  let _existingIdIndex = 0;
  const _setExistingIds = (ids: string[]): void => {
    _existingIds = ids;
    _existingIdIndex = 0;
  };
  const _getNextExistingId = (): string | null => {
    if (!_existingIds || _existingIdIndex >= _existingIds.length) return null;
    return _existingIds[_existingIdIndex++];
  };

  // Storage catalog system
  const _storages = new Map<string, Map<string, Set<string>>>();

  const _setStorageMarker = (associationId: string, storageId: string, markerId: string): void => {
    if (!_storages.has(associationId)) {
      _storages.set(associationId, new Map());
    }
    const associationStorages = _storages.get(associationId)!;
    if (!associationStorages.has(storageId)) {
      associationStorages.set(storageId, new Set());
    }
    associationStorages.get(storageId)!.add(markerId);
  };

  const _deleteStorageMarker = (associationId: string, storageId: string, markerId: string): void => {
    const associationStorages = _storages.get(associationId);
    if (associationStorages) {
      const markers = associationStorages.get(storageId);
      if (markers) {
        markers.delete(markerId);
        if (markers.size === 0) {
          associationStorages.delete(storageId);
        }
      }
      if (associationStorages.size === 0) {
        _storages.delete(associationId);
      }
    }
  };

  const _getStorageMarkers = (associationId: string, storageId?: string): Map<string, Set<string>> | Set<string> => {
    const associationStorages = _storages.get(associationId);
    if (!associationStorages) {
      return storageId ? new Set() : new Map();
    }
    if (storageId) {
      return associationStorages.get(storageId) || new Set();
    }
    return associationStorages;
  };

  const _getAllStorageMarkers = (): Map<string, Map<string, Set<string>>> => {
    return _storages;
  };

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

    // Sequential numbering system
    static _sequenceNumbers = _sequenceNumbers;
    public _sequenceNumbers = _sequenceNumbers;
    static _getNextSequence = _getNextSequence;
    public _getNextSequence = _getNextSequence;
    static _setSequenceNumber = _setSequenceNumber;
    public _setSequenceNumber = _setSequenceNumber;
    static _getSequenceNumber = _getSequenceNumber;
    public _getSequenceNumber = _getSequenceNumber;
    get _i(): number { 
      return _getSequenceNumber(this._id); 
    }

    // Existing IDs system
    static _setExistingIds = _setExistingIds;
    public _setExistingIds = _setExistingIds;
    static _getNextExistingId = _getNextExistingId;
    public _getNextExistingId = _getNextExistingId;

    // Storage catalog system
    static _storages = _storages;
    public _storages = _storages;
    static _setStorageMarker = _setStorageMarker;
    public _setStorageMarker = _setStorageMarker;
    static _deleteStorageMarker = _deleteStorageMarker;
    public _deleteStorageMarker = _deleteStorageMarker;
    static _getStorageMarkers = _getStorageMarkers;
    public _getStorageMarkers = _getStorageMarkers;
    static _getAllStorageMarkers = _getAllStorageMarkers;
    public _getAllStorageMarkers = _getAllStorageMarkers;

    // <context for proxy>
    static _contexts = _contexts;
    public _contexts = _contexts;

    get _context(): any {
      let _context;
      if (!_contexts.has(this.__id)) {
        const _context = {};
        if (this._id != this._deep._id) Object.setPrototypeOf(_context, this._deep._context);
        _contexts.set(this.__id, _context);
      }
      else _context = _contexts.get(this.__id);
      return _context;
    }
    set _context(typeId: any) {
      let _context;
      if (!_contexts.has(this.__id)) _contexts.set(this.__id, _context = {});
      else _context = _contexts.get(this.__id);
      Object.setPrototypeOf(_context, _contexts.get(typeId));
    }

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
    static _getDataInstance = _getDataInstance;
    public _getDataInstance = _getDataInstance;
    static _getData = _getData;
    public _getData = _getData;
    get _data(): any {
      const typeIdToUse = this._type;
      if (!typeIdToUse) return undefined;

      const handler = _getDataInstance(typeIdToUse);
      if (handler) return handler.byId(this._id);
      return undefined;
    }
    set _data(data: any) {
      if (data instanceof _Deep) throw new Error('data can\'t be a Deep');
      const typeIdToUse = this._type;
      if (!typeIdToUse) {
        throw new Error(`Instance ${this._id} has no ._type, ._data cannot be set via a handler.`);
      }
      const handler = _getDataInstance(typeIdToUse);
      if (handler) {
        handler.byId(this._id, data);
      } else {
        throw new Error(`Handler for ._data not found for type '${typeIdToUse}' (instance ${this._id}). Ensure a _Data handler is registered for this type.`);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }

    static _states = _states;
    public _states = _states;
    static _getState = _getState;
    public _getState = _getState;
    get _state(): any {
      return _getState(this._id);
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
    
    public _debug: string | undefined;

    static _deep: _Deep | undefined;
    get _deep(): _Deep { return _Deep._deep || this; }

    constructor(_id?: string) {
      super();

      if (!_Deep._deep) _Deep._deep = this;

      if (_id) {
        if (typeof _id !== 'string') throw new Error('id must be a string');
        if (!_ids.has(_id)) _ids.add(_id);
        this.__id = _id;
      } else {
        // Try to use existing ID first, then generate new
        const existingId = _getNextExistingId();
        if (existingId) {
          this.__id = existingId;
          _ids.add(existingId);
        } else {
          this.__id = uuidv4();
          _ids.add(this.__id);
          this._created_at = new Date().valueOf();
        }
      }

      // Assign sequence number to all associations
      if (!_sequenceNumbers.has(this.__id)) {
        _setSequenceNumber(this.__id, _getNextSequence());
      }

      if (!!+process?.env?.NEXT_PUBLIC_DEEP_DEBUG! || !!+process?.env?.DEEP_DEBUG!) {
        const _debug = _debugs.get(this._id);
        if (_debug) this._debug = _debug;
        else _debugs.set(this._id, (this._debug = new Error().stack || ''));
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
      this._events.destroy(this.__id);
      _states.delete(this.__id);
      _sequenceNumbers.delete(this.__id);
      _storages.delete(this.__id);
    }
  }

  return _Deep;
};
