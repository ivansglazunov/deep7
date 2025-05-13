// import { deep, context, unwrap, wrap } from './deep';

// export const Type = deep.Type = deep();

// export const Undefined = new Type();
// export const Null = new Type();
// export const Boolean = new Type();
// export const Number = new Type();
// export const Bigint = new Type();
// export const String = new Type();
// export const Symbol = new Type();
// export const Array = new Type();
// export const Object = new Type();
// export const Promise = new Type();
// export const Map = new Type();
// export const Weakmap = new Type();
// export const Set = new Type();
// export const Weakset = new Type();
// export const Date = new Type();
// export const Regexp = new Type();
// export const Error = new Type();
// export const Buffer = new Type();
// export const Function = new Type();

// export const detect = deep((maybeDeep) => {
//   const value = unwrap(maybeDeep);
//   if (value === null) return Null;
//   else if (value === undefined) return Undefined;
//   else if (typeof value === 'boolean') return Boolean;
//   else if (typeof value === 'number') return Number;
//   else if (typeof value === 'bigint') return Bigint;
//   else if (typeof value === 'string') return String;
//   else if (typeof value === 'symbol') return Symbol;
//   else if (typeof value === 'object') {
//     if (Array.isArray(value)) return Array;
//     else if (value instanceof Promise) return Promise;
//     else if (value instanceof Map) return Map;
//     else if (value instanceof Weakmap) return Weakmap;
//     else if (value instanceof Set) return Set;
//     else if (value instanceof Weakset) return Weakset;
//     else if (value instanceof Date) return Date;
//     else if (value instanceof Regexp) return Regexp;
//     else if (value instanceof Error) return Error;
//     else if (value instanceof Buffer) return Buffer;
//     else return Object;
//   }
//   else if (typeof value === 'function') return Function;
// });
