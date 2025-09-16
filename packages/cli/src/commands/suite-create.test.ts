import { suiteCreateCommand } from './suite-create';
import * as path from 'path';

// Mock fs-extra to prevent actual file system operations during tests
jest.mock('fs-extra', () => ({
  existsSync: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  copy: jest.fn(),
}));

import * as fs from 'fs-extra';
const mockFs = fs as any;

describe('suiteCreateCommand', () => {
  const SUITES_DIR = 'suites';
  const TEMPLATES_DIR = 'templates/suite';
  const SUITE_NAME = 'TestSuite';
  const PROJECT_ROOT = process.cwd();
  const SUITE_PATH = path.join(PROJECT_ROOT, SUITES_DIR, SUITE_NAME);
  const TEMPLATE_PATH = path.join(PROJECT_ROOT, TEMPLATES_DIR);

  const MOCK_SUITE_YAML_CONTENT = 'name: "{{suiteName}}"\ndescription: "A new test suite"\n';
  const EXPECTED_SUITE_YAML_CONTENT = `name: "${SUITE_NAME}"\ndescription: "A new test suite"\n`;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readFile.mockResolvedValue(MOCK_SUITE_YAML_CONTENT);
    mockFs.copy.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
  });

  it('should create a new suite successfully', async () => {
    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect(mockFs.existsSync).toHaveBeenCalledWith(SUITE_PATH);
    expect(mockFs.copy).toHaveBeenCalledWith(TEMPLATE_PATH, SUITE_PATH, { overwrite: false });
    expect(mockFs.readFile).toHaveBeenCalledWith(path.join(SUITE_PATH, 'suite.yaml'), 'utf8');
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      path.join(SUITE_PATH, 'suite.yaml'),
      EXPECTED_SUITE_YAML_CONTENT,
      'utf8'
    );
  });

  it('should exit with error if suite already exists', async () => {
    mockFs.existsSync.mockReturnValue(true);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect(mockFs.existsSync).toHaveBeenCalledWith(SUITE_PATH);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining(`Error: Suite '${SUITE_NAME}' already exists`));
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('should handle copy errors gracefully', async () => {
    mockFs.copy.mockRejectedValue(new Error('Copy failed'));
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect(mockFs.copy).toHaveBeenCalledWith(TEMPLATE_PATH, SUITE_PATH, { overwrite: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining(`Error creating suite '${SUITE_NAME}'`));
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});