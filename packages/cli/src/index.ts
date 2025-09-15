import { Command } from 'commander';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('tb')
  .description('Test Boss CLI for Salesforce test automation')
  .version('1.0.0');

program.addCommand(initCommand);

// Add other commands here as they are implemented

program.parse(process.argv);
