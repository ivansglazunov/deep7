import dotenv from 'dotenv';
import path from 'path';
import { Hasura } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:down-links');

/**
 * Drop permissions and untrack tables using high-level methods
 */
export async function dropMetadata(hasura: Hasura) {
  debug('🧹 Dropping permissions and untracking links...');

  debug('  🗑️ Dropping permissions...');
  
  // Drop permissions for links VIEW table (all user roles)
  const userRoles = ['user', 'me', 'anonymous'];
  for (const role of userRoles) {
    await hasura.deletePermission({
      schema: 'deep',
      table: 'links',
      operation: 'select',
      role: role
    });
    
    await hasura.deletePermission({
      schema: 'deep',
      table: 'links',
      operation: 'insert',
              role: role
    });
    
    await hasura.deletePermission({
      schema: 'deep',
      table: 'links',
      operation: 'update',
      role: role
    });
    
    await hasura.deletePermission({
      schema: 'deep',
      table: 'links',
      operation: 'delete',
      role: role
    });
  }
  
  debug('  ✅ Permissions dropped.');

  debug('  🗑️ Dropping relationships...');
  
  // Drop all relationships from links table
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'type'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'from'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'to'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'value'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'typed'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'out'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'in'
  });
  
  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'valued'
  });

  await hasura.deleteRelationship({
    schema: 'deep',
    table: 'links',
    name: 'deep'
  });
  
  debug('  ✅ Relationships dropped.');

  debug('  🗑️ Untracking links VIEW table...');
  await hasura.untrackTable({ schema: 'deep', table: 'links' });
  debug('✅ Links VIEW table untracked.');
}

/**
 * Drop all links-related tables, views, functions and triggers using high-level methods
 */
export async function dropTables(hasura: Hasura) {
  debug('🧹 Dropping tables, views, functions and triggers...');
  
  // Drop links VIEW (this will automatically drop the INSTEAD OF triggers)
  await hasura.deleteView({ schema: 'deep', name: 'links' });
  debug('  ✅ Links VIEW dropped.');

  // Drop validation triggers from _links table
  await hasura.deleteTrigger({
    schema: 'deep',
    table: '_links',
    name: 'validate_link_references_trigger'
  });

  await hasura.deleteTrigger({
    schema: 'deep',
    table: '_links',
    name: 'validate_type_rule_trigger'
  });

  debug('  ✅ Validation triggers dropped.');

  // Drop foreign key constraints from _links table
  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__type_fkey'
  });
  
  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__from_fkey'
  });
  
  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__to_fkey'
  });
  
  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__value_fkey'
  });

  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__string_fkey'
  });

  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__number_fkey'
  });

  await hasura.deleteForeignKey({
    schema: 'deep',
    table: '_links',
    name: '_links__function_fkey'
  });
  
  debug('  ✅ Foreign key constraints dropped.');

  // Drop physical _links table
  await hasura.deleteTable({ schema: 'deep', table: '_links' });
  debug('  ✅ Physical _links table dropped.');

  // Drop physical storage tables
  await hasura.deleteTable({ schema: 'deep', table: '_strings' });
  await hasura.deleteTable({ schema: 'deep', table: '_numbers' });
  await hasura.deleteTable({ schema: 'deep', table: '_functions' });
  debug('  ✅ Physical storage tables dropped.');

  // Drop deduplication functions
  await hasura.deleteFunction({ schema: 'deep', name: 'get_or_create_string' });
  await hasura.deleteFunction({ schema: 'deep', name: 'get_or_create_number' });
  await hasura.deleteFunction({ schema: 'deep', name: 'get_or_create_function' });
  debug('  ✅ Deduplication functions dropped.');

  // Drop validation functions
  await hasura.deleteFunction({ schema: 'deep', name: 'validate_link_references' });
  await hasura.deleteFunction({ schema: 'deep', name: 'validate_type_rule' });
  debug('  ✅ Validation functions dropped.');

  // Drop sequence
  await hasura.sql(`DROP SEQUENCE IF EXISTS deep.sequence_seq;`);
  debug('  ✅ Sequence dropped.');

  debug('✅ All tables, views, functions and triggers dropped successfully.');
}

/**
 * Main migration function to remove links with the new architecture
 */
export async function down(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration DOWN with new architecture...');
  
  const hasura = customHasura || new Hasura({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!, 
    secret: process.env.HASURA_ADMIN_SECRET!,
  });
  
  try {
    // First remove metadata (permissions, relationships, tracking)
    await dropMetadata(hasura);

    // Then drop the tables, views, functions and triggers themselves
    await dropTables(hasura);

    await hasura.deleteSchema({ schema: 'deep' });

    debug('✨ Hasura Links migration DOWN with new architecture completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links DOWN migration:', error);
    debug('❌ Links DOWN Migration failed.');
    return false;
  }
} 