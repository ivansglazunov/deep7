function isPlainObject(obj: any): boolean {
  if (obj === null || typeof obj !== 'object' || obj.nodeType ||
    (obj.constructor && !Object.prototype.hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf'))) {
    return false;
  }
  return true;
}

export function newQueryManyRelation(deep: any) {
  return new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [association, fieldName] = args;
        if (!(association instanceof deep.Deep)) throw new Error(`association must be a Deep instance`);
        if (typeof fieldName !== 'string') throw new Error(`fieldName must be a string`);

        const query = target.new();
        query.ref.association = association;
        query.ref.fieldName = fieldName;
        const proxy = query.proxy;

        if (deep.Deep.manyRelationFields.includes(fieldName)) {
          proxy.value = association.proxy[fieldName];
        } else if (deep.Deep.oneRelationFields.includes(fieldName)) {
          const relatedId = association.proxy[fieldName + '_id'];
          proxy.value = new deep.Set(relatedId ? new Set([relatedId]) : new Set());
          deep.Deep.defineCollection(association._deep, query.id);
        } else {
          throw new Error(`Invalid field name: ${fieldName}`);
        }

        return proxy;
      }
      case deep.Deep._Destructor: {
        if (deep.Deep.oneRelationFields.includes(target.ref.fieldName)) {
          deep.Deep.undefineCollection(target.ref.association, target.id);
          target.proxy.value.destroy();
        }
        return worker.super(source, target, stage, args);
      }
      case deep.Deep._Updated: { // Only for oneRelationFields
        const [updatedElement, updatedField, newValue, oldValue] = args;
        if (updatedElement.id === target.ref.association.id && updatedField === target.ref.fieldName) {
          const resultSet = target.proxy.value;
          if (oldValue) resultSet.delete(oldValue);
          if (newValue) resultSet.add(newValue);
        }
        return;
      }
      default: return worker.super(source, target, stage, args);
    }
  });
}

export function newQueryField(deep: any) {
  return new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [instance, fieldName] = args;
        if (!(instance instanceof deep.Deep)) throw new Error(`instance must be a Deep instance`);
        if (typeof fieldName !== 'string') throw new Error(`fieldName must be a string`);
        const invertedField = deep.Deep.fieldInvert[fieldName];
        if (!invertedField) throw new Error(`Invalid fieldName: ${fieldName}`);

        const queryField = target.new();
        const manyRelation = deep.QueryManyRelation(instance._deep, invertedField);
        queryField.proxy.value = manyRelation.value;
        queryField.ref._manyRelation = manyRelation;
        return queryField.proxy;
      }
      case deep.Deep._Destructor: {
        if (target.ref._manyRelation) target.ref._manyRelation.destroy();
        return worker.super(source, target, stage, args);
      }
      default: return worker.super(source, target, stage, args);
    }
  });
}

export function newQuery(deep: any) {
  return new deep((worker, source, target, stage, args) => {
    switch (stage) {
      case deep.Deep._Apply:
      case deep.Deep._New: {
        const [expression, selectionSet] = args;
        if (!isPlainObject(expression)) throw new Error(`deep.Query:!expression`);

        const global = selectionSet || deep.Deep._relations.all;

        const result = target.new();
        result.ref._expression = expression;
        result.ref._results = {};
        result.ref._selectionSet = selectionSet;
        const andArray: any[] = [];

        for (const key in expression) {
          const value = expression[key];
          if (value instanceof deep.Deep) {
            const queryFieldInstance = deep.QueryField(value._deep, key);
            result.ref._results[key] = queryFieldInstance;
            result.defineSource(queryFieldInstance.id);
            andArray.push(queryFieldInstance.value);
          } else throw new Error(`deep.Query:!expression`);
        }

        if (selectionSet) andArray.push(selectionSet);

        const proxy = result.proxy;
        if (andArray.length > 1) proxy.value = deep.SetAnd(...andArray);
        else if (andArray.length) {
          const results = proxy.value = deep();
          results.value = andArray[0];
        } else {
          const results = proxy.value = deep();
          results.value = global;
        }
        return proxy;
      }
      case deep.Deep._Destructor: {
        const results = target.ref._results || {};
        for (const key in results) {
          target.undefineSource(results[key].id);
        }
        const value_id = target.proxy.value?.id;
        if (value_id !== target.ref._selectionSet?.id) {
          target.proxy.value.destroy();
        }
        return worker.super(source, target, stage, args);
      }
      default: return worker.super(source, target, stage, args);
    }
  });
}
