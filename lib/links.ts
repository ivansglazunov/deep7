import { deep, _contexts } from './';

deep.Type = new deep.Relation();
deep.type = deep.Type.One();
deep.typed = deep.Type.Many();

// TODO auto set type when context parent updated

// TODO make realization without context._instance/_proxy crutch
const contextsArray = [..._contexts.values()];
for (let c of contextsArray) {
  if (c._instance.symbol === deep.symbol) c._proxy.type = deep;
  else c._proxy.type = c.__proto__._symbol;
}

// TODO verify we have not symbols without type at this moment

deep.From = new deep.Relation();
deep.from = deep.From.One();
deep.out = deep.From.Many();

deep.To = new deep.Relation();
deep.to = deep.To.One();
deep.in = deep.To.Many();

deep.Data = new deep.Relation();
deep.value = deep.Data.One();
deep.valued = deep.Data.Many();

deep._apply = function _apply(thisArg: any, proxy: any, args: any[]) {
  if (proxy.data != undefined) return proxy.data;
  else if(proxy.value.is(deep.undefined)) return undefined;
  else return proxy.value();
};