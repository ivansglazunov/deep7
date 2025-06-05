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
  
  try {
    // Log the complete event to debug table
    await hasyx.debug({
      event_type: 'deep_framework_database_event',
      operation: op,
      table_name: `${table.schema}.${table.name}`,
      trigger_name: trigger.name,
      timestamp: new Date().toISOString(),
      event_data: {
        old: data.old,
        new: data.new,
        session_variables: event.session_variables
      },
      message: `Deep Framework database event: ${op} on ${table.name}`
    });

    // Extract relevant information based on operation type
    let recordInfo = {};
    if (op === 'INSERT' && data.new) {
      recordInfo = {
        record_id: data.new.id,
        deep_space_id: data.new._deep,
        record_type: data.new._type,
        record_from: data.new._from,
        record_to: data.new._to,
        record_value: data.new._value
      };
    } else if (op === 'UPDATE' && data.new) {
      recordInfo = {
        record_id: data.new.id,
        deep_space_id: data.new._deep,
        record_type: data.new._type,
        old_data: data.old,
        new_data: data.new
      };
    } else if (op === 'DELETE' && data.old) {
      recordInfo = {
        record_id: data.old.id,
        deep_space_id: data.old._deep,
        record_type: data.old._type,
        deleted_data: data.old
      };
    }

    // Log operation-specific details
    await hasyx.debug({
      event_type: `deep_framework_${op.toLowerCase()}`,
      table_name: table.name,
      ...recordInfo,
      timestamp: new Date().toISOString(),
      message: `Processed ${op} operation on ${table.name} table`
    });

    return {
      success: true,
      operation: {
        type: op,
        table: `${table.schema}.${table.name}`,
        trigger: trigger.name,
        processed_at: new Date().toISOString(),
        ...recordInfo
      }
    };

  } catch (error) {
    // Log error to debug table
    await hasyx.debug({
      event_type: 'deep_framework_event_error',
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      payload: JSON.stringify(payload),
      timestamp: new Date().toISOString(),
      message: 'Error processing Deep Framework database event'
    });

    console.error('Deep Framework event processing error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}); 