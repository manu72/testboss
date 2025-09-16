import { suiteCreateCommand } from './suite-create';
import * as path from 'path';
import { copy, existsSync, readFile, writeFile } from 'fs-extra';

// Mock fs-extra to prevent actual file system operations during tests
jest.mock('fs-extra', () => ({
  __esModule: true,
  copy: jest.fn(),
  existsSync: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

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
    (existsSync as jest.Mock).mockReturnValue(false);
    (readFile as jest.Mock).mockResolvedValue(MOCK_SUITE_YAML_CONTENT);
    (copy as jest.Mock).mockResolvedValue(undefined);
    (writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create a new suite successfully', async () => {
    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect((existsSync as jest.Mock)).toHaveBeenCalledWith(SUITE_PATH);
    expect((copy as jest.Mock)).toHaveBeenCalledWith(TEMPLATE_PATH, SUITE_PATH, { overwrite: false });
    expect((readFile as jest.Mock)).toHaveBeenCalledWith(path.join(SUITE_PATH, 'suite.yaml'), 'utf8');
    expect((writeFile as jest.Mock)).toHaveBeenCalledWith(
      path.join(SUITE_PATH, 'suite.yaml'),
      EXPECTED_SUITE_YAML_CONTENT,
      'utf8'
    );
  });

  it('should exit with error if suite already exists', async () => {
    (existsSync as jest.Mock).mockReturnValue(true);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect((existsSync as jest.Mock)).toHaveBeenCalledWith(SUITE_PATH);
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining(`Error: Suite '${SUITE_NAME}' already exists`));
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });

  it('should handle copy errors gracefully', async () => {
    (copy as jest.Mock).mockRejectedValue(new Error('Copy failed'));
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    const mockError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await (suiteCreateCommand.action as any)(SUITE_NAME, { fromTemplate: TEMPLATES_DIR });

    expect((copy as jest.Mock)).toHaveBeenCalledWith(TEMPLATE_PATH, SUITE_PATH, { overwrite: false });
    expect(mockError).toHaveBeenCalledWith(expect.stringContaining(`Error creating suite '${SUITE_NAME}'`));
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    mockError.mockRestore();
  });
});