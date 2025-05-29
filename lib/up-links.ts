import dotenv from 'dotenv';
import path from 'path';
import { Hasura } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:up-links');

/**
 * Applies the SQL schema for links tables with deduplication architecture
 */
export async function applySQLSchema(hasura: Hasura) {
  debug('📝 Applying SQL schema with deduplication...');
  
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

  // Create physical data storage tables with prefixes
  
  // Physical strings table (_strings) - stores unique string values
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep._strings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      _data text NOT NULL UNIQUE,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
    
    -- Index for fast lookup by data value
    CREATE INDEX IF NOT EXISTS _strings_data_idx ON deep._strings(_data);
  `);
  debug('  ✅ Created _strings physical storage table');

  // Physical numbers table (_numbers) - stores unique number values
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep._numbers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      _data numeric NOT NULL UNIQUE,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
    
    -- Index for fast lookup by data value
    CREATE INDEX IF NOT EXISTS _numbers_data_idx ON deep._numbers(_data);
  `);
  debug('  ✅ Created _numbers physical storage table');

  // Physical functions table (_functions) - stores unique function values
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep._functions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      _data jsonb NOT NULL,
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
    
    -- Index for fast lookup by data value (using jsonb_ops)
    CREATE INDEX IF NOT EXISTS _functions_data_idx ON deep._functions USING gin(_data jsonb_ops);
  `);
  debug('  ✅ Created _functions physical storage table');

  // Create deduplication functions
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.get_or_create_string(input_data text)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing string
      SELECT id INTO result_id FROM deep._strings WHERE _data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._strings (_data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.get_or_create_number(input_data numeric)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing number
      SELECT id INTO result_id FROM deep._numbers WHERE _data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._numbers (_data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.get_or_create_function(input_data jsonb)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing function (exact jsonb match)
      SELECT id INTO result_id FROM deep._functions WHERE _data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._functions (_data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$ LANGUAGE plpgsql;
  `);
  debug('  ✅ Created deduplication functions');

  // Create logical tables with computed fields and triggers

  // Internal strings table with _data_id (double underscore for internal use)
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep.__strings (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      _data_id uuid NOT NULL REFERENCES deep._strings(id),
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
  `);

  // Internal numbers table with _data_id
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep.__numbers (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      _data_id uuid NOT NULL REFERENCES deep._numbers(id),
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
  `);

  // Internal functions table with _data_id
  await hasura.sql(`
    CREATE TABLE IF NOT EXISTS deep.__functions (
      id uuid PRIMARY KEY REFERENCES deep.links(id) ON DELETE CASCADE,
      _data_id uuid NOT NULL REFERENCES deep._functions(id),
      created_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
      updated_at bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    );
  `);

  // Create VIEW for strings with _data field
  await hasura.sql(`
    CREATE OR REPLACE VIEW deep.strings AS
    SELECT 
      s.id,
      s._data_id,
      p._data,
      s.created_at,
      s.updated_at
    FROM deep.__strings s
    JOIN deep._strings p ON s._data_id = p.id;
  `);

  // Create VIEW for numbers with _data field
  await hasura.sql(`
    CREATE OR REPLACE VIEW deep.numbers AS
    SELECT 
      n.id,
      n._data_id,
      p._data,
      n.created_at,
      n.updated_at
    FROM deep.__numbers n
    JOIN deep._numbers p ON n._data_id = p.id;
  `);

  // Create VIEW for functions with _data field
  await hasura.sql(`
    CREATE OR REPLACE VIEW deep.functions AS
    SELECT 
      f.id,
      f._data_id,
      p._data,
      f.created_at,
      f.updated_at
    FROM deep.__functions f
    JOIN deep._functions p ON f._data_id = p.id;
  `);

  // INSTEAD OF triggers for strings VIEW
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.strings_instead_of_insert()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Get or create deduplicated string data
      IF NEW._data IS NOT NULL THEN
        data_id := deep.get_or_create_string(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        RAISE EXCEPTION 'Either _data or _data_id must be provided';
      END IF;
      
      -- Insert into internal table
      INSERT INTO deep.__strings (id, _data_id, created_at, updated_at)
      VALUES (NEW.id, data_id, 
              COALESCE(NEW.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint),
              COALESCE(NEW.updated_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint));
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.strings_instead_of_update()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Handle _data update with deduplication
      IF NEW._data IS NOT NULL AND NEW._data != OLD._data THEN
        data_id := deep.get_or_create_string(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        data_id := OLD._data_id;
      END IF;
      
      -- Update internal table
      UPDATE deep.__strings 
      SET _data_id = data_id,
          updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
      WHERE id = OLD.id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.strings_instead_of_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Delete only from internal table, keep physical data
      DELETE FROM deep.__strings WHERE id = OLD.id;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS strings_instead_of_insert ON deep.strings;
    CREATE TRIGGER strings_instead_of_insert
      INSTEAD OF INSERT ON deep.strings
      FOR EACH ROW EXECUTE FUNCTION deep.strings_instead_of_insert();

    DROP TRIGGER IF EXISTS strings_instead_of_update ON deep.strings;
    CREATE TRIGGER strings_instead_of_update
      INSTEAD OF UPDATE ON deep.strings
      FOR EACH ROW EXECUTE FUNCTION deep.strings_instead_of_update();

    DROP TRIGGER IF EXISTS strings_instead_of_delete ON deep.strings;
    CREATE TRIGGER strings_instead_of_delete
      INSTEAD OF DELETE ON deep.strings
      FOR EACH ROW EXECUTE FUNCTION deep.strings_instead_of_delete();
  `);

  // INSTEAD OF triggers for numbers VIEW
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.numbers_instead_of_insert()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Get or create deduplicated number data
      IF NEW._data IS NOT NULL THEN
        data_id := deep.get_or_create_number(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        RAISE EXCEPTION 'Either _data or _data_id must be provided';
      END IF;
      
      -- Insert into internal table
      INSERT INTO deep.__numbers (id, _data_id, created_at, updated_at)
      VALUES (NEW.id, data_id, 
              COALESCE(NEW.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint),
              COALESCE(NEW.updated_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint));
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.numbers_instead_of_update()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Handle _data update with deduplication
      IF NEW._data IS NOT NULL AND NEW._data != OLD._data THEN
        data_id := deep.get_or_create_number(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        data_id := OLD._data_id;
      END IF;
      
      -- Update internal table
      UPDATE deep.__numbers 
      SET _data_id = data_id,
          updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
      WHERE id = OLD.id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.numbers_instead_of_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Delete only from internal table, keep physical data
      DELETE FROM deep.__numbers WHERE id = OLD.id;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS numbers_instead_of_insert ON deep.numbers;
    CREATE TRIGGER numbers_instead_of_insert
      INSTEAD OF INSERT ON deep.numbers
      FOR EACH ROW EXECUTE FUNCTION deep.numbers_instead_of_insert();

    DROP TRIGGER IF EXISTS numbers_instead_of_update ON deep.numbers;
    CREATE TRIGGER numbers_instead_of_update
      INSTEAD OF UPDATE ON deep.numbers
      FOR EACH ROW EXECUTE FUNCTION deep.numbers_instead_of_update();

    DROP TRIGGER IF EXISTS numbers_instead_of_delete ON deep.numbers;
    CREATE TRIGGER numbers_instead_of_delete
      INSTEAD OF DELETE ON deep.numbers
      FOR EACH ROW EXECUTE FUNCTION deep.numbers_instead_of_delete();
  `);

  // INSTEAD OF triggers for functions VIEW
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.functions_instead_of_insert()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Get or create deduplicated function data
      IF NEW._data IS NOT NULL THEN
        data_id := deep.get_or_create_function(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        RAISE EXCEPTION 'Either _data or _data_id must be provided';
      END IF;
      
      -- Insert into internal table
      INSERT INTO deep.__functions (id, _data_id, created_at, updated_at)
      VALUES (NEW.id, data_id, 
              COALESCE(NEW.created_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint),
              COALESCE(NEW.updated_at, (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint));
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.functions_instead_of_update()
    RETURNS TRIGGER AS $$
    DECLARE
      data_id uuid;
    BEGIN
      -- Handle _data update with deduplication
      IF NEW._data IS NOT NULL AND NEW._data != OLD._data THEN
        data_id := deep.get_or_create_function(NEW._data);
      ELSIF NEW._data_id IS NOT NULL THEN
        data_id := NEW._data_id;
      ELSE
        data_id := OLD._data_id;
      END IF;
      
      -- Update internal table
      UPDATE deep.__functions 
      SET _data_id = data_id,
          updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
      WHERE id = OLD.id;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION deep.functions_instead_of_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Delete only from internal table, keep physical data
      DELETE FROM deep.__functions WHERE id = OLD.id;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS functions_instead_of_insert ON deep.functions;
    CREATE TRIGGER functions_instead_of_insert
      INSTEAD OF INSERT ON deep.functions
      FOR EACH ROW EXECUTE FUNCTION deep.functions_instead_of_insert();

    DROP TRIGGER IF EXISTS functions_instead_of_update ON deep.functions;
    CREATE TRIGGER functions_instead_of_update
      INSTEAD OF UPDATE ON deep.functions
      FOR EACH ROW EXECUTE FUNCTION deep.functions_instead_of_update();

    DROP TRIGGER IF EXISTS functions_instead_of_delete ON deep.functions;
    CREATE TRIGGER functions_instead_of_delete
      INSTEAD OF DELETE ON deep.functions
      FOR EACH ROW EXECUTE FUNCTION deep.functions_instead_of_delete();
  `);

  debug('  ✅ Created internal tables (__strings, __numbers, __functions) and public VIEWs with INSTEAD OF triggers');

  // Add update triggers to internal tables
  const tables = ['links', '__strings', '__numbers', '__functions', '_strings', '_numbers', '_functions'];
  for (const table of tables) {
    await hasura.sql(`
      DROP TRIGGER IF EXISTS update_${table}_updated_at ON deep.${table};
      CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON deep.${table}
        FOR EACH ROW
        EXECUTE FUNCTION deep.update_updated_at();
    `);
    debug(`  ✅ Added update trigger to ${table} table`);
  }

  // Create function for cascade deletion of typed data
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.cascade_delete_typed_data()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Delete from internal tables if exists (but not from physical tables)
      DELETE FROM deep.__strings WHERE id = OLD.id;
      DELETE FROM deep.__numbers WHERE id = OLD.id;
      DELETE FROM deep.__functions WHERE id = OLD.id;
      
      RETURN OLD;
    END;
    $$ language 'plpgsql';
  `);

  // Add cascade delete trigger to links table
  await hasura.sql(`
    DROP TRIGGER IF EXISTS cascade_delete_typed_data ON deep.links;
    CREATE TRIGGER cascade_delete_typed_data
      AFTER DELETE ON deep.links
      FOR EACH ROW
      EXECUTE FUNCTION deep.cascade_delete_typed_data();
  `);
  debug('  ✅ Added cascade delete trigger to links table');

  debug('✅ SQL schema with deduplication applied successfully.');
}

/**
 * Tracks all tables in Hasura metadata
 */
export async function trackTables(hasura: Hasura) {
  debug('🔍 Tracking tables...');
  
  const tablesToTrack = [
    { schema: 'deep', name: 'links' },
    { schema: 'deep', name: 'strings' },  // VIEW
    { schema: 'deep', name: 'functions' }, // VIEW
    { schema: 'deep', name: 'numbers' },  // VIEW
    { schema: 'deep', name: '__strings' }, // Internal table
    { schema: 'deep', name: '__numbers' }, // Internal table
    { schema: 'deep', name: '__functions' }, // Internal table
    { schema: 'deep', name: '_strings' },  // Physical storage
    { schema: 'deep', name: '_numbers' },  // Physical storage
    { schema: 'deep', name: '_functions' } // Physical storage
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
 * Creates computed fields for _data in logical tables
 */
export async function createComputedFields(hasura: Hasura) {
  debug('🧮 Creating computed fields...');
  
  // VIEWs automatically handle computed _data fields, so no additional computed fields needed
  debug('  ✅ VIEWs provide automatic computed _data fields - no additional setup required');
  
  debug('✅ Computed fields created.');
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

  // --- Links to logical typed tables ---
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

  // --- Links to logical typed tables (array relationships) ---
  debug('  📝 Creating array relationship string for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'string',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: 'strings'
          },
          column_mapping: {
            'id': 'id'
          }
        }
      }
    }
  });
  
  debug('  📝 Creating array relationship number for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'number',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: 'numbers'
          },
          column_mapping: {
            'id': 'id'
          }
        }
      }
    }
  });
  
  debug('  📝 Creating array relationship function for table links...');
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'links' },
      name: 'function',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: 'functions'
          },
          column_mapping: {
            'id': 'id'
          }
        }
      }
    }
  });

  // --- Relationships to physical data tables ---
  debug('  📝 Creating object relationship data for table strings...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'strings' },
      name: 'data',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: '_strings'
          },
          column_mapping: {
            '_data_id': 'id'
          }
        }
      }
    }
  });

  debug('  📝 Creating object relationship data for table numbers...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'numbers' },
      name: 'data',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: '_numbers'
          },
          column_mapping: {
            '_data_id': 'id'
          }
        }
      }
    }
  });

  debug('  📝 Creating object relationship data for table functions...');
  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      source: 'default',
      table: { schema: 'deep', name: 'functions' },
      name: 'data',
      using: {
        manual_configuration: {
          remote_table: {
            schema: 'deep',
            name: '_functions'
          },
          column_mapping: {
            '_data_id': 'id'
          }
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

  // Define tables and their columns
  const tablesConfig = {
    'links': {
      userColumns: ['id', '_deep', '_type', '_from', '_to', '_value', 'created_at', 'updated_at'],
      adminColumns: ['id', '_deep', '_type', '_from', '_to', '_value']
    },
    'strings': {  // VIEW - includes _data field
      userColumns: ['id', '_data', 'created_at', 'updated_at'], // _data_id excluded for user/me/anonymous
      adminColumns: ['id', '_data_id', '_data']
    },
    'numbers': {  // VIEW - includes _data field
      userColumns: ['id', '_data', 'created_at', 'updated_at'], // _data_id excluded for user/me/anonymous
      adminColumns: ['id', '_data_id', '_data']
    },
    'functions': {  // VIEW - includes _data field
      userColumns: ['id', '_data', 'created_at', 'updated_at'], // _data_id excluded for user/me/anonymous
      adminColumns: ['id', '_data_id', '_data']
    },
    '__strings': {  // Internal table
      userColumns: [], // Hidden from regular users
      adminColumns: ['id', '_data_id']
    },
    '__numbers': {  // Internal table
      userColumns: [], // Hidden from regular users
      adminColumns: ['id', '_data_id']
    },
    '__functions': {  // Internal table
      userColumns: [], // Hidden from regular users
      adminColumns: ['id', '_data_id']
    },
    '_strings': {  // Physical storage
      userColumns: ['id', '_data', 'created_at', 'updated_at'],
      adminColumns: ['id', '_data']
    },
    '_numbers': {  // Physical storage
      userColumns: ['id', '_data', 'created_at', 'updated_at'],
      adminColumns: ['id', '_data']
    },
    '_functions': {  // Physical storage
      userColumns: ['id', '_data', 'created_at', 'updated_at'],
      adminColumns: ['id', '_data']
    }
  };

  // Drop existing permissions first
  debug('  🗑️ Dropping existing permissions...');
  const rolesToDrop = ['user', 'me', 'anonymous', 'admin'];
  const permissionTypes = ['select', 'insert', 'update', 'delete'];
  
  for (const tableName of Object.keys(tablesConfig)) {
    for (const role of rolesToDrop) {
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
        } catch (error: any) {
          // Ignore "permission does not exist" errors
          if (error?.code !== 'permission-denied') {
            debug(`     Note: Could not drop ${permType} permission for ${role} on ${tableName}`);
          }
        }
      }
    }
  }
  debug('  ✅ Existing permissions dropped.');

  // Apply new permissions
  debug('  📝 Applying new permissions...');

  // User, me, anonymous permissions (read-only, _data_id hidden)
  const readOnlyRoles = ['user', 'me', 'anonymous'];
  for (const role of readOnlyRoles) {
    for (const [tableName, config] of Object.entries(tablesConfig)) {
      // Skip internal tables for regular users
      if (tableName.startsWith('__') || config.userColumns.length === 0) {
        continue;
      }
      
      debug(`     Creating select permission for ${role} on deep.${tableName}...`);
      await hasura.v1({
        type: 'pg_create_select_permission',
        args: {
          source: 'default',
          table: { schema: 'deep', name: tableName },
          role: role,
          permission: {
            columns: config.userColumns,
            filter: {}
          },
          comment: `${role} can see ${tableName} data (excluding _data_id)`
        }
      });
    }
  }

  // Admin permissions (full access)
  for (const [tableName, config] of Object.entries(tablesConfig)) {
    debug(`     Creating select permission for admin on deep.${tableName}...`);
    await hasura.v1({
      type: 'pg_create_select_permission',
      args: {
        source: 'default',
        table: { schema: 'deep', name: tableName },
        role: 'admin',
        permission: {
          columns: [...config.adminColumns, 'created_at', 'updated_at'],
          filter: {}
        },
        comment: `Admin can see all ${tableName} data`
      }
    });

    debug(`     Creating insert permission for admin on deep.${tableName}...`);
    await hasura.v1({
      type: 'pg_create_insert_permission',
      args: {
        source: 'default',
        table: { schema: 'deep', name: tableName },
        role: 'admin',
        permission: {
          check: {},
          columns: config.adminColumns
        },
        comment: `Admin can insert ${tableName}`
      }
    });

    debug(`     Creating update permission for admin on deep.${tableName}...`);
    await hasura.v1({
      type: 'pg_create_update_permission',
      args: {
        source: 'default',
        table: { schema: 'deep', name: tableName },
        role: 'admin',
        permission: {
          check: {},
          columns: config.adminColumns,
          filter: {}
        },
        comment: `Admin can update ${tableName}`
      }
    });

    debug(`     Creating delete permission for admin on deep.${tableName}...`);
    await hasura.v1({
      type: 'pg_create_delete_permission',
      args: {
        source: 'default',
        table: { schema: 'deep', name: tableName },
        role: 'admin',
        permission: {
          filter: {}
        },
        comment: `Admin can delete ${tableName}`
      }
    });
  }

  debug('  ✅ Permissions applied successfully.');
}

/**
 * Main migration function to create links tables with deduplication
 */
export async function up(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration UP with deduplication...');
  
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

    // Create computed fields
    await createComputedFields(hasura);

    // Create relationships
    await createRelationships(hasura);

    // Apply permissions
    await applyPermissions(hasura);

    debug('✨ Hasura Links migration UP with deduplication completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links UP migration:', error);
    debug('❌ Links UP Migration failed.');
    return false;
  }
} 