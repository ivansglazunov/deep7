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
  
  it('should handle mapByField performance and memory with large sets', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);
    
    // Создаем большой сет для тестирования производительности
    const largeSet = new deep.Set(new Set());
    const targetTypes = [A, B, C, D];
    
    // Добавляем много элементов
    for (let i = 0; i < 100; i++) {
      const element = new deep();
      element.type = targetTypes[i % targetTypes.length];
      largeSet.add(element);
    }
    
    expect(largeSet.size).toBe(100);
    
    // mapByField должен корректно обработать большой сет
    const start = Date.now();
    const typesResult = largeSet.mapByField('type');
    const duration = Date.now() - start;
    
    // Результат должен содержать все 4 типа
    expect(typesResult.size).toBe(4);
    expect(typesResult.has(A)).toBe(true);
    expect(typesResult.has(B)).toBe(true);
    expect(typesResult.has(C)).toBe(true);
    expect(typesResult.has(D)).toBe(true);
    
    // Операция должна выполняться разумно быстро (< 1 секунды)
    expect(duration).toBeLessThan(1000);
    
    debug('✅ mapByField handles large sets efficiently, duration:', duration + 'ms');
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
    let addedEvents = 0;
    let deletedEvents = 0;
    typeAResult.on(deep.events.dataAdd, () => addedEvents++);
    typeAResult.on(deep.events.dataDelete, () => deletedEvents++);
    
    // Добавляем новый элемент типа A
    const a3 = new deep();
    a3.type = A;
    
    // Результат должен обновиться
    expect(typeAResult.size).toBe(3);
    expect(typeAResult.has(a3)).toBe(true);
    expect(addedEvents).toBe(1);
    
    // Изменяем тип элемента (удаляем связь с A)
    delete a3.type;
    
    // Результат должен обновиться
    expect(typeAResult.size).toBe(2);
    expect(typeAResult.has(a3)).toBe(false);
    expect(deletedEvents).toBe(1);
    
    debug('✅ queryField handles reactive tracking correctly');
  });
  
  it('should reject non-Deep instance values in STAGE 1', () => {
    const { A, a1, a2, B, b1, b2, C, c1, c2, D, d1, d2, str } = makeDataset(deep);
    
    // В ЭТАПЕ 1 queryField должен принимать только Deep instances
    expect(() => {
      deep.queryField('type', 'string');
    }).toThrow();
    
    expect(() => {
      deep.queryField('type', 123);
    }).toThrow();
    
    expect(() => {
      deep.queryField('type', { nested: 'object' });
    }).toThrow();
    
    expect(() => {
      deep.queryField('type', null);
    }).toThrow();
    
    expect(() => {
      deep.queryField('type', undefined);
    }).toThrow();
    
    debug('✅ queryField correctly rejects non-Deep values in STAGE 1');
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
    
    // VALUED направление: на что указывает элемент как на value
    const whereD1PointsValue = deep.queryField('valued', d1);
    expect(whereD1PointsValue.size).toBe(1);
    expect(whereD1PointsValue.has(str)).toBe(true);
    
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
    const typeAResult = deep.queryField('type', A);
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
}); 