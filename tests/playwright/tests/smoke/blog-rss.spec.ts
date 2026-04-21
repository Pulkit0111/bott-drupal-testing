import { expect, test } from '@playwright/test';
import { TEST_PREFIX } from '../../helpers/seed';

test.describe('Blog RSS feed at /blog/feed', () => {
  test('/blog/feed returns valid RSS XML @smoke @fast @readOnly', async ({
    request,
  }) => {
    const res = await request.get('/blog/feed');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/application\/rss\+xml/i);

    const body = await res.text();
    expect(body).toMatch(/^<\?xml version="1\.0"/);
    expect(body).toContain('<rss');
    expect(body).toContain('<channel>');

    const itemCount = (body.match(/<item>/g) ?? []).length;
    expect(itemCount).toBeGreaterThanOrEqual(1);
    expect(itemCount).toBeLessThanOrEqual(10);

    expect(body).toContain(`${TEST_PREFIX} 1`);
  });

  test('/blog head auto-discovers the feed @smoke @fast @readOnly', async ({
    page,
  }) => {
    await page.goto('/blog');
    const feedLink = page.locator(
      'head link[rel="alternate"][type="application/rss+xml"]',
    );
    await expect(feedLink).toHaveCount(1);
    const href = await feedLink.getAttribute('href');
    expect(href).toMatch(/\/blog\/feed$/);
  });
});
