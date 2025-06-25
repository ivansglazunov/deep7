import http from 'http';
import { NextRequest, NextResponse } from 'next/server';
import { WebSocket, WebSocketServer } from 'ws';
import { proxyGET, proxyPOST, proxySOCKET, proxyOPTIONS, corsHeaders } from 'hasyx/lib/graphql-proxy';
import Debug from 'hasyx/lib/debug';
import { getTokenFromRequest, WsClientsManager } from 'hasyx/lib/auth-next';
import { deeps } from 'deep7/lib/deeps';

const debug = Debug('api:deep7');
const DEEP7_HASYX_DEEP_ID = process?.env?.DEEP7_HASYX_DEEP_ID!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ query?: any, id?: string }> },
): Promise<NextResponse> {
  debug(`GET /api/deep7`);
  const { accessToken, ...auth } = (await getTokenFromRequest(request)) || {} as any;
  const { query = {}, id = auth?.user?.id || DEEP7_HASYX_DEEP_ID } = (await params) || {};
  const deep = deeps.deep(id);
  const result = deep.query(query);
  return NextResponse.json({
    method: 'GET',
    query,
    id,
    auth,
    result: Array.from(result.data).map(link => deep.Storage.serialize(link)),
  }, { headers: corsHeaders });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ query?: any, id?: string }> },
): Promise<NextResponse> {
  debug(`POST /api/deep7`);
  const { accessToken, ...auth } = (await getTokenFromRequest(request)) || {} as any;
  const { query = {}, id = auth?.user?.id || DEEP7_HASYX_DEEP_ID } = (await params) || {};
  return NextResponse.json({
    method: 'POST',
    query,
    id,
    auth,
  }, { headers: corsHeaders });
}

const clients = WsClientsManager('/api/deep7');
export function SOCKET(
  ws: WebSocket,
  request: http.IncomingMessage,
  server: WebSocketServer
): void {
  const clientId = clients.Client(ws as any);
  (async () => {
    const user = await clients.parseUser(request, clientId);
    if (user) {
      debug(`SOCKET /api/deep7 (${clientId}): User parsed and updated.`); 
      ws.send(JSON.stringify({
        method: 'SOCKET',
        type: 'auth_status',
        authenticated: true,
        userId: user.sub,
        token: user 
      }));
    } else {
      debug(`SOCKET /api/deep7 (${clientId}): No valid token found or token is not an object with sub property.`);
      ws.send(JSON.stringify({
        method: 'SOCKET',
        type: 'auth_status',
        authenticated: false
      }));
    }
  })();

  ws.on('message', (data: WebSocket.Data) => {
    debug(`SOCKET /api/auth (${clientId}): Message received:`, data.toString());
    const client = clients.getClient(clientId);
    if (client) {
      ws.send(JSON.stringify({
        method: 'SOCKET',
        type: 'auth_status',
        authenticated: true,
        userId: client.userId,
        token: client.user
      }));
    } else {
      debug(`SOCKET /api/auth (${clientId}): No client found in clients map, unexpected.`);
    }
  });

  ws.on('close', () => {
    debug(`SOCKET /api/auth (${clientId}): Client disconnected.`);
    clients.delete(clientId);
  });

  ws.on('error', (error: Error) => {
    debug(`SOCKET /api/auth (${clientId}): WebSocket connection error:`, error);
    clients.delete(clientId); 
  });
}
