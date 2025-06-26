import { newDeep } from '..';
import { WebSocketServer, WebSocket } from 'ws';
import { SerializedPackage } from '../packager';
import { v4 as uuidv4 } from 'uuid';
import { _delay } from '../_promise';

it('packager:ws-client', async () => {
  // server side
  const { serverDeep, _server } = await (async () => {
    const serverDeep = newDeep();
    const _server = new WebSocketServer({ port: 8080 });
    const _serverClients = {};
    _server.on('connection', async (_ws) => {
      // on connection we dont known clientId, so we need to send it to the client
      const client = new serverDeep.Package('client', '0.0.0');
      client.A = new serverDeep();
      client.A.value = client.AString = new serverDeep.String('abc');
      const wsClient = new serverDeep.Storage.WsClient({
        ws: _ws,
        clientId: client._id,
        package: client,
      });
      _serverClients[client._id] = wsClient;
      await wsClient.mount();
      expect(wsClient.ids.size).toBe(2);

      _ws.on('close', () => {
        delete _serverClients[client._id];
      });
    });

    return { serverDeep, _server };
  })();

  // client side async delayed mount variant
  const { clientDeep1, client1, _ws1 } = await (async () => {
    const clientDeep1 = newDeep();
    const _ws1 = new WebSocket('ws://localhost:8080');
    const client1 = new clientDeep1.Storage.WsClient({
      ws: _ws1,
      // clientId, // we dont know it yet, it will be sent by the server
      // query // we can't make query here, because we dont know clientId yet

      // query: { // query to subscribe to all links inside the device instance
      //   in: { type: clientDeep1.Contain, from: device1 },
      // },
    });
    await _delay(100);
    await client1.mount();
    // ws.close();
    return { clientDeep1, client1, _ws1 };
  })();

  await _delay(1000);

  _ws1.close();
  _server.close();
});
