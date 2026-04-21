<?php

/**
 * @file
 * TDP-70: Configure Pathauto patterns and Metatag defaults for SEO.
 *
 * Idempotent — deletes any existing config entities first so re-running
 * yields the same end state. UUIDs are assigned by Drupal on save; no
 * hand-crafted UUIDs.
 *
 * Run: `ddev drush scr scripts/tdp70-seo-setup.php`
 */

use Drupal\metatag\Entity\MetatagDefaults;
use Drupal\pathauto\Entity\PathautoPattern;

// ── Pathauto patterns ────────────────────────────────────────────────

foreach (['blog_article', 'blog_tag'] as $id) {
  if (PathautoPattern::load($id)) {
    PathautoPattern::load($id)->delete();
    print "Deleted existing pathauto.pattern.$id\n";
  }
}

$articlePattern = PathautoPattern::create([
  'id' => 'blog_article',
  'label' => 'Blog articles',
  'type' => 'canonical_entities:node',
  'pattern' => 'blog/[node:created:custom:Y]/[node:title]',
  'selection_criteria' => [
    [
      'id' => 'entity_bundle:node',
      'bundles' => ['article' => 'article'],
      'negate' => FALSE,
      'context_mapping' => ['node' => 'node'],
    ],
  ],
  'selection_logic' => 'and',
  'weight' => 0,
  'status' => TRUE,
]);
$articlePattern->save();
print "Saved pathauto.pattern.blog_article (uuid=" . $articlePattern->uuid() . ")\n";

$tagPattern = PathautoPattern::create([
  'id' => 'blog_tag',
  'label' => 'Blog tags',
  'type' => 'canonical_entities:taxonomy_term',
  'pattern' => 'blog/tag/[term:name]',
  'selection_criteria' => [
    [
      'id' => 'entity_bundle:taxonomy_term',
      'bundles' => ['tags' => 'tags'],
      'negate' => FALSE,
      'context_mapping' => ['taxonomy_term' => 'taxonomy_term'],
    ],
  ],
  'selection_logic' => 'and',
  'weight' => 0,
  'status' => TRUE,
]);
$tagPattern->save();
print "Saved pathauto.pattern.blog_tag (uuid=" . $tagPattern->uuid() . ")\n";

// ── Metatag defaults ─────────────────────────────────────────────────

// Augment the auto-installed `global` defaults rather than replace them.
$global = MetatagDefaults::load('global');
if (!$global) {
  $global = MetatagDefaults::create(['id' => 'global', 'label' => 'Global']);
}
$globalTags = $global->get('tags') ?: [];
$globalTags = array_merge($globalTags, [
  'title' => '[current-page:title] | [site:name]',
  'description' => '[site:slogan]',
  'og_site_name' => '[site:name]',
  'og_type' => 'website',
]);
$global->set('tags', $globalTags);
$global->save();
print "Saved metatag.metatag_defaults.global (uuid=" . $global->uuid() . ")\n";

// Article-specific defaults.
$articleDefaults = MetatagDefaults::load('node__article');
if ($articleDefaults) {
  $articleDefaults->delete();
  print "Deleted existing metatag.metatag_defaults.node__article\n";
}
$articleDefaults = MetatagDefaults::create([
  'id' => 'node__article',
  'label' => 'Content: Article',
  'tags' => [
    'title' => '[node:title] | [site:name]',
    'description' => '[node:summary]',
    'og_title' => '[node:title]',
    'og_description' => '[node:summary]',
    'og_image' => '[node:field_image:entity:url]',
    'og_type' => 'article',
    'twitter_cards_type' => 'summary_large_image',
    'twitter_cards_title' => '[node:title]',
    'twitter_cards_description' => '[node:summary]',
    'twitter_cards_image' => '[node:field_image:entity:url]',
  ],
]);
$articleDefaults->save();
print "Saved metatag.metatag_defaults.node__article (uuid=" . $articleDefaults->uuid() . ")\n";

print "\nSEO setup complete.\n";
