import dotenv from 'dotenv';
import path from 'path';
import { Hasura } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:down-links');

/**
 * Drops links-related metadata from Hasura
 */
export async function dropMetadata(hasura: Hasura) {
  debug('🗑️ Dropping metadata...');
  
  // Drop permissions first
  const permissionsToDrop = [
    // User permissions
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'links' }, role: 'user' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'strings' }, role: 'user' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'functions' }, role: 'user' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'numbers' }, role: 'user' } },
    
    // Admin permissions
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'links' }, role: 'admin' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'strings' }, role: 'admin' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'functions' }, role: 'admin' } },
    { type: 'pg_drop_select_permission', args: { source: 'default', table: { schema: 'deep', name: 'numbers' }, role: 'admin' } },
    { type: 'pg_drop_insert_permission', args: { source: 'default', table: { schema: 'deep', name: 'links' }, role: 'admin' } },
    { type: 'pg_drop_update_permission', args: { source: 'default', table: { schema: 'deep', name: 'links' }, role: 'admin' } },
    { type: 'pg_drop_delete_permission', args: { source: 'default', table: { schema: 'deep', name: 'links' }, role: 'admin' } },
  ];
  
  debug('  🔒 Dropping permissions...');
  for (const permission of permissionsToDrop) {
    try {
      await hasura.v1(permission);
      debug(`    ✅ Dropped ${permission.type} for ${permission.args.role} on ${permission.args.table.schema}.${permission.args.table.name}`);
    } catch (error: any) {
      // Ignore "permission does not exist" errors
      if (error?.code === 'permission-denied') {
        debug(`    ❗ Permission does not exist (skipping): ${permission.type} for ${permission.args.role} on ${permission.args.table.schema}.${permission.args.table.name}`);
      } else {
        throw error;
      }
    }
  }
  
  // Untrack tables from Hasura metadata
  const tablesToUntrack = [
    { schema: 'deep', name: 'strings' },
    { schema: 'deep', name: 'numbers' },
    { schema: 'deep', name: 'functions' },
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
  debug('🗑️ Dropping tables...');
  
  // Drop triggers first
  await hasura.sql(`DROP TRIGGER IF EXISTS cascade_delete_typed_data ON deep.links CASCADE;`);
  debug('  ✅ Dropped cascade delete trigger');
  
  // Drop tables in correct order (child tables first)
  await hasura.sql(`DROP TABLE IF EXISTS deep.strings CASCADE;`);
  debug('  ✅ Dropped strings table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep.numbers CASCADE;`);
  debug('  ✅ Dropped numbers table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep.functions CASCADE;`);
  debug('  ✅ Dropped functions table');
  
  await hasura.sql(`DROP TABLE IF EXISTS deep.links CASCADE;`);
  debug('  ✅ Dropped links table');
  
  // Drop functions last
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.cascade_delete_typed_data CASCADE;`);
  debug('  ✅ Dropped cascade delete function');
  
  await hasura.sql(`DROP FUNCTION IF EXISTS deep.update_updated_at CASCADE;`);
  debug('  ✅ Dropped update_updated_at function');
  
  // Drop schema if empty
  await hasura.sql(`DROP SCHEMA IF EXISTS deep CASCADE;`);
  debug('  ✅ Dropped deep schema');
  
  debug('✅ All tables dropped.');
}

/**
 * Main migration function to remove links tables
 */
export async function down(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration DOWN...');
  
  // Use provided hasura instance or create a new one
  const hasura = customHasura || new Hasura({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!, 
    secret: process.env.HASURA_ADMIN_SECRET!,
  });
  
  try {
    // First remove metadata (tracking), as they depend on tables
    await dropMetadata(hasura);

    // Then drop the tables themselves
    await dropTables(hasura);

    debug('✨ Hasura Links migration DOWN completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links DOWN migration:', error);
    debug('❌ Links DOWN Migration failed.');
    return false;
  }
} 