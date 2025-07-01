import { _delay } from './_promise';
import Debug from './debug';
import { Material } from './material';

const debug = Debug('packager');

export function newPackager(deep) {
  const Packager = new deep.Lifecycle();

  Packager.effect = async function(this: any, lifestate: any, args: any[]) {
    const packager = this;
    
    if (lifestate === deep.Constructed) {
      debug(`constructed: ${packager}`);
      
      const options = packager.state.options = args[0] || {};
      
      if (!options.storage) throw new Error('Packager requires storage option');
      packager.storage = options.storage;

      if (!!options.package) {
        packager.package = options.package;
        if (options.name) throw new Error('Packager package option and name option are mutually exclusive');
      } else if (options.name) {
        packager.package = new deep.Package(options.name, options.version);
      } else {
        packager.package = new deep.Package();
      }
      
      packager.children = new deep.Set(new Set());
      
    } else if (lifestate === deep.Mounting) {
      debug(`mounting: ${packager}`);
      
      // Subscribe to storage patch data events
      packager.state.repatch = async () => {
        packager?.state?.off && packager?.state?.off();
        
        const storage = packager.storage;
        const query = packager.query = deep.query({
          _or: [
            // { type: deep.Contain, from: packager.package },
            { in: { type: deep.Contain, from: packager.package } },
          ],
        });

        // watch package from query
        const offPackageAdd = query.on(deep.events.dataAdd, (payload: any) => {
          // await _delay(0);
          debug(`package dataAdd: ${packager}`, payload);
          if (payload.typeof(deep.Contain)) {
            debug(`package dataAdd: ${packager}`, payload, 'contain');
            const item = payload.to;
            if (!item) {
              debug(`package dataAdd: ${packager}`, payload, 'contain', 'no item');
              return;
            }
            const material = item.material;
            const index = storage.patch.data.findIndex((item: any) => item.id === material.id);
            if (index !== -1) {
              debug(`package dataAdd: ${packager}`, payload, 'contain', 'set');
              storage.patch.data.set(index, material);
            } else {
              debug(`package dataAdd: ${packager}`, payload, 'contain', 'add');
              storage.patch.data.add(material);
            }
          } else {
            debug(`package dataAdd: ${packager}`, payload, 'item');
            const item = payload;
            const material = item.material;
            
            const index = storage.patch.data.findIndex((item: any) => item.id === material.id);
            if (index !== -1) {
              debug(`package dataAdd: ${packager}`, payload, 'item', 'set');
              storage.patch.data.set(index, material);
            } else {
              debug(`package dataAdd: ${packager}`, payload, 'item', 'add');
              storage.patch.data.add(material);
            }
          }
        });
        
        const offPackageSet = query.on(deep.events.dataSet, (payload: any) => {
          // await _delay(0);
          debug(`package dataSet: ${packager}`, payload);
        });
        
        const offPackageDelete = query.on(deep.events.dataDelete, (payload: any) => {
          // await _delay(0);
          debug(`package dataDelete: ${packager}`, payload);
          if (payload.typeof(deep.Contain)) {
            debug(`package dataDelete: ${packager}`, payload, 'contain');
            const item = payload.to;
            if (!item) {
              debug(`package dataDelete: ${packager}`, payload, 'contain', 'no item');
              return;
            }
            const material = item.material;
            const found = storage.patch.data.find((item: any) => item.id === material.id);
            if (found) {
              debug(`package dataDelete: ${packager}`, payload, 'contain', 'delete');
              storage.patch.data.delete(found);
            }
          } else {
            debug(`package dataDelete: ${packager}`, payload, 'item');
            const item = payload;
            const material = item.material;
            const found = storage.patch.data.find((item: any) => item.id === material.id);
            if (found) {
              debug(`package dataDelete: ${packager}`, payload, 'item', 'delete');
              storage.patch.data.delete(found);
            }
          }
        });
        
        // watch patch from storage
        const offPatchAdd = storage.patch.data.on(deep.events.dataAdd, (payload: any) => {
          debug(`patch dataAdd: ${packager}`, payload);
          packager.handleAdd(payload);
        });
        
        const offPatchSet = storage.patch.data.on(deep.events.dataSet, (payload: any) => {
          debug(`patch dataSet: ${packager}`, payload);
          packager.handleSet(payload);
        });
        
        const offPatchDelete = storage.patch.data.on(deep.events.dataDelete, (payload: any) => {
          debug(`patch dataDelete: ${packager}`, payload);
          packager.handleDelete(payload);
        });
        
        packager.state.off = () => {
          offPatchAdd();
          offPatchSet();
          offPatchDelete();
          offPackageAdd();
          offPackageSet();
          offPackageDelete();
        };
      };
      
      await packager.state.repatch();
      await packager.storage.mount();

      let name, version;
      if (packager.storage.state.package) {
        name = packager.storage.state.package.name;
        version = packager.storage.state.package.version;
      }

      // Если пакет не существует - создать, если существует но без имени - обновить
      if (!packager.package) {
        if (!name) throw new Error('deep.Package({ name }) or storage .name is required');
        debug(`creating package from storage: name=${name}, version=${version}`);
        if (version) {
          packager.package = new deep.Package(name, version);
        } else {
          packager.package = new deep.Package(name);
        }
        debug(`created package: ${packager.package} packageName=${packager.package.packageName}`);
      } else if (!packager.package.packageName && name) {
        debug(`updating existing package from storage: name=${name}, version=${version}`);
        packager.package.packageName = name;
        if (version) packager.package.packageVersion = version;
        debug(`updated package: ${packager.package} packageName=${packager.package.packageName}`);
      }

      // Синхронизировать данные пакета в storage.state.package
      if (packager.package.data.name) {
        packager.storage.state.package.name = packager.package.data.name;
      }
      if (packager.package.data.version) {
        packager.storage.state.package.version = packager.package.data.version;
      }
      
      // Сохранить обновленные данные в память
      if (packager.storage.memory && packager.storage.memory.save) {
        await packager.storage.memory.save(packager.storage);
      }
      
      // TODO maybe not needed with events, need to check
      // Initial sync of existing data
      // if (packager.storage.patch && packager.storage.patch.data) {
      //   for (const item of packager.storage.patch.data.data) {
      //     packager.handleAdd(item);
      //   }
      // }
      
      packager.mounted();
      
    } else if (lifestate === deep.Updating) {
      debug(`updating: ${packager}`);
      
      const options = args[0] || {};
      let repatch = false;
      
      if (options.storage) {
        packager.storage = options.storage;
        repatch = true;
      }
      
      if (repatch) {
        await packager.state.repatch();
      }
      
      await packager.storage.update();
      packager.mounted();
      
    } else if (lifestate === deep.Unmounting) {
      debug(`unmounting: ${packager}`);
      
      packager?.state?.off && packager?.state?.off();
      await packager.patch.unmount();
      packager.patch.destroy();
      packager.unmounted();
    }
  };
  
  // Method to handle adding/updating raw data items
  Packager.handleAdd = new deep.Method(async function(this: any, rawItem: any) {
    const packager = deep(this._source);
    debug(`handleAdd: ${packager}`, rawItem);
    
    try {
      // Convert raw item to Material format if needed
      let material: Material;
      if (rawItem && typeof rawItem === 'object' && rawItem.id) {
        material = rawItem as Material;
      } else if (rawItem && rawItem.material) {
        // Raw item is a Deep object, get its material
        material = rawItem.material;
      } else {
        debug(`handleAdd: raw item structure:`, rawItem);
        throw new Error('Raw item must have an id property or material');
      }
      
      // Dematerialize to create association
      const association = deep.dematerial(material);
      
      // Add to packager.children
      packager.children.add(association);
      
      // If association has a named path (not just UUID), add to package
      const path = association.path();
      if (path && !isUUID(path) && !path.startsWith('/')) {
        // This is a named global entity, add to package
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1];
        packager.package[name] = association;
        debug(`added named association: ${name} -> ${association._id}`);
      }
      
    } catch (error) {
      debug(`error in handleAdd: ${(error as Error).message}`, rawItem);
      // Don't throw, just log the error to prevent packager from failing
    }
  });
  
  // Method to handle setting/updating raw data items
  Packager.handleSet = new deep.Method(async function(this: any, rawItem: any) {
    const packager = deep(this._source);
    debug(`handleSet: ${packager}`, rawItem);
    
    // For set events, we treat them the same as add for now
    await packager.handleAdd(rawItem);
  });
  
  // Method to handle deleting raw data items  
  Packager.handleDelete = new deep.Method(async function(this: any, rawItem: any) {
    const packager = deep(this._source);
    debug(`handleDelete: ${packager}`, rawItem);
    
    try {
      // Find the association by material id
      let targetAssociation;
      
      if (rawItem && typeof rawItem === 'object' && rawItem.id) {
        targetAssociation = deep.path(rawItem.id);
      }
      
      if (targetAssociation) {
        // Remove from packager.children
        packager.children.delete(targetAssociation);
        
        // If it was a named entity in package, remove from package but don't destroy association
        const path = targetAssociation.path(); 
        if (path && !isUUID(path) && !path.startsWith('/')) {
          const pathParts = path.split('/');
          const name = pathParts[pathParts.length - 1];
          delete packager.package[name];
          debug(`removed named association: ${name}`);
        }
      }
      
    } catch (error) {
      debug(`error in handleDelete: ${(error as Error).message}`, rawItem);
    }
  });
  
  deep.Packager = Packager;
  
  return Packager;
}

// Helper function to check if a string is a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Package constructor
export function newPackage(deep) {
  const Package = new deep.Lifecycle();
  Package.effect = function(this: any, lifestate: any, args: any[]) {
    const pckg = this;
    if (lifestate === deep.Constructed) {
      debug(`package constructed: ${pckg} (${args})`);
      pckg.value = new deep.Object({
        name: undefined,
        version: undefined,
      });
      if (args[0]) pckg.packageName = args[0];
      if (args[1]) pckg.packageVersion = args[1];
    }
  }

  Package.packageName = new deep.Field(function(this: any, key: any, value: any) {
    const source = deep(this._source);
    if (this._reason == deep.reasons.getter._id) {
      debug(`package name getter: ${source}`);
      return source.data.name;
    } else if (this._reason == deep.reasons.setter._id) {
      debug(`package name setter: ${source}`);
      if (typeof value !== 'string') throw new Error('package.name must be a string');
      if (deep.Global?._contain?.[source?.data?.name]?.is(source)) delete deep.Global[source.data.name];
      const result = source.data.name = value;
      if (!deep.Global?._contain[source?.data?.name]) deep.Global[value] = source;
      return result;
    } else throw new Error('package.name supports only getter and setter');
  });

  Package.packageVersion = new deep.Field(function(this: any, key: any, value: any) {
    const source = deep(this._source);
    if (this._reason == deep.reasons.getter._id) {
      debug(`package version getter: ${source}`);
      return source.data.version;
    } else if (this._reason == deep.reasons.setter._id) {
      debug(`package version setter: ${source}`);
      if (typeof value !== 'string') throw new Error('package.version must be a string');
      return source.data.version = value;
    } else throw new Error('package.version supports only getter and setter');
  });
  
  deep.Package = Package;
  
  return Package;
}
