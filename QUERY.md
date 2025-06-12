## Первичная реализация диалекта запросов

Для реализации этго файла нужно иметь в виду:
- Базовую реализацию ассоциативности deep.ts _deep.ts links.ts events.ts _events.ts
- Базовую реализацию типов и н-арных операций array.ts set.ts nary.ts
- Базовую реализацию трекинга tracking.ts tracking.test.ts

### ПРАВИЛА

- Перечитывай файл QUERY.md после каждых 4 операций как редактирование файлов/запуск терминала!
- Не создавай и не меняй никаких файлов кроме указанных в этом файле как тех над которыми мы работаем!
- Тесты писать строго в соответствующи файлах query.test.ts!
- Запуск тестов строго двумя способами, и никакими другими:
  - npm test query.test.ts - для всех тестов файла
  - DEBUG="deep7*" npm test query.test.ts -- -t "test name" - для конкретного теста с включенной отладкой
- Во всех ключевых местах используя import from './debug' const debug = new Debug('sets' | 'sets:test) используй debug('...') и никогда не испольузй console.log! по аналогии с другими файлами проекта.
- Коммиты и npm run build делать запрещено!

### Порядок работы:

Сначала реализовать базово оперцаию и протестировать, каждую в отдельности последовательно про каждую:
- Взять следующий 🔴 пункт, провести ресерч, составить план, полное понимание пункта и его реализации, согласовать реализацию и тестовые случаи достаточные что бы на пункт можно было полагаться в контексте следующих пунктов, согласовать с пользователем до консенсуса, после согласования с пользователем поставить 🟣 рядом с операцией и приступить к реализации пункта.
- Рализовать операцию в query.ts и тесты в query.test.ts. Когда тесты будут проходить отчитаться написать отчет о том как именно работает получившийся пункт, и после подтверждения консенсуса поставить 🟢 рядом с операцией и переходить к следующему пункту.

(🔴 еще не приступили, 🟢 реализовали, 🟣 согласован план)

## План реализации

query.ts query.test.ts newQuery(deep) 🔴

### Гипотеза окнечного результата

Перед тем как сделать полноценный поисковый движок нужно убедиться со следующими утверждениями:

Поисковый движок будет в итоге иметь такой вид: deep.query(exp) => And
У этого метода exp это всегда plain object с ключами равными relation полям ассоциации:
- одиночным type, from, to, value
- множественным typed, out, in, valued
Мы не рассматриваем сейчас работу с data и разными типами данных, только ассоциативный поиск

Как я вижу структуру такого поиска:

const X = new deep();
const A = new X();
const B = new X();
const str = new deep.String('abc');
A.value = str;
Поступает запрос вида: exp = { type: deep.String, valued: { type: X } }
Он передается в deep.query(exp)
Для каждого ключа в exp применяется deep.queryField(field, value) => queryFieldCriteria. Этот queryFieldCriteria - это то чему должны соответствовать конечные элементы. Таким образом от deep.queryField('type', deep.String) мы получаем queryFieldCriteria = Set { str }. Внутри queryField если value это Deep экземпляр, то он применяет value.queryInvertRelation(field) откуда получает deep.Set { ... }. Если value это exp - plainObject то вызывает для этого поля еще раз deep.query(value). Получив эти set формируется parsedExp = { [fieldName]: deep.Set{ ... } } на основе полученных полей на этом уровне запроса.
Затем из всех полученных deep.Set делается new deep.And(undefined, new deep.Set(...Object.values(parsedExp))).
Таким образом на выход мы должны получить полностью поддерживающий трекинг deep.Set с соответствиями.

Таким образом
exp = { type: X }
deep.query(exp) => deep.Set { A, B }
  deep.queryField('type', X) => deep.Set { A, B }

exp = { typed: A }
deep.query(exp) => deep.Set { X }
  deep.queryField('typed', A) => deep.Set { X }

exp = { type: X, valued: str }
deep.query(exp) => deep.Set { A }
  deep.queryField('type', X) => deep.Set { A, B }
  deep.queryField('valued', str) => deep.Set { A }

const R = new deep();
const W = new R();
const Z = new R();
const e = new W();
const q = new W();
const o = new Z();
const p = new Z();
exp = { type: { type: R } }
deep.query(exp) => deep.Set { e, q, o, p }
  deep.queryField('type', { type: R }) => deep.Set { e, q, o, p }
    deep.query({ type: R }) => deep.Set { W, Z }
      deep.queryField('type', R) => deep.Set { W, Z }
        Так как это конкретный Deep по некоторому ключу возвращаем как есть
    А так как тут был вложенный в deepQuery exp, то результат нужно еще раз распаковать
    deep.Set{ W, Z }.mapByField('typed') => deep.Set { { e, q }, { o, p } } => deep.Or объединяет в { e, q, o, p }

### План реализации и тестирования

#### Вспомонательные данные 🟢

```js
export const _invertFields = { 
  'type': 'typed', 'from': 'out', 'to': 'in', 'value': 'valued', 
  'typed': 'type', 'out': 'from', 'in': 'to', 'valued': 'value' 
}
// Для удобства конвертации полей в их инвертированные версии

export const _oneRelationFields = { 'type': true, 'from': true, 'to': true, 'value': true }
// Для удобства распознавания одиночных полей

export const _manyRelationFields = { 'typed': true, 'out': true, 'in': true, 'valued': true }
// Для удобства распознавания множественных полей
```

**Тестовые случаи:**
```js
// Проверка корректности констант
expect(_invertFields['type']).toBe('typed')
expect(_invertFields['typed']).toBe('type')
expect(_invertFields['from']).toBe('out')
expect(_invertFields['out']).toBe('from')
// ... для всех полей

// Проверка обратной инвертации
for (const [key, value] of Object.entries(_invertFields)) {
  expect(_invertFields[value]).toBe(key) // должна быть обратимость
}

// Проверка типов полей
expect(_oneRelationFields['type']).toBe(true)
expect(_manyRelationFields['typed']).toBe(true)
expect(_oneRelationFields['typed']).toBeUndefined() // typed не одиночное
```

#### set.ts .map метод строго для сетов 🟢

Если у array.ts .map метод работает с массивом и возвращает массив, то у set.ts нужно добавить map работающий строго с сетами и возвращающий сет. Он должен поддерживать трекинг. Учитывая что в deepArray.map мы знали индексы перебираемых результатов, здесь нам придется создать в .state результата скрытый Map<initialValue, mappedValue> для того что бы при исчезании initialValue по этому мапу понимать что нужно удалить из результссета (и из map тоже). Важно помнить что в deepSet нельзя хранить Deep экземпляры, важно участь (если нжуно отвьечься на deepArray map и добавить такие тесты и поправить реализацию и там), что бы если из callback получен Deep экземпляр - мягко преобразовать его в _symbol перед помещением в результат.

**Тестовые случаи:**
```js
// Базовая функциональность set.map
const sourceSet = new deep.Set(new Set([1, 2, 3]))
const mappedSet = sourceSet.map(x => x * 2)
expect(mappedSet._data).toEqual(new Set([2, 4, 6])) // { 2, 4, 6 }

// Трекинг добавления элементов
// События: sourceSet.dataAdd -> mappedSet.dataAdd
let addedToMapped = null
mappedSet.on(deep.events.dataAdd, (element) => { addedToMapped = element._symbol })
sourceSet.add(4) // sourceSet = { 1, 2, 3, 4 }
expect(mappedSet._data.has(8)).toBe(true) // mappedSet = { 2, 4, 6, 8 }
expect(addedToMapped).toBe(8)

// Трекинг удаления элементов  
// События: sourceSet.dataDelete -> mappedSet.dataDelete
let deletedFromMapped = null
mappedSet.on(deep.events.dataDelete, (element) => { deletedFromMapped = element._symbol })
sourceSet.delete(1) // sourceSet = { 2, 3, 4 }
expect(mappedSet._data.has(2)).toBe(false) // mappedSet = { 4, 6, 8 }
expect(deletedFromMapped).toBe(2)

// Преобразование Deep экземпляров в _symbol
const deep1 = new deep()
const deep2 = new deep()
const deepSourceSet = new deep.Set(new Set([deep1._id, deep2._id]))
const mappedDeepSet = deepSourceSet.map(id => new deep(id)) // callback возвращает Deep
expect(Array.from(mappedDeepSet._data)).toEqual([deep1._id, deep2._id]) // результат содержит _symbol, не Deep

// Сложные преобразования с отслеживанием состояния
const complexSet = new deep.Set(new Set(['a', 'b']))
const upperCaseSet = complexSet.map(s => s.toUpperCase())
expect(upperCaseSet._data).toEqual(new Set(['A', 'B'])) // { 'A', 'B' }

// Проверка состояния _state._mapValues (внутренний Map для трекинга)
expect(upperCaseSet._state._mapValues.get('a')).toBe('A')
expect(upperCaseSet._state._mapValues.get('b')).toBe('B')

complexSet.add('c') // complexSet = { 'a', 'b', 'c' }
expect(upperCaseSet._data.has('C')).toBe(true) // upperCaseSet = { 'A', 'B', 'C' }
expect(upperCaseSet._state._mapValues.get('c')).toBe('C')

complexSet.delete('a') // complexSet = { 'b', 'c' }
expect(upperCaseSet._data.has('A')).toBe(false) // upperCaseSet = { 'B', 'C' }
expect(upperCaseSet._state._mapValues.has('a')).toBe(false) // очистка map

// Отключение трекинга - события должны прекратиться
const disposer = complexSet.track(upperCaseSet)
disposer() // отключаем трекинг
let eventFired = false
upperCaseSet.on(deep.events.dataAdd, () => { eventFired = true })
complexSet.add('d') // complexSet = { 'b', 'c', 'd' }
expect(upperCaseSet._data.has('D')).toBe(false) // upperCaseSet остается { 'B', 'C' }
expect(eventFired).toBe(false) // события не должны происходить
```

#### Распаковщик релейшенов в множества ассоциативный метод X.manyRelation(fieldName) 🔴

При обращении к любому филду не важно одиночному или множественному вернет множественный поддерживающий трекинг сет.

**Тестовые случаи:**
```js
// Базовая функциональность одиночных отношений
const X = new deep()
const a = new X()
const b = new X()

// a.type = X, поэтому a.manyRelation('type') = { X }
const aTypeSet = a.manyRelation('type')
expect(aTypeSet._data).toEqual(new Set([X._id])) // { X }

// X.typed = { a, b }, поэтому X.manyRelation('typed') = { a, b }
const XTypedSet = X.manyRelation('typed')
expect(XTypedSet._data).toEqual(new Set([a._id, b._id])) // { a, b }

// Трекинг изменений одиночных отношений
// События: при изменении a.type -> aTypeSet.dataChanged
let typeSetChanged = false
aTypeSet.on(deep.events.dataChanged, () => { typeSetChanged = true })

const Y = new deep()
a.type = Y // меняем тип a с X на Y
expect(aTypeSet._data).toEqual(new Set([Y._id])) // { Y }
expect(typeSetChanged).toBe(true)

// Трекинг изменений множественных отношений  
// События: при создании нового экземпляра X -> XTypedSet.dataAdd
let addedToTyped = null
XTypedSet.on(deep.events.dataAdd, (element) => { addedToTyped = element._symbol })

const c = new X() // создаем новый экземпляр X
expect(XTypedSet._data.has(c._id)).toBe(true) // XTypedSet = { a, b, c } (но a уже не X!)
expect(addedToTyped).toBe(c._id)

// Трекинг удаления связей
// События: delete a.type -> связанные наборы обновляются
let deletedFromTyped = null
XTypedSet.on(deep.events.dataDelete, (element) => { deletedFromTyped = element._symbol })

delete a.type // удаляем связь type у a
expect(aTypeSet._data.size).toBe(0) // { } - пустой набор
expect(deletedFromTyped).toBe(a._id) // a больше не typed для X

// Работа с value отношениями
const str1 = new deep.String('hello')
const str2 = new deep.String('world')
a.value = str1
b.value = str2

const aValueSet = a.manyRelation('value')
expect(aValueSet._data).toEqual(new Set([str1._id])) // { str1 }

const str1ValuedSet = str1.manyRelation('valued')
expect(str1ValuedSet._data).toEqual(new Set([a._id])) // { a }

// Несуществующие поля возвращают пустые отслеживаемые наборы
const emptySet = a.manyRelation('nonexistent')
expect(emptySet._data.size).toBe(0) // { }
expect(emptySet instanceof deep.Deep).toBe(true)
expect(emptySet.type.is(deep.Set)).toBe(true)

// Проверка что пустые наборы тоже поддерживают трекинг (на случай будущих изменений)
let emptySetChanged = false
emptySet.on(deep.events.dataChanged, () => { emptySetChanged = true })
// В данном случае изменений не должно быть, но структура трекинга должна работать
```

#### Распаковщик инвертированных множеств deepSet.mapByField(fieldName) 🔴

Так как запрос { type: X } ищет "тех у кого тип X" а { typed: a } ищет тех у кого есть экземпляр a, значит в выражениях нужна инвертация.

**Подробный пример работы mapByField:**
```js
// Простая инвертация
const X = new deep()
const a = new X() // a.type = X
const b = new X() // b.type = X

const typedSet = X.manyRelation('typed') // { a, b }
const invertedToType = typedSet.mapByField('type') // ищем type для каждого элемента
// typedSet.map(element => element.manyRelation('type')) => [{ X }, { X }]
// deep.Or([{ X }, { X }]) => { X }
expect(invertedToType._data).toEqual(new Set([X._id])) // { X }

// Сложная инвертация - показывает как получается { e, q, o, p }
const R = new deep()    // корневой тип
const W = new R()       // W.type = R  
const Z = new R()       // Z.type = R
const e = new W()       // e.type = W
const q = new W()       // q.type = W  
const o = new Z()       // o.type = Z
const p = new Z()       // p.type = Z

// Запрос: найти все элементы, чей тип имеет тип R
// Шаг 1: deep.query({ type: R }) => { W, Z }
const typesWithR = new deep.Set(new Set([W._id, Z._id])) // { W, Z }

// Шаг 2: typesWithR.mapByField('typed') 
// W.manyRelation('typed') => { e, q }
// Z.manyRelation('typed') => { o, p }  
// deep.Or([{ e, q }, { o, p }]) => { e, q, o, p }
const invertedResult = typesWithR.mapByField('typed')
expect(invertedResult._data).toEqual(new Set([e._id, q._id, o._id, p._id])) // { e, q, o, p }

// Трекинг через инвертацию - создание нового элемента
// События: новый элемент -> источник обновляется -> результат обновляется
let addedToInverted = null
invertedResult.on(deep.events.dataAdd, (element) => { addedToInverted = element._symbol })

const r = new W() // создаем новый экземпляр W
// r.type = W, поэтому W.typed теперь { e, q, r }
// invertedResult должно стать { e, q, o, p, r }
expect(invertedResult._data.has(r._id)).toBe(true)
expect(addedToInverted).toBe(r._id)

// Трекинг через инвертацию - удаление источника
let deletedFromInverted = null  
invertedResult.on(deep.events.dataDelete, (element) => { deletedFromInverted = element._symbol })

W.destroy() // уничтожаем W
// Все экземпляры W (e, q, r) теряют связи
// invertedResult должно стать { o, p }
expect(invertedResult._data).toEqual(new Set([o._id, p._id]))
expect(deletedFromInverted).toBeTruthy() // один из e, q, r

// Пустые результаты  
const emptySet = new deep.Set(new Set())
const emptyInverted = emptySet.mapByField('type')
expect(emptyInverted._data.size).toBe(0) // { }

// Отключение трекинга прекращает события
const newTypesSet = new deep.Set(new Set([W._id]))
const newInverted = newTypesSet.mapByField('typed')
const disposer = newTypesSet.track(newInverted) // устанавливаем трекинг
disposer() // отключаем трекинг

let eventAfterDispose = false
newInverted.on(deep.events.dataAdd, () => { eventAfterDispose = true })
const newElement = new W() // создаем элемент
expect(eventAfterDispose).toBe(false) // события не должны происходить
```

#### deep.queryField(fieldName, value) 🔴

Комбинация manyRelation и mapByField для выполнения поиска по конкретному полю.

**Тестовые случаи:**
```js
// Простые запросы с Deep экземплярами
const X = new deep()
const Y = new deep()
const a = new X() // a.type = X
const b = new X() // b.type = X  
const c = new Y() // c.type = Y

// Поиск по типу: найти всех, у кого type = X
const typeXResult = deep.queryField('type', X)
expect(typeXResult._data).toEqual(new Set([a._id, b._id])) // { a, b }

// Поиск по обратной связи: найти всех, кто является типом для a
const typedAResult = deep.queryField('typed', a)
expect(typedAResult._data).toEqual(new Set([X._id])) // { X }

// Поиск с value отношениями
const str1 = new deep.String('hello')
const str2 = new deep.String('world')
a.value = str1 // a.value = str1
b.value = str2 // b.value = str2

const valuedStr1Result = deep.queryField('valued', str1)
expect(valuedStr1Result._data).toEqual(new Set([a._id])) // { a }

const valueStr1Result = deep.queryField('value', str1)  
expect(valueStr1Result._data).toEqual(new Set([a._id])) // { a }

// Вложенные объекты запросов
const R = new deep()
const W = new R() // W.type = R
const Z = new R() // Z.type = R  
const e = new W() // e.type = W
const q = new W() // q.type = W

// deep.queryField('type', { type: R }) должно найти все элементы,
// чей тип имеет тип R (т.е. e, q, etc.)
const nestedResult = deep.queryField('type', { type: R })
expect(nestedResult._data).toEqual(new Set([e._id, q._id])) // { e, q }

// Трекинг в queryField - создание новых элементов
let addedToQuery = null
typeXResult.on(deep.events.dataAdd, (element) => { addedToQuery = element._symbol })

const d = new X() // создаем новый экземпляр X
expect(typeXResult._data.has(d._id)).toBe(true) // typeXResult = { a, b, d }
expect(addedToQuery).toBe(d._id)

// Трекинг в queryField - изменение типов
let removedFromQuery = null
typeXResult.on(deep.events.dataDelete, (element) => { removedFromQuery = element._symbol })

a.type = Y // меняем тип a с X на Y
expect(typeXResult._data.has(a._id)).toBe(false) // typeXResult = { b, d }
expect(removedFromQuery).toBe(a._id)

// Несуществующие значения возвращают пустые наборы  
const nonExistent = new deep()
const emptyResult = deep.queryField('from', nonExistent) // from обычно не устанавливается
expect(emptyResult._data.size).toBe(0) // { }

// Некорректные поля выбрасывают ошибки
expect(() => deep.queryField('invalidField', X)).toThrow('Field invalidField is not supported in query expression')
```

#### Исполнитель запросов deep.query(exp) 🔴

Применяет queryField для каждого поля, собирает parsedExp { fieldName: deep.Set{ ... } }. Обобщает Object.values(parsedExp) используя new deep.And(undefined, new deep.Set(...Object.values(parsedExp))). Должен полностью поддерживать трекинг.

**Тестовые случаи:**
```js
// Простой запрос с одним критерием
const X = new deep()
const Y = new deep()
const a = new X() // a.type = X
const b = new X() // b.type = X
const c = new Y() // c.type = Y

const simpleQuery = deep.query({ type: X })
expect(simpleQuery._data).toEqual(new Set([a._id, b._id])) // { a, b }

// Множественные критерии (AND операция)
const str1 = new deep.String('hello')
const str2 = new deep.String('world')
a.value = str1 // a.type = X, a.value = str1
b.value = str2 // b.type = X, b.value = str2

const andQuery = deep.query({ type: X, value: str1 })
expect(andQuery._data).toEqual(new Set([a._id])) // { a } - только a соответствует обоим критериям

// Проверка внутренней структуры And операции
expect(andQuery.type.is(deep.And)).toBe(true)
// andQuery.value должно содержать набор наборов критериев
const criteriaSets = Array.from(andQuery.value._data)
expect(criteriaSets.length).toBe(2) // два критерия: type и value

// Вложенные запросы
const R = new deep()
const W = new R() // W.type = R
const Z = new R() // Z.type = R
const e = new W() // e.type = W  
const q = new W() // q.type = W
const o = new Z() // o.type = Z
const p = new Z() // p.type = Z

const nestedQuery = deep.query({ type: { type: R } })
expect(nestedQuery._data).toEqual(new Set([e._id, q._id, o._id, p._id])) // { e, q, o, p }

// Пустые результаты при несоответствии критериям
const emptyQuery = deep.query({ from: new deep() }) // from обычно не устанавливается
expect(emptyQuery._data.size).toBe(0) // { }

// Комплексное тестирование трекинга
let queryChanged = false
simpleQuery.on(deep.events.dataChanged, () => { queryChanged = true })

const d = new X() // создаем новый экземпляр X
expect(simpleQuery._data.has(d._id)).toBe(true) // simpleQuery = { a, b, d }
expect(queryChanged).toBe(true)

// Трекинг с множественными критериями
let andQueryChanged = false  
andQuery.on(deep.events.dataChanged, () => { andQueryChanged = true })

const e2 = new X()
e2.value = str1 // e2.type = X, e2.value = str1 - соответствует обоим критериям
expect(andQuery._data.has(e2._id)).toBe(true) // andQuery = { a, e2 }
expect(andQueryChanged).toBe(true)

// Разрушение элементов
andQueryChanged = false
a.destroy() // уничтожаем a
expect(andQuery._data.has(a._id)).toBe(false) // andQuery = { e2 }
expect(andQueryChanged).toBe(true)

// Отключение трекинга останавливает обновления
const testQuery = deep.query({ type: Y })
const initialSize = testQuery._data.size

// Находим и отключаем все трекеры (это может потребовать доступа к внутренним структурам)
// В реальной реализации может потребоваться метод testQuery.stopTracking()
let trackerDisabled = false
if (testQuery._state && testQuery._state.offs) {
  testQuery._state.offs.forEach(off => off()) // отключаем все трекеры
  trackerDisabled = true
}

let queryChangedAfterDisable = false
testQuery.on(deep.events.dataChanged, () => { queryChangedAfterDisable = true })

const f = new Y() // создаем новый элемент
if (trackerDisabled) {
  expect(testQuery._data.size).toBe(initialSize) // размер не должен измениться
  expect(queryChangedAfterDisable).toBe(false) // события не должны происходить
}

// Сложные вложенные запросы с несколькими уровнями
const Level1 = new deep()
const Level2A = new Level1()
const Level2B = new Level1()  
const Level3A1 = new Level2A()
const Level3A2 = new Level2A()
const Level3B1 = new Level2B()

const deepNestedQuery = deep.query({ 
  type: { 
    type: { 
      type: Level1 
    } 
  } 
})
expect(deepNestedQuery._data).toEqual(new Set([Level3A1._id, Level3A2._id, Level3B1._id])) // { Level3A1, Level3A2, Level3B1 }

// Проверка событий на всех уровнях вложенности
let deepQueryChanged = false
deepNestedQuery.on(deep.events.dataChanged, () => { deepQueryChanged = true })

const Level3B2 = new Level2B() // добавляем элемент на третьем уровне
expect(deepNestedQuery._data.has(Level3B2._id)).toBe(true)
expect(deepQueryChanged).toBe(true)
```

### Критически важные события для отслеживания:

**На уровне Set.map:**
- `sourceSet.dataAdd` → `mappedSet.dataAdd` 
- `sourceSet.dataDelete` → `mappedSet.dataDelete`
- `sourceSet.dataChanged` → `mappedSet.dataChanged`

**На уровне manyRelation:**
- Изменения связей (`typeSetted`, `fromSetted`, etc.) → обновление соответствующих наборов
- `globalLinkChanged` → обновление всех связанных manyRelation наборов  
- `globalConstructed`/`globalDestroyed` → добавление/удаление из наборов

**На уровне mapByField:**
- Изменения в исходном наборе → пересчет инвертированных связей
- Изменения в инвертированных элементах → обновление результата через Or операцию
- Каскадные события через цепочку: `source.dataAdd` → `mapped.dataAdd` → `inverted.dataAdd`

**На уровне query:**
- Все события критериев → пересчет And операции
- `globalLinkChanged` → проверка соответствия новым критериям
- Создание/уничтожение элементов → добавление/удаление из результатов

**Критически важно:** При отключении любого трекера в цепочке, все последующие события должны прекратиться, предотвращая "memory leaks" и избыточные вычисления.
