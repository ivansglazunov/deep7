# Deep Framework

## Project Principles

### Obtaining an Associative Field
Initialization and work with associative fields begin with `newDeep()`. In the future, support for restoring state from long-term memory (e.g., external databases) is planned.

### Primary Deep Association
Calls to `new deep()` or `deep()` are equivalent and create a new association, the type of which defaults to `deep` itself:
```typescript
const deep = newDeep();
const newInstance = new deep();
expect(newInstance.type.is(deep)).toBe(true);

const anotherInstance = deep();
expect(anotherInstance.type.is(deep)).toBe(true);
```

### Typing
When creating an instance based on another association, its type (`_type`) is automatically set to the ID of that parent association:
```typescript
const deep = newDeep();
const a = new deep(); // a._type === deep._id
expect(a.type.is(deep)).toBe(true);

const b = new a();    // b._type === a._id
expect(b.type.is(a)).toBe(true);

const c = new b();    // c._type === b._id
expect(c.type.is(b)).toBe(true);
```

### Data Types
The framework provides wrappers for basic JavaScript data types. This allows them to be integrated into the Deep association system and to track links and changes.

*   **Function**: Wrapper for functions (`new deep.Function(fn)`). Stores `fn` in `._data`.
*   **String**: Wrapper for strings (`new deep.String(str)`). Stores `str` in `._data`.
*   **Number**: Wrapper for numbers (`new deep.Number(num)`). Stores `num` in `._data`.
*   **Set**: Wrapper for `Set` (`new deep.Set(jsSet)`). Stores `jsSet` (with "raw" values) in `._data`.
*   *(Planned: Boolean, Array, Object, Map, Date, RegExp, etc.)*

### Values: `.value`, `.val`, `.data`

*   **.value**: A direct link to another Deep association for delegation or specifying a default value.
*   **.val**: Recursively follows `.value` to the terminal association (or until a cycle is detected).
*   **.data**: Accessor to the "raw" data in `this.val._data`. Reading returns raw data. Writing (if `this.val` has a type handler) writes raw data and triggers events.

### Core Links: `.type`, `.from`, `.to`
Define the type, source, and target for the current association, managing context inheritance and graph relationships.

### Data Handling
Key principle: methods and fields for data manipulation (e.g., `add` for Set, `push` for Array, `length` for String/Array) should be accessible from any Deep instance that represents a collection or data structure.

1.  **Universal Access:** Methods like `.add()`, `.delete()`, `.clear()`, `.has()`, `.size` (and other type-specific ones) are directly available on Deep instances (e.g., `myDeepSet.add(newItem)`).
2.  **Delegation via `.val`**: When such a method is called, it first finds the terminal association via `.val` (e.g., `resolvedInstance = myDeepSet.val`). Then, the corresponding method is called on `resolvedInstance` (specifically, on its `._data`).
3.  **Argument Wrapping (`deep.detect`)**:
    *   If a value that is not a Deep instance (e.g., a regular string, number) is passed to a method, it is automatically wrapped in the corresponding Deep type using `deep.detect(value)`. For example, `myDeepSet.add("text")` will result in "text" being processed as `new deep.String("text")`.
    *   Subsequently, for the actual operation with "raw" data (e.g., adding to a JavaScript `Set`), its "raw" value (`._data`) is extracted from the wrapped Deep instance.
4.  **Storage of "Raw" Data**: Inside the `._data` of typed Deep instances (like `String`, `Number`, `Set`), "raw" JavaScript values are stored, **not** other Deep instances.
    *   Example: `collection = new deep.Set(new Set())`, `collection.add(new deep.String("abc"))`. The internal `collection._data` will be a JavaScript `Set` containing `"abc"` (the string), not an instance of `deep.String`.
5.  **Return Values**:
    *   **Predictable JS Methods**: Methods and properties that have predictable behavior in standard JavaScript and return primitive types should aim to return those same primitive types for a native feel. For example:
        *   `.size` (for `Set`, `Map`), `.length` (for `String`, `Array`) should return a primitive `number`.
        *   `.has(value)` (for `Set`, `Map`) should return a primitive `boolean`.
        *   `.delete(value)` (for `Set`, `Map`) should return a primitive `boolean` (indicating the success of the operation).
    *   **Methods Returning Elements or New Deep Entities**: Methods that inherently return collection elements (e.g., `getItem`, `pop`, the result of `map` or `filter` if elements are complex) or create/modify the Deep entity itself (e.g., `add` on a `Set` often returns the `Set` itself for chaining) will return Deep instances. These Deep instances are wrapped using `deep.detect()`, allowing immediate use of all Deep capabilities (e.g., finding out who references this returned element).

#### Table of Methods and Properties for JavaScript Data Types

| Method/Property                                                                 | Common `.val` forwarding | `deep.String` | `deep.Number` | `deep.Boolean` | `deep.Set` | `deep.Array` | `deep.Object` | `deep.Map` | `deep.Date` | `deep.RegExp` |
|---------------------------------------------------------------------------------|--------------------------|---------------|---------------|----------------|------------|--------------|---------------|------------|-------------|---------------|
| `toString()`                                                                    | 🛠️                       | 🛠️            | 🛠️            | 🛠️             | 🛠️         | 🛠️           | 🛠️            | 🛠️         | 🛠️          | 🛠️            |
| `valueOf()`                                                                     | 🛠️                       | 🛠️            | 🛠️            | 🛠️             | 🛠️         | 🛠️           | 🛠️            | 🛠️         | 🛠️          | 🛠️            |
| `hasOwnProperty(prop: string \| deep.String)`                                    | 🛠️                       | 🛠️            | 🛠️            | 🛠️             | 🛠️         | 🛠️           | 🛠️            | 🛠️         | 🛠️          | 🛠️            |
| `length`                                                                        | ✅                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `charAt(pos: number \| deep.Number)`                                                | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `charCodeAt(pos: number \| deep.Number)`                                             | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `concat(...items: any[])`                                                       | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `includes(search: any, pos?: number \| deep.Number)`                                | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `endsWith(search: string \| deep.String, len?: number \| deep.Number)`                  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `indexOf(search: any, pos?: number \| deep.Number)`                                  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `lastIndexOf(search: any, pos?: number \| deep.Number)`                              | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `localeCompare(compare: string \| deep.String, locales?: string \| deep.String \| (string \| deep.String)[], opts?: object)` | 🛠️ | 🛠️         | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `match(regexp: string \| deep.String \| deep.RegExp)`                                  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `matchAll(regexp: string \| deep.String \| deep.RegExp)`                               | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `normalize(form?: string \| deep.String)`                                            | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `padEnd(len: number \| deep.Number, pad?: string \| deep.String)`                        | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `padStart(len: number \| deep.Number, pad?: string \| deep.String)`                      | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `repeat(count: number \| deep.Number)`                                                | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `replace(pattern: string \| deep.String \| deep.RegExp, replacement: string \| deep.String \| Function)` | 🛠️ | 🛠️         | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `replaceAll(pattern: string \| deep.String \| deep.RegExp, replacement: string \| deep.String \| Function)`| 🛠️ | 🛠️         | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `search(regexp: string \| deep.String \| deep.RegExp)`                                  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `slice(start?: number \| deep.Number, end?: number \| deep.Number)`                      | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `split(separator?: string \| deep.String \| deep.RegExp, limit?: number \| deep.Number)`  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `startsWith(search: string \| deep.String, pos?: number \| deep.Number)`                  | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `substring(start: number \| deep.Number, end?: number \| deep.Number)`                      | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toLocaleLowerCase(locales?: string \| deep.String \| (string \| deep.String)[])`        | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toLocaleUpperCase(locales?: string \| deep.String \| (string \| deep.String)[])`        | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toLowerCase()`                                                                 | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toUpperCase()`                                                                 | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `trim()`                                                                        | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `trimStart()` (trimLeft)                                                        | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `trimEnd()` (trimRight)                                                         | 🛠️                       | 🛠️            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toExponential(digits?: number \| deep.Number)`                                     | 🛠️                       | ❌            | 🛠️            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toFixed(digits?: number \| deep.Number)`                                        | 🛠️                       | ❌            | 🛠️            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `toPrecision(precision?: number \| deep.Number)`                                  | 🛠️                       | ❌            | 🛠️            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `add(value: any)`                                                               | ✅                       | ❌            | ❌            | ❌             | ✅         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `clear()`                                                                       | ✅                       | ❌            | ❌            | ❌             | ✅         | 🛠️           | ❌            | 🛠️         | ❌          | ❌            |
| `delete(value: any)`                                                            | ✅                       | ❌            | ❌            | ❌             | ✅         | ❌           | ❌            | 🛠️         | ❌          | ❌            |
| `has(value: any)`                                                               | ✅                       | ❌            | ❌            | ❌             | ✅         | ❌           | ❌            | 🛠️         | ❌          | ❌            |
| `size`                                                                          | ✅                       | ❌            | ❌            | ❌             | ✅         | ❌           | ❌            | 🛠️         | ❌          | ❌            |
| `entries()`                                                                     | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | 🛠️           | ❌            | 🛠️         | ❌          | ❌            |
| `forEach(cb: (val: Deep, key: Deep, collection: Deep) => void, thisArg?: any)`   | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | 🛠️           | ❌            | 🛠️         | ❌          | ❌            |
| `keys()`                                                                        | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | 🛠️           | ❌            | 🛠️         | ❌          | ❌            |
| `values()`                                                                      | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | 🛠️           | ❌            | 🛠️         | ❌          | ❌            |
| `difference(B: deep.Set)`                                                       | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `intersection(B: deep.Set)`                                                     | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `symmetricDifference(B: deep.Set)`                                              | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `union(B: deep.Set)`                                                            | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `isDisjointFrom(B: deep.Set)`                                                   | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `isSubsetOf(B: deep.Set)`                                                       | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `isSupersetOf(B: deep.Set)`                                                     | 🛠️                       | ❌            | ❌            | ❌             | 🛠️         | ❌           | ❌            | ❌         | ❌          | ❌            |
| `push(...items: any[])`                                                         | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `pop()`                                                                         | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `shift()`                                                                       | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `unshift(...items: any[])`                                                      | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `join(sep?: string \| deep.String)`                                                | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `map(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => any, thisArg?: any)`    | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `filter(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => boolean, thisArg?: any)`| 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `every(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => boolean, thisArg?: any)` | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `some(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => boolean, thisArg?: any)`  | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `reduce(cb: (acc: Deep, val: Deep, idx: deep.Number, arr: deep.Array) => Deep, initial?: Deep)` | 🛠️         | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `find(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => boolean, thisArg?: any)`  | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `sort(compareFn?: (a: Deep, b: Deep) => number \| deep.Number)`                       | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `reverse()`                                                                     | 🛠️                       | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `splice(start: number \| deep.Number, deleteCount?: number \| deep.Number, ...items: any[])`| 🛠️           | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `fill(value: any, start?: number \| deep.Number, end?: number \| deep.Number)`         | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `copyWithin(target: number \| deep.Number, start?: number \| deep.Number, end?: number \| deep.Number)`| 🛠️ | ❌          | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `flat(depth?: number \| deep.Number)`                                               | 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `flatMap(cb: (val: Deep, idx: deep.Number, arr: deep.Array) => any, thisArg?: any)`| 🛠️                    | ❌            | ❌            | ❌             | ❌         | 🛠️           | ❌            | ❌         | ❌          | ❌            |
| `set(key: any, value: any)`                                                       | 🛠️                    | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | 🛠️         | ❌          | ❌            |
| `get(key: any)`                                                                 | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | 🛠️         | ❌          | ❌            |
| `getFullYear()`                                                                 | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `getMonth()`                                                                    | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `getDate()`                                                                     | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `setFullYear(year: number \| deep.Number, month?: number \| deep.Number, date?: number \| deep.Number)`| 🛠️ | ❌         | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `getHours()`                                                                  | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `setHours()`                                                                  | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `toISOString()`                                                               | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | 🛠️          | ❌            |
| `test(string: string \| deep.String)`                                                | 🛠️                    | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |
| `exec(string: string \| deep.String)`                                                | 🛠️                    | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |
| `flags`                                                                         | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |
| `source`                                                                        | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |
| `global`                                                                        | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |
| `ignoreCase`                                                                    | 🛠️                       | ❌            | ❌            | ❌             | ❌         | ❌           | ❌            | ❌         | ❌          | 🛠️            |

**Table Legend:**
* ✅ - Fully implemented and tested
* 🛠️ - In development or requires refinement
* ❌ - Implementation not started

*(Note: As we work toward a more unified approach, the goal is to have these methods work consistently across all applicable data types. This table will gradually show more ✅ marks as implementation progresses.)*

---
Next, I will proceed to create `detect.ts`.
