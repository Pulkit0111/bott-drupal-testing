import {
  deleteArticlesWithPrefix,
  seedArticles,
  TEST_PREFIX,
  UNPUB_PREFIX,
} from './seed';

async function globalSetup(): Promise<void> {
  deleteArticlesWithPrefix(TEST_PREFIX);
  deleteArticlesWithPrefix(UNPUB_PREFIX);

  seedArticles(12, TEST_PREFIX, true);
  seedArticles(2, UNPUB_PREFIX, false);
}

export default globalSetup;
