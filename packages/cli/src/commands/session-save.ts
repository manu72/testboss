import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { chromium } from 'playwright';
import * as yaml from 'js-yaml';

const SUITES_DIR = 'suites';
const CONFIG_FILE = 'test-boss.config.json';

interface TestBossConfig {
  defaultSuite: string | null;
  defaultEnv: string;
  ai: {
    enabled: boolean;
    provider: string;
    model: string;
    maxTokens: number;
  };
}

interface EnvConfig {
  name: string;
  loginHost: string;
  baseUrl: string;
  playwright: {
    headless: boolean;
    viewport: { width: number; height: number };
  };
  timeouts: {
    actionMs: number;
    expectMs: number;
  };
  ai: {
    enabled: boolean;
    provider: string;
    model: string;
    maxTokens: number;
  };
}

export const sessionSaveCommand = new Command()
  .name('save')
  .description('Save the current browser storage state for a named session.')
  .option('--suite <name>', 'Name of the test suite')
  .option('--env <name>', 'Environment to use (e.g., sit)', 'sit')
  .option('--session <name>', 'Named session to save', 'default')
  .action(async (options: { suite?: string; env: string; session: string }) => {
    const projectRoot = process.cwd();

    // 1. Load Test Boss Config
    const configPath = path.join(projectRoot, CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      console.error('Error: Test Boss not initialized. Run `tb init` first.');
      process.exit(1);
    }
    const config: TestBossConfig = JSON.parse(await fs.readFile(configPath, 'utf8'));

    const suiteName = options.suite || config.defaultSuite;
    if (!suiteName) {
      console.error('Error: No suite specified. Use --suite option or set defaultSuite in test-boss.config.json.');
      process.exit(1);
    }

    const suitePath = path.join(projectRoot, SUITES_DIR, suiteName);
    if (!fs.existsSync(suitePath)) {
      console.error(`Error: Suite '${suiteName}' not found at ${suitePath}.`);
      process.exit(1);
    }

    // 2. Load Environment Config
    const envConfigPath = path.join(suitePath, 'env', `${options.env}.yaml`);
    if (!fs.existsSync(envConfigPath)) {
      console.error(`Error: Environment config '${options.env}.yaml' not found for suite '${suiteName}'.`);
      process.exit(1);
    }
    const envConfig: EnvConfig = yaml.load(await fs.readFile(envConfigPath, 'utf8')) as EnvConfig;

    const loginHost = envConfig.loginHost;
    if (!loginHost) {
      console.error('Error: loginHost not configured in environment YAML. Cannot save session without a login host.');
      process.exit(1);
    }

    const storageStatePath = path.join(suitePath, '.auth', `storage-state.${options.session}.json`);
    await fs.ensureDir(path.dirname(storageStatePath));

    console.log(`Launching browser to save session '${options.session}' for suite '${suiteName}'...`);
    console.log(`Please log in manually at: ${loginHost}`);

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(loginHost);

    // Keep the browser open until the user closes it or a specific event occurs.
    // For now, we'll wait for the user to manually close the browser.
    // In a real scenario, you might want to listen for a specific navigation or a timeout.
    console.log('Browser launched. Please log in manually. Close the browser when done.');

    // A simple way to wait for the user to close the browser is to poll for its existence.
    // This is a basic implementation and can be improved with more robust event listeners.
    while (browser.isConnected()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await context.storageState({ path: storageStatePath });
    console.log(`Session '${options.session}' storage state saved to: ${storageStatePath}`);

    await browser.close();
  });
