import { newDeep } from '.';

describe('function', () => {
  it('new deep.Function(!function) error', () => {
    const deep = newDeep();
    expect(() => new deep.Function(123)).toThrow('must got function but' + typeof 123);
  });
  it('object.fn = function(this: {}, a: number, b: number) { return a + b;}', () => {
    const deep = newDeep();
    const parent: any = { a: 1, b: 2, c: 0 };
    const fn = new deep.Function(function (this: any, a: number, b: number) {
      expect(this).toBe(parent);
      this.c = a + b;
      return this.c;
    });
    parent.fn = fn;
    expect(parent.fn(1, 2)).toBe(3);
    expect(parent.c).toBe(3);
  });
  it('fn = function(this: {}, a: number, b: number) { return a + b;}', () => {
    const deep = newDeep();
    const fn = new deep.Function(function (this: any, a: number, b: number) {
      expect(this).toBe(undefined);
      return a + b;
    });
    expect(fn(1, 2)).toBe(3);
  });

  it('as callable native function', () => {
    const deep = newDeep();
    let called = false;
    const fn = function (this: any) {
      called = true;
      expect(this).toBe(undefined); // becouse f() without new and parent
      return 123;
    }
    const f = new deep.Function(fn);
    expect(f.data).toBe(fn);
    expect(f()).toBe(123);
    expect(called).toBe(true);
  });
  
  it('as constructor native function', () => {
    const deep = newDeep();
    let called = false;
    const fn = function(this: any, a?: number) {
      called = true;
      expect(this).toBeInstanceOf(fn);
      this.a = 123;
    };
    const X = new deep.Function(fn);
    const x = new X(123); // not deep instance
    expect(called).toBe(true);
    expect(X).toBeInstanceOf(deep.Deep);
    expect(x).toEqual({ a: 123 });
    expect(x).not.toBeInstanceOf(deep.Deep);
    expect(x).toBeInstanceOf(X.data);
    expect(x).toBeInstanceOf(fn);
  });

  it('as callable and constructor', () => {
    const deep = newDeep();
    const fn = function(this: { a?: number }, a?: number) {
      if (this == undefined) {
        return 123;
      } else if (this instanceof fn) {
        this.a = 123;
      } else throw new Error('unexpected');
    };
    const f = new deep.Function(fn);
    const obj = new f(123);
    expect(obj).not.toBeInstanceOf(deep.Deep);
    expect(obj).toEqual({ a: 123 });
    const num = f(123);
    expect(num).toBe(123);
  });

  it('as callable and constructor from parent', () => {
    const deep = newDeep();
    const fn = function(this: { a?: number, x: number }, a: number) {
      if (this instanceof fn) {
        return a + this.x; // Access parent data through _source
      } else if (this instanceof deep.Deep) {
        return a * this.x;
      } else if(this === undefined) {
        return a * 2;
      } else if (typeof this === 'object') {
        return a - this.x;
      } else {
        throw new Error('unexpected');
      }
    };
    const f = new deep.Function(fn);
    expect(f(123)).toBe(123 * 2)
    const parent = { f, x: 234 };
    expect(parent.f(123)).toBe(123 - 234);
    const p = new deep();
    p._context.x = 234;
    p._context.f = f;
    const num = p.f(123);
    expect(num).toBe(123 * 234);
  });

  // Additional tests for native function behavior compliance
  describe('native function behavior compliance', () => {
    it('should handle function.length property', () => {
      const deep = newDeep();
      const nativeFn = function(a: number, b: string, c?: boolean) { return a + b; };
      const deepFn = new deep.Function(nativeFn);
      
      expect(nativeFn.length).toBe(3);
      expect(deepFn.data.length).toBe(3);
    });

    it('should handle function.name property', () => {
      const deep = newDeep();
      function namedFunction(x: number) { return x * 2; }
      const deepFn = new deep.Function(namedFunction);
      
      expect(namedFunction.name).toBe('namedFunction');
      expect(deepFn.data.name).toBe('namedFunction');
    });

    it('should handle function.call() method', () => {
      const deep = newDeep();
      const nativeFn = function(this: { value: number }, multiplier: number) {
        return this.value * multiplier;
      };
      const deepFn = new deep.Function(nativeFn);
      const context = { value: 5 };
      
      const nativeResult = nativeFn.call(context, 3);
      const deepResult = deepFn.data.call(context, 3);
      
      expect(nativeResult).toBe(15);
      expect(deepResult).toBe(15);
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle function.apply() method', () => {
      const deep = newDeep();
      const nativeFn = function(this: { base: number }, a: number, b: number) {
        return this.base + a + b;
      };
      const deepFn = new deep.Function(nativeFn);
      const context = { base: 10 };
      const args: [number, number] = [5, 7];
      
      const nativeResult = nativeFn.apply(context, args);
      const deepResult = deepFn.data.apply(context, args);
      
      expect(nativeResult).toBe(22);
      expect(deepResult).toBe(22);
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle function.bind() method', () => {
      const deep = newDeep();
      const nativeFn = function(this: { prefix: string }, suffix: string) {
        return this.prefix + suffix;
      };
      const deepFn = new deep.Function(nativeFn);
      const context = { prefix: 'Hello ' };
      
      const nativeBound = nativeFn.bind(context);
      const deepBound = deepFn.data.bind(context);
      
      const nativeResult = nativeBound('World!');
      const deepResult = deepBound('World!');
      
      expect(nativeResult).toBe('Hello World!');
      expect(deepResult).toBe('Hello World!');
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle function toString() method', () => {
      const deep = newDeep();
      const nativeFn = function testFunction(x: number) { return x + 1; };
      const deepFn = new deep.Function(nativeFn);
      
      const nativeString = nativeFn.toString();
      const deepString = deepFn.data.toString();
      
      expect(nativeString).toBe(deepString);
      expect(typeof nativeString).toBe('string');
      expect(typeof deepString).toBe('string');
    });

    it('should handle arguments object in function', () => {
      const deep = newDeep();
      const nativeFn = function(...args: any[]) {
        return Array.from(args).join(',');
      };
      const deepFn = new deep.Function(nativeFn);
      
      const nativeResult = nativeFn(1, 2, 3);
      const deepResult = deepFn(1, 2, 3);
      
      expect(nativeResult).toBe('1,2,3');
      expect(deepResult).toBe('1,2,3');
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle function as constructor with prototype', () => {
      const deep = newDeep();
      function NativeConstructor(this: any, value: number) {
        this.value = value;
      }
      NativeConstructor.prototype.getValue = function() {
        return this.value;
      };
      
      const deepConstructor = new deep.Function(NativeConstructor);
      
      const nativeInstance = new NativeConstructor(42);
      const deepInstance = new deepConstructor(42);
      
      expect(nativeInstance.value).toBe(42);
      expect(deepInstance.value).toBe(42);
      expect(nativeInstance.getValue()).toBe(42);
      expect(deepInstance.getValue()).toBe(42);
      expect(nativeInstance instanceof NativeConstructor).toBe(true);
      expect(deepInstance instanceof NativeConstructor).toBe(true);
    });

    it('should handle function with default parameters', () => {
      const deep = newDeep();
      const nativeFn = function(a: number = 5, b: number = 10) {
        return a + b;
      };
      const deepFn = new deep.Function(nativeFn);
      
      expect(nativeFn()).toBe(15);
      expect(deepFn()).toBe(15);
      expect(nativeFn(1)).toBe(11);
      expect(deepFn(1)).toBe(11);
      expect(nativeFn(1, 2)).toBe(3);
      expect(deepFn(1, 2)).toBe(3);
    });

    it('should handle function with rest parameters', () => {
      const deep = newDeep();
      const nativeFn = function(first: number, ...rest: number[]) {
        return first + rest.reduce((sum, n) => sum + n, 0);
      };
      const deepFn = new deep.Function(nativeFn);
      
      const nativeResult = nativeFn(1, 2, 3, 4);
      const deepResult = deepFn(1, 2, 3, 4);
      
      expect(nativeResult).toBe(10);
      expect(deepResult).toBe(10);
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle function with closure variables', () => {
      const deep = newDeep();
      let counter = 0;
      const nativeFn = function() {
        return ++counter;
      };
      const deepFn = new deep.Function(nativeFn);
      
      expect(nativeFn()).toBe(1);
      expect(deepFn()).toBe(2); // Should access the same closure variable
      expect(nativeFn()).toBe(3);
      expect(deepFn()).toBe(4);
    });

    it('should handle function with exception throwing', () => {
      const deep = newDeep();
      const nativeFn = function(shouldThrow: boolean) {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return 'success';
      };
      const deepFn = new deep.Function(nativeFn);
      
      expect(nativeFn(false)).toBe('success');
      expect(deepFn(false)).toBe('success');
      
      expect(() => nativeFn(true)).toThrow('Test error');
      expect(() => deepFn(true)).toThrow('Test error');
    });

    it('should handle async functions', async () => {
      const deep = newDeep();
      const nativeFn = async function(delay: number) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return 'async result';
      };
      const deepFn = new deep.Function(nativeFn);
      
      const nativeResult = await nativeFn(1);
      const deepResult = await deepFn(1);
      
      expect(nativeResult).toBe('async result');
      expect(deepResult).toBe('async result');
      expect(nativeResult).toBe(deepResult);
    });

    it('should handle generator functions', () => {
      const deep = newDeep();
      const nativeFn = function* (max: number) {
        for (let i = 0; i < max; i++) {
          yield i;
        }
      };
      const deepFn = new deep.Function(nativeFn);
      
      const nativeGen = nativeFn(3);
      const deepGen = deepFn(3);
      
      expect(Array.from(nativeGen)).toEqual([0, 1, 2]);
      expect(Array.from(deepGen)).toEqual([0, 1, 2]);
    });
  });
});
