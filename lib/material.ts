import Debug from './debug';

const debug = Debug('material');

export interface Material {
  id: string;
  type_id?: string;
  from_id?: string;
  to_id?: string;
  value_id?: string;
  string?: string;
  number?: number;
  object?: any;
  function?: string;
  created_at: number;
  updated_at: number;
}

export function newMaterial(deep) {
  // Create Global as root association for named entities
  deep._contain.Global = new deep();
  
  // Query for global contexts - entities with names from Global
  const globals = deep._contain.globals = new deep.Field(function (this) {
    if (this._reason == deep.reasons.getter._id) {
      return deep.query({ type: deep.Contain, from: deep.Global });
    }
  });

  // Resolve path to association ID, checking globals for non-root paths
  const resolvePath = (pathStr: string): string | undefined => {
    debug('🔨 resolvePath', pathStr);
    
    if (pathStr === '/') return deep._id;
    
    const parts = pathStr.split('/').filter(p => p);
    if (parts.length === 0) return deep._id;
    
    let current = deep;
    const firstPart = parts[0];
    
    // Check if first part exists as ID
    if (deep._ids.has(firstPart)) {
      current = deep(firstPart);
      // Navigate through remaining parts starting from index 1
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        current = current._contain[part];
        if (!current) return undefined;
      }
    } else {
      // First check if it's a normal path from root
      current = deep._contain[firstPart];
      if (current) {
        // Navigate through remaining parts starting from index 1
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          current = current._contain[part];
          if (!current) return undefined;
        }
      } else {
        // Search in globals
        current = undefined;
        for (const globalContext of deep.globals) {
          if (globalContext.data === firstPart) {
            current = globalContext.to;
            break;
          }
        }
        
        if (!current) return undefined;
        
        // Navigate through remaining parts starting from index 1
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          current = current._contain[part];
          if (!current) return undefined;
        }
      }
    }
    
    return current._id;
  };

  // Path function for getting path string from current context
  deep._contain.path = new deep.Method(function (this, ...pathArgs: string[]) {
    debug('🔨 path method', this._source, pathArgs);
    
    if (pathArgs.length > 0) {
      // Resolve provided path
      const pathStr = pathArgs.join('/');
      const resolvedId = resolvePath(pathStr);
      return resolvedId ? deep(resolvedId) : undefined;
    }
    
    // Get path of current association
    const currentId = this._source;
    if (currentId === deep._id) return '/';
    
    const current = deep(currentId);
    const pathComponents: string[] = [];
    let pointer = current;
    
    // Walk up through Contains to build path
    while (pointer && pointer._id !== deep._id) {
      const inLinks = deep._To.many(pointer._id);
      let found = false;
      
      for (const inLinkId of inLinks) {
        const inLink = deep(inLinkId);
        if (inLink.type_id === deep.Contain._id) {
          pathComponents.unshift(inLink.data);
          pointer = inLink.from;
          found = true;
          break;
        }
      }
      
      if (!found) {
        // Check if this is a global entity
        for (const globalContext of deep.globals) {
          if (globalContext.to_id === pointer._id) {
            pathComponents.unshift(globalContext.data);
            return pathComponents.join('/');
          }
        }
        break;
      }
    }
    
    if (pointer && pointer._id === deep._id) {
      return '/' + pathComponents.join('/');
    }
    
    return pathComponents.join('/') || currentId;
  });

  // Material field - returns Material representation of current association
  deep._contain.material = new deep.Field(function (this) {
    if (this._reason != deep.reasons.getter._id) return;
    
    const association = deep(this._source);
    debug('🔨 material getter', association._id);
    
    const material: Material = {
      id: association.path(),
      created_at: association._created_at,
      updated_at: association._updated_at,
    };
    
    if (association.type_id) material.type_id = deep(association.type_id).path();
    if (association.from_id) material.from_id = deep(association.from_id).path();
    if (association.to_id) material.to_id = deep(association.to_id).path();
    if (association.value_id) material.value_id = deep(association.value_id).path();
    
    // Serialize data based on type
    if (association.type_id === deep.String._id) {
      material.string = association._data;
    } else if (association.type_id === deep.Number._id) {
      material.number = association._data;
    } else if (association.type_id === deep.Object._id) {
      material.object = association._data;
    } else if (association.type_id === deep.Function._id) {
      material.function = association._data.toString();
    }
    
    return material;
  });

  // Dematerial method - creates associations from Material objects
  deep._contain.dematerial = new deep.Method(function (this, material: Material) {
    debug('🔨 dematerial', material);
    
    if (!material || typeof material !== 'object') {
      throw new Error('Material must be an object');
    }
    
    const { id, type_id, from_id, to_id, value_id, string, number, object, function: funcStr } = material;
    
    if (!id) {
      throw new Error('Material must have an id');
    }
    
    // Create or get existing association
    let association = deep.path(id);
    if (!association) {
      association = new deep();
      
      // Create path structure
      const parts = id.split('/');
      let current: any;
      
      if (id.startsWith('/')) {
        // Root path
        current = deep;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue; // Skip empty parts from leading /
          
          if (i === parts.length - 1) {
            // Last part - assign the association
            current[part] = association;
          } else {
            // Intermediate part - create or navigate
            if (!current._contain[part]) {
              current[part] = new deep();
            }
            current = current._contain[part];
          }
        }
      } else {
        // Global path
        current = deep.Global;
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          
          if (i === parts.length - 1) {
            // Last part - assign the association
            current[part] = association;
          } else {
            // Intermediate part - create or navigate
            if (!current._contain[part]) {
              current[part] = new deep();
            }
            current = current._contain[part];
          }
        }
      }
    }
    
    // Set type, relations and data
    if (type_id) {
      const typeAssociation = deep.path(type_id) || new deep();
      association.type_id = typeAssociation._id;
    }
    
    if (from_id) {
      const fromAssociation = deep.path(from_id) || new deep();
      association.from_id = fromAssociation._id;
    }
    
    if (to_id) {
      const toAssociation = deep.path(to_id) || new deep();
      association.to_id = toAssociation._id;
    }
    
    if (value_id) {
      const valueAssociation = deep.path(value_id) || new deep();
      association.value_id = valueAssociation._id;
    }
    
    // Set data based on type - create properly typed associations
    if (string !== undefined) {
      const stringAssociation = new deep.String(string);
      association.type_id = stringAssociation.type_id;
      association._data = stringAssociation._data;
    } else if (number !== undefined) {
      const numberAssociation = new deep.Number(number);
      association.type_id = numberAssociation.type_id;
      association._data = numberAssociation._data;
    } else if (object !== undefined) {
      const objectAssociation = new deep.Object(object);
      association.type_id = objectAssociation.type_id;
      association._data = objectAssociation._data;
    } else if (funcStr !== undefined) {
      const func = eval(`(${funcStr})`);
      const funcAssociation = new deep.Function(func);
      association.type_id = funcAssociation.type_id;
      association._data = funcAssociation._data;
    }
    
    // Set timestamps - only if not already set
    if (material.created_at && !association._created_at) {
      association._created_at = material.created_at;
    }
    if (material.updated_at) {
      association._updated_at = material.updated_at;
    }
    
    debug('🔨 dematerialized', association._id, association.path());
    return association;
  });
} 