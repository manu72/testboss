
import { Page, expect as playwrightExpect, Locator } from '@playwright/test';
import { urlContains, urlMatches, visibleText, locatorExists, locatorHasValue } from './asserts';

// Mock Playwright's expect for unit testing assertions
jest.mock('@playwright/test', () => ({
  ...jest.requireActual('@playwright/test'),
  expect: jest.fn(() => ({
    toHaveURL: jest.fn(),
    toBeVisible: jest.fn(),
    toContainText: jest.fn(),
    toBeAttached: jest.fn(),
    toHaveValue: jest.fn(),
  })),
}));

const mockPlaywrightExpect = playwrightExpect as jest.MockedFunction<typeof playwrightExpect>;

describe('Assertions', () => {
  let mockPage: Page;
  let mockLocator: Locator;

  beforeEach(() => {
    mockPage = {} as Page;
    mockLocator = {} as Locator;
    // Reset mocks before each test
    mockPlaywrightExpect.mockClear();
    mockPlaywrightExpect.mockReturnValue({
      toHaveURL: jest.fn(),
      toBeVisible: jest.fn(),
      toContainText: jest.fn(),
      toBeAttached: jest.fn(),
      toHaveValue: jest.fn(),
    } as any);
  });

  it('urlContains should call expect(page).toHaveURL with a regex', async () => {
    const mockToHaveURL = (mockPlaywrightExpect(mockPage) as any).toHaveURL;
    await urlContains(mockPage, 'success');
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(mockPage);
    expect(mockToHaveURL).toHaveBeenCalledWith(/.*success.*/, undefined);
  });

  it('urlContains should pass timeout option', async () => {
    const mockToHaveURL = (mockPlaywrightExpect(mockPage) as any).toHaveURL;
    await urlContains(mockPage, 'success', { timeout: 1000 });
    expect(mockToHaveURL).toHaveBeenCalledWith(/.*success.*/, { timeout: 1000 });
  });

  it('urlMatches should call expect(page).toHaveURL with a regex', async () => {
    const mockToHaveURL = (mockPlaywrightExpect(mockPage) as any).toHaveURL;
    await urlMatches(mockPage, 'https://example.com/.*success');
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(mockPage);
    expect(mockToHaveURL).toHaveBeenCalledWith(/https:\/\/example.com\/.*success/, undefined);
  });

  it('visibleText should call expect(locator).toBeVisible and toContainText', async () => {
    const mockToBeVisible = (mockPlaywrightExpect(mockLocator) as any).toBeVisible;
    const mockToContainText = (mockPlaywrightExpect(mockLocator) as any).toContainText;
    await visibleText(mockLocator, 'Welcome User');
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(mockLocator);
    expect(mockToBeVisible).toHaveBeenCalledWith(undefined);
    expect(mockToContainText).toHaveBeenCalledWith('Welcome User', undefined);
  });

  it('visibleText should pass timeout option', async () => {
    const mockToBeVisible = (mockPlaywrightExpect(mockLocator) as any).toBeVisible;
    const mockToContainText = (mockPlaywrightExpect(mockLocator) as any).toContainText;
    await visibleText(mockLocator, 'Welcome User', { timeout: 2000 });
    expect(mockToBeVisible).toHaveBeenCalledWith({ timeout: 2000 });
    expect(mockToContainText).toHaveBeenCalledWith('Welcome User', { timeout: 2000 });
  });

  it('locatorExists should call expect(locator).toBeAttached', async () => {
    const mockToBeAttached = (mockPlaywrightExpect(mockLocator) as any).toBeAttached;
    await locatorExists(mockLocator);
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(mockLocator);
    expect(mockToBeAttached).toHaveBeenCalledWith(undefined);
  });

  it('locatorHasValue should call expect(locator).toHaveValue', async () => {
    const mockToHaveValue = (mockPlaywrightExpect(mockLocator) as any).toHaveValue;
    await locatorHasValue(mockLocator, 'Active');
    expect(mockPlaywrightExpect).toHaveBeenCalledWith(mockLocator);
    expect(mockToHaveValue).toHaveBeenCalledWith('Active', undefined);
  });
});
