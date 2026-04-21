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
