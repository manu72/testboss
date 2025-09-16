
import { toLocator } from './selectors';
import { Page, Locator } from '@playwright/test';

describe('toLocator', () => {
  let mockPage: Page;

  beforeEach(() => {
    mockPage = {
      getByTestId: jest.fn(() => ({}) as Locator),
      getByRole: jest.fn(() => ({}) as Locator),
      getByText: jest.fn(() => ({}) as Locator),
      locator: jest.fn(() => ({}) as Locator),
    } as unknown as Page;
  });

  it('should return a getByTestId locator for data-testid=', () => {
    const locator = toLocator(mockPage, 'data-testid=myTestId');
    expect(mockPage.getByTestId).toHaveBeenCalledWith('myTestId');
    expect(locator).toBeDefined();
  });

  it('should return a getByRole locator for role= with name', () => {
    const locator = toLocator(mockPage, 'role=button[name="Save"]');
    expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Save' });
    expect(locator).toBeDefined();
  });

  it('should return a getByRole locator for role= without attributes', () => {
    const locator = toLocator(mockPage, 'role=button');
    expect(mockPage.getByRole).toHaveBeenCalledWith('button', {});
    expect(locator).toBeDefined();
  });

  it('should return a getByText locator for text=', () => {
    const locator = toLocator(mockPage, 'text=Hello World');
    expect(mockPage.getByText).toHaveBeenCalledWith('Hello World');
    expect(locator).toBeDefined();
  });

  it('should return a generic locator for css=', () => {
    const locator = toLocator(mockPage, 'css=#myId');
    expect(mockPage.locator).toHaveBeenCalledWith('#myId');
    expect(locator).toBeDefined();
  });

  it('should return a generic locator for xpath=', () => {
    const locator = toLocator(mockPage, 'xpath=//div[@id="myId"]');
    expect(mockPage.locator).toHaveBeenCalledWith('//div[@id="myId"]');
    expect(locator).toBeDefined();
  });

  it('should return a generic locator for an unrecognized prefix (default to CSS)', () => {
    const locator = toLocator(mockPage, '#defaultId');
    expect(mockPage.locator).toHaveBeenCalledWith('#defaultId');
    expect(locator).toBeDefined();
  });
});
