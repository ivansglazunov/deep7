import dotenv from 'dotenv';
import path from 'path';
import { Hasura } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:down-links');

/**
 * Drops computed fields from Hasura metadata
 */
export async function dropComputedFields(hasura: Hasura) {
  debug('🧮 Dropping computed fields...');
  
  // No computed fields to drop since VIEWs handle this automatically
  debug('  ✅ No computed fields to drop - VIEWs handle this automatically');
  
  debug('✅ Computed fields dropped.');
}

/**
 * Drops links-related metadata from Hasura
 */
export async function dropMetadata(hasura: Hasura) {
  debug('🗑️ Dropping metadata...');
  
  // Tables in the order they should be processed
  const allTables = ['links', 'strings', 'numbers', 'functions', '__strings', '__numbers', '__functions', '_strings', '_numbers', '_functions'];
  const roles = ['user', 'me', 'anonymous', 'admin'];
  const permissionTypes = ['select', 'insert', 'update', 'delete'];
  
  // Drop permissions first
  debug('  🔒 Dropping permissions...');
  for (const tableName of allTables) {
    for (const role of roles) {
      for (const permType of permissionTypes) {
        try {
          await hasura.v1({
            type: `pg_drop_${permType}_permission`,
            args: {
              source: 'default',
              table: { schema: 'deep', name: tableName },
              role: role
            }
          });
          debug(`    ✅ Dropped ${permType} permission for ${role} on deep.${tableName}`);
        } catch (error: any) {
          // Ignore "permission does not exist" errors
          if (error?.code !== 'permission-denied') {
            debug(`    ❗ Error dropping ${permType} permission for ${role} on deep.${tableName}: ${error?.message}`);
          }
        }
      }
    }
  }
  
  // Untrack tables from Hasura metadata (reverse order)
  const tablesToUntrack = [
    { schema: 'deep', name: '_functions' },
    { schema: 'deep', name: '_numbers' },
    { schema: 'deep', name: '_strings' },
    { schema: 'deep', name: '__functions' },
    { schema: 'deep', name: '__numbers' },
    { schema: 'deep', name: '__strings' },
    { schema: 'deep', name: 'functions' },  // VIEW
    { schema: 'deep', name: 'numbers' },   // VIEW
    { schema: 'deep', name: 'strings' },   // VIEW
    { schema: 'deep', name: 'links' },
  ];
  
  debug('  🔍 Untracking tables...');
  for (const table of tablesToUntrack) {
    try {
      await hasura.v1({
        type: 'pg_untrack_table',
        args: {
          source: 'default',
          table
        }
      });
      debug(`    ✅ Untracked ${table.schema}.${table.name}`);
    } catch (error: any) {
      // Ignore "table already untracked" errors
      debug(`    ❗ Error untracking table ${table.schema}.${table.name}: ${error?.message}`);
    }
  }
  
  debug('✅ All metadata dropped.');
}

/**
 * Drops all links-related tables and functions
 */
export async function dropTables(hasura: Hasura) {
  debug('🗑️ Dropping tables and functions...');
  
  // Drop INSTEAD OF triggers first
  await hasura.sql(`DROP TRIGGER IF EXISTS strings_instead_of_insert ON deep.strings CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS strings_instead_of_update ON deep.strings CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS strings_instead_of_delete ON deep.strings CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS numbers_instead_of_insert ON deep.numbers CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS numbers_instead_of_update ON deep.numbers CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS numbers_instead_of_delete ON deep.numbers CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS functions_instead_of_insert ON deep.functions CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS functions_instead_of_update ON deep.functions CASCADE;`);
  await hasura.sql(`DROP TRIGGER IF EXISTS functions_instead_of_delete ON deep.functions CASCADE;`);
  debug('  ✅ Dropped INSTEAD OF triggers');
  
  // Drop VIEWs first
  await hasura.sql(`DROP VIEW IF EXISTS deep.functions CASCADE;`);
  debug('  ✅ Dropped functions VIEW');
  
  await hasura.sql(`DROP VIEW IF EXISTS deep.numbers CASCADE;`);
  debug('  ✅ Dropped numbers VIEW');
  
  await hasura.sql(`DROP VIEW IF EXISTS deep.strings CASCADE;`);
  debug('  ✅ Dropped strings VIEW');
  
  // Drop cascade delete trigger
  await hasura.sql(`DROP TRIGGER IF EXISTS cascade_delete_typed_data ON deep.links CASCADE;`);
  debug('  ✅ Dropped cascade delete trigger');
  
  // Drop internal tables
  await hasura.sql(`DROP TABLE IF EXISTS deep.__functions CASCADE;`);
  debug('  ✅ Dropped __functions table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep.__numbers CASCADE;`);
  debug('  ✅ Dropped __numbers table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep.__strings CASCADE;`);
  debug('  ✅ Dropped __strings table');
  
  // Drop links table
  await hasura.sql(`DROP TABLE IF EXISTS deep.links CASCADE;`);
  debug('  ✅ Dropped links table');
  
  // Drop physical tables
  await hasura.sql(`DROP TABLE IF EXISTS deep._functions CASCADE;`);
  debug('  ✅ Dropped _functions table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep._numbers CASCADE;`);
  debug('  ✅ Dropped _numbers table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep._strings CASCADE;`);
  debug('  ✅ Dropped _strings table');
  
  // Drop INSTEAD OF trigger functions
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.strings_instead_of_insert CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.strings_instead_of_update CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.strings_instead_of_delete CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.numbers_instead_of_insert CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.numbers_instead_of_update CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.numbers_instead_of_delete CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.functions_instead_of_insert CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.functions_instead_of_update CASCADE;`);
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.functions_instead_of_delete CASCADE;`);
  debug('  ✅ Dropped INSTEAD OF trigger functions');
  
  // Drop deduplication functions
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.get_or_create_string CASCADE;`);
  debug('  ✅ Dropped get_or_create_string function');
  
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.get_or_create_number CASCADE;`);
  debug('  ✅ Dropped get_or_create_number function');
  
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.get_or_create_function CASCADE;`);
  debug('  ✅ Dropped get_or_create_function function');
  
  // Drop cascade delete function
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.cascade_delete_typed_data CASCADE;`);
  debug('  ✅ Dropped cascade delete function');
  
  // Drop update triggers from all tables
  const allTables = ['links', '__strings', '__numbers', '__functions', '_strings', '_numbers', '_functions'];
  for (const table of allTables) {
    await hasura.sql(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON deep.${table} CASCADE;`);
    debug(`  ✅ Dropped update trigger from ${table}`);
  }
  
  // Drop update function
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.update_updated_at CASCADE;`);
  debug('  ✅ Dropped update_updated_at function');
  
  // Drop sequence
  await hasura.sql(`DROP SEQUENCE IF EXISTS deep.sequence_seq CASCADE;`);
  debug('  ✅ Dropped sequence');
  
  // Drop schema if empty
  await hasura.sql(`DROP SCHEMA IF EXISTS deep CASCADE;`);
  debug('  ✅ Dropped deep schema');
  
  debug('✅ All tables and functions dropped.');
}

/**
 * Main migration function to remove links tables with deduplication architecture
 */
export async function down(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration DOWN with deduplication...');
  
  // Use provided hasura instance or create a new one
  const hasura = customHasura || new Hasura({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!, 
    secret: process.env.HASURA_ADMIN_SECRET!,
  });
  
  try {
    // First remove computed fields
    await dropComputedFields(hasura);

    // Then remove metadata (tracking), as they depend on tables
    await dropMetadata(hasura);

    // Finally drop the tables and functions themselves
    await dropTables(hasura);

    debug('✨ Hasura Links migration DOWN with deduplication completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links DOWN migration:', error);
    debug('❌ Links DOWN Migration failed.');
    return false;
  }
} 