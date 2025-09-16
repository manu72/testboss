import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import * as yaml from 'js-yaml';
import inquirer from 'inquirer';
import { saveStorageState } from '@testboss/runtime/storage';

const SUITES_DIR = 'suites';
const CONFIG_FILE = 'test-boss.config.json';

interface RecordedAction {
  type: 'navigate' | 'click' | 'fill' | 'select' | 'wait_for' | 'eval_js';
  locator?: string;
  value?: string;
  url?: string;
  code?: string;
}

interface RecordedStep {
  id: string;
  title: string;
  actions: RecordedAction[];
  assertions?: Array<{
    type: string;
    locator?: string;
    value?: string;
    url?: string;
  }>;
}

// Convert Playwright codegen output to Test Boss actions
function parsePlaywrightCode(codegenOutput: string): RecordedAction[] {
  const actions: RecordedAction[] = [];
  const lines = codegenOutput.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse goto/navigate
    if (trimmed.includes('page.goto(')) {
      const match = trimmed.match(/page\.goto\(['"]([^'"]+)['"]/);
      if (match) {
        actions.push({
          type: 'navigate',
          url: match[1]
        });
      }
    }

    // Parse clicks
    else if (trimmed.includes('.click()')) {
      const locator = extractLocator(trimmed);
      if (locator) {
        actions.push({
          type: 'click',
          locator: locator
        });
      }
    }

    // Parse fills
    else if (trimmed.includes('.fill(')) {
      const locator = extractLocator(trimmed);
      const match = trimmed.match(/\.fill\(['"]([^'"]*)['"]\)/);
      if (locator && match) {
        actions.push({
          type: 'fill',
          locator: locator,
          value: match[1]
        });
      }
    }

    // Parse selects
    else if (trimmed.includes('.selectOption(')) {
      const locator = extractLocator(trimmed);
      const match = trimmed.match(/\.selectOption\(['"]([^'"]*)['"]\)/);
      if (locator && match) {
        actions.push({
          type: 'select',
          locator: locator,
          value: match[1]
        });
      }
    }

    // Parse waits
    else if (trimmed.includes('waitFor(')) {
      const locator = extractLocator(trimmed);
      if (locator) {
        actions.push({
          type: 'wait_for',
          locator: locator
        });
      }
    }
  }

  return actions;
}

// Extract and convert Playwright locator to Test Boss format
function extractLocator(line: string): string | undefined {
  // Handle page.getByRole
  let match = line.match(/page\.getByRole\(['"](\w+)['"](?:,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\})?/);
  if (match) {
    const role = match[1];
    const name = match[2];
    return name ? `role=${role}[name="${name}"]` : `role=${role}`;
  }

  // Handle page.getByTestId
  match = line.match(/page\.getByTestId\(['"]([^'"]+)['"]/);
  if (match) {
    return `data-testid=${match[1]}`;
  }

  // Handle page.getByText
  match = line.match(/page\.getByText\(['"]([^'"]+)['"]/);
  if (match) {
    return `text=${match[1]}`;
  }

  // Handle page.locator
  match = line.match(/page\.locator\(['"]([^'"]+)['"]/);
  if (match) {
    const selector = match[1];
    if (selector.startsWith('#') || selector.startsWith('.') || selector.includes('[')) {
      return `css=${selector}`;
    }
    return selector;
  }

  return undefined;
}

// Generate step ID and title
function generateStepInfo(actions: RecordedAction[]): { id: string; title: string } {
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];

  // Try to infer a meaningful title from actions
  let title = 'Recorded Step';

  if (actions.length > 0) {
    const firstAction = actions[0];
    if (firstAction.type === 'navigate') {
      title = 'Navigate to Page';
    } else if (firstAction.type === 'click' && firstAction.locator?.includes('New')) {
      title = 'Create New Record';
    } else if (firstAction.type === 'fill') {
      title = 'Fill Form';
    } else if (firstAction.type === 'click' && firstAction.locator?.includes('Save')) {
      title = 'Save Record';
    }
  }

  return {
    id: `${timestamp}_recorded`,
    title: title
  };
}

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
    if (!startUrl) {
      console.error('Error: Could not determine a starting URL for Codegen. Please provide --url option, or ensure baseUrl or loginHost are configured in your environment YAML.');
      process.exit(1);
    }
    const storageStatePath = path.join(suitePath, '.auth', `storage-state.${options.session}.json`);
    const tempCodegenFile = path.join(projectRoot, 'temp-codegen-output.ts');

    const codegenArgs: string[] = [
      'codegen',
      startUrl,
      '--browser=chromium',
      `--output=${tempCodegenFile}`,
      `--save-storage=${storageStatePath}`, // Automatically save storage state
    ];

    if (fs.existsSync(storageStatePath)) {
      codegenArgs.push(`--load-storage=${storageStatePath}`);
    }

    console.log(`Launching Playwright Codegen for suite '${suiteName}' (${options.env} / ${options.session})...`);
    console.log(`Starting URL: ${startUrl}`);
    console.log('Record your actions in the browser. Close the browser window when finished.');

    const codegenProcess = spawn('npx', ['playwright', ...codegenArgs], { stdio: 'inherit' });

    codegenProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('\n✅ Recording completed!');

        try {
          // Read the generated codegen output
          let codegenOutput = '';
          if (fs.existsSync(tempCodegenFile)) {
            codegenOutput = await fs.readFile(tempCodegenFile, 'utf8');
            await fs.remove(tempCodegenFile); // Clean up temp file
          }

          if (!codegenOutput.trim()) {
            console.log('ℹ️  No actions were recorded.');
            return;
          }

          // Parse the Playwright code into Test Boss actions
          const actions = parsePlaywrightCode(codegenOutput);

          if (actions.length === 0) {
            console.log('ℹ️  No recognizable actions were found in the recording.');
            console.log('Raw Playwright output:\n', codegenOutput);
            return;
          }

          // Generate step info
          const stepInfo = generateStepInfo(actions);

          // Show preview and get user confirmation
          console.log('\n📋 Recorded Actions Preview:');
          console.log('================================');
          console.log(`Step ID: ${stepInfo.id}`);
          console.log(`Title: ${stepInfo.title}`);
          console.log('Actions:');
          actions.forEach((action, index) => {
            console.log(`  ${index + 1}. ${action.type.toUpperCase()}`);
            if (action.url) console.log(`     URL: ${action.url}`);
            if (action.locator) console.log(`     Locator: ${action.locator}`);
            if (action.value) console.log(`     Value: ${action.value}`);
          });

          // Interactive confirmation and editing
          const answers = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'save',
              message: 'Save this recorded step?',
              default: true
            },
            {
              type: 'input',
              name: 'title',
              message: 'Enter step title:',
              default: stepInfo.title,
              when: (answers: any) => answers.save
            }
          ]);

          const saveStep = answers.save;
          const title = answers.title || stepInfo.title;

          if (saveStep) {
            // Create the step object
            const step: RecordedStep = {
              id: stepInfo.id,
              title: title,
              actions: actions.map(action => {
                const stepAction: any = { [action.type]: action.url || action.locator || action.code };
                if (action.locator && action.value) {
                  stepAction[action.type] = { locator: action.locator, value: action.value };
                }
                return stepAction;
              })
            };

            // Convert to YAML format matching Test Boss schema
            const yamlStep = {
              id: step.id,
              title: step.title,
              actions: actions.map(action => {
                if (action.type === 'navigate') {
                  return { navigate: action.url };
                } else if (action.type === 'click') {
                  return { click: { locator: action.locator } };
                } else if (action.type === 'fill') {
                  return { fill: { locator: action.locator, value: action.value } };
                } else if (action.type === 'select') {
                  return { select: { locator: action.locator, value: action.value } };
                } else if (action.type === 'wait_for') {
                  return { wait_for: { locator: action.locator, state: 'visible' } };
                } else {
                  return { [action.type]: action.code || action.locator };
                }
              })
            };

            // Save to YAML file
            const stepsDir = path.join(suitePath, 'steps');
            await fs.ensureDir(stepsDir);
            const stepFilePath = path.join(stepsDir, `${step.id}.yaml`);
            const yamlContent = yaml.dump(yamlStep, { indent: 2 });
            await fs.writeFile(stepFilePath, yamlContent, 'utf8');

            console.log(`\n✅ Step saved to: ${stepFilePath}`);

            // Check if storage state was saved
            if (fs.existsSync(storageStatePath)) {
              console.log(`🔐 Browser session saved for future runs`);
            }

            console.log(`\n💡 You can now run this suite with:`);
            console.log(`   npm run cli -- run --suite "${suiteName}" --env ${options.env} --headed`);

            // Update suite.yaml to include this step
            const suiteYamlPath = path.join(suitePath, 'suite.yaml');
            if (fs.existsSync(suiteYamlPath)) {
              const suiteConfig = yaml.load(await fs.readFile(suiteYamlPath, 'utf8')) as any;
              if (!suiteConfig.steps) suiteConfig.steps = [];
              const stepFileName = `${step.id}.yaml`;
              if (!suiteConfig.steps.includes(stepFileName)) {
                suiteConfig.steps.push(stepFileName);
                await fs.writeFile(suiteYamlPath, yaml.dump(suiteConfig, { indent: 2 }), 'utf8');
                console.log(`📝 Added step to suite configuration`);
              }
            }

          } else {
            console.log('❌ Recording discarded.');
          }

        } catch (error) {
          console.error('Error processing recorded actions:', error);
        }
      } else {
        console.error(`❌ Playwright Codegen exited with code ${code}`);
      }
    });

    codegenProcess.on('error', (err) => {
      console.error('Failed to start Playwright Codegen:', err);
      process.exit(1);
    });
  });
