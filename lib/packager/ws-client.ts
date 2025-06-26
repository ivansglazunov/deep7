import jsan from 'jsan';
import Debug from '../debug';
import fs, { link } from 'fs';
import chokidar from 'chokidar';
import { _Memory, SerializedLink, SerializedPackage } from '../packager';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export type Deep = any;

export interface WsMessage {
  method: string;
  clientId?: string;
}

export interface WsMessageLoad extends WsMessage {
  method: 'load';
  requestId: string;
  data: SerializedPackage;
}

export interface WsMessageData extends WsMessage {
  method: 'data';
  requestId?: string;
  data: SerializedPackage;
}

export interface WsMessageSubscribe extends WsMessage {
  method: 'subscribe';
}

export interface WsMessageUnsubscribe extends WsMessage {
  method: 'unsubscribe';
}

export class _WsClient extends _Memory {
  debug: any;
  static _i: number = 0;
  __id?: string;
  get _id(): string | undefined {
    return this.__id;
  }
  set _id(id: string | undefined) {
    this.__id = id;
    this.debug = Debug(`packager:_ws-client:${_WsClient._i++}:${this._id}`);
    this.debug('set _id', id);
  }
  _ws: WebSocket;
  constructor(ws: WebSocket, id?: string) {
    super();
    this._ws = ws;
    this._id = id || undefined;
  }
  listen() {
    this.debug('listen');
    const listener = (message: Buffer | ArrayBuffer | Buffer[]) => {
      const data = jsan.parse(message.toString());
      this.debug('message', data);
      if (data.clientId && !this._id) this._id = data.clientId;
      if (data.method == 'data') {
        this.value = data.data;
        this.notify();
        if (data?.requestId! && this._loading.has(data?.requestId!)) {
          this._loading.get(data?.requestId!)?.(data);
        }
      } else if (data.method == 'load') {
        this.value = data.data;
        this.notify();
        if (data?.requestId! && this._loading.has(data?.requestId!)) {
          this._loading.get(data?.requestId!)?.(data);
        }
        const response: WsMessageData = {
          method: 'data',
          clientId: this._id,
          requestId: data.requestId,
          data: this.value!,
        };
        this.send(response);
      } else if (data.method == 'subscribe') {
      } else if (data.method == 'unsubscribe') {
      } else throw new Error('Unknown method');
    };
    this._ws.on('message', listener);
    return () => {
      this._ws.removeListener('message', listener);
    };
  }
  send(data: WsMessage) {
    this.debug('send', data);
    console.log(this.value, new Error().stack);
    this._ws.send(jsan.stringify(data));
  }
  async save(object: SerializedPackage): Promise<void> {
    this.debug('save', object);
    const data: WsMessageData = {
      method: 'data',
      clientId: this._id,
      requestId: uuidv4(),
      data: object,
    };
    this.send(data);
    this.value = object;
    this.notify();
  }
  public _loading = new Map<string, (data: WsMessageData) => void>();
  async load(): Promise<SerializedPackage> {
    this.debug('load');
    const data: WsMessageLoad  = {
      method: 'load',
      clientId: this._id,
      requestId: uuidv4(),
      data: this.value!,
    };
    this.send(data);
    return new Promise((resolve) => {
      this._loading.set(data.requestId, (data: WsMessageData) => {
        this._loading.delete(data.requestId!);
      });
    });
  }
  _notifies: ((object: SerializedPackage) => void)[] = [];
  async notify(): Promise<void> {
    this.debug(`notifying`);
    const object = this.value;
    if (object) {
      for (const notify of this._notifies) await notify(object);
    }
  }
  _watcher: any = null;
  async subscribe(callback: (object: SerializedPackage) => void): Promise<() => void> {
    this.debug('subscribe');
    if (!this._id) throw new Error('clientId is not set, subscribe request received');
    if (!this._watcher) {
      const data: WsMessageSubscribe = {
        method: 'subscribe',
        clientId: this._id,
      };
      this.send(data);
      this._watcher = callback;
    }
    this._notifies.push(callback);
    return () => {
      this.debug('unsubscribe');
      this._notifies = this._notifies.filter((notify) => notify !== callback);
      if (this._notifies.length == 0) {
        this._watcher = undefined;
      }
    };
  }
  async upsert(link: SerializedLink): Promise<void> {
    this.debug('upsert', link.id);
    if (!this._id) throw new Error('clientId is not set, upsert request received');
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data[existsIndex] = link;
    else object.data.push(link);
    const data: WsMessageData = {
      method: 'data',
      clientId: this._id,
      data: object,
    };
    this.send(data);
    this.notify();
  }
  async delete(link: SerializedLink): Promise<void> {
    this.debug('delete', link.id);
    if (!this._id) throw new Error('clientId is not set, delete request received');
    const object: any = this.value;
    const existsIndex = object.data.findIndex((l) => l.id === link.id);
    if (existsIndex != -1) object.data.splice(existsIndex, 1);
    const data: WsMessageData = {
      method: 'data',
      clientId: this._id,
      data: object,
    };
    this.send(data);
    this.notify();
  }
}

export function newPackagerWsClient(deep: Deep) {
  const debug = Debug(`packager:ws-client:${deep._id}`);

  const WsClient = deep.Storage.WsClient = new deep.Storage();

  WsClient.effect = async function (lifestate, args: [{
    ws: WebSocket;
    clientId: string;
    query?: any;
    memory?: _Memory;
    data?: any;
    subscribe?: boolean;
    package?: any;
    dependencies?: Record<string, string>;
  }]) {
    const storage = this;
    if (lifestate == deep.Constructed) {
      storage.state.errors = [];
      this.on(deep.events.error, (error) => {
        if (!storage.state.errors.includes(error)) storage.state.errors.push(error);
      });
      debug('constructed', storage._id);
      if (typeof args?.[0] != 'object') throw new Error('Memory must be an plain options object');
      if (!args?.[0]?.ws) throw new Error('WebSocket instance is required');
      if (args[0]?.clientId) {
        if (typeof args?.[0]?.clientId != 'string') throw new Error('clientId must be a string');
      }
      if (!(args?.[0]?.ws instanceof WebSocket)) throw new Error('WebSocket instance is required');

      const {
        ws,
        clientId,
        query,
        memory = new _WsClient(ws, clientId),
        data,
        subscribe = true,
        package: pckg,
        dependencies,
      } = args[0];
      storage.processMemory(memory);
      storage.processData(data);
      storage.processSubscribe(subscribe);
      storage.processPackage(pckg);
      storage.processDependencies(dependencies);

      storage.onUpsert((link) => memory.upsert(link));
      storage.onDelete((link) => memory.delete(link));
      storage.onLoad(() => memory.load());

    } else if (lifestate == deep.Mounting) {
      debug('mounting', storage._id);
      storage.state._memory.listen();
      storage.state._resubscribe = async () => {
        if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();
        const initialData = storage.serializeData();
        storage.memory.value = initialData;
        // Apply initial data to ids
        if (initialData?.data?.length) {
          storage.patch(initialData);
        }
        storage.memory.load();
        delete storage.errors; // clear errors
        if (storage.state._subscribe) storage.state._memory_unsubscribe = await storage.memory.subscribe(async (object) => {
          debug('🔨 deep.Storage.Memory subscribe object', object);
          storage.deserializePackage(object);
          delete storage.errors;
          storage.patch(object);
        });
        return preloaded;
      };

      const preloaded = await storage.state?._resubscribe();
      await storage.refreshData(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Updating) {
      debug('updating', storage._id);
      if (args[0]?.data) storage.processData(args[0]?.data);
      if (typeof args[0]?.subscribe == 'boolean') storage.processSubscribe(args[0].subscribe);
      if (args[0]?.package) storage.processPackage(args[0].package);
      if (args[0]?.dependencies) storage.processDependencies(args[0]?.dependencies);
      if (args?.[0]?.clientId) throw new Error('clientId cannot be changed');
      if (args[0]?.query) storage.state._memory.query = args[0]?.query;

      const preloaded = await storage.state?._resubscribe();
      await storage.refreshData(preloaded);
      storage.mounted();
    } else if (lifestate == deep.Mounted) {
      debug('mounted', storage._id);

    } else if (lifestate == deep.Unmounting) {
      debug('unmounting', storage._id);
      if (storage.state._memory_unsubscribe) storage.state._memory_unsubscribe();
      storage.forgotData();
      storage.processUtilization(); // TODO check
      storage.unmounted();
    } else if (lifestate == deep.Unmounted) {
      debug('unmounted', storage._id);
    } else if (lifestate == deep.Destroyed) {
      debug('destroyed', storage._id);
      storage.processUtilization(); // TODO check
    }
  };
} 