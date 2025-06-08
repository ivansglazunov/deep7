import { NextResponse } from 'next/server';
import { hasyxEvent, HasuraEventPayload } from 'hasyx/lib/events';
import { createApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { Hasyx } from 'hasyx';
import schema from '../../../../public/hasura-schema.json';

// Create admin hasyx client
const apolloClient = createApolloClient({
  url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!,
  secret: process.env.HASURA_ADMIN_SECRET!,
});
const hasyx = new Hasyx(apolloClient, Generator(schema));

/**
 * Handler for Deep Framework database events
 * Processes events from deep__links, deep__strings, deep__numbers, deep__functions tables
 * Logs all events to debug table using hasyx.debug
 */
export const POST = hasyxEvent(async (payload: HasuraEventPayload) => {
  const { event, table, trigger } = payload;
  const { op, data } = event;
  // Extract relevant information based on operation type

  if (op === 'INSERT' && data.new) {
  } else if (op === 'UPDATE' && data.new) {
  } else if (op === 'DELETE' && data.old) {
  }

  console.log('🟢 event', JSON.stringify(event, null, 2));
  return {
    success: true,
  };
  
  return NextResponse.json(
    { 
      success: false, 
      error: 'Unexpected',
      timestamp: Date.now()
    },
    { status: 500 }
  );
}); 