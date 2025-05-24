import dotenv from 'dotenv';
import path from 'path';
import { Hasura } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:up-links');

/**
 * Applies the SQL schema for links tables
 */
export async function applySQLSchema(hasura: Hasura) {
  debug('📝 Applying SQL schema...');
  
  // Create schema if not exists
  await hasura.sql(`CREATE SCHEMA IF NOT EXISTS deep;`);
  debug('  ✅ Created deep schema');
  
  // Create sequence for _i column
  await hasura.sql(`
    CREATE SEQUENCE IF NOT EXISTS deep.sequence_seq;
  `);
  debug('  ✅ Created sequence for _i column');
  
  // Create or replace update_updated_at function for BIGINT timestamps
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Set updated_at to current timestamp as BIGINT (milliseconds since epoch)
      IF NEW.updated_at = OLD.updated_at THEN
        NEW.updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
      END IF;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  debug('  ✅ Created update_updated_at function for BIGINT timestamps');

  // Create links table with _i sequence column and _deep field for space isolation
  await hasura.sql(`
    -- Create links table first as it's the parent table
    CREATE TABLE IF NOT EXISTS deep.links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      _deep uuid NOT NULL,  -- Deep space isolation key
      _i bigint NOT NULL DEFAULT nextval('deep.sequence_seq'),
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      _type uuid,
      _from uuid,
      _to uuid,
      _value uuid,
      CONSTRAINT links_type_fkey FOREIGN KEY (_type) REFERENCES deep.links(id) ON DELETE SET NULL,
      CONSTRAINT links_from_fkey FOREIGN KEY (_from) REFERENCES deep.links(id) ON DELETE SET NULL,
      CONSTRAINT links_to_fkey FOREIGN KEY (_to) REFERENCES deep.links(id) ON DELETE SET NULL,
      CONSTRAINT links_value_fkey FOREIGN KEY (_value) REFERENCES deep.links(id) ON DELETE SET NULL
    );
    
    -- Add index for _deep field for efficient space-based queries
    CREATE INDEX IF NOT EXISTS links_deep_idx ON deep.links(_deep);
  `);
  debug('  ✅ Created links table with _i column and BIGINT timestamps');

  // Create strings table WITHOUT _i sequence column
  await hasura.sql(`
    -- Create strings table with foreign key to links (no _i field)
    CREATE TABLE IF NOT EXISTS deep.strings (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      _data text NOT NULL
    );
  `);
  debug('  ✅ Created strings table without _i column, with BIGINT timestamps');

  // Create numbers table WITHOUT _i sequence column
  await hasura.sql(`
    -- Create numbers table with foreign key to links (no _i field)
    CREATE TABLE IF NOT EXISTS deep.numbers (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      _data numeric NOT NULL
    );
  `);
  debug('  ✅ Created numbers table without _i column, with BIGINT timestamps');

  // Create functions table WITHOUT _i sequence column
  await hasura.sql(`
    -- Create functions table with foreign key to links (no _i field)
    CREATE TABLE IF NOT EXISTS deep.functions (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      _data jsonb NOT NULL
    );
  `);
  debug('  ✅ Created functions table without _i column, with BIGINT timestamps');

  // Add update trigger to links table
  await hasura.sql(`
    DROP TRIGGER IF EXISTS update_links_updated_at ON deep.links;
    CREATE TRIGGER update_links_updated_at
      BEFORE UPDATE ON deep.links
      FOR EACH ROW
      EXECUTE FUNCTION deep.update_updated_at();
  `);
  debug('  ✅ Added trigger to links table');

  // Add update trigger to strings table
  await hasura.sql(`
    DROP TRIGGER IF EXISTS update_strings_updated_at ON deep.strings;
    CREATE TRIGGER update_strings_updated_at
      BEFORE UPDATE ON deep.strings
      FOR EACH ROW
      EXECUTE FUNCTION deep.update_updated_at();
  `);
  debug('  ✅ Added trigger to strings table');

  // Add update trigger to numbers table
  await hasura.sql(`
    DROP TRIGGER IF EXISTS update_numbers_updated_at ON deep.numbers;
    CREATE TRIGGER update_numbers_updated_at
      BEFORE UPDATE ON deep.numbers
      FOR EACH ROW
      EXECUTE FUNCTION deep.update_updated_at();
  `);
  debug('  ✅ Added trigger to numbers table');

  // Add update trigger to functions table
  await hasura.sql(`
    DROP TRIGGER IF EXISTS update_functions_updated_at ON deep.functions;
    CREATE TRIGGER update_functions_updated_at
      BEFORE UPDATE ON deep.functions
      FOR EACH ROW
      EXECUTE FUNCTION deep.update_updated_at();
  `);
  debug('  ✅ Added trigger to functions table');

  debug('✅ SQL schema applied successfully.');
}

/**
 * Tracks all tables in Hasura metadata
 */
export async function trackTables(hasura: Hasura) {
  debug('🔍 Tracking tables...');
  
  const tablesToTrack = [
    { schema: 'deep', name: 'links' },
    { schema: 'deep', name: 'strings' },
    { schema: 'deep', name: 'functions' },
    { schema: 'deep', name: 'numbers' }
  ];

  for (const table of tablesToTrack) {
    debug(`  📝 Tracking table ${table.schema}.${table.name}...`);
    await hasura.v1({
      type: 'pg_track_table',
      args: {
        source: 'default',
        schema: table.schema,
        name: table.name
      }
    });
  }
  
  debug('✅ Table tracking complete.');
}

/**
 * Creates relationships between tables
 */
export async function createRelationships(hasura: Hasura) {
  debug('🔗 Creating relationships...');

  // --- Links self-relationships ---
  // Creating object relationships (one-to-one)
  debug('  📝 Creating object relationship type for table links...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'type',
      using: {
        foreign_key_constraint_on: '_type'
      }
    }
  });
  
  debug('  📝 Creating object relationship from for table links...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'from',
      using: {
        foreign_key_constraint_on: '_from'
      }
    }
  });
  
  debug('  📝 Creating object relationship to for table links...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'to',
      using: {
        foreign_key_constraint_on: '_to'
      }
    }
  });
  
  debug('  📝 Creating object relationship value for table links...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'value',
      using: {
        foreign_key_constraint_on: '_value'
      }
    }
  });

  // Creating array relationships (one-to-many)
  debug('  📝 Creating array relationship typed for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'typed',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'links'
          },
          column: '_type'
        }
      }
    }
  });
  
  debug('  📝 Creating array relationship in for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'in',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'links'
          },
          column: '_to'
        }
      }
    }
  });
  
  debug('  📝 Creating array relationship out for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'out',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'links'
          },
          column: '_from'
        }
      }
    }
  });
  
  debug('  📝 Creating array relationship valued for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'valued',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'links'
          },
          column: '_value'
        }
      }
    }
  });

  // --- Links to child tables ---
  // Link from strings to links
  debug('  📝 Creating object relationship link for table strings...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'strings' },
      name: 'link',
      using: {
        foreign_key_constraint_on: 'id'
      }
    }
  });
  
  // Link from numbers to links
  debug('  📝 Creating object relationship link for table numbers...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'numbers' },
      name: 'link',
      using: {
        foreign_key_constraint_on: 'id'
      }
    }
  });
  
  // Link from functions to links
  debug('  📝 Creating object relationship link for table functions...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'functions' },
      name: 'link',
      using: {
        foreign_key_constraint_on: 'id'
      }
    }
  });

  // --- Links to child tables (array relationships) ---
  // Link from links to strings
  debug('  📝 Creating array relationship string for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'string',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'strings'
          },
          column: 'id'
        }
      }
    }
  });
  
  // Link from links to numbers
  debug('  📝 Creating array relationship number for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'number',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'numbers'
          },
          column: 'id'
        }
      }
    }
  });
  
  // Link from links to functions
  debug('  📝 Creating array relationship function for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'function',
      using: {
        foreign_key_constraint_on: {
          table: {
            schema: 'deep',
            name: 'functions'
          },
          column: 'id'
        }
      }
    }
  });

  debug('✅ Relationships created.');
}

/**
 * Applies permissions for tables
 */
export async function applyPermissions(hasura: Hasura) {
  debug('🔒 Applying permissions...');

  // Drop existing permissions first
  debug('  🗑️ Dropping existing permissions...');
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
  ];

  for (const permission of permissionsToDrop) {
    const tableName = permission.args.table.name;
    const role = permission.args.role;
    debug(`     Dropping select permission for ${role} on ${permission.args.table.schema}.${tableName}...`);
    try {
      await hasura.v1(permission);
    } catch (error: any) {
      // Ignore "permission does not exist" errors
      if (error?.code === 'permission-denied') {
        debug(`     Note: Permission does not exist, skipping.`);
      } else {
        throw error;
      }
    }
  }
  debug('  ✅ Existing permissions dropped.');

  // Apply new permissions
  debug('  📝 Applying new permissions...');

  // User permissions
  debug('     Creating select permission for user on deep.links...');
  await hasura.v1({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      role: 'user',
      permission: {
        columns: [
          'id',
          '_deep',
          '_type',
          '_from',
          '_to',
          '_value',
          'created_at',
          'updated_at'
        ],
        filter: {}
      },
      comment: 'Users can see all links data'
    }
  });

  debug('     Creating select permission for user on deep.strings...');
  await hasura.v1({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'strings' },
      role: 'user',
      permission: {
        columns: [
          'id',
          '_data',
          'created_at',
          'updated_at'
        ],
        filter: {}
      },
      comment: 'Users can see all strings data'
    }
  });

  debug('     Creating select permission for user on deep.numbers...');
  await hasura.v1({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'numbers' },
      role: 'user',
      permission: {
        columns: [
          'id',
          '_data',
          'created_at',
          'updated_at'
        ],
        filter: {}
      },
      comment: 'Users can see all numbers data'
    }
  });

  debug('     Creating select permission for user on deep.functions...');
  await hasura.v1({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'functions' },
      role: 'user',
      permission: {
        columns: [
          'id',
          '_data',
          'created_at',
          'updated_at'
        ],
        filter: {}
      },
      comment: 'Users can see all functions data'
    }
  });

  // Admin permissions (full access)
  debug('     Creating select permission for admin on deep.links...');
  await hasura.v1({
    type: 'pg_create_select_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      role: 'admin',
      permission: {
        columns: [
          'id',
          '_deep',
          '_type',
          '_from',
          '_to',
          '_value',
          'created_at',
          'updated_at'
        ],
        filter: {}
      },
      comment: 'Admins can see all links data'
    }
  });

  debug('     Creating insert permission for admin on deep.links...');
  await hasura.v1({
    type: 'pg_create_insert_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      role: 'admin',
      permission: {
        check: {},
        columns: [
          'id',
          '_deep',
          '_type',
          '_from',
          '_to',
          '_value'
        ]
      },
      comment: 'Admins can insert links'
    }
  });

  debug('     Creating update permission for admin on deep.links...');
  await hasura.v1({
    type: 'pg_create_update_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      role: 'admin',
      permission: {
        check: {},
        columns: [
          '_deep',
          '_type',
          '_from',
          '_to',
          '_value'
        ],
        filter: {}
      },
      comment: 'Admins can update links'
    }
  });

  debug('     Creating delete permission for admin on deep.links...');
  await hasura.v1({
    type: 'pg_create_delete_permission',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      role: 'admin',
      permission: {
        filter: {}
      },
      comment: 'Admins can delete links'
    }
  });

  debug('  ✅ Permissions applied successfully.');
}

/**
 * Main migration function to create links tables
 */
export async function up(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration UP...');
  
  // Use provided hasura instance or create a new one
  const hasura = customHasura || new Hasura({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!, 
    secret: process.env.HASURA_ADMIN_SECRET!,
  });
  
  try {
    // Apply SQL schema first
    await applySQLSchema(hasura);

    // Track tables in Hasura
    await trackTables(hasura);

    // Create relationships
    await createRelationships(hasura);

    // Apply permissions
    await applyPermissions(hasura);

    debug('✨ Hasura Links migration UP completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links UP migration:', error);
    debug('❌ Links UP Migration failed.');
    return false;
  }
} 