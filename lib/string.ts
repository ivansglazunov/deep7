export function newString(deep: any, DeepData: any) {
  const DeepString = new DeepData((worker: any, source: any, target: any, stage: any, args: any[], thisArg: any) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [input] = args;

        const _data = target.ref._data;
        if (!_data) throw new Error(`deep.String.new:!.type.ref._data`);

        // DeepString always requires a string input (not an id)
        if (typeof input !== 'string') throw new Error(`deep.String.new:!string`);
        // Check if this string value already exists in _data
        let id = _data.byData(input);
        // Create new id and store the string
        if (!id) _data.byId(id = deep.Deep.newId(), input);

        const data = target.new(id);
        return data.proxy;
      } case deep.Deep._Destructor: {
        const type = target.proxy.type;
        const _data = type.ref._data;
        if (!_data) throw new Error(`deep.String.new:!.type.ref._data`);
        _data.byId(target.id, undefined);
        return;
      } default: return worker.super(source, target, stage, args, thisArg);
    }
  });

  return DeepString;
}
