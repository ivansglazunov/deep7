export function newLifecycle(deep: any) {
  // Define valid transitions
  const validTransitions = {
    [undefined as any]: [deep.Deep._Mounting],
    [deep.Deep._Mounting]: [deep.Deep._Mounted],
    [deep.Deep._Mounted]: [deep.Deep._Remounting, deep.Deep._Unmounting],
    [deep.Deep._Remounting]: [deep.Deep._Mounted],
    [deep.Deep._Unmounting]: [deep.Deep._Unmounted],
    [deep.Deep._Unmounted]: [deep.Deep._Mounting]
  };

  // Lifestage enum-like object
  deep.Lifestage = new deep(deep.Deep._Lifestage);
  deep.Mounting = deep.Lifestage(deep.Deep._Mounting);
  deep.Mounted = deep.Lifestage(deep.Deep._Mounted);
  deep.Unmounting = deep.Lifestage(deep.Deep._Unmounting);
  deep.Unmounted = deep.Lifestage(deep.Deep._Unmounted);
  deep.Remounting = deep.Lifestage(deep.Deep._Remounting);

  deep.Lifestate = new deep(deep.Deep._Lifestate);

  // Lifestate field
  deep.lifestate = deep.Field((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._FieldGetter: {
        const lifestates = deep.Query({
          type: deep.Lifestate,
          from: target.proxy,
        });
        const result = lifestates.data.size > 0 ? lifestates.data.values().next().value : undefined;
        lifestates.destroy();
        return result ? deep(result) : undefined;
      } case deep.Deep._FieldSetter: {
        // Don't allow direct setting of lifestate
        return;
      } default:
        return;
    }
  });

  // Helper function to create lifecycle methods
  function createLifecycleMethod(targetStage: any) {
    const targetStageId = targetStage.id;

    return new deep.Function(function (this: any, ...args: any[]) {
      const action = () => {
        const target = this._target || this;
        const state = this.lifestate;
        const stageId = state?.to_id;
        if (stageId === targetStageId) return;
        const allowedTransitions = validTransitions[stageId] || [];
        if (!allowedTransitions.includes(targetStageId)) throw new Error(`Invalid lifecycle transition from ${stageId} to ${targetStageId}`);
        if (!state) {
          const state = new deep.Lifestate();
          state.from = this;
          state.to = targetStage;
        } else {
          state.to = targetStage;
        }
        return this._deep.use({
          source: this._deep,
          target: this._deep,
          stage: targetStageId,
          args
        });
      };

      // Add to promise queue
      this.promise = action;
    });
  }

  // Create lifecycle methods
  deep.mount = createLifecycleMethod(deep.Mounting);
  deep.mounted = createLifecycleMethod(deep.Mounted);
  deep.unmount = createLifecycleMethod(deep.Unmounting);
  deep.unmounted = createLifecycleMethod(deep.Unmounted);
  deep.remount = createLifecycleMethod(deep.Remounting);

  // Add is* getters
  const createIsGetter = (stage: any) => {
    const targetStageId = stage.id;
    return deep.Field((worker, source, target, stage, args) => {
      const state = target.proxy.lifestate;
      return state?.to_id === targetStageId;
    });
  };

  deep.isMounting = createIsGetter(deep.Mounting);
  deep.isMounted = createIsGetter(deep.Mounted);
  deep.isUnmounting = createIsGetter(deep.Unmounting);
  deep.isUnmounted = createIsGetter(deep.Unmounted);
  deep.isRemounting = createIsGetter(deep.Remounting);

  return deep;
}
