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

export const stepRecordCommand = new Command()
  .name('record')
  .description('Record test steps using Playwright Codegen.')
  .option('--suite <name>', 'Name of the test suite')
  .option('--env <name>', 'Environment to use (e.g., sit)', 'sit')
  .option('--session <name>', 'Named session to use', 'default')
  .option('--url <startUrl>', 'Optional: URL to start recording from')
  .option('--ai <on|off>', 'Enable or disable AI assistance', 'on')
  .action(async (options: { suite?: string; env: string; session: string; url?: string; ai: 'on' | 'off' }) => {
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

    // 3. Determine start URL and storage state
    const startUrl = options.url || envConfig.baseUrl || envConfig.loginHost;
    const storageStatePath = path.join(suitePath, '.auth', `storage-state.${options.session}.json`);

    const codegenArgs: string[] = [
      'codegen',
      startUrl,
      '--browser=chromium',
      '--output=./temp-codegen-output.ts', // Temporary file to capture output
    ];

    if (fs.existsSync(storageStatePath)) {
      codegenArgs.push(`--load-storage=${storageStatePath}`);
    }

    console.log(`Launching Playwright Codegen for suite '${suiteName}' (${options.env} / ${options.session})...`);
    console.log(`Starting URL: ${startUrl}`);

    const codegenProcess = spawn('npx', ['playwright', ...codegenArgs], { stdio: ['inherit', 'pipe', 'inherit'] });

    let codegenOutput = '';
    codegenProcess.stdout.on('data', (data) => {
      codegenOutput += data.toString();
    });

    codegenProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Playwright Codegen finished.');
        // TODO: Intercept and parse codegenOutput
        // TODO: AI integration
        // TODO: Interactive terminal preview
        // TODO: Save to YAML
        // TODO: Save storage state (if new login occurred)
        console.log('Codegen Raw Output:\n', codegenOutput);
      } else {
        console.error(`Playwright Codegen exited with code ${code}`);
      }
    });

    codegenProcess.on('error', (err) => {
      console.error('Failed to start Playwright Codegen:', err);
    });
  });
