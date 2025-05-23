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

### Backward References: `.typed`, `.in`, `.out`, `.valued`
Provide access to bidirectional relationships. These accessors (e.g., `A.typed`) return a `deep.Set`-like Deep instance that directly holds the related instances and allows event subscriptions.

*   `A.typed`: a `deep.Set`-like instance of all `X` where `X.type === A`.
*   `A.in`: a `deep.Set`-like instance of all `X` where `X.to === A`.
*   `A.out`: a `deep.Set`-like instance of all `X` where `X.from === A`.
*   `A.valued`: a `deep.Set`-like instance of all `X` where `X.value === A`.

You can listen for events directly on these instances to react to changes in relationships:

**Example for `.typed`:**
When you set an instance's type, the corresponding `.typed` collection on the type-instance is updated.

```typescript
const deep = newDeep();
const TypeA = new deep(); // This will be our type
const instanceB = new deep();

// Subscribe to events directly on the backward reference instance
TypeA.typed.on(deep.events.dataAdd, (addedInstance) => {
  console.log(`Instance ${addedInstance._id} now has TypeA as its type.`);
});
TypeA.typed.on(deep.events.dataDelete, (deletedInstance) => {
  console.log(`Instance ${deletedInstance._id} no longer has TypeA as its type.`);
});

// Establish a "forward" link: set instanceB's type to TypeA.
// This action (instanceB.type = TypeA) is the "reverse transition"
// that causes instanceB to be added to TypeA.typed.
instanceB.type = TypeA; // Triggers deep.events.dataAdd on TypeA.typed, with instanceB

// Later, if the link is removed:
// delete instanceB.type; // Would trigger deep.events.dataDelete on TypeA.typed
```

**Example for `.in` (related to `.to` links):**
Similarly, if instance `X` points to instance `Y` (i.e., `X.to = Y`), then instance `X` will be added to `Y.in`.

```typescript
const deep = newDeep();
const targetY = new deep();
const sourceX = new deep();

// Subscribe to events directly on the backward reference instance targetY.in
targetY.in.on(deep.events.dataAdd, (addedSourceInstance) => {
  console.log(`Instance ${addedSourceInstance._id} now has targetY as its .to link.`);
});

// Establish a "forward" link: sourceX.to = targetY.
// This "reverse transition" updates targetY.in.
sourceX.to = targetY; // Triggers deep.events.dataAdd on targetY.in, with sourceX
```
Events like `deep.events.dataAdd` and `deep.events.dataDelete` (and other `deep.Set` specific events like `deep.events.dataChanged` and `deep.events.dataClear`) are standard for the `deep.Set`-like instances returned by `A.typed`, `A.in`, `A.out`, and `A.valued`, allowing you to react to relationship changes dynamically.

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

### Events

The Deep Framework includes a robust event system that allows you to react to changes in links, data, and collections.

#### Listening to Events

You can subscribe to events on any Deep instance using the following methods:

*   `instance.on(eventType, handlerFunction)`: Registers `handlerFunction` to be called whenever `eventType` is emitted on `instance`. Returns a disposer function that, when called, unregisters the handler.
*   `instance.once(eventType, handlerFunction)`: Similar to `on`, but `handlerFunction` will only be called once for `eventType`, after which it's automatically unregistered. Also returns a disposer function.
*   `instance.off(eventType, handlerFunction)`: Removes a previously registered `handlerFunction` for `eventType` on `instance`.

Standard event types are available as Deep instances under `deep.events`. You typically use their `._id` property to subscribe:
```typescript
const deep = newDeep();
const myInstance = new deep();

myInstance.on(deep.events.typeSetted._id, (payload) => {
  console.log('Type was set!', payload);
});
```

#### Event Payload

When an event handler is called, it usually receives a `payload` argument. This payload is a Deep instance itself, providing context about the event:

*   `payload._id`: The ID of the Deep instance on which the event handler was triggered (i.e., the instance that emitted this specific event).
*   `payload._reason`: A string indicating why the event was fired (e.g., "setted", "added", "deleted", "changed").
*   `payload._source`: The ID of the Deep instance that is the direct subject or origin of the event. For many link-related events, this is the same as `payload._id`.

#### Emitting Custom Events

You can define and emit your own custom events:

```typescript
const deep = newDeep();
const MyCustomEvent = new deep.Event(); // Define a new event type
const myCustomEventInstance = new MyCustomEvent(); // Create an instance of it

const anInstance = new deep();

anInstance.on(myCustomEventInstance._id, (data) => {
  console.log('My custom event received:', data);
});

anInstance.emit(myCustomEventInstance._id, { message: "Hello from custom event" });
```

#### Standard Event Categories & Propagation

##### 1. Link Events

These events are emitted when `.type`, `.from`, `.to`, or `.value` links are established, changed, or deleted.

*   **Direct Operation Events:**
    *   `typeSetted`, `fromSetted`, `toSetted`, `valueSetted`: Emitted on the source instance when a link is set or changed.
        *   Example: If `A.type = B`, instance `A` emits `typeSetted`.
    *   `typeDeleted`, `fromDeleted`, `toDeleted`, `valueDeleted`: Emitted on the source instance when a link is deleted.
        *   Example: If `delete A.type`, instance `A` emits `typeDeleted`.

*   **Target Notification Events:**
    *   `typedAdded`, `outAdded`, `inAdded`, `valuedAdded`: Emitted on the *new target* instance of a link.
        *   Example: If `A.type = B`, instance `B` emits `typedAdded`.
    *   `typedDeleted`, `outDeleted`, `inDeleted`, `valuedDeleted`: Emitted on the *old target* instance when a link is changed or deleted.
        *   Example: If `A.type` was `B`, and then `A.type = C`, instance `B` emits `typedDeleted`.

*   **Referrer Change Events:**
    These notify instances that are *referring to* an instance whose link has changed.
    *   `typedChanged`: If `C.type = A`, and `A.type` itself changes (e.g., `A.type = B` or `delete A.type`), then `C` emits `typedChanged`.
    *   `outChanged`: If `C.from = A`, and `A.from` itself changes, `C` emits `outChanged`.
    *   `inChanged`: If `C.to = A`, and `A.to` itself changes, `C` emits `inChanged`.
    *   `valuedChanged`: If `C.value = A`, and `A.value` itself changes, `C` emits `valuedChanged`.
        *   **Recursive Propagation for `valuedChanged`**: This event has a special behavior. If `A.value` changes, triggering `valuedChanged` on `B` (where `B.value = A`), this emission on `B` will, in turn, cause `C` (where `C.value = B`) to also emit `valuedChanged`, and so on up the chain of `.value` referrers.

##### 2. Data Events

These relate to modifications of the "raw" data stored within typed instances.

*   `dataSetted`: Emitted on the terminal `.val` instance whose `._data` property is directly modified.
    *   Example: If `myString = new deep.String("initial")`, then `myString.data = "new"` will cause `myString` to emit `dataSetted`.

*   `dataChanged`:
    *   **Propagation up Value Chain**: When `instance.data = "new value"` is called, and this results in the data of an underlying `val` instance being changed (e.g., `A.value = myString`, then `A.data = "new"`), the `dataSetted` event occurs on `myString`, and `dataChanged` events are emitted on `A` and any other instances up the `.value` chain from `myString`.
    *   **Collection Modifications**: Collections like `deep.Set` also emit `dataChanged` after operations like `add`, `delete`, or `clear`.

##### 3. Collection Events (e.g., for `deep.Set`)

Deep types representing collections, like `deep.Set`, emit specific events when their contents are modified. These are all subtypes of `deep.events.Data`.

*   `dataAdd`: Emitted when an item is added. The event payload is the Deep instance representing the added item.
    ```typescript
    mySet.on(deep.events.dataAdd._id, (addedItem) => {
      console.log('Item added to set:', addedItem);
    });
    mySet.add("new item");
    ```
*   `dataDelete`: Emitted when an item is removed. The payload is the Deep instance for the removed item.
*   `dataClear`: Emitted when the collection is cleared (e.g., `mySet.clear()`).
*   `dataChanged`: Emitted alongside `dataAdd`, `dataDelete`, and `dataClear` to signal a general change to the collection's data.

##### 4. General Event Propagation via `.value` for Data Events

When `instance.emit()` is called with an event type that is a `deep.events.Data` (this includes all collection events like `dataAdd`, `dataDelete`, `dataClear`, and also `dataSetted`, `dataChanged`), the event is automatically propagated. If another instance `B` has `instance` as its `.value` (i.e., `B.value = instance`), then `B` will also emit the same event with the same payload. This allows changes to a valued instance to be observed by instances that delegate to it.

#### Events on Backward References

As described in the "Backward References" section, accessors like `A.typed`, `A.in`, `A.out`, and `A.valued` return `deep.Set`-like Deep instances. These special Set instances are dynamically updated when the corresponding forward links change, and critically, **they emit their own `dataAdd`, `dataDelete`, `dataClear`, and `dataChanged` events.**

This means you can listen directly on `A.typed` (for example) to know when other instances (`X`) are now typed as `A` (i.e., `X.type = A` causes `A.typed` to emit `dataAdd` with `X` as payload) or when they are no longer typed as `A` (e.g., `delete X.type` causes `A.typed` to emit `dataDelete` with `X`).

Example (reiteration from Backward References section for clarity):
```typescript
const deep = newDeep();
const TypeA = new deep();
const instanceB = new deep();

// Listen to the Set-like instance A.typed
TypeA.typed.on(deep.events.dataAdd._id, (addedInstance) => {
  // This handler is on TypeA.typed.
  // addedInstance will be instanceB.
  console.log(`Instance ${addedInstance._id} now has TypeA as its type. Event on TypeA.typed.`);
});

instanceB.type = TypeA; // This causes instanceB to be "added" to TypeA.typed's conceptual set,
                        // triggering the dataAdd event on TypeA.typed.
```

This mechanism provides a powerful way to react to relationship changes from the perspective of the "target" or "type" instance in a relationship.

---
Next, I will proceed to create `detect.ts`.
