export function newStd(deep: any) {
  // Create fields for logs, warnings, and errors
  const logsField = new deep.Field((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._FieldGetter: {
        return target.ref.__logs = target.ref.__logs || new deep.Array();
      } default: throw new Error('deep.logs:readonly');
    }
  });

  const warningsField = new deep.Field((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._FieldGetter: {
        return target.ref.__warnings = target.ref.__warnings || new deep.Array();
      } default: throw new Error('deep.warnings:readonly');
    }
  });

  const errorsField = new deep.Field((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._FieldGetter: {
        return target.ref.__errors = target.ref.__errors || new deep.Array();
      } default: throw new Error('deep.errors:readonly');
    }
  });

  // Create log functions using deep.Function
  const logFn = new deep.Function(function(this: any, ...args: any[]) {
    this.logs.push(args);
  });

  const warnFn = new deep.Function(function(this: any, ...args: any[]) {
    this.warnings.push(args);
  });

  const errorFn = new deep.Function(function(this: any, ...args: any[]) {
    this.errors.push(args);
  });

  // Add all methods and properties to the deep instance using Inherit
  new deep.Inherit(deep, 'logs', logsField);
  new deep.Inherit(deep, 'warnings', warningsField);
  new deep.Inherit(deep, 'errors', errorsField);
  new deep.Inherit(deep, 'log', logFn);
  new deep.Inherit(deep, 'warn', warnFn);
  new deep.Inherit(deep, 'error', errorFn);
}
