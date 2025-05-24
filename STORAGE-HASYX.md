# Deep Framework Hasyx Storage Integration Plan

## Overview

This document describes the planned integration between Deep Framework's storage system and Hasura GraphQL database through the Hasyx client. This builds upon the core storage mechanics described in [STORAGES.md](./STORAGES.md).

## Key Requirements

### 1. Correct Storage API
Storage operations must use Deep instances, not strings:
```typescript
// ✅ CORRECT
association.store(deep.storage, marker);

// ❌ WRONG  
association.store('database', marker);
```

### 2. Auto-marking in newHasyxDeep()
`newHasyxDeep()` must automatically mark basic types for synchronization:

```typescript
const deep = await newHasyxDeep(hasyxClient);

// Automatically applied:
deep.store(deep.storage, deep.storageMarkers.oneTrue);           // Deep itself
deep.String.store(deep.storage, deep.storageMarkers.typedTrue);  // All strings
deep.Number.store(deep.storage, deep.storageMarkers.typedTrue);  // All numbers  
deep.Function.store(deep.storage, deep.storageMarkers.typedTrue);// All functions

// Result:
const str = new deep.String("hello");  // ✅ Auto-synced
const num = new deep.Number(42);       // ✅ Auto-synced
const plain = new deep();              // ❌ Not synced (unless explicitly marked)
```

### 3. Database Schema Fixes
- **_i field**: Only in `deep.links` table, not in value tables
- **Timestamps**: BIGINT numbers, not PostgreSQL timestamptz
- **No auto-triggers**: Application manages timestamps

```sql
-- ✅ CORRECT
CREATE TABLE deep.links (
  id UUID PRIMARY KEY,
  _deep UUID NOT NULL,
  _i BIGINT NOT NULL DEFAULT nextval('deep.sequence_seq'),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE deep.strings (
  id UUID PRIMARY KEY,
  _data TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
  -- No _i field!
);
```

## Implementation Phases

### Phase 1: Schema Updates
- Remove `_i` from value tables (`deep.strings`, `deep.numbers`, `deep.functions`)
- Change timestamps from `timestamptz` to `BIGINT`
- Remove automatic timestamp triggers
- Update `up-links.ts` and `down-links.ts`

### Phase 2: newHasyxDeep() Factory
```typescript
export async function newHasyxDeep(hasyxClient: any): Promise<any> {
  const deep = newDeep();
  
  // Create storage instance
  const storage = new deep.Storage();
  deep._context.storage = storage;
  
  // Auto-marking
  deep.store(storage, deep.storageMarkers.oneTrue);
  deep.String.store(storage, deep.storageMarkers.typedTrue);
  deep.Number.store(storage, deep.storageMarkers.typedTrue);
  deep.Function.store(storage, deep.storageMarkers.typedTrue);
  
  // Initialize hasyx storage
  const hasyxStorage = new deep.HasyxDeepStorage();
  await hasyxStorage.initialize({ hasyxClient });
  
  return deep;
}
```

### Phase 3: Real-time State Overlay
- `hasyx.subscribe()` for external changes
- Apply changes without circular sync
- Use `_source` and `_reason` to identify storage changes
- Prevent sync loops with flag system

```typescript
// Prevent circular sync
storage._applyExternalChanges = function(changes) {
  this.state._isReceivingExternalChanges = true;
  try {
    // Apply changes with storage as reason
    association._source = this._id;
    association._reason = this._id;
    // ... apply changes
  } finally {
    this.state._isReceivingExternalChanges = false;
  }
};
```

## Success Criteria

- ✅ `newHasyxDeep()` creates properly configured spaces with auto-marking
- ✅ Database operations use BIGINT timestamps 
- ✅ Only `deep.links` has `_i` sequence field
- ✅ Real-time subscription without circular sync
- ✅ Multi-client synchronization works correctly

## Testing Requirements

All tests must be autonomous (no beforeEach/afterEach):

```typescript
it('should sync with auto-marked types', async () => {
  const { hasyx, cleanup } = createTestEnvironment();
  
  try {
    const deep = await newHasyxDeep(hasyx);
    const str = new deep.String("test");
    await str.promise;
    
    // Verify sync
    const result = await hasyx.select({
      table: 'deep_strings',
      where: { id: { _eq: str._id } }
    });
    expect(result[0]._data).toBe("test");
    
  } finally {
    await cleanup();
  }
});
```

This plan provides seamless, real-time synchronized Deep spaces while maintaining the core framework's simplicity and power. 