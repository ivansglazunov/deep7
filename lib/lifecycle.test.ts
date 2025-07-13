import { newDeep } from './deep';

const deep = newDeep();

describe('Lifecycle', () => {

  it('should have lifecycle stages defined', () => {
    expect(deep.Deep._Mounting).toBeDefined();
    expect(deep.Deep._Mounted).toBeDefined();
    expect(deep.Deep._Unmounting).toBeDefined();
    expect(deep.Deep._Unmounted).toBeDefined();
    expect(deep.Deep._Remounting).toBeDefined();
  });

  it('should have lifecycle instances', () => {
    expect(deep.Mounting).toBeDefined();
    expect(deep.Mounted).toBeDefined();
    expect(deep.Unmounting).toBeDefined();
    expect(deep.Unmounted).toBeDefined();
    expect(deep.Remounting).toBeDefined();
  });

  it('should have lifecycle methods', () => {
    expect(typeof deep.mount).toBe('function');
    expect(typeof deep.mounted).toBe('function');
    expect(typeof deep.unmount).toBe('function');
    expect(typeof deep.unmounted).toBe('function');
    expect(typeof deep.remount).toBe('function');
  });

  it('should have lifecycle state getters', () => {
    expect(deep.isMounting).toBeDefined();
    expect(deep.isMounted).toBeDefined();
    expect(deep.isUnmounting).toBeDefined();
    expect(deep.isUnmounted).toBeDefined();
    expect(deep.isRemounting).toBeDefined();
  });

  it('should have initial state', () => {
    expect(deep.lifestate).toBeUndefined();
  });

  describe('Lifecycle Transitions', () => {
    it('should transition through mount lifecycle', async () => {
      const a = deep();
      a.mount();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Mounting.id);
      
      a.mounted();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Mounted.id);

      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should transition through unmount lifecycle', async () => {
      const a = deep();
      a.mount();
      a.mounted();

      a.unmount();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Unmounting.id);

      a.unmounted();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Unmounted.id);
    });

    it('should transition through remount lifecycle', async () => {
      const a = deep();
      await a.mount();
      await a.mounted();

      await a.remount();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Remounting.id);

      await a.mounted();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Mounted.id);
    });

    it('should handle remount from unmounted state', async () => {
      const a = deep();
      await a.mount();
      await a.mounted();
      await a.unmount();
      await a.unmounted();

      await a.mount();
      await a.promise;
      expect(a.lifestate?.to_id).toBe(deep.Mounting.id);
    });
  });

  describe('Lifecycle State Getters', () => {
    it('should correctly report Mounting state', async () => {
      const a = deep();
      expect(a.isMounting).toBe(false);

      a.mount();
      await a.promise;
      expect(a.isMounting).toBe(true);
    });

    it('should correctly report Mounted state', async () => {
      const a = deep();

      a.mount();
      await a.promise;
      expect(a.isMounted).toBe(false);

      a.mounted();
      expect(a.isMounted).toBe(false);
      await a.promise;
      expect(a.isMounted).toBe(true);
    });

    it('should correctly report Unmounting state', async () => {
      const a = deep();
      await a.mount();
      await a.mounted();

      expect(a.isUnmounting).toBe(false);

      a.unmount();
      expect(a.isUnmounting).toBe(false);
      await a.promise;
      expect(a.isUnmounting).toBe(true);

      a.unmounted();
      expect(a.isUnmounting).toBe(true);
      await a.promise;
      expect(a.isUnmounting).toBe(false);
    });

    it('should correctly report Unmounted state', async () => {
      const a = deep();
      expect(a.isUnmounted).toBe(false);

      a.mount();
      a.mounted();
      expect(a.isUnmounted).toBe(false);

      a.unmount();
      expect(a.isUnmounted).toBe(false);

      a.unmounted();
      expect(a.isUnmounted).toBe(false);
      await a.promise;
      expect(a.isUnmounted).toBe(true);
    });

    it('should correctly report Remounting state', async () => {
      const a = deep();
      a.mount();
      a.mounted();
      expect(a.isRemounting).toBe(false);
      a.remount();
      expect(a.isRemounting).toBe(false);
      await a.promise;
      expect(a.isRemounting).toBe(true);
      a.mounted();
      expect(a.isRemounting).toBe(true);
      await a.promise;
      expect(a.isRemounting).toBe(false);
    });
  });

  describe('Invalid Transitions', () => {
    it('should log error when transitioning from unmounted to mounted', async () => {
      const instance = deep();
      instance.mounted();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from undefined to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from unmounted to unmounting', async () => {
      const instance = deep();
      instance.unmount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from undefined to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from unmounted to remounting', async () => {
      const instance = deep();
      instance.remount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from undefined to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from mounting to unmounting', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.unmount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from [a-f0-9-]+ to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from mounting to remounting', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.remount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from [a-f0-9-]+ to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from mounted to mounting', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.mounted();
      await instance.promise;
      instance.mount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from [a-f0-9-]+ to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from unmounting to mounting', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.mounted();
      await instance.promise;
      instance.unmount();
      await instance.promise;
      instance.mount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from [a-f0-9-]+ to [a-f0-9-]+$/);
    });

    it('should log error when transitioning from unmounting to remounting', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.mounted();
      await instance.promise;
      instance.unmount();
      await instance.promise;
      instance.remount();
      await instance.promise;
      expect(instance.errors?.data).toHaveLength(1);
      expect(instance.errors?.data?.[0][0]).toBeInstanceOf(Error);
      expect(instance.errors?.data?.[0][0].message).toMatch(/^Invalid lifecycle transition from [a-f0-9-]+ to [a-f0-9-]+$/);
    });

    it('should not log error when transitioning from unmounted to unmounted', async () => {
      const instance = deep();
      instance.mount();
      await instance.promise;
      instance.mounted();
      await instance.promise;
      instance.unmount();
      await instance.promise;
      instance.unmounted();
      await instance.promise;
      instance.unmounted();
      await instance.promise;
      // No error should be logged when calling unmounted() multiple times
      expect(instance.errors?.data).toHaveLength(0);
    });
  });
});
