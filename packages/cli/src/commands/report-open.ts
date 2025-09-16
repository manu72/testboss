import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';

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

export const reportOpenCommand = new Command()
  .name('open')
  .description('Open the last Playwright HTML report for the specified suite.')
  .option('--suite <name>', 'Name of the test suite')
  .action(async (options: { suite?: string }) => {
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

    // 2. Locate the latest Playwright HTML report
    const reportPath = path.join(suitePath, 'artifacts', 'last-run', 'playwright-report', 'index.html');

    if (!fs.existsSync(reportPath)) {
      console.error(`Error: Playwright HTML report not found for suite '${suiteName}' at ${reportPath}. Run 	lb run	 first.`);
      process.exit(1);
    }

    console.log(`Opening Playwright HTML report for suite '${suiteName}': ${reportPath}`);

    // 3. Open the report in the default web browser
    // Using 'open' command for macOS, which is generally available.
    const openProcess = spawn('open', [reportPath], { stdio: 'inherit' });

    openProcess.on('error', (err) => {
      console.error('Failed to open report:', err);
      process.exit(1);
    });

    openProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Command 'open' exited with code ${code}.`);
        console.error('Ensure you have a default browser configured or try opening the file manually.');
        process.exit(1);
      }
    });
  });
