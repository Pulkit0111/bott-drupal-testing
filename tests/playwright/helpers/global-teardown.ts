import {
  deleteArticlesWithPrefix,
  TEST_PREFIX,
  UNPUB_PREFIX,
} from './seed';

async function globalTeardown(): Promise<void> {
  deleteArticlesWithPrefix(TEST_PREFIX);
  deleteArticlesWithPrefix(UNPUB_PREFIX);
}

export default globalTeardown;
