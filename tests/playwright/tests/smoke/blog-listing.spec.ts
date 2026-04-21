import { expect, test } from '@playwright/test';
import { TEST_PREFIX, UNPUB_PREFIX } from '../../helpers/seed';

test.describe('Blog Listing View at /blog', () => {
  test('/blog lists published articles newest-first @smoke @fast @readOnly', async ({
    page,
  }) => {
    await page.goto('/blog');
    await expect(page).toHaveURL(/\/blog$/);

    const headings = page.locator('article h2 a, article h2');
    await expect(headings.first()).toBeVisible();

    const firstTitle = (await headings.first().textContent())?.trim() ?? '';
    expect(firstTitle.startsWith(TEST_PREFIX)).toBeTruthy();
    expect(firstTitle).toBe(`${TEST_PREFIX} 1`);
  });

  test('/blog paginates after 10 posts @smoke @fast @readOnly', async ({
    page,
  }) => {
    await page.goto('/blog');

    const items = page.locator('article');
    await expect(items).toHaveCount(10);

    const nextLink = page.getByRole('link', { name: /next|go to next page/i });
    await expect(nextLink).toBeVisible();

    await nextLink.click();
    await expect(page).toHaveURL(/[?&]page=1/);
    await expect(page.locator('article').first()).toBeVisible();
  });

  test('unpublished articles hidden from /blog @smoke @fast @readOnly', async ({
    page,
  }) => {
    for (const url of ['/blog', '/blog?page=1']) {
      await page.goto(url);
      const html = await page.content();
      expect(html).not.toContain(UNPUB_PREFIX);
    }
  });
});
