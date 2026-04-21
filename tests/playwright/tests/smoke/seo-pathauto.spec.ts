import { expect, test } from '@playwright/test';
import {
  deleteArticlesWithPrefix,
  deleteTermsWithPrefix,
  SEO_PREFIX,
  seedArticleWithSummary,
  seedTaxonomyTerm,
} from '../../helpers/seed';

test.describe('SEO — Pathauto URL aliases', () => {
  test.afterAll(() => {
    deleteArticlesWithPrefix(SEO_PREFIX);
    deleteTermsWithPrefix('tags', SEO_PREFIX);
  });

  test('new article gets /blog/<year>/<slug> alias @smoke @fast @readOnly', async ({
    request,
  }) => {
    const { alias } = seedArticleWithSummary(
      `${SEO_PREFIX} Pathauto Article`,
      'Body of the article.',
      'A short teaser summary.',
    );

    const year = new Date().getFullYear();
    expect(alias).toMatch(
      new RegExp(`^/blog/${year}/tdp70-seo-pathauto-article$`),
    );

    const res = await request.get(alias);
    expect(res.status()).toBe(200);
  });

  test('new tag term gets /blog/tag/<slug> alias @smoke @fast @readOnly', async ({
    request,
  }) => {
    const { alias } = seedTaxonomyTerm('tags', `${SEO_PREFIX} Drupal`);
    expect(alias).toBe('/blog/tag/tdp70-seo-drupal');

    const res = await request.get(alias);
    expect(res.status()).toBe(200);
  });
});
