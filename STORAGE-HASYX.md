# Deep Framework Hasyx Storage Integration Plan

## Overview

План интеграции системы storage с Hasura GraphQL через Hasyx client. Базируется на завершенной системе storage из [STORAGES.md](./STORAGES.md).

## Архитектурные требования

### 1. Правильный Storage API ✅ ИСПРАВЛЕНО
```typescript
// ✅ ПРАВИЛЬНО - использование Deep instances
association.store(deep.storage, marker);
association.store(deep.backupStorage, marker);

// ❌ НЕПРАВИЛЬНО - строки больше не поддерживаются  
association.store('database', marker);
```

### 2. Автомаркировка в newHasyxDeep()
`newHasyxDeep()` автоматически помечает базовые типы для синхронизации:

```typescript
export async function newHasyxDeep(hasyxClient: any): Promise<any> {
  const deep = newDeep();
  
  // Создать storage instance для этого deep space
  const storage = new deep.Storage();
  deep._context.storage = storage;
  
  // АВТОМАРКИРОВКА - критично для правильной работы
  deep.store(storage, deep.storageMarkers.oneTrue);           // Сам deep синхронизируется
  deep.String.store(storage, deep.storageMarkers.typedTrue);  // Все новые строки автосинхронизация
  deep.Number.store(storage, deep.storageMarkers.typedTrue);  // Все новые числа автосинхронизация  
  deep.Function.store(storage, deep.storageMarkers.typedTrue);// Все новые функции автосинхронизация
  
  // Инициализировать hasyx storage
  const hasyxStorage = new deep.HasyxDeepStorage();
  await hasyxStorage.initialize({ hasyxClient });
  
  return deep;
}

// Результат автомаркировки:
const deep = await newHasyxDeep(hasyxClient);
const str = new deep.String("hello");  // ✅ Автоматически синхронизируется
const num = new deep.Number(42);       // ✅ Автоматически синхронизируется
const plain = new deep();              // ❌ НЕ синхронизируется (пока не включить отдельно)
```

### 3. Исправления схемы БД ✅ ИСПРАВЛЕНО

#### Убрано поле _i из value таблиц:
```sql
-- ✅ ПРАВИЛЬНО: _i только в links
CREATE TABLE deep.links (
  id UUID PRIMARY KEY,
  _deep UUID NOT NULL,
  _i BIGINT NOT NULL DEFAULT nextval('deep.sequence_seq'),
  -- остальные поля
);

-- ✅ ИСПРАВЛЕНО: _i убрано из value таблиц  
CREATE TABLE deep.strings (
  id UUID PRIMARY KEY REFERENCES deep.links(id),
  _data TEXT NOT NULL
  -- НЕТ _i поля
);
```

#### BIGINT timestamps без PostgreSQL типов:
```sql
-- ✅ ПРАВИЛЬНО: BIGINT вместо timestamptz
CREATE TABLE deep.links (
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- Триггер обновлен для работы с BIGINT
CREATE OR REPLACE FUNCTION deep.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';
```

## План реализации

### Phase 0.4: Hasyx Storage Integration

#### Step 1: API Fixes ✅ COMPLETE
- ✅ `store()` принимает только Deep instances, не строки
- ✅ Все тесты обновлены и проходят (22/22)
- ✅ Error handling с правильными сообщениями

#### Step 2: Schema Fixes ✅ COMPLETE  
- ✅ Убрано `_i` поле из `deep.strings`, `deep.numbers`, `deep.functions`
- ✅ Изменены `created_at`, `updated_at` с `timestamptz` на `BIGINT`
- ✅ Обновлен триггер `update_updated_at` для работы с BIGINT
- ✅ Оставлен триггер для автоматических timestamps при отсутствии новых

#### Step 3: newHasyxDeep() Implementation
**Цель**: Реализация synchronized Deep space factory
**Задачи**:
```typescript
// Создание синхронизированного Deep space
export async function newHasyxDeep(hasyxClient: any): Promise<any> {
  const deep = newDeep();
  
  // Создать и настроить storage
  const storage = new deep.Storage();
  deep._context.storage = storage;
  
  // Автомаркировка критически важна
  deep.store(storage, deep.storageMarkers.oneTrue);
  deep.String.store(storage, deep.storageMarkers.typedTrue);
  deep.Number.store(storage, deep.storageMarkers.typedTrue);
  deep.Function.store(storage, deep.storageMarkers.typedTrue);
  
  // Инициализация hasyx storage
  const hasyxStorage = new deep.HasyxDeepStorage();
  await hasyxStorage.initialize({ hasyxClient });
  
  return deep;
}
```

#### Step 4: Database Operations
**Цель**: Реальные операции с базой данных
**Задачи**:
```typescript
// Синхронизация с правильными timestamp типами
async function syncAssociationToDatabase(association: any) {
  const now = new Date().valueOf(); // BIGINT timestamp
  
  await hasyxClient.insert({
    table: 'deep_links',
    object: {
      id: association._id,
      _deep: deep._id,  // Deep space isolation
      _i: association._i,
      _type: association._type,
      _from: association._from,
      _to: association._to,
      _value: association._value,
      created_at: association._created_at || now,
      updated_at: now
    }
  });
}
```

### Phase 0.5: State Overlay System

#### Step 1: hasyx.subscribe Integration
**Цель**: Получение внешних изменений через WebSocket
**Задачи**:
```typescript
// Подписка на изменения в Deep space
const subscription = await hasyxClient.useSubscription({
  table: 'deep_links',
  where: { _deep: { _eq: deep._id } },
  returning: ['id', '_type', '_from', '_to', '_value', 'created_at', 'updated_at']
});

subscription.subscribe((changes) => {
  // Применение внешних изменений без циклических отправок
  this._applyExternalChanges(changes);
});
```

#### Step 2: Circular Prevention
**Цель**: Предотвращение циклических отправок
**Принцип**: События с `_source` или `_reason` равным storage ID игнорируются:
```typescript
function handleStorageEvent(payload: any) {
  const storage = this; // HasyxDeepStorage instance
  
  // Игнорировать события от подписки
  if (payload._reason === storage._id) return;
  if (this.state._isReceivingExternalChanges) return;
  
  // Отправить в базу только пользовательские изменения
  this._syncToDatabase(payload);
}
```

## Критерии завершения

### Функциональность
- ✅ `newHasyxDeep()` создает синхронизированные Deep spaces
- ✅ Автомаркировка базовых типов работает
- ✅ Storage API использует только Deep instances
- ✅ BIGINT timestamps в базе данных
- ✅ Triger для автоматических timestamps

### Интеграция
- ⏳ Реальные database операции (insert/update/delete)
- ⏳ hasyx.subscribe для внешних изменений
- ⏳ Предотвращение циклических отправок
- ⏳ Multi-client синхронизация

### Тестирование
- ✅ Storage тесты проходят (22/22)
- ✅ Базовые Deep тесты работают
- ⏳ Hasyx storage integration тесты
- ⏳ Multi-client тесты

**Статус**: Phase 0.4 Step 1-2 COMPLETE, готов к Step 3-4 