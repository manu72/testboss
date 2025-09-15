import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const SUITES_DIR = 'suites';
const CONFIG_FILE = 'test-boss.config.json';

export const initCommand = new Command()
  .name('init')
  .description('Create local config in the current repo and a suites folder.')
  .action(() => {
    const projectRoot = process.cwd();
    const suitesPath = path.join(projectRoot, SUITES_DIR);
    const configPath = path.join(projectRoot, CONFIG_FILE);

    // Create suites directory
    if (!fs.existsSync(suitesPath)) {
      fs.mkdirSync(suitesPath, { recursive: true });
      console.log(`Created directory: ${suitesPath}`);
    } else {
      console.log(`Directory already exists: ${suitesPath}`);
    }

    // Create boilerplate config file
    if (!fs.existsSync(configPath)) {
      const defaultConfig = {
        defaultSuite: null,
        defaultEnv: 'sit',
        ai: {
          enabled: true,
          provider: 'openai',
          model: 'gpt-4o-mini',
          maxTokens: 800,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log(`Created config file: ${configPath}`);
    } else {
      console.log(`Config file already exists: ${configPath}`);
    }

    console.log('Test Boss project initialized.');
  });
