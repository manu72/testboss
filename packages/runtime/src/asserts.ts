
import { Page, expect, Locator } from '@playwright/test';

interface AssertionOptions {
  timeout?: number;
}

export async function urlContains(page: Page, urlPart: string, options?: AssertionOptions) {
  const expectOptions = options?.timeout !== undefined ? { timeout: options.timeout } : undefined;
  await expect(page).toHaveURL(new RegExp(`.*${urlPart}.*`), expectOptions);
}

export async function urlMatches(page: Page, urlRegex: string, options?: AssertionOptions) {
  const expectOptions = options?.timeout !== undefined ? { timeout: options.timeout } : undefined;
  await expect(page).toHaveURL(new RegExp(urlRegex), expectOptions);
}

export async function visibleText(locator: Locator, text: string, options?: AssertionOptions) {
  const expectOptions = options?.timeout !== undefined ? { timeout: options.timeout } : undefined;
  await expect(locator).toBeVisible(expectOptions);
  await expect(locator).toContainText(text, expectOptions);
}

export async function locatorExists(locator: Locator, options?: AssertionOptions) {
  const expectOptions = options?.timeout !== undefined ? { timeout: options.timeout } : undefined;
  await expect(locator).toBeAttached(expectOptions);
}

export async function locatorHasValue(locator: Locator, value: string, options?: AssertionOptions) {
  const expectOptions = options?.timeout !== undefined ? { timeout: options.timeout } : undefined;
  await expect(locator).toHaveValue(value, expectOptions);
}

// TODO: Implement basic api_check (read-only GET request)
