
import { Page, Locator } from '@playwright/test';

export function toLocator(page: Page, token: string): Locator {
  if (token.startsWith('data-testid=')) {
    const testId = token.substring('data-testid='.length);
    return page.getByTestId(testId);
  } else if (token.startsWith('role=')) {
    // Example: role=button[name="Save"]
    const roleMatch = token.match(/^role=(\w+)(?:\[(.*?)\])?$/);
    if (roleMatch) {
      const role = roleMatch[1];
      const attributes = roleMatch[2];
      if (attributes) {
        const attrMap: { [key: string]: string } = {};
        attributes.split(',').forEach(attr => {
          const [key, value] = attr.split('=');
          if (key && value) {
            attrMap[key.trim()] = value.replace(/^"|"$/g, '').trim();
          }
        });
        return page.getByRole(role as any, attrMap);
      } else {
        return page.getByRole(role as any, {});
      }
    }
  } else if (token.startsWith('text=')) {
    const text = token.substring('text='.length);
    return page.getByText(text);
  } else if (token.startsWith('css=')) {
    const css = token.substring('css='.length);
    return page.locator(css);
  } else if (token.startsWith('xpath=')) {
    const xpath = token.substring('xpath='.length);
    return page.locator(xpath);
  }
  // Default to CSS selector if no prefix is found
  return page.locator(token);
}

// TODO: Implement region scope helper (e.g., within: role=region[name="Record Details"])
