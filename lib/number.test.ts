import { newDeep } from '.';

describe('number', () => {
  it('new deep.Number(!number) error', () => {
    const deep = newDeep();
    expect(() => new deep.Number('abc')).toThrow('must got number but string');
  });
  it('object.num = 123', () => {
    const deep = newDeep();
    const num = new deep.Number(123);
    expect(num._data).toBe(123);
  });

  it('new deep.Number(0) should return object with _symbol === 0', () => {
    const deep = newDeep();
    
    console.log('=== ДИАГНОСТИКА DEEP.NUMBER(0) ===');
    
    // Создаем deep.Number(0)
    const num = new deep.Number(0);
    console.log('1. Создан num = new deep.Number(0)');
    console.log('   num._id:', num._id);
    console.log('   num.type_id:', num.type_id);
    console.log('   deep.Number._id:', deep.Number._id);
    
    // Проверяем наличие data handler
    console.log('2. Проверяем data handler:');
    console.log('   deep._datas.has(deep.Number._id):', deep._datas.has(deep.Number._id));
    const handler = deep._datas.get(deep.Number._id);
    console.log('   handler exists:', !!handler);
    
    if (handler) {
      console.log('3. Проверяем handler.byId:');
      const dataFromHandler = handler.byId(num._id);
      console.log('   handler.byId(num._id):', dataFromHandler);
      console.log('   typeof dataFromHandler:', typeof dataFromHandler);
      
      // Дополнительная диагностика handler
      console.log('   handler._byId size:', handler._byId.size);
      console.log('   handler._byData size:', handler._byData.size);
      console.log('   handler._byId.has(num._id):', handler._byId.has(num._id));
    }
    
    // Проверяем _data getter
    console.log('4. Проверяем _data getter:');
    console.log('   num._data:', num._data);
    console.log('   typeof num._data:', typeof num._data);
    console.log('   num._data === 0:', num._data === 0);
    console.log('   num._data == 0:', num._data == 0);
    console.log('   num._data !== undefined:', num._data !== undefined);
    console.log('   num._data != undefined:', num._data != undefined);
    
    // Проверяем _symbol getter
    console.log('5. Проверяем _symbol getter:');
    console.log('   num._symbol:', num._symbol);
    console.log('   typeof num._symbol:', typeof num._symbol);
    console.log('   num._symbol === 0:', num._symbol === 0);
    
    // КЛЮЧЕВАЯ ДИАГНОСТИКА: проблема в constructor
    console.log('6. КЛЮЧЕВАЯ ПРОБЛЕМА - constructor использует:');
    console.log('   constructor присваивает: instance.__data = num (НЕПРАВИЛЬНО)');
    console.log('   должен присваивать: instance._data = num');
    console.log('   __data vs _data разница:');
    console.log('   - __data это crutch field для событий');
    console.log('   - _data это getter/setter который работает с handler');
    
    console.log('=== КОНЕЦ ДИАГНОСТИКИ ===');
    
    // Основной тест
    expect(num._symbol).toBe(0);
  });
});
