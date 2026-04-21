<?php

/**
 * @file
 * TDP-71: Build paginated blog listing page at /blog using Views.
 *
 * Clones the Standard-profile `frontpage` view structure and transforms it
 * into the `blog_listing` view. Saved via the View config entity API so
 * Drupal assigns the UUID (never hand-crafted).
 *
 * Run: `ddev drush scr scripts/tdp71-create-view.php`
 */

use Drupal\views\Entity\View;

$source = View::load('frontpage');
if (!$source) {
  throw new \RuntimeException('Source view "frontpage" not found.');
}

if (View::load('blog_listing')) {
  View::load('blog_listing')->delete();
  print "Deleted existing blog_listing view (re-running).\n";
}

$data = $source->toArray();
unset($data['uuid'], $data['_core']);

$data['id'] = 'blog_listing';
$data['label'] = 'Blog Listing';
$data['description'] = 'Paginated listing of blog articles with RSS feed.';
$data['tag'] = 'blog';

$default =& $data['display']['default']['display_options'];

// Sort: created DESC only (drop sticky).
$default['sorts'] = [
  'created' => $default['sorts']['created'],
];

// Filters: drop `promote`, keep `status`, keep `langcode`, add `type = article`.
unset($default['filters']['promote']);
$default['filters'] = [
  'status' => $default['filters']['status'],
  'type' => [
    'id' => 'type',
    'table' => 'node_field_data',
    'field' => 'type',
    'relationship' => 'none',
    'group_type' => 'group',
    'admin_label' => '',
    'entity_type' => 'node',
    'entity_field' => 'type',
    'plugin_id' => 'bundle',
    'operator' => 'in',
    'value' => ['article' => 'article'],
    'group' => 1,
    'exposed' => FALSE,
    'expose' => [
      'operator_id' => '',
      'label' => '',
      'description' => '',
      'use_operator' => FALSE,
      'operator' => '',
      'operator_limit_selection' => FALSE,
      'operator_list' => [],
      'identifier' => '',
      'required' => FALSE,
      'remember' => FALSE,
      'multiple' => FALSE,
      'remember_roles' => ['authenticated' => 'authenticated'],
      'reduce' => FALSE,
    ],
    'is_grouped' => FALSE,
    'group_info' => [
      'label' => '',
      'description' => '',
      'identifier' => '',
      'optional' => TRUE,
      'widget' => 'select',
      'multiple' => FALSE,
      'remember' => FALSE,
      'default_group' => 'All',
      'default_group_multiple' => [],
      'group_items' => [],
    ],
  ],
  'langcode' => $default['filters']['langcode'],
];

// Customise empty-state text for the blog.
if (isset($default['empty']['area_text_custom'])) {
  $default['empty']['area_text_custom']['content'] = 'No blog posts have been published yet.';
}
if (isset($default['empty']['title'])) {
  $default['empty']['title']['title'] = 'Blog';
}

// Page display: path = /blog.
if (isset($data['display']['page_1']['display_options'])) {
  $data['display']['page_1']['display_options']['path'] = 'blog';
  $data['display']['page_1']['display_options']['title'] = 'Blog';
}

// Feed display: path = /blog/feed, attached to page_1.
if (isset($data['display']['feed_1']['display_options'])) {
  $data['display']['feed_1']['display_options']['path'] = 'blog/feed';
  $data['display']['feed_1']['display_options']['title'] = 'Blog RSS feed';
  $data['display']['feed_1']['display_options']['displays'] = [
    'page_1' => 'page_1',
  ];
}

$view = View::create($data);
$view->save();

print "Saved view: " . $view->id() . " (uuid=" . $view->uuid() . ")\n";
print "Page path: /" . ($data['display']['page_1']['display_options']['path'] ?? 'n/a') . "\n";
print "Feed path: /" . ($data['display']['feed_1']['display_options']['path'] ?? 'n/a') . "\n";
