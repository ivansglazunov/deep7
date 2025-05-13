// interface ChildSetFactory {
//   (value: any) => Set<any>;
// }

// export class Memory {
//   _forward = new Map<any, any>();
//   _reverse = new Map<any, Set<any>>();
//   _childSetFactory: ChildSetFactory | null = null;
//   _returnFactory: ReturnFactory | null = null;
//   constructor(options: { childSetFactory?: ChildSetFactory } = {}) {
//     if (options.childSetFactory && typeof options.childSetFactory === 'function') {
//       this._childSetFactory = options.childSetFactory;
//     }
//   }
//   set(key: any, value: any): boolean {
//     const prevValue = this._forward.get(key);
//     if (prevValue !== undefined && prevValue !== value) {
//       const reverseSet = this._reverse.get(prevValue);
//       reverseSet.delete(key);
//       if (reverseSet.size === 0) {
//         this._reverse.delete(prevValue);
//       }
//     }
//     this._forward.set(key, value);
//     if (!this._reverse.has(value)) {
//       const newSet = this._childSetFactory ? this._childSetFactory(value) : new Set();
//       this._reverse.set(value, newSet);
//     }
//     this._reverse.get(value).add(key);
//     return true;
//   }
//   one(key: any): any {
//     return this._forward.get(key);
//   }
//   many(value: any): Set<any> {
//     if (!this._reverse.has(value)) {
//       const newSet = this._childSetFactory
//         ? this._childSetFactory(value)
//         : new Set();
//       this._reverse.set(value, newSet);
//     }
//     return this._reverse.get(value);
//   }
//   delete(key: any): boolean {
//     if (!this._forward.has(key)) {
//       return false;
//     }
//     const value = this._forward.get(key);
//     this._forward.delete(key);
//     if (this._reverse.has(value)) {
//       const reverseSet = this._reverse.get(value);
//       reverseSet.delete(key);
//       if (reverseSet.size === 0) {
//         this._reverse.delete(value);
//       }
//     }
//     return true;
//   }
//   has(key: any): boolean {
//     return this._forward.has(key);
//   }
//   clear() {
//     this._forward.clear();
//     this._reverse.clear();
//   }
//   size() {
//     return this._forward.size;
//   }
// }