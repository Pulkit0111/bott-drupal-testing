import { expect, test } from '@playwright/test';
import { deleteArticlesWithPrefix, drushEval } from '../../helpers/seed';

const PREFIX = 'TDP73 URL';

function seedDatedArticle(
  title: string,
  year: number,
  month: number,
  day = 15,
): { id: number; alias: string } {
  const safeTitle = title.replace(/'/g, "\\'");
  const ts = Math.floor(Date.UTC(year, month - 1, day, 12, 0, 0) / 1000);
  const php = `
    $n = \\Drupal\\node\\Entity\\Node::create([
      'type' => 'article',
      'title' => '${safeTitle}',
      'status' => 1,
      'created' => ${ts},
    ]);
    $n->save();
    $alias = \\Drupal::service('path_alias.manager')->getAliasByPath('/node/' . $n->id());
    echo $n->id() . '|' . $alias;
  `;
  const out = drushEval(php);
  const [idStr, alias] = out.split('|');
  return { id: Number(idStr), alias: alias.trim() };
}

function deleteRedirectsByPath(sourcePath: string): void {
  const safe = sourcePath.replace(/'/g, "\\'");
  drushEval(`
    $ids = \\Drupal::entityQuery('redirect')
      ->condition('redirect_source__path', '${safe}')
      ->accessCheck(false)
      ->execute();
    if ($ids) {
      $storage = \\Drupal::entityTypeManager()->getStorage('redirect');
      $storage->delete($storage->loadMultiple(array_values($ids)));
    }
    echo count($ids);
  `);
}

test.describe('SEO — Blog URL year/month pattern (TDP-73)', () => {
  test.afterAll(() => {
    deleteArticlesWithPrefix(PREFIX);
    // Clean up any redirects we created in tests
    deleteRedirectsByPath('blog/2026/tdp73-url-redirect');
  });

  test('new article published in May 2026 resolves at /blog/2026/05/<slug> @smoke @fast', async ({
    request,
  }) => {
    const { alias } = seedDatedArticle(`${PREFIX} May`, 2026, 5);
    expect(alias).toBe('/blog/2026/05/tdp73-url-may');
    const res = await request.get(alias);
    expect(res.status()).toBe(200);
  });

  test('month is always zero-padded — January and December @fast', async ({
    request,
  }) => {
    const jan = seedDatedArticle(`${PREFIX} Jan`, 2026, 1);
    const dec = seedDatedArticle(`${PREFIX} Dec`, 2026, 12);
    expect(jan.alias).toBe('/blog/2026/01/tdp73-url-jan');
    expect(dec.alias).toBe('/blog/2026/12/tdp73-url-dec');
    expect((await request.get(jan.alias)).status()).toBe(200);
    expect((await request.get(dec.alias)).status()).toBe(200);
  });

  test('old /blog/YYYY/title alias 301-redirects to new /blog/YYYY/MM/title @smoke', async ({
    request,
  }) => {
    const { alias: newAlias } = seedDatedArticle(
      `${PREFIX} Redirect`,
      2026,
      5,
    );
    expect(newAlias).toBe('/blog/2026/05/tdp73-url-redirect');

    // Register the "legacy" old-format redirect that bulk-regen would create.
    const oldPath = 'blog/2026/tdp73-url-redirect';
    drushEval(`
      $r = \\Drupal\\redirect\\Entity\\Redirect::create([
        'redirect_source' => ['path' => '${oldPath}', 'query' => []],
        'redirect_redirect' => ['uri' => 'internal:${newAlias}'],
        'status_code' => 301,
      ]);
      $r->save();
      echo $r->id();
    `);

    const res = await request.get('/' + oldPath, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(res.headers()['location']).toContain(newAlias);
  });
});
