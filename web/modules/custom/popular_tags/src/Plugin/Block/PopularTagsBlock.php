<?php

declare(strict_types=1);

namespace Drupal\popular_tags\Plugin\Block;

use Drupal\Core\Block\BlockBase;
use Drupal\Core\Cache\Cache;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\popular_tags\PopularTagsRepository;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a "Popular Tags" block listing the most-used tags.
 *
 * @Block(
 *   id = "popular_tags_block",
 *   admin_label = @Translation("Popular Tags"),
 *   category = @Translation("Lists (Views)"),
 * )
 */
final class PopularTagsBlock extends BlockBase implements ContainerFactoryPluginInterface {

  public function __construct(
    array $configuration,
    string $plugin_id,
    mixed $plugin_definition,
    private readonly PopularTagsRepository $repository,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): self {
    return new self(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('popular_tags.repository'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function build(): array {
    $tags = $this->repository->getTopTags(10);
    if (empty($tags)) {
      return [];
    }
    return [
      '#theme' => 'popular_tags_block',
      '#tags' => $tags,
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheTags(): array {
    return Cache::mergeTags(parent::getCacheTags(), [
      'node_list:article',
      'taxonomy_term_list:tags',
      'config:field.field.node.article.field_tags',
    ]);
  }

  /**
   * {@inheritdoc}
   */
  public function getCacheMaxAge(): int {
    return Cache::PERMANENT;
  }

}
