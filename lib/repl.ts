#!/usr/bin/env node
import { newAsk } from './ask';
import readline from 'readline';

/**
 * Starts a REPL (Read-Eval-Print-Loop) with access to ask and stop functions
 */
function startRepl(): void {
  console.log("🤖 AI REPL started. Available commands:");
  console.log("  - await ask(\"Your question?\")");
  console.log("  - stop()");
  console.log("Type .exit to leave.");

  // Initialize the ask and stop functions
  const { ask, stop } = newAsk();

  // Create a readline interface for user input
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  // Make functions available in REPL context
  const replContext = {
    ask,
    stop,
  };

  // A simple eval loop that supports async functions
  rl.on('line', async (line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '.exit') {
      rl.close();
      return;
    }
    if (trimmedLine) {
      try {
        // General eval for commands like await ask('...')
        const result = await eval(`(async () => { return ${trimmedLine} })()`);
        if (result !== undefined) {
          console.log(result);
        }
      } catch (e: any) {
        console.error("Error:", e.message);
      }
    }
    rl.prompt();
  }).on('close', () => {
    console.log('Exiting AI REPL.');
    process.exit(0);
  });

  // Assign context variables to the global scope for the REPL
  Object.assign(global, replContext);

  rl.prompt();
}

// If run directly, start the REPL
if (require.main === module) {
  startRepl();
} 