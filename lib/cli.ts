#!/usr/bin/env node

import { Command } from 'commander';
import Debug from './debug';
import dotenv from 'dotenv';
import path from 'path';
import pckg from '../package.json';
import assist from 'hasyx/lib/assist';

// Import command descriptors and implementations from hasyx
import {
  initCommandDescribe, initCommand,
  devCommandDescribe, devCommand,
  buildCommandDescribe, buildCommand,
  startCommandDescribe, startCommand,
  buildClientCommandDescribe, buildClientCommand,
  migrateCommandDescribe, migrateCommand,
  unmigrateCommandDescribe, unmigrateCommand,
  schemaCommandDescribe, schemaCommand,
  docCommandDescribe, docCommand,
  assetsCommandDescribe,
  eventsCommandDescribe,
  unbuildCommandDescribe,
  assistCommandDescribe,
  telegramCommandDescribe,
  localCommandDescribe,
  vercelCommandDescribe,
  jsCommandDescribe, jsCommand,
  askCommandDescribe, askCommand,
  tsxCommandDescribe, tsxCommand,
  subdomainCommandDescribe
} from 'hasyx/lib/cli-hasyx';

console.log(`${pckg.name}@${pckg.version}`);

// Load .env file from current working directory
const envResult = dotenv.config({ path: path.join(process.cwd(), '.env') });

if (envResult.error) {
  // Only log in debug mode to avoid cluttering output for users without .env files
  console.debug('Failed to load .env file:', envResult.error);
} else {
  console.debug('.env file loaded successfully');
}

// Create a debugger instance for the CLI
const debug = Debug('cli');

debug('Starting CLI script execution.');

// Create CLI program
const program = new Command();
debug('Commander instance created.');

// Setup all commands individually (can be customized here)
initCommandDescribe(program.command('init')).action(async (options) => {
  await initCommand(options, pckg.name);
});

devCommandDescribe(program.command('dev')).action(devCommand);
buildCommandDescribe(program.command('build')).action(buildCommand);
startCommandDescribe(program.command('start')).action(startCommand);
buildClientCommandDescribe(program.command('build:client')).action(buildClientCommand);
migrateCommandDescribe(program.command('migrate')).action(async (filter) => {
  await migrateCommand(filter);
});
unmigrateCommandDescribe(program.command('unmigrate')).action(async (filter) => {
  await unmigrateCommand(filter);
});
schemaCommandDescribe(program.command('schema')).action(schemaCommand);
docCommandDescribe(program.command('doc')).action(docCommand);

// Commands that use dynamic imports from hasyx
assetsCommandDescribe(program.command('assets')).action(async () => {
  const { assetsCommand } = await import('hasyx/lib/assets');
  await assetsCommand();
});

eventsCommandDescribe(program.command('events')).action(async (options) => {
  const { eventsCommand } = await import('hasyx/lib/events-cli');
  await eventsCommand(options);
});

unbuildCommandDescribe(program.command('unbuild')).action(async () => {
  const { unbuildCommand } = await import('hasyx/lib/unbuild');
  await unbuildCommand();
});

assistCommandDescribe(program.command('assist')).action(async (options) => {
  assist(options);
});

telegramCommandDescribe(program.command('telegram')).action(async (options) => {
  const assistModule = await import('hasyx/lib/assist'); 
  if (!assistModule.runTelegramSetupAndCalibration) {
      console.error('FATAL: runTelegramSetupAndCalibration function not found in assist module. Build might be corrupted or export is missing.');
      process.exit(1);
  }
  assistModule.runTelegramSetupAndCalibration(options);
});

localCommandDescribe(program.command('local')).action(async () => {
  const { localCommand } = await import('hasyx/lib/local');
  localCommand();
});

vercelCommandDescribe(program.command('vercel')).action(async () => {
  const { vercelCommand } = await import('hasyx/lib/vercel');
  vercelCommand();
});

jsCommandDescribe(program.command('js [filePath]')).action(jsCommand);
askCommandDescribe(program.command('ask')).action(askCommand);
tsxCommandDescribe(program.command('tsx [filePath]')).action(tsxCommand);

subdomainCommandDescribe(program.command('subdomain'));

// Docker command with dynamic import
program.command('docker')
  .description('Manage Docker containers with automatic updates via Watchtower')
  .action(async () => {
    const { dockerCommandDescribe } = await import('hasyx/lib/cli-hasyx');
    // Show help if no subcommand provided
    console.log('Use: npx hasyx docker --help for available commands');
  })
  .addHelpText('after', `
Available subcommands:
  ls              List running containers
  define [port]   Create and start container  
  undefine <port> Stop and remove container
  logs <port>     Show container logs
  env <port>      Show environment variables
  
Examples:
  npx hasyx docker ls
  npx hasyx docker define 8080
  npx hasyx docker logs 8080
`);

// Add individual docker subcommands
program.command('docker:ls')
  .description('List running containers for this project')
  .action(async () => {
    const { dockerListCommand } = await import('hasyx/lib/cli-hasyx');
    await dockerListCommand();
  });

program.command('docker:define [port]')
  .description('Create and start container with Watchtower')
  .action(async (port) => {
    const { dockerDefineCommand } = await import('hasyx/lib/cli-hasyx');
    await dockerDefineCommand(port);
  });

program.command('docker:undefine <port>')
  .description('Stop and remove container and its Watchtower')
  .action(async (port) => {
    const { dockerUndefineCommand } = await import('hasyx/lib/cli-hasyx');
    await dockerUndefineCommand(port);
  });

program.command('docker:logs <port>')
  .description('Show container logs')
  .option('--tail <lines>', 'Number of lines to show from the end', '100')
  .action(async (port, options) => {
    const { dockerLogsCommand } = await import('hasyx/lib/cli-hasyx');
    await dockerLogsCommand(port, options);
  });

program.command('docker:env <port>')
  .description('Show container environment variables')
  .action(async (port) => {
    const { dockerEnvCommand } = await import('hasyx/lib/cli-hasyx');
    await dockerEnvCommand(port);
  });

debug('Parsing CLI arguments...');
program.parse(process.argv);
debug('Finished parsing CLI arguments.'); 