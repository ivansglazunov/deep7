import { newDeep } from '.';

describe('lifecycle', () => {
  it('full lifecycle', async () => {
    const deep = newDeep();
    let statuses = {
      insideCounstructed: false,
      insideMounting: false,
      insideMounted: false,
      insideUnmounting: false,
      insideUnmounted: false,
      insideDestroyed: false,
    };
    const lifecycle = new deep.Lifecycle(async (lifestate) => {
      statuses.insideCounstructed = true;
      if (lifestate == deep.Mounting) {
        statuses.insideMounting = true;
      }
      if (lifestate == deep.Mounted) {
        statuses.insideMounted = true;
      }
      if (lifestate == deep.Unmounting) {
        statuses.insideUnmounting = true;
      }
      if (lifestate == deep.Unmounted) {
        statuses.insideUnmounted = true;
      }
      if (lifestate == deep.Destroyed) {
        statuses.insideDestroyed = true;
      }
    });

    expect(lifecycle.isMounting).toBe(false);
    expect(lifecycle.isMounted).toBe(false);
    expect(lifecycle.isUnmounting).toBe(false);
    expect(lifecycle.isUnmounted).toBe(false);

    console.log('Before mount: pendingCount =', lifecycle._getState(lifecycle._id)._pendingPromises);
    lifecycle.mount;
    expect(lifecycle.isPromising).toBe(true);
    console.log('Before await: pendingCount =', lifecycle._getState(lifecycle._id)._pendingPromises);
    await lifecycle.promise;
    console.log('After await: pendingCount =', lifecycle._getState(lifecycle._id)._pendingPromises);
    expect(lifecycle.isPromising).toBe(false);

    console.log({
      lifestateTypeName: lifecycle.lifestate?.type?.name,
      lifestate: lifecycle.lifestate?._id,
      lifestateType: lifecycle.lifestate?._type,
      Mounting: deep.Mounting._id,
    });
    expect(lifecycle.isMounting).toBe(true);
    expect(lifecycle.isMounted).toBe(false);
    expect(lifecycle.isUnmounting).toBe(false);
    expect(lifecycle.isUnmounted).toBe(false);

    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(false);
    expect(statuses.insideUnmounting).toBe(false);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);

    await lifecycle.mounted;
    expect(lifecycle.isMounted).toBe(true);
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(false);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);
    
    await lifecycle.unmount;
    expect(lifecycle.isUnmounting).toBe(true);
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(false);
    expect(statuses.insideDestroyed).toBe(false);
    
    await lifecycle.unmounted;
    expect(lifecycle.isUnmounted).toBe(true);
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(true);
    expect(statuses.insideDestroyed).toBe(false);

    lifecycle.destroy();
    expect(lifecycle.isUnmounted).toBe(false);
    expect(statuses.insideCounstructed).toBe(true);
    expect(statuses.insideMounting).toBe(true);
    expect(statuses.insideMounted).toBe(true);
    expect(statuses.insideUnmounting).toBe(true);
    expect(statuses.insideUnmounted).toBe(true);
    expect(statuses.insideDestroyed).toBe(true);
  });
}); 