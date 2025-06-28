import { newDeep } from '.';

describe('storage', () => {
  describe('in-memory', () => {
    describe('patch', () => {
      it('basic', async () => {
        const deep1 = newDeep();
        const A1 = deep1();
        const selection1 = deep1.query({ _or: [
          { id: A1 },
          { type: deep1.Contain, from: A1 },
          { in: { type: deep1.Contain, from: A1 } },
          { valued: { in: { type: deep1.Contain, from: A1 } } },
        ] });
        const storage1 = new deep1.Storage.InMemory.Patch({ array: selection1 });
        await storage1.mount();
        expect(storage1.isMounted).toBe(true);
        console.log(selection1.data);
        console.log(storage1.state.patch.data.data);
        A1.B = deep1();
        console.log(selection1.data);
        console.log(storage1.state.patch.data.data);
        await storage1.unmount();
        expect(storage1.isUnmounted).toBe(true);
      });
    });
  });
});
