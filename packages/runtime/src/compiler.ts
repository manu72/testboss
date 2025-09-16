
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import { toLocator } from './selectors';
import { urlContains, visibleText, urlMatches, locatorExists, locatorHasValue } from './asserts';

interface SuiteConfig {
  name: string;
  description?: string;
  steps: string[]; // Array of step file names or glob patterns
}

interface Step {
  name: string;
  action: {
    type: string;
    locator?: string;
    value?: string;
    url?: string;
  };
  assertions?: Array<{
    type: string;
    locator?: string;
    value?: string;
    url?: string;
  }>;
}

export async function compileSuite(suitePath: string): Promise<string> {
  const suiteYamlPath = path.join(suitePath, 'suite.yaml');
  if (!fs.existsSync(suiteYamlPath)) {
    throw new Error(`Suite config file not found: ${suiteYamlPath}`);
  }
  const suiteConfig: SuiteConfig = yaml.load(await fs.readFile(suiteYamlPath, 'utf8')) as SuiteConfig;

  const stepsDir = path.join(suitePath, 'steps');
  let playwrightTestContent = `
    import { test, expect } from '@playwright/test';

    test.describe('${suiteConfig.name}', () => {
      test('Generated Test for ${suiteConfig.name}', async ({ page }) => {
  `;

  for (const stepFileName of suiteConfig.steps) {
    const stepFilePath = path.join(stepsDir, stepFileName);
    if (!fs.existsSync(stepFilePath)) {
      console.warn(`Warning: Step file not found: ${stepFilePath}. Skipping.`);
      continue;
    }
    const step: Step = yaml.load(await fs.readFile(stepFilePath, 'utf8')) as Step;

    playwrightTestContent += `
        // Step: ${step.name}
    `;

    switch (step.action.type) {
      case 'navigate':
        if (step.action.url) {
          playwrightTestContent += `    await page.goto('${step.action.url}');
`;
        }
        break;
      case 'click':
        if (step.action.locator) {
          playwrightTestContent += `    await toLocator(page, '${step.action.locator}').click();
`;
        }
        break;
      case 'fill':
        if (step.action.locator && step.action.value) {
          playwrightTestContent += `    await toLocator(page, '${step.action.locator}').fill('${step.action.value}');
`;
        }
        break;
      // Add more action types as needed
      default:
        console.warn(`Warning: Unknown action type '${step.action.type}' in step '${step.name}'. Skipping.`);
    }

    if (step.assertions) {
      for (const assertion of step.assertions) {
        playwrightTestContent += `
        // Assertion: ${assertion.type}
        `;
        switch (assertion.type) {
          case 'url_contains':
            if (assertion.url) {
              playwrightTestContent += `    await urlContains(page, '${assertion.url}');
`;
            }
            break;
          case 'url_matches':
            if (assertion.url) {
              playwrightTestContent += `    await urlMatches(page, '${assertion.url}');
`;
            }
            break;
          case 'visible_text':
            if (assertion.locator && assertion.value) {
              playwrightTestContent += `    await visibleText(toLocator(page, '${assertion.locator}'), '${assertion.value}');
`;
            }
            break;
          case 'locator_exists':
            if (assertion.locator) {
              playwrightTestContent += `    await locatorExists(toLocator(page, '${assertion.locator}'));
`;
            }
            break;
          case 'locator_has_value':
            if (assertion.locator && assertion.value) {
              playwrightTestContent += `    await locatorHasValue(toLocator(page, '${assertion.locator}'), '${assertion.value}');
`;
            }
          // Add more assertion types as needed
          default:
            console.warn(`Warning: Unknown assertion type '${assertion.type}' in step '${step.name}'. Skipping.`);
        }
      }
    }
  }

  playwrightTestContent += `
      });
    });
  `;

  return playwrightTestContent;
}
