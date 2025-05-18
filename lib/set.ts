// Defines the '_Set' type within the Deep framework, allowing for Deep instances that specifically represent and handle Set data.
import { _Data } from "./_data";
import { newMethod } from "./method";

export function newSet(deep: any) {
  const _Set = new deep();

  // Register a data handler for _Set instances
  // The actual data stored will be a JavaScript Set
  deep._datas.set(_Set._id, new _Data<Set<any>>());

  _Set._context._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialSetArg = args[0];
    if (!(initialSetArg instanceof Set)) {
      throw new Error('must provide a Set instance to new deep.Set()');
    }
    // Store a new Set internally, populated with raw data from initialSetArg
    const internalSet = new Set();
    for (const item of initialSetArg) {
        // We detect each item to ensure if it was a deep instance, we store its raw data.
        // If it was a raw value, detect wraps it, then we take its ._data.
        const detectedItem = deep.detect(item);
        internalSet.add(detectedItem._data);
    }

    const instance = new deep();
    instance._type = currentConstructor._id;
    instance._data = internalSet; 
    return instance;
  };

  // Use common methods from deep._context, which are already deep.Method or deep.Field instances.
  // These methods use this.val to get to the underlying data and operate on it.
  _Set._context.add = deep._context.add;
  _Set._context.clear = deep._context.clear;
  _Set._context.delete = deep._context.delete;
  _Set._context.has = deep._context.has;
  _Set._context.size = deep._context.size;

  // TODO: Implement .entries(), .forEach(), .keys(), .values()
  // These methods return iterators or involve callbacks, requiring careful implementation
  // within the deep.Method and deep.Function context.

  return _Set;
} 