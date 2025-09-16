import { Command } from 'commander';
import { initCommand } from './commands/init';
import { suiteCreateCommand } from './commands/suite-create';

const program = new Command();

program
  .name('tb')
  .description('Test Boss CLI for Salesforce test automation')
  .version('1.0.0');

program.addCommand(initCommand);

const suiteCommand = new Command('suite')
  .description('Manage test suites');
suiteCommand.addCommand(suiteCreateCommand);
program.addCommand(suiteCommand);

// Add other commands here as they are implemented

program.parse(process.argv);
