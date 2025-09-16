
import { compileSuite } from './compiler';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('compileSuite', () => {
  const tempSuitePath = path.join(__dirname, 'temp-test-suite');
  const stepsDir = path.join(tempSuitePath, 'steps');
  const envDir = path.join(tempSuitePath, 'env');

  beforeEach(async () => {
    await fs.ensureDir(stepsDir);
    await fs.ensureDir(envDir);

    // Create dummy suite.yaml
    await fs.writeFile(path.join(tempSuitePath, 'suite.yaml'), `
name: "Test Suite"
description: "A test suite for compiler"
steps:
  - 000_navigate.yaml
  - 010_click.yaml
  - 020_fill.yaml
  - 030_assertions.yaml
`);

    // Create dummy step files
    await fs.writeFile(path.join(stepsDir, '000_navigate.yaml'), `
id: "000_navigate"
title: "Navigate to URL"
action:
  type: "navigate"
  url: "https://example.com"
`);

    await fs.writeFile(path.join(stepsDir, '010_click.yaml'), `
id: "010_click"
title: "Click element"
action:
  type: "click"
  locator: "text=Click Me"
`);

    await fs.writeFile(path.join(stepsDir, '020_fill.yaml'), `
id: "020_fill"
title: "Fill input"
action:
  type: "fill"
  locator: "css=#username"
  value: "testuser"
`);

    await fs.writeFile(path.join(stepsDir, '030_assertions.yaml'), `
id: "030_assertions"
title: "Check assertions"
action:
  type: "navigate"
  url: "https://example.com/success"
assertions:
  - type: "url_contains"
    url: "success"
  - type: "visible_text"
    locator: "text=Welcome"
    value: "Welcome User"
  - type: "url_matches"
    url: ".*example.com/success.*"
  - type: "locator_exists"
    locator: "css=#dashboard"
  - type: "locator_has_value"
    locator: "css=#statusInput"
    value: "Active"
`);
  });

  afterEach(async () => {
    await fs.remove(tempSuitePath);
  });

  it('should compile a suite with various actions and assertions into Playwright test content', async () => {
    const compiledContent = await compileSuite(tempSuitePath);
    expect(compiledContent).toContain('test.describe(\'Test Suite\'');
    expect(compiledContent).toContain('test(\'Generated Test for Test Suite\'');
    expect(compiledContent).toContain('await page.goto(\'https://example.com\');');
    expect(compiledContent).toContain('await toLocator(page, \'text=Click Me\').click();');
    expect(compiledContent).toContain('await toLocator(page, \'css=#username\').fill(\'testuser\');');
    expect(compiledContent).toContain('await urlContains(page, \'success\');');
    expect(compiledContent).toContain('await visibleText(toLocator(page, \'text=Welcome\'), \'Welcome User\');');
    expect(compiledContent).toContain('await urlMatches(page, \'.*example.com/success.*\');');
    expect(compiledContent).toContain('await locatorExists(toLocator(page, \'css=#dashboard\'));');
    expect(compiledContent).toContain('await locatorHasValue(toLocator(page, \'css=#statusInput\'), \'Active\');');
  });

  it('should warn and skip if a step file is not found', async () => {
    await fs.writeFile(path.join(tempSuitePath, 'suite.yaml'), `
name: "Suite with missing step"
steps:
  - non_existent_step.yaml
`);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const compiledContent = await compileSuite(tempSuitePath);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Step file not found'));
    expect(compiledContent).not.toContain('non_existent_step');
    consoleSpy.mockRestore();
  });

  it('should throw an error if suite.yaml is not found', async () => {
    await fs.remove(path.join(tempSuitePath, 'suite.yaml'));
    await expect(compileSuite(tempSuitePath)).rejects.toThrow('Suite config file not found');
  });
});
