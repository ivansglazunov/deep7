// Implements a backwards reference accessor for _Relation instances,
// providing access to bidirectional relationships through Deep.Set instances.
import { _Relation } from './_relation';

/**
 * Creates a Field that provides access to the backward sets of a _Relation instance.
 * This allows access patterns like deep.typed, deep.in, deep.out, deep.valued
 * which return the deep.Set instances representing backward references.
 * 
 * @param deep The deep factory
 * @param relation The _Relation instance to create a backward accessor for
 * @param reasonId The reason ID to use for backward relationships
 * @returns A Field that provides access to backward sets
 */
export function newBackward(deep: any, relation: _Relation, reasonId: string) {
  // Define the backward field accessor
  const _Backward = new deep.Field(function(this: any) {
    if (this._reason === deep.reasons.getter._id) {
      const self = new deep(this._source);
      
      // Create a Deep.Set to hold backward references
      const set = relation.many(self._id);

      let deepSet;
      if (set instanceof deep.Deep) deepSet = set;
      else {
        deepSet = new deep.Set(set);
        relation._backward.set(self._id, deepSet);
      }

      const backwardSet = new _BackwardSet();
      backwardSet.value = deepSet;
      backwardSet._source = self._id;
      backwardSet._reason = reasonId;
      return backwardSet;
    } else if (this._reason === deep.reasons.setter._id || this._reason === deep.reasons.deleter._id) {
      throw new Error('Cannot set or delete backward references directly.');
    }
  });

  const _BackwardSet = _Backward._context.BackwardSet = new deep();

  return _Backward;
} 