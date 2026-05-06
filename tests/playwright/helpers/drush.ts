import { execSync } from 'node:child_process';

export function drushEval(php: string): string {
  const escaped = php.replace(/'/g, "'\\''");
  return execSync(`ddev drush ev '${escaped}'`, { encoding: 'utf8' }).trim();
}

export function drushExec(args: string): string {
  return execSync(`ddev drush ${args}`, { encoding: 'utf8' }).trim();
}
