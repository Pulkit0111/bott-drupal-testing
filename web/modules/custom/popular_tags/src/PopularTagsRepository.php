<?php

declare(strict_types=1);

namespace Drupal\popular_tags;

use Drupal\Core\Database\Connection;
use Drupal\Core\Url;

/**
 * Repository for retrieving popular tags by published article count.
 */
final class PopularTagsRepository {

  public function __construct(private readonly Connection $database) {}

  /**
   * Returns the top tags ranked by descending count of published articles.
   *
   * Tied counts are broken by ascending term name. Terms with zero published
   * article references are excluded.
   *
   * @param int $limit
   *   Maximum number of tags to return.
   *
   * @return array<int, array{tid:int,name:string,url:string,count:int}>
   *   List of tag rows.
   */
  public function getTopTags(int $limit = 10): array {
    $query = $this->database->select('node__field_tags', 'nft');
    $query->innerJoin('node_field_data', 'n', 'n.nid = nft.entity_id AND n.status = 1');
    $query->innerJoin('taxonomy_term_field_data', 't', 't.tid = nft.field_tags_target_id');
    $query->addField('nft', 'field_tags_target_id', 'tid');
    $query->addField('t', 'name', 'name');
    $query->addExpression('COUNT(DISTINCT n.nid)', 'post_count');
    $query->groupBy('nft.field_tags_target_id');
    $query->groupBy('t.name');
    $query->orderBy('post_count', 'DESC');
    $query->orderBy('t.name', 'ASC');
    $query->range(0, $limit);
    $results = $query->execute()->fetchAll();

    $tags = [];
    foreach ($results as $row) {
      $tid = (int) $row->tid;
      $tags[] = [
        'tid' => $tid,
        'name' => (string) $row->name,
        'url' => Url::fromRoute('entity.taxonomy_term.canonical', ['taxonomy_term' => $tid])->toString(),
        'count' => (int) $row->post_count,
      ];
    }
    return $tags;
  }

}
