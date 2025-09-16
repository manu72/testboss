
import * as fs from 'fs-extra';
import * as path from 'path';

export async function loadStorageState(storageStatePath: string): Promise<string | undefined> {
  if (fs.existsSync(storageStatePath)) {
    return storageStatePath;
  }
  return undefined;
}

export async function saveStorageState(page: any, storageStatePath: string) {
  await fs.ensureDir(path.dirname(storageStatePath));
  await page.context().storageState({ path: storageStatePath });
  console.log(`Storage state saved to: ${storageStatePath}`);
}
