import { newDeep } from '.';

describe('lifecycle', () => {
  it('full lifecycle', async () => {
    const deep = newDeep();
    let statuses: any = {
      insideCounstructed: undefined,
      insideMounting: undefined,
      insideMounted: undefined,
      insideUnmounting: undefined,
      insideUnmounted: undefined,
      insideDestroyed: undefined,
    };
    const Lifecycle = new deep.Lifecycle();
    Lifecycle.effect = async (lifestate, args = []) => {
      if (lifestate == deep.Constructed) {
        statuses.insideCounstructed = args[0];
      }
      if (lifestate == deep.Mounting) {
        statuses.insideMounting = args[0];
      }
      if (lifestate == deep.Mounted) {
        statuses.insideMounted = args[0];
      }
      if (lifestate == deep.Updating) {
        statuses.insideUpdating = args[0];
      }
      if (lifestate == deep.Unmounting) {
        statuses.insideUnmounting = args[0];
      }
      if (lifestate == deep.Unmounted) {
        statuses.insideUnmounted = args[0];
      }
      if (lifestate == deep.Destroyed) {
        statuses.insideDestroyed = true;
      }
    }
    
    expect(statuses.insideCounstructed).toBe(undefined);

    const lifecycle = new Lifecycle(123);
    expect(statuses.insideCounstructed).toBe(123);
    
    expect(lifecycle.isMounting).toBe(false);
    expect(lifecycle.isMounted).toBe(false);
    expect(lifecycle.isUnmounting).toBe(false);
    expect(lifecycle.isUnmounted).toBe(false);

    lifecycle.mount(234);
    expect(lifecycle.isPromising).toBe(true);
    await lifecycle.promise;
    expect(lifecycle.isPromising).toBe(false);
    
    expect(lifecycle.isMounting).toBe(true);
    expect(lifecycle.isMounted).toBe(false);
    expect(lifecycle.isUnmounting).toBe(false);
    expect(lifecycle.isUnmounted).toBe(false);
    
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(undefined);
    expect(statuses.insideUnmounting).toBe(undefined);
    expect(statuses.insideUnmounted).toBe(undefined);
    expect(statuses.insideDestroyed).toBe(undefined);

    expect(lifecycle.isPromising).toBe(false);
    lifecycle.mounted(345);
    expect(lifecycle.isPromising).toBe(true);
    await lifecycle.promise;
    expect(lifecycle.isPromising).toBe(false);
    expect(lifecycle.isMounted).toBe(true);
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(345);
    expect(statuses.insideUnmounting).toBe(undefined);
    expect(statuses.insideUnmounted).toBe(undefined);
    expect(statuses.insideDestroyed).toBe(undefined);

    expect(() => lifecycle.unmounted()).toThrow('Cannot transition from Mounted to Unmounted');

    await lifecycle.update(777);
    expect(lifecycle.isUpdating).toBe(true);
    expect(lifecycle.isMounted).toBe(false);
    expect(lifecycle.isUnmounting).toBe(false);
    expect(lifecycle.isUnmounted).toBe(false);
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(345);
    expect(statuses.insideUpdating).toBe(777);
    expect(statuses.insideUnmounting).toBe(undefined);
    expect(statuses.insideUnmounted).toBe(undefined);
    expect(statuses.insideDestroyed).toBe(undefined);
    
    await lifecycle.unmount(456);
    expect(lifecycle.isUnmounting).toBe(true);
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(345);
    expect(statuses.insideUpdating).toBe(777);
    expect(statuses.insideUnmounting).toBe(456);
    expect(statuses.insideUnmounted).toBe(undefined);
    expect(statuses.insideDestroyed).toBe(undefined);

    expect(() => lifecycle.lifestate = deep.Mounting).toThrow('Cannot transition from Unmounting to Mounting');
    
    await lifecycle.unmounted(567);
    expect(lifecycle.isUnmounted).toBe(true);
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(345);
    expect(statuses.insideUpdating).toBe(777);
    expect(statuses.insideUnmounting).toBe(456);
    expect(statuses.insideUnmounted).toBe(567);
    expect(statuses.insideDestroyed).toBe(undefined);

    lifecycle.destroy();
    expect(lifecycle.isUnmounted).toBe(false);
    expect(statuses.insideCounstructed).toBe(123);
    expect(statuses.insideMounting).toBe(234);
    expect(statuses.insideMounted).toBe(345);
    expect(statuses.insideUpdating).toBe(777);
    expect(statuses.insideUnmounting).toBe(456);
    expect(statuses.insideUnmounted).toBe(567);
    expect(statuses.insideDestroyed).toBe(true);
  });

  it('lifecycle.error', async () => {
    const deep = newDeep();
    const Lifecycle = new deep.Lifecycle();
    Lifecycle.effect = function(lifestate, args = []) {
      if (lifestate == deep.Constructed) {
        this.on(deep.events.error, (error) => {
          if (error == 'panic') {
            this.unmount();
          } else {
            this.state.errors = [...this.state.errors || [], error];
          }
        });
      } else if (lifestate == deep.Mounting) {
        this.mounted();
      } else if (lifestate == deep.Unmounting) {
        this.unmounted();
      }
    }
    const lifecycle = new Lifecycle(123);
    await lifecycle.mount();
    expect(lifecycle.isMounted).toBe(true);
    lifecycle.error('warning');
    lifecycle.error('error');
    lifecycle.error('panic');
    expect(lifecycle.state.errors).toEqual(['warning', 'error']);
    expect(lifecycle.isUnmounted).toBe(true);
  });
}); 