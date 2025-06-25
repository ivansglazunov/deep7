import { v4 as uuidv4 } from 'uuid';
import { newDeep } from './deep';
import Debug from './debug';

const debug = Debug('deeps');

export class Deeps {
  id: string;
  deeps: Map<string, any> = new Map();

  constructor() {
    this.id = uuidv4();
    debug(`deep(${this.id}).constructor`);
  }
  
  deep(id: string) {
    debug(`deeps(${this.id}).get(${id})`);
    let deep = this.deeps.get(id);
    if (!deep) this.deeps.set(id, deep = newDeep());
    return deep;
  }
}

export const deeps = new Deeps();
