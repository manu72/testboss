import { Command } from 'commander';
import { copy, existsSync, readFile, writeFile } from 'fs-extra';
import * as path from 'path';

const SUITES_DIR = 'suites';
const TEMPLATES_DIR = 'templates/suite';

export const suiteCreateCommand = new Command()
  .name('create')
  .description('Scaffold a suite with suite.yaml, env config, and starter steps.')
  .argument('<name>', 'Name of the test suite')
  .option('--from-template <templateName>', 'Optional: Name of a custom template to use', TEMPLATES_DIR)
  .action(async (name: string, options: { fromTemplate: string }) => {
    const projectRoot = process.cwd();
    const suitePath = path.join(projectRoot, SUITES_DIR, name);
    const templatePath = path.join(projectRoot, options.fromTemplate);

    if (existsSync(suitePath)) {
      console.error(`Error: Suite '${name}' already exists at ${suitePath}`);
      process.exit(1);
    }

    try {
      await copy(templatePath, suitePath, { overwrite: false });
      console.log(`Created suite '${name}' at ${suitePath} from template ${options.fromTemplate}`);

      // Replace placeholder in suite.yaml
      const suiteYamlPath = path.join(suitePath, 'suite.yaml');
      let suiteYamlContent = await readFile(suiteYamlPath, 'utf8');
      suiteYamlContent = suiteYamlContent.replace(/{{suiteName}}/g, name);
      await writeFile(suiteYamlPath, suiteYamlContent, 'utf8');

    } catch (error) {
      console.error(`Error creating suite '${name}':`, error);
      process.exit(1);
    }
  });
