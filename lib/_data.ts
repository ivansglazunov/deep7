// Implements the _Data class and associated logic for managing typed data storage and retrieval for Deep instances, supporting type-specific data handlers.
import { _Relation } from './_relation';

export class _Data<T> {
  public _byData: Map<T, string>;
  public _byId: Map<string, T>;
  constructor(Collection: any = Map) {
    this._byData = new Collection();
    this._byId = new Collection();
  }
  byData(data: T, id?: string): string | undefined {
    if (arguments.length > 1) {
      const prevId = this._byData.get(data);
      if (prevId) {
        if (prevId != id) {
          throw new Error(`HOW WE CAN SET NEW ID ${id} IF DEEP.DATA INSTANCE ALREADY HAS ASSOCIATED ID ${prevId}?`);
          // this._byId.delete(prevId);
        } else return id;
      }
      this._byId.set(id!, data);
      this._byData.set(data, id!);
      return id;
    }
    return this._byData.get(data);
  }
  byId(id: string, data?: T): T | undefined {
    if (arguments.length > 1) {
      const prevData = this._byId.get(id);
      if (prevData) {
        if (prevData != data) {
          throw new Error(`HOW WE CAN SET NEW DATA ${data} IF DEEP.DATA INSTANCE ALREADY HAS ASSOCIATED DATA ${prevData}?`);
          // this._byData.delete(prevData);
        } else return data;
      }
      this._byData.set(data!, id);
      this._byId.set(id, data!);
      return data;
    }
    return this._byId.get(id);
  }
}
