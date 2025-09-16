import { Command } from 'commander';
import { initCommand } from './commands/init';
import { suiteCreateCommand } from './commands/suite-create';
import { stepRecordCommand } from './commands/step-record';
import { runCommand } from './commands/run';
import { reportOpenCommand } from './commands/report-open';
import { sessionSaveCommand } from './commands/session-save';

const program = new Command();

program
  .name('tb')
  .description('Test Boss CLI for Salesforce test automation')
  .version('1.0.0');

program.addCommand(initCommand);

const suiteCommand = new Command('suite')
  .description('Manage test suites');
suiteCommand.addCommand(suiteCreateCommand);
suiteCommand.addCommand(stepRecordCommand);
suiteCommand.addCommand(runCommand);
suiteCommand.addCommand(reportOpenCommand);
suiteCommand.addCommand(sessionSaveCommand);
program.addCommand(suiteCommand);

// Add other commands here as they are implemented

program.parse(process.argv);
