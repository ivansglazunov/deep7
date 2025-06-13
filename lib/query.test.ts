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
}); 