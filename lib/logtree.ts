// Temporary fix for Jest compatibility - avoid ES modules import
const chalk = {
  gray: (text: any) => text
};

export function newLogtree(deep) {
  deep.logtree = new deep.Method(function(this: any) {
    const source = deep(this._source);

    const logged = new Set<string>();
    
    function log(d, field, dept = 0, last = false) {
      if (d instanceof deep.Deep) {
        const name = d.name || (d._id == deep._id ? 'deep' : d._id);
        const title = d.title;
        const typed = d._typed.size;
        if (logged.has(d._id)) console.log(
          ' │ '.repeat(dept), last ? '└─' : '├─',
          `${field}`,
          chalk.gray(title ? `{${title}}` : '∞'),
        );
        else {
          logged.add(d._id);
          console.log(
            ' │ '.repeat(dept), last ? '└─' : '├─',
            `${field}`,
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
    
    log(source, source._id == deep._id ? 'deep' : source.name, 0);
  });
}