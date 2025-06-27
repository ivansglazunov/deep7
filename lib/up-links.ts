import dotenv from 'dotenv';
import path from 'path';
import { Hasura, ColumnType } from 'hasyx/lib/hasura';
import Debug from './debug';

// Initialize debug
const debug = Debug('migration:up-links');

/**
 * Applies the SQL schema for links with the new deduplication architecture
 */
export async function applySQLSchema(hasura: Hasura) {
  debug('📝 Applying new links SQL schema...');
  
  // Create deep schema if not exists
  await hasura.defineSchema({ schema: 'deep' });
  debug('  ✅ Created deep schema');
  
  // Create sequence for _i column
  await hasura.sql(`CREATE SEQUENCE IF NOT EXISTS deep.sequence_seq;`);
  debug('  ✅ Created sequence for _i column');
  
  // Create physical tables for deduplicated values

  // _strings table: stores unique string values
  await hasura.defineTable({
    schema: 'deep',
    table: '_strings',
    id: 'id',
    type: ColumnType.UUID,
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_strings',
    name: 'data',
    type: ColumnType.TEXT,
    postfix: 'NOT NULL UNIQUE',
    comment: 'String data'
  });

  await hasura.sql(`CREATE INDEX IF NOT EXISTS _strings_data_idx ON deep._strings(data);`);
  debug('  ✅ Created _strings physical storage table');

  // _numbers table: stores unique number values
  await hasura.defineTable({
    schema: 'deep',
    table: '_numbers',
    id: 'id',
    type: ColumnType.UUID
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_numbers',
    name: 'data',
    type: ColumnType.NUMERIC,
    postfix: 'NOT NULL UNIQUE',
    comment: 'Number data'
  });

  await hasura.sql(`CREATE INDEX IF NOT EXISTS _numbers_data_idx ON deep._numbers(data);`);
  debug('  ✅ Created _numbers physical storage table');

  // _functions table: stores unique function values
  await hasura.defineTable({
    schema: 'deep',
    table: '_functions',
    id: 'id',
    type: ColumnType.UUID
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_functions',
    name: 'data',
    type: ColumnType.TEXT,
    postfix: 'NOT NULL',
    comment: 'Function data as string'
  });

  await hasura.sql(`CREATE INDEX IF NOT EXISTS _functions_data_idx ON deep._functions(data);`);
  debug('  ✅ Created _functions physical storage table');

  // _objects table: stores unique object values
  await hasura.defineTable({
    schema: 'deep',
    table: '_objects',
    id: 'id',
    type: ColumnType.UUID
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_objects',
    name: 'data',
    type: 'jsonb' as ColumnType,
    postfix: 'NOT NULL UNIQUE',
    comment: 'Object data'
  });

  await hasura.sql(`CREATE INDEX IF NOT EXISTS _objects_data_idx ON deep._objects USING GIN (data);`);
  debug('  ✅ Created _objects physical storage table');

  // Physical _links table that stores actual associations
  await hasura.defineTable({
    schema: 'deep',
    table: '_links',
    id: 'id',
    type: ColumnType.TEXT
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_i',
    type: ColumnType.BIGINT,
    postfix: "NOT NULL DEFAULT nextval('deep.sequence_seq')",
    comment: 'Sequential number'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_deep',
    type: ColumnType.TEXT,
    postfix: 'NOT NULL',
    comment: 'Deep space isolation key'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'type_id',
    type: ColumnType.TEXT,
    comment: 'Link type reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'from_id',
    type: ColumnType.TEXT,
    comment: 'Link from reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'to_id',
    type: ColumnType.TEXT,
    comment: 'Link to reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'value_id',
    type: ColumnType.TEXT,
    comment: 'Link value reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_string',
    type: ColumnType.UUID,
    comment: 'String data reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_number',
    type: ColumnType.UUID,
    comment: 'Number data reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_function',
    type: ColumnType.UUID,
    comment: 'Function data reference'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: '_object',
    type: ColumnType.UUID,
    comment: 'Object data reference'
  });

  // Add timestamp columns with automatic defaults
  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'created_at',
    type: ColumnType.BIGINT,
    postfix: 'NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000',
    comment: 'Creation timestamp (Unix milliseconds)'
  });

  await hasura.defineColumn({
    schema: 'deep',
    table: '_links',
    name: 'updated_at',
    type: ColumnType.BIGINT,
    postfix: 'NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000',
    comment: 'Last update timestamp (Unix milliseconds)'
  });

  // Create foreign key constraints for _links table
  // REMOVED: Foreign key constraints to allow flexible references without strict existence checks
  // Only UUID type validation remains
  
  // await hasura.defineForeignKey({
  //   from: { schema: 'deep', table: '_links', column: 'type_id' },
  //   to: { schema: 'deep', table: '_links', column: 'id' },
  //   on_delete: 'SET NULL'
  // });

  // await hasura.defineForeignKey({
  //   from: { schema: 'deep', table: '_links', column: 'from_id' },
  //   to: { schema: 'deep', table: '_links', column: 'id' },
  //   on_delete: 'SET NULL'
  // });

  // await hasura.defineForeignKey({
  //   from: { schema: 'deep', table: '_links', column: 'to_id' },
  //   to: { schema: 'deep', table: '_links', column: 'id' },
  //   on_delete: 'SET NULL'
  // });

  // await hasura.defineForeignKey({
  //   from: { schema: 'deep', table: '_links', column: 'value_id' },
  //   to: { schema: 'deep', table: '_links', column: 'id' },
  //   on_delete: 'SET NULL'
  // });

  await hasura.defineForeignKey({
    from: { schema: 'deep', table: '_links', column: '_string' },
    to: { schema: 'deep', table: '_strings', column: 'id' },
    on_delete: 'SET NULL'
  });

  await hasura.defineForeignKey({
    from: { schema: 'deep', table: '_links', column: '_number' },
    to: { schema: 'deep', table: '_numbers', column: 'id' },
    on_delete: 'SET NULL'
  });

  await hasura.defineForeignKey({
    from: { schema: 'deep', table: '_links', column: '_function' },
    to: { schema: 'deep', table: '_functions', column: 'id' },
    on_delete: 'SET NULL'
  });

  await hasura.defineForeignKey({
    from: { schema: 'deep', table: '_links', column: '_object' },
    to: { schema: 'deep', table: '_objects', column: 'id' },
    on_delete: 'SET NULL'
  });

  // Add index for _deep field for efficient space-based queries
  await hasura.sql(`CREATE INDEX IF NOT EXISTS _links_deep_idx ON deep._links(_deep);`);
  debug('  ✅ Created _links physical table with all constraints');

  // Create deduplication functions
  await hasura.defineFunction({
    schema: 'deep',
    name: 'get_or_create_string',
    definition: `(input_data text)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing string
      SELECT id INTO result_id FROM deep._strings WHERE data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._strings (data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$`,
    language: 'plpgsql',
    replace: true
  });

  await hasura.defineFunction({
    schema: 'deep',
    name: 'get_or_create_number',
    definition: `(input_data numeric)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing number
      SELECT id INTO result_id FROM deep._numbers WHERE data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._numbers (data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$`,
    language: 'plpgsql',
    replace: true
  });

  await hasura.defineFunction({
    schema: 'deep',
    name: 'get_or_create_function',
    definition: `(input_data text)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing function
      SELECT id INTO result_id FROM deep._functions WHERE data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._functions (data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$`,
    language: 'plpgsql',
    replace: true
  });

  await hasura.defineFunction({
    schema: 'deep',
    name: 'get_or_create_object',
    definition: `(input_data jsonb)
    RETURNS uuid AS $$
    DECLARE
      result_id uuid;
    BEGIN
      -- Try to find existing object
      SELECT id INTO result_id FROM deep._objects WHERE data = input_data;
      
      -- If not found, create new one
      IF result_id IS NULL THEN
        INSERT INTO deep._objects (data) VALUES (input_data) RETURNING id INTO result_id;
      END IF;
      
      RETURN result_id;
    END;
    $$`,
    language: 'plpgsql',
    replace: true
  });
  debug('  ✅ Created deduplication functions');

  // Create VIEW links that presents the API to users
  await hasura.defineView({
    schema: 'deep',
    name: 'links',
    definition: `
    SELECT 
      l.id,
      l._i,
      l._deep,
      l.type_id,
      l.from_id,
      l.to_id,
      l.value_id,
      s.data as string,
      n.data as number,
      f.data as function,
      o.data as object,
      l.created_at,
      l.updated_at
    FROM deep._links l
    LEFT JOIN deep._strings s ON l._string = s.id
    LEFT JOIN deep._numbers n ON l._number = n.id
    LEFT JOIN deep._functions f ON l._function = f.id
    LEFT JOIN deep._objects o ON l._object = o.id
    `
  });

  // Create INSTEAD OF triggers for the links VIEW
  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.links_instead_of_insert()
    RETURNS TRIGGER AS $$
    DECLARE
      string_id uuid;
      number_id uuid;
      function_id uuid;
      object_id uuid;
      final_created_at bigint;
      final_updated_at bigint;
      current_ts bigint;
    BEGIN
      -- Get current Unix timestamp in milliseconds
      current_ts := EXTRACT(EPOCH FROM NOW()) * 1000;
      
      -- Handle string data
      IF NEW.string IS NOT NULL THEN
        string_id := deep.get_or_create_string(NEW.string);
      END IF;
      
      -- Handle number data
      IF NEW.number IS NOT NULL THEN
        number_id := deep.get_or_create_number(NEW.number);
      END IF;
      
      -- Handle function data
      IF NEW.function IS NOT NULL THEN
        function_id := deep.get_or_create_function(NEW.function);
      END IF;
      
      -- Handle object data
      IF NEW.object IS NOT NULL THEN
        object_id := deep.get_or_create_object(NEW.object::jsonb);
      END IF;
      
      -- Handle timestamps - use provided values or default to current timestamp for created_at
      -- For upsert, updated_at should reflect the current operation time during an update.
      final_created_at := COALESCE(NEW.created_at, current_ts);
      final_updated_at := current_ts; -- Always use current_ts for updated_at on insert/update
      
      -- Insert into physical _links table with ON CONFLICT clause.
      -- _i will be set by DEFAULT nextval('deep.sequence_seq') on initial insert.
      INSERT INTO deep._links (
        id, _deep, type_id, from_id, to_id, value_id, 
        _string, _number, _function, _object,
        created_at, updated_at
      ) VALUES (
        NEW.id, NEW._deep, NEW.type_id, NEW.from_id, NEW.to_id, NEW.value_id,
        string_id, number_id, function_id, object_id,
        final_created_at, final_updated_at -- Use final_updated_at for the insert part
      )
      ON CONFLICT (id) DO UPDATE SET
        type_id = EXCLUDED.type_id,
        from_id = EXCLUDED.from_id,
        to_id = EXCLUDED.to_id,
        value_id = EXCLUDED.value_id,
        _string = EXCLUDED._string, -- These EXCLUDED values are the string_id, number_id, function_id
        _number = EXCLUDED._number,
        _function = EXCLUDED._function,
        _object = EXCLUDED._object,
        -- created_at and _i are NOT updated on conflict
        updated_at = EXCLUDED.updated_at; -- Ensure updated_at is set to the EXCLUDED value (which is final_updated_at / current_ts)
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await hasura.sql(`
    CREATE OR REPLACE TRIGGER links_instead_of_insert
      INSTEAD OF INSERT ON deep.links
      FOR EACH ROW EXECUTE FUNCTION deep.links_instead_of_insert();
  `);

  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.links_instead_of_update()
    RETURNS TRIGGER AS $$
    DECLARE
      string_id uuid;
      number_id uuid;
      function_id uuid;
      object_id uuid;
      final_updated_at bigint;
    BEGIN
      -- Handle string data
      IF NEW.string IS NOT NULL THEN
        string_id := deep.get_or_create_string(NEW.string);
      END IF;
      
      -- Handle number data
      IF NEW.number IS NOT NULL THEN
        number_id := deep.get_or_create_number(NEW.number);
      END IF;
      
      -- Handle function data
      IF NEW.function IS NOT NULL THEN
        function_id := deep.get_or_create_function(NEW.function);
      END IF;
      
      -- Handle object data
      IF NEW.object IS NOT NULL THEN
        object_id := deep.get_or_create_object(NEW.object::jsonb);
      END IF;
      
      -- Handle updated_at - use provided value or default to current timestamp
      final_updated_at := COALESCE(NEW.updated_at, EXTRACT(EPOCH FROM NOW()) * 1000);
      
      -- Update the physical _links table
      -- DO NOT update _i column here. It should be immutable after insert.
      UPDATE deep._links SET
        type_id = NEW.type_id,
        from_id = NEW.from_id,
        to_id = NEW.to_id,
        value_id = NEW.value_id,
        _string = string_id,
        _number = number_id,
        _function = function_id,
        _object = object_id,
        updated_at = final_updated_at
      WHERE id = NEW.id AND _deep = NEW._deep;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await hasura.sql(`
    CREATE OR REPLACE TRIGGER links_instead_of_update
      INSTEAD OF UPDATE ON deep.links
      FOR EACH ROW EXECUTE FUNCTION deep.links_instead_of_update();
  `);

  await hasura.sql(`
    CREATE OR REPLACE FUNCTION deep.links_instead_of_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Simply delete from physical _links table
      DELETE FROM deep._links 
      WHERE id = OLD.id AND _deep = OLD._deep;
      
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await hasura.sql(`
    CREATE OR REPLACE TRIGGER links_instead_of_delete
      INSTEAD OF DELETE ON deep.links
      FOR EACH ROW EXECUTE FUNCTION deep.links_instead_of_delete();
  `);

  debug('  ✅ Created links VIEW with INSTEAD OF triggers');

  // Create strict validation functions and triggers for _links table
  // REMOVED: validate_link_references function and trigger - no longer checking existence of referenced links
  // Only validate the type rule (NULL type_id only when id == _deep)
  
  await hasura.defineFunction({
    schema: 'deep',
    name: 'validate_type_rule',
    definition: `()
    RETURNS TRIGGER AS $$
    BEGIN
      -- type_id can only be NULL if id == _deep
      IF NEW.type_id IS NULL AND NEW.id != NEW._deep THEN
        RAISE EXCEPTION 'type_id can only be NULL when id equals _deep. Current id: %, _deep: %', NEW.id, NEW._deep;
      END IF;
      
      RETURN NEW;
    END;
    $$`,
    language: 'plpgsql',
    replace: true
  });

  // Add validation triggers to _links table
  // REMOVED: validate_link_references_trigger - no longer checking existence of referenced links
  
  await hasura.defineTrigger({
    schema: 'deep',
    table: '_links',
    name: 'validate_type_rule_trigger',
    timing: 'BEFORE',
    event: 'INSERT OR UPDATE',
    function_name: 'deep.validate_type_rule',
    replace: true
  });

  debug('  ✅ Created validation triggers for basic type rule checking (no reference existence validation)');

  debug('✅ New links SQL schema applied successfully.');
}

/**
 * Tracks only the links VIEW table in Hasura metadata
 */
export async function trackTables(hasura: Hasura) {
  debug('🔍 Tracking links VIEW table...');
  
  // Track only the links VIEW - physical tables should not be exposed
  await hasura.trackTable({ schema: 'deep', table: 'links' });
  
  debug('✅ Links VIEW table tracking complete.');
}

/**
 * Creates relationships for the links table
 */
export async function createRelationships(hasura: Hasura) {
  debug('🔗 Creating links relationships...');

  // Object relationships (many-to-one) - links pointing to other links
  // Using direct API calls with manual_configuration for self-references

  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'type',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'type_id': 'id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'from',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'from_id': 'id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'to',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'to_id': 'id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_object_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'value',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'value_id': 'id' }
        }
      }
    }
  });

  // Array relationships (one-to-many) - other links pointing to this link
  
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'typed',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'id': 'type_id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'out',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'id': 'from_id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'in',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'id': 'to_id' }
        }
      }
    }
  });

  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'valued',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { 'id': 'value_id' }
        }
      }
    }
  });

  // Deep relationship (same _deep value) - links in same space
  await hasura.v1({
    type: 'pg_create_array_relationship',
    args: {
      table: { schema: 'deep', name: 'links' },
      name: 'deep',
      source: 'default',
      using: {
        manual_configuration: {
          remote_table: { schema: 'deep', name: 'links' },
          column_mapping: { '_deep': '_deep' }
        }
      }
    }
  });

  debug('✅ Links relationships created.');
}

/**
 * Applies permissions for the links table
 */
export async function applyPermissions(hasura: Hasura) {
  debug('🔒 Applying permissions...');

  // All user roles can read, write, and update all fields in links
  const userRoles = ['user', 'me', 'anonymous'];
  const allColumns = ['id', '_i', '_deep', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at'];

  for (const role of userRoles) {
    await hasura.definePermission({
      schema: 'deep',
      table: 'links',
      operation: 'select',
      role: role,
      filter: {},
      columns: allColumns
    });

    await hasura.definePermission({
      schema: 'deep',
      table: 'links',
      operation: 'insert',
      role: role,
      filter: {},
      columns: allColumns
    });

    await hasura.definePermission({
      schema: 'deep',
      table: 'links',
      operation: 'update',
      role: role,
      filter: {},
      columns: allColumns
    });

    await hasura.definePermission({
      schema: 'deep',
      table: 'links',
      operation: 'delete',
      role: role,
      filter: {}
    });

    // Add aggregate permissions
    await hasura.v1({
      type: 'pg_create_select_permission',
      args: {
        table: { schema: 'deep', name: 'links' },
        role: role,
        permission: {
          columns: allColumns,
          filter: {},
          allow_aggregations: true
        }
      }
    });
  }

  debug('  ✅ Permissions applied successfully.');
}

/**
 * Main migration function to create links with the new architecture
 */
export async function up(customHasura?: Hasura) {
  debug('🚀 Starting Hasura Links migration UP with new architecture...');
  
  // Use provided hasura instance or create a new one
  const hasura = customHasura || new Hasura({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!, 
    secret: process.env.HASURA_ADMIN_SECRET!,
  });
  
  try {
    // Ensure default data source exists before any operations
    await hasura.ensureDefaultSource();
    
    // Apply SQL schema first
    await applySQLSchema(hasura);

    // Track only the links VIEW table
    await trackTables(hasura);

    // Create relationships
    await createRelationships(hasura);

    // Apply permissions
    await applyPermissions(hasura);

    debug('✨ Hasura Links migration UP with new architecture completed successfully!');
    return true;
  } catch (error) {
    console.error('❗ Critical error during Links UP migration:', error);
    debug('❌ Links UP Migration failed.');
    return false;
  }
} 