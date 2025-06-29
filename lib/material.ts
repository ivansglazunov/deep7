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

// Helper functions for path resolution
function _pathResolver(fullPath: string, deep: any): any {
  debug('_pathResolver', fullPath);
  if (fullPath === '/') return deep;
  
  const parts = fullPath.split('/').filter(part => part !== '');
  const isGlobal = !fullPath.startsWith('/');
  
  // Check if first part is an existing ID
  const firstPart = parts[0];
  const safeIds = deep._ids instanceof deep.Deep ? deep._ids._data : deep._ids;
  if (firstPart && safeIds.has(firstPart)) {
    // Start from existing association
    let current = new deep(firstPart);
    
    // Process remaining parts
    for (let i = 1; i < parts.length; i++) {
      if (!current._contain || !current._contain[parts[i]]) {
        return undefined;
      }
      current = current._contain[parts[i]];
    }
    
    return current;
  }
  
  let current;
  
  if (isGlobal) {
    // Check if first part is a registered root
    const firstPart = parts[0];
    if (deep.Root.state.roots.has(firstPart)) {
      const rootId = deep.Root.state.roots.get(firstPart);
      current = new deep(rootId);
      // Process remaining parts
      for (let i = 1; i < parts.length; i++) {
        if (!current._contain || !current._contain[parts[i]]) {
          return undefined;
        }
        current = current._contain[parts[i]];
      }
      return current;
    } else {
      return undefined; // Root not found
    }
  } else {
    current = deep;
    for (const part of parts) {
      if (!current._contain || !current._contain[part]) {
        return undefined;
      }
      current = current._contain[part];
    }
  }
  
  return current;
}

function _nameResolver(container: any, name: string): any {
  debug('_nameResolver', name);
  if (!container._contain || !container._contain[name]) {
    return undefined;
  }
  return container._contain[name];
}

export function newMaterial(deep: any) {
  // Create Root lifecycle
  const Root = deep.Root = new deep.Lifecycle();
  Root.state.roots = new Map();
  
  Root.effect = function (lifestate: any, args: any[] = []) {
    debug('Root.effect', lifestate, args);
    if (lifestate === deep.Constructed) {
      if (typeof args[0] !== 'string') {
        throw new Error('Root constructor requires a string as first argument');
      }
      if (!(args[1] instanceof deep.Deep)) {
        throw new Error('Root constructor requires a Deep instance as second argument');
      }
      
      this.value = new deep.String(args[0]);
      this.to = args[1];
      
      // Register in roots map
      Root.state.roots.set(args[0], args[1]._id);
      debug('Root registered', args[0], args[1]._id);
    } else if (lifestate === deep.Destroyed) {
      if (this.value && this.value.data) {
        Root.state.roots.delete(this.value.data);
        debug('Root unregistered', this.value.data);
      }
    }
  };

  // Path method for getting/resolving paths
  deep.path = new deep.Method(function (this: any, targetPath?: string) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    
    if (targetPath) {
      // Resolve path mode
      return _pathResolver(targetPath, deep);
    } else {
      // Get path mode
      debug('Getting path for', sourceId);
      
      // Check if it's the root deep
      if (sourceId === deep._id) {
        return '/';
      }
      
      // Find context that contains this association
      const contexts = deep.query({
        type: deep.Contain,
        to: source,
        value: { type: deep.String }
      });
      
      if (contexts.size === 0) {
        // Not in any context, return just the id
        return sourceId;
      }
      
      const context = contexts.first;
      const name = context.value.data;
      const parent = context.from;
      
      // Check if parent is Root - find if this is a registered root
      let rootName = null;
      for (const [rName, id] of deep.Root.state.roots.entries()) {
        if (id === parent._id) {
          rootName = rName;
          break;
        }
      }
      
      if (rootName) {
        return `${rootName}/${name}`;
      }
      
      // Check if parent is deep root
      if (parent._id === deep._id) {
        return `/${name}`;
      }
      
      // Recursively build path
      const parentPath = parent.path();
      if (parentPath === '/') {
        return `/${name}`;
      } else if (parentPath.startsWith('/')) {
        return `${parentPath}/${name}`;
      } else {
        return `${parentPath}/${name}`;
      }
    }
  });

  // Material field for getting Material representation
  deep.material = new deep.Field(function (this: any) {
    const sourceId = this._source;
    const source = new deep(sourceId);
    
    if (this._reason === deep.reasons.getter._id) {
      const result: Material = {
        id: source.path(),
        created_at: source._created_at,
        updated_at: source._updated_at,
      };
      
      if (source.type_id) result.type_id = new deep(source.type_id).path();
      if (source.from_id) result.from_id = new deep(source.from_id).path();
      if (source.to_id) result.to_id = new deep(source.to_id).path();
      if (source.value_id) result.value_id = new deep(source.value_id).path();
      
      if (source.type_id === deep.String._id) result.string = source._data;
      if (source.type_id === deep.Number._id) result.number = source._data;
      if (source.type_id === deep.Function._id) result.function = source._data.toString();
      if (source.type_id === deep.Object._id) result.object = source._data;
      
      debug('Generated material', result);
      return result;
    }
  });

  // Dematerial method for parsing Material objects
  deep.dematerial = new deep.Method(function (this: any, material: Material) {
    debug('Dematerializing', material);
    
    if (!material || typeof material !== 'object') {
      throw new Error('Material must be an object');
    }
    
    if (!material.id) {
      throw new Error('Material must have an id');
    }
    
    // Resolve or create the association
    let association = deep.path(material.id);
    
    // Check if association is frozen and create new one if needed
    const isFrozen = association && association._Deep && association._Deep.__freezeInitialAssociations && 
                     association._Deep._initialAssociationIds && 
                     association._Deep._initialAssociationIds.has(association._id);
    
    if (!association || isFrozen) {
      const path = material.id;
      
      // Always create context structure for paths (not just raw IDs)
      if (path !== '/' && (path.includes('/') || !path.match(/^[a-f0-9-]{36}$/))) {
        const parts = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');
        const isGlobal = !path.startsWith('/');
        let current = isGlobal ? deep.Root : deep;
        
        // Process parent parts (if any) and create proper Contain relationships
        for (let i = 0; i < parts.length - 1; i++) {
          const partName = parts[i];
          let nextAssociation = current._contain[partName];
          
          if (!nextAssociation) {
            nextAssociation = new deep();
            
            // Create proper Contain relationship for intermediate parts
            const contain = new deep.Contain();
            contain.from_id = current._id;
            contain.to_id = nextAssociation._id;
            
            const nameString = new deep.String(partName);
            contain.value_id = nameString._id;
            
            current._contain[partName] = nextAssociation;
          }
          current = nextAssociation;
        }
        
        // Create typed association based on data
        const finalName = parts[parts.length - 1];
        if (finalName) {
          if (material.string !== undefined) {
            association = new deep.String(material.string);
          } else if (material.number !== undefined) {
            association = new deep.Number(material.number);
          } else if (material.function !== undefined) {
            association = new deep.Function(eval(material.function));
          } else if (material.object !== undefined) {
            association = new deep.Object(material.object);
          } else {
            association = new deep();
          }
          
          // Create proper Contain relationship
          const contain = new deep.Contain();
          contain.from_id = current._id;
          contain.to_id = association._id;
          
          // Create String value for the name
          const nameString = new deep.String(finalName);
          contain.value_id = nameString._id;
        } else {
          // Fallback to direct creation
          if (material.string !== undefined) {
            association = new deep.String(material.string);
          } else if (material.number !== undefined) {
            association = new deep.Number(material.number);
          } else if (material.function !== undefined) {
            association = new deep.Function(eval(material.function));
          } else if (material.object !== undefined) {
            association = new deep.Object(material.object);
          } else {
            association = new deep();
          }
        }
      } else {
        // Create typed association directly for raw IDs
        if (material.string !== undefined) {
          association = new deep.String(material.string);
        } else if (material.number !== undefined) {
          association = new deep.Number(material.number);
        } else if (material.function !== undefined) {
          association = new deep.Function(eval(material.function));
        } else if (material.object !== undefined) {
          association = new deep.Object(material.object);
        } else {
          association = new deep();
        }
      }
    }
    
        // Set properties using path resolution
    if (material.type_id) {
      const typeAssociation = deep.path(material.type_id);
      if (typeAssociation) {
        association.type_id = typeAssociation._id;
      }
    }
    
    if (material.from_id) {
      const fromAssociation = deep.path(material.from_id);
      if (fromAssociation) {
        association.from_id = fromAssociation._id;
      }
    }
    
    if (material.to_id) {
      const toAssociation = deep.path(material.to_id);
      if (toAssociation) {
        association.to_id = toAssociation._id;
      }
    }
    
    if (material.value_id) {
      const valueAssociation = deep.path(material.value_id);
      if (valueAssociation) {
        association.value_id = valueAssociation._id;
      }
    }
    
    // Data is already set during creation, no need to set again
    
    // Set timestamps (only if not already set)
    if (material.created_at && !association._created_at) {
      association._created_at = material.created_at;
    }
    if (material.updated_at) {
      association._updated_at = material.updated_at;
    }
    
    debug('Dematerialized', association._id, association.path());
    return association;
  });
} 