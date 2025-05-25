# Hasyx Deep Storage API

Hasyx Deep Storage provides seamless synchronization between Deep Framework associations and Hasura database, enabling persistent storage and real-time synchronization across multiple clients.

## 🎯 Current Implementation Status

### ✅ **Phase 1: Primary Synchronization (IMPLEMENTED)**

**Core API Available:**

### 1. `newHasyxDeep()` - Create New Deep Space ✅
Creates a new Deep space with automatic database synchronization.

### 2. `loadHasyxDeep()` - Load Dump from Database ✅
Loads association data from an existing Deep space in the database.

### 3. `newHasyxDeep()` with dump - Restore Deep Space ✅
Creates a Deep space from previously loaded dump data.

### ⚠️ **Phase 2: Real-Time Synchronization (PLANNED)**

**The following features are planned but NOT yet implemented:**
- 🔄 Local changes → Database sync (live tracking of association changes)
- 🔄 Database changes → Local sync (via `hasyx.subscribe`)
- 🔄 Multi-client real-time synchronization
- 🔄 Conflict resolution for concurrent changes

---

## 📚 **Phase 1 API Reference (Currently Available)**

### newHasyxDeep(options) → Deep

Creates a new Deep space with Hasyx synchronization enabled.

**Parameters:**
- `options.hasyx` - Hasyx client instance (required)
- `options.dump` - Optional: Array of associations to restore (from `loadHasyxDeep`)
- `options.Deep` - Optional: Custom Deep class
- `options._Deep` - Optional: Custom _Deep class

**Returns:**
- Deep instance with `.storage.promise` for sync completion tracking

**Automatic Type Marking:**
When created, automatically marks these types for database sync:
- `deep.String` - All string instances sync automatically
- `deep.Number` - All number instances sync automatically  
- `deep.Function` - All function instances sync automatically

**Example:**
```typescript
import { newHasyxDeep } from 'deep7/lib/storage-hasyx';
import { Hasyx } from 'hasyx';

const hasyx = new Hasyx(apolloClient, generator);

// Create synchronized Deep space
const deep = newHasyxDeep({ hasyx });

// Create associations (auto-sync due to type marking)
const user = new deep();
const name = new deep.String("John Doe");  // ✅ Auto-syncs to database
const age = new deep.Number(30);           // ✅ Auto-syncs to database

// Set relationships
user.value = name;

// Wait for complete synchronization
await deep.storage.promise;
// Now database contains all associations with _deep = deep._id
```

### loadHasyxDeep(options) → Promise<Array>

Loads association data from an existing Deep space.

**Parameters:**
- `options.hasyx` - Hasyx client instance (required)
- `options.id` - Deep space ID to load (required)

**Returns:**
- Promise resolving to array of association objects with structure:
  ```typescript
  {
    id: string,
    _i: number,
    _type?: string,
    _from?: string, 
    _to?: string,
    _value?: string,
    string?: { value: string },
    number?: { value: number },
    function?: { value: string }
  }
  ```

**Example:**
```typescript
// Load existing space data
const dump = await loadHasyxDeep({ 
  hasyx, 
  id: 'existing-deep-space-id' 
});

console.log(`Loaded ${dump.length} associations`);

// Find specific associations
const stringData = dump.filter(item => item.string?.value);
const relationships = dump.filter(item => item._value);
```

### Restore Deep Space from Dump

**Example:**
```typescript
// Load existing space
const dump = await loadHasyxDeep({ hasyx, id: existingSpaceId });

// Create new space from dump
const restoredDeep = newHasyxDeep({ hasyx, dump });

// All original associations are restored with original IDs
// Including typed data (strings, numbers, functions)
// Including relationships (_type, _from, _to, _value)

// Access restored data
const stringAssociations = Array.from(restoredDeep.String.typed);
const numberAssociations = Array.from(restoredDeep.Number.typed);
```

---

## 🗄️ **Database Schema**

### Core Tables

**deep_links** - Main associations table:
```sql
CREATE TABLE deep.links (
  id UUID PRIMARY KEY,
  _deep UUID NOT NULL,           -- Deep space isolation
  _i BIGINT NOT NULL,           -- Sequence within space
  _type UUID,                   -- Link to type association
  _from UUID,                   -- Link to source association  
  _to UUID,                     -- Link to target association
  _value UUID,                  -- Link to value association
  created_at BIGINT NOT NULL,   -- Unix timestamp in milliseconds
  updated_at BIGINT NOT NULL    -- Unix timestamp in milliseconds
);
```

**deep_strings** - String typed data:
```sql
CREATE TABLE deep.strings (
  id UUID PRIMARY KEY,          -- References deep.links.id
  _data TEXT                    -- String value
);
```

**deep_numbers** - Number typed data:
```sql
CREATE TABLE deep.numbers (
  id UUID PRIMARY KEY,          -- References deep.links.id
  _data NUMERIC                 -- Number value
);
```

**deep_functions** - Function typed data:
```sql
CREATE TABLE deep.functions (
  id UUID PRIMARY KEY,          -- References deep.links.id
  _data TEXT                    -- Serialized function code
);
```

---

## 💡 **Usage Patterns**

### Basic Entity Creation
```typescript
// Create semantic entities
const User = new deep();
const user = new User();
const userName = new deep.String("Alice");

// Build relationships
user.type = User;
user.value = userName;

// Wait for sync (auto-enabled due to type marking)
await deep.storage.promise;
```

### Working with Collections
```typescript
// Create related entities
const post = new deep();
const author = user; // From previous example

post.from = author; // "post is from author"

// Access relationships
const postAuthor = post.from;   // Gets author
const userPosts = author.out;   // Gets all posts from this author
```

### Loading and Restoring
```typescript
// Save reference to space ID
const spaceId = deep._id;

// Later session - restore the space
const dump = await loadHasyxDeep({ hasyx, id: spaceId });
const restoredDeep = newHasyxDeep({ hasyx, dump });

// All data and relationships restored
```

---

## 🔄 **Promise Completion Tracking**

### Association-Level Promises
```typescript
const user = new deep();
const name = new deep.String("John");

// Wait for specific association sync
await user.promise;  // ❌ NOT IMPLEMENTED - planned for Phase 2
await name.promise;  // ❌ NOT IMPLEMENTED - planned for Phase 2
```

### Storage-Level Promises
```typescript
// Wait for all pending sync operations
await deep.storage.promise;  // ✅ IMPLEMENTED
```

---

## 🚫 **Phase 2 Features (NOT YET IMPLEMENTED)**

The following features are documented for future implementation but are **NOT currently available:**

### Live Change Tracking
```typescript
// ❌ NOT IMPLEMENTED - These changes don't auto-sync yet
const user = new deep();
await deep.storage.promise; // Initial sync complete

// These changes are NOT tracked/synced automatically:
user.type = SomeType;        // ❌ Change not synced
user.from = someOther;       // ❌ Change not synced  
const newName = new deep.String("Bob");  // ❌ New association not synced
user.value = newName;        // ❌ Change not synced
```

### External Change Subscription
```typescript
// ❌ NOT IMPLEMENTED - No external change detection yet
// No hasyx.subscribe integration
// No multi-client synchronization
// No conflict resolution
```

### Individual Promise Tracking
```typescript
// ❌ NOT IMPLEMENTED - Association-level promises
await association.promise;  // ❌ Not available yet
```

---

## 🧪 **Testing**

Current test coverage focuses on Phase 1 functionality:

✅ **Implemented Tests:**
- Create new Deep space and sync to database
- Load dump from existing Deep space
- Restore Deep space from dump
- Automatic type marking (String, Number, Function)
- Promise completion tracking for initial sync

⏸️ **Skipped Tests (Phase 2):**
- Real-time change tracking  
- External change subscription
- Multi-client synchronization
- Individual association promises

---

## 📋 **Next Steps (Phase 2 Planning)**

When implementing Phase 2 real-time synchronization:

1. **Local Change Detection:**
   - Event listeners for association changes
   - Batch change operations
   - Individual promise resolution

2. **External Change Subscription:**
   - `hasyx.subscribe` integration
   - Change application without sync loops
   - Proper `_source`/`_reason` handling

3. **Multi-Client Support:**
   - Concurrent change handling
   - Conflict resolution strategies
   - Eventually consistent synchronization

**Current API provides the foundation for persistent Deep Framework applications with seamless database integration. Phase 2 will add real-time synchronization for live collaborative features.** 