import { expect, test } from '@playwright/test';
import {
  deleteArticlesWithPrefix,
  deleteSeedImages,
  SEO_PREFIX,
  seedArticleWithImage,
  seedArticleWithSummary,
} from '../../helpers/seed';

test.describe('SEO — Metatag defaults', () => {
  test.afterAll(() => {
    deleteArticlesWithPrefix(SEO_PREFIX);
    deleteSeedImages();
  });

  test('article page renders description + og:title meta tags @smoke @fast @readOnly', async ({
    page,
  }) => {
    const { alias } = seedArticleWithSummary(
      `${SEO_PREFIX} Metatag Article`,
      'Full body text.',
      'Teaser summary for meta description.',
    );

    await page.goto(alias);

    const description = page.locator('head meta[name="description"]');
    await expect(description).toHaveCount(1);
    await expect(description).toHaveAttribute(
      'content',
      'Teaser summary for meta description.',
    );

    const ogTitle = page.locator('head meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    await expect(ogTitle).toHaveAttribute(
      'content',
      `${SEO_PREFIX} Metatag Article`,
    );
  });

  test('article with image emits resolvable og:image @smoke @fast @readOnly', async ({
    page,
    request,
  }) => {
    const { alias } = seedArticleWithImage(`${SEO_PREFIX} With Image`);

    await page.goto(alias);

    const ogImage = page.locator('head meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    const src = await ogImage.getAttribute('content');
    expect(src).toBeTruthy();
    expect(src!).toMatch(/\.svg$/);

    const res = await request.get(src!);
    expect(res.status()).toBe(200);
  });

  test('homepage emits og:site_name from global defaults @smoke @fast @readOnly', async ({
    page,
  }) => {
    await page.goto('/');

    const ogSiteName = page.locator('head meta[property="og:site_name"]');
    await expect(ogSiteName).toHaveCount(1);
    await expect(ogSiteName).toHaveAttribute('content', 'Drupal Blog');

    const ogType = page.locator('head meta[property="og:type"]');
    await expect(ogType).toHaveCount(1);
    await expect(ogType).toHaveAttribute('content', 'website');
  });
});
