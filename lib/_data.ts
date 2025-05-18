// Implements the _Data class and associated logic for managing typed data storage and retrieval for Deep instances, supporting type-specific data handlers.
import { _Relation } from './_relation';

export class _Data<T> {
  private _byData: Map<T, string>;
  private _byId: Map<string, T>;
  constructor(Collection: any = Map) {
    this._byData = new Collection();
    this._byId = new Collection();
  }
  byData(data: T, id?: string): string | undefined {
    if (id) {
      const prevId = this._byData.get(data);
      if (prevId) this._byId.delete(prevId);
      this._byId.set(id, data);
      this._byData.set(data, id);
      return id;
    }
    return this._byData.get(data);
  }
  byId(id: string, data?: T): T | undefined {
    if (data) {
      const prevData = this._byId.get(id);
      if (prevData) this._byData.delete(prevData);
      this._byData.set(data, id);
      this._byId.set(id, data);
      return data;
    }
    return this._byId.get(id);
  }
}
