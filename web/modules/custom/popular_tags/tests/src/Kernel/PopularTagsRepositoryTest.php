<?php

declare(strict_types=1);

namespace Drupal\Tests\popular_tags\Kernel;

use Drupal\Tests\system\Kernel\Entity\EntityKernelTestBase;
use Drupal\field\Entity\FieldConfig;
use Drupal\field\Entity\FieldStorageConfig;
use Drupal\node\Entity\Node;
use Drupal\node\Entity\NodeType;
use Drupal\taxonomy\Entity\Term;
use Drupal\taxonomy\Entity\Vocabulary;

/**
 * Tests the PopularTagsRepository service.
 *
 * @group popular_tags
 */
final class PopularTagsRepositoryTest extends EntityKernelTestBase {

  /**
   * {@inheritdoc}
   */
  protected static $modules = [
    'system',
    'user',
    'field',
    'filter',
    'text',
    'node',
    'taxonomy',
    'popular_tags',
  ];

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();

    $this->installEntitySchema('node');
    $this->installEntitySchema('taxonomy_term');
    $this->installSchema('node', ['node_access']);
    $this->installConfig(['node', 'taxonomy', 'filter']);

    // Create the tags vocabulary.
    Vocabulary::create([
      'vid' => 'tags',
      'name' => 'Tags',
    ])->save();

    // Create the article content type.
    NodeType::create([
      'type' => 'article',
      'name' => 'Article',
    ])->save();

    // Create the field_tags storage and instance.
    FieldStorageConfig::create([
      'field_name' => 'field_tags',
      'entity_type' => 'node',
      'type' => 'entity_reference',
      'cardinality' => -1,
      'settings' => ['target_type' => 'taxonomy_term'],
    ])->save();

    FieldConfig::create([
      'field_name' => 'field_tags',
      'entity_type' => 'node',
      'bundle' => 'article',
      'label' => 'Tags',
      'settings' => [
        'handler' => 'default:taxonomy_term',
        'handler_settings' => [
          'target_bundles' => ['tags' => 'tags'],
        ],
      ],
    ])->save();
  }

  /**
   * Tests that the repository returns the correct top tags.
   */
  public function testGetTopTags(): void {
    // Create three terms.
    $drupal = Term::create(['vid' => 'tags', 'name' => 'Drupal']);
    $drupal->save();
    $php = Term::create(['vid' => 'tags', 'name' => 'PHP']);
    $php->save();
    $twig = Term::create(['vid' => 'tags', 'name' => 'Twig']);
    $twig->save();

    // Two published articles tagged Drupal.
    Node::create([
      'type' => 'article',
      'title' => 'Article 1',
      'status' => 1,
      'field_tags' => [['target_id' => $drupal->id()]],
    ])->save();
    Node::create([
      'type' => 'article',
      'title' => 'Article 2',
      'status' => 1,
      'field_tags' => [['target_id' => $drupal->id()]],
    ])->save();

    // One published article tagged PHP.
    Node::create([
      'type' => 'article',
      'title' => 'Article 3',
      'status' => 1,
      'field_tags' => [['target_id' => $php->id()]],
    ])->save();

    // One unpublished article tagged Drupal + Twig — should not count.
    Node::create([
      'type' => 'article',
      'title' => 'Unpublished',
      'status' => 0,
      'field_tags' => [
        ['target_id' => $drupal->id()],
        ['target_id' => $twig->id()],
      ],
    ])->save();

    /** @var \Drupal\popular_tags\PopularTagsRepository $repository */
    $repository = $this->container->get('popular_tags.repository');

    $tags = $repository->getTopTags(10);

    // Twig has zero published references — must be excluded.
    $this->assertCount(2, $tags);

    $this->assertSame('Drupal', $tags[0]['name']);
    $this->assertSame(2, $tags[0]['count']);
    $this->assertSame((int) $drupal->id(), $tags[0]['tid']);

    $this->assertSame('PHP', $tags[1]['name']);
    $this->assertSame(1, $tags[1]['count']);
    $this->assertSame((int) $php->id(), $tags[1]['tid']);

    // Verify the $limit argument applies.
    $limited = $repository->getTopTags(1);
    $this->assertCount(1, $limited);
    $this->assertSame('Drupal', $limited[0]['name']);
    $this->assertSame(2, $limited[0]['count']);
  }

}
