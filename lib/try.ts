import chalk from "chalk";
import { newDeep } from ".";

const deep = newDeep();

const logged = new Set<string>();

function log(d, field, dept = 0, last = false) {
  if (d instanceof deep.Deep) {
    const name = d.name || (d._id == deep._id ? 'deep' : d._id);
    const title = d.title;
    const typed = d._typed.size;
    if (logged.has(d._id)) console.log(
      ' │ '.repeat(dept), last ? '└─' : '├─',
      `${field}: ${d._id}`,
      chalk.gray(title ? `{${title}}` : '∞'),
    );
    else {
      logged.add(d._id);
      console.log(
        ' │ '.repeat(dept), last ? '└─' : '├─',
        `${field}: ${d._id}`,
        chalk.gray(title ? `{${title}}` : ''),
        `${chalk.gray('typed')}${typed ? typed : chalk.gray(typed)}`,
      );
      const keys = Object.keys(d._contain).filter((k) => d._contain.hasOwnProperty(k));
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        log(d._contain[key], key, dept + 1, k == keys.length - 1);
      }
    }
  } else {
    console.log(' │ '.repeat(dept), last ? '└─' : '├─', field, '=', chalk.gray(`[${typeof d}]`));
  }
}

log(deep, 'deep', 0);
