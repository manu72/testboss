
import { Page, expect, Locator } from '@playwright/test';

interface AssertionOptions {
  timeout?: number;
}

export async function urlContains(page: Page, urlPart: string, options?: AssertionOptions) {
  await expect(page).toHaveURL(new RegExp(`.*${urlPart}.*`), { timeout: options?.timeout });
}

export async function urlMatches(page: Page, urlRegex: string, options?: AssertionOptions) {
  await expect(page).toHaveURL(new RegExp(urlRegex), { timeout: options?.timeout });
}

export async function visibleText(locator: Locator, text: string, options?: AssertionOptions) {
  await expect(locator).toBeVisible({ timeout: options?.timeout });
  await expect(locator).toContainText(text, { timeout: options?.timeout });
}

export async function locatorExists(locator: Locator, options?: AssertionOptions) {
  await expect(locator).toBeAttached({ timeout: options?.timeout });
}

export async function locatorHasValue(locator: Locator, value: string, options?: AssertionOptions) {
  await expect(locator).toHaveValue(value, { timeout: options?.timeout });
}

// TODO: Implement basic api_check (read-only GET request)
