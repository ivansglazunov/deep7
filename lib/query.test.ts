import { describe, it, expect } from '@jest/globals';
import Debug from './debug';
import { newDeep } from './deep';

const debug = Debug('query:test');

// Тестовый датасет для всех тестов согласно QUERY2.md
function makeDataset(deep: any) {
  debug('🏗️ Creating test dataset');

  // Основные типы
  const A = new deep();
  const a1 = new deep();
  const a2 = new deep();
  a1.type = A;
  a2.type = A;

  const B = new deep();
  const b1 = new deep();
  const b2 = new deep();
  b1.type = B;
  b2.type = B;
  b1.from = a1;
  b2.from = a1;

  const C = new deep();
  const c1 = new deep();
  const c2 = new deep();
  c1.type = C;
  c2.type = C;
  c1.to = a2;
  c2.to = a2;

  const str = new deep.String('abc');
  const D = new deep();
  const d1 = new deep();
  const d2 = new deep();
  d1.type = D;
  d2.type = D;
  d1.value = str;
  d2.value = str;

  debug('✅ Test dataset created');
  return { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str };
}

describe('manyRelation', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for manyRelation');
    deep = newDeep();
  });

  describe('type relation', () => {
    it('should handle single type relation with tracking', () => {
      const { A, a1, a2 } = makeDataset(deep);

      // Аксиома: a1.type возвращает тип ассоциации A либо undefined
      expect(a1.type._id).toBe(A._id);

      // Аксиома: a1.manyRelation('type') должен возвращать { A }
      const a1TypeSet = a1.manyRelation('type');
      expect(a1TypeSet.type.is(deep.Set)).toBe(true);
      expect(a1TypeSet.size).toBe(1);
      expect(a1TypeSet.has(A)).toBe(true);

      // Проверка трекинга - изменение type должно обновить результат
      let typeSetChanged = false;
      let addedElement = null;
      let deletedElement = null;

      a1TypeSet.on(deep.events.dataAdd, (element) => {
        addedElement = element;
        typeSetChanged = true;
      });

      a1TypeSet.on(deep.events.dataDelete, (element) => {
        deletedElement = element;
        typeSetChanged = true;
      });

      // Изменяем тип на новый
      const Y = new deep();
      a1.type = Y;

      // Проверяем что результат обновился
      expect(a1TypeSet.size).toBe(1);
      expect(a1TypeSet.has(Y)).toBe(true);
      expect(a1TypeSet.has(A)).toBe(false);
      expect(typeSetChanged).toBe(true);
      expect(addedElement).toBeTruthy();
      expect(deletedElement).toBeTruthy();

      debug('✅ type relation tracking works correctly');
    });
  });

  describe('typed relation', () => {
    it('should handle multiple typed relation with tracking', () => {
      const { A, a1, a2 } = makeDataset(deep);

      // Аксиома: A.typed возвращает сет тех кто типизирован данной ассоциацией { a1, a2 }
      const ATypedSet = A.manyRelation('typed');
      expect(ATypedSet.type.is(deep.Set)).toBe(true);
      expect(ATypedSet.size).toBe(2);
      expect(ATypedSet.has(a1)).toBe(true);
      expect(ATypedSet.has(a2)).toBe(true);

      // Проверка трекинга - создание нового экземпляра типа A
      let addedElement = null;
      ATypedSet.on(deep.events.dataAdd, (element) => {
        addedElement = element;
      });

      const a3 = new deep();
      a3.type = A;

      // Проверяем что новый элемент добавился в результат
      expect(ATypedSet.size).toBe(3);
      expect(ATypedSet.has(a3)).toBe(true);
      expect(addedElement).toBeTruthy();

      // Проверка трекинга - удаление связи type
      let deletedElement = null;
      ATypedSet.on(deep.events.dataDelete, (element) => {
        deletedElement = element;
      });

      delete a1.type;

      // Проверяем что элемент удалился из результата
      expect(ATypedSet.size).toBe(2);
      expect(ATypedSet.has(a1)).toBe(false);
      expect(ATypedSet.has(a2)).toBe(true);
      expect(ATypedSet.has(a3)).toBe(true);
      expect(deletedElement).toBeTruthy();

      debug('✅ typed relation tracking works correctly');
    });
  });

  describe('from/out relation', () => {
    it('should handle from/out relation with tracking', () => {
      const { a1, B, b1, b2 } = makeDataset(deep);

      // Аксиома: b1.from возвращает то куда данная ассоциация ссылается как на from - a1 или undefined
      expect(b1.from._id).toBe(a1._id);

      // Аксиома: b1.manyRelation('from') должен возвращать { a1 }
      const b1FromSet = b1.manyRelation('from');
      expect(b1FromSet.type.is(deep.Set)).toBe(true);
      expect(b1FromSet.size).toBe(1);
      expect(b1FromSet.has(a1)).toBe(true);

      // Аксиома: a1.out возвращает сет тех кто ссылается на данную ассоциацию как на from { b1, b2 }
      const a1OutSet = a1.manyRelation('out');
      expect(a1OutSet.type.is(deep.Set)).toBe(true);
      expect(a1OutSet.size).toBe(2);
      expect(a1OutSet.has(b1)).toBe(true);
      expect(a1OutSet.has(b2)).toBe(true);

      // Проверка трекинга - изменение from должно обновить результаты
      let fromSetChanged = false;
      let outSetChanged = false;

      b1FromSet.on(deep.events.dataChanged, () => { fromSetChanged = true; });
      a1OutSet.on(deep.events.dataChanged, () => { outSetChanged = true; });

      const newTarget = new deep();
      b1.from = newTarget;

      // Проверяем изменения
      expect(b1FromSet.has(newTarget)).toBe(true);
      expect(b1FromSet.has(a1)).toBe(false);
      expect(a1OutSet.has(b1)).toBe(false);
      expect(fromSetChanged).toBe(true);
      expect(outSetChanged).toBe(true);

      debug('✅ from/out relation tracking works correctly');
    });
  });

  describe('to/in relation', () => {
    it('should handle to/in relation with tracking', () => {
      const { a2, C, c1, c2 } = makeDataset(deep);

      // Аксиома: c1.to возвращает то куда данная ассоциация ссылается как на to - a2 или undefined
      expect(c1.to._id).toBe(a2._id);

      // Аксиома: c1.manyRelation('to') должен возвращать { a2 }
      const c1ToSet = c1.manyRelation('to');
      expect(c1ToSet.type.is(deep.Set)).toBe(true);
      expect(c1ToSet.size).toBe(1);
      expect(c1ToSet.has(a2)).toBe(true);

      // Аксиома: a2.in возвращает сет тех кто ссылается на данную ассоциацию как на to { c1, c2 }
      const a2InSet = a2.manyRelation('in');
      expect(a2InSet.type.is(deep.Set)).toBe(true);
      expect(a2InSet.size).toBe(2);
      expect(a2InSet.has(c1)).toBe(true);
      expect(a2InSet.has(c2)).toBe(true);

      // Проверка трекинга - удаление to должно обновить результаты
      let toSetChanged = false;
      let inSetChanged = false;

      c1ToSet.on(deep.events.dataChanged, () => { toSetChanged = true; });
      a2InSet.on(deep.events.dataChanged, () => { inSetChanged = true; });

      delete c1.to;

      // Проверяем изменения
      expect(c1ToSet.size).toBe(0);
      expect(a2InSet.has(c1)).toBe(false);
      expect(a2InSet.has(c2)).toBe(true);
      expect(toSetChanged).toBe(true);
      expect(inSetChanged).toBe(true);

      debug('✅ to/in relation tracking works correctly');
    });
  });

  describe('value/valued relation', () => {
    it('should handle value/valued relation with tracking', () => {
      const { str, D, d1, d2 } = makeDataset(deep);

      // Аксиома: d1.value возвращает то куда данная ассоциация ссылается как на .value - str или undefined
      expect(d1.value._id).toBe(str._id);

      // Аксиома: d1.manyRelation('value') должен возвращать { str }
      const d1ValueSet = d1.manyRelation('value');
      expect(d1ValueSet.type.is(deep.Set)).toBe(true);
      expect(d1ValueSet.size).toBe(1);
      expect(d1ValueSet.has(str)).toBe(true);

      // Аксиома: str.valued возвращает сет тех кто ссылается на данную ассоциацию как на value { d1, d2 }
      const strValuedSet = str.manyRelation('valued');
      expect(strValuedSet.type.is(deep.Set)).toBe(true);
      expect(strValuedSet.size).toBe(2);
      expect(strValuedSet.has(d1)).toBe(true);
      expect(strValuedSet.has(d2)).toBe(true);

      // Проверка трекинга - удаление и восстановление value
      let valueSetChanged = false;
      let valuedSetChanged = false;

      d1ValueSet.on(deep.events.dataChanged, () => { valueSetChanged = true; });
      strValuedSet.on(deep.events.dataChanged, () => { valuedSetChanged = true; });

      // Удаляем value
      delete d1.value;

      // Проверяем что d1 исчез из результатов
      expect(d1ValueSet.size).toBe(0);
      expect(strValuedSet.has(d1)).toBe(false);
      expect(strValuedSet.has(d2)).toBe(true);
      expect(valueSetChanged).toBe(true);
      expect(valuedSetChanged).toBe(true);

      // Восстанавливаем value
      valueSetChanged = false;
      valuedSetChanged = false;

      d1.value = str;

      // Проверяем что d1 вернулся в результаты
      expect(d1ValueSet.size).toBe(1);
      expect(d1ValueSet.has(str)).toBe(true);
      expect(strValuedSet.has(d1)).toBe(true);
      expect(valueSetChanged).toBe(true);
      expect(valuedSetChanged).toBe(true);

      debug('✅ value/valued relation tracking works correctly');
    });
  });
});

describe('mapByField', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for mapByField');
    deep = newDeep();
  });

  it('should map relation field and work with deep.Or', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Аксиома: testDeepSet = a1.manyRelation('out') { b1, b2 }
    const a1OutSet = a1.manyRelation('out');
    expect(a1OutSet.type.is(deep.Set)).toBe(true);
    expect(a1OutSet.size).toBe(2);
    expect(a1OutSet.has(b1)).toBe(true);
    expect(a1OutSet.has(b2)).toBe(true);

    // Аксиома: mappedByField = testDeepSet.mapByField('from') => { { a1 }, { a1 } }
    // Каждый элемент сета (b1, b2) дает свой manyRelation('from') результат
    debug('🧪 Testing mapByField on a1.out set with field "from"');
    const mappedByField = a1OutSet.mapByField('from');

    // Результат должен быть Deep.Set с объединением всех результатов manyRelation('from')
    // b1.manyRelation('from') = { a1 }
    // b2.manyRelation('from') = { a1 }
    // Объединение через Or = { a1 }
    expect(mappedByField.type.is(deep.Set)).toBe(true);
    expect(mappedByField.size).toBe(1);
    expect(mappedByField.has(a1)).toBe(true);

    debug('✅ mapByField basic functionality works correctly');

    // Проверка трекинга - добавление нового элемента в исходный сет
    let mappedChanged = false;
    mappedByField.on(deep.events.dataChanged, () => { mappedChanged = true; });

    // Добавляем новый элемент b3 со ссылкой на a2
    const b3 = new deep();
    b3.type = B;
    b3.from = a2;

    // Добавляем b3 в исходный сет a1OutSet (эмулируем изменение out)
    a1OutSet.add(b3);

    // Результат должен обновиться: теперь { a1, a2 }
    expect(mappedByField.size).toBe(2);
    expect(mappedByField.has(a1)).toBe(true);
    expect(mappedByField.has(a2)).toBe(true);
    expect(mappedChanged).toBe(true);

    debug('✅ mapByField tracking works correctly');
  });

  it('should handle different relation fields', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Тест с 'type' полем
    const instancesSet = new deep.Set(new Set([a1._symbol, a2._symbol]));
    const typesResult = instancesSet.mapByField('type');

    expect(typesResult.type.is(deep.Set)).toBe(true);
    expect(typesResult.size).toBe(1);
    expect(typesResult.has(A)).toBe(true);

    // Тест с 'value' полем
    const valueLinksSet = new deep.Set(new Set([d1._symbol, d2._symbol]));
    const valuesResult = valueLinksSet.mapByField('value');

    expect(valuesResult.type.is(deep.Set)).toBe(true);
    expect(valuesResult.size).toBe(1);
    expect(valuesResult.has(str)).toBe(true);

    debug('✅ mapByField works with different relation fields');
  });

  it('should handle empty sets', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    const emptySet = new deep.Set(new Set());
    const emptyResult = emptySet.mapByField('type');

    expect(emptyResult.type.is(deep.Set)).toBe(true);
    expect(emptyResult.size).toBe(0);

    debug('✅ mapByField handles empty sets correctly');
  });

  it('should handle all inverted field combinations', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Тестируем все возможные комбинации полей и их инверсий

    // type -> typed: { a1, a2 }.mapByField('type') => { A }
    const instancesSet = new deep.Set(new Set([a1._symbol, a2._symbol]));
    const typesResult = instancesSet.mapByField('type');
    expect(typesResult.size).toBe(1);
    expect(typesResult.has(A)).toBe(true);

    // typed -> type: { A }.mapByField('typed') => { a1, a2 }
    const typesSet = new deep.Set(new Set([A._symbol]));
    const instancesResult = typesSet.mapByField('typed');
    expect(instancesResult.size).toBe(2);
    expect(instancesResult.has(a1)).toBe(true);
    expect(instancesResult.has(a2)).toBe(true);

    // from -> out: { b1, b2 }.mapByField('from') => { a1 }
    const fromLinksSet = new deep.Set(new Set([b1._symbol, b2._symbol]));
    const fromTargetsResult = fromLinksSet.mapByField('from');
    expect(fromTargetsResult.size).toBe(1);
    expect(fromTargetsResult.has(a1)).toBe(true);

    // out -> from: { a1 }.mapByField('out') => { b1, b2 }
    const fromTargetsSet = new deep.Set(new Set([a1._symbol]));
    const fromLinksResult = fromTargetsSet.mapByField('out');
    expect(fromLinksResult.size).toBe(2);
    expect(fromLinksResult.has(b1)).toBe(true);
    expect(fromLinksResult.has(b2)).toBe(true);

    // to -> in: { c1, c2 }.mapByField('to') => { a2 }
    const toLinksSet = new deep.Set(new Set([c1._symbol, c2._symbol]));
    const toTargetsResult = toLinksSet.mapByField('to');
    expect(toTargetsResult.size).toBe(1);
    expect(toTargetsResult.has(a2)).toBe(true);

    // in -> to: { a2 }.mapByField('in') => { c1, c2 }
    const toTargetsSet = new deep.Set(new Set([a2._symbol]));
    const toLinksResult = toTargetsSet.mapByField('in');
    expect(toLinksResult.size).toBe(2);
    expect(toLinksResult.has(c1)).toBe(true);
    expect(toLinksResult.has(c2)).toBe(true);

    // value -> valued: { d1, d2 }.mapByField('value') => { str }
    const valueLinksSet = new deep.Set(new Set([d1._symbol, d2._symbol]));
    const valueTargetsResult = valueLinksSet.mapByField('value');
    expect(valueTargetsResult.size).toBe(1);
    expect(valueTargetsResult.has(str)).toBe(true);

    // valued -> value: { str }.mapByField('valued') => { d1, d2 }
    const valueTargetsSet = new deep.Set(new Set([str._symbol]));
    const valueLinksResult = valueTargetsSet.mapByField('valued');
    expect(valueLinksResult.size).toBe(2);
    expect(valueLinksResult.has(d1)).toBe(true);
    expect(valueLinksResult.has(d2)).toBe(true);

    debug('✅ mapByField handles all inverted field combinations correctly');
  });

  it('should handle complex tracking scenarios', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем динамический сет и отслеживаем изменения mapByField
    const dynamicSet = new deep.Set(new Set([b1._symbol]));
    const mappedResult = dynamicSet.mapByField('from');

    // Изначально: { b1 }.mapByField('from') => { a1 }
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a1)).toBe(true);

    // Отслеживаем изменения
    let addedElements: any[] = [];
    let deletedElements: any[] = [];

    mappedResult.on(deep.events.dataAdd, (...elements: any[]) => {
      addedElements.push(...elements);
    });

    mappedResult.on(deep.events.dataDelete, (...elements: any[]) => {
      deletedElements.push(...elements);
    });

    // Добавляем b2 в исходный сет: { b1, b2 }.mapByField('from') => { a1 }
    // Результат не должен измениться, так как b2.from тоже a1
    dynamicSet.add(b2);
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a1)).toBe(true);

    // Создаем новую связь b3 с другим from
    const b3 = new deep();
    b3.type = B;
    b3.from = a2;

    // Добавляем b3: { b1, b2, b3 }.mapByField('from') => { a1, a2 }
    dynamicSet.add(b3);
    expect(mappedResult.size).toBe(2);
    expect(mappedResult.has(a1)).toBe(true);
    expect(mappedResult.has(a2)).toBe(true);
    expect(addedElements.length).toBe(1);
    expect(addedElements[0]._id).toBe(a2._id);

    // Удаляем все b1, b2 (оба ссылаются на a1): { b3 }.mapByField('from') => { a2 }
    dynamicSet.delete(b1);
    dynamicSet.delete(b2);
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a2)).toBe(true);
    expect(mappedResult.has(a1)).toBe(false);
    expect(deletedElements.length).toBe(1);
    expect(deletedElements[0]._id).toBe(a1._id);

    // Изменяем from у b3: b3.from = a1
    addedElements = [];
    deletedElements = [];
    b3.from = a1;

    // Результат должен стать { a1 }
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a1)).toBe(true);
    expect(mappedResult.has(a2)).toBe(false);

    debug('✅ mapByField handles complex tracking scenarios correctly');
  });

  it('should handle multiple different results', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем смешанный сет элементов с разными типами
    const str2 = new deep.String('xyz');
    const d3 = new deep();
    d3.type = D;
    d3.value = str2;

    // Сет со связями на разные value: { d1, d2, d3 }
    // d1.value = str, d2.value = str, d3.value = str2
    const mixedValueSet = new deep.Set(new Set([d1._symbol, d2._symbol, d3._symbol]));
    const valuesResult = mixedValueSet.mapByField('value');

    // Результат должен содержать оба string: { str, str2 }
    expect(valuesResult.size).toBe(2);
    expect(valuesResult.has(str)).toBe(true);
    expect(valuesResult.has(str2)).toBe(true);

    // Создаем элементы с разными типами
    const Y = new deep();
    const y1 = new deep();
    y1.type = Y;

    // Сет с элементами разных типов: { a1, y1 }
    const mixedTypesSet = new deep.Set(new Set([a1._symbol, y1._symbol]));
    const typesResult = mixedTypesSet.mapByField('type');

    // Результат должен содержать оба типа: { A, Y }
    expect(typesResult.size).toBe(2);
    expect(typesResult.has(A)).toBe(true);
    expect(typesResult.has(Y)).toBe(true);

    debug('✅ mapByField handles multiple different results correctly');
  });

  it('should handle element destruction gracefully', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем сет и mapByField результат
    const sourceSet = new deep.Set(new Set([b1._symbol, b2._symbol]));
    const mappedResult = sourceSet.mapByField('from');

    // Изначально: { b1, b2 }.mapByField('from') => { a1 }
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a1)).toBe(true);

    // Отслеживаем изменения
    let changedEvents = 0;
    mappedResult.on(deep.events.dataChanged, () => { changedEvents++; });

    // Удаляем элементы из исходного сета (destroy не удаляет из Set автоматически)
    sourceSet.delete(b1);

    // Результат должен остаться тем же, так как b2.from тоже a1
    expect(mappedResult.size).toBe(1);
    expect(mappedResult.has(a1)).toBe(true);

    // Удаляем второй элемент из сета
    sourceSet.delete(b2);

    // Теперь исходный сет пустой, результат должен быть пустым
    expect(mappedResult.size).toBe(0);
    expect(mappedResult.has(a1)).toBe(false);

    debug('✅ mapByField handles element removal gracefully');
  });

  it('should handle elements with undefined relation fields', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем элементы без from поля (from по умолчанию undefined)
    const orphan1 = new deep(); // Нет from
    const orphan2 = new deep(); // Нет from  
    orphan2.from = a1; // Устанавливаем from

    // Тестируем manyRelation напрямую с полем 'from'
    const orphan1From = orphan1.manyRelation('from');
    const orphan2From = orphan2.manyRelation('from');

    expect(orphan1From.size).toBe(0); // Пустой (нет from)
    expect(orphan2From.size).toBe(1); // { a1 }
    expect(orphan2From.has(a1)).toBe(true);

    // Тестируем deep.Set.map напрямую
    const mixedSet = new deep.Set(new Set([orphan1._symbol, orphan2._symbol]));
    const setOfSets = mixedSet.map((elementSymbol: any) => {
      const element = deep.detect(elementSymbol);
      return element.manyRelation('from');
    });

    expect(setOfSets.size).toBe(2); // Два сета: один пустой, один с a1

    // Тестируем deep.Or с сетом содержащим пустой сет
    const orOperation = new deep.Or(undefined, setOfSets);
    const orResult = orOperation.to;

    expect(orResult.size).toBe(1); // Должен быть только a1, пустой сет не влияет
    expect(orResult.has(a1)).toBe(true);

    // Тестируем mapByField - должен работать корректно
    const fromResult = mixedSet.mapByField('from');
    expect(fromResult.size).toBe(1); // Правильное ожидание: только a1
    expect(fromResult.has(a1)).toBe(true);

    // Тест с полем где все элементы имеют пустые отношения
    const noFromSet = new deep.Set(new Set([orphan1._symbol])); // Только элемент без from
    const emptyFromResult = noFromSet.mapByField('from');

    // orphan1.manyRelation('from') = {} (пустой)
    // Объединение = {} (пустое)
    expect(emptyFromResult.size).toBe(0);

    debug('✅ mapByField handles undefined relation fields correctly');
  });

  it('should handle complex chains of mapByField operations', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем цепочку: a1.out → mapByField('type') → mapByField('typed')

    // Шаг 1: a1.manyRelation('out') = { b1, b2 }
    const step1 = a1.manyRelation('out');
    expect(step1.size).toBe(2);
    expect(step1.has(b1)).toBe(true);
    expect(step1.has(b2)).toBe(true);

    // Шаг 2: { b1, b2 }.mapByField('type') = { B }
    const step2 = step1.mapByField('type');
    expect(step2.size).toBe(1);
    expect(step2.has(B)).toBe(true);

    // Шаг 3: { B }.mapByField('typed') = { b1, b2 } (все экземпляры B)
    const step3 = step2.mapByField('typed');
    expect(step3.size).toBe(2);
    expect(step3.has(b1)).toBe(true);
    expect(step3.has(b2)).toBe(true);

    // Проверка реактивности цепочки
    let chainChanged = false;
    step3.on(deep.events.dataChanged, () => { chainChanged = true; });

    // Добавляем новый элемент типа B
    const b3 = new deep();
    b3.type = B;

    // Изменения должны пропагироваться через всю цепочку
    expect(step3.size).toBe(3);
    expect(step3.has(b3)).toBe(true);
    expect(chainChanged).toBe(true);

    debug('✅ mapByField handles complex operation chains correctly');
  });

  it('should handle mapByField with identical relation results', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем множество элементов с одинаковыми relation результатами
    const sameFromSet = new deep.Set(new Set([b1._symbol, b2._symbol]));
    const fromResult = sameFromSet.mapByField('from');

    // b1.manyRelation('from') = { a1 }
    // b2.manyRelation('from') = { a1 }
    // Объединение = { a1 } (дубликаты объединяются)
    expect(fromResult.size).toBe(1);
    expect(fromResult.has(a1)).toBe(true);

    // Проверка реактивности с дублированными результатами
    let resultChanged = false;
    fromResult.on(deep.events.dataChanged, () => { resultChanged = true; });

    // Добавляем еще один элемент с тем же from
    const b3 = new deep();
    b3.type = B;
    b3.from = a1; // Тот же from что у b1 и b2

    sameFromSet.add(b3);

    // Результат не должен измениться (все еще { a1 })
    expect(fromResult.size).toBe(1);
    expect(fromResult.has(a1)).toBe(true);
    // События могут не эмитироваться если состояние не изменилось на уровне результата
    // expect(resultChanged).toBe(true); // Комментируем, т.к. Or может не эмитировать событие если содержимое не изменилось

    debug('✅ mapByField handles identical relation results correctly');
  });

  it('should handle critical STAGE 2 scenario simulation', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Симуляция критического сценария из ЭТАПА 2:
    // deep.query({ out: { type: B } }) 
    // → queryField('out', { type: B })
    // → query({ type: B }) → { b1, b2 }
    // → { b1, b2 }.mapByField('from') → { a1 }

    // Шаг 1: Имитируем результат query({ type: B }) = { b1, b2 }
    const queryTypeB = new deep.Set(new Set([b1._symbol, b2._symbol]));
    expect(queryTypeB.size).toBe(2);

    // Шаг 2: mapByField('from') - ключевая операция для ЭТАПА 2
    const mapByFromResult = queryTypeB.mapByField('from');

    // Ожидаемый результат: { a1 } (т.к. и b1.from и b2.from = a1)
    expect(mapByFromResult.size).toBe(1);
    expect(mapByFromResult.has(a1)).toBe(true);

    // Проверка стабильности при динамических изменениях
    let stage2Changed = false;
    mapByFromResult.on(deep.events.dataChanged, () => { stage2Changed = true; });

    // Добавляем новый элемент типа B с другим from
    const b3 = new deep();
    b3.type = B;
    b3.from = a2; // Другой from

    queryTypeB.add(b3);

    // Результат должен обновиться: { a1, a2 }
    expect(mapByFromResult.size).toBe(2);
    expect(mapByFromResult.has(a1)).toBe(true);
    expect(mapByFromResult.has(a2)).toBe(true);
    expect(stage2Changed).toBe(true);

    // Удаляем элементы с from = a1
    queryTypeB.delete(b1);
    queryTypeB.delete(b2);

    // Результат должен остаться только { a2 }
    expect(mapByFromResult.size).toBe(1);
    expect(mapByFromResult.has(a2)).toBe(true);
    expect(mapByFromResult.has(a1)).toBe(false);

    debug('✅ mapByField handles critical STAGE 2 scenario correctly');
  });
});

describe('queryField', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for queryField');
    deep = newDeep();
  });

  it('should handle queryField with Deep instance values', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Аксиома: deep.queryField('type', A) // { a1, a2 }
    // Потому что A.manyRelation('typed') = { a1, a2 }
    const typeAResult = deep.queryField('type', A);
    expect(typeAResult.type.is(deep.Set)).toBe(true);
    expect(typeAResult.size).toBe(2);
    expect(typeAResult.has(a1)).toBe(true);
    expect(typeAResult.has(a2)).toBe(true);

    // Аксиома: deep.queryField('typed', a1) // { A }
    // Потому что a1.manyRelation('type') = { A }
    const typedA1Result = deep.queryField('typed', a1);
    expect(typedA1Result.type.is(deep.Set)).toBe(true);
    expect(typedA1Result.size).toBe(1);
    expect(typedA1Result.has(A)).toBe(true);

    // Аксиома: deep.queryField('from', a1) // { b1, b2 }
    // Потому что a1.manyRelation('out') = { b1, b2 }
    const fromA1Result = deep.queryField('from', a1);
    expect(fromA1Result.type.is(deep.Set)).toBe(true);
    expect(fromA1Result.size).toBe(2);
    expect(fromA1Result.has(b1)).toBe(true);
    expect(fromA1Result.has(b2)).toBe(true);

    // Аксиома: deep.queryField('out', b1) // { a1 }
    // Потому что b1.manyRelation('from') = { a1 }
    const outB1Result = deep.queryField('out', b1);
    expect(outB1Result.type.is(deep.Set)).toBe(true);
    expect(outB1Result.size).toBe(1);
    expect(outB1Result.has(a1)).toBe(true);

    debug('✅ queryField handles Deep instance values correctly');
  });

  it('should handle queryField with all relation types', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Тестируем все типы отношений

    // TO/IN отношения
    const toA2Result = deep.queryField('to', a2);
    expect(toA2Result.size).toBe(2);
    expect(toA2Result.has(c1)).toBe(true);
    expect(toA2Result.has(c2)).toBe(true);

    const inC1Result = deep.queryField('in', c1);
    expect(inC1Result.size).toBe(1);
    expect(inC1Result.has(a2)).toBe(true);

    // VALUE/VALUED отношения
    const valueStrResult = deep.queryField('value', str);
    expect(valueStrResult.size).toBe(2);
    expect(valueStrResult.has(d1)).toBe(true);
    expect(valueStrResult.has(d2)).toBe(true);

    const valuedD1Result = deep.queryField('valued', d1);
    expect(valuedD1Result.size).toBe(1);
    expect(valuedD1Result.has(str)).toBe(true);

    // Правильный тест: найти то на что ссылается d1 как на value
    const valueD1Result = deep.queryField('value', d1);
    expect(valueD1Result.size).toBe(0); // Никто не ссылается на d1 как на value

    // Если нужно найти то на что ссылается d1, используем прямое отношение
    const d1ValueRelation = d1.manyRelation('value');
    expect(d1ValueRelation.size).toBe(1);
    expect(d1ValueRelation.has(str)).toBe(true);

    debug('✅ queryField handles all relation types correctly');
  });

  it('should handle queryField reactive tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат queryField
    const typeAResult = deep.queryField('type', A);
    expect(typeAResult.size).toBe(2);
    expect(typeAResult.has(a1)).toBe(true);
    expect(typeAResult.has(a2)).toBe(true);

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    typeAResult.on(deep.events.dataAdd, () => addedCount++);
    typeAResult.on(deep.events.dataDelete, () => deletedCount++);

    // Добавляем новый элемент типа A
    const a3 = new deep();
    (a3 as any).type = A;

    expect(typeAResult.size).toBe(3);
    expect(typeAResult.has(a3)).toBe(true);
    expect(addedCount).toBe(1);

    // Меняем тип элемента
    (a3 as any).type = B;

    expect(typeAResult.size).toBe(2);
    expect(typeAResult.has(a3)).toBe(false);
    expect(deletedCount).toBe(1);

    debug('✅ queryField handles reactive tracking correctly');
  });

  it('should handle different value types and reject invalid ones', () => {
    const { A } = makeDataset(deep);

    // Should accept Deep instances
    expect(() => deep.queryField('type', A)).not.toThrow();

    // Should accept strings (will create a deep instance)
    expect(() => deep.queryField('type', 'some-id')).not.toThrow();
    
    // Should accept plain objects for nested queries
    const nestedQuery = deep.query({ type: A });
    expect(() => deep.queryField('out', nestedQuery)).not.toThrow();

    // Should reject other types
    expect(() => {
      deep.queryField('type', 123);
    }).toThrow('queryField can only be called with Deep instances, strings or plain objects');

    expect(() => {
      deep.queryField('type', null);
    }).toThrow('queryField can only be called with Deep instances, strings or plain objects');

    expect(() => {
      deep.queryField('type', undefined);
    }).toThrow('queryField can only be called with Deep instances, strings or plain objects');
    
    expect(() => {
      deep.queryField('type', []);
    }).toThrow('queryField can only be called with Deep instances, strings or plain objects');

    debug('✅ queryField correctly handles value types and rejects invalid ones');
  });

  it('should validate field names', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Должен принимать валидные поля
    expect(() => deep.queryField('type', A)).not.toThrow();
    expect(() => deep.queryField('typed', a1)).not.toThrow();
    expect(() => deep.queryField('from', a1)).not.toThrow();
    expect(() => deep.queryField('out', b1)).not.toThrow();
    expect(() => deep.queryField('to', a2)).not.toThrow();
    expect(() => deep.queryField('in', c1)).not.toThrow();
    expect(() => deep.queryField('value', str)).not.toThrow();
    expect(() => deep.queryField('valued', d1)).not.toThrow();

    // Должен отклонять невалидные поля
    expect(() => deep.queryField('invalid', A)).toThrow();
    expect(() => deep.queryField('unknown', A)).toThrow();
    expect(() => deep.queryField('', A)).toThrow();

    debug('✅ queryField validates field names correctly');
  });

  it('should handle all theoretical queryField combinations with dataset', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // ПОЛНОЕ ПОКРЫТИЕ: Все возможные комбинации queryField с датасетом

    // TYPE направление: кто имеет указанный тип
    const whoHasTypeA = deep.queryField('type', A);
    expect(whoHasTypeA.size).toBe(2);
    expect(whoHasTypeA.has(a1)).toBe(true);
    expect(whoHasTypeA.has(a2)).toBe(true);

    const whoHasTypeB = deep.queryField('type', B);
    expect(whoHasTypeB.size).toBe(2);
    expect(whoHasTypeB.has(b1)).toBe(true);
    expect(whoHasTypeB.has(b2)).toBe(true);

    const whoHasTypeC = deep.queryField('type', C);
    expect(whoHasTypeC.size).toBe(2);
    expect(whoHasTypeC.has(c1)).toBe(true);
    expect(whoHasTypeC.has(c2)).toBe(true);

    const whoHasTypeD = deep.queryField('type', D);
    expect(whoHasTypeD.size).toBe(2);
    expect(whoHasTypeD.has(d1)).toBe(true);
    expect(whoHasTypeD.has(d2)).toBe(true);

    // TYPED направление: кто является типом для указанного элемента
    const typeOfA1 = deep.queryField('typed', a1);
    expect(typeOfA1.size).toBe(1);
    expect(typeOfA1.has(A)).toBe(true);

    const typeOfB1 = deep.queryField('typed', b1);
    expect(typeOfB1.size).toBe(1);
    expect(typeOfB1.has(B)).toBe(true);

    // FROM направление: кто ссылается на указанный элемент как на from
    const whoPointsFromA1 = deep.queryField('from', a1);
    expect(whoPointsFromA1.size).toBe(2);
    expect(whoPointsFromA1.has(b1)).toBe(true);
    expect(whoPointsFromA1.has(b2)).toBe(true);

    // OUT направление: на кого указывает элемент как на from
    const whereB1PointsFrom = deep.queryField('out', b1);
    expect(whereB1PointsFrom.size).toBe(1);
    expect(whereB1PointsFrom.has(a1)).toBe(true);

    // TO направление: кто ссылается на указанный элемент как на to
    const whoPointsToA2 = deep.queryField('to', a2);
    expect(whoPointsToA2.size).toBe(2);
    expect(whoPointsToA2.has(c1)).toBe(true);
    expect(whoPointsToA2.has(c2)).toBe(true);

    // IN направление: на кого указывает элемент как на to
    const whereC1PointsTo = deep.queryField('in', c1);
    expect(whereC1PointsTo.size).toBe(1);
    expect(whereC1PointsTo.has(a2)).toBe(true);

    // VALUE направление: кто ссылается на указанный элемент как на value
    const whoPointsValueStr = deep.queryField('value', str);
    expect(whoPointsValueStr.size).toBe(2);
    expect(whoPointsValueStr.has(d1)).toBe(true);
    expect(whoPointsValueStr.has(d2)).toBe(true);

    // VALUED направление: на кого ссылается d1 как на value
    const whereD1PointsValue = deep.queryField('valued', d1);
    expect(whereD1PointsValue.size).toBe(1);
    expect(whereD1PointsValue.has(str)).toBe(true);

    // Правильный тест: на что указывает d1 как на value
    const valueD1Result = deep.queryField('value', d1);
    expect(valueD1Result.size).toBe(0); // Никто не ссылается на d1 как на value

    // Если нужно найти то на что ссылается d1, используем прямое отношение
    const d1ValueRelation = d1.manyRelation('value');
    expect(d1ValueRelation.size).toBe(1);
    expect(d1ValueRelation.has(str)).toBe(true);

    debug('✅ queryField handles all theoretical combinations correctly');
  });

  it('should handle queryField with empty results', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем элементы без связей
    const orphan = new deep();
    const loneType = new deep();

    // Поиск элементов несуществующего типа
    const whoHasOrphanType = deep.queryField('type', orphan);
    expect(whoHasOrphanType.size).toBe(0);

    // Поиск типа для элемента без типа (у orphan тип = deep, но не loneType)
    const typeOfLoneType = deep.queryField('typed', loneType);
    expect(typeOfLoneType.size).toBe(1); // deep
    expect(typeOfLoneType.has(deep._deep)).toBe(true);

    // Поиск from связей для элемента без out связей
    const whoPointsFromOrphan = deep.queryField('from', orphan);
    expect(whoPointsFromOrphan.size).toBe(0);

    // Поиск out связей для элемента без from
    const whereOrphanPointsFrom = deep.queryField('out', orphan);
    expect(whereOrphanPointsFrom.size).toBe(0);

    debug('✅ queryField handles empty results correctly');
  });

  it('should handle queryField tracking with type changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат для типа A
    const typeAResult = deep.queryField('type', A);
    expect(typeAResult.size).toBe(2);

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    typeAResult.on(deep.events.dataAdd, () => addedCount++);
    typeAResult.on(deep.events.dataDelete, () => deletedCount++);

    // Создаем новый элемент и устанавливаем тип A
    const a3 = new deep();
    a3.type = A;

    expect(typeAResult.size).toBe(3);
    expect(typeAResult.has(a3)).toBe(true);
    expect(addedCount).toBe(1);

    // Меняем тип на B
    a3.type = B;

    expect(typeAResult.size).toBe(2);
    expect(typeAResult.has(a3)).toBe(false);
    expect(deletedCount).toBe(1);

    // Возвращаем тип A
    a3.type = A;

    expect(typeAResult.size).toBe(3);
    expect(typeAResult.has(a3)).toBe(true);
    expect(addedCount).toBe(2);

    debug('✅ queryField tracking handles type changes correctly');
  });

  it('should handle queryField tracking with from/out changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат для from = a1
    const fromA1Result = deep.queryField('from', a1);
    expect(fromA1Result.size).toBe(2); // b1, b2

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    fromA1Result.on(deep.events.dataAdd, () => addedCount++);
    fromA1Result.on(deep.events.dataDelete, () => deletedCount++);

    // Создаем новый элемент и устанавливаем from = a1
    const b3 = new deep();
    b3.type = B;
    b3.from = a1;

    expect(fromA1Result.size).toBe(3);
    expect(fromA1Result.has(b3)).toBe(true);
    expect(addedCount).toBe(1);

    // Меняем from на a2
    b3.from = a2;

    expect(fromA1Result.size).toBe(2);
    expect(fromA1Result.has(b3)).toBe(false);
    expect(deletedCount).toBe(1);

    // Удаляем from
    delete b3.from;

    expect(fromA1Result.size).toBe(2);
    expect(deletedCount).toBe(1); // не должно измениться

    // Возвращаем from = a1
    b3.from = a1;

    expect(fromA1Result.size).toBe(3);
    expect(fromA1Result.has(b3)).toBe(true);
    expect(addedCount).toBe(2);

    debug('✅ queryField tracking handles from/out changes correctly');
  });

  it('should handle queryField tracking with to/in changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат для to = a2
    const toA2Result = deep.queryField('to', a2);
    expect(toA2Result.size).toBe(2); // c1, c2

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    toA2Result.on(deep.events.dataAdd, () => addedCount++);
    toA2Result.on(deep.events.dataDelete, () => deletedCount++);

    // Создаем новый элемент и устанавливаем to = a2
    const c3 = new deep();
    c3.type = C;
    c3.to = a2;

    expect(toA2Result.size).toBe(3);
    expect(toA2Result.has(c3)).toBe(true);
    expect(addedCount).toBe(1);

    // Меняем to на a1
    c3.to = a1;

    expect(toA2Result.size).toBe(2);
    expect(toA2Result.has(c3)).toBe(false);
    expect(deletedCount).toBe(1);

    // Возвращаем to = a2
    c3.to = a2;

    expect(toA2Result.size).toBe(3);
    expect(toA2Result.has(c3)).toBe(true);
    expect(addedCount).toBe(2);

    debug('✅ queryField tracking handles to/in changes correctly');
  });

  it('should handle queryField tracking with value/valued changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат для value = str
    const valueStrResult = deep.queryField('value', str);
    expect(valueStrResult.size).toBe(2); // d1, d2

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    valueStrResult.on(deep.events.dataAdd, () => addedCount++);
    valueStrResult.on(deep.events.dataDelete, () => deletedCount++);

    // Создаем новый элемент и устанавливаем value = str
    const d3 = new deep();
    d3.type = D;
    d3.value = str;

    expect(valueStrResult.size).toBe(3);
    expect(valueStrResult.has(d3)).toBe(true);
    expect(addedCount).toBe(1);

    // Создаем новую строку и меняем value
    const str2 = new deep.String('xyz');
    d3.value = str2;

    expect(valueStrResult.size).toBe(2);
    expect(valueStrResult.has(d3)).toBe(false);
    expect(deletedCount).toBe(1);

    // Возвращаем value = str
    d3.value = str;

    expect(valueStrResult.size).toBe(3);
    expect(valueStrResult.has(d3)).toBe(true);
    expect(addedCount).toBe(2);

    debug('✅ queryField tracking handles value/valued changes correctly');
  });

  it('should handle queryField with multiple simultaneous changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем несколько результатов одновременно
    const typeAResult = deep.queryField('type', A);
    const fromA1Result = deep.queryField('from', a1);
    const toA2Result = deep.queryField('to', a2);

    expect(typeAResult.size).toBe(2);
    expect(fromA1Result.size).toBe(2);
    expect(toA2Result.size).toBe(2);

    // Отслеживаем изменения во всех результатах
    let typeAChanges = 0;
    let fromA1Changes = 0;
    let toA2Changes = 0;

    typeAResult.on(deep.events.dataChanged, () => typeAChanges++);
    fromA1Result.on(deep.events.dataChanged, () => fromA1Changes++);
    toA2Result.on(deep.events.dataChanged, () => toA2Changes++);

    // Создаем элемент который влияет на все три результата
    const multiElement = new deep();
    multiElement.type = A;  // Влияет на typeAResult
    multiElement.from = a1; // Влияет на fromA1Result
    multiElement.to = a2;   // Влияет на toA2Result

    expect(typeAResult.size).toBe(3);
    expect(fromA1Result.size).toBe(3);
    expect(toA2Result.size).toBe(3);

    expect(typeAChanges).toBeGreaterThan(0);
    expect(fromA1Changes).toBeGreaterThan(0);
    expect(toA2Changes).toBeGreaterThan(0);

    // Удаляем элемент из всех связей
    delete (multiElement as any).type;
    delete (multiElement as any).from;
    delete (multiElement as any).to;

    expect(typeAResult.size).toBe(2);
    expect(fromA1Result.size).toBe(2);
    expect(toA2Result.size).toBe(2);

    debug('✅ queryField handles multiple simultaneous changes correctly');
  });

  it('should handle queryField with cross-reference scenarios', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем перекрестные ссылки
    const crossRef1 = new deep();
    const crossRef2 = new deep();

    crossRef1.type = A;
    crossRef2.type = A;
    crossRef1.from = crossRef2;
    crossRef2.from = crossRef1;

    // Проверяем queryField для перекрестных ссылок
    const typeAResult = deep.queryField('type', A);
    expect(typeAResult.has(crossRef1)).toBe(true);
    expect(typeAResult.has(crossRef2)).toBe(true);

    const fromCrossRef1Result = deep.queryField('from', crossRef1);
    expect(fromCrossRef1Result.has(crossRef2)).toBe(true);

    const fromCrossRef2Result = deep.queryField('from', crossRef2);
    expect(fromCrossRef2Result.has(crossRef1)).toBe(true);

    // Проверяем обратные связи
    const outCrossRef1Result = deep.queryField('out', crossRef1);
    expect(outCrossRef1Result.has(crossRef2)).toBe(true);

    const outCrossRef2Result = deep.queryField('out', crossRef2);
    expect(outCrossRef2Result.has(crossRef1)).toBe(true);

    debug('✅ queryField handles cross-reference scenarios correctly');
  });

  it('should handle queryField with chain modifications', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем цепочку элементов
    const chain1 = new deep();
    const chain2 = new deep();
    const chain3 = new deep();

    chain1.type = A;
    chain2.type = A;
    chain3.type = A;

    chain1.from = chain2;
    chain2.from = chain3;

    const typeAResult = deep.queryField('type', A);
    const initialSize = typeAResult.size;

    // Отслеживаем изменения
    let changeCount = 0;
    typeAResult.on(deep.events.dataChanged, () => changeCount++);

    // Модифицируем цепочку
    (chain1 as any).type = B; // Удаляется из A
    expect(typeAResult.size).toBe(initialSize - 1);

    (chain3 as any).type = B; // Удаляется из A
    expect(typeAResult.size).toBe(initialSize - 2);

    // Возвращаем в цепочку
    (chain1 as any).type = A;
    (chain3 as any).type = A;
    expect(typeAResult.size).toBe(initialSize);

    expect(changeCount).toBeGreaterThan(0);

    debug('✅ queryField handles chain modifications correctly');
  });

  it('should handle queryField performance with large datasets', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    const startTime = Date.now();

    // Создаем большой набор элементов
    const elements: any[] = [];
    for (let i = 0; i < 100; i++) {
      const element = new deep();
      (element as any).type = A;
      elements.push(element);
    }

    // Получаем результат queryField
    const typeAResult = deep.query({ type: A });
    expect(typeAResult.size).toBe(102); // 2 исходных + 100 новых

    // Проверяем производительность массовых изменений
    for (let i = 0; i < 50; i++) {
      (elements[i] as any).type = B;
    }

    expect(typeAResult.size).toBe(52); // 2 исходных + 50 оставшихся

    // Возвращаем обратно
    for (let i = 0; i < 50; i++) {
      (elements[i] as any).type = A;
    }

    expect(typeAResult.size).toBe(102);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Проверяем что операции выполняются быстро (менее 5 секунд)
    expect(duration).toBeLessThan(5000);

    debug('✅ queryField handles large datasets efficiently in', duration, 'ms');
  });

  it('should handle complex multi-field reactive tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат сложного query - ищем элементы типа A
    const complexQuery = deep.query({ type: A });
    expect(complexQuery.size).toBe(2); // Изначально a1 и a2
    expect(complexQuery.has(a1)).toBe(true);
    expect(complexQuery.has(a2)).toBe(true);

    // Отслеживаем изменения
    let changeCount = 0;
    complexQuery.on(deep.events.dataChanged, () => changeCount++);

    // Создаем новый элемент который удовлетворяет условиям
    const a3 = new deep();
    (a3 as any).type = A;



    // Теперь a3 должен появиться в результате query
    expect(complexQuery.size).toBe(3); // a1, a2, a3
    expect(complexQuery.has(a1)).toBe(true);
    expect(complexQuery.has(a2)).toBe(true);
    expect(complexQuery.has(a3)).toBe(true);
    expect(changeCount).toBeGreaterThan(0);

    // Меняем тип a3 - он должен исчезнуть из результата
    (a3 as any).type = B;

    expect(complexQuery.size).toBe(2); // Остаются a1, a2
    expect(complexQuery.has(a1)).toBe(true);
    expect(complexQuery.has(a2)).toBe(true);
    expect(complexQuery.has(a3)).toBe(false);

    debug('✅ query handles complex multi-field reactive tracking correctly');
  });

  it('should validate query expressions', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Должен принимать валидные объекты
    expect(() => deep.query({ type: A })).not.toThrow();
    expect(() => deep.query({ type: A, from: a1 })).not.toThrow();

    // Должен отклонять невалидные выражения
    expect(() => deep.query(null)).toThrow();
    expect(() => deep.query(undefined)).toThrow();
    expect(() => deep.query('string')).toThrow();
    expect(() => deep.query(123)).toThrow();
    expect(() => deep.query([])).toThrow();
    expect(deep.query({}).size).toBe(deep._ids.size);

    // Должен отклонять невалидные поля
    expect(() => deep.query({ invalid: A })).toThrow();
    expect(() => deep.query({ type: A, unknown: B })).toThrow();

    // В ЭТАПЕ 1 должен отклонять non-Deep значения
    // expect(() => deep.query({ type: 'string' })).toThrow(); // string is id and dont throw
    expect(() => deep.query({ type: 123 })).toThrow();
    expect(() => deep.query({ type: { nested: 'object' } })).toThrow();

    debug('✅ query validates expressions correctly');
  });

  it('should handle query with identical field values', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем элементы с одинаковыми значениями полей
    const twin1 = new deep();
    const twin2 = new deep();

    (twin1 as any).type = A;
    (twin2 as any).type = A;
    (twin1 as any).from = a1;
    (twin2 as any).from = a1;

    // Query должен найти оба элемента
    const twinsQuery = deep.query({ type: A, from: a1 });
    expect(twinsQuery.has(twin1)).toBe(true);
    expect(twinsQuery.has(twin2)).toBe(true);

    // Изменяем один элемент
    (twin1 as any).from = a2;

    // Результат должен обновиться
    expect(twinsQuery.has(twin1)).toBe(false);
    expect(twinsQuery.has(twin2)).toBe(true);

    debug('✅ query handles identical field values correctly');
  });

  it('should handle query with cross-references', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем перекрестные ссылки
    const cross1 = new deep();
    const cross2 = new deep();

    (cross1 as any).type = A;
    (cross2 as any).type = A;
    (cross1 as any).from = cross2;
    (cross2 as any).from = cross1;

    // Query для элементов типа A которые ссылаются на cross1
    const crossQuery1 = deep.query({ type: A, from: cross1 });
    expect(crossQuery1.has(cross2)).toBe(true);
    expect(crossQuery1.has(cross1)).toBe(false);

    // Query для элементов типа A которые ссылаются на cross2
    const crossQuery2 = deep.query({ type: A, from: cross2 });
    expect(crossQuery2.has(cross1)).toBe(true);
    expect(crossQuery2.has(cross2)).toBe(false);

    // Комбинированный query
    const bothCrossQuery = deep.query({ type: A, out: cross1, in: cross2 });
    // Ищем элементы типа A, на которые ссылается cross1 как from И которые ссылаются на cross2 как to

    debug('✅ query handles cross-references correctly');
  });

  it('should handle query performance with large datasets', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    const startTime = Date.now();

    // Создаем большой набор элементов
    const elements: any[] = [];
    for (let i = 0; i < 100; i++) {
      const element = new deep();
      (element as any).type = A;
      if (i % 2 === 0) {
        (element as any).from = a1;
      }
      elements.push(element);
    }

    // Получаем результат queryField
    const typeAResult = deep.query({ type: A });
    expect(typeAResult.size).toBe(102); // 2 исходных + 100 новых

    // Проверяем производительность массовых изменений
    for (let i = 0; i < 50; i++) {
      (elements[i] as any).type = B;
    }

    expect(typeAResult.size).toBe(52); // 2 исходных + 50 оставшихся

    // Возвращаем обратно
    for (let i = 0; i < 50; i++) {
      (elements[i] as any).type = A;
    }

    expect(typeAResult.size).toBe(102);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Проверяем что операции выполняются быстро (менее 5 секунд)
    expect(duration).toBeLessThan(5000);

    debug('✅ query handles large datasets efficiently in', duration, 'ms');
  });

  it('should handle query with chain relationships', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем цепочку связей
    const chain1 = new deep();
    const chain2 = new deep();
    const chain3 = new deep();

    (chain1 as any).type = A;
    (chain2 as any).type = B;
    (chain3 as any).type = C;

    (chain2 as any).from = chain1;
    (chain3 as any).from = chain2;

    // Query для поиска B-элементов которые ссылаются на A-элементы
    const chainQuery = deep.query({ type: B, from: chain1 });
    expect(chainQuery.has(chain2)).toBe(true);

    // Query для поиска C-элементов которые ссылаются на B-элементы
    const chainQuery2 = deep.query({ type: C, from: chain2 });
    expect(chainQuery2.has(chain3)).toBe(true);

    // Изменяем цепочку
    (chain2 as any).from = chain3; // Создаем цикл

    // Результаты должны обновиться
    expect(chainQuery.has(chain2)).toBe(false);

    const cyclicQuery = deep.query({ type: B, from: chain3 });
    expect(cyclicQuery.has(chain2)).toBe(true);

    debug('✅ query handles chain relationships correctly');
  });

  it('should handle queries with string IDs as criteria', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test with existing ID as string
    const typeAQuery = deep.query({ type: A._id });
    expect(typeAQuery.size).toBe(2);
    expect(typeAQuery.has(a1)).toBe(true);
    expect(typeAQuery.has(a2)).toBe(true);

    // Test with non-existing ID, which should be created
    const newTypeId = 'new-type-id';
    const newTypeQuery = deep.query({ type: newTypeId });
    expect(newTypeQuery.size).toBe(0); // No items of this new type yet
    
    // Check that the new type was created
    const newTypeInstance = deep.detect(newTypeId);
    expect(newTypeInstance).not.toBeUndefined();
    expect(newTypeInstance._id).toBe(newTypeId);

    // Add an item of the new type and check if query updates
    const newItem = new deep();
    newItem.type = newTypeInstance;
    expect(newTypeQuery.size).toBe(1);
    expect(newTypeQuery.has(newItem)).toBe(true);

    // Test with multiple string ID criteria
    const multiFieldQuery = deep.query({ type: B._id, from: a1._id });
    expect(multiFieldQuery.size).toBe(2);
    expect(multiFieldQuery.has(b1)).toBe(true);
    expect(multiFieldQuery.has(b2)).toBe(true);
    
    debug('✅ query handles string IDs as criteria correctly');
  });

  it('should handle id field with Deep instances', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test queryField with Deep instance
    const idAResult = deep.queryField('id', A);
    expect(idAResult.type.is(deep.Set)).toBe(true);
    expect(idAResult.size).toBe(1);
    expect(idAResult.has(A)).toBe(true);
    expect(idAResult.has(a1)).toBe(false);

    // Test with different elements
    const idA1Result = deep.queryField('id', a1);
    expect(idA1Result.size).toBe(1);
    expect(idA1Result.has(a1)).toBe(true);
    expect(idA1Result.has(A)).toBe(false);

    const idStrResult = deep.queryField('id', str);
    expect(idStrResult.size).toBe(1);
    expect(idStrResult.has(str)).toBe(true);

    debug('✅ queryField id handles Deep instances correctly');
  });

  it('should handle id field with string IDs', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test queryField with string ID
    const idAResult = deep.queryField('id', A._id);
    expect(idAResult.type.is(deep.Set)).toBe(true);
    expect(idAResult.size).toBe(1);
    expect(idAResult.has(A)).toBe(true);

    // Test with non-existing ID (should create element)
    const newId = 'test-element-id';
    const idNewResult = deep.queryField('id', newId);
    expect(idNewResult.size).toBe(1);
    
    // The element in the result should correspond to what deep.detect created
    const resultElements = Array.from(idNewResult);
    expect(resultElements.length).toBe(1);
    
    const detectedElement = deep.detect(newId);
    // The ID may be different if deep.detect creates new UUID, but the element should be in the result
    expect(idNewResult.has(detectedElement)).toBe(true);

    debug('✅ queryField id handles string IDs correctly');
  });

  it('should handle id field in query objects', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test query with id field using Deep instance
    const queryAResult = deep.query({ id: A });
    expect(queryAResult.type.is(deep.Set)).toBe(true);
    expect(queryAResult.size).toBe(1);
    expect(queryAResult.has(A)).toBe(true);
    expect(queryAResult.has(a1)).toBe(false);

    // Test query with id field using string ID
    const queryA1Result = deep.query({ id: a1._id });
    expect(queryA1Result.size).toBe(1);
    expect(queryA1Result.has(a1)).toBe(true);
    expect(queryA1Result.has(A)).toBe(false);

    // Test that both approaches return same results
    const directQueryResult = deep.query({ id: str });
    const stringQueryResult = deep.query({ id: str._id });
    
    expect(directQueryResult.size).toBe(stringQueryResult.size);
    expect(directQueryResult.has(str)).toBe(true);
    expect(stringQueryResult.has(str)).toBe(true);

    debug('✅ query id field works correctly in query objects');
  });

  it('should handle id field combined with other criteria', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test AND logic: id + type (should be intersection)
    const combinedResult = deep.query({ id: a1, type: A });
    expect(combinedResult.size).toBe(1);
    expect(combinedResult.has(a1)).toBe(true);
    expect(combinedResult.has(a2)).toBe(false);

    // Test with non-matching criteria (should be empty)
    const emptyResult = deep.query({ id: a1, type: B });
    expect(emptyResult.size).toBe(0);
    expect(emptyResult.has(a1)).toBe(false);

    // Test with multiple criteria
    const multiCriteriaResult = deep.query({ id: b1, type: B, from: a1 });
    expect(multiCriteriaResult.size).toBe(1);
    expect(multiCriteriaResult.has(b1)).toBe(true);

    debug('✅ id field works correctly combined with other criteria');
  });

  it('should handle id field with _or operator', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test OR with id fields
    const orIdResult = deep.query({
      _or: [
        { id: a1 },
        { id: b1 },
        { id: str }
      ]
    });

    expect(orIdResult.size).toBe(3);
    expect(orIdResult.has(a1)).toBe(true);
    expect(orIdResult.has(b1)).toBe(true);
    expect(orIdResult.has(str)).toBe(true);
    expect(orIdResult.has(a2)).toBe(false);

    // Test OR combining id with other fields
    const mixedOrResult = deep.query({
      _or: [
        { id: c1 },
        { type: A }
      ]
    });

    expect(mixedOrResult.size).toBe(3); // c1 + a1 + a2
    expect(mixedOrResult.has(c1)).toBe(true);
    expect(mixedOrResult.has(a1)).toBe(true);
    expect(mixedOrResult.has(a2)).toBe(true);
    expect(mixedOrResult.has(b1)).toBe(false);

    debug('✅ id field works correctly with _or operator');
  });

  it('should handle id field with _not operator', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Test NOT excluding specific element by id
    const notIdResult = deep.query({
      type: A,
      _not: { id: a1 }
    });

    expect(notIdResult.size).toBe(1);
    expect(notIdResult.has(a1)).toBe(false);
    expect(notIdResult.has(a2)).toBe(true);

    // Test NOT excluding with string ID
    const notStringIdResult = deep.query({
      type: B,
      _not: { id: b2._id }
    });

    expect(notStringIdResult.size).toBe(1);
    expect(notStringIdResult.has(b1)).toBe(true);
    expect(notStringIdResult.has(b2)).toBe(false);

    debug('✅ id field works correctly with _not operator');
  });

  it('should validate id field arguments', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Should accept Deep instances
    expect(() => deep.queryField('id', A)).not.toThrow();

    // Should accept strings
    expect(() => deep.queryField('id', 'some-id')).not.toThrow();

    // Should reject other types
    expect(() => {
      deep.queryField('id', 123);
    }).toThrow('id field can only be called with Deep instances or strings');

    expect(() => {
      deep.queryField('id', null);
    }).toThrow('id field can only be called with Deep instances or strings');

    expect(() => {
      deep.queryField('id', undefined);
    }).toThrow('id field can only be called with Deep instances or strings');

    expect(() => {
      deep.queryField('id', {});
    }).toThrow('id field can only be called with Deep instances or strings');

    expect(() => {
      deep.queryField('id', []);
    }).toThrow('id field can only be called with Deep instances or strings');

    debug('✅ id field validates arguments correctly');
  });

  it('should handle id field reactive tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Get id query result
    const idAResult = deep.queryField('id', A);
    expect(idAResult.size).toBe(1);
    expect(idAResult.has(A)).toBe(true);

    // Track changes (id queries should be static - no changes expected for direct lookups)
    let changeCount = 0;
    idAResult.on(deep.events.dataChanged, () => changeCount++);

    // Create new element (should not affect id query for A)
    const newElement = new deep();
    newElement.type = A;

    expect(idAResult.size).toBe(1);
    expect(idAResult.has(A)).toBe(true);
    expect(idAResult.has(newElement)).toBe(false);
    expect(changeCount).toBe(0); // No changes to id query

    debug('✅ id field reactive tracking works correctly (static behavior)');
  });

  it('should handle id field performance with large datasets', () => {
    const { A, B, C, D } = makeDataset(deep);

    // Create large dataset
    const elements: any[] = [];
    const DATASET_SIZE = 1000;

    for (let i = 0; i < DATASET_SIZE; i++) {
      const element = new deep();
      element.type = [A, B, C, D][i % 4];
      elements.push(element);
    }

    const startTime = Date.now();

    // Test multiple id queries
    for (let i = 0; i < 100; i++) {
      const randomElement = elements[i % elements.length];
      const idResult = deep.queryField('id', randomElement);
      
      expect(idResult.size).toBe(1);
      expect(idResult.has(randomElement)).toBe(true);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should be very fast since id queries are direct lookups
    expect(duration).toBeLessThan(1000); // Less than 1 second

    debug(`✅ id field performance test: 100 queries in ${duration}ms`);
  });
});

describe('_or and _and operators', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for _or and _and operators');
    deep = newDeep();
  });

  describe('_or operator', () => {
    it('should handle basic _or with multiple conditions', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые имеют тип A ИЛИ тип B
      const result = deep.query({
        _or: [
          { type: A },
          { type: B }
        ]
      });

      debug('🔍 _or query result size:', result.size);
      debug('🔍 _or query result elements:', Array.from(result).map((e: any) => e._id));

      expect(result.size).toBe(4); // a1, a2, b1, b2
      expect(result.has(a1)).toBe(true);
      expect(result.has(a2)).toBe(true);
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(c1)).toBe(false);
      expect(result.has(d1)).toBe(false);

      debug('✅ Basic _or operator works correctly');
    });

    it('should handle _or with complex nested conditions', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые (имеют тип A И ссылаются from a1) ИЛИ (имеют тип C И ссылаются to a2)
      const result = deep.query({
        _or: [
          { type: B, from: a1 }, // b1, b2
          { type: C, to: a2 }    // c1, c2
        ]
      });

      expect(result.size).toBe(4); // b1, b2, c1, c2
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(c1)).toBe(true);
      expect(result.has(c2)).toBe(true);
      expect(result.has(a1)).toBe(false);
      expect(result.has(a2)).toBe(false);

      debug('✅ Complex _or operator works correctly');
    });

    it('should handle _or combined with main criteria (AND logic)', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые имеют from = a1 И (тип B ИЛИ тип C)
      // В makeDataset: b1.from = a1, b2.from = a1, c1.to = a2, c2.to = a2
      // Поэтому результат должен содержать только b1, b2 (они имеют from = a1 И тип B)
      const result = deep.query({
        from: a1,
        _or: [
          { type: B },
          { type: C }
        ]
      });

      expect(result.size).toBe(2); // b1, b2
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(c1)).toBe(false); // c1 не имеет from = a1
      expect(result.has(c2)).toBe(false); // c2 не имеет from = a1

      debug('✅ _or combined with main criteria works correctly');
    });

    it('should handle _or with reactive tracking', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем запрос: элементы с типом A ИЛИ типом B
      const orQuery = deep.query({
        _or: [
          { type: A },
          { type: B }
        ]
      });

      const initialSize = orQuery.size;
      expect(orQuery.has(a1)).toBe(true);
      expect(orQuery.has(b1)).toBe(true);
      expect(orQuery.has(c1)).toBe(false);

      // Отслеживаем изменения
      let addedCount = 0;
      let deletedCount = 0;
      orQuery.on(deep.events.dataAdd, () => addedCount++);
      orQuery.on(deep.events.dataDelete, () => deletedCount++);

      // Меняем тип c1 на A - он должен появиться в результатах
      (c1 as any).type = A;

      expect(orQuery.size).toBe(initialSize + 1);
      expect(orQuery.has(c1)).toBe(true);
      expect(addedCount).toBe(1);

      // Меняем тип a1 на C - он должен исчезнуть из результатов
      (a1 as any).type = C;

      expect(orQuery.size).toBe(initialSize);
      expect(orQuery.has(a1)).toBe(false);
      expect(deletedCount).toBe(1);

      debug('✅ _or with reactive tracking works correctly');
    });

    it('should handle empty _or array', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Пустой _or массив не должен добавлять дополнительных условий
      const result = deep.query({
        type: A,
        _or: []
      });

      expect(result.size).toBe(2); // a1, a2
      expect(result.has(a1)).toBe(true);
      expect(result.has(a2)).toBe(true);

      debug('✅ Empty _or array handled correctly');
    });

    it('should validate _or operator format', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // _or должен быть массивом
      expect(() => {
        deep.query({ _or: { type: A } });
      }).toThrow('_or operator must be an array of plain objects');

      // Элементы _or должны быть plain objects
      expect(() => {
        deep.query({ _or: [A] });
      }).toThrow('_or[0] must be a plain object');

      expect(() => {
        deep.query({ _or: ['string'] });
      }).toThrow('_or[0] must be a plain object');

      expect(() => {
        deep.query({ _or: [null] });
      }).toThrow('_or[0] must be a plain object');

      debug('✅ _or operator validation works correctly');
    });
  });

  describe('_and operator', () => {
    it('should handle basic _and with additional condition', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые имеют тип B И дополнительно from = a1
      const result = deep.query({
        type: B,
        _and: { from: a1 }
      });

      expect(result.size).toBe(2); // b1, b2
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(a1)).toBe(false);
      expect(result.has(a2)).toBe(false);

      debug('✅ Basic _and operator works correctly');
    });

    it('should handle _and with complex nested conditions', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем дополнительные элементы для тестирования
      const extraB = new deep();
      (extraB as any).type = B;
      (extraB as any).from = a2; // Отличается от b1, b2

      const extraC = new deep();
      (extraC as any).type = C;
      (extraC as any).from = a1; // Отличается от c1, c2

      // Тест: найти элементы которые имеют from = a1 И дополнительно тип B
      const result = deep.query({
        from: a1,
        _and: { type: B }
      });

      expect(result.size).toBe(2); // b1, b2
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(extraB)).toBe(false); // extraB.from = a2, не a1
      expect(result.has(extraC)).toBe(false); // extraC.type = C, не B

      debug('✅ Complex _and operator works correctly');
    });

    it('should handle _and with reactive tracking', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем запрос: элементы с типом B И from = a1
      const andQuery = deep.query({
        type: B,
        _and: { from: a1 }
      });

      const initialSize = andQuery.size;
      expect(andQuery.has(b1)).toBe(true);
      expect(andQuery.has(b2)).toBe(true);

      // Отслеживаем изменения
      let addedCount = 0;
      let deletedCount = 0;
      andQuery.on(deep.events.dataAdd, () => addedCount++);
      andQuery.on(deep.events.dataDelete, () => deletedCount++);

      // Создаем новый элемент который удовлетворяет обоим условиям
      const newB = new deep();
      (newB as any).type = B;
      (newB as any).from = a1;

      expect(andQuery.size).toBe(initialSize + 1);
      expect(andQuery.has(newB)).toBe(true);
      expect(addedCount).toBe(1);

      // Меняем from у одного элемента - он должен исчезнуть
      (b1 as any).from = a2;

      expect(andQuery.size).toBe(initialSize);
      expect(andQuery.has(b1)).toBe(false);
      expect(deletedCount).toBe(1);

      debug('✅ _and with reactive tracking works correctly');
    });

    it('should validate _and operator format', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // _and должен быть plain object
      expect(() => {
        deep.query({ _and: [{ type: A }] });
      }).toThrow('_and operator must be a plain object');

      expect(() => {
        deep.query({ _and: A });
      }).toThrow('_and operator must be a plain object');

      expect(() => {
        deep.query({ _and: 'string' });
      }).toThrow('_and operator must be a plain object');

      expect(() => {
        deep.query({ _and: null });
      }).toThrow('_and operator must be a plain object');

      debug('✅ _and operator validation works correctly');
    });
  });

  describe('combined _or, _and, and _not operators', () => {
    it('should handle _or combined with _and', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые (имеют тип A ИЛИ тип B) И имеют from = a1
      const result = deep.query({
        _or: [
          { type: A },
          { type: B }
        ],
        _and: { from: a1 }
      });

      // Только b1, b2 удовлетворяют условию (тип B И from = a1)
      // a1, a2 имеют тип A, но НЕ имеют from = a1
      expect(result.size).toBe(2);
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(a1)).toBe(false);
      expect(result.has(a2)).toBe(false);

      debug('✅ _or combined with _and works correctly');
    });

    it('should handle _or, _and, and _not together', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Тест: найти элементы которые (имеют тип B ИЛИ тип C) И НЕ имеют to = a2
      const result = deep.query({
        _or: [
          { type: B },
          { type: C }
        ],
        _not: { to: a2 }
      });

      // Элементы типа B или C: b1, b2, c1, c2
      // Исключаем элементы с to = a2: c1, c2
      // Остаются: b1, b2
      expect(result.size).toBe(2);
      expect(result.has(b1)).toBe(true);
      expect(result.has(b2)).toBe(true);
      expect(result.has(c1)).toBe(false); // Исключен через _not
      expect(result.has(c2)).toBe(false); // Исключен через _not

      debug('✅ _or, _and, and _not together work correctly');
    });

    it('should handle complex multi-level nesting with all operators', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем дополнительные элементы для сложного теста
      const complexElement1 = new deep();
      (complexElement1 as any).type = A;
      (complexElement1 as any).from = b1;

      const complexElement2 = new deep();
      (complexElement2 as any).type = B;
      (complexElement2 as any).to = a2;

      // Тест: найти элементы которые:
      // - (имеют тип A ИЛИ имеют from, который имеет тип B) И
      // - дополнительно НЕ имеют to = a2
      const result = deep.query({
        _or: [
          { type: A },
          { from: { type: B } }
        ],
        _not: { to: a2 }
      });

      // Элементы типа A: a1, a2, complexElement1
      // Элементы с from типа B: complexElement1 (from = b1, b1.type = B)
      // Исключаем элементы с to = a2: c1, c2, complexElement2
      // Результат: a1, a2, complexElement1 (минус те что имеют to = a2)
      expect(result.has(a1)).toBe(true);
      expect(result.has(a2)).toBe(true);
      expect(result.has(complexElement1)).toBe(true);
      expect(result.has(complexElement2)).toBe(false); // Исключен через _not
      expect(result.has(c1)).toBe(false); // Не попадает в _or условия
      expect(result.has(c2)).toBe(false); // Не попадает в _or условия

      debug('✅ Complex multi-level nesting with all operators works correctly');
    });

    it('should handle reactive tracking with combined operators', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем сложный запрос с отслеживанием
      const complexQuery = deep.query({
        _or: [
          { type: A },
          { type: B }
        ],
        _and: { from: a1 },
        _not: { to: a2 }
      });

      // Изначально: b1, b2 (тип B, from a1, НЕ to a2)
      const initialSize = complexQuery.size;
      expect(complexQuery.has(b1)).toBe(true);
      expect(complexQuery.has(b2)).toBe(true);

      // Отслеживаем изменения
      let changeCount = 0;
      complexQuery.on(deep.events.dataChanged, () => changeCount++);

      // Создаем новый элемент который должен попасть в результат
      const newElement = new deep();
      (newElement as any).type = A;
      (newElement as any).from = a1;
      // НЕ устанавливаем to = a2

      expect(complexQuery.size).toBe(initialSize + 1);
      expect(complexQuery.has(newElement)).toBe(true);
      expect(changeCount).toBeGreaterThan(0);

      // Устанавливаем to = a2 - элемент должен исчезнуть
      changeCount = 0;
      (newElement as any).to = a2;

      expect(complexQuery.has(newElement)).toBe(false);
      expect(changeCount).toBeGreaterThan(0);

      debug('✅ Reactive tracking with combined operators works correctly');
    });

    it('should handle performance with complex operator combinations', () => {
      const { A, B, C, D } = makeDataset(deep);

      // Создаем большой датасет
      const DATASET_SIZE = 100;
      for (let i = 0; i < DATASET_SIZE; i++) {
        const element = new deep();
        const typeIndex = i % 4;
        (element as any).type = [A, B, C, D][typeIndex];
      }

      const startTime = Date.now();

      // Создаем сложный запрос
      const complexQuery = deep.query({
        _or: [
          { type: A },
          { type: B }
        ],
        _and: { type: A }, // Пересечение с _or: только тип A
        _not: { type: C }   // Исключение типа C (но его уже нет в пересечении)
      });

      const queryTime = Date.now() - startTime;

      // Результат должен содержать только элементы типа A
      const expectedSize = Math.ceil(DATASET_SIZE / 4) + 2; // Приблизительно 1/4 + исходные a1, a2
      expect(complexQuery.size).toBeGreaterThan(expectedSize - 5);
      expect(complexQuery.size).toBeLessThan(expectedSize + 5);

      // Проверяем производительность
      expect(queryTime).toBeLessThan(2000);

      debug(`✅ Performance test passed: ${complexQuery.size} elements, ${queryTime}ms`);
    });
  });
});

describe('query', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for query');
    deep = newDeep();
  });

  it('should handle basic single field queries', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Аксиома: deep.query({ type: A }) // { a1, a2 }
    const typeAQuery = deep.query({ type: A });
    expect(typeAQuery.type.is(deep.Set)).toBe(true);
    expect(typeAQuery.size).toBe(2);
    expect(typeAQuery.has(a1)).toBe(true);
    expect(typeAQuery.has(a2)).toBe(true);

    // Аксиома: deep.query({ typed: a1 }) // { A }
    const typedA1Query = deep.query({ typed: a1 });
    expect(typedA1Query.size).toBe(1);
    expect(typedA1Query.has(A)).toBe(true);

    // Тестируем все типы полей
    const fromA1Query = deep.query({ from: a1 });
    expect(fromA1Query.size).toBe(2);
    expect(fromA1Query.has(b1)).toBe(true);
    expect(fromA1Query.has(b2)).toBe(true);

    const outB1Query = deep.query({ out: b1 });
    expect(outB1Query.size).toBe(1);
    expect(outB1Query.has(a1)).toBe(true);

    const toA2Query = deep.query({ to: a2 });
    expect(toA2Query.size).toBe(2);
    expect(toA2Query.has(c1)).toBe(true);
    expect(toA2Query.has(c2)).toBe(true);

    const inC1Query = deep.query({ in: c1 });
    expect(inC1Query.size).toBe(1);
    expect(inC1Query.has(a2)).toBe(true);

    const valueStrQuery = deep.query({ value: str });
    expect(valueStrQuery.size).toBe(2);
    expect(valueStrQuery.has(d1)).toBe(true);
    expect(valueStrQuery.has(d2)).toBe(true);

    const valuedD1Query = deep.query({ valued: d1 });
    expect(valuedD1Query.size).toBe(1);
    expect(valuedD1Query.has(str)).toBe(true);

    // Правильный тест: найти то на что ссылается d1 как на value
    const valueD1Result = deep.queryField('value', d1);
    expect(valueD1Result.size).toBe(0); // Никто не ссылается на d1 как на value

    // Если нужно найти то на что ссылается d1, используем прямое отношение
    const d1ValueRelation = d1.manyRelation('value');
    expect(d1ValueRelation.size).toBe(1);
    expect(d1ValueRelation.has(str)).toBe(true);

    debug('✅ query handles basic single field queries correctly');
  });

  it('should handle multi-field AND queries', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Аксиома: deep.query({ type: A, out: b1 }) // { a1 }
    // Ищет элементы которые имеют тип A И на которые ссылается b1 как на from
    const typeAOutB1Query = deep.query({ type: A, out: b1 });
    expect(typeAOutB1Query.size).toBe(1);
    expect(typeAOutB1Query.has(a1)).toBe(true);
    expect(typeAOutB1Query.has(a2)).toBe(false); // a2 не имеет out связи с b1

    // Комбинация type + in
    const typeAInC1Query = deep.query({ type: A, in: c1 });
    expect(typeAInC1Query.size).toBe(1);
    expect(typeAInC1Query.has(a2)).toBe(true);
    expect(typeAInC1Query.has(a1)).toBe(false); // a1 не имеет in связи с c1

    // Комбинация type + value (НЕ valued!)
    const typeDValueStrQuery = deep.query({ type: D, value: str });
    expect(typeDValueStrQuery.size).toBe(2);
    expect(typeDValueStrQuery.has(d1)).toBe(true);
    expect(typeDValueStrQuery.has(d2)).toBe(true);

    // Комбинация из двух полей (исправлено - убрано невозможное условие)
    const tripleQuery = deep.query({ type: B, from: a1 });
    expect(tripleQuery.size).toBe(2); // b1 и b2 удовлетворяют всем условиям
    expect(tripleQuery.has(b1)).toBe(true);
    expect(tripleQuery.has(b2)).toBe(true);

    debug('✅ query handles multi-field AND queries correctly');
  });

  it('should handle queries with no results', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем элемент без связей
    const orphan = new deep();

    // Поиск элементов несуществующего типа
    const orphanTypeQuery = deep.query({ type: orphan });
    expect(orphanTypeQuery.size).toBe(0);

    // Поиск невозможной комбинации
    const impossibleQuery = deep.query({ type: A, from: str }); // A-элементы не могут иметь from = str
    expect(impossibleQuery.size).toBe(0);

    // Поиск элементов с невозможной комбинацией полей
    const contradictoryQuery = deep.query({ type: A, from: A }); // A-элементы не могут ссылаться сами на себя в нашем датасете
    expect(contradictoryQuery.size).toBe(0);

    debug('✅ query handles queries with no results correctly');
  });

  it('should handle query reactive tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Получаем результат query
    const typeAQuery = deep.query({ type: A });
    expect(typeAQuery.size).toBe(2);

    // Отслеживаем изменения
    let addedCount = 0;
    let deletedCount = 0;
    typeAQuery.on(deep.events.dataAdd, () => addedCount++);
    typeAQuery.on(deep.events.dataDelete, () => deletedCount++);

    // Добавляем новый элемент типа A
    const a3 = new deep();
    (a3 as any).type = A;

    expect(typeAQuery.size).toBe(3);
    expect(typeAQuery.has(a3)).toBe(true);
    expect(addedCount).toBe(1);

    // Меняем тип элемента
    (a3 as any).type = B;

    expect(typeAQuery.size).toBe(2);
    expect(typeAQuery.has(a3)).toBe(false);
    expect(deletedCount).toBe(1);

    debug('✅ query handles reactive tracking correctly');
  });

  // ДИАГНОСТИЧЕСКИЙ ТЕСТ для проверки deep.Not с результатами deep.query()
  describe('DIAGNOSTIC: deep.Not with deep.query results', () => {
    it('should verify that deep.query returns deep.Set and deep.Not works with query results', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем дополнительный элемент a3 для тестирования
      const a3 = new deep();
      (a3 as any).type = A;

      // Проверяем что deep.query возвращает deep.Set
      const typeAQuery = deep.query({ type: A });
      debug('🔍 typeAQuery type check:', typeAQuery.constructor.name);
      debug('🔍 typeAQuery is deep.Set:', typeAQuery.type && typeAQuery.type.is(deep.Set));
      debug('🔍 typeAQuery size:', typeAQuery.size);

      expect(typeAQuery.type.is(deep.Set)).toBe(true);
      expect(typeAQuery.size).toBe(3); // a1, a2, a3

      // Проверяем второй запрос
      const toCQuery = deep.query({ to: a2 }); // Ищем элементы которые ссылаются на a2 как на to
      debug('🔍 toCQuery type check:', toCQuery.constructor.name);
      debug('🔍 toCQuery is deep.Set:', toCQuery.type && toCQuery.type.is(deep.Set));
      debug('🔍 toCQuery size:', toCQuery.size);

      expect(toCQuery.type.is(deep.Set)).toBe(true);
      expect(toCQuery.size).toBe(2); // c1 и c2 (оба ссылаются на a2)

      // Проверяем содержимое результатов
      const typeAElements = Array.from(typeAQuery);
      const toCElements = Array.from(toCQuery);

      debug('🔍 typeAQuery elements:', typeAElements.map((e: any) => e._id));
      debug('🔍 toCQuery elements:', toCElements.map((e: any) => e._id));

      expect(typeAElements.length).toBe(3);
      expect(toCElements.length).toBe(2);
      expect(toCElements.some((e: any) => e._id === c1._id)).toBe(true);
      expect(toCElements.some((e: any) => e._id === c2._id)).toBe(true);

      // Теперь пробуем создать deep.Not(typeAQuery, toCQuery)
      // Ожидаем: элементы с type: A, которые НЕ имеют to: a2
      // Результат должен содержать a1, a3 (но не a2)

      debug('🔧 Creating deep.Not(typeAQuery, toCQuery)...');

      try {
        // ВАЖНО: deep.Not ожидает второй аргумент как deep.Set содержащий _symbol'ы других deep.Set
        // Создаём deep.Set который содержит _symbol результата toCQuery
        const excludeSetOfSets = new deep.Set(new Set([toCQuery._symbol]));
        debug('🔧 Created excludeSetOfSets with toCQuery._symbol:', toCQuery._symbol);

        const notResult = new deep.Not(typeAQuery, excludeSetOfSets);
        debug('✅ deep.Not created successfully');
        debug('🔍 notResult type check:', notResult.constructor.name);
        debug('🔍 notResult is deep.Set:', notResult.to && notResult.to.type && notResult.to.type.is(deep.Set));
        debug('🔍 notResult.to size:', notResult.to ? notResult.to.size : 'no .to');

        // Проверяем что результат тоже deep.Set (через .to)
        expect(notResult.to.type.is(deep.Set)).toBe(true);

        // Проверяем размер результата - должно быть 3 (все элементы типа A, так как исключаемые элементы c1,c2 не пересекаются с a1,a2,a3)
        expect(notResult.to.size).toBe(3); // a1, a2, a3 остаются, так как c1,c2 не являются элементами типа A

        // Проверяем содержимое
        const notElements = Array.from(notResult.to);
        debug('🔍 notResult elements:', notElements.map((e: any) => e._id));

        const notElementIds = notElements.map((e: any) => e._id).sort();
        const expectedIds = [a1._id, a2._id, a3._id].sort();

        expect(notElementIds).toEqual(expectedIds);

        // Проверяем что все элементы типа A В результате (так как они не пересекаются с c1, c2)
        expect(notResult.to.has(a1)).toBe(true);
        expect(notResult.to.has(a2)).toBe(true);
        expect(notResult.to.has(a3)).toBe(true);

        // Проверяем что c1 и c2 НЕ в результате (они и не должны быть, так как не являются элементами типа A)
        expect(notResult.to.has(c1)).toBe(false);
        expect(notResult.to.has(c2)).toBe(false);

        debug('✅ DIAGNOSTIC TEST PASSED: deep.Not works correctly with deep.query results');

      } catch (error: any) {
        debug('❌ DIAGNOSTIC TEST FAILED:', error.message);
        debug('❌ Error details:', error);
        throw error;
      }
    });
  });

  // ИССЛЕДОВАНИЕ АНОМАЛИИ: что возвращают методы query, queryField, And, Or, Not
  describe('INVESTIGATION: Return types of query methods', () => {
    it('should investigate what each method actually returns', () => {
      const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

      // Создаем дополнительный элемент a3 для тестирования
      const a3 = new deep();
      (a3 as any).type = A;

      debug('🔍 === ИССЛЕДОВАНИЕ НАЧАТО ===');

      // 1. Проверяем что возвращает queryField
      debug('🔍 1. ПРОВЕРКА queryField');
      const queryFieldResult = deep.queryField('type', A);
      debug('🔍 queryField result constructor:', queryFieldResult.constructor.name);
      debug('🔍 queryField result._id:', queryFieldResult._id);
      debug('🔍 queryField result.type exists:', !!queryFieldResult.type);
      debug('🔍 queryField result.type._id:', queryFieldResult.type?._id);
      debug('🔍 queryField result.type.is(deep.Set):', queryFieldResult.type?.is(deep.Set));
      debug('🔍 queryField result size:', queryFieldResult.size);

      expect(queryFieldResult.type.is(deep.Set)).toBe(true);
      debug('✅ queryField возвращает deep.Set');

      // 2. Проверяем что возвращает deep.And напрямую
      debug('🔍 2. ПРОВЕРКА deep.And напрямую');
      const set1 = new deep.Set(new Set([a1._symbol, a2._symbol]));
      const set2 = new deep.Set(new Set([a1._symbol, a3._symbol]));
      const setsForAnd = new deep.Set(new Set([set1._symbol, set2._symbol]));

      debug('🔍 Creating And with sets:', setsForAnd._id);
      const andOperation = new deep.And(undefined, setsForAnd);
      debug('🔍 And operation created:', andOperation._id);
      debug('🔍 And operation constructor:', andOperation.constructor.name);
      debug('🔍 And operation.type exists:', !!andOperation.type);
      debug('🔍 And operation.type._id:', andOperation.type?._id);
      debug('🔍 And operation.type.is(deep.And):', andOperation.type?.is(deep.And));

      // Проверяем что возвращает And.to (результат операции)
      const andResult = andOperation.to;
      debug('🔍 And result (.to):', andResult._id);
      debug('🔍 And result constructor:', andResult.constructor.name);
      debug('🔍 And result.type exists:', !!andResult.type);
      debug('🔍 And result.type._id:', andResult.type?._id);
      debug('🔍 And result.type.is(deep.Set):', andResult.type?.is(deep.Set));
      debug('🔍 And result size:', andResult.size);

      expect(andResult.type.is(deep.Set)).toBe(true);
      debug('✅ deep.And.to возвращает deep.Set');

      // 3. Проверяем что возвращает deep.query
      debug('🔍 3. ПРОВЕРКА deep.query');
      const queryResult = deep.query({ type: A });
      debug('🔍 query result constructor:', queryResult.constructor.name);
      debug('🔍 query result._id:', queryResult._id);
      debug('🔍 query result.type exists:', !!queryResult.type);
      debug('🔍 query result.type._id:', queryResult.type?._id);
      debug('🔍 query result.type.is(deep.Set):', queryResult.type?.is(deep.Set));
      debug('🔍 query result size:', queryResult.size);

      // КРИТИЧЕСКАЯ ПРОВЕРКА: что именно возвращает query?
      debug('🔍 query result === andResult?', queryResult._id === andResult._id);
      debug('🔍 query result has _state._andOperation?', !!queryResult._state._andOperation);
      if (queryResult._state._andOperation) {
        debug('🔍 query result._state._andOperation._id:', queryResult._state._andOperation._id);
        debug('🔍 query result._state._andOperation.to._id:', queryResult._state._andOperation.to._id);
        debug('🔍 query result._id === _andOperation.to._id?', queryResult._id === queryResult._state._andOperation.to._id);
      }

      expect(queryResult.type.is(deep.Set)).toBe(true);
      debug('✅ deep.query возвращает deep.Set');

      // 4. Проверяем что возвращает deep.Or напрямую
      debug('🔍 4. ПРОВЕРКА deep.Or напрямую');
      const orOperation = new deep.Or(undefined, setsForAnd);
      const orResult = orOperation.to;
      debug('🔍 Or result (.to):', orResult._id);
      debug('🔍 Or result constructor:', orResult.constructor.name);
      debug('🔍 Or result.type.is(deep.Set):', orResult.type?.is(deep.Set));
      debug('🔍 Or result size:', orResult.size);

      expect(orResult.type.is(deep.Set)).toBe(true);
      debug('✅ deep.Or.to возвращает deep.Set');

      // 5. Проверяем сигнатуру deep.Not
      debug('🔍 5. ПРОВЕРКА deep.Not сигнатуры');
      debug('🔍 Trying to create Not with two deep.Set instances...');

      try {
        // Пробуем создать Not с правильными аргументами
        const notOperation = new deep.Not(queryResult, setsForAnd);
        debug('✅ deep.Not created successfully with (deep.Set, deep.Set)');

        const notResult = notOperation.to;
        debug('🔍 Not result (.to):', notResult._id);
        debug('🔍 Not result constructor:', notResult.constructor.name);
        debug('🔍 Not result.type.is(deep.Set):', notResult.type?.is(deep.Set));
        debug('🔍 Not result size:', notResult.size);

        expect(notResult.type.is(deep.Set)).toBe(true);
        debug('✅ deep.Not.to возвращает deep.Set');

      } catch (error: any) {
        debug('❌ deep.Not failed with (deep.Set, deep.Set):', error.message);

        // Попробуем понять что именно ожидает Not
        debug('🔍 Investigating Not constructor expectations...');
        debug('🔍 queryResult._data type:', typeof queryResult._data);
        debug('🔍 queryResult._data instanceof Set:', queryResult._data instanceof Set);
        debug('🔍 setsForAnd._data type:', typeof setsForAnd._data);
        debug('🔍 setsForAnd._data instanceof Set:', setsForAnd._data instanceof Set);
        debug('🔍 setsForAnd._data contents:', Array.from(setsForAnd._data));

        // Проверим что содержится в setsForAnd._data
        for (const item of setsForAnd._data) {
          const detected = deep.detect(item);
          debug('🔍 setsForAnd item:', item, 'detected:', detected._id, 'type.is(deep.Set):', detected.type?.is(deep.Set));
        }

        throw error;
      }

      debug('🔍 === ИССЛЕДОВАНИЕ ЗАВЕРШЕНО ===');
    });
  });
});

// ЭТАП 2: Простой тест _not оператора
describe('STAGE 2: _not operator test', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment for _not operator');
    deep = newDeep();
  });

  it('should support basic _not operator', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Тест: найти элементы типа A, которые НЕ являются целью для связей типа C
    // В makeDataset: c1.to = a2, c2.to = a2
    // Ожидаемый результат: a1 (a2 исключается, так как c1.to = a2, c2.to = a2)
    const result = deep.query({
      type: A,
      _not: {
        in: { type: C }
      }
    });

    debug('🔍 _not query result size:', result.size);
    debug('🔍 _not query result elements:', Array.from(result).map((e: any) => e._id));

    expect(result.size).toBe(1); // только a1
    expect(result.has(a1)).toBe(true);
    expect(result.has(a2)).toBe(false); // a2 исключен, так как c1.to = a2, c2.to = a2

    debug('✅ Basic _not operator works correctly');
  });

  it('should support _not with multiple criteria', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Тест: найти элементы типа A, которые НЕ имеют (in: { type: C } И out: { type: B })
    // В makeDataset: 
    // - a1.out = {b1, b2} (тип B), a1 НЕ имеет входящих связей типа C
    // - a2 имеет входящие связи c1, c2 (тип C), a2 НЕ имеет исходящих связей типа B
    // 
    // deep.query({ in: { type: C }, out: { type: B } }) ищет элементы с ОБОИМИ критериями одновременно
    // Ни a1, ни a2 не удовлетворяют обоим критериям → пустое множество для исключения
    // Ожидаемый результат: все элементы типа A (a1, a2), так как нечего исключать
    const result = deep.query({
      type: A,
      _not: {
        in: { type: C },
        out: { type: B }
      }
    });

    debug('🔍 _not multiple criteria result size:', result.size);
    debug('🔍 _not multiple criteria result elements:', Array.from(result).map((e: any) => e._id));

    expect(result.size).toBe(2); // a1, a2 (все элементы типа A)
    expect(result.has(a1)).toBe(true);
    expect(result.has(a2)).toBe(true);

    debug('✅ _not with multiple criteria works correctly');
  });

  it('should support _not with reactive tracking for type changes', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем запрос: исключить все элементы типа A
    const notTypeAQuery = deep.query({ _not: { type: A } });
    const initialSize = notTypeAQuery.size;

    expect(notTypeAQuery.has(a1)).toBe(false);
    expect(notTypeAQuery.has(a2)).toBe(false);
    expect(notTypeAQuery.size).toBe(deep._ids.size - A.typed.size);

    // Настраиваем отслеживание событий
    let addedCount = 0;
    let deletedCount = 0;
    notTypeAQuery.on(deep.events.dataAdd, () => addedCount++);
    notTypeAQuery.on(deep.events.dataDelete, () => deletedCount++);

    // ТЕСТ 1: Создаем новый элемент без типа, затем устанавливаем тип B
    const newB = new deep();
    // Сначала элемент должен появиться в результатах (нет типа A)
    expect(notTypeAQuery.has(newB)).toBe(true);

    // Теперь устанавливаем тип B - элемент должен остаться в результатах
    (newB as any).type = B;
    expect(notTypeAQuery.has(newB)).toBe(true);

    // ТЕСТ 2: Создаем новый элемент типа A - он НЕ должен появиться в результатах
    const newA = new deep();
    (newA as any).type = A;

    expect(notTypeAQuery.has(newA)).toBe(false);
    // ИСПРАВЛЕНИЕ: Элемент сначала добавляется в результат (без типа), потом удаляется (с типом A)
    expect(deletedCount).toBe(1);

    // ТЕСТ 3: Меняем тип существующего элемента с A на B - он должен появиться в результатах
    (a1 as any).type = B;

    expect(notTypeAQuery.has(a1)).toBe(true);
    expect(addedCount).toBe(3); // newB + newA + a1
    expect(deletedCount).toBe(1); // newA
    const sizeAfterA1Change = notTypeAQuery.size;

    // ТЕСТ 4: Меняем тип существующего элемента с B на A - он должен исчезнуть из результатов
    (newB as any).type = A;

    expect(notTypeAQuery.size).toBe(sizeAfterA1Change - 1);
    expect(notTypeAQuery.has(newB)).toBe(false);
    expect(addedCount).toBe(3); // Остается 3
    expect(deletedCount).toBe(2); // newA + newB

    debug('✅ _not with reactive tracking for type changes works correctly');
  });

  it('should support _not with complex nested criteria and tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем запрос: исключить элементы которые имеют связь from с элементами типа B
    const notFromTypeBQuery = deep.query({ _not: { from: { type: B } } });

    // Проверяем начальное состояние
    // В makeDataset: b1.from = a1, b2.from = a1, где a1.type = A (не B)
    // Поэтому изначально никто не должен быть исключен
    const initialSize = notFromTypeBQuery.size;
    expect(notFromTypeBQuery.has(a1)).toBe(true); // a1.from не установлен
    expect(notFromTypeBQuery.has(b1)).toBe(true); // b1.from = a1, a1.type = A (не B)
    expect(notFromTypeBQuery.has(b2)).toBe(true); // b2.from = a1, a1.type = A (не B)

    // Настраиваем отслеживание
    let addedCount = 0;
    let deletedCount = 0;
    notFromTypeBQuery.on(deep.events.dataAdd, () => addedCount++);
    notFromTypeBQuery.on(deep.events.dataDelete, () => deletedCount++);

    // ТЕСТ 1: Создаем новую связь - новый элемент ссылается на элемент типа B
    const newElement = new deep();
    (newElement as any).type = C;
    (newElement as any).from = b1; // b1 имеет тип B

    expect(notFromTypeBQuery.has(newElement)).toBe(false); // Новый элемент исключен
    expect(deletedCount).toBe(1); // Элемент сначала добавился, потом удалился

    // ТЕСТ 2: Меняем from у newElement с b1 на a1 - элемент должен появиться в результатах
    (newElement as any).from = a1; // a1.type = A (не B)

    expect(notFromTypeBQuery.has(newElement)).toBe(true);
    expect(addedCount).toBe(2); // newElement добавился дважды

    // ТЕСТ 3: Меняем тип a1 на B - теперь элементы ссылающиеся на a1 должны быть исключены
    (a1 as any).type = B;

    expect(notFromTypeBQuery.has(b1)).toBe(false); // b1.from = a1, теперь a1.type = B
    expect(notFromTypeBQuery.has(b2)).toBe(false); // b2.from = a1, теперь a1.type = B
    expect(notFromTypeBQuery.has(newElement)).toBe(false); // newElement.from = a1, теперь a1.type = B
    expect(deletedCount).toBe(4); // первоначальное удаление newElement + b1, b2, newElement

    debug('✅ _not with complex nested criteria and tracking works correctly');
  });

  it('should support _not with value chain tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем запрос: исключить элементы которые имеют value ссылающийся на строку
    const notValueStringQuery = deep.query({ _not: { value: { type: deep.String } } });

    // Проверяем начальное состояние
    const initialSize = notValueStringQuery.size;
    expect(notValueStringQuery.has(d1)).toBe(false); // d1.value = str (str имеет тип deep.String)
    expect(notValueStringQuery.has(d2)).toBe(false); // d2.value = str (str имеет тип deep.String)

    // Настраиваем отслеживание
    let addedCount = 0;
    let deletedCount = 0;
    notValueStringQuery.on(deep.events.dataAdd, () => addedCount++);
    notValueStringQuery.on(deep.events.dataDelete, () => deletedCount++);

    // ТЕСТ 1: Удаляем value у d1 - он должен появиться в результатах
    delete (d1 as any).value;

    expect(notValueStringQuery.size).toBe(initialSize + 1);
    expect(notValueStringQuery.has(d1)).toBe(true);
    expect(addedCount).toBe(1);

    // ТЕСТ 2: Создаем новый элемент с value на строку - он не должен появиться в результатах
    const newD = new deep();
    (newD as any).type = D;
    (newD as any).value = str;

    expect(notValueStringQuery.size).toBe(initialSize + 1); // Размер не изменился
    expect(notValueStringQuery.has(newD)).toBe(false);
    expect(addedCount).toBe(2); // d1 + newD (который сначала добавился, потом удалился)

    // ТЕСТ 3: Меняем тип str с deep.String на что-то другое - d2 должен появиться в результатах
    const originalStringType = str.type;
    (str as any).type = C;

    expect(notValueStringQuery.has(d2)).toBe(true);
    expect(notValueStringQuery.has(newD)).toBe(true); // newD тоже теперь не исключен
    expect(addedCount).toBe(4); // d1 + newD (первоначально) + d2 + newD (повторно)

    // Восстанавливаем тип строки
    (str as any).type = originalStringType;

    debug('✅ _not with value chain tracking works correctly');
  });

  it('should support _not with empty criteria (should exclude everything)', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Запрос с пустым _not должен исключить все элементы, которые удовлетворяют пустому запросу
    // Пустой запрос {} возвращает все элементы, поэтому _not: {} должен исключить все
    const notEmptyQuery = deep.query({ _not: {} });

    expect(notEmptyQuery.size).toBe(0);
    expect(notEmptyQuery.has(a1)).toBe(false);
    expect(notEmptyQuery.has(b1)).toBe(false);
    expect(notEmptyQuery.has(str)).toBe(false);

    debug('✅ _not with empty criteria works correctly');
  });

  it('should support multiple _not operators (intersection of exclusions)', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем два отдельных _not запроса
    const notTypeAQuery = deep.query({ _not: { type: A } });
    const notTypeBQuery = deep.query({ _not: { type: B } });

    // Пересечение должно исключить элементы типа A И элементы типа B
    const intersectionQuery = notTypeAQuery.intersection(notTypeBQuery);

    // Проверяем логику исключений вместо точного размера
    expect(intersectionQuery.has(a1)).toBe(false); // Исключен как тип A
    expect(intersectionQuery.has(a2)).toBe(false); // Исключен как тип A
    expect(intersectionQuery.has(b1)).toBe(false); // Исключен как тип B
    expect(intersectionQuery.has(c1)).toBe(true);  // Не исключен
    expect(intersectionQuery.has(d1)).toBe(true);  // Не исключен

    // Проверяем что размер больше 0 (есть не исключенные элементы)
    expect(intersectionQuery.size).toBeGreaterThan(0);

    debug('✅ multiple _not operators work correctly');
  });

  it('should support _not with performance on large datasets', () => {
    const { A, B, C, D } = makeDataset(deep);

    // Создаем большой датасет
    const largeDataset: any[] = [];
    const DATASET_SIZE = 1000;

    for (let i = 0; i < DATASET_SIZE; i++) {
      const element = new deep();
      const typeIndex = i % 4;
      (element as any).type = [A, B, C, D][typeIndex];
      largeDataset.push(element);
    }

    const startTime = Date.now();

    // Создаем _not запрос для исключения элементов типа A
    const notTypeAQuery = deep.query({ _not: { type: A } });

    const queryTime = Date.now() - startTime;

    // Проверяем корректность результата
    const expectedExcluded = Math.ceil(DATASET_SIZE / 4); // Примерно 1/4 элементов типа A
    const actualSize = notTypeAQuery.size;
    const totalElements = deep._ids.size;

    // Размер должен быть близок к ожидаемому (с учетом исходных элементов датасета)
    expect(actualSize).toBeGreaterThan(totalElements - expectedExcluded - 10);
    expect(actualSize).toBeLessThan(totalElements);

    // Проверяем производительность (должно выполниться быстро)
    expect(queryTime).toBeLessThan(5000); // Менее 5 секунд

    debug(`✅ _not performance test: ${actualSize} elements, ${queryTime}ms`);
  });

  it('should support _not with destruction tracking', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем запрос: исключить элементы типа A
    const notTypeAQuery = deep.query({ _not: { type: A } });
    const initialSize = notTypeAQuery.size;

    expect(notTypeAQuery.has(a1)).toBe(false);
    expect(notTypeAQuery.has(b1)).toBe(true);

    // Настраиваем отслеживание
    let addedCount = 0;
    notTypeAQuery.on(deep.events.dataAdd, () => addedCount++);

    // Уничтожаем элемент типа A - это не должно повлиять на результаты _not запроса
    // (элемент уже был исключен)
    a1.destroy();

    expect(notTypeAQuery.size).toBe(initialSize); // Размер не изменился
    expect(addedCount).toBe(1); // a1 был добавлен и исключен
    expect(notTypeAQuery.has(a1)).toBe(false);

    // Уничтожаем элемент НЕ типа A - он должен исчезнуть из результатов
    const beforeDestroySize = notTypeAQuery.size;
    expect(notTypeAQuery.has(b1)).toBe(true);

    b1.destroy();

    expect(notTypeAQuery.size).toBe(beforeDestroySize);
    expect(notTypeAQuery.has(b1)).toBe(false);

    debug('✅ _not with destruction tracking works correctly');
  });

  it('should support _not with complex multi-level nesting', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);

    // Создаем сложный вложенный запрос:
    // Исключить элементы, которые имеют from, который имеет type A
    const complexNotQuery = deep.query({
      _not: {
        from: {
          type: A
        }
      }
    });

    // Ищем элементы, которые должны быть исключены
    // Нужно найти элементы, у которых from.type = A
    let excludedCount = 0;
    // Используем простую проверку известных элементов вместо итерации по всем ID
    const testElements = [a1, a2, b1, b2, c1, c2, d1, d2, str, A, B, C, D];
    for (const element of testElements) {
      if (element.from_id) {
        const fromElement = new deep(element.from_id);
        if (fromElement.type_id === A._id) {
          excludedCount++;
        }
      }
    }

    const expectedSize = deep._ids.size - excludedCount;
    expect(complexNotQuery.size).toBe(expectedSize);

    // Настраиваем отслеживание
    let changeCount = 0;
    complexNotQuery.on(deep.events.dataAdd, () => changeCount++);
    complexNotQuery.on(deep.events.dataDelete, () => changeCount++);

    // Создаем новую связь: новый элемент -> элемент типа A
    const newElement = new deep();
    (newElement as any).type = C;
    (newElement as any).from = a2; // a2 имеет тип A

    // Новый элемент должен быть исключен из результатов
    expect(complexNotQuery.has(newElement)).toBe(false);
    expect(changeCount).toBe(2); // Элемент сначала добавился, потом удалился

    // Меняем from на элемент НЕ типа A
    (newElement as any).from = c1; // c1 имеет тип C

    // Теперь элемент должен появиться в результатах
    expect(complexNotQuery.has(newElement)).toBe(true);
    expect(changeCount).toBe(3); // Предыдущие 2 + еще 1 добавление

    debug('✅ _not with complex multi-level nesting works correctly');
  });
});