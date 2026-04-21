import { spawnSync } from 'node:child_process';

/**
 * Execute a Drupal PHP snippet via `ddev drush php:eval`. Uses spawnSync
 * with an argv array so we don't have to worry about shell quoting inside
 * the PHP code.
 *
 * Returns stdout trimmed of trailing whitespace. Throws if drush exits
 * non-zero, including stderr in the error message.
 */
export function drushEval(phpCode: string): string {
  const res = spawnSync('ddev', ['drush', 'php:eval', phpCode], {
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(
      `drush php:eval failed (status=${res.status}): ${res.stderr.trim() || res.stdout.trim()}`,
    );
  }
  return res.stdout.trim();
}

/**
 * Create `count` article nodes with titles "<prefix> 1", "<prefix> 2", ….
 * Each article is created `seconds` apart on `created` so sort order is
 * deterministic across a test run. Returns the created node IDs.
 */
export function seedArticles(
  count: number,
  prefix: string,
  published = true,
): number[] {
  const status = published ? 1 : 0;
  // Title prefix is passed through PHP's $argv-equivalent (the snippet's
  // own string literal); embed it with no quotes/backticks so we don't
  // break out of the PHP string.
  const safePrefix = prefix.replace(/'/g, "\\'");
  const php = `
    $ids = [];
    $base = time() - 3600;
    for ($i = 1; $i <= ${count}; $i++) {
      $n = \\Drupal\\node\\Entity\\Node::create([
        'type' => 'article',
        'title' => '${safePrefix} ' . $i,
        'status' => ${status},
        'created' => $base - $i,
      ]);
      $n->save();
      $ids[] = $n->id();
    }
    echo implode(',', $ids);
  `;
  const out = drushEval(php);
  return out.length ? out.split(',').map((s) => Number(s)) : [];
}

/**
 * Delete every article whose title begins with `prefix`. Safe to call
 * before seeding (clears leftovers from a prior failed run) and after
 * (teardown).
 */
export function deleteArticlesWithPrefix(prefix: string): void {
  const safePrefix = prefix.replace(/'/g, "\\'");
  const php = `
    $ids = \\Drupal::entityQuery('node')
      ->condition('type', 'article')
      ->condition('title', '${safePrefix}%', 'LIKE')
      ->accessCheck(false)
      ->execute();
    if ($ids) {
      $storage = \\Drupal::entityTypeManager()->getStorage('node');
      $storage->delete($storage->loadMultiple(array_values($ids)));
      echo count($ids);
    } else {
      echo 0;
    }
  `;
  drushEval(php);
}

export const TEST_PREFIX = 'TDP71 Seed Post';
export const UNPUB_PREFIX = 'TDP71 Unpublished Post';

/**
 * Create a single article with a body summary and return `{id, alias}`.
 * Used by SEO tests that need to read the canonical URL.
 */
export function seedArticleWithSummary(
  title: string,
  bodyValue: string,
  bodySummary: string,
): { id: number; alias: string } {
  const safeTitle = title.replace(/'/g, "\\'");
  const safeBody = bodyValue.replace(/'/g, "\\'");
  const safeSummary = bodySummary.replace(/'/g, "\\'");
  const php = `
    $n = \\Drupal\\node\\Entity\\Node::create([
      'type' => 'article',
      'title' => '${safeTitle}',
      'status' => 1,
      'body' => [
        'value' => '${safeBody}',
        'summary' => '${safeSummary}',
        'format' => 'basic_html',
      ],
    ]);
    $n->save();
    $alias = \\Drupal::service('path_alias.manager')->getAliasByPath('/node/' . $n->id());
    echo $n->id() . '|' . $alias;
  `;
  const out = drushEval(php);
  const [idStr, alias] = out.split('|');
  return { id: Number(idStr), alias: alias.trim() };
}

/**
 * Create a single taxonomy term in the given vocabulary and return
 * `{id, alias}`.
 */
export function seedTaxonomyTerm(
  vid: string,
  name: string,
): { id: number; alias: string } {
  const safeVid = vid.replace(/'/g, "\\'");
  const safeName = name.replace(/'/g, "\\'");
  const php = `
    $t = \\Drupal\\taxonomy\\Entity\\Term::create([
      'vid' => '${safeVid}',
      'name' => '${safeName}',
    ]);
    $t->save();
    $alias = \\Drupal::service('path_alias.manager')->getAliasByPath('/taxonomy/term/' . $t->id());
    echo $t->id() . '|' . $alias;
  `;
  const out = drushEval(php);
  const [idStr, alias] = out.split('|');
  return { id: Number(idStr), alias: alias.trim() };
}

/**
 * Create an article with an attached image (field_image) and return
 * `{id, alias, imageUrl}`. Sources the image bytes from an existing file
 * inside the Drupal codebase so we don't have to ship test fixtures.
 */
export function seedArticleWithImage(
  title: string,
): { id: number; alias: string; imageUrl: string } {
  const safeTitle = title.replace(/'/g, "\\'");
  const php = `
    $src = \\Drupal::root() . '/core/themes/claro/logo.svg';
    $data = file_get_contents($src);
    $file = \\Drupal::service('file.repository')->writeData(
      $data,
      'public://tdp70-test-' . uniqid() . '.svg',
      \\Drupal\\Core\\File\\FileSystemInterface::EXISTS_REPLACE
    );
    $file->setPermanent();
    $file->save();
    $n = \\Drupal\\node\\Entity\\Node::create([
      'type' => 'article',
      'title' => '${safeTitle}',
      'status' => 1,
      'field_image' => [
        'target_id' => $file->id(),
        'alt' => 'Test image',
      ],
    ]);
    $n->save();
    $alias = \\Drupal::service('path_alias.manager')->getAliasByPath('/node/' . $n->id());
    $imageUrl = \\Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri());
    echo $n->id() . '|' . $alias . '|' . $imageUrl;
  `;
  const out = drushEval(php);
  const [idStr, alias, imageUrl] = out.split('|');
  return { id: Number(idStr), alias: alias.trim(), imageUrl: imageUrl.trim() };
}

/**
 * Remove every term whose name begins with `prefix` from the given vocab.
 */
export function deleteTermsWithPrefix(vid: string, prefix: string): void {
  const safeVid = vid.replace(/'/g, "\\'");
  const safePrefix = prefix.replace(/'/g, "\\'");
  const php = `
    $ids = \\Drupal::entityQuery('taxonomy_term')
      ->condition('vid', '${safeVid}')
      ->condition('name', '${safePrefix}%', 'LIKE')
      ->accessCheck(false)
      ->execute();
    if ($ids) {
      $storage = \\Drupal::entityTypeManager()->getStorage('taxonomy_term');
      $storage->delete($storage->loadMultiple(array_values($ids)));
      echo count($ids);
    } else {
      echo 0;
    }
  `;
  drushEval(php);
}

/** Delete managed files whose URI starts with 'public://tdp70-test-'. */
export function deleteSeedImages(): void {
  const php = `
    $fids = \\Drupal::entityQuery('file')
      ->condition('uri', 'public://tdp70-test-%', 'LIKE')
      ->accessCheck(false)
      ->execute();
    if ($fids) {
      $storage = \\Drupal::entityTypeManager()->getStorage('file');
      $storage->delete($storage->loadMultiple(array_values($fids)));
      echo count($fids);
    } else {
      echo 0;
    }
  `;
  drushEval(php);
}

export const SEO_PREFIX = 'TDP70 SEO';
