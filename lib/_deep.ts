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

  // Initial associations protection utilities
  const _enableProtection = (): void => {
    _Deep.__protectInitialAssociations = true;
  };

  const _disableProtection = (): void => {
    _Deep.__protectInitialAssociations = false;
    _Deep.__freezeInitialAssociations = false;
    _Deep._initialAssociationIds.clear();
  };

  const _isProtectionEnabled = (): boolean => {
    return _Deep.__protectInitialAssociations;
  };

  const _isProtectionActive = (): boolean => {
    return _Deep.__protectInitialAssociations && _Deep.__freezeInitialAssociations;
  };

  const _unfreezeAssociation = (id: string): void => {
    _Deep._initialAssociationIds.delete(id);
  };

  const _isAssociationFrozen = (id: string): boolean => {
    return _Deep.__protectInitialAssociations && _Deep.__freezeInitialAssociations && _Deep._initialAssociationIds.has(id);
  };

  const _getInitialAssociationsCount = (): number => {
    return _Deep._initialAssociationIds.size;
  };

  class _Deep extends Function {
    // <global context>
    static _Deep = _Deep;
    public _Deep = _Deep;

    // Crutch fields system for event generation
    static __crutchFields = false;
    public __crutchFields = false;

    // Initial associations protection system
    static __protectInitialAssociations = false;  // Master switch for protection mechanism
    public __protectInitialAssociations = false;

    static __freezeInitialAssociations = false;   // Active freeze flag
    public __freezeInitialAssociations = false;

    static _initialAssociationIds = new Set<string>();  // IDs of associations to protect
    public _initialAssociationIds = new Set<string>();

    // Storage event tracking system
    static __isStorageEvent: string | undefined = undefined;
    public __isStorageEvent: string | undefined = undefined;

    // Pending events for deferred emission
    static _pendingEvents: Array<{ type: string; data: any }> = [];

    // Reference to the deep proxy for event emission
    static _deepProxy: any = undefined;
    // </global context>

    // <storagesDiff field>
    public __storagesDiff: { old: Set<string>, new: Set<string> } | undefined;
    // </storagesDiff field>

    // <about association>
    static _ids = _ids;
    get _ids() { return _Deep._ids; }
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
      
      // Prevent cyclic prototype chains
      const targetContext = _contexts.get(typeId);
      if (targetContext && targetContext !== _context) {
        // Check for cycles before setting prototype
        let current = targetContext;
        while (current) {
          if (current === _context) {
            // Cycle detected, don't set prototype
            return;
          }
          current = Object.getPrototypeOf(current);
          if (current === Object.prototype) break;
        }
        Object.setPrototypeOf(_context, targetContext);
      }
    }

    static _Type = _Type;
    public _Type = _Type;
    get _type(): string | undefined {
      const result = _Type.one(this._id);
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _type getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _type getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _type(type: string | undefined) {
      if (typeof type !== 'string' && type !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _type setter received non-string for ${this._id}:`, {
          received: type,
          type: typeof type,
          constructor: (type as any)?.constructor?.name
        });
        throw new Error('type must be id string or undefined');
      }

      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

      if (type !== undefined) {
        _Type.set(this._id, type);
        this._context = type;
      } else {
        _Type.delete(this._id);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _typed(): Set<string> { return _Type.many(this._id); }

    static _From = _From;
    public _From = _From;
    get _from(): string | undefined {
      const result = _From.one(this._id);
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _from getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _from getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _from(from: string | undefined) {
      if (typeof from !== 'string' && from !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _from setter received non-string for ${this._id}:`, {
          received: from,
          type: typeof from,
          constructor: (from as any)?.constructor?.name
        });
        throw new Error('from must be id string or undefined');
      }

      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

      if (from !== undefined) {
        _From.set(this._id, from);
      } else {
        _From.delete(this._id);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _out(): Set<string> { return _From.many(this._id); }

    static _To = _To;
    public _To = _To;
    get _to(): string | undefined {
      const result = _To.one(this._id);
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _to getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _to getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _to(to: string | undefined) {
      if (typeof to !== 'string' && to !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _to setter received non-string for ${this._id}:`, {
          received: to,
          type: typeof to,
          constructor: (to as any)?.constructor?.name
        });
        throw new Error('to must be id string or undefined');
      }

      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

      if (to !== undefined) {
        _To.set(this._id, to);
      } else {
        _To.delete(this._id);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _in(): Set<string> { return _To.many(this._id); }

    static _Value = _Value;
    public _Value = _Value;
    get _value(): string | undefined {
      const result = _Value.one(this._id);
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _value getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _value getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _value(value: string | undefined) {
      if (typeof value !== 'string' && value !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _value setter received non-string for ${this._id}:`, {
          received: value,
          type: typeof value,
          constructor: (value as any)?.constructor?.name
        });
        throw new Error('value must be id string or undefined');
      }

      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

      if (value !== undefined) {
        _Value.set(this._id, value);
      } else {
        _Value.delete(this._id);
      }
      _updated_ats.set(this._id, new Date().valueOf());
    }
    get _valued(): Set<string> { return _Value.many(this._id); }

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

      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

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
    get _source(): string {
      const result = this.__source || this.__id;
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _source getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _source getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _source(source: string | undefined) {
      if (typeof source !== 'string' && source !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _source setter received non-string for ${this._id}:`, {
          received: source,
          type: typeof source,
          constructor: (source as any)?.constructor?.name
        });
        throw new Error('source must be id string or undefined');
      }
      this.__source = source;
    }

    // getter setter apply construct
    public __reason: string | undefined;
    get _reason(): string {
      const result = this.__reason || this.__id;
      if (result !== undefined && typeof result !== 'string') {
        console.error(`🚨 CRITICAL ANOMALY: _reason getter returning non-string for ${this._id}:`, {
          result,
          type: typeof result,
          constructor: (result as any)?.constructor?.name
        });
        throw new Error(`CRITICAL BUG: _reason getter returned ${typeof result} instead of string for ${this._id}`);
      }
      return result;
    }
    set _reason(reason: string | undefined) {
      if (typeof reason !== 'string' && reason !== undefined) {
        console.error(`🚨 CRITICAL ANOMALY: _reason setter received non-string for ${this._id}:`, {
          received: reason,
          type: typeof reason,
          constructor: (reason as any)?.constructor?.name
        });
        throw new Error('reason must be id string or undefined');
      }
      this.__reason = reason;
    }

    // getter setter apply construct
    public __before: string | undefined;
    get _before(): string | undefined {
      const result = this.__before;
      return result;
    }
    set _before(before: string | undefined) {
      this.__before = before;
    }

    // getter setter apply construct
    public __after: string | undefined;
    get _after(): string | undefined {
      const result = this.__after;
      return result;
    }
    set _after(after: string | undefined) {
      this.__after = after;
    }

    // getter setter apply construct
    public __field: string | undefined;
    get _field(): string | undefined {
      const result = this.__field;
      return result;
    }
    set _field(field: string | undefined) {
      this.__field = field;
    }

    public _debug: string | undefined;

    static _deep: _Deep | undefined;
    get _deep(): _Deep { return _Deep._deep || this; }

    constructor(_id?: string) {
      super();

      this.__storagesDiff = undefined;

      if (!_Deep._deep) _Deep._deep = this;

      if (_id) {
        if (typeof _id !== 'string') throw new Error('id must be a string');
        const safeIds = _Deep._ids instanceof _Deep ? _Deep._ids._data : _Deep._ids;
        if (!safeIds.has(_id)) _Deep._ids.add(_id);
        this.__id = _id;
      } else {
        // Try to use existing ID first, then generate new
        const existingId = _getNextExistingId();
        if (existingId) {
          this.__id = existingId;
          _Deep._ids.add(existingId);
        } else {
          this.__id = uuidv4();
          _Deep._ids.add(this.__id);
          this._created_at = new Date().valueOf();
        }
      }

      // Assign sequence number to all associations
      if (!_sequenceNumbers.has(this.__id)) {
        _setSequenceNumber(this.__id, _getNextSequence());
      }

      // Register initial association if protection is enabled but not yet frozen
      if (_Deep.__protectInitialAssociations && !_Deep.__freezeInitialAssociations) {
        _Deep._initialAssociationIds.add(this.__id);
      }

      // if (!!+process?.env?.NEXT_PUBLIC_DEEP_DEBUG! || !!+process?.env?.DEEP_DEBUG!) {
      if (true) {
        const _debug = _debugs.get(this._id);
        if (_debug) this._debug = _debug;
        else _debugs.set(this._id, (this._debug = new Error().stack || ''));
      }

      // connect to contexts
      this._context;
      if (this._type) this._context = this._type;

      // Emit globalConstructed event for new associations
      if (_Deep._deep && _Deep._deep !== this) {
        // Store the event data to emit later
        const eventData = {
          _id: this.__id,
          _reason: 'globalConstructed',
          _source: this.__id,
          _deep: _Deep._deep._id,
          timestamp: new Date().valueOf()
        };

        // Always store for later emission to avoid context access issues
        if (!_Deep._pendingEvents) _Deep._pendingEvents = [];
        _Deep._pendingEvents.push({ type: 'globalConstructed', data: eventData });
      }
    }

    destroy() {
      // Check if this association is protected
      if (_Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(this._id)) {
        throw new Error(`Initial association ${this._id} is frozen and cannot be modified`);
      }

      // Emit global globalDestroyed event on the deep space before cleanup
      if (_Deep._deep && _Deep._deep !== this && _Deep._deepProxy) {
        const eventData = {
          _id: this.__id,
          _reason: 'globalDestroyed',
          _source: this.__id,
          _deep: _Deep._deep._id,
          timestamp: new Date().valueOf()
        };

        // Emit using the stored deep proxy reference
        if (_Deep._deepProxy.events && _Deep._deepProxy.events.globalDestroyed) {
          _Deep._deepProxy._emit(_Deep._deepProxy.events.globalDestroyed._id, eventData);
        }
      }

      // ИСПРАВЛЕНИЕ: Правильное удаление из deep._ids с использованием deep.Set.delete()
      // Создаем Deep instance для передачи в метод delete
      if (_Deep._deepProxy) {
        const elementToDelete = new _Deep._deepProxy(this.__id);
        _Deep._ids.delete(elementToDelete);
      } else {
        // Fallback: прямое удаление из внутреннего Set (если deep.Set еще не инициализирован)
        const safeIds = _Deep._ids instanceof _Deep ? _Deep._ids._data : _Deep._ids;
        if (safeIds && typeof safeIds.delete === 'function') {
          safeIds.delete(this.__id);
        }
      }
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

    // Crutch fields for event generation
    set __type(type: string | undefined) {
      if (_Deep.__crutchFields && _Deep._deepProxy) {
        // Use deep proxy to access high-level field
        const proxy = new _Deep._deepProxy(this._id);
        proxy.type = type ? new _Deep._deepProxy(type) : undefined;
      } else {
        // Direct assignment without events
        this._type = type;
      }
    }

    set __from(from: string | undefined) {
      if (_Deep.__crutchFields && _Deep._deepProxy) {
        // Use deep proxy to access high-level field
        const proxy = new _Deep._deepProxy(this._id);
        proxy.from = from ? new _Deep._deepProxy(from) : undefined;
      } else {
        // Direct assignment without events
        this._from = from;
      }
    }

    set __value(value: string | undefined) {
      if (_Deep.__crutchFields && _Deep._deepProxy) {
        // Use deep proxy to access high-level field
        const proxy = new _Deep._deepProxy(this._id);
        proxy.value = value ? new _Deep._deepProxy(value) : undefined;
      } else {
        // Direct assignment without events
        this._value = value;
      }
    }

    set __data(data: any) {
      if (_Deep.__crutchFields && _Deep._deepProxy) {
        // Use deep proxy to access high-level field
        const proxy = new _Deep._deepProxy(this._id);
        proxy.data = data;
      } else {
        // Direct assignment without events
        this._data = data;
      }
    }

    get _name(): string | undefined {
      return this?._state?._name;
    }

    static _isProtected(id: string): boolean {
      return _Deep.__protectInitialAssociations &&
        _Deep.__freezeInitialAssociations &&
        _Deep._initialAssociationIds.has(id);
    }
    get _protected(): boolean {
      return _Deep._isProtected(this._id);
    }

    get _plain() {
      return {
        _id: this._id,
        _name: this._name,
        _type: this._type,
        _from: this._from,
        _to: this._to,
        _value: this._value,
        _data: this._data,
        _created_at: this._created_at,
        _updated_at: this._updated_at,
        _debug: this._debug,
        ...(this._source ? { _source: this._source } : {}),
        ...(this._reason ? { _reason: this._reason } : {}),
        ...(this._before ? { _before: this._before } : {}),
        ...(this._after ? { _after: this._after } : {}),
        ...(this._field ? { _field: this._field } : {}),
      }
    }

    toJSON() {
      return this._plain;
    }

    // Initial associations protection utilities
    static _enableProtection = _enableProtection;
    public _enableProtection = _enableProtection;
    static _disableProtection = _disableProtection;
    public _disableProtection = _disableProtection;
    static _isProtectionEnabled = _isProtectionEnabled;
    public _isProtectionEnabled = _isProtectionEnabled;
    static _isProtectionActive = _isProtectionActive;
    public _isProtectionActive = _isProtectionActive;
    static _unfreezeAssociation = _unfreezeAssociation;
    public _unfreezeAssociation = _unfreezeAssociation;
    static _isAssociationFrozen = _isAssociationFrozen;
    public _isAssociationFrozen = _isAssociationFrozen;
    static _getInitialAssociationsCount = _getInitialAssociationsCount;
    public _getInitialAssociationsCount = _getInitialAssociationsCount;
  }

  return _Deep;
};
