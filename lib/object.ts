import { _Data } from "./_data";
import { newMethod } from "./method";

export function _validateObject(deep: any, object: any, path: string = '') {
  for (const key in object) {
    if (object[key] instanceof deep.Deep) {
      throw new Error(`Object contains a Deep instance: ${object[key]._id} at path ${path}.${key}, only _id or _symbol values are allowed in Objects.`);
    } else if (object[key] instanceof Object) {
      _validateObject(deep, object[key], `${path}.${key}`);
    }
  }
}

export function newObject(deep: any) {
  const _Object = new deep();

  // Register a data handler for _Object instances
  // The actual data stored will be a JavaScript Object
  const objectDataHandler = new _Data<{ [key: string]: any }>();
  deep._datas.set(_Object._id, objectDataHandler);

  _Object._contain._constructor = function (this: any, currentConstructor: any, args: any[] = []) {
    const initialSetArg = args[0];
    if (!(initialSetArg instanceof Object)) {
      throw new Error('must provide a Object instance to new deep.Object()');
    }
    
    _validateObject(deep, initialSetArg);
    
    // Check if this original Set data already exists in our data handler
    const existingId = objectDataHandler.byData(initialSetArg);
    if (existingId) {
      // Return existing Deep instance for this Set data
      return new deep(existingId);
    }
    
    // Create new instance and store the original Set directly
    const instance = new deep();
    instance.__type = currentConstructor._id;
    instance.__data = initialSetArg;
    
    // Store the original Set in the data handler for future lookups
    objectDataHandler.byData(initialSetArg, instance._id);
    
    instance[Symbol.iterator] = function*() {
      for (const value of Object.values(this.__data || initialSetArg)) {
        yield value;
      }
    };
    
    return instance;
  };

  return _Object;
}
