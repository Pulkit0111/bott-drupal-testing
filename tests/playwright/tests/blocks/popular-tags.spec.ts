import { test, expect } from '@playwright/test';
import { drushEval } from '../../helpers/drush';

const BLOCK_SELECTOR = '#block-popular-tags';
const ITEM_SELECTOR = `${BLOCK_SELECTOR} .popular-tags__item`;
const LINK_SELECTOR = `${BLOCK_SELECTOR} .popular-tags__link`;

function placePopularTagsBlock(): void {
  drushEval(`
    $config = \\Drupal::configFactory()->getEditable("block.block.popular_tags");
    if ($config->isNew()) {
      $config->setData([
        "uuid" => \\Drupal::service("uuid")->generate(),
        "langcode" => "en",
        "status" => true,
        "dependencies" => ["module" => ["popular_tags"], "theme" => ["olivero"]],
        "id" => "popular_tags",
        "theme" => "olivero",
        "region" => "sidebar",
        "weight" => 0,
        "provider" => null,
        "plugin" => "popular_tags_block",
        "settings" => [
          "id" => "popular_tags_block",
          "label" => "Popular Tags",
          "label_display" => "visible",
          "provider" => "popular_tags",
        ],
        "visibility" => [],
      ])->save();
    }
  `);
  drushEval('drupal_flush_all_caches();');
}

function removePopularTagsBlock(): void {
  drushEval(`
    $cfg = \\Drupal::configFactory()->getEditable("block.block.popular_tags");
    if (!$cfg->isNew()) { $cfg->delete(); }
  `);
}

function clearTestData(): void {
  drushEval(`
    foreach (\\Drupal::entityTypeManager()->getStorage("node")->loadByProperties(["type" => "article"]) as $n) { $n->delete(); }
    foreach (\\Drupal::entityTypeManager()->getStorage("taxonomy_term")->loadByProperties(["vid" => "tags"]) as $t) { $t->delete(); }
  `);
}

function seedTagsAndArticles(): void {
  drushEval(`
    $tags = ["Drupal" => 3, "PHP" => 2, "Twig" => 1];
    $tids = [];
    foreach (array_keys($tags) as $name) {
      $term = \\Drupal::entityTypeManager()->getStorage("taxonomy_term")->create(["vid" => "tags", "name" => $name]);
      $term->save();
      $tids[$name] = $term->id();
    }
    foreach ($tags as $name => $count) {
      for ($i = 1; $i <= $count; $i++) {
        $node = \\Drupal::entityTypeManager()->getStorage("node")->create([
          "type" => "article",
          "title" => "$name article $i",
          "status" => 1,
          "field_tags" => [["target_id" => $tids[$name]]],
        ]);
        $node->save();
      }
    }
    $unp = \\Drupal::entityTypeManager()->getStorage("node")->create([
      "type" => "article",
      "title" => "Unpublished Drupal article",
      "status" => 0,
      "field_tags" => [["target_id" => $tids["Drupal"]]],
    ]);
    $unp->save();
  `);
  drushEval('drupal_flush_all_caches();');
}

function publishNewTwigArticle(): void {
  drushEval(`
    $tid = current(array_keys(\\Drupal::entityTypeManager()->getStorage("taxonomy_term")->loadByProperties(["vid" => "tags", "name" => "Twig"])));
    $node = \\Drupal::entityTypeManager()->getStorage("node")->create([
      "type" => "article",
      "title" => "Brand new Twig article",
      "status" => 1,
      "field_tags" => [["target_id" => $tid]],
    ]);
    $node->save();
  `);
}

test.describe('Popular Tags block', () => {
  test.beforeAll(() => {
    clearTestData();
    placePopularTagsBlock();
    seedTagsAndArticles();
  });

  test.afterAll(() => {
    clearTestData();
    removePopularTagsBlock();
  });

  test('renders top tags ordered by descending count @smoke', async ({ page }) => {
    await page.goto('/');
    const items = page.locator(ITEM_SELECTOR);
    await expect(items).toHaveCount(3);
    await expect(items).toHaveText([/^Drupal \(3\)$/, /^PHP \(2\)$/, /^Twig \(1\)$/]);
  });

  test('limits the list to at most 10 items', async ({ page }) => {
    await page.goto('/');
    const items = page.locator(ITEM_SELECTOR);
    await expect(items).not.toHaveCount(0);
    expect(await items.count()).toBeLessThanOrEqual(10);
  });

  test('each tag link points to /blog/tag/{name} and the page lists tagged articles', async ({ page }) => {
    await page.goto('/');
    const firstLink = page.locator(LINK_SELECTOR).first();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^\/blog\/tag\/[a-z0-9-]+$/);
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, '\\/')));
    await expect(page.locator('h1')).toContainText('Drupal');
  });

  test('renders each tag as "Name (count)" @smoke', async ({ page }) => {
    await page.goto('/');
    const items = page.locator(ITEM_SELECTOR);
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).trim();
      expect(text).toMatch(/^.+ \(\d+\)$/);
    }
  });

  test('updates count when a new article is published with an existing tag', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(ITEM_SELECTOR).filter({ hasText: 'Twig' })).toHaveText(/^Twig \(1\)$/);

    publishNewTwigArticle();

    await page.goto('/?_=' + Date.now());
    await expect(page.locator(ITEM_SELECTOR).filter({ hasText: 'Twig' })).toHaveText(/^Twig \(2\)$/);
  });
});
