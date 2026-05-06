import { Page, expect } from '@playwright/test';

const ADMIN_USER = process.env.DRUPAL_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.DRUPAL_ADMIN_PASS ?? 'admin';

export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/user/login');
  await page.getByLabel('Username').fill(ADMIN_USER);
  await page.getByLabel('Password').fill(ADMIN_PASS);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/user\/\d+/);
}
