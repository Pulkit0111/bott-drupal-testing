import { Page, expect } from '@playwright/test';

/**
 * Log in as the default DDEV admin account. Tests that only read public
 * pages should NOT call this — log in only when you need authenticated
 * access.
 */
export async function loginAsAdmin(
  page: Page,
  username = 'admin',
  password = 'admin',
): Promise<void> {
  await page.goto('/user/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/user\/\d+/);
}
