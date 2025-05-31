# HASYX-EVENTS.md - Deep Framework Associative Events System with Hasyx Integration

## Overview

This document outlines the development process for the **Hasyx Events System** - a complete integration between Deep Framework associative events and Hasyx database triggers. This system enables real-time associative event handling triggered by database changes, maintaining proper isolation between Deep spaces and following Deep Framework's associative paradigm.

## ⚖️ **Development Rules & Requirements**

### 🚫 **NO MOCKS FOR DATABASE TESTS**
**CRITICAL RULE**: All implementation and testing must use real Hasura database connections without mocks or isolation. We validate actual functionality, not simulated behavior.

### 🔥 **ASSOCIATIVE-ONLY OPERATIONS** 
**CRITICAL RULE**: All event handling must operate exclusively through Deep Framework associations, not raw database data. Only `storage-hasyx.ts` should directly handle database operations.

### 📋 **ENGLISH ONLY IN CODE**
All code, comments, variable names, and function names must be in English. Communication with user can be in Russian.

### 🧪 **AUTONOMOUS TEST CULTURE**
Each `it` test must create its own isolated environment and clean up after itself. No `before`/`after` hooks allowed.

---

## 🏗️ **ARCHITECTURE OVERVIEW**

### **Core Components**

1. **`lib/hasyx-events.ts`** - Core associative event handling (On, Listener, Emit)
2. **`lib/hasyx-events.test.ts`** - Comprehensive test suite with real database integration
3. **`lib/hasyx-deeps.ts`** - Server-side Deep instance management with caching
4. **`/events/deep-*.json`** - Hasura event trigger definitions for deep_links table
5. **`/app/api/events/deep-*`** - API route handlers for database events

### **Event Flow Architecture**

```
Database Change (deep_links) → Hasura Event Trigger → API Route → hasyx-deeps.ts → 
→ Deep Instance (synchronized) → Find Listeners → Execute Handler Functions → hasyx.debug()
```

### **Key Architectural Principles**

1. **Space Isolation**: Each `_deep` space maintains its own Deep instance and event handlers
2. **Associative Operations**: All event handling works with Deep associations, not database records
3. **Real-time Synchronization**: Events trigger immediate delta application to avoid 1-second subscription delays
4. **Caching Strategy**: `hasyx-deeps.ts` maintains `Map<_deepId, deepInstance>` for performance
5. **Debug Logging**: All event processing logged to debug table via `hasyx.debug()`

---

## 📋 **PHASE 1: CORE ASSOCIATIVE EVENTS**

### **Step 1.1: Create `lib/hasyx-events.ts`**

Implement core associative event system:

```typescript
// lib/hasyx-events.ts
export function newHasyxEvents(deep: any) {
  // Create deep._context.On - returns deep.Listener
  const On = new deep.Function(function On(this: any, reason: any, eventAssociation: any, handlerFunction: any) {
    // Validate and prepare handler function
    let handlerAssoc;
    if (handlerFunction instanceof deep.Deep) {
      if (!handlerFunction.val.type.is(deep.Function)) {
        throw new Error('Handler association must be of type Function');
      }
      handlerAssoc = handlerFunction;
    } else if (typeof handlerFunction === 'function') {
      handlerAssoc = new deep.Function(handlerFunction);
    } else {
      throw new Error('Handler must be function or Deep Function association');
    }

    // Create new Listener association
    const listener = new deep.Listener();
    listener.value = eventAssociation;     // Event to listen for
    listener.from = reason;                // What watches for events  
    listener.to = handlerAssoc;           // Handler function to execute
    
    return listener;
  });

  // Create deep._context.Emit - emits events to trigger handlers
  const Emit = new deep.Function(function Emit(this: any, reason: any, eventAssociation: any, ...args: any[]) {
    // Find all listeners for this event in current deep space
    const listeners = deep._ids
      .map((id: string) => deep(id))
      .filter((assoc: any) => 
        assoc.type?.is(deep.Listener) && 
        assoc.value?._id === eventAssociation._id
      );

    // Execute each listener's handler
    for (const listener of listeners) {
      try {
        const handler = listener.to;
        if (handler && handler._data && typeof handler._data === 'function') {
          handler._data(...args);
        }
      } catch (error) {
        console.error(`Error executing listener ${listener._id}:`, error);
      }
    }
  });

  // Register in context
  deep._context.On = On;
  deep._context.Emit = Emit;
  
  return { On, Emit };
}
```

### **Step 1.2: Create `lib/hasyx-events.test.ts`**

Comprehensive test suite following storage-hasyx pattern:

```typescript
// lib/hasyx-events.test.ts
describe('Hasyx Events - Associative System', () => {
  it('should create On listener with event association and handler function', async () => {
    const deep = newDeep();
    const StorageHasyx = newStorageHasyx(deep);
    newHasyxEvents(deep);
    
    const { hasyx } = createRealHasyxClient();
    const testSpaceId = uuidv4();
    
    const storage = new StorageHasyx({
      hasyx,
      deepSpaceId: testSpaceId
    });
    
    defaultMarking(deep, storage);
    await storage.promise;
    
    // Create event association and handler
    const testEvent = deep.events.valueSetted;
    let handlerCalled = false;
    const handlerFunction = () => { handlerCalled = true; };
    
    // Create listener using On
    const reason = new deep();
    const listener = new deep.On(reason, testEvent, handlerFunction);
    
    // Store listener in database
    listener.store(storage, deep.storageMarkers.oneTrue);
    await storage.promise;
    
    // Verify listener was created correctly
    expect(listener.value._id).toBe(testEvent._id);
    expect(listener.from._id).toBe(reason._id);
    expect(listener.to.type.is(deep.Function)).toBe(true);
    
    // Verify it's stored in database
    const dump = storage.state.generateDump();
    const listenerInDump = dump.links.find(link => link._id === listener._id);
    expect(listenerInDump).toBeDefined();
  });

  it('should execute listeners when Emit is called', async () => {
    const deep = newDeep();
    const StorageHasyx = newStorageHasyx(deep);
    newHasyxEvents(deep);
    
    const { hasyx } = createRealHasyxClient();
    const testSpaceId = uuidv4();
    
    const storage = new StorageHasyx({
      hasyx,
      deepSpaceId: testSpaceId
    });
    
    defaultMarking(deep, storage);
    await storage.promise;
    
    // Create test event and handlers
    const testEvent = new deep.Event();
    let handler1Called = false;
    let handler2Called = false;
    let receivedArgs: any[] = [];
    
    // Create multiple listeners
    const reason1 = new deep();
    const reason2 = new deep();
    
    const listener1 = new deep.On(reason1, testEvent, (...args: any[]) => {
      handler1Called = true;
      receivedArgs = args;
    });
    
    const listener2 = new deep.On(reason2, testEvent, () => {
      handler2Called = true;
    });
    
    // Store listeners
    listener1.store(storage, deep.storageMarkers.oneTrue);
    listener2.store(storage, deep.storageMarkers.oneTrue);
    await storage.promise;
    
    // Emit event
    const emitReason = new deep();
    new deep.Emit(emitReason, testEvent, 'test', 'arguments', 123);
    
    // Verify handlers were called
    expect(handler1Called).toBe(true);
    expect(handler2Called).toBe(true);
    expect(receivedArgs).toEqual(['test', 'arguments', 123]);
  });
});
```

### **Step 1.3: Register in `lib/deep.ts`**

Add after `newStorageHasyx(deep)`:

```typescript
// lib/deep.ts (after line with newStorageHasyx)
newHasyxEvents(deep);
```

---

## 📋 **PHASE 2: SERVER-SIDE DEEP MANAGEMENT**

### **Step 2.1: Create `lib/hasyx-deeps.ts`**

Server-side Deep instance caching and management:

```typescript
// lib/hasyx-deeps.ts
import { newDeep } from '.';
import { newStorageHasyx } from './storage-hasyx';
import { defaultMarking } from './storage';
import { Hasyx } from 'hasyx';

// Global cache for Deep instances
const deepInstanceCache = new Map<string, any>();

/**
 * Get or create synchronized Deep instance for specific space
 */
export async function defineHasyxDeep(deepSpaceId: string, hasyx: Hasyx): Promise<any> {
  // Return cached instance if exists
  if (deepInstanceCache.has(deepSpaceId)) {
    const cachedDeep = deepInstanceCache.get(deepSpaceId);
    await cachedDeep.storage.promise; // Ensure it's still synchronized
    return cachedDeep;
  }
  
  // Create new Deep instance
  const deep = newDeep();
  
  // Create storage for this space
  const storage = new deep.StorageHasyx({
    hasyx,
    deepSpaceId,
    strategy: 'subscription'
  });
  
  // Apply default marking and wait for synchronization
  defaultMarking(deep, storage);
  await storage.promise;
  
  // Store reference to storage for easy access
  deep.storage = storage;
  
  // Cache the instance
  deepInstanceCache.set(deepSpaceId, deep);
  
  return deep;
}

/**
 * Apply delta to cached Deep instance (for immediate event handling)
 */
export function applyDeltaToHasyxDeep(deepSpaceId: string, delta: any): void {
  const deep = deepInstanceCache.get(deepSpaceId);
  if (deep && deep.storage) {
    // Apply delta immediately to avoid waiting for subscription
    deep.__isStorageEvent = deep.storage._id;
    deep.storage.state._applyDelta(deep, delta, deep.storage);
  }
}

/**
 * Clear cache (for testing)
 */
export function clearHasyxDeepCache(): void {
  deepInstanceCache.clear();
}

/**
 * Get cached Deep instance without creating new one
 */
export function getHasyxDeep(deepSpaceId: string): any | undefined {
  return deepInstanceCache.get(deepSpaceId);
}
```

---

## 📋 **PHASE 3: DATABASE EVENT TRIGGERS**

### **Step 3.1: Create Event Trigger Definitions**

Create Hasura event triggers for deep_links table operations:

**`/events/deep-links-insert.json`**
```json
{
  "name": "deep_links_insert",
  "table": {
    "schema": "public",
    "name": "deep_links"
  },
  "webhook_path": "/api/events/deep-links-insert",
  "insert": {
    "columns": "*"
  },
  "retry_conf": {
    "num_retries": 3,
    "interval_sec": 10,
    "timeout_sec": 60
  }
}
```

**`/events/deep-links-update.json`**
```json
{
  "name": "deep_links_update", 
  "table": {
    "schema": "public",
    "name": "deep_links"
  },
  "webhook_path": "/api/events/deep-links-update",
  "update": {
    "columns": "*"
  },
  "retry_conf": {
    "num_retries": 3,
    "interval_sec": 10,
    "timeout_sec": 60
  }
}
```

**`/events/deep-links-delete.json`**
```json
{
  "name": "deep_links_delete",
  "table": {
    "schema": "public", 
    "name": "deep_links"
  },
  "webhook_path": "/api/events/deep-links-delete",
  "delete": {
    "columns": "*"
  },
  "retry_conf": {
    "num_retries": 3,
    "interval_sec": 10,
    "timeout_sec": 60
  }
}
```

### **Step 3.2: Deploy Event Triggers**

```bash
npx hasyx events
```

---

## 📋 **PHASE 4: API ROUTE HANDLERS**

### **Step 4.1: Create Insert Handler**

**`/app/api/events/deep-links-insert/route.ts`**
```typescript
import { hasyxEvent, HasuraEventPayload } from 'hasyx/lib/events';
import { createAdminHasyx } from '@/lib/hasyx-admin';
import { defineHasyxDeep, applyDeltaToHasyxDeep } from '@/lib/hasyx-deeps';

export const POST = hasyxEvent(async (payload: HasuraEventPayload) => {
  const adminHasyx = createAdminHasyx();
  
  try {
    const { event } = payload;
    const newRecord = event.data.new;
    const deepSpaceId = newRecord._deep;
    
    // Debug logging
    await adminHasyx.debug({
      event_type: 'deep_links_insert',
      deep_space_id: deepSpaceId,
      link_id: newRecord.id,
      link_type: newRecord._type,
      timestamp: Date.now()
    });
    
    // Get synchronized Deep instance for this space
    const deep = await defineHasyxDeep(deepSpaceId, adminHasyx);
    
    // Apply delta immediately (don't wait for subscription)
    const delta = {
      operation: 'insert',
      link: {
        _id: newRecord.id,
        _type: newRecord._type,
        _from: newRecord._from,
        _to: newRecord._to,
        _value: newRecord._value,
        _created_at: newRecord.created_at,
        _updated_at: newRecord.updated_at,
        _i: newRecord._i,
        _string: newRecord.string,
        _number: newRecord.number,
        _function: newRecord.function
      }
    };
    
    applyDeltaToHasyxDeep(deepSpaceId, delta);
    
    // Find listeners for 'insert' event
    const insertEvent = deep.events.linkInserted; // Universal event
    const listeners = deep._ids
      .map((id: string) => deep(id))
      .filter((assoc: any) => 
        assoc.type?.is(deep.Listener) && 
        assoc.value?._id === insertEvent._id
      );
    
    // Execute listeners
    for (const listener of listeners) {
      try {
        const handler = listener.to;
        if (handler?._data && typeof handler._data === 'function') {
          await handler._data(deep(newRecord.id)); // Pass new association
        }
      } catch (error) {
        await adminHasyx.debug({
          event_type: 'listener_execution_error',
          error: error.message,
          listener_id: listener._id,
          deep_space_id: deepSpaceId
        });
      }
    }
    
    return { success: true };
  } catch (error) {
    await adminHasyx.debug({
      event_type: 'deep_links_insert_error',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
});
```

### **Step 4.2: Similar handlers for Update and Delete**

Following the same pattern for update and delete operations, each with appropriate event types and delta applications.

---

## 📋 **DEVELOPMENT PLAN & EXECUTION ORDER**

### **Phase 1: Foundation (Week 1)**
1. ✅ **Day 1-2**: Implement `lib/hasyx-events.ts` with On, Listener, Emit
2. ✅ **Day 3-4**: Create comprehensive test suite in `lib/hasyx-events.test.ts`
3. ✅ **Day 5**: Register in `lib/deep.ts` and validate basic functionality

### **Phase 2: Server Infrastructure (Week 2)**
4. **Day 1-2**: Implement `lib/hasyx-deeps.ts` with caching and synchronization
5. **Day 3-4**: Create and deploy event trigger JSON definitions
6. **Day 5**: Test event trigger deployment with `npx hasyx events`

### **Phase 3: API Integration (Week 3)**
7. **Day 1-3**: Implement API route handlers for insert/update/delete
8. **Day 4-5**: Add comprehensive debug logging and error handling

### **Phase 4: Testing & Integration (Week 4)**
9. **Day 1-3**: End-to-end integration tests with real database events
10. **Day 4-5**: Performance optimization and production readiness

---

## 🧪 **TESTING STRATEGY**

### **Integration Testing Flow**
1. Create newDeep with real Hasyx storage
2. Wait for full synchronization (`await storage.promise`)
3. Create event listeners using `new deep.On()`
4. Store listeners and wait for synchronization
5. Manually trigger database changes via direct Hasyx operations
6. Verify handlers were executed through debug logs
7. Clean up test space

### **Debug Verification**
- Use `hasyx.debug()` to log all event processing steps
- Query debug table to verify event flow
- Monitor listener execution and error handling
- Track performance metrics for optimization

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Development Environment**
- Deploy on remote server adjacent to database
- Real-time log monitoring during development
- Direct database access for event trigger testing

### **Production Considerations**
- Event handler error recovery
- Performance monitoring via debug logs
- Space isolation verification
- Memory usage optimization for cached Deep instances

---

## 📝 **CRITICAL IMPLEMENTATION NOTES**

1. **Universal Events**: Use existing `deep.events.*` rather than creating new event types
2. **Space Isolation**: Achieved automatically through `hasyx-deeps.ts` space-specific instances  
3. **No Database Queries**: Event handlers work only with synchronized Deep associations
4. **Immediate Delta Application**: Avoid 1-second subscription delays via `applyDeltaToHasyxDeep()`
5. **Debug Everything**: All event processing must be logged to debug table
6. **Error Recovery**: Robust error handling with detailed debug logging
7. **Real Database Only**: No mocks in any tests - validate actual Hasura integration

---

*Status: Ready for Phase 1 implementation*
*Next: Start with `lib/hasyx-events.ts` and basic test suite*

