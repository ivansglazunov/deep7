export type Disposer = () => void;

interface HandlerEntry {
  originalHandler: Function;
  effectiveHandler: Function;
  isOnce: boolean;
}

export class _Events {
  // Map<id, Map<eventType, Set<HandlerEntry>>>
  private _registrations: Map<string, Map<string, Set<HandlerEntry>>> = new Map();

  public on(id: string, eventType: string, handler: Function): Disposer {
    const entry: HandlerEntry = {
      originalHandler: handler,
      effectiveHandler: handler,
      isOnce: false,
    };
    this._addRegistration(id, eventType, entry);
    return () => this._removeRegistration(id, eventType, entry);
  }

  public once(id: string, eventType: string, handler: Function): Disposer {
    const entryRef: { current?: HandlerEntry } = {};

    const onceWrapper = (...args: any[]) => {
      if (entryRef.current) {
        this._removeRegistration(id, eventType, entryRef.current);
        entryRef.current = undefined; 
      }
      handler(...args);
    };

    const entry: HandlerEntry = {
      originalHandler: handler,
      effectiveHandler: onceWrapper,
      isOnce: true,
    };
    entryRef.current = entry;
    this._addRegistration(id, eventType, entry);
    
    return () => {
      if (entryRef.current) {
         this._removeRegistration(id, eventType, entryRef.current);
         entryRef.current = undefined;
      }
    };
  }

  private _addRegistration(id: string, eventType: string, entry: HandlerEntry): void {
    if (!this._registrations.has(id)) {
      this._registrations.set(id, new Map());
    }
    const idEvents = this._registrations.get(id)!;

    if (!idEvents.has(eventType)) {
      idEvents.set(eventType, new Set());
    }
    idEvents.get(eventType)!.add(entry);
  }

  private _removeRegistration(id: string, eventType: string, entryToRemove: HandlerEntry): boolean {
    const idEvents = this._registrations.get(id);
    if (!idEvents) return false;
    const handlers = idEvents.get(eventType);
    if (!handlers) return false;

    const deleted = handlers.delete(entryToRemove);
    if (deleted) {
      if (handlers.size === 0) {
        idEvents.delete(eventType);
      }
      if (idEvents.size === 0) {
        this._registrations.delete(id);
      }
    }
    return deleted;
  }

  public off(id: string, eventType: string, handler: Function): boolean {
    const idEvents = this._registrations.get(id);
    if (!idEvents) return false;
    const handlers = idEvents.get(eventType);
    if (!handlers) return false;

    const entriesToRemove: HandlerEntry[] = [];
    for (const entry of handlers) {
        if (entry.originalHandler === handler) {
            entriesToRemove.push(entry);
        }
    }

    if (entriesToRemove.length > 0) {
        entriesToRemove.forEach(entry => this._removeRegistration(id, eventType, entry));
      return true;
    }
    return false;
  }

  public emit(id: string, eventType: string, ...args: any[]): void {
    const idEvents = this._registrations.get(id);
    if (!idEvents) return;
    const handlersSet = idEvents.get(eventType);
    if (!handlersSet) return;

    const handlersToCall = Array.from(handlersSet); 
    for (const entry of handlersToCall) {
      try {
        entry.effectiveHandler(...args);
        } catch (error) {
        console.error(`Error in event handler for id '${id}', event '${eventType}':`, error);
      }
    }
  }

  public destroy(id: string): void {
    this._registrations.delete(id);
  }
}