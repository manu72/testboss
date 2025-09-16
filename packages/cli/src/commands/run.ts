import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
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

export const runCommand = new Command()
  .name('run')
  .description('Run a test suite.')
  .option('--suite <name>', 'Name of the test suite')
  .option('--env <name>', 'Environment to use (e.g., sit)', 'sit')
  .option('--session <name>', 'Named session to use', 'default')
  .option('--headed', 'Run tests in a visible browser', false)
  .option('--ai <on|off>', 'Enable or disable AI assistance', 'on')
  .action(async (options: { suite?: string; env: string; session: string; headed: boolean; ai: 'on' | 'off' }) => {
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

    // 3. Resolve storage state path
    const storageStatePath = path.join(suitePath, '.auth', `storage-state.${options.session}.json`);

    // TODO: 4. Handle missing storage state: prompt user or execute login step
    if (!fs.existsSync(storageStatePath)) {
      console.warn(`Warning: No storage state found for session '${options.session}'. Tests might require manual login.`);
      // For now, we'll proceed without storage state, but a future enhancement would be to prompt for login or run a login step.
    }

    // 5. Call packages/runtime/compiler.ts to generate spec.generated.ts
    // This part will be implemented once the runtime/compiler is available.
    const generatedSpecPath = path.join(suitePath, 'generated', 'spec.generated.ts');
    await fs.ensureDir(path.dirname(generatedSpecPath));
    // For now, create a dummy file
    await fs.writeFile(generatedSpecPath, `
      import { test, expect } from '@playwright/test';

      test('dummy test', async ({ page }) => {
        await page.goto('${envConfig.baseUrl || envConfig.loginHost}');
        await expect(page).toHaveURL(/.*salesforce.com/);
      });
    `);
    console.log(`Generated dummy spec file: ${generatedSpecPath}`);

    // 6. Execute Playwright test
    const tempPlaywrightConfigPath = path.join(suitePath, 'generated', 'playwright.config.ts');
    const headlessMode = options.headed ? false : (envConfig.playwright.headless === false ? false : true);

    let playwrightConfigContent = `
      import { defineConfig, devices } from '@playwright/test';
      import * as path from 'path';

      export default defineConfig({
        testDir: path.dirname('${generatedSpecPath}'), // Look for tests in the same directory as the spec
        outputDir: '${path.join(suitePath, 'artifacts', 'last-run')}',
        use: {
          baseURL: '${envConfig.baseUrl || envConfig.loginHost}',
          headless: ${headlessMode},
          viewport: ${JSON.stringify(envConfig.playwright.viewport)},
          actionTimeout: ${envConfig.timeouts.actionMs},
          navigationTimeout: ${envConfig.timeouts.expectMs},
          // Add other common use options from envConfig if needed
        },
        projects: [
          {
            name: 'chromium',
            use: {
              ...devices['Desktop Chrome'],
              // Conditional storageState
              ${fs.existsSync(storageStatePath) ? `storageState: '${storageStatePath}',` : ''}
            },
          },
        ],
      });
    `;

    await fs.writeFile(tempPlaywrightConfigPath, playwrightConfigContent);
    console.log(`Generated temporary Playwright config: ${tempPlaywrightConfigPath}`);

    const playwrightArgs: string[] = [
      'test',
      generatedSpecPath,
      `--config=${tempPlaywrightConfigPath}`,
    ];

    console.log(`Running Playwright tests for suite '${suiteName}' (${options.env} / ${options.session})...`);

    const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], { stdio: 'inherit' });

    playwrightProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Playwright tests finished successfully.');
      } else {
        console.error(`Playwright tests failed with exit code ${code}`);
      }
      await fs.remove(generatedSpecPath); // Clean up generated spec file
      await fs.remove(tempPlaywrightConfigPath); // Clean up generated config file
      process.exit(code || 0);
    });

    playwrightProcess.on('error', (err) => {
      console.error('Failed to start Playwright tests:', err);
      process.exit(1);
    });
  });
