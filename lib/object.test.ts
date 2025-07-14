import { newDeep } from "./deep";

describe('deep.Object cascading events', () => {
  const deep = newDeep();

  it('should propagate events and allow deep get chain', () => {
    const logs: any[] = [];
    const effect = (worker: any, source: any, target: any, stage: any, args: any) => {
      logs.push({ stage, args });
      return worker.super(source, target, stage, args);
    };

    const LoggerSet = deep(effect);
    const loggerSet = new LoggerSet();
    const set = new deep.Set();
    loggerSet.value = set;

    const x = new deep.Object();
    set.add(x);

    const y = new deep.Object();
    x.set('a', y);

    const z = new deep.String('abc');
    y.set('b', z);

    // Check chain
    expect(x.get('a').get('b').data).toBe('abc');

    // Проверка полного пути в loggerSet
    const updatedLogs = logs.filter(l => l.stage === deep.Deep._Updated);
    const lastUpd = updatedLogs.pop();
    if (lastUpd) {
      const expectedPath = [x.id, 'a', 'b'];
      expect(lastUpd.args[1]).toEqual(expectedPath);
    }
  });

  it('should propagate value path for association', () => {
    const logs: any[] = [];
    const effect = (worker: any, source: any, target: any, stage: any, args: any) => {
      logs.push({ stage, args });
      return worker.super(source, target, stage, args);
    };
    const LoggerSet = deep(effect);
    const loggerSet = new LoggerSet();
    const set = new deep.Set();
    loggerSet.value = set;

    const x = new deep.Object();
    set.add(x);

    const y = new deep.Object();
    x.set('a', y);

    const b = deep();
    y.set('b', b);

    const str = new deep.String('abc');
    b.value = str;

    const updatedLogs = logs.filter(l => l.stage === deep.Deep._Updated);
    const lastUpd = updatedLogs.pop();
    if (lastUpd) {
      const expectedPath = [x.id, 'a', 'b', 'value'];
      expect(lastUpd.args[1]).toEqual(expectedPath);
    }
  });

  it('should not emit events for native object property change', () => {
    const logs: any[] = [];
    const effect = (worker: any, source: any, target: any, stage: any, args: any) => {
      logs.push(stage);
      return worker.super(source, target, stage, args);
    };
    const Container = deep(effect);
    const container = new Container();

    const x = new deep.Object();
    container.value = x;

    x.set('y', { a: 123 });
    logs.length = 0;

    const nativeObj: any = x.get('y');
    nativeObj.a = 234;

    expect(logs.length).toBe(0);
    expect(x.get('y').a).toBe(234);
  });
});
